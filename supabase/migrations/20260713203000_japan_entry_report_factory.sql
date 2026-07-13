alter table public.sales_enrichment_jobs
  drop constraint if exists sales_enrichment_jobs_job_type_check;

alter table public.sales_enrichment_jobs
  add constraint sales_enrichment_jobs_job_type_check
  check (job_type in (
    'company_karte',
    'dify_diagnosis',
    'report_personalize',
    'twenty_sync',
    'demo_generate',
    'japan_entry_report'
  ));

create index if not exists idx_sales_enrichment_jobs_japan_entry_report_queue
  on public.sales_enrichment_jobs (status, priority desc, next_run_at asc, created_at asc)
  where job_type = 'japan_entry_report' and status in ('queued', 'running');

alter table public.sales_japan_entry_projections
  add column if not exists idempotency_key text;

create unique index if not exists uq_sales_japan_entry_projection_idempotency
  on public.sales_japan_entry_projections (company_id, idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sales_enrichment_jobs'
  ) then
    alter publication supabase_realtime add table public.sales_enrichment_jobs;
  end if;
exception
  when insufficient_privilege then
    raise notice 'Skipping sales_enrichment_jobs realtime publication: insufficient privilege';
  when undefined_object then
    raise notice 'Skipping sales_enrichment_jobs realtime publication: publication is unavailable';
end
$$;

comment on column public.sales_japan_entry_projections.idempotency_key is
  'Retry-safe generation key. A report-factory job reuses its saved projection instead of generating duplicates.';

comment on table public.sales_enrichment_jobs is
  'Event-driven enrichment, reviewed demo and Japan Entry Opportunity Brief generation queue. No form submission is performed by report jobs.';
