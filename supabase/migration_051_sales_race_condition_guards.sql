-- ============================================================
-- migration_051_sales_race_condition_guards.sql
-- Date: 2026-06-16
-- Purpose: Prevent duplicate pipeline runs and enrichment jobs
--          for the same company via unique partial indexes
-- ============================================================

-- 1) Prevent duplicate active pipeline runs per company
--    Only one run can be queued/running/waiting_external at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_pipeline_runs_active
  ON paradigm.sales_pipeline_runs (company_id)
  WHERE status IN ('queued', 'running', 'waiting_external');

-- 2) Prevent duplicate active enrichment jobs per company+type
--    Only one queued/running job per company per job_type
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_enrichment_jobs_active
  ON paradigm.sales_enrichment_jobs (company_id, job_type)
  WHERE status IN ('queued', 'running');

-- 3) Add NOTIFY for operator visibility on job conflicts
--    (informational only — tool connections are pre-seeded)
COMMENT ON INDEX paradigm.uq_sales_pipeline_runs_active IS
  'Prevents TOCTOU duplicate pipeline runs for the same company.';
COMMENT ON INDEX paradigm.uq_sales_enrichment_jobs_active IS
  'Prevents duplicate enrichment jobs for the same company+type.';
