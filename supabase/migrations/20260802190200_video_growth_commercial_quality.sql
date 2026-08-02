begin;

create or replace function public.video_growth_manage_approval(
  p_variant_id uuid, p_expected_content_revision integer, p_stage text, p_action text,
  p_note text, p_evidence_url text,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_approvals
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_variant public.video_growth_variants%rowtype;
  current_campaign public.video_growth_campaigns%rowtype;
  approval_row public.video_growth_approvals%rowtype;
  incomplete_count integer;
begin
  select * into current_variant from public.video_growth_variants where id = p_variant_id for update;
  if not found then raise exception 'Video growth variant not found'; end if;
  if current_variant.content_revision <> p_expected_content_revision then
    raise exception 'Video growth content revision conflict';
  end if;
  select * into current_campaign from public.video_growth_campaigns
    where id = current_variant.campaign_id for update;
  if current_campaign.status not in ('human_approved', 'scheduled', 'active', 'paused') then
    raise exception 'Campaign human approval is required before quality approval';
  end if;

  if p_action = 'request' then
    if current_variant.status not in ('approved', 'review_ready', 'scheduled') then
      raise exception 'Variant must be review-ready before approval request';
    end if;
    if p_stage = 'client_release' and not exists (
      select 1 from public.video_growth_approvals
      where variant_id = current_variant.id and stage = 'internal_quality'
        and content_revision = current_variant.content_revision and decision = 'approved'
    ) then raise exception 'Internal quality approval is required before client release request'; end if;
    insert into public.video_growth_approvals (
      campaign_id, variant_id, stage, content_revision, decision, request_note,
      evidence_url, requested_by_key, requested_by_email, requested_by_role
    ) values (
      current_variant.campaign_id, current_variant.id, p_stage, current_variant.content_revision,
      'pending', trim(p_note), nullif(trim(coalesce(p_evidence_url, '')), ''),
      p_actor_key, nullif(p_actor_email, ''), p_actor_role
    ) on conflict (variant_id, stage, content_revision) do update set
      decision = 'pending', request_note = excluded.request_note, evidence_url = excluded.evidence_url,
      requested_by_key = excluded.requested_by_key,
      requested_by_email = excluded.requested_by_email,
      requested_by_role = excluded.requested_by_role, requested_at = now(),
      decision_note = null, decided_by_key = null, decided_by_email = null,
      decided_by_role = null, decided_at = null,
      revision = video_growth_approvals.revision + 1, updated_at = now()
    returning * into approval_row;
  elsif p_action in ('approve', 'changes_requested', 'reject') then
    select * into approval_row from public.video_growth_approvals
      where variant_id = current_variant.id and stage = p_stage
        and content_revision = current_variant.content_revision for update;
    if not found or approval_row.decision <> 'pending' then raise exception 'A pending approval request is required'; end if;
    if char_length(trim(coalesce(p_note, ''))) < 8 then raise exception 'Approval decision note is required'; end if;
    if approval_row.requested_by_key = p_actor_key
      and not (p_actor_role = 'admin' and char_length(trim(p_note)) >= 20) then
      raise exception 'Requester and approver must be different; admin override requires a 20-character note';
    end if;

    update public.video_growth_approvals set
      decision = case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'changes_requested' end,
      decision_note = trim(p_note), evidence_url = coalesce(nullif(trim(coalesce(p_evidence_url, '')), ''), evidence_url),
      decided_by_key = p_actor_key, decided_by_email = nullif(p_actor_email, ''),
      decided_by_role = p_actor_role, decided_at = now(), revision = revision + 1, updated_at = now()
    where id = approval_row.id returning * into approval_row;

    if p_action = 'changes_requested' then
      insert into public.video_growth_revision_requests (
        campaign_id, variant_id, category, severity, description,
        requested_by_key, requested_by_email, requested_by_role
      ) values (
        current_variant.campaign_id, current_variant.id, 'other',
        case when p_stage = 'client_release' then 'major' else 'minor' end, trim(p_note),
        p_actor_key, nullif(p_actor_email, ''), p_actor_role
      );
      update public.video_growth_variants set
        status = 'draft', content_revision = content_revision + 1,
        revision = revision + 1, updated_at = now()
      where id = current_variant.id;
      update public.video_growth_work_orders set
        work_status = 'revision', revision = revision + 1, updated_at = now()
      where campaign_id = current_variant.campaign_id;
    elsif p_action = 'approve' then
      select count(*) into incomplete_count
      from (values ('internal_quality'), ('client_release')) required(stage)
      where not exists (
        select 1 from public.video_growth_approvals a
        where a.variant_id = current_variant.id and a.stage = required.stage
          and a.content_revision = current_variant.content_revision and a.decision = 'approved'
      );
      if incomplete_count = 0 then
        update public.video_growth_variants set
          status = case when current_campaign.status in ('scheduled', 'active', 'paused') then 'scheduled' else 'approved' end,
          revision = revision + 1, updated_at = now()
        where id = current_variant.id;
      end if;
      select count(*) into incomplete_count from public.video_growth_variants v
      where v.campaign_id = current_variant.campaign_id and (
        not exists (select 1 from public.video_growth_approvals a where a.variant_id = v.id and a.stage = 'internal_quality' and a.content_revision = v.content_revision and a.decision = 'approved')
        or not exists (select 1 from public.video_growth_approvals a where a.variant_id = v.id and a.stage = 'client_release' and a.content_revision = v.content_revision and a.decision = 'approved')
      );
      if incomplete_count = 0 then
        update public.video_growth_work_orders set work_status = 'ready', revision = revision + 1, updated_at = now()
        where campaign_id = current_variant.campaign_id;
      end if;
    end if;
  else raise exception 'Unsupported video growth approval action';
  end if;

  insert into public.video_growth_events (
    campaign_id, variant_id, event_type, channel, actor, actor_key, actor_email,
    actor_role, auth_source, note, detail
  ) values (
    current_variant.campaign_id, current_variant.id,
    case when p_action = 'request' then 'approval_requested' else 'approval_decided' end,
    current_variant.channel, left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source, trim(p_note),
    jsonb_build_object('stage', p_stage, 'action', p_action,
      'content_revision', current_variant.content_revision, 'external_messages_sent', 0)
  );
  return next approval_row;
end;
$$;

create or replace function public.video_growth_manage_revision(
  p_revision_request_id uuid, p_variant_id uuid, p_expected_revision integer, p_action text,
  p_category text, p_severity text, p_description text, p_assigned_to text,
  p_due_at timestamptz, p_resolution_note text,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_revision_requests
language plpgsql
security invoker
set search_path = public
as $$
declare
  variant_row public.video_growth_variants%rowtype;
  request_row public.video_growth_revision_requests%rowtype;
begin
  if p_action = 'open' then
    select * into variant_row from public.video_growth_variants where id = p_variant_id for update;
    if not found then raise exception 'Video growth variant not found'; end if;
    if variant_row.revision <> p_expected_revision then raise exception 'Video growth variant revision conflict'; end if;
    insert into public.video_growth_revision_requests (
      campaign_id, variant_id, category, severity, description,
      requested_by_key, requested_by_email, requested_by_role, assigned_to, due_at
    ) values (
      variant_row.campaign_id, variant_row.id, p_category, p_severity, trim(p_description),
      p_actor_key, nullif(p_actor_email, ''), p_actor_role,
      nullif(trim(coalesce(p_assigned_to, '')), ''), p_due_at
    ) returning * into request_row;
    update public.video_growth_variants set status = 'draft', content_revision = content_revision + 1,
      revision = revision + 1, updated_at = now() where id = variant_row.id;
    update public.video_growth_work_orders set work_status = 'revision', revision = revision + 1, updated_at = now()
      where campaign_id = variant_row.campaign_id;
  else
    select * into request_row from public.video_growth_revision_requests
      where id = p_revision_request_id for update;
    if not found then raise exception 'Video growth revision request not found'; end if;
    if request_row.revision <> p_expected_revision then raise exception 'Video growth revision request revision conflict'; end if;
    if request_row.status in ('resolved', 'rejected') then raise exception 'Video growth revision request is already terminal'; end if;
    if p_action = 'start' then
      update public.video_growth_revision_requests set status = 'in_progress',
        assigned_to = coalesce(nullif(trim(coalesce(p_assigned_to, '')), ''), assigned_to),
        revision = revision + 1, updated_at = now()
      where id = request_row.id returning * into request_row;
    elsif p_action in ('resolve', 'reject') then
      if char_length(trim(coalesce(p_resolution_note, ''))) < 5 then raise exception 'Revision resolution note is required'; end if;
      update public.video_growth_revision_requests set
        status = case when p_action = 'resolve' then 'resolved' else 'rejected' end,
        resolution_note = trim(p_resolution_note), resolved_by_key = p_actor_key,
        resolved_by_email = nullif(p_actor_email, ''), resolved_at = now(),
        revision = revision + 1, updated_at = now()
      where id = request_row.id returning * into request_row;
    else raise exception 'Unsupported video growth revision action';
    end if;
    select * into variant_row from public.video_growth_variants where id = request_row.variant_id;
  end if;

  insert into public.video_growth_events (
    campaign_id, variant_id, event_type, channel, actor, actor_key, actor_email,
    actor_role, auth_source, note, detail
  ) values (
    request_row.campaign_id, request_row.variant_id,
    case when p_action = 'open' then 'revision_requested' else 'revision_updated' end,
    variant_row.channel, left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source,
    case when p_action = 'open' then request_row.description
      when p_action = 'start' then 'Revision work started.' else trim(p_resolution_note) end,
    jsonb_build_object('action', p_action, 'status', request_row.status,
      'severity', request_row.severity, 'external_messages_sent', 0)
  );
  return next request_row;
end;
$$;

create or replace function public.video_growth_record_daily_metrics(
  p_variant_id uuid, p_metric_date date, p_expected_revision integer,
  p_impressions integer, p_views integer, p_clicks integer, p_replies integer, p_meetings integer,
  p_source text, p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_daily_metrics
language plpgsql
security invoker
set search_path = public
as $$
declare
  variant_row public.video_growth_variants%rowtype;
  metric_row public.video_growth_daily_metrics%rowtype;
  totals record;
begin
  select * into variant_row from public.video_growth_variants where id = p_variant_id for update;
  if not found then raise exception 'Video growth variant not found'; end if;
  if variant_row.status <> 'published' then raise exception 'Only published variants accept daily metrics'; end if;
  if p_metric_date > current_date then raise exception 'Daily metrics date cannot be in the future'; end if;
  select * into metric_row from public.video_growth_daily_metrics
    where variant_id = p_variant_id and metric_date = p_metric_date for update;
  if found then
    if metric_row.revision <> p_expected_revision then raise exception 'Video growth daily metrics revision conflict'; end if;
    update public.video_growth_daily_metrics set
      impressions = p_impressions, views = p_views, clicks = p_clicks,
      replies = p_replies, meetings = p_meetings, source = p_source,
      recorded_by_key = p_actor_key, recorded_by_email = nullif(p_actor_email, ''),
      recorded_by_role = p_actor_role, revision = revision + 1, updated_at = now()
    where id = metric_row.id returning * into metric_row;
  else
    if p_expected_revision <> 0 then raise exception 'Video growth daily metrics revision conflict'; end if;
    insert into public.video_growth_daily_metrics (
      campaign_id, variant_id, metric_date, impressions, views, clicks, replies, meetings,
      source, recorded_by_key, recorded_by_email, recorded_by_role
    ) values (
      variant_row.campaign_id, variant_row.id, p_metric_date, p_impressions, p_views,
      p_clicks, p_replies, p_meetings, p_source, p_actor_key, nullif(p_actor_email, ''), p_actor_role
    ) returning * into metric_row;
  end if;
  select coalesce(sum(impressions),0) impressions, coalesce(sum(views),0) views,
    coalesce(sum(clicks),0) clicks, coalesce(sum(replies),0) replies,
    coalesce(sum(meetings),0) meetings into totals
  from public.video_growth_daily_metrics where variant_id = p_variant_id;
  update public.video_growth_variants set impressions = totals.impressions, views = totals.views,
    clicks = totals.clicks, replies = totals.replies, meetings = totals.meetings,
    revision = revision + 1, updated_at = now() where id = p_variant_id;
  insert into public.video_growth_events (
    campaign_id, variant_id, event_type, channel, actor, actor_key, actor_email,
    actor_role, auth_source, note, detail
  ) values (
    variant_row.campaign_id, variant_row.id, 'daily_metrics_recorded', variant_row.channel,
    left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120), p_actor_key, nullif(p_actor_email, ''),
    p_actor_role, p_auth_source, 'Daily channel metrics recorded.',
    jsonb_build_object('metric_date', p_metric_date, 'source', p_source,
      'impressions', p_impressions, 'clicks', p_clicks, 'external_messages_sent', 0)
  );
  return next metric_row;
end;
$$;

revoke all on function public.video_growth_manage_approval(uuid,integer,text,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_manage_approval(uuid,integer,text,text,text,text,text,text,text,text)
  to service_role;
revoke all on function public.video_growth_manage_revision(uuid,uuid,integer,text,text,text,text,text,timestamptz,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_manage_revision(uuid,uuid,integer,text,text,text,text,text,timestamptz,text,text,text,text,text)
  to service_role;
revoke all on function public.video_growth_record_daily_metrics(uuid,date,integer,integer,integer,integer,integer,integer,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_record_daily_metrics(uuid,date,integer,integer,integer,integer,integer,integer,text,text,text,text,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
