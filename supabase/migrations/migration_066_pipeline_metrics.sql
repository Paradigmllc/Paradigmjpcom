-- Migration 066: Pipeline metrics table — observability foundation.
-- 2026-07-07: Records every pipeline execution with timing and status.

create table if not exists public.sales_pipeline_metrics (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  skill text not null,
  status text not null default 'started',
  duration_ms integer not null default 0,
  candidates_discovered integer not null default 0,
  candidates_diagnosed integer not null default 0,
  candidates_synced integer not null default 0,
  errors text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sales_pipeline_metrics_skill_check
    check (skill in ('lead-discovery', 'diagnosis-output', 'crm-sync', 'outreach-exec')),
  constraint sales_pipeline_metrics_status_check
    check (status in ('started', 'completed', 'failed'))
);

create index if not exists idx_pipeline_metrics_run
  on public.sales_pipeline_metrics (run_id);

create index if not exists idx_pipeline_metrics_skill_started
  on public.sales_pipeline_metrics (skill, started_at desc);

create index if not exists idx_pipeline_metrics_status
  on public.sales_pipeline_metrics (status, started_at desc);

alter table public.sales_pipeline_metrics enable row level security;

create policy pipeline_metrics_service_role_all
  on public.sales_pipeline_metrics for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on public.sales_pipeline_metrics to service_role;

notify pgrst, 'reload schema';
