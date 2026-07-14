-- Initial form draft factory: evidence-backed, human-reviewed, and structurally non-sending.

CREATE TABLE IF NOT EXISTS public.sales_initial_form_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.sales_companies(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.sales_lead_candidate_domains(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.sales_lead_candidate_runs(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL UNIQUE,
  generation_version text NOT NULL DEFAULT 'initial-interest-v1',
  status text NOT NULL DEFAULT 'generating',
  message text,
  product_context text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  review jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  twenty_sync_status text NOT NULL DEFAULT 'pending',
  twenty_company_id text,
  error_message text,
  sent boolean NOT NULL DEFAULT false,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_initial_form_drafts_status_check CHECK (
    status IN ('generating', 'needs_review', 'rejected', 'failed')
  ),
  CONSTRAINT sales_initial_form_drafts_twenty_status_check CHECK (
    twenty_sync_status IN ('pending', 'synced', 'failed')
  ),
  CONSTRAINT sales_initial_form_drafts_never_sent_check CHECK (sent = false)
);

CREATE INDEX IF NOT EXISTS idx_sales_initial_form_drafts_run
  ON public.sales_initial_form_drafts(run_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_initial_form_drafts_company
  ON public.sales_initial_form_drafts(company_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_sales_initial_form_drafts_touch ON public.sales_initial_form_drafts;
CREATE TRIGGER trg_sales_initial_form_drafts_touch
BEFORE UPDATE ON public.sales_initial_form_drafts
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_initial_form_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_initial_form_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_initial_form_drafts TO service_role;

DROP POLICY IF EXISTS "sales_initial_form_drafts service role access" ON public.sales_initial_form_drafts;
CREATE POLICY "sales_initial_form_drafts service role access"
  ON public.sales_initial_form_drafts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.sales_initial_form_drafts IS
  'Human-review-only first-contact form drafts. The sent column is constrained false and this lane contains no delivery capability.';
COMMENT ON COLUMN public.sales_initial_form_drafts.evidence IS
  'Public homepage and Japan-readiness evidence used for grounded generation.';
