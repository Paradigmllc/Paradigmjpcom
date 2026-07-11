-- Harden the legacy demo contact form so it is durable and service-role only.
-- Public callers may insert only through the Next.js API, never through REST.

BEGIN;

CREATE TABLE IF NOT EXISTS public.demo_contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  company text NOT NULL DEFAULT '',
  message text NOT NULL,
  source text NOT NULL DEFAULT 'demo',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS demo_contact_submissions_service_role_all ON public.demo_contact_submissions;
CREATE POLICY demo_contact_submissions_service_role_all
  ON public.demo_contact_submissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.demo_contact_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.demo_contact_submissions TO service_role;

CREATE INDEX IF NOT EXISTS idx_demo_contact_submissions_created_at
  ON public.demo_contact_submissions (created_at DESC);

COMMIT;

