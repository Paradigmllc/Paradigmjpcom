-- Bounded, auditable website preflight for evidence-first lead sources.
-- Source records are not claimable until DNS, SSRF safety, HTTPS reachability,
-- and an HTML homepage response have been checked successfully.

ALTER TABLE public.sales_lead_source_configs
  ADD COLUMN IF NOT EXISTS last_preflight jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_preflighted_at timestamptz;

ALTER TABLE public.sales_lead_source_records
  ADD COLUMN IF NOT EXISTS preflight_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS preflight_reason text,
  ADD COLUMN IF NOT EXISTS preflight_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS preflight_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preflight_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.sales_lead_source_records
  DROP CONSTRAINT IF EXISTS sales_lead_source_records_preflight_status_check;
ALTER TABLE public.sales_lead_source_records
  ADD CONSTRAINT sales_lead_source_records_preflight_status_check CHECK (
    preflight_status IN ('pending', 'checking', 'eligible', 'retryable', 'rejected')
  );

ALTER TABLE public.sales_lead_source_records
  DROP CONSTRAINT IF EXISTS sales_lead_source_records_preflight_attempts_check;
ALTER TABLE public.sales_lead_source_records
  ADD CONSTRAINT sales_lead_source_records_preflight_attempts_check CHECK (
    preflight_attempts BETWEEN 0 AND 1000
  );

CREATE INDEX IF NOT EXISTS idx_sales_lead_source_records_preflight_claim
  ON public.sales_lead_source_records(source_config_id, active, preflight_status, preflight_checked_at, observed_at DESC);

CREATE OR REPLACE FUNCTION public.sales_claim_lead_source_preflight_records(
  p_source_config_id uuid,
  p_limit integer
)
RETURNS SETOF public.sales_lead_source_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_source_config_id IS NULL THEN
    RAISE EXCEPTION 'source config id is required';
  END IF;

  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT source_record.id
    FROM public.sales_lead_source_records AS source_record
    WHERE source_record.source_config_id = p_source_config_id
      AND source_record.active = true
      AND (
        source_record.preflight_status = 'pending'
        OR (
          source_record.preflight_status = 'checking'
          AND source_record.preflight_checked_at < now() - interval '15 minutes'
        )
      )
    ORDER BY source_record.observed_at DESC, source_record.id
    FOR UPDATE OF source_record SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ), claimed AS (
    UPDATE public.sales_lead_source_records AS source_record
    SET preflight_status = 'checking',
        preflight_reason = NULL,
        preflight_checked_at = now(),
        preflight_attempts = LEAST(source_record.preflight_attempts + 1, 1000)
    FROM candidates
    WHERE source_record.id = candidates.id
    RETURNING source_record.*
  )
  SELECT claimed.* FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_complete_lead_source_preflight(
  p_source_config_id uuid,
  p_results jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  IF p_source_config_id IS NULL THEN
    RAISE EXCEPTION 'source config id is required';
  END IF;
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RAISE EXCEPTION 'preflight results must be a JSON array';
  END IF;

  WITH results AS (
    SELECT *
    FROM jsonb_to_recordset(p_results) AS result(
      id uuid,
      status text,
      reason text,
      checked_at timestamptz,
      evidence jsonb
    )
  )
  UPDATE public.sales_lead_source_records AS source_record
  SET preflight_status = results.status,
      preflight_reason = NULLIF(results.reason, ''),
      preflight_checked_at = COALESCE(results.checked_at, now()),
      preflight_evidence = COALESCE(results.evidence, '{}'::jsonb)
  FROM results
  WHERE source_record.id = results.id
    AND source_record.source_config_id = p_source_config_id
    AND source_record.preflight_status = 'checking'
    AND results.status IN ('eligible', 'retryable', 'rejected');

  WITH status_counts AS (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE preflight_status = 'pending')::integer AS pending,
      count(*) FILTER (WHERE preflight_status = 'checking')::integer AS checking,
      count(*) FILTER (WHERE preflight_status = 'eligible')::integer AS eligible,
      count(*) FILTER (WHERE preflight_status = 'retryable')::integer AS retryable,
      count(*) FILTER (WHERE preflight_status = 'rejected')::integer AS rejected
    FROM public.sales_lead_source_records
    WHERE source_config_id = p_source_config_id AND active = true
  ), top_reasons AS (
    SELECT preflight_reason AS reason, count(*)::integer AS count
    FROM public.sales_lead_source_records
    WHERE source_config_id = p_source_config_id
      AND active = true
      AND preflight_reason IS NOT NULL
    GROUP BY preflight_reason
    ORDER BY count(*) DESC, preflight_reason
    LIMIT 8
  )
  SELECT jsonb_build_object(
    'total', status_counts.total,
    'pending', status_counts.pending,
    'checking', status_counts.checking,
    'eligible', status_counts.eligible,
    'retryable', status_counts.retryable,
    'rejected', status_counts.rejected,
    'reasonCounts', COALESCE((SELECT jsonb_object_agg(reason, count) FROM top_reasons), '{}'::jsonb),
    'completed', status_counts.pending = 0 AND status_counts.checking = 0,
    'checkedAt', now()
  )
  INTO v_summary
  FROM status_counts;

  UPDATE public.sales_lead_source_configs
  SET last_preflight = v_summary,
      last_preflighted_at = now()
  WHERE id = p_source_config_id;

  RETURN v_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_claim_lead_source_records(
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
      AND COALESCE((source_config.last_preflight->>'completed')::boolean, false) = true
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

REVOKE ALL ON FUNCTION public.sales_claim_lead_source_preflight_records(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sales_complete_lead_source_preflight(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sales_claim_lead_source_records(text, uuid[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_preflight_records(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_complete_lead_source_preflight(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_records(text, uuid[], integer) TO service_role;

COMMENT ON COLUMN public.sales_lead_source_records.preflight_status IS
  'Fail-closed website eligibility. Only fresh eligible records can enter a candidate run.';
COMMENT ON COLUMN public.sales_lead_source_configs.last_preflight IS
  'Aggregated DNS, HTTPS and HTML homepage preflight counts shown to the operator.';
COMMENT ON FUNCTION public.sales_claim_lead_source_preflight_records(uuid, integer) IS
  'Atomically claims a bounded preflight chunk. Stale checking rows can be recovered after 15 minutes.';
COMMENT ON FUNCTION public.sales_complete_lead_source_preflight(uuid, jsonb) IS
  'Persists bounded preflight results and returns an aggregate source-quality summary.';

NOTIFY pgrst, 'reload schema';
