-- Repair RevenueOS/Sales OS pipeline schema after the Supabase OSS migration.
-- The production database had the tables but missed several relationships,
-- columns, indexes, and run-step rows that the current app relies on.

begin;

create or replace function public.sales_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sales_error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null default 'error',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint sales_error_log_severity_check
    check (severity in ('info', 'warn', 'error', 'critical'))
);

alter table public.sales_error_log enable row level security;
drop policy if exists sales_error_log_service_role_all on public.sales_error_log;
create policy sales_error_log_service_role_all
  on public.sales_error_log for all to service_role
  using (true) with check (true);
grant select, insert, update, delete on table public.sales_error_log to service_role;
create index if not exists idx_sales_error_log_recorded_at
  on public.sales_error_log (recorded_at desc);
create index if not exists idx_sales_error_log_unresolved
  on public.sales_error_log (severity, recorded_at desc)
  where resolved_at is null;

create table if not exists public.sales_infrastructure_migration (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  provider text not null,
  role text not null,
  status text not null default 'planned',
  monthly_cost_yen integer,
  cpu_label text,
  memory_label text,
  disk_label text,
  public_url text,
  sort_order integer not null default 100,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sales_infrastructure_migration enable row level security;
drop policy if exists sales_infrastructure_migration_service_role_all on public.sales_infrastructure_migration;
create policy sales_infrastructure_migration_service_role_all
  on public.sales_infrastructure_migration for all to service_role
  using (true) with check (true);
grant select, insert, update, delete on table public.sales_infrastructure_migration to service_role;
create index if not exists idx_sales_infra_migration_status
  on public.sales_infrastructure_migration (status, sort_order);

alter table public.sales_tool_connections
  add column if not exists last_checked_at timestamptz;

alter table public.sales_operator_queue_items
  add column if not exists region text not null default 'global',
  add column if not exists queue_type text not null default 'analysis',
  add column if not exists assigned_to text;

alter table public.sales_source_runs
  add column if not exists measured_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.sales_source_runs
set measured_at = coalesce(measured_at, created_at, now()),
    updated_at = coalesce(updated_at, created_at, measured_at, now())
where measured_at is null or updated_at is null;

alter table public.sales_pipeline_runs
  drop constraint if exists sales_pipeline_runs_source_check;
alter table public.sales_pipeline_runs
  add constraint sales_pipeline_runs_source_check
  check (source in ('sales_os', 'twenty', 'twenty_csv_intake', 'csv', 'manual', 'webhook', 'batch'));

alter table public.sales_pipeline_steps
  drop constraint if exists sales_pipeline_steps_key_check;
alter table public.sales_pipeline_steps
  add constraint sales_pipeline_steps_key_check
  check (step_key in (
    'twenty_csv_intake',
    'supabase_normalize',
    'karte_generate',
    'report_generate',
    'video_generate',
    'r2_manifest',
    'external_studio_sync',
    'twenty_writeback',
    'outreach_preflight',
    'outreach_send',
    'reply_capture',
    'follow_up_queue'
  ));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_pipeline_runs_company_id_fkey'
      and conrelid = 'public.sales_pipeline_runs'::regclass
  ) then
    alter table public.sales_pipeline_runs
      add constraint sales_pipeline_runs_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_artifact_manifest_run_id_fkey'
      and conrelid = 'public.sales_artifact_manifest'::regclass
  ) then
    alter table public.sales_artifact_manifest
      add constraint sales_artifact_manifest_run_id_fkey
      foreign key (run_id) references public.sales_pipeline_runs (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_artifact_manifest_company_id_fkey'
      and conrelid = 'public.sales_artifact_manifest'::regclass
  ) then
    alter table public.sales_artifact_manifest
      add constraint sales_artifact_manifest_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_source_runs_company_id_fkey'
      and conrelid = 'public.sales_source_runs'::regclass
  ) then
    alter table public.sales_source_runs
      add constraint sales_source_runs_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_operator_queue_items_company_id_fkey'
      and conrelid = 'public.sales_operator_queue_items'::regclass
  ) then
    alter table public.sales_operator_queue_items
      add constraint sales_operator_queue_items_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_operator_queue_items_pipeline_run_id_fkey'
      and conrelid = 'public.sales_operator_queue_items'::regclass
  ) then
    alter table public.sales_operator_queue_items
      add constraint sales_operator_queue_items_pipeline_run_id_fkey
      foreign key (pipeline_run_id) references public.sales_pipeline_runs (id) on delete set null;
  end if;

  if to_regclass('public.sales_video_jobs') is not null and not exists (
    select 1 from pg_constraint
    where conname = 'sales_video_jobs_company_id_fkey'
      and conrelid = 'public.sales_video_jobs'::regclass
  ) then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete set null;
  end if;

  if to_regclass('public.sales_video_jobs') is not null and not exists (
    select 1 from pg_constraint
    where conname = 'sales_video_jobs_pipeline_run_id_fkey'
      and conrelid = 'public.sales_video_jobs'::regclass
  ) then
    alter table public.sales_video_jobs
      add constraint sales_video_jobs_pipeline_run_id_fkey
      foreign key (pipeline_run_id) references public.sales_pipeline_runs (id) on delete set null;
  end if;

  if to_regclass('public.sales_japan_readiness_insights') is not null and not exists (
    select 1 from pg_constraint
    where conname = 'sales_japan_readiness_insights_company_id_fkey'
      and conrelid = 'public.sales_japan_readiness_insights'::regclass
  ) then
    alter table public.sales_japan_readiness_insights
      add constraint sales_japan_readiness_insights_company_id_fkey
      foreign key (company_id) references public.sales_companies (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_sales_pipeline_runs_company
  on public.sales_pipeline_runs (company_id, created_at desc);
create index if not exists idx_sales_pipeline_runs_status
  on public.sales_pipeline_runs (status, created_at desc);
create index if not exists idx_sales_pipeline_runs_source_status
  on public.sales_pipeline_runs (source, status, updated_at desc);
create index if not exists idx_sales_pipeline_runs_trigger_run
  on public.sales_pipeline_runs (trigger_run_id)
  where trigger_run_id is not null;
create unique index if not exists uniq_sales_pipeline_steps_run_key
  on public.sales_pipeline_steps (run_id, step_key);
create index if not exists idx_sales_pipeline_steps_run
  on public.sales_pipeline_steps (run_id, position);
create index if not exists idx_sales_pipeline_steps_status
  on public.sales_pipeline_steps (status, updated_at desc);
create unique index if not exists uniq_sales_source_runs_company_source
  on public.sales_source_runs (company_id, source_slug);
create index if not exists idx_sales_source_runs_company_status
  on public.sales_source_runs (company_id, status, measured_at desc);
create index if not exists idx_sales_source_runs_source_status
  on public.sales_source_runs (source_slug, status, measured_at desc);
create index if not exists idx_sales_artifact_manifest_company
  on public.sales_artifact_manifest (company_id, artifact_type, created_at desc);
create index if not exists idx_sales_artifact_manifest_run
  on public.sales_artifact_manifest (run_id, artifact_type);
create index if not exists idx_sales_operator_queue_status_priority
  on public.sales_operator_queue_items (region, status, priority desc, created_at desc);
create index if not exists idx_sales_operator_queue_company
  on public.sales_operator_queue_items (company_id, status, created_at desc)
  where company_id is not null;

drop trigger if exists trg_sales_pipeline_runs_touch on public.sales_pipeline_runs;
create trigger trg_sales_pipeline_runs_touch
  before update on public.sales_pipeline_runs
  for each row execute function public.sales_touch_updated_at();
drop trigger if exists trg_sales_pipeline_steps_touch on public.sales_pipeline_steps;
create trigger trg_sales_pipeline_steps_touch
  before update on public.sales_pipeline_steps
  for each row execute function public.sales_touch_updated_at();
drop trigger if exists trg_sales_artifact_manifest_touch on public.sales_artifact_manifest;
create trigger trg_sales_artifact_manifest_touch
  before update on public.sales_artifact_manifest
  for each row execute function public.sales_touch_updated_at();
drop trigger if exists trg_sales_source_runs_touch on public.sales_source_runs;
create trigger trg_sales_source_runs_touch
  before update on public.sales_source_runs
  for each row execute function public.sales_touch_updated_at();
drop trigger if exists trg_sales_operator_queue_items_touch on public.sales_operator_queue_items;
create trigger trg_sales_operator_queue_items_touch
  before update on public.sales_operator_queue_items
  for each row execute function public.sales_touch_updated_at();

with step_plan(step_key, position, owner_tool, base_required) as (
  values
    ('twenty_csv_intake', 1, 'twenty_or_csv', true),
    ('supabase_normalize', 2, 'supabase', true),
    ('karte_generate', 3, 'supabase_dify', true),
    ('report_generate', 4, 'nextjs_reports', true),
    ('video_generate', 5, 'trigger_dev_video', false),
    ('r2_manifest', 6, 'cloudflare_r2', true),
    ('external_studio_sync', 7, 'directus_keystatic', false),
    ('twenty_writeback', 8, 'twenty', true),
    ('outreach_preflight', 9, 'sales_outreach', true),
    ('outreach_send', 10, 'sales_outreach', true),
    ('reply_capture', 11, 'chatwoot_livekit', false),
    ('follow_up_queue', 12, 'operator_queue', false)
),
runs_without_steps as (
  select r.*
  from public.sales_pipeline_runs r
  where not exists (
    select 1 from public.sales_pipeline_steps s where s.run_id = r.id
  )
)
insert into public.sales_pipeline_steps (
  run_id,
  company_id,
  step_key,
  position,
  status,
  required,
  owner_tool,
  started_at,
  completed_at,
  input_payload,
  output_payload
)
select
  r.id,
  r.company_id,
  p.step_key,
  p.position,
  case
    when r.status = 'completed' and (p.base_required or (p.step_key = 'video_generate' and r.require_video) or (p.step_key = 'external_studio_sync' and r.auto_sync_external_studios)) then 'completed'
    when not (p.base_required or (p.step_key = 'video_generate' and r.require_video) or (p.step_key = 'external_studio_sync' and r.auto_sync_external_studios)) then 'skipped'
    else 'queued'
  end,
  (p.base_required or (p.step_key = 'video_generate' and r.require_video) or (p.step_key = 'external_studio_sync' and r.auto_sync_external_studios)),
  p.owner_tool,
  case when r.status = 'completed' then coalesce(r.started_at, r.created_at) else null end,
  case when r.status = 'completed' then coalesce(r.completed_at, r.updated_at) else null end,
  '{}'::jsonb,
  case when r.status = 'completed' then jsonb_build_object('backfilled_from_run_status', true) else '{}'::jsonb end
from runs_without_steps r
cross join step_plan p
on conflict (run_id, step_key) do nothing;

insert into public.sales_artifact_manifest (
  run_id,
  company_id,
  artifact_type,
  source_tool,
  storage_provider,
  public_url,
  status,
  metadata
)
select
  r.id,
  r.company_id,
  'company_karte',
  'supabase',
  'supabase',
  null,
  'generated',
  jsonb_build_object('backfilled_at', now(), 'source', 'migration_059')
from public.sales_pipeline_runs r
join public.sales_companies c on c.id = r.company_id
where r.status = 'completed'
  and not exists (
    select 1 from public.sales_artifact_manifest a
    where a.run_id = r.id and a.artifact_type = 'company_karte'
  );

insert into public.sales_artifact_manifest (
  run_id,
  company_id,
  artifact_type,
  source_tool,
  storage_provider,
  public_url,
  status,
  metadata
)
select
  r.id,
  r.company_id,
  'diagnostic_report',
  'nextjs_reports',
  'supabase',
  c.report_url,
  case when c.report_url is not null and btrim(c.report_url) <> '' then 'delivered' else 'planned' end,
  jsonb_build_object('backfilled_at', now(), 'source', 'migration_059')
from public.sales_pipeline_runs r
join public.sales_companies c on c.id = r.company_id
where r.status = 'completed'
  and not exists (
    select 1 from public.sales_artifact_manifest a
    where a.run_id = r.id and a.artifact_type = 'diagnostic_report'
  );

insert into public.sales_source_runs (company_id, source_slug, category, status, score, details, measured_at)
select
  c.id,
  v.source_slug,
  v.category,
  v.status,
  v.score,
  v.details,
  coalesce(c.report_generated_at, c.updated_at, now())
from public.sales_companies c
cross join lateral (
  values
    ('twenty', 'crm', case when c.source = 'twenty' or c.meta ? 'twenty' then 'collected' else 'missing' end, case when c.source = 'twenty' or c.meta ? 'twenty' then 100 else 0 end, jsonb_build_object('source', c.source, 'backfilled_at', now())),
    ('diagnostic_report', 'analysis', case when c.report_url is not null and btrim(c.report_url) <> '' then 'collected' else 'missing' end, case when c.report_url is not null and btrim(c.report_url) <> '' then 100 else 0 end, jsonb_build_object('report_url', c.report_url, 'backfilled_at', now())),
    ('form_discovery', 'outreach', case when c.meta ? 'contact_form_url' then 'collected' else 'missing' end, case when c.meta ? 'contact_form_url' then 100 else 0 end, jsonb_build_object('form_url', c.meta->>'contact_form_url', 'backfilled_at', now())),
    ('wappalyzer', 'tech_footprint', case when c.tech_stack is not null or c.meta ? 'tech' then 'collected' else 'missing' end, case when c.tech_stack is not null or c.meta ? 'tech' then 80 else 0 end, jsonb_build_object('backfilled_at', now())),
    ('dify_diagnosis', 'analysis', case when c.pain_diagnosis is not null or c.dify_result is not null then 'collected' else 'missing' end, case when c.pain_diagnosis is not null or c.dify_result is not null then 80 else 0 end, jsonb_build_object('backfilled_at', now())),
    ('visual_evidence', 'evidence', case when c.visual_evidence is not null then 'collected' else 'missing' end, case when c.visual_evidence is not null then 70 else 0 end, jsonb_build_object('backfilled_at', now()))
) as v(source_slug, category, status, score, details)
on conflict (company_id, source_slug) do update set
  category = excluded.category,
  status = excluded.status,
  score = excluded.score,
  details = public.sales_source_runs.details || excluded.details,
  measured_at = greatest(public.sales_source_runs.measured_at, excluded.measured_at),
  updated_at = now();

do $$
declare
  r record;
  p_name text;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'sales_error_log',
        'sales_infrastructure_migration',
        'sales_tool_connections',
        'sales_operator_queue_items',
        'sales_source_runs',
        'sales_pipeline_runs',
        'sales_pipeline_steps',
        'sales_artifact_manifest',
        'sales_video_jobs',
        'sales_japan_readiness_insights'
      )
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    execute format('revoke all on table %I.%I from anon, authenticated', r.schemaname, r.tablename);
    execute format('grant select, insert, update, delete on table %I.%I to service_role', r.schemaname, r.tablename);
    p_name := left('service_role_all_' || r.tablename, 63);
    execute format('drop policy if exists %I on %I.%I', p_name, r.schemaname, r.tablename);
    execute format(
      'create policy %I on %I.%I for all to service_role using (true) with check (true)',
      p_name,
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
