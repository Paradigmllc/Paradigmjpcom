begin;

alter table public.video_growth_variants
  add column if not exists content_revision integer not null default 1
    check (content_revision between 1 and 1000000);

alter table public.video_growth_events
  add column if not exists actor_key text,
  add column if not exists actor_email text,
  add column if not exists actor_role text,
  add column if not exists auth_source text;

alter table public.video_growth_events
  drop constraint if exists video_growth_events_event_type_check;
alter table public.video_growth_events
  add constraint video_growth_events_event_type_check check (event_type in (
    'campaign_created', 'commercial_work_order_created', 'work_order_updated',
    'readiness_check_updated', 'review_requested', 'human_approved',
    'campaign_scheduled', 'campaign_activated', 'campaign_paused',
    'campaign_completed', 'campaign_cancelled', 'variant_updated',
    'variant_review_ready', 'approval_requested', 'approval_decided',
    'revision_requested', 'revision_updated', 'variant_published',
    'daily_metrics_recorded', 'variant_metrics_recorded', 'variant_failed'
  ));

create table if not exists public.video_growth_work_orders (
  campaign_id uuid primary key references public.video_growth_campaigns(id) on delete cascade,
  client_name text not null check (char_length(trim(client_name)) between 2 and 160),
  client_contact_name text check (client_contact_name is null or char_length(trim(client_contact_name)) between 2 and 120),
  client_contact_email text check (client_contact_email is null or client_contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  plan text not null check (plan in ('essential', 'growth', 'scale', 'custom')),
  monthly_video_quota integer not null check (monthly_video_quota between 1 and 100),
  billing_status text not null check (billing_status in ('trial', 'contracted', 'invoiced', 'paid', 'overdue', 'cancelled')),
  work_status text not null default 'intake' check (work_status in (
    'intake', 'production', 'internal_review', 'client_review', 'revision',
    'ready', 'delivered', 'on_hold', 'closed'
  )),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  timezone text not null default 'Asia/Tokyo' check (char_length(trim(timezone)) between 2 and 64),
  languages text[] not null default array['ja']::text[] check (cardinality(languages) between 1 and 10),
  contract_reference text check (contract_reference is null or char_length(trim(contract_reference)) <= 200),
  purchase_order_reference text check (purchase_order_reference is null or char_length(trim(purchase_order_reference)) <= 200),
  delivery_owner text not null check (char_length(trim(delivery_owner)) between 2 and 120),
  client_approver text check (client_approver is null or char_length(trim(client_approver)) between 2 and 120),
  kickoff_at timestamptz,
  delivery_due_at timestamptz not null,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_growth_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  check_key text not null check (check_key in (
    'contract', 'payment', 'brief', 'brand_assets', 'usage_rights',
    'landing_page', 'tracking'
  )),
  status text not null default 'pending' check (status in ('pending', 'passed', 'waived', 'failed')),
  note text not null default '' check (char_length(note) <= 2000),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://[^[:space:]]+$'),
  checked_by_key text,
  checked_by_email text,
  checked_by_role text,
  checked_at timestamptz,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, check_key)
);

create table if not exists public.video_growth_approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  variant_id uuid not null references public.video_growth_variants(id) on delete cascade,
  stage text not null check (stage in ('internal_quality', 'client_release')),
  content_revision integer not null check (content_revision between 1 and 1000000),
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'changes_requested', 'rejected')),
  request_note text not null check (char_length(trim(request_note)) between 4 and 2000),
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://[^[:space:]]+$'),
  requested_by_key text not null,
  requested_by_email text,
  requested_by_role text not null,
  requested_at timestamptz not null default now(),
  decision_note text,
  decided_by_key text,
  decided_by_email text,
  decided_by_role text,
  decided_at timestamptz,
  revision integer not null default 1 check (revision between 1 and 1000000),
  updated_at timestamptz not null default now(),
  unique (variant_id, stage, content_revision)
);

create table if not exists public.video_growth_revision_requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  variant_id uuid not null references public.video_growth_variants(id) on delete cascade,
  category text not null check (category in ('copy', 'visual', 'audio', 'subtitles', 'legal', 'other')),
  severity text not null check (severity in ('minor', 'major', 'blocking')),
  description text not null check (char_length(trim(description)) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'rejected')),
  requested_by_key text not null,
  requested_by_email text,
  requested_by_role text not null,
  assigned_to text,
  due_at timestamptz,
  resolution_note text,
  resolved_by_key text,
  resolved_by_email text,
  resolved_at timestamptz,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_growth_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.video_growth_campaigns(id) on delete cascade,
  variant_id uuid not null references public.video_growth_variants(id) on delete cascade,
  metric_date date not null,
  impressions integer not null default 0 check (impressions >= 0),
  views integer not null default 0 check (views >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  replies integer not null default 0 check (replies >= 0),
  meetings integer not null default 0 check (meetings >= 0),
  source text not null default 'manual' check (source in ('manual', 'csv', 'api')),
  recorded_by_key text not null,
  recorded_by_email text,
  recorded_by_role text not null,
  revision integer not null default 1 check (revision between 1 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, metric_date)
);

create index if not exists video_growth_work_orders_due_idx on public.video_growth_work_orders(work_status, delivery_due_at);
create index if not exists video_growth_readiness_campaign_idx on public.video_growth_readiness_checks(campaign_id, status);
create index if not exists video_growth_approvals_queue_idx on public.video_growth_approvals(decision, stage, requested_at);
create index if not exists video_growth_revisions_queue_idx on public.video_growth_revision_requests(status, due_at);
create index if not exists video_growth_daily_metrics_date_idx on public.video_growth_daily_metrics(metric_date desc, campaign_id);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'video_growth_work_orders', 'video_growth_readiness_checks', 'video_growth_approvals',
    'video_growth_revision_requests', 'video_growth_daily_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', table_name);
    execute format('grant select, insert, update on table public.%I to service_role', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format(
      'create policy %I on public.%I for all to service_role using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')',
      table_name || '_service_role_all', table_name
    );
  end loop;
end;
$$;

comment on table public.video_growth_work_orders is 'Commercial video subscription work orders, SLA, plan and billing state.';
comment on table public.video_growth_readiness_checks is 'Contract, payment, brief, asset, rights, landing-page and tracking gates.';
comment on table public.video_growth_approvals is 'Revision-bound internal quality and client release approvals.';
comment on table public.video_growth_revision_requests is 'Audited creative revision requests and resolution state.';
comment on table public.video_growth_daily_metrics is 'Per-day channel outcomes used to derive aggregate campaign metrics.';

notify pgrst, 'reload schema';
commit;
