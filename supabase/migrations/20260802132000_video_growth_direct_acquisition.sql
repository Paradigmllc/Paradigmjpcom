begin;

create table if not exists public.video_growth_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 160),
  studio_project_id text not null references public.video_factory_studio_projects(project_id) on delete restrict,
  objective text not null check (char_length(trim(objective)) between 10 and 1000),
  audience text not null check (char_length(trim(audience)) between 3 and 500),
  offer text not null check (char_length(trim(offer)) between 3 and 500),
  landing_url text not null check (landing_url ~ '^https://[^[:space:]]+$'),
  status text not null default 'draft' check (
    status in ('draft', 'review_ready', 'human_approved', 'scheduled', 'active', 'paused', 'completed', 'cancelled')
  ),
  owner text not null check (char_length(trim(owner)) between 2 and 120),
  approved_by text,
  approval_note text,
  approved_at timestamptz,
  scheduled_for timestamptz,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_growth_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  channel text not null check (channel in ('x', 'instagram', 'linkedin', 'cold_email')),
  variant_name text not null check (char_length(trim(variant_name)) between 3 and 120),
  aspect_ratio text not null check (aspect_ratio in ('16:9', '9:16', '1:1', '4:5')),
  width integer not null check (width between 320 and 3840),
  height integer not null check (height between 320 and 3840),
  duration_seconds integer not null check (duration_seconds between 5 and 120),
  hook text not null default '',
  caption text not null default '',
  cta text not null default '',
  deliverable_name text,
  status text not null default 'draft' check (
    status in ('draft', 'review_ready', 'approved', 'scheduled', 'published', 'failed')
  ),
  scheduled_for timestamptz,
  published_at timestamptz,
  publish_url text check (publish_url is null or publish_url ~ '^https://[^[:space:]]+$'),
  impressions integer not null default 0 check (impressions >= 0),
  views integer not null default 0 check (views >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  replies integer not null default 0 check (replies >= 0),
  meetings integer not null default 0 check (meetings >= 0),
  error_message text,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, channel)
);

create table if not exists public.video_growth_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  variant_id uuid references public.video_growth_variants(id) on delete set null,
  event_type text not null check (event_type in (
    'campaign_created', 'review_requested', 'human_approved', 'campaign_scheduled',
    'campaign_activated', 'campaign_paused', 'campaign_completed', 'campaign_cancelled',
    'variant_updated', 'variant_review_ready', 'variant_published',
    'variant_metrics_recorded', 'variant_failed'
  )),
  channel text check (channel is null or channel in ('x', 'instagram', 'linkedin', 'cold_email')),
  actor text not null check (char_length(trim(actor)) between 2 and 120),
  note text not null check (char_length(trim(note)) between 2 and 2000),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists video_growth_campaigns_status_idx
  on public.video_growth_campaigns(status, updated_at desc);
create index if not exists video_growth_variants_queue_idx
  on public.video_growth_variants(status, scheduled_for, channel);
create index if not exists video_growth_events_campaign_idx
  on public.video_growth_events(campaign_id, created_at desc);

alter table public.video_growth_campaigns enable row level security;
alter table public.video_growth_campaigns force row level security;
alter table public.video_growth_variants enable row level security;
alter table public.video_growth_variants force row level security;
alter table public.video_growth_events enable row level security;
alter table public.video_growth_events force row level security;

revoke all on table public.video_growth_campaigns from public, anon, authenticated, service_role;
revoke all on table public.video_growth_variants from public, anon, authenticated, service_role;
revoke all on table public.video_growth_events from public, anon, authenticated, service_role;
grant select, insert, update on table public.video_growth_campaigns to service_role;
grant select, insert, update on table public.video_growth_variants to service_role;
grant select, insert on table public.video_growth_events to service_role;

drop policy if exists video_growth_campaigns_service_role_all on public.video_growth_campaigns;
create policy video_growth_campaigns_service_role_all on public.video_growth_campaigns
  for all to service_role using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
drop policy if exists video_growth_variants_service_role_all on public.video_growth_variants;
create policy video_growth_variants_service_role_all on public.video_growth_variants
  for all to service_role using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
drop policy if exists video_growth_events_service_role_all on public.video_growth_events;
create policy video_growth_events_service_role_all on public.video_growth_events
  for all to service_role using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

create or replace function public.video_growth_create_campaign(
  p_name text,
  p_studio_project_id text,
  p_objective text,
  p_audience text,
  p_offer text,
  p_landing_url text,
  p_owner text,
  p_actor text
)
returns setof public.video_growth_campaigns
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_campaign public.video_growth_campaigns%rowtype;
begin
  if not exists (
    select 1 from public.video_factory_studio_projects where project_id = p_studio_project_id
  ) then
    raise exception 'Video Factory Studio project not found';
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

  insert into public.video_growth_events (campaign_id, event_type, actor, note, detail)
  values (
    created_campaign.id,
    'campaign_created',
    trim(p_actor),
    'Direct growth campaign created; no external message was sent.',
    jsonb_build_object('studio_project_id', created_campaign.studio_project_id, 'external_messages_sent', 0)
  );

  return next created_campaign;
