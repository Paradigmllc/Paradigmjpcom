-- Pilot runs may consume only fresh, already-preflighted eligible records while
-- the rest of a large approved source is still being checked. Batch claims keep
-- using sales_claim_lead_source_records and therefore require completed source
-- preflight plus operator pilot approval.

CREATE OR REPLACE FUNCTION public.sales_claim_lead_source_pilot_records(
  p_country_code text,
  p_source_config_ids uuid[],
  p_limit integer
)
RETURNS SETOF public.sales_lead_source_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid country code';
  END IF;
  IF p_source_config_ids IS NULL OR cardinality(p_source_config_ids) = 0 THEN
    RAISE EXCEPTION 'at least one source config is required';
  END IF;

  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT source_record.id
    FROM public.sales_lead_source_records AS source_record
    JOIN public.sales_lead_source_configs AS source_config
      ON source_config.id = source_record.source_config_id
    WHERE source_record.country_code = p_country_code
      AND source_record.source_config_id = ANY(p_source_config_ids)
      AND source_record.active = true
      AND source_record.preflight_status = 'eligible'
      AND source_record.preflight_checked_at >= now() - interval '7 days'
      AND (source_record.last_selected_at IS NULL OR source_record.last_selected_at < now() - interval '30 minutes')
      AND source_config.active = true
      AND source_config.terms_checked = true
      AND source_config.approval_status = 'approved'
      AND source_config.last_status = 'ready'
      AND NOT EXISTS (
        SELECT 1
        FROM public.sales_lead_candidate_run_items AS prior_item
        WHERE prior_item.domain = source_record.domain
          AND prior_item.status IN (
            'scored', 'awaiting_review', 'form_missing', 'promoted',
            'review_required', 'rejected', 'skipped'
          )
          AND prior_item.updated_at >= now() - interval '180 days'
      )
    ORDER BY source_record.last_selected_at ASC NULLS FIRST,
      source_config.trust_tier DESC,
      source_record.observed_at DESC,
      source_record.id
    FOR UPDATE OF source_record SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 10000)
  ), claimed AS (
    UPDATE public.sales_lead_source_records AS source_record
    SET last_selected_at = now(),
        selection_count = LEAST(source_record.selection_count + 1, 1000000)
    FROM candidates
    WHERE source_record.id = candidates.id
    RETURNING source_record.*
  )
  SELECT claimed.* FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_claim_lead_source_pilot_records(text, uuid[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_pilot_records(text, uuid[], integer) TO service_role;

COMMENT ON FUNCTION public.sales_claim_lead_source_pilot_records(text, uuid[], integer) IS
  'Claims only fresh eligible records for a bounded pilot while source preflight may still be incomplete.';

NOTIFY pgrst, 'reload schema';
