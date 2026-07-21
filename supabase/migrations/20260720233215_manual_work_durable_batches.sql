-- Durable, operator-started batches for the isolated /work workbench.
-- A batch only analyzes and prepares records. It never sends outreach.

CREATE TABLE IF NOT EXISTS public.manual_japan_entry_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'completed_with_errors', 'failed')),
  total_count integer NOT NULL CHECK (total_count BETWEEN 1 AND 500),
  message_variant_requested text NOT NULL DEFAULT 'auto'
    CHECK (message_variant_requested IN (
      'auto',
      'estimate_off_price_off',
      'estimate_on_price_off',
      'estimate_off_price_on',
      'estimate_on_price_on'
    )),
  message_angle_requested text NOT NULL DEFAULT 'auto'
    CHECK (message_angle_requested IN ('auto', 'problem', 'competitor', 'opportunity', 'mockup')),
  source_slug text NOT NULL REFERENCES public.manual_japan_entry_source_catalog(slug),
  source_page_url text,
  observed_on date,
  last_error text,
  sent boolean NOT NULL DEFAULT false CHECK (sent = false),
  started_at timestamptz,
  completed_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manual_japan_entry_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.manual_japan_entry_batches(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 0 AND 499),
  input_url text NOT NULL,
  canonical_url text NOT NULL,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'needs_review', 'rejected', 'failed', 'duplicate')),
  work_id uuid REFERENCES public.manual_japan_entry_work(id) ON DELETE SET NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, position),
  UNIQUE (batch_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_batches_active
  ON public.manual_japan_entry_batches (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_japan_entry_single_active_batch
  ON public.manual_japan_entry_batches ((true))
  WHERE status IN ('queued', 'running');
CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_batch_items_claim
  ON public.manual_japan_entry_batch_items (batch_id, status, position);

DROP TRIGGER IF EXISTS trg_manual_japan_entry_batches_updated_at ON public.manual_japan_entry_batches;
CREATE TRIGGER trg_manual_japan_entry_batches_updated_at
  BEFORE UPDATE ON public.manual_japan_entry_batches
  FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_manual_japan_entry_batch_items_updated_at ON public.manual_japan_entry_batch_items;
CREATE TRIGGER trg_manual_japan_entry_batch_items_updated_at
  BEFORE UPDATE ON public.manual_japan_entry_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.manual_japan_entry_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_japan_entry_batch_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.manual_japan_entry_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.manual_japan_entry_batch_items FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_japan_entry_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_japan_entry_batch_items TO service_role;

DROP POLICY IF EXISTS manual_japan_entry_batches_service_role ON public.manual_japan_entry_batches;
CREATE POLICY manual_japan_entry_batches_service_role
  ON public.manual_japan_entry_batches
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS manual_japan_entry_batch_items_service_role ON public.manual_japan_entry_batch_items;
CREATE POLICY manual_japan_entry_batch_items_service_role
  ON public.manual_japan_entry_batch_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.manual_japan_entry_claim_batch_items(
  p_batch_id uuid,
  p_limit integer DEFAULT 3
)
RETURNS SETOF public.manual_japan_entry_batch_items
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT item.id
    FROM public.manual_japan_entry_batch_items AS item
    WHERE item.batch_id = p_batch_id
      AND (
        item.status = 'queued'
        OR (item.status = 'processing' AND item.claimed_at < now() - interval '10 minutes')
      )
    ORDER BY item.position
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(coalesce(p_limit, 3), 3))
  ), claimed AS (
    UPDATE public.manual_japan_entry_batch_items AS item
    SET
      status = 'processing',
      attempts = item.attempts + 1,
      claim_token = gen_random_uuid(),
      claimed_at = now(),
      finished_at = NULL,
      error_message = NULL,
      updated_at = now()
    FROM candidates
    WHERE item.id = candidates.id
    RETURNING item.*
  )
  SELECT * FROM claimed ORDER BY position;
$$;

REVOKE ALL ON FUNCTION public.manual_japan_entry_claim_batch_items(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_claim_batch_items(uuid, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.manual_japan_entry_create_batch(
  p_items jsonb,
  p_message_variant text,
  p_message_angle text,
  p_source_slug text,
  p_source_page_url text DEFAULT NULL,
  p_observed_on date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_count integer;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;
  v_count := jsonb_array_length(p_items);
  IF v_count < 1 OR v_count > 500 THEN
    RAISE EXCEPTION 'manual work batch size must be between 1 and 500';
  END IF;

  INSERT INTO public.manual_japan_entry_batches (
    total_count,
    message_variant_requested,
    message_angle_requested,
    source_slug,
    source_page_url,
    observed_on
  ) VALUES (
    v_count,
    p_message_variant,
    p_message_angle,
    p_source_slug,
    nullif(trim(p_source_page_url), ''),
    p_observed_on
  )
  RETURNING id INTO v_batch_id;

  INSERT INTO public.manual_japan_entry_batch_items (
    batch_id,
    position,
    input_url,
    canonical_url,
    domain
  )
  SELECT
    v_batch_id,
    source.ordinality::integer - 1,
    source.value ->> 'input_url',
    source.value ->> 'canonical_url',
    source.value ->> 'domain'
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS source(value, ordinality);

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manual_japan_entry_create_batch(jsonb, text, text, text, text, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_create_batch(jsonb, text, text, text, text, date)
  TO service_role;

CREATE OR REPLACE FUNCTION public.manual_japan_entry_refresh_batch(p_batch_id uuid)
RETURNS public.manual_japan_entry_batches
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_open integer;
  v_failed integer;
  v_result public.manual_japan_entry_batches;
BEGIN
  SELECT
    count(*) FILTER (WHERE status IN ('queued', 'processing')),
    count(*) FILTER (WHERE status = 'failed')
  INTO v_open, v_failed
  FROM public.manual_japan_entry_batch_items
  WHERE batch_id = p_batch_id;

  UPDATE public.manual_japan_entry_batches
  SET
    status = CASE
      WHEN v_open > 0 THEN 'running'
      WHEN v_failed > 0 THEN 'completed_with_errors'
      ELSE 'completed'
    END,
    started_at = coalesce(started_at, now()),
    completed_at = CASE WHEN v_open = 0 THEN coalesce(completed_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = p_batch_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.manual_japan_entry_refresh_batch(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_refresh_batch(uuid)
  TO service_role;

COMMENT ON TABLE public.manual_japan_entry_batches IS
  'Durable operator-started /work batches of up to 500 domains. Zero-send and separate from the automated sales pipeline.';
COMMENT ON TABLE public.manual_japan_entry_batch_items IS
  'Per-domain durable progress and retry state for manual Japan Entry batches.';

NOTIFY pgrst, 'reload schema';
