-- Durable segment checkpoints for BuiltWith-style passive inventory scans.
-- Keeps large domain inventories resumable without relying on one API request.

CREATE TABLE IF NOT EXISTS public.sales_passive_inventory_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.sales_passive_inventory_runs(id) ON DELETE CASCADE,
  segment_key text NOT NULL,
  source_kind text NOT NULL DEFAULT 'zone_file',
  pattern text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 50,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  batch_limit integer NOT NULL DEFAULT 5000,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_count integer NOT NULL DEFAULT 0,
  checked_count integer NOT NULL DEFAULT 0,
  stack_matched_count integer NOT NULL DEFAULT 0,
  geo_matched_count integer NOT NULL DEFAULT 0,
  persisted_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  error_message text,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  lock_owner text,
  locked_at timestamptz,
  started_at timestamptz,
  heartbeat_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_passive_inventory_segments_unique UNIQUE (run_id, segment_key),
  CONSTRAINT sales_passive_inventory_segments_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')
  ),
  CONSTRAINT sales_passive_inventory_segments_priority_check CHECK (priority BETWEEN 0 AND 100),
  CONSTRAINT sales_passive_inventory_segments_attempts_check CHECK (attempts >= 0 AND max_attempts >= 1),
  CONSTRAINT sales_passive_inventory_segments_batch_limit_check CHECK (batch_limit BETWEEN 1 AND 100000)
);

CREATE INDEX IF NOT EXISTS idx_sales_passive_inventory_segments_run_status
  ON public.sales_passive_inventory_segments(run_id, status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_sales_passive_inventory_segments_status
  ON public.sales_passive_inventory_segments(status, heartbeat_at DESC);

DROP TRIGGER IF EXISTS trg_sales_passive_inventory_segments_touch ON public.sales_passive_inventory_segments;
CREATE TRIGGER trg_sales_passive_inventory_segments_touch
BEFORE UPDATE ON public.sales_passive_inventory_segments
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_passive_inventory_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_passive_inventory_segments_service_role_all ON public.sales_passive_inventory_segments;
CREATE POLICY sales_passive_inventory_segments_service_role_all
  ON public.sales_passive_inventory_segments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_passive_inventory_segments TO service_role;
