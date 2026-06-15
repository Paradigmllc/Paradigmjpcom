-- migration_049_sales_passive_inventory.sql
-- Passive internet inventory for BuiltWith-style no-proxy acquisition.

CREATE TABLE IF NOT EXISTS public.sales_passive_inventory_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL DEFAULT 'passive_inventory',
  status text NOT NULL DEFAULT 'queued',
  country_code text NOT NULL,
  technology text,
  requested_limit integer NOT NULL DEFAULT 0,
  zone_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_domains_count integer NOT NULL DEFAULT 0,
  cname_checked_count integer NOT NULL DEFAULT 0,
  stack_matched_count integer NOT NULL DEFAULT 0,
  geo_matched_count integer NOT NULL DEFAULT 0,
  promoted_count integer NOT NULL DEFAULT 0,
  jobs_enqueued_count integer NOT NULL DEFAULT 0,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_passive_inventory_runs_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS public.sales_passive_inventory_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.sales_passive_inventory_runs(id) ON DELETE SET NULL,
  domain text NOT NULL,
  root_url text NOT NULL,
  source_slug text NOT NULL DEFAULT 'passive_inventory',
  zone_tld text,
  country_code text,
  technology text,
  cname_target text,
  stack_matched boolean NOT NULL DEFAULT false,
  geo_matched boolean NOT NULL DEFAULT false,
  geo_confidence integer NOT NULL DEFAULT 0,
  geo_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  passive_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'candidate',
  company_id uuid REFERENCES public.sales_companies(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_passive_inventory_domains_status_check CHECK (
    status IN ('candidate', 'scored', 'promoted', 'rejected', 'failed')
  ),
  CONSTRAINT sales_passive_inventory_geo_score_check CHECK (geo_confidence BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_passive_inventory_domains_run_domain
  ON public.sales_passive_inventory_domains(run_id, domain);
CREATE INDEX IF NOT EXISTS idx_sales_passive_inventory_domains_lookup
  ON public.sales_passive_inventory_domains(country_code, technology, stack_matched, geo_matched, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_passive_inventory_domains_domain
  ON public.sales_passive_inventory_domains(domain);
CREATE INDEX IF NOT EXISTS idx_sales_passive_inventory_runs_lookup
  ON public.sales_passive_inventory_runs(country_code, technology, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_sales_passive_inventory_runs_touch ON public.sales_passive_inventory_runs;
CREATE TRIGGER trg_sales_passive_inventory_runs_touch
BEFORE UPDATE ON public.sales_passive_inventory_runs
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_passive_inventory_domains_touch ON public.sales_passive_inventory_domains;
CREATE TRIGGER trg_sales_passive_inventory_domains_touch
BEFORE UPDATE ON public.sales_passive_inventory_domains
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_passive_inventory_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_passive_inventory_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_passive_inventory_runs_service_role_all ON public.sales_passive_inventory_runs;
CREATE POLICY sales_passive_inventory_runs_service_role_all
  ON public.sales_passive_inventory_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS sales_passive_inventory_domains_service_role_all ON public.sales_passive_inventory_domains;
CREATE POLICY sales_passive_inventory_domains_service_role_all
  ON public.sales_passive_inventory_domains
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_passive_inventory_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_passive_inventory_domains TO service_role;
