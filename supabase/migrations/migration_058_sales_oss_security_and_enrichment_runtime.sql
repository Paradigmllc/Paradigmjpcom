-- ============================================================
-- migration_058_sales_oss_security_and_enrichment_runtime.sql
-- Date: 2026-06-18
-- Purpose:
--   Repair the Supabase OSS migration state used by RevenueOS:
--   - stop anonymous reads of sales data through PostgREST
--   - restore service_role grants for server-side RevenueOS APIs
--   - enable RLS on sales tables
--   - add enrichment job runtime columns used by current app code
--   - restore missed normalized sales_companies columns and sync log checks
-- ============================================================

BEGIN;

DO $$
DECLARE
  r record;
  p_name text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (tablename LIKE 'sales\_%' ESCAPE '\' OR tablename = 'leads')
    ORDER BY tablename
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO service_role', r.schemaname, r.tablename);
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);

    p_name := left('service_role_all_' || r.tablename, 63);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p_name, r.schemaname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      p_name,
      r.schemaname,
      r.tablename
    );
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;

ALTER TABLE public.sales_enrichment_jobs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS lock_owner text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.sales_enrichment_jobs
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF to_regproc('public.sales_touch_updated_at') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sales_enrichment_jobs_touch ON public.sales_enrichment_jobs;
    CREATE TRIGGER trg_sales_enrichment_jobs_touch
      BEFORE UPDATE ON public.sales_enrichment_jobs
      FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_enrichment_jobs_status_updated
  ON public.sales_enrichment_jobs (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_enrichment_jobs_lock
  ON public.sales_enrichment_jobs (status, locked_at)
  WHERE status = 'running';

ALTER TABLE public.sales_companies
  ADD COLUMN IF NOT EXISTS tech_stack jsonb,
  ADD COLUMN IF NOT EXISTS pain_diagnosis jsonb,
  ADD COLUMN IF NOT EXISTS dify_result jsonb,
  ADD COLUMN IF NOT EXISTS japan_market_audit jsonb,
  ADD COLUMN IF NOT EXISTS demo_site jsonb,
  ADD COLUMN IF NOT EXISTS visual_evidence jsonb,
  ADD COLUMN IF NOT EXISTS report_generated_at timestamptz;

UPDATE public.sales_companies
SET
  tech_stack = COALESCE(tech_stack, meta->'tech'),
  pain_diagnosis = COALESCE(pain_diagnosis, meta->'pain_diagnosis'),
  dify_result = COALESCE(dify_result, meta->'dify_diagnosis'),
  japan_market_audit = COALESCE(japan_market_audit, meta->'japan_market_audit'),
  demo_site = COALESCE(demo_site, meta->'demo_site'),
  visual_evidence = COALESCE(visual_evidence, meta->'visual_evidence'),
  report_generated_at = COALESCE(report_generated_at, NULLIF(meta->'enrichment'->>'completed_at', '')::timestamptz)
WHERE meta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_companies_tech_stack
  ON public.sales_companies USING gin (tech_stack);
CREATE INDEX IF NOT EXISTS idx_sales_companies_pain_diagnosis
  ON public.sales_companies USING gin (pain_diagnosis);
CREATE INDEX IF NOT EXISTS idx_sales_companies_report_generated_at
  ON public.sales_companies (report_generated_at)
  WHERE report_generated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_sales_companies_invalidate_report()
RETURNS trigger AS $$
BEGIN
  IF (
    NEW.pagespeed_mobile IS DISTINCT FROM OLD.pagespeed_mobile
    OR NEW.pagespeed_desktop IS DISTINCT FROM OLD.pagespeed_desktop
    OR NEW.pain_diagnosis IS DISTINCT FROM OLD.pain_diagnosis
    OR NEW.tech_stack IS DISTINCT FROM OLD.tech_stack
    OR NEW.visual_evidence IS DISTINCT FROM OLD.visual_evidence
    OR (NEW.meta->>'screenshot_url') IS DISTINCT FROM (OLD.meta->>'screenshot_url')
  ) THEN
    NEW.report_generated_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invalidate_report ON public.sales_companies;
CREATE TRIGGER trg_invalidate_report
  BEFORE UPDATE ON public.sales_companies
  FOR EACH ROW EXECUTE FUNCTION public.trg_sales_companies_invalidate_report();

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_companies_domain_unique
  ON public.sales_companies (domain);

ALTER TABLE public.sales_sync_logs
  ADD COLUMN IF NOT EXISTS pipeline_run_id uuid REFERENCES public.sales_pipeline_runs (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS report_id uuid;

CREATE INDEX IF NOT EXISTS idx_sales_sync_logs_pipeline_run
  ON public.sales_sync_logs (pipeline_run_id, created_at DESC)
  WHERE pipeline_run_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_pipeline_steps_run_id_fkey'
      AND conrelid = 'public.sales_pipeline_steps'::regclass
  ) THEN
    ALTER TABLE public.sales_pipeline_steps
      ADD CONSTRAINT sales_pipeline_steps_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES public.sales_pipeline_runs (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_pipeline_steps_company_id_fkey'
      AND conrelid = 'public.sales_pipeline_steps'::regclass
  ) THEN
    ALTER TABLE public.sales_pipeline_steps
      ADD CONSTRAINT sales_pipeline_steps_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.sales_companies (id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.sales_sync_logs
  DROP CONSTRAINT IF EXISTS sales_sync_logs_direction_check;

ALTER TABLE public.sales_sync_logs
  ADD CONSTRAINT sales_sync_logs_direction_check
  CHECK (
    direction IN (
      'supabase->notion',
      'notion->supabase',
      'supabase->twenty',
      'twenty->supabase',
      'supabase->directus',
      'directus->supabase',
      'supabase->keystatic',
      'keystatic->supabase'
    )
  );

ALTER TABLE public.sales_sync_logs
  DROP CONSTRAINT IF EXISTS sales_sync_logs_action_check;

ALTER TABLE public.sales_sync_logs
  ADD CONSTRAINT sales_sync_logs_action_check
  CHECK (
    action IN (
      'create',
      'update',
      'delete',
      'karte_note_sync',
      'karte_home_sync',
      'opportunity_sync',
      'external_studio_sync',
      'external_studio_pull'
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
