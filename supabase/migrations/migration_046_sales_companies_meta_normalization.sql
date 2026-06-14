-- migration_046_sales_companies_meta_normalization.sql
-- Normalize frequently-accessed JSONB paths from sales_companies.meta into dedicated columns.
-- This improves query performance, data integrity, and allows freshness/staleness tracking.
-- Migration is non-destructive: existing data is copied from meta, meta is preserved.

-- 1. Add new columns (all nullable — migration is backwards compatible)
ALTER TABLE public.sales_companies
  ADD COLUMN IF NOT EXISTS tech_stack       JSONB,
  ADD COLUMN IF NOT EXISTS pain_diagnosis   JSONB,
  ADD COLUMN IF NOT EXISTS dify_result      JSONB,
  ADD COLUMN IF NOT EXISTS japan_market_audit JSONB,
  ADD COLUMN IF NOT EXISTS demo_site        JSONB,
  ADD COLUMN IF NOT EXISTS visual_evidence  JSONB,
  ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

-- 2. Migrate existing data from meta JSONB to dedicated columns
UPDATE public.sales_companies
SET
  tech_stack       = meta->'tech',
  pain_diagnosis   = meta->'pain_diagnosis',
  dify_result      = meta->'dify_diagnosis',
  japan_market_audit = meta->'japan_market_audit',
  demo_site        = meta->'demo_site',
  visual_evidence  = meta->'visual_evidence',
  report_generated_at = (meta->'enrichment'->>'completed_at')::TIMESTAMPTZ
WHERE meta IS NOT NULL;

-- 3. Create indexes on new columns for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_companies_tech_stack ON public.sales_companies USING gin (tech_stack);
CREATE INDEX IF NOT EXISTS idx_sales_companies_pain_diagnosis ON public.sales_companies USING gin (pain_diagnosis);
CREATE INDEX IF NOT EXISTS idx_sales_companies_report_generated_at ON public.sales_companies (report_generated_at)
  WHERE report_generated_at IS NOT NULL;

-- 4. Trigger function: auto-invalidate report_generated_at when key fields change
CREATE OR REPLACE FUNCTION public.trg_sales_companies_invalidate_report()
RETURNS TRIGGER AS $$
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
