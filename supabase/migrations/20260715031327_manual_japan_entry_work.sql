-- Dedicated operator-owned Japan Entry workbench.
-- This table is intentionally isolated from all sales automation/pipeline tables.

CREATE TABLE IF NOT EXISTS public.manual_japan_entry_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  input_url text NOT NULL,
  canonical_url text NOT NULL,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'needs_review', 'completed', 'failed', 'duplicate', 'rejected')),
  stage text NOT NULL DEFAULT 'fetching'
    CHECK (stage IN ('fetching', 'classifying', 'form_discovery', 'copy_generation', 'report_generation', 'twenty_sync', 'complete', 'failed')),
  company_name text,
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  is_japanese_company boolean,
  smb_status text CHECK (smb_status IS NULL OR smb_status IN ('qualified', 'review_required', 'rejected')),
  smb_confidence integer CHECK (smb_confidence IS NULL OR smb_confidence BETWEEN 0 AND 100),
  japan_entry_fit_status text CHECK (japan_entry_fit_status IS NULL OR japan_entry_fit_status IN ('qualified', 'review_required', 'rejected')),
  japan_entry_fit_confidence integer CHECK (japan_entry_fit_confidence IS NULL OR japan_entry_fit_confidence BETWEEN 0 AND 100),
  business_model text CHECK (business_model IS NULL OR business_model IN ('ecommerce', 'saas', 'service')),
  industry text,
  product_context text,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_discovery jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_url text,
  initial_message text,
  message_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_url text,
  twenty_company_id text,
  twenty_sync_status text NOT NULL DEFAULT 'not_started'
    CHECK (twenty_sync_status IN ('not_started', 'skipped', 'synced', 'failed', 'duplicate')),
  error_message text,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  sent boolean NOT NULL DEFAULT false CHECK (sent = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_created_at
  ON public.manual_japan_entry_work (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_status
  ON public.manual_japan_entry_work (status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_manual_japan_entry_work_updated_at ON public.manual_japan_entry_work;
CREATE TRIGGER trg_manual_japan_entry_work_updated_at
  BEFORE UPDATE ON public.manual_japan_entry_work
  FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.manual_japan_entry_work ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_japan_entry_work FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_japan_entry_work TO service_role;

DROP POLICY IF EXISTS manual_japan_entry_work_service_role ON public.manual_japan_entry_work;
CREATE POLICY manual_japan_entry_work_service_role
  ON public.manual_japan_entry_work
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.manual_japan_entry_work IS
  'Manual Japan Entry workbench history. Never consumed by the automated sales pipeline.';

INSERT INTO public.sales_crm_select_options
  (field_key, value, label, country_code, position, color)
VALUES
  ('source', 'manual_work', 'Manual Japan Entry', NULL, 14, 'green')
ON CONFLICT (field_key, value) DO UPDATE SET
  label = EXCLUDED.label,
  position = EXCLUDED.position,
  color = EXCLUDED.color,
  is_active = true,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
