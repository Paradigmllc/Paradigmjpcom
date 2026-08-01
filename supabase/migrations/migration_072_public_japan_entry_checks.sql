-- Anonymous, expiring persistence for the public Japan Entry Score utility.
-- Raw IP/email is never stored. The domain is represented by a SHA-256 hash;
-- the result JSON contains public evidence and is retained for 30 days.

BEGIN;

CREATE TABLE IF NOT EXISTS public.public_japan_entry_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_hash text NOT NULL,
  target_country text NOT NULL CHECK (target_country IN ('US', 'GB', 'AU', 'CA', 'NZ', 'DE', 'FR')),
  self_reported jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL,
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  coverage integer NOT NULL CHECK (coverage >= 0 AND coverage <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS public_japan_entry_checks_domain_hash_idx
  ON public.public_japan_entry_checks (domain_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS public_japan_entry_checks_expires_at_idx
  ON public.public_japan_entry_checks (expires_at);

ALTER TABLE public.public_japan_entry_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_japan_entry_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.public_japan_entry_checks TO service_role;
DROP POLICY IF EXISTS paradigm_service_role_all ON public.public_japan_entry_checks;
CREATE POLICY paradigm_service_role_all
  ON public.public_japan_entry_checks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
