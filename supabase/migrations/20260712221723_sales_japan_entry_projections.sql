BEGIN;

CREATE TABLE public.sales_japan_entry_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.sales_companies(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'approved', 'superseded')),
  input jsonb NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  projection jsonb NOT NULL,
  initial_message text NOT NULL,
  created_by text NOT NULL DEFAULT 'revenue_os',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_japan_entry_projections_company_created_idx
  ON public.sales_japan_entry_projections (company_id, created_at DESC);

ALTER TABLE public.sales_japan_entry_projections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_japan_entry_projections FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_japan_entry_projections TO service_role;

DROP POLICY IF EXISTS paradigm_service_role_all ON public.sales_japan_entry_projections;
CREATE POLICY paradigm_service_role_all
  ON public.sales_japan_entry_projections
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.sales_japan_entry_projections IS
  'Human-review-only Japan Entry opportunity models. This table does not authorize or trigger outreach.';

COMMIT;
