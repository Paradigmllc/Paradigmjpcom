-- ============================================================
-- Sales OS enrichment jobs
-- Migration: 015_sales_enrichment_jobs
-- Created: 2026-05-28
-- ============================================================
-- Purpose:
--   Make Supabase OSS the durable orchestration spine for CSV, NocoDB,
--   Twenty, n8n, Trigger.dev, Dify, and report generation.
-- ============================================================

create table if not exists public.sales_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  job_type text not null default 'company_karte',
  status text not null default 'queued',
  priority integer not null default 50,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  source text,
  triggered_by text,
  next_run_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  locked_at timestamptz,
  lock_owner text,
  error_message text,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_enrichment_jobs_job_type_check
    check (job_type in ('company_karte', 'dify_diagnosis', 'report_personalize', 'twenty_sync')),
  constraint sales_enrichment_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  constraint sales_enrichment_jobs_priority_check
    check (priority between 0 and 100),
  constraint sales_enrichment_jobs_attempts_check
    check (attempts >= 0 and max_attempts >= 1)
);

create index if not exists idx_sales_enrichment_jobs_status
  on public.sales_enrichment_jobs (status, priority desc, next_run_at asc, created_at asc);

create index if not exists idx_sales_enrichment_jobs_company
  on public.sales_enrichment_jobs (company_id, created_at desc);

create unique index if not exists uniq_sales_enrichment_jobs_active_company_type
  on public.sales_enrichment_jobs (company_id, job_type)
  where status in ('queued', 'running');

create table if not exists public.sales_diagnosis_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies (id) on delete cascade,
  job_id uuid references public.sales_enrichment_jobs (id) on delete set null,
  event_type text not null,
  status text not null default 'info',
  title text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sales_diagnosis_events_status_check
    check (status in ('info', 'success', 'warning', 'error'))
);

create index if not exists idx_sales_diagnosis_events_company
  on public.sales_diagnosis_events (company_id, created_at desc);

create index if not exists idx_sales_diagnosis_events_status
  on public.sales_diagnosis_events (status, created_at desc);

create or replace function public.sales_enqueue_company_karte_job()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.meta->>'skip_enrichment', 'false') = 'true' then
    return new;
  end if;

  if new.pipeline_status in ('pending', 'scanning', 'manual_queue') then
    insert into public.sales_enrichment_jobs
      (company_id, job_type, status, priority, source, triggered_by, input_payload)
    values
      (
        new.id,
        'company_karte',
        'queued',
        case when new.source in ('apollo', 'apollo_exporter', 'csv_import') then 70 else 50 end,
        coalesce(new.source, 'sales_companies_insert'),
        'database_trigger',
        jsonb_build_object(
          'domain', new.domain,
          'company_name', new.company_name,
          'source', new.source,
          'inserted_at', now()
        )
      )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_companies_enqueue_karte on public.sales_companies;
create trigger trg_sales_companies_enqueue_karte
after insert on public.sales_companies
for each row execute function public.sales_enqueue_company_karte_job();

drop trigger if exists trg_sales_enrichment_jobs_touch on public.sales_enrichment_jobs;
create trigger trg_sales_enrichment_jobs_touch
before update on public.sales_enrichment_jobs
for each row execute function public.sales_touch_updated_at();

alter table public.sales_enrichment_jobs enable row level security;
alter table public.sales_diagnosis_events enable row level security;

drop policy if exists sales_enrichment_jobs_service_role_all on public.sales_enrichment_jobs;
create policy sales_enrichment_jobs_service_role_all
  on public.sales_enrichment_jobs for all to service_role
  using (true) with check (true);

drop policy if exists sales_diagnosis_events_service_role_all on public.sales_diagnosis_events;
create policy sales_diagnosis_events_service_role_all
  on public.sales_diagnosis_events for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.sales_enrichment_jobs to service_role;
grant select, insert, update, delete on table public.sales_diagnosis_events to service_role;

comment on table public.sales_enrichment_jobs is
  'Durable queue for company karte enrichment, Dify diagnosis, report personalization, and CRM sync.';

comment on table public.sales_diagnosis_events is
  'Observable timeline for enrichment and diagnosis outcomes shown in the sales dashboard.';
