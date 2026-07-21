-- Queue multiple operator-started /work batches while preserving one active runner.
-- Each batch remains capped at 500 companies and never sends outreach.

ALTER TABLE public.manual_japan_entry_batches
  ADD COLUMN IF NOT EXISTS drain_claim_token uuid,
  ADD COLUMN IF NOT EXISTS drain_claimed_at timestamptz;

DROP INDEX IF EXISTS public.uq_manual_japan_entry_single_active_batch;
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_japan_entry_single_running_batch
  ON public.manual_japan_entry_batches ((true))
  WHERE status = 'running';

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
  v_open_batches integer;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array';
  END IF;
  v_count := jsonb_array_length(p_items);
  IF v_count < 1 OR v_count > 500 THEN
    RAISE EXCEPTION 'manual work batch size must be between 1 and 500';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('manual_japan_entry_batch_queue'));
  SELECT count(*)
  INTO v_open_batches
  FROM public.manual_japan_entry_batches
  WHERE status IN ('queued', 'running');
  IF v_open_batches >= 20 THEN
    RAISE EXCEPTION 'manual work queue is full (20 batches / 10000 companies maximum)';
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

CREATE OR REPLACE FUNCTION public.manual_japan_entry_promote_next_batch()
RETURNS TABLE(batch_id uuid, promoted boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('manual_japan_entry_batch_queue'));

  SELECT batch.id
  INTO v_batch_id
  FROM public.manual_japan_entry_batches AS batch
  WHERE batch.status = 'running'
  ORDER BY batch.started_at NULLS FIRST, batch.created_at
  LIMIT 1;

  IF v_batch_id IS NOT NULL THEN
    RETURN QUERY SELECT v_batch_id, false;
    RETURN;
  END IF;

  SELECT batch.id
  INTO v_batch_id
  FROM public.manual_japan_entry_batches AS batch
  WHERE batch.status = 'queued'
  ORDER BY batch.created_at, batch.id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.manual_japan_entry_batches
  SET
    status = 'running',
    started_at = coalesce(started_at, now()),
    completed_at = NULL,
    last_error = NULL,
    updated_at = now()
  WHERE id = v_batch_id;

  RETURN QUERY SELECT v_batch_id, true;
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_japan_entry_claim_batch_drain(p_batch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_claim_token uuid := gen_random_uuid();
BEGIN
  UPDATE public.manual_japan_entry_batches
  SET
    drain_claim_token = v_claim_token,
    drain_claimed_at = now(),
    updated_at = now()
  WHERE id = p_batch_id
    AND status = 'running'
    AND (
      drain_claim_token IS NULL
      OR drain_claimed_at < now() - interval '6 minutes'
    );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN v_claim_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_japan_entry_release_batch_drain(
  p_batch_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_japan_entry_batches
  SET
    drain_claim_token = NULL,
    drain_claimed_at = NULL,
    updated_at = now()
  WHERE id = p_batch_id
    AND drain_claim_token = p_claim_token;
  RETURN FOUND;
END;
$$;

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
      AND EXISTS (
        SELECT 1
        FROM public.manual_japan_entry_batches AS batch
        WHERE batch.id = item.batch_id
          AND batch.status = 'running'
      )
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

REVOKE ALL ON FUNCTION public.manual_japan_entry_promote_next_batch()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manual_japan_entry_claim_batch_drain(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manual_japan_entry_release_batch_drain(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_promote_next_batch()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_claim_batch_drain(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_release_batch_drain(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.manual_japan_entry_promote_next_batch() IS
  'Atomically returns the existing runner or promotes the oldest queued zero-send /work batch.';
COMMENT ON INDEX public.uq_manual_japan_entry_single_running_batch IS
  'Allows multiple queued batches while enforcing exactly one running /work batch.';

NOTIFY pgrst, 'reload schema';
