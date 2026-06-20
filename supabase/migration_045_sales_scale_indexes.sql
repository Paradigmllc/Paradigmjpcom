-- migration_045_sales_scale_indexes.sql
-- Phase 9-10: scale hardening for thousands-tens of thousands of leads.
-- Additive, idempotent indexes on the hottest Sales OS query paths.
-- Safe to re-run; no data change. Applied out-of-band via supabase MCP / run-migrations.sh.

-- Enrichment job queue fetch: status='queued' AND next_run_at<=now ORDER BY priority DESC, created_at ASC
create index if not exists idx_sales_enrichment_jobs_queue
  on public.sales_enrichment_jobs (status, next_run_at, priority desc, created_at);

-- Stale running-job recovery scan: status='running' ORDER BY updated_at
create index if not exists idx_sales_enrichment_jobs_running
  on public.sales_enrichment_jobs (status, updated_at);

-- Enrichment job per-company/type lookup (enqueue dedup + listings)
create index if not exists idx_sales_enrichment_jobs_company_type
  on public.sales_enrichment_jobs (company_id, job_type, status);

-- Report regenerator: report_generated_at IS NULL AND pipeline_status='report_ready'
create index if not exists idx_sales_companies_report_pending
  on public.sales_companies (pipeline_status, report_generated_at);

-- Dashboard / status listings ordered by recency
create index if not exists idx_sales_companies_created_at
  on public.sales_companies (created_at desc);

-- Region-scoped queries (12-region strict scoping)
create index if not exists idx_sales_companies_region_status
  on public.sales_companies (region, pipeline_status);

-- Source coverage rows per company (upsert onConflict company_id,source_slug already unique; add lookup)
create index if not exists idx_sales_source_runs_company
  on public.sales_source_runs (company_id, measured_at desc);

-- Operator queue open items ordered by priority
create index if not exists idx_sales_operator_queue_open
  on public.sales_operator_queue_items (status, priority desc);

-- Pipeline runs stale recovery / listings
create index if not exists idx_sales_pipeline_runs_status_updated
  on public.sales_pipeline_runs (status, updated_at);
