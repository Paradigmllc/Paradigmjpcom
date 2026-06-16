-- migration_054_sales_cloud_optional_column_repair.sql
-- Repairs optional pipeline/audit columns where the current DB role owns the
-- table, and skips owner-restricted legacy tables without aborting deployment.

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.sales_sync_logs
      ADD COLUMN IF NOT EXISTS pipeline_run_id uuid REFERENCES public.sales_pipeline_runs (id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS source_system text,
      ADD COLUMN IF NOT EXISTS external_id text,
      ADD COLUMN IF NOT EXISTS report_id uuid;
    CREATE INDEX IF NOT EXISTS idx_sales_sync_logs_pipeline_run
      ON public.sales_sync_logs (pipeline_run_id, created_at DESC)
      WHERE pipeline_run_id IS NOT NULL;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping sales_sync_logs optional column repair: insufficient privilege';
  END;

  BEGIN
    ALTER TABLE public.sales_activity_log
      ADD COLUMN IF NOT EXISTS pipeline_run_id uuid REFERENCES public.sales_pipeline_runs (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_activity_log_pipeline_run
      ON public.sales_activity_log (pipeline_run_id, occurred_at DESC)
      WHERE pipeline_run_id IS NOT NULL;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping sales_activity_log optional column repair: insufficient privilege';
  END;

  BEGIN
    ALTER TABLE public.sales_video_jobs
      ADD COLUMN IF NOT EXISTS pipeline_run_id uuid REFERENCES public.sales_pipeline_runs (id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_video_jobs_pipeline_run
      ON public.sales_video_jobs (pipeline_run_id, status, created_at DESC)
      WHERE pipeline_run_id IS NOT NULL;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping sales_video_jobs optional column repair: insufficient privilege';
  END;

  BEGIN
    ALTER TABLE public.sales_content_templates
      DROP CONSTRAINT IF EXISTS sales_content_templates_template_variant_check;
    ALTER TABLE public.sales_content_templates
      ADD CONSTRAINT sales_content_templates_template_variant_check
      CHECK (template_variant IN (
        'website_diagnostic',
        'meo',
        'security',
        'japan_entry',
        'video_subscription',
        'subsidy',
        'outreach',
        'dx_ai_package'
      ));
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping sales_content_templates variant repair: insufficient privilege';
  END;
END $$;

NOTIFY pgrst, 'reload schema';
