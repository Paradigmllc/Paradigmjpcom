alter table public.sales_enrichment_jobs
  drop constraint if exists sales_enrichment_jobs_job_type_check;

alter table public.sales_enrichment_jobs
  add constraint sales_enrichment_jobs_job_type_check
  check (job_type in ('company_karte', 'dify_diagnosis', 'report_personalize', 'twenty_sync', 'demo_generate'));

create index if not exists idx_sales_enrichment_jobs_demo_queue
  on public.sales_enrichment_jobs (status, priority desc, created_at asc)
  where job_type = 'demo_generate' and status in ('queued', 'running');

comment on table public.sales_enrichment_jobs is
  'Durable event-drained queue for enrichment and reviewed-manifest private demo generation; no resident polling worker.';

notify pgrst, 'reload schema';
