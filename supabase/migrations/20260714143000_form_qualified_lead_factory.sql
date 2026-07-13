-- Form-qualified lead factory: keep raw candidates outside CRM until an actual form is verified.

ALTER TABLE public.sales_lead_candidate_runs
  ADD COLUMN IF NOT EXISTS require_verified_form boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS min_smb_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS min_form_confidence integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS sync_twenty boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS forms_checked_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forms_qualified_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS twenty_synced_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_form_confidence_check;
ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_form_confidence_check
  CHECK (min_form_confidence BETWEEN 0 AND 100);

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_smb_score_check;
ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_smb_score_check
  CHECK (min_smb_score BETWEEN 0 AND 100);

ALTER TABLE public.sales_lead_candidate_run_items
  ADD COLUMN IF NOT EXISTS form_url text,
  ADD COLUMN IF NOT EXISTS form_method text,
  ADD COLUMN IF NOT EXISTS form_confidence integer,
  ADD COLUMN IF NOT EXISTS form_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS form_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS form_qualification_reason text,
  ADD COLUMN IF NOT EXISTS twenty_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twenty_company_id text;

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_status_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_status_check CHECK (
    status IN ('discovered', 'verified', 'scored', 'form_missing', 'promoted', 'failed', 'skipped')
  );

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_form_confidence_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_form_confidence_check CHECK (
    form_confidence IS NULL OR form_confidence BETWEEN 0 AND 100
  );

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_form_reason_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_form_reason_check CHECK (
    form_qualification_reason IS NULL OR form_qualification_reason IN (
      'verified_form', 'no_form', 'contact_page_only', 'low_confidence'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_form_gate
  ON public.sales_lead_candidate_run_items(run_id, form_verified, twenty_synced, updated_at DESC);

COMMENT ON COLUMN public.sales_lead_candidate_runs.require_verified_form IS
  'Fail-closed gate: only an inspected page containing an actual form may be promoted.';
COMMENT ON COLUMN public.sales_lead_candidate_run_items.form_verified IS
  'True only when deterministic HTML/form-provider signatures confirm an actual form.';
COMMENT ON COLUMN public.sales_lead_candidate_run_items.twenty_synced IS
  'True after minimal company-home sync to Twenty; no opportunity or outbound send is created.';
