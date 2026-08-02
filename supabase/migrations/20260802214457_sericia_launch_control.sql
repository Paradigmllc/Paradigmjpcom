-- SERICIA commercial launch control snapshots.
-- Audit rows are append-only and available only to the trusted server runtime.

CREATE TABLE IF NOT EXISTS public.shopify_launch_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source text NOT NULL DEFAULT 'scheduled',
  status text NOT NULL,
  ready_gate_count integer NOT NULL DEFAULT 0,
  total_gate_count integer NOT NULL DEFAULT 0,
  catalog_product_count integer NOT NULL DEFAULT 0,
  eligible_product_count integer NOT NULL DEFAULT 0,
  storefront_password_protected boolean NOT NULL DEFAULT true,
  public_release_approved boolean NOT NULL DEFAULT false,
  fingerprint text NOT NULL,
  gates jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopify_launch_audit_source_check
    CHECK (trigger_source IN ('scheduled', 'manual')),
  CONSTRAINT shopify_launch_audit_status_check
    CHECK (status IN ('ready', 'blocked', 'failed')),
  CONSTRAINT shopify_launch_audit_counts_check CHECK (
    ready_gate_count >= 0
    AND total_gate_count >= 0
    AND ready_gate_count <= total_gate_count
    AND catalog_product_count >= 0
    AND eligible_product_count >= 0
  ),
  CONSTRAINT shopify_launch_audit_gates_array_check
    CHECK (jsonb_typeof(gates) = 'array'),
  CONSTRAINT shopify_launch_audit_blockers_array_check
    CHECK (jsonb_typeof(blockers) = 'array'),
  CONSTRAINT shopify_launch_audit_snapshot_object_check
    CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_shopify_launch_audit_completed
  ON public.shopify_launch_audit_runs (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_launch_audit_fingerprint
  ON public.shopify_launch_audit_runs (fingerprint, completed_at DESC);

ALTER TABLE public.shopify_launch_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_launch_audit_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shopify_launch_audit_runs FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS shopify_launch_audit_runs_service_role_select ON public.shopify_launch_audit_runs;
DROP POLICY IF EXISTS shopify_launch_audit_runs_service_role_insert ON public.shopify_launch_audit_runs;
CREATE POLICY shopify_launch_audit_runs_service_role_select
  ON public.shopify_launch_audit_runs FOR SELECT TO service_role USING (true);
CREATE POLICY shopify_launch_audit_runs_service_role_insert
  ON public.shopify_launch_audit_runs FOR INSERT TO service_role WITH CHECK (true);
GRANT SELECT, INSERT ON TABLE public.shopify_launch_audit_runs TO service_role;

NOTIFY pgrst, 'reload schema';
