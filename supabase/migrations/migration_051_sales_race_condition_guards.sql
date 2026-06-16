-- ============================================================
-- migration_051_sales_race_condition_guards.sql
-- Date: 2026-06-16
-- Purpose: Prevent duplicate active pipeline runs and enrichment jobs.
-- ============================================================

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_pipeline_runs_active
    ON public.sales_pipeline_runs (company_id)
    WHERE status IN ('queued', 'running', 'waiting_external');
  COMMENT ON INDEX public.uq_sales_pipeline_runs_active IS
    'Prevents TOCTOU duplicate pipeline runs for the same company.';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping uq_sales_pipeline_runs_active: insufficient privilege';
END $$;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_enrichment_jobs_active
    ON public.sales_enrichment_jobs (company_id, job_type)
    WHERE status IN ('queued', 'running');
  COMMENT ON INDEX public.uq_sales_enrichment_jobs_active IS
    'Prevents duplicate enrichment jobs for the same company+type.';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping uq_sales_enrichment_jobs_active: insufficient privilege';
END $$;

NOTIFY pgrst, 'reload schema';
