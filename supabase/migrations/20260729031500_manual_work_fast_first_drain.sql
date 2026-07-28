-- Fast-first /work batches use a homepage-only deterministic pass, so a slice
-- can safely claim more companies than the legacy full-analysis pipeline.
-- Full-analysis promotions are one-item retry batches and remain bounded.

CREATE OR REPLACE FUNCTION public.manual_japan_entry_claim_batch_items(
  p_batch_id uuid,
  p_limit integer DEFAULT 8
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
    LIMIT greatest(1, least(coalesce(p_limit, 8), 8))
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

COMMENT ON FUNCTION public.manual_japan_entry_claim_batch_items(uuid, integer) IS
  'Claims up to eight homepage-only fast qualification rows per /work slice; full promotions remain one-item retry batches.';

NOTIFY pgrst, 'reload schema';
