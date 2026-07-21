-- Make /work the authoritative owner of its Twenty artifacts and keep 500-row
-- batches O(1) per drain slice. The workbench remains zero-send.

ALTER TABLE public.manual_japan_entry_work
  ADD COLUMN IF NOT EXISTS legacy_report_slug text;

UPDATE public.manual_japan_entry_work
SET legacy_report_slug = left(
  trim(both '-' FROM regexp_replace(
    lower(coalesce(nullif(trim(company_name), ''), split_part(domain, '.', 1))),
    '[^a-z0-9]+',
    '-',
    'g'
  )),
  50
)
WHERE legacy_report_slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_legacy_report_slug
  ON public.manual_japan_entry_work (legacy_report_slug, updated_at DESC)
  WHERE legacy_report_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_twenty_company_id
  ON public.manual_japan_entry_work (twenty_company_id)
  WHERE twenty_company_id IS NOT NULL;

ALTER TABLE public.manual_japan_entry_batches
  ADD COLUMN IF NOT EXISTS queued_count integer NOT NULL DEFAULT 0 CHECK (queued_count >= 0),
  ADD COLUMN IF NOT EXISTS processing_count integer NOT NULL DEFAULT 0 CHECK (processing_count >= 0),
  ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  ADD COLUMN IF NOT EXISTS needs_review_count integer NOT NULL DEFAULT 0 CHECK (needs_review_count >= 0),
  ADD COLUMN IF NOT EXISTS rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0);

WITH counts AS (
  SELECT
    batch_id,
    count(*) FILTER (WHERE status = 'queued')::integer AS queued_count,
    count(*) FILTER (WHERE status = 'processing')::integer AS processing_count,
    count(*) FILTER (WHERE status = 'completed')::integer AS completed_count,
    count(*) FILTER (WHERE status = 'needs_review')::integer AS needs_review_count,
    count(*) FILTER (WHERE status = 'rejected')::integer AS rejected_count,
    count(*) FILTER (WHERE status = 'failed')::integer AS failed_count,
    count(*) FILTER (WHERE status = 'duplicate')::integer AS duplicate_count
  FROM public.manual_japan_entry_batch_items
  GROUP BY batch_id
)
UPDATE public.manual_japan_entry_batches AS batch
SET
  queued_count = counts.queued_count,
  processing_count = counts.processing_count,
  completed_count = counts.completed_count,
  needs_review_count = counts.needs_review_count,
  rejected_count = counts.rejected_count,
  failed_count = counts.failed_count,
  duplicate_count = counts.duplicate_count
FROM counts
WHERE batch.id = counts.batch_id;

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
    v_count,
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

CREATE OR REPLACE FUNCTION public.manual_japan_entry_refresh_batch(p_batch_id uuid)
RETURNS public.manual_japan_entry_batches
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_queued integer;
  v_processing integer;
  v_completed integer;
  v_needs_review integer;
  v_rejected integer;
  v_failed integer;
  v_duplicate integer;
  v_result public.manual_japan_entry_batches;
BEGIN
  SELECT
    count(*) FILTER (WHERE status = 'queued')::integer,
    count(*) FILTER (WHERE status = 'processing')::integer,
    count(*) FILTER (WHERE status = 'completed')::integer,
    count(*) FILTER (WHERE status = 'needs_review')::integer,
    count(*) FILTER (WHERE status = 'rejected')::integer,
    count(*) FILTER (WHERE status = 'failed')::integer,
    count(*) FILTER (WHERE status = 'duplicate')::integer
  INTO
    v_queued,
    v_processing,
    v_completed,
    v_needs_review,
    v_rejected,
    v_failed,
    v_duplicate
  FROM public.manual_japan_entry_batch_items
  WHERE batch_id = p_batch_id;

  UPDATE public.manual_japan_entry_batches
  SET
    queued_count = coalesce(v_queued, 0),
    processing_count = coalesce(v_processing, 0),
    completed_count = coalesce(v_completed, 0),
    needs_review_count = coalesce(v_needs_review, 0),
    rejected_count = coalesce(v_rejected, 0),
    failed_count = coalesce(v_failed, 0),
    duplicate_count = coalesce(v_duplicate, 0),
    status = CASE
      WHEN coalesce(v_queued, 0) + coalesce(v_processing, 0) > 0 THEN 'running'
      WHEN coalesce(v_failed, 0) > 0 THEN 'completed_with_errors'
      ELSE 'completed'
    END,
    started_at = coalesce(started_at, now()),
    completed_at = CASE
      WHEN coalesce(v_queued, 0) + coalesce(v_processing, 0) = 0
        THEN coalesce(completed_at, now())
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = p_batch_id
  RETURNING * INTO v_result;

  RETURN v_result;
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
      OR drain_claimed_at < now() - interval '16 minutes'
    );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN v_claim_token;
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
        OR (item.status = 'processing' AND item.claimed_at < now() - interval '20 minutes')
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

REVOKE ALL ON FUNCTION public.manual_japan_entry_create_batch(jsonb, text, text, text, text, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manual_japan_entry_refresh_batch(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manual_japan_entry_claim_batch_drain(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manual_japan_entry_claim_batch_items(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_create_batch(jsonb, text, text, text, text, date)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_refresh_batch(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_claim_batch_drain(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_japan_entry_claim_batch_items(uuid, integer)
  TO service_role;

COMMENT ON COLUMN public.manual_japan_entry_work.legacy_report_slug IS
  'Legacy /report/:slug alias owned by the current /work report. Used only for safe redirects.';
COMMENT ON COLUMN public.manual_japan_entry_batches.queued_count IS
  'Persisted status counters avoid re-reading up to 500 item rows after every three-company drain.';

NOTIFY pgrst, 'reload schema';
