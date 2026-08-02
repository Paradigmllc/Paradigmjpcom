begin;

create or replace function public.video_growth_create_commercial_campaign(
  p_name text, p_studio_project_id text, p_objective text, p_audience text,
  p_offer text, p_landing_url text, p_owner text,
  p_client_name text, p_client_contact_name text, p_client_contact_email text,
  p_plan text, p_monthly_video_quota integer, p_billing_status text,
  p_priority text, p_timezone text, p_languages text[],
  p_contract_reference text, p_purchase_order_reference text,
  p_client_approver text, p_kickoff_at timestamptz, p_delivery_due_at timestamptz,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_campaigns
language plpgsql
security invoker
set search_path = public
as $$
declare created_campaign public.video_growth_campaigns%rowtype;
begin
  if not exists (
    select 1 from public.video_factory_studio_projects where project_id = p_studio_project_id
  ) then raise exception 'Video Factory Studio project not found'; end if;
  if p_delivery_due_at is null or p_delivery_due_at <= now() then
    raise exception 'A future commercial delivery due date is required';
  end if;

  insert into public.video_growth_campaigns (
    name, studio_project_id, objective, audience, offer, landing_url, owner
  ) values (
    trim(p_name), trim(p_studio_project_id), trim(p_objective), trim(p_audience),
    trim(p_offer), trim(p_landing_url), trim(p_owner)
  ) returning * into created_campaign;

  insert into public.video_growth_variants (
    campaign_id, channel, variant_name, aspect_ratio, width, height, duration_seconds
  ) values
    (created_campaign.id, 'x', 'X Feed', '1:1', 1080, 1080, 30),
    (created_campaign.id, 'instagram', 'Instagram Reels', '9:16', 1080, 1920, 30),
    (created_campaign.id, 'linkedin', 'LinkedIn Feed', '1:1', 1080, 1080, 45),
    (created_campaign.id, 'cold_email', 'Cold Email Embed', '16:9', 1280, 720, 45);

  insert into public.video_growth_work_orders (
    campaign_id, client_name, client_contact_name, client_contact_email, plan,
    monthly_video_quota, billing_status, priority, timezone, languages,
    contract_reference, purchase_order_reference, delivery_owner, client_approver,
    kickoff_at, delivery_due_at
  ) values (
    created_campaign.id, trim(p_client_name), nullif(trim(coalesce(p_client_contact_name, '')), ''),
    nullif(lower(trim(coalesce(p_client_contact_email, ''))), ''), p_plan,
    p_monthly_video_quota, p_billing_status, p_priority, trim(p_timezone), p_languages,
    nullif(trim(coalesce(p_contract_reference, '')), ''),
    nullif(trim(coalesce(p_purchase_order_reference, '')), ''), trim(p_owner),
    nullif(trim(coalesce(p_client_approver, '')), ''), p_kickoff_at, p_delivery_due_at
  );

  insert into public.video_growth_readiness_checks (campaign_id, check_key)
  select created_campaign.id, key from unnest(array[
    'contract', 'payment', 'brief', 'brand_assets', 'usage_rights',
    'landing_page', 'tracking'
  ]::text[]) key;

  insert into public.video_growth_events (
    campaign_id, event_type, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) values (
    created_campaign.id, 'commercial_work_order_created', left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source,
    'Commercial work order and seven readiness gates created; no external message was sent.',
    jsonb_build_object('studio_project_id', created_campaign.studio_project_id, 'plan', p_plan,
      'monthly_video_quota', p_monthly_video_quota, 'external_messages_sent', 0)
  );
  return next created_campaign;
end;
$$;

create or replace function public.video_growth_update_work_order(
  p_campaign_id uuid, p_expected_revision integer,
  p_client_name text, p_client_contact_name text, p_client_contact_email text,
  p_plan text, p_monthly_video_quota integer, p_billing_status text,
  p_work_status text, p_priority text, p_timezone text, p_languages text[],
  p_contract_reference text, p_purchase_order_reference text, p_delivery_owner text,
  p_client_approver text, p_kickoff_at timestamptz, p_delivery_due_at timestamptz,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text, p_note text
)
returns setof public.video_growth_work_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_order public.video_growth_work_orders%rowtype;
  updated_order public.video_growth_work_orders%rowtype;
begin
  select * into current_order from public.video_growth_work_orders
    where campaign_id = p_campaign_id for update;
  if not found then raise exception 'Video growth work order not found'; end if;
  if current_order.revision <> p_expected_revision then raise exception 'Video growth work order revision conflict'; end if;
  if p_delivery_due_at is null then raise exception 'Commercial delivery due date is required'; end if;

  update public.video_growth_work_orders set
    client_name = trim(p_client_name),
    client_contact_name = nullif(trim(coalesce(p_client_contact_name, '')), ''),
    client_contact_email = nullif(lower(trim(coalesce(p_client_contact_email, ''))), ''),
    plan = p_plan, monthly_video_quota = p_monthly_video_quota,
    billing_status = p_billing_status, work_status = p_work_status, priority = p_priority,
    timezone = trim(p_timezone), languages = p_languages,
    contract_reference = nullif(trim(coalesce(p_contract_reference, '')), ''),
    purchase_order_reference = nullif(trim(coalesce(p_purchase_order_reference, '')), ''),
    delivery_owner = trim(p_delivery_owner),
    client_approver = nullif(trim(coalesce(p_client_approver, '')), ''),
    kickoff_at = p_kickoff_at, delivery_due_at = p_delivery_due_at,
    revision = revision + 1, updated_at = now()
  where campaign_id = p_campaign_id returning * into updated_order;

  insert into public.video_growth_events (
    campaign_id, event_type, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) values (
    p_campaign_id, 'work_order_updated', left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source, trim(p_note),
    jsonb_build_object('before_revision', current_order.revision, 'after_revision', updated_order.revision,
      'work_status', updated_order.work_status, 'billing_status', updated_order.billing_status,
      'external_messages_sent', 0)
  );
  return next updated_order;
end;
$$;

create or replace function public.video_growth_update_readiness_check(
  p_check_id uuid, p_expected_revision integer, p_status text,
  p_note text, p_evidence_url text,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_readiness_checks
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_check public.video_growth_readiness_checks%rowtype;
  updated_check public.video_growth_readiness_checks%rowtype;
begin
  select * into current_check from public.video_growth_readiness_checks where id = p_check_id for update;
  if not found then raise exception 'Video growth readiness check not found'; end if;
  if current_check.revision <> p_expected_revision then raise exception 'Video growth readiness check revision conflict'; end if;
  if p_status in ('waived', 'failed') and char_length(trim(coalesce(p_note, ''))) < 8 then
    raise exception 'A waiver or failure note of at least 8 characters is required';
  end if;

  update public.video_growth_readiness_checks set
    status = p_status, note = trim(coalesce(p_note, '')),
    evidence_url = nullif(trim(coalesce(p_evidence_url, '')), ''),
    checked_by_key = case when p_status = 'pending' then null else p_actor_key end,
    checked_by_email = case when p_status = 'pending' then null else nullif(p_actor_email, '') end,
    checked_by_role = case when p_status = 'pending' then null else p_actor_role end,
    checked_at = case when p_status = 'pending' then null else now() end,
    revision = revision + 1, updated_at = now()
  where id = p_check_id returning * into updated_check;

  insert into public.video_growth_events (
    campaign_id, event_type, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) values (
    current_check.campaign_id, 'readiness_check_updated', left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source,
    coalesce(nullif(trim(p_note), ''), 'Commercial readiness check updated.'),
    jsonb_build_object('check_key', current_check.check_key, 'before_status', current_check.status,
      'after_status', updated_check.status, 'evidence_attached', updated_check.evidence_url is not null,
      'external_messages_sent', 0)
  );
  return next updated_check;
end;
$$;

create or replace function public.video_growth_update_billing_status(
  p_campaign_id uuid, p_expected_revision integer, p_billing_status text,
  p_note text, p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text
)
returns setof public.video_growth_work_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_order public.video_growth_work_orders%rowtype;
  updated_order public.video_growth_work_orders%rowtype;
begin
  select * into current_order from public.video_growth_work_orders
    where campaign_id = p_campaign_id for update;
  if not found then raise exception 'Video growth work order not found'; end if;
  if current_order.revision <> p_expected_revision then raise exception 'Video growth work order revision conflict'; end if;
  update public.video_growth_work_orders set billing_status = p_billing_status,
    revision = revision + 1, updated_at = now()
  where campaign_id = p_campaign_id returning * into updated_order;
  insert into public.video_growth_events (
    campaign_id, event_type, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) values (
    p_campaign_id, 'work_order_updated', left(coalesce(nullif(p_actor_email, ''), p_actor_key), 120),
    p_actor_key, nullif(p_actor_email, ''), p_actor_role, p_auth_source, trim(p_note),
    jsonb_build_object('before_billing_status', current_order.billing_status,
      'after_billing_status', updated_order.billing_status, 'external_messages_sent', 0)
  );
  return next updated_order;
end;
$$;

revoke all on function public.video_growth_create_commercial_campaign(
  text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text[],text,text,text,timestamptz,timestamptz,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.video_growth_create_commercial_campaign(
  text,text,text,text,text,text,text,text,text,text,text,integer,text,text,text,text[],text,text,text,timestamptz,timestamptz,text,text,text,text
) to service_role;
revoke all on function public.video_growth_update_work_order(
  uuid,integer,text,text,text,text,integer,text,text,text,text,text[],text,text,text,text,timestamptz,timestamptz,text,text,text,text,text
) from public, anon, authenticated;
grant execute on function public.video_growth_update_work_order(
  uuid,integer,text,text,text,text,integer,text,text,text,text,text[],text,text,text,text,timestamptz,timestamptz,text,text,text,text,text
) to service_role;
revoke all on function public.video_growth_update_readiness_check(uuid,integer,text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_update_readiness_check(uuid,integer,text,text,text,text,text,text,text)
  to service_role;
revoke all on function public.video_growth_update_billing_status(uuid,integer,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.video_growth_update_billing_status(uuid,integer,text,text,text,text,text,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