end;
$$;

create or replace function public.video_growth_transition_campaign(
  p_campaign_id uuid,
  p_expected_revision integer,
  p_action text,
  p_actor text,
  p_note text,
  p_scheduled_for timestamptz default null
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
  ready_count integer;
  published_count integer;
begin
  select * into current_campaign
  from public.video_growth_campaigns
  where id = p_campaign_id
  for update;
  if not found then raise exception 'Video growth campaign not found'; end if;
  if current_campaign.revision <> p_expected_revision then raise exception 'Video growth campaign revision conflict'; end if;

  if p_action = 'request_review' then
    if current_campaign.status <> 'draft' then raise exception 'Only draft campaigns can request review'; end if;
    select status into project_status from public.video_factory_studio_projects
      where project_id = current_campaign.studio_project_id;
    if project_status not in ('final_approved', 'delivered') then
      raise exception 'Studio project must be final-approved or delivered before campaign review';
    end if;
    select count(*) into ready_count from public.video_growth_variants
      where campaign_id = p_campaign_id and status = 'review_ready';
    if ready_count <> 4 then raise exception 'All four channel variants must be review-ready'; end if;
    target_status := 'review_ready'; event_name := 'review_requested';
  elsif p_action = 'approve' then
    if current_campaign.status <> 'review_ready' then raise exception 'Campaign is not ready for human approval'; end if;
    if char_length(trim(coalesce(p_note, ''))) < 8 then raise exception 'Approval note is required'; end if;
    target_status := 'human_approved'; event_name := 'human_approved';
  elsif p_action = 'schedule' then
    if current_campaign.status <> 'human_approved' then raise exception 'Human approval is required before scheduling'; end if;
    if p_scheduled_for is null or p_scheduled_for <= now() then raise exception 'A future schedule is required'; end if;
    target_status := 'scheduled'; event_name := 'campaign_scheduled';
  elsif p_action = 'pause' then
    if current_campaign.status not in ('scheduled', 'active') then raise exception 'Only scheduled or active campaigns can be paused'; end if;
    target_status := 'paused'; event_name := 'campaign_paused';
  elsif p_action = 'resume' then
    if current_campaign.status <> 'paused' then raise exception 'Only paused campaigns can resume'; end if;
    select count(*) into published_count from public.video_growth_variants
      where campaign_id = p_campaign_id and status = 'published';
    target_status := case when published_count > 0 then 'active' else 'scheduled' end;
    event_name := 'campaign_activated';
  elsif p_action = 'complete' then
    if current_campaign.status not in ('active', 'paused') then raise exception 'Only active or paused campaigns can complete'; end if;
    target_status := 'completed'; event_name := 'campaign_completed';
  elsif p_action = 'cancel' then
    if current_campaign.status in ('completed', 'cancelled') then raise exception 'Campaign is already terminal'; end if;
    target_status := 'cancelled'; event_name := 'campaign_cancelled';
  else
    raise exception 'Unsupported video growth campaign action';
  end if;

  update public.video_growth_campaigns set
    status = target_status,
    approved_by = case when p_action = 'approve' then trim(p_actor) else approved_by end,
    approval_note = case when p_action = 'approve' then trim(p_note) else approval_note end,
    approved_at = case when p_action = 'approve' then now() else approved_at end,
    scheduled_for = case when p_action = 'schedule' then p_scheduled_for else scheduled_for end,
    revision = revision + 1,
    updated_at = now()
  where id = p_campaign_id
  returning * into updated_campaign;

  if p_action = 'approve' then
    update public.video_growth_variants set status = 'approved', revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id and status = 'review_ready';
  elsif p_action = 'schedule' then
    update public.video_growth_variants set
      status = 'scheduled', scheduled_for = p_scheduled_for, revision = revision + 1, updated_at = now()
      where campaign_id = p_campaign_id and status = 'approved';
  end if;

  insert into public.video_growth_events (campaign_id, event_type, actor, note, detail)
  values (
    p_campaign_id, event_name, trim(p_actor), trim(p_note),
    jsonb_build_object(
      'from_status', current_campaign.status,
      'to_status', updated_campaign.status,
      'before_revision', current_campaign.revision,
      'after_revision', updated_campaign.revision,
      'scheduled_for', updated_campaign.scheduled_for,
      'external_messages_sent', 0
    )
  );

  return next updated_campaign;
end;
$$;

create or replace function public.video_growth_update_variant(
  p_variant_id uuid,
  p_expected_revision integer,
  p_action text,
  p_actor text,
  p_note text,
  p_hook text default null,
  p_caption text default null,
  p_cta text default null,
  p_deliverable_name text default null,
  p_publish_url text default null,
  p_impressions integer default null,
  p_views integer default null,
  p_clicks integer default null,
  p_replies integer default null,
  p_meetings integer default null,
  p_error_message text default null
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
begin
  select * into current_variant from public.video_growth_variants where id = p_variant_id for update;
  if not found then raise exception 'Video growth variant not found'; end if;
  if current_variant.revision <> p_expected_revision then raise exception 'Video growth variant revision conflict'; end if;
  select * into campaign from public.video_growth_campaigns where id = current_variant.campaign_id for update;

  if p_action = 'update_copy' then
    if campaign.status <> 'draft' or current_variant.status <> 'draft' then raise exception 'Only draft variants can be edited'; end if;
    update public.video_growth_variants set
      hook = trim(coalesce(p_hook, '')),
      caption = trim(coalesce(p_caption, '')),
      cta = trim(coalesce(p_cta, '')),
      deliverable_name = nullif(trim(coalesce(p_deliverable_name, '')), ''),
      error_message = null,
      revision = revision + 1,
      updated_at = now()
    where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_updated';
  elsif p_action = 'mark_ready' then
    if campaign.status <> 'draft' or current_variant.status <> 'draft' then raise exception 'Only draft variants can be marked ready'; end if;
    if char_length(trim(current_variant.hook)) < 5
      or char_length(trim(current_variant.caption)) < 10
      or char_length(trim(current_variant.cta)) < 2
      or current_variant.deliverable_name is null then
      raise exception 'Hook, caption, CTA and Studio deliverable are required';
    end if;
    if not exists (
      select 1
      from public.video_factory_studio_projects project,
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
    if coalesce(p_publish_url, '') !~ '^https://[^[:space:]]+$' then raise exception 'A valid HTTPS publication URL is required'; end if;
    update public.video_growth_variants set
      status = 'published', publish_url = trim(p_publish_url), published_at = now(),
      error_message = null, revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    if campaign.status = 'scheduled' then
      update public.video_growth_campaigns set status = 'active', revision = revision + 1, updated_at = now()
        where id = campaign.id;
    end if;
    event_name := 'variant_published';
  elsif p_action = 'record_metrics' then
    if current_variant.status <> 'published' then raise exception 'Only published variants accept metrics'; end if;
    if coalesce(p_impressions, -1) < current_variant.impressions
      or coalesce(p_views, -1) < current_variant.views
      or coalesce(p_clicks, -1) < current_variant.clicks
      or coalesce(p_replies, -1) < current_variant.replies
      or coalesce(p_meetings, -1) < current_variant.meetings then
      raise exception 'Metrics must be non-decreasing absolute totals';
    end if;
    update public.video_growth_variants set
      impressions = p_impressions, views = p_views, clicks = p_clicks,
      replies = p_replies, meetings = p_meetings,
      revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_metrics_recorded';
  elsif p_action = 'fail' then
    if current_variant.status not in ('approved', 'scheduled') then raise exception 'Only approved or scheduled variants can fail'; end if;
    if char_length(trim(coalesce(p_error_message, ''))) < 3 then raise exception 'Failure reason is required'; end if;
    update public.video_growth_variants set
      status = 'failed', error_message = trim(p_error_message), revision = revision + 1, updated_at = now()
      where id = p_variant_id returning * into updated_variant;
    event_name := 'variant_failed';
  else
    raise exception 'Unsupported video growth variant action';
  end if;

  insert into public.video_growth_events (campaign_id, variant_id, event_type, channel, actor, note, detail)
  values (
    current_variant.campaign_id, current_variant.id, event_name, current_variant.channel,
    trim(p_actor), trim(p_note),
    jsonb_build_object(
      'before_status', current_variant.status,
      'after_status', updated_variant.status,
      'before_revision', current_variant.revision,
      'after_revision', updated_variant.revision,
      'impressions', updated_variant.impressions,
      'clicks', updated_variant.clicks,
      'replies', updated_variant.replies,
      'meetings', updated_variant.meetings
    )
  );

  return next updated_variant;
end;
$$;

revoke all on function public.video_growth_create_campaign(text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.video_growth_create_campaign(text, text, text, text, text, text, text, text)
  to service_role;
revoke all on function public.video_growth_transition_campaign(uuid, integer, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.video_growth_transition_campaign(uuid, integer, text, text, text, timestamptz)
  to service_role;
revoke all on function public.video_growth_update_variant(
  uuid, integer, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, text
) from public, anon, authenticated;
grant execute on function public.video_growth_update_variant(
  uuid, integer, text, text, text, text, text, text, text, text,
  integer, integer, integer, integer, integer, text
) to service_role;

comment on table public.video_growth_campaigns is
  'Direct acquisition campaigns linked to approved Video Factory Studio projects.';
comment on table public.video_growth_variants is
  'Channel-specific creative, publication state and aggregate outcomes for direct growth campaigns.';
comment on table public.video_growth_events is
  'Append-only audit trail for campaign approval, publication and measurement actions.';

notify pgrst, 'reload schema';
commit;
