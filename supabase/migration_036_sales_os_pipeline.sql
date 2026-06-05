-- Sales OS unified pipeline runs.
-- Supabase is the SSOT; Trigger.dev is the execution spine; external tools only sync through these runs.

create table if not exists public.sales_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  source text not null default 'sales_os',
  status text not null default 'queued',
  current_step text,
  trigger_provider text not null default 'trigger.dev',
  trigger_task_id text,
  trigger_run_id text,
  requested_by text not null default 'sales-os',
  require_video boolean not null default false,
  auto_sync_external_studios boolean not null default true,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_pipeline_runs_source_check
    check (source in ('sales_os', 'twenty', 'csv', 'manual', 'webhook', 'batch')),
  constraint sales_pipeline_runs_status_check
    check (status in ('queued', 'running', 'waiting_external', 'needs_review', 'completed', 'failed', 'cancelled')),
  constraint sales_pipeline_runs_provider_check
    check (trigger_provider in ('trigger.dev', 'local', 'manual'))
);

create table if not exists public.sales_pipeline_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sales_pipeline_runs (id) on delete cascade,
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  step_key text not null,
  position integer not null,
  status text not null default 'queued',
  required boolean not null default true,
  owner_tool text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_pipeline_steps_status_check
    check (status in ('queued', 'running', 'waiting_external', 'needs_review', 'completed', 'failed', 'skipped', 'cancelled')),
  constraint sales_pipeline_steps_key_check
    check (step_key in (
      'twenty_csv_intake',
      'supabase_normalize',
      'karte_generate',
      'report_generate',
      'video_generate',
      'r2_manifest',
      'external_studio_sync',
      'twenty_writeback'
    )),
  unique (run_id, step_key)
);

create table if not exists public.sales_artifact_manifest (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.sales_pipeline_runs (id) on delete set null,
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  artifact_type text not null,
  source_tool text not null default 'sales_os',
  storage_provider text not null default 'cloudflare_r2',
  r2_bucket text,
  r2_key text,
  public_url text,
  status text not null default 'planned',
  version integer not null default 1,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_artifact_manifest_type_check
    check (artifact_type in ('company_karte', 'diagnostic_report', 'sales_deck', 'astro_demo_site', 'sales_video', 'delivery_bundle')),
  constraint sales_artifact_manifest_storage_check
    check (storage_provider in ('cloudflare_r2', 'supabase', 'directus', 'keystatic', 'twenty', 'external')),
  constraint sales_artifact_manifest_status_check
    check (status in ('planned', 'generated', 'uploaded', 'synced', 'delivered', 'failed', 'skipped'))
);

create index if not exists idx_sales_pipeline_runs_company
  on public.sales_pipeline_runs (company_id, created_at desc);

create index if not exists idx_sales_pipeline_runs_status
  on public.sales_pipeline_runs (status, created_at desc);

create index if not exists idx_sales_pipeline_steps_run
  on public.sales_pipeline_steps (run_id, position);

create index if not exists idx_sales_pipeline_steps_status
  on public.sales_pipeline_steps (status, updated_at desc);

create index if not exists idx_sales_artifact_manifest_company
  on public.sales_artifact_manifest (company_id, artifact_type, created_at desc);

create index if not exists idx_sales_artifact_manifest_run
  on public.sales_artifact_manifest (run_id, artifact_type);

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

alter table public.sales_pipeline_runs enable row level security;
alter table public.sales_pipeline_steps enable row level security;
alter table public.sales_artifact_manifest enable row level security;

drop policy if exists sales_pipeline_runs_service_role_all on public.sales_pipeline_runs;
create policy sales_pipeline_runs_service_role_all
  on public.sales_pipeline_runs for all to service_role
  using (true) with check (true);

drop policy if exists sales_pipeline_steps_service_role_all on public.sales_pipeline_steps;
create policy sales_pipeline_steps_service_role_all
  on public.sales_pipeline_steps for all to service_role
  using (true) with check (true);

drop policy if exists sales_artifact_manifest_service_role_all on public.sales_artifact_manifest;
create policy sales_artifact_manifest_service_role_all
  on public.sales_artifact_manifest for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.sales_pipeline_runs to service_role;
grant select, insert, update, delete on table public.sales_pipeline_steps to service_role;
grant select, insert, update, delete on table public.sales_artifact_manifest to service_role;

comment on table public.sales_pipeline_runs is
  'Company-level Sales OS executions. Supabase stores the run state; Trigger.dev executes; Twenty, Directus, Keystatic, and R2 sync through the run.';

comment on table public.sales_pipeline_steps is
  'Ordered step state for the unified Sales OS flow from Twenty/CSV intake through delivery writeback.';

comment on table public.sales_artifact_manifest is
  'SSOT manifest for generated sales artifacts and R2/public delivery URLs.';

notify pgrst, 'reload schema';
