begin;

create or replace function public.video_growth_transition_commercial_campaign(
  p_campaign_id uuid, p_expected_revision integer, p_action text, p_note text,
  p_scheduled_for timestamptz, p_actor_key text, p_actor_email text,
  p_actor_role text, p_auth_source text
)
returns setof public.video_growth_campaigns
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_campaign public.video_growth_campaigns%rowtype;
  updated_campaign public.video_growth_campaigns%rowtype;
  project_status text;
  target_status text;
  event_name text;
  item_count integer;
begin
  select * into current_campaign from public.video_growth_campaigns
    where id = p_campaign_id for update;
  if not found then raise exception 'Video growth campaign not found'; end if;
  if current_campaign.revision <> p_expected_revision then raise exception 'Video growth campaign revision conflict'; end if;
  if not exists (select 1 from public.video_growth_work_orders where campaign_id = p_campaign_id) then
    raise exception 'Commercial work order is required';
  end if;

  if p_action = 'request_review' then
    if current_campaign.status <> 'draft' then raise exception 'Only draft campaigns can request review'; end if;
    select status into project_status from public.video_factory_studio_projects
      where project_id = current_campaign.studio_project_id;
    if project_status not in ('final_approved', 'delivered') then
      raise exception 'Studio project must be final-approved or delivered before campaign review';
    end if;
    select count(*) into item_count from public.video_growth_variants
      where campaign_id = p_campaign_id and status = 'review_ready';
    if item_count <> 4 then raise exception 'All four channel variants must be review-ready'; end if;
    select count(*) into item_count from public.video_growth_readiness_checks
      where campaign_id = p_campaign_id and status in ('passed', 'waived');
    if item_count <> 7 then raise exception 'All seven commercial readiness checks must pass or be waived'; end if;
    target_status := 'review_ready'; event_name := 'review_requested';
  elsif p_action = 'approve' then
    if current_campaign.status <> 'review_ready' then raise exception 'Campaign is not ready for human approval'; end if;
    if char_length(trim(coalesce(p_note, ''))) < 8 then raise exception 'Approval note is required'; end if;
    target_status := 'human_approved'; event_name := 'human_approved';
  elsif p_action = 'schedule' then
    if current_campaign.status <> 'human_approved' then raise exception 'Human approval is required before scheduling'; end if;
    if p_scheduled_for is null or p_scheduled_for <= now() then raise exception 'A future schedule is required'; end if;
    select count(*) into item_count from public.video_growth_variants v
      join public.video_growth_approvals a on a.variant_id = v.id
        and a.content_revision = v.content_revision and a.decision = 'approved'
      where v.campaign_id = p_campaign_id and a.stage in ('internal_quality', 'client_release');
    if item_count <> 8 then raise exception 'Internal quality and client release approval are required for all four variants'; end if;
    target_status := 'scheduled'; event_name := 'campaign_scheduled';
  elsif p_action = 'pause' then
    if current_campaign.status not in ('scheduled', 'active') then raise exception 'Only scheduled or active campaigns can be paused'; end if;
    target_status := 'paused'; event_name := 'campaign_paused';
  elsif p_action = 'resume' then
    if current_campaign.status <> 'paused' then raise exception 'Only paused campaigns can resume'; end if;
    select count(*) into item_count from public.video_growth_variants
      where campaign_id = p_campaign_id and status = 'published';
    target_status := case when item_count > 0 then 'active' else 'scheduled' end;
    event_name := 'campaign_activated';
  elsif p_action = 'complete' then
    if current_campaign.status not in ('active', 'paused') then raise exception 'Only active or paused campaigns can complete'; end if;
    select count(*) into item_count from public.video_growth_variants
      where campaign_id = p_campaign_id and status = 'published';
    if item_count <> 4 then raise exception 'All four variants must have verified publication before completion'; end if;
    target_status := 'completed'; event_name := 'campaign_completed';
  elsif p_action = 'cancel' then
    if current_campaign.status in ('completed', 'cancelled') then raise exception 'Campaign is already terminal'; end if;
    target_status := 'cancelled'; event_name := 'campaign_cancelled';
  else raise exception 'Unsupported video growth campaign action';
  end if;

  update public.video_growth_campaigns set
    status = target_status,
    approved_by = case when p_action = 'approve' then coalesce(nullif(p_actor_email, ''), p_actor_key) else approved_by end,
    approval_note = case when p_action = 'approve' then trim(p_note) else approval_note end,
    approved_at = case when p_action = 'approve' then now() else approved_at end,
    scheduled_for = case when p_action = 'schedule' then p_scheduled_for else scheduled_for end,
    revision = revision + 1, updated_at = now()
  where id = p_campaign_id returning * into updated_campaign;

  if p_action = 'request_review' then
    update public.video_growth_work_orders set work_status = 'internal_review', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id;
  elsif p_action = 'approve' then
    update public.video_growth_variants set status = 'approved', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id and status = 'review_ready';
    update public.video_growth_work_orders set work_status = 'client_review', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id;
  elsif p_action = 'schedule' then
    update public.video_growth_variants set status = 'scheduled', scheduled_for = p_scheduled_for,
      revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id and status = 'approved';
    update public.video_growth_work_orders set work_status = 'ready', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id;
  elsif p_action = 'complete' then
    update public.video_growth_work_orders set work_status = 'delivered', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id;
  elsif p_action = 'cancel' then
    update public.video_growth_work_orders set work_status = 'closed', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id;
  end if;

  insert into public.video_growth_events (
    campaign_id, event_type, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) values (
    p_campaign_id, event_name, left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source, trim(p_note),
    jsonb_build_object('from_status', current_campaign.status, 'to_status', updated_campaign.status,
      'before_revision', current_campaign.revision, 'after_revision', updated_campaign.revision,
      'scheduled_for', updated_campaign.scheduled_for, 'external_messages_sent', 0)
  );
  return next updated_campaign;
