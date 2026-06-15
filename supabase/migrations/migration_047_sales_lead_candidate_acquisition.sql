-- migration_047_sales_lead_candidate_acquisition.sql
-- Candidate acquisition store for OSS BuiltWith-style lead discovery.
-- Keeps raw candidate discovery separate from promoted sales_companies rows.

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  root_url text,
  lane text NOT NULL DEFAULT 'tech_footprint',
  source_slug text NOT NULL,
  source_run_id text,
  status text NOT NULL DEFAULT 'candidate',
  company_id uuid REFERENCES public.sales_companies(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  observation_count integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_domains_lane_check CHECK (
    lane IN ('tech_footprint', 'no_website_local_smb')
  ),
  CONSTRAINT sales_lead_candidate_domains_status_check CHECK (
    status IN ('candidate', 'scored', 'promoted', 'rejected')
  )
);

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.sales_lead_candidate_domains(id) ON DELETE CASCADE,
  source_slug text NOT NULL,
  observed_url text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  raw_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_hits jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_country_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.sales_lead_candidate_domains(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  signal_type text NOT NULL,
  confidence integer NOT NULL,
  evidence text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_country_confidence_check CHECK (confidence BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_tech_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.sales_lead_candidate_domains(id) ON DELETE CASCADE,
  technology_name text NOT NULL,
  technology_slug text NOT NULL,
  category text,
  confidence integer NOT NULL DEFAULT 0,
  evidence_url text,
  evidence_type text NOT NULL DEFAULT 'homepage',
  source_slug text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_tech_confidence_check CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT sales_lead_candidate_tech_unique UNIQUE (candidate_id, technology_slug, source_slug, evidence_type)
);

CREATE TABLE IF NOT EXISTS public.sales_lead_candidate_scores (
  candidate_id uuid PRIMARY KEY REFERENCES public.sales_lead_candidate_domains(id) ON DELETE CASCADE,
  stack_fit_score integer NOT NULL DEFAULT 0,
  smb_score integer NOT NULL DEFAULT 0,
  freshness_score integer NOT NULL DEFAULT 0,
  geo_confidence integer NOT NULL DEFAULT 0,
  contactability_score integer NOT NULL DEFAULT 0,
  website_absence_score integer NOT NULL DEFAULT 0,
  opportunity_score integer NOT NULL DEFAULT 0,
  false_positive_risk integer NOT NULL DEFAULT 0,
  score_version text NOT NULL DEFAULT 'lead-candidate-v1',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  scored_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_candidate_scores_range_check CHECK (
    stack_fit_score BETWEEN 0 AND 100
    AND smb_score BETWEEN 0 AND 100
    AND freshness_score BETWEEN 0 AND 100
    AND geo_confidence BETWEEN 0 AND 100
    AND contactability_score BETWEEN 0 AND 100
    AND website_absence_score BETWEEN 0 AND 100
    AND opportunity_score BETWEEN 0 AND 100
    AND false_positive_risk BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_domains_status
  ON public.sales_lead_candidate_domains(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_domains_source
  ON public.sales_lead_candidate_domains(source_slug, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_domains_lane
  ON public.sales_lead_candidate_domains(lane, status);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_country_lookup
  ON public.sales_lead_candidate_country_signals(country_code, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_tech_lookup
  ON public.sales_lead_candidate_tech_detections(technology_slug, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_scores_opportunity
  ON public.sales_lead_candidate_scores(opportunity_score DESC, scored_at DESC);

DROP TRIGGER IF EXISTS trg_sales_lead_candidate_domains_touch ON public.sales_lead_candidate_domains;
CREATE TRIGGER trg_sales_lead_candidate_domains_touch
BEFORE UPDATE ON public.sales_lead_candidate_domains
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_lead_candidate_scores_touch ON public.sales_lead_candidate_scores;
CREATE TRIGGER trg_sales_lead_candidate_scores_touch
BEFORE UPDATE ON public.sales_lead_candidate_scores
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_lead_candidate_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_candidate_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_candidate_country_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_candidate_tech_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_lead_candidate_scores ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sales_lead_candidate_domains',
    'sales_lead_candidate_observations',
    'sales_lead_candidate_country_signals',
    'sales_lead_candidate_tech_detections',
    'sales_lead_candidate_scores'
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

COMMENT ON TABLE public.sales_lead_candidate_domains IS
  'Raw lead candidate domains before promotion into sales_companies.';
COMMENT ON TABLE public.sales_lead_candidate_scores IS
  'Country, stack-fit, SMB, freshness and website-absence scoring for acquisition candidates.';
