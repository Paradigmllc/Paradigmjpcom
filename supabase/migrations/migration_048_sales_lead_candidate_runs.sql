-- migration_048_sales_lead_candidate_runs.sql
-- Durable run tracking for large lead candidate acquisition batches.

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  lane text NOT NULL DEFAULT 'tech_footprint',
  country_code text NOT NULL,
  technology text,
  status text NOT NULL DEFAULT 'queued',
  requested_limit integer NOT NULL DEFAULT 0,
  verify_limit integer NOT NULL DEFAULT 0,
  promote boolean NOT NULL DEFAULT false,
  min_opportunity_score integer NOT NULL DEFAULT 68,
  fetched_count integer NOT NULL DEFAULT 0,
  upserted_count integer NOT NULL DEFAULT 0,
  verified_count integer NOT NULL DEFAULT 0,
  matched_technology_count integer NOT NULL DEFAULT 0,
  scored_count integer NOT NULL DEFAULT 0,
  promoted_count integer NOT NULL DEFAULT 0,
  jobs_enqueued_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_runs_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')
  ),
  CONSTRAINT sales_lead_candidate_runs_lane_check CHECK (
    lane IN ('tech_footprint', 'no_website_local_smb')
  ),
  CONSTRAINT sales_lead_candidate_runs_score_check CHECK (min_opportunity_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.sales_lead_candidate_runs(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.sales_lead_candidate_domains(id) ON DELETE SET NULL,
  domain text NOT NULL,
  root_url text,
  status text NOT NULL DEFAULT 'discovered',
  attempts integer NOT NULL DEFAULT 0,
  tech_matched boolean NOT NULL DEFAULT false,
  job_enqueued boolean NOT NULL DEFAULT false,
  opportunity_score integer,
  company_id uuid REFERENCES public.sales_companies(id) ON DELETE SET NULL,
  error_message text,
  processed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_run_items_unique UNIQUE (run_id, domain),
  CONSTRAINT sales_lead_candidate_run_items_status_check CHECK (
    status IN ('discovered', 'verified', 'scored', 'promoted', 'failed', 'skipped')
  ),
  CONSTRAINT sales_lead_candidate_run_items_score_check CHECK (
    opportunity_score IS NULL OR opportunity_score BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_runs_lookup
  ON public.sales_lead_candidate_runs(country_code, technology, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_runs_status
  ON public.sales_lead_candidate_runs(status, heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_run_status
  ON public.sales_lead_candidate_run_items(run_id, status, attempts, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_candidate
  ON public.sales_lead_candidate_run_items(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_domain
  ON public.sales_lead_candidate_run_items(domain);

DROP TRIGGER IF EXISTS trg_sales_lead_candidate_runs_touch ON public.sales_lead_candidate_runs;
CREATE TRIGGER trg_sales_lead_candidate_runs_touch
BEFORE UPDATE ON public.sales_lead_candidate_runs
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_lead_candidate_run_items_touch ON public.sales_lead_candidate_run_items;
CREATE TRIGGER trg_sales_lead_candidate_run_items_touch
BEFORE UPDATE ON public.sales_lead_candidate_run_items
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_lead_candidate_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_candidate_run_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_candidate_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_candidate_run_items TO service_role;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sales_lead_candidate_runs',
    'sales_lead_candidate_run_items'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s service role access" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%s service role access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl,
      tbl
    );
  END LOOP;
END $$;

COMMENT ON TABLE public.sales_lead_candidate_runs IS
  'Durable acquisition run records for large country x technology lead candidate batches.';
COMMENT ON TABLE public.sales_lead_candidate_run_items IS
  'Per-domain progress and retry state for each lead candidate acquisition run.';
