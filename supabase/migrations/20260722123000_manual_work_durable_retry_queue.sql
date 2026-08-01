-- Route operator-requested regeneration through the same durable zero-send
-- queue as new /work intake. This prevents browser/Cloudflare timeouts from
-- owning a long DeepSeek request and records the exact row being refreshed.

ALTER TABLE public.manual_japan_entry_batch_items
  ADD COLUMN IF NOT EXISTS retry_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_work_id uuid
    REFERENCES public.manual_japan_entry_work(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_batch_items_open_retry
  ON public.manual_japan_entry_batch_items (expected_work_id, status)
  WHERE retry_requested = true AND expected_work_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.manual_japan_entry_create_retry_batch(
  p_work_id uuid,
  p_input_url text,
  p_canonical_url text,
  p_domain text,
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
  v_open_batches integer;
  v_existing_domain text;
  v_has_outcome boolean;
BEGIN
  IF p_work_id IS NULL OR nullif(trim(p_domain), '') IS NULL THEN
    RAISE EXCEPTION 'retry work ID and domain are required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('manual_japan_entry_batch_queue'));

  SELECT
    work.domain,
    work.manually_sent_at IS NOT NULL
      OR work.reply_received_at IS NOT NULL
      OR work.founder_forwarded_at IS NOT NULL
      OR work.meeting_converted_at IS NOT NULL
  INTO v_existing_domain, v_has_outcome
  FROM public.manual_japan_entry_work AS work
  WHERE work.id = p_work_id
  FOR UPDATE;

  IF v_existing_domain IS NULL THEN
    RAISE EXCEPTION 'manual work retry target was not found';
  END IF;
  IF lower(v_existing_domain) <> lower(trim(p_domain)) THEN
    RAISE EXCEPTION 'manual work retry target does not match the submitted domain';
  END IF;
  IF v_has_outcome THEN
    RAISE EXCEPTION 'manual work with recorded outreach outcomes cannot be regenerated';
  END IF;

  SELECT item.batch_id
  INTO v_batch_id
  FROM public.manual_japan_entry_batch_items AS item
  JOIN public.manual_japan_entry_batches AS batch ON batch.id = item.batch_id
  WHERE item.retry_requested = true
    AND item.expected_work_id = p_work_id
    AND item.status IN ('queued', 'processing')
    AND batch.status IN ('queued', 'running')
  ORDER BY item.created_at
  LIMIT 1;
  IF v_batch_id IS NOT NULL THEN
    RETURN v_batch_id;
  END IF;

  SELECT count(*) INTO v_open_batches
  FROM public.manual_japan_entry_batches
  WHERE status IN ('queued', 'running');
  IF v_open_batches >= 20 THEN
    RAISE EXCEPTION 'manual work queue is full (20 batches / 10000 companies maximum)';
  END IF;

  INSERT INTO public.manual_japan_entry_batches (
    total_count,
    queued_count,
    message_variant_requested,
    message_angle_requested,
    source_slug,
    source_page_url,
    observed_on
  ) VALUES (
    1,
    1,
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
    domain,
    retry_requested,
    expected_work_id
  ) VALUES (
    v_batch_id,
    0,
    p_input_url,
    p_canonical_url,
    lower(trim(p_domain)),
    true,
    p_work_id
  );

  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manual_japan_entry_create_retry_batch(
  uuid, text, text, text, text, text, text, text, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_create_retry_batch(
  uuid, text, text, text, text, text, text, text, date
) TO service_role;

COMMENT ON FUNCTION public.manual_japan_entry_create_retry_batch(
  uuid, text, text, text, text, text, text, text, date
) IS 'Idempotently queues one exact /work row for zero-send regeneration without keeping the operator HTTP request open.';

NOTIFY pgrst, 'reload schema';
