-- Operator approval workflow for evidence-first lead acquisition.
-- Collection, verification and CRM promotion are deliberately separate actions.

ALTER TABLE public.sales_lead_source_configs
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_previewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pilot_approved_by text,
  ADD COLUMN IF NOT EXISTS pilot_approved_at timestamptz;

ALTER TABLE public.sales_lead_source_records
  ADD COLUMN IF NOT EXISTS last_selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS selection_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.sales_lead_source_records
  DROP CONSTRAINT IF EXISTS sales_lead_source_records_selection_count_check;
ALTER TABLE public.sales_lead_source_records
  ADD CONSTRAINT sales_lead_source_records_selection_count_check CHECK (
    selection_count BETWEEN 0 AND 1000000
  );

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_approval_status_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_approval_status_check CHECK (
    approval_status IN ('draft', 'approved', 'suspended')
  );

UPDATE public.sales_lead_source_configs
SET active = false
WHERE approval_status <> 'approved' AND active = true;

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_active_approval_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_active_approval_check CHECK (
    active = false OR approval_status = 'approved'
  );

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_approval_evidence_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_approval_evidence_check CHECK (
    approval_status <> 'approved'
    OR (terms_checked = true AND last_previewed_at IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  );

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_pilot_approval_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_pilot_approval_check CHECK (
    pilot_approved_at IS NULL
    OR (approval_status = 'approved' AND pilot_approved_by IS NOT NULL)
  );

ALTER TABLE public.sales_lead_candidate_runs
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'pilot',
  ADD COLUMN IF NOT EXISTS operator_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operator_approved_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operator_rejected_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_execution_mode_check;
ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_execution_mode_check CHECK (
    execution_mode IN ('pilot', 'batch')
  );

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_operator_status_check;
ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_operator_status_check CHECK (
    operator_status IN ('pending_review', 'approved_for_scale', 'closed')
  );

UPDATE public.sales_lead_candidate_runs
SET promote = false, sync_twenty = false
WHERE promote = true OR sync_twenty = true;

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_manual_promotion_only_check;
ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_manual_promotion_only_check CHECK (
    promote = false AND sync_twenty = false
  );

ALTER TABLE public.sales_lead_candidate_run_items
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS promotion_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_error text;

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_review_status_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_review_status_check CHECK (
    review_status IN ('not_required', 'pending', 'promoting', 'approved', 'rejected', 'promotion_failed')
  );

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_promotion_attempts_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_promotion_attempts_check CHECK (
    promotion_attempts BETWEEN 0 AND 20
  );

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_status_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_status_check CHECK (
    status IN (
      'discovered', 'verified', 'scored', 'awaiting_review', 'form_missing',
      'promoted', 'review_required', 'rejected', 'failed', 'skipped'
    )
  );

UPDATE public.sales_lead_candidate_run_items
SET review_status = CASE
  WHEN status = 'promoted' AND twenty_synced = true THEN 'approved'
  ELSE 'not_required'
END
WHERE review_status = 'not_required';

ALTER TABLE public.sales_lead_candidate_run_items
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_run_items_review_state_check;
ALTER TABLE public.sales_lead_candidate_run_items
  ADD CONSTRAINT sales_lead_candidate_run_items_review_state_check CHECK (
    (review_status NOT IN ('pending', 'promoting', 'promotion_failed') OR status = 'awaiting_review')
    AND (review_status <> 'approved' OR (status = 'promoted' AND twenty_synced = true))
    AND (review_status <> 'rejected' OR status = 'rejected')
  );

CREATE TABLE IF NOT EXISTS public.sales_lead_operator_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.sales_lead_candidate_runs(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  operator_name text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_operator_events_entity_type_check CHECK (
    entity_type IN ('source', 'run', 'item')
  ),
  CONSTRAINT sales_lead_operator_events_operator_check CHECK (length(trim(operator_name)) BETWEEN 2 AND 120),
  CONSTRAINT sales_lead_operator_events_action_check CHECK (length(trim(action)) BETWEEN 2 AND 120)
);

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

REVOKE ALL ON FUNCTION public.sales_claim_lead_source_records(text, uuid[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_records(text, uuid[], integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_sales_lead_source_configs_operator_ready
  ON public.sales_lead_source_configs(country_code, approval_status, active, pilot_approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_source_records_claim
  ON public.sales_lead_source_records(country_code, source_config_id, active, last_selected_at, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_candidate_run_items_operator_review
  ON public.sales_lead_candidate_run_items(run_id, review_status, opportunity_score DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_operator_events_entity
  ON public.sales_lead_operator_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_lead_operator_events_run
  ON public.sales_lead_operator_events(run_id, created_at DESC)
  WHERE run_id IS NOT NULL;

ALTER TABLE public.sales_lead_operator_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_lead_operator_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.sales_lead_operator_events TO service_role;

DROP POLICY IF EXISTS "sales_lead_operator_events service role access" ON public.sales_lead_operator_events;
CREATE POLICY "sales_lead_operator_events service role access"
  ON public.sales_lead_operator_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON COLUMN public.sales_lead_source_configs.approval_status IS
  'A source becomes production-eligible only after a non-mutating preview and explicit operator approval.';
COMMENT ON COLUMN public.sales_lead_source_configs.pilot_approved_at IS
  'Set only after an operator reviews a completed pilot run; required before batch execution.';
COMMENT ON FUNCTION public.sales_claim_lead_source_records(text, uuid[], integer) IS
  'Atomically claims approved source records while skipping recently completed domains and concurrent workers.';
COMMENT ON COLUMN public.sales_lead_candidate_run_items.review_status IS
  'Human approval gate between deterministic verification and sales_companies/Twenty promotion.';
COMMENT ON TABLE public.sales_lead_operator_events IS
  'Append-only audit trail for source approval, pilot approval, candidate review and run cancellation.';

NOTIFY pgrst, 'reload schema';
