-- Quote Recovery vertical SaaS validation funnel.
-- Stores aggregate diagnostic metrics only; raw customer quote rows never leave the response lifecycle.

CREATE TABLE IF NOT EXISTS public.quote_recovery_diagnostic_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('sample', 'csv')),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 1000),
  open_quote_count integer NOT NULL CHECK (open_quote_count >= 0),
  open_amount bigint NOT NULL CHECK (open_amount >= 0),
  stale_quote_count integer NOT NULL CHECK (stale_quote_count >= 0),
  stale_amount bigint NOT NULL CHECK (stale_amount >= 0),
  missing_next_action_count integer NOT NULL CHECK (missing_next_action_count >= 0),
  unassigned_quote_count integer NOT NULL CHECK (unassigned_quote_count >= 0),
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_recovery_pilot_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 200),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  monthly_quote_volume text NOT NULL CHECK (monthly_quote_volume IN ('1-20', '21-50', '51-100', '101+')),
  current_tool text,
  diagnosed_open_amount bigint NOT NULL DEFAULT 0 CHECK (diagnosed_open_amount >= 0),
  diagnosed_stale_amount bigint NOT NULL DEFAULT 0 CHECK (diagnosed_stale_amount >= 0),
  diagnosed_stale_quote_count integer NOT NULL DEFAULT 0 CHECK (diagnosed_stale_quote_count >= 0),
  source text NOT NULL DEFAULT 'quote_recovery_diagnostic',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'pilot', 'won', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_recovery_diagnostic_runs_created_at
  ON public.quote_recovery_diagnostic_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_recovery_pilot_inquiries_status_created
  ON public.quote_recovery_pilot_inquiries (status, created_at DESC);

ALTER TABLE public.quote_recovery_diagnostic_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_recovery_pilot_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_recovery_diagnostic_runs_service_role_all ON public.quote_recovery_diagnostic_runs;
CREATE POLICY quote_recovery_diagnostic_runs_service_role_all
  ON public.quote_recovery_diagnostic_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quote_recovery_pilot_inquiries_service_role_all ON public.quote_recovery_pilot_inquiries;
CREATE POLICY quote_recovery_pilot_inquiries_service_role_all
  ON public.quote_recovery_pilot_inquiries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON public.quote_recovery_diagnostic_runs FROM anon, authenticated;
REVOKE ALL ON public.quote_recovery_pilot_inquiries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_recovery_diagnostic_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_recovery_pilot_inquiries TO service_role;

COMMENT ON TABLE public.quote_recovery_diagnostic_runs IS 'Aggregate-only product validation events; never stores raw quote rows.';
COMMENT ON TABLE public.quote_recovery_pilot_inquiries IS 'Qualified pilot requests from the quote recovery diagnostic.';

NOTIFY pgrst, 'reload schema';
