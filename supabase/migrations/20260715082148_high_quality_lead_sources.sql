-- Evidence-first lead sources and fail-closed quality gates.
-- Raw inventory never reaches Twenty until identity, geography, SMB fit,
-- Japan Entry offer fit, and a real contact form are all verified.

CREATE TABLE IF NOT EXISTS public.sales_lead_source_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text NOT NULL,
  source_type text NOT NULL,
  source_url text NOT NULL,
  source_format text NOT NULL DEFAULT 'json',
  trust_tier integer NOT NULL DEFAULT 2,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  terms_checked boolean NOT NULL DEFAULT false,
  last_status text NOT NULL DEFAULT 'never_run',
  last_error text,
  last_record_count integer NOT NULL DEFAULT 0,
  last_ingested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_source_configs_country_check CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT sales_lead_source_configs_type_check CHECK (
    source_type IN ('official_directory', 'export_directory', 'trade_association', 'exhibitor_directory', 'company_registry', 'structured_feed')
  ),
  CONSTRAINT sales_lead_source_configs_format_check CHECK (source_format IN ('json', 'jsonl', 'csv', 'html')),
  CONSTRAINT sales_lead_source_configs_trust_check CHECK (trust_tier BETWEEN 1 AND 3),
  CONSTRAINT sales_lead_source_configs_status_check CHECK (last_status IN ('never_run', 'running', 'ready', 'failed', 'empty')),
  CONSTRAINT sales_lead_source_configs_url_unique UNIQUE (source_url, country_code)
);

CREATE TABLE IF NOT EXISTS public.sales_lead_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_config_id uuid NOT NULL REFERENCES public.sales_lead_source_configs(id) ON DELETE CASCADE,
  external_id text,
  company_name text NOT NULL,
  domain text NOT NULL,
  website_url text NOT NULL,
  country_code text NOT NULL,
  source_page_url text NOT NULL,
  business_type text,
  employee_count integer,
  annual_revenue_usd numeric,
  is_for_profit boolean,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_source_records_country_check CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT sales_lead_source_records_employee_check CHECK (employee_count IS NULL OR employee_count >= 0),
  CONSTRAINT sales_lead_source_records_revenue_check CHECK (annual_revenue_usd IS NULL OR annual_revenue_usd >= 0),
  CONSTRAINT sales_lead_source_records_unique_domain UNIQUE (source_config_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_source_configs_active_country
  ON public.sales_lead_source_configs(active, country_code, trust_tier DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_source_records_active_country
  ON public.sales_lead_source_records(active, country_code, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_source_records_config
  ON public.sales_lead_source_records(source_config_id, active, observed_at DESC);

DROP TRIGGER IF EXISTS trg_sales_lead_source_configs_touch ON public.sales_lead_source_configs;
CREATE TRIGGER trg_sales_lead_source_configs_touch
BEFORE UPDATE ON public.sales_lead_source_configs
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_lead_source_records_touch ON public.sales_lead_source_records;
CREATE TRIGGER trg_sales_lead_source_records_touch
BEFORE UPDATE ON public.sales_lead_source_records
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_lead_source_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_source_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_lead_source_configs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sales_lead_source_records FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_source_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_source_records TO service_role;

DROP POLICY IF EXISTS "sales_lead_source_configs service role access" ON public.sales_lead_source_configs;
CREATE POLICY "sales_lead_source_configs service role access"
  ON public.sales_lead_source_configs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sales_lead_source_records service role access" ON public.sales_lead_source_records;
CREATE POLICY "sales_lead_source_records service role access"
  ON public.sales_lead_source_records FOR ALL TO service_role
  USING (true) WITH CHECK (true);

ALTER TABLE public.sales_lead_candidate_runs
  ADD COLUMN IF NOT EXISTS source_config_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS require_source_evidence boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_qualified_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_rejected_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_required_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.sales_lead_candidate_run_items
  ADD COLUMN IF NOT EXISTS source_config_id uuid REFERENCES public.sales_lead_source_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_record_id uuid REFERENCES public.sales_lead_source_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS source_page_url text,
  ADD COLUMN IF NOT EXISTS source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS quality_gate jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_reasons text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_status_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_status_check CHECK (
    status IN ('discovered', 'verified', 'scored', 'form_missing', 'promoted', 'review_required', 'rejected', 'failed', 'skipped')
  );

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_quality_status_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_quality_status_check CHECK (
    quality_status IN ('pending', 'passed', 'review_required', 'rejected')
  );

CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_quality
  ON public.sales_lead_candidate_run_items(run_id, quality_status, status, updated_at DESC);

COMMENT ON TABLE public.sales_lead_source_configs IS
  'Operator-approved official or industry sources. Arbitrary web search and popularity rankings are not production lead sources.';
COMMENT ON TABLE public.sales_lead_source_records IS
  'Evidence-bearing company identities collected from an approved source before website verification.';
COMMENT ON COLUMN public.sales_lead_candidate_runs.require_source_evidence IS
  'Fail-closed production gate. A candidate without a source record cannot be scored, promoted, or synced to Twenty.';
COMMENT ON COLUMN public.sales_lead_candidate_run_items.quality_gate IS
  'Deterministic identity, country, for-profit, SMB, offer-fit, and form evidence used for the promotion decision.';

NOTIFY pgrst, 'reload schema';