end;
$$;

create or replace function public.video_growth_update_commercial_variant(
  p_variant_id uuid, p_expected_revision integer, p_action text, p_note text,
  p_hook text, p_caption text, p_cta text, p_deliverable_name text,
  p_publish_url text, p_error_message text,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_variants
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_variant public.video_growth_variants%rowtype;
  updated_variant public.video_growth_variants%rowtype;
  campaign public.video_growth_campaigns%rowtype;
  event_name text;
  item_count integer;
begin
  select * into current_variant from public.video_growth_variants where id = p_variant_id for update;
  if not found then raise exception 'Video growth variant not found'; end if;
  if current_variant.revision <> p_expected_revision then raise exception 'Video growth variant revision conflict'; end if;
  select * into campaign from public.video_growth_campaigns where id = current_variant.campaign_id for update;

  if p_action = 'update_copy' then
    if campaign.status in ('completed', 'cancelled') or current_variant.status <> 'draft' then
      raise exception 'Only draft variants in non-terminal campaigns can be edited';
    end if;
    update public.video_growth_variants set
      hook = trim(coalesce(p_hook, '')), caption = trim(coalesce(p_caption, '')),
      cta = trim(coalesce(p_cta, '')),
      deliverable_name = nullif(trim(coalesce(p_deliverable_name, '')), ''),
      error_message = null, content_revision = content_revision + 1,
      revision = revision + 1, updated_at = now()
    where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_updated';
  elsif p_action = 'mark_ready' then
    if campaign.status in ('completed', 'cancelled') or current_variant.status <> 'draft' then
      raise exception 'Only draft variants in non-terminal campaigns can be marked ready';
    end if;
    if char_length(trim(current_variant.hook)) < 5
      or char_length(trim(current_variant.caption)) < 10
      or char_length(trim(current_variant.cta)) < 2
      or current_variant.deliverable_name is null then
      raise exception 'Hook, caption, CTA and Studio deliverable are required';
    end if;
    if not exists (
      select 1 from public.video_factory_studio_projects project,
        jsonb_array_elements(coalesce(project.manifest->'deliverables', '[]'::jsonb)) deliverable
      where project.project_id = campaign.studio_project_id
        and deliverable->>'name' = current_variant.deliverable_name
    ) then raise exception 'Studio deliverable does not exist in the project manifest'; end if;
    update public.video_growth_variants set status = 'review_ready', revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_review_ready';
  elsif p_action = 'publish' then
    if campaign.status not in ('scheduled', 'active') then raise exception 'Campaign must be scheduled or active before publication'; end if;
    if current_variant.status not in ('approved', 'scheduled') then raise exception 'Variant is not approved for publication'; end if;
    select count(*) into item_count from public.video_growth_approvals
      where variant_id = current_variant.id and content_revision = current_variant.content_revision
        and stage in ('internal_quality', 'client_release') and decision = 'approved';
    if item_count <> 2 then raise exception 'Internal quality and client release approval are required before publication'; end if;
    if coalesce(p_publish_url, '') !~ '^https://[^[:space:]]+$' then raise exception 'A valid HTTPS publication URL is required'; end if;
    update public.video_growth_variants set status = 'published', publish_url = trim(p_publish_url),
      published_at = now(), error_message = null, revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    if campaign.status = 'scheduled' then
      update public.video_growth_campaigns set status = 'active', revision = revision + 1, updated_at = now()
        where id = campaign.id;
    end if;
    event_name := 'variant_published';
  elsif p_action = 'fail' then
    if current_variant.status not in ('approved', 'scheduled') then raise exception 'Only approved or scheduled variants can fail'; end if;
    if char_length(trim(coalesce(p_error_message, ''))) < 3 then raise exception 'Failure reason is required'; end if;
    update public.video_growth_variants set status = 'failed', error_message = trim(p_error_message),
      revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_failed';
  else raise exception 'Unsupported video growth variant action';
  end if;

  insert into public.video_growth_events (
    campaign_id, variant_id, event_type, channel, actor, actor_key, actor_email,
    actor_role, auth_source, note, detail
  ) values (
    current_variant.campaign_id, current_variant.id, event_name, current_variant.channel,
    left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120), p_actor_key, nullif(p_actor_email, ''),
    p_actor_role, p_auth_source, trim(p_note),
    jsonb_build_object('before_status', current_variant.status, 'after_status', updated_variant.status,
      'before_revision', current_variant.revision, 'after_revision', updated_variant.revision,
      'content_revision', updated_variant.content_revision, 'external_messages_sent', 0)
  );
  return next updated_variant;
end;
$$;

revoke all on function public.video_growth_create_campaign(text,text,text,text,text,text,text,text) from service_role;
revoke all on function public.video_growth_transition_campaign(uuid,integer,text,text,text,timestamptz) from service_role;
revoke all on function public.video_growth_update_variant(
  uuid,integer,text,text,text,text,text,text,text,text,integer,integer,integer,integer,integer,text
) from service_role;
revoke all on function public.video_growth_transition_commercial_campaign(uuid,integer,text,text,timestamptz,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_transition_commercial_campaign(uuid,integer,text,text,timestamptz,text,text,text,text)
  to service_role;
revoke all on function public.video_growth_update_commercial_variant(uuid,integer,text,text,text,text,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_update_commercial_variant(uuid,integer,text,text,text,text,text,text,text,text,text,text,text,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
