-- RevenueOS case control for the external Japan market operator offer.
-- External sending remains outside this schema and always requires a human action.

SELECT set_config('app.japan_operator_mutation', 'rpc', true);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.sales_companies(id) ON DELETE CASCADE,
  engagement_no integer NOT NULL DEFAULT 1,
  offer_code text NOT NULL DEFAULT 'standard_operator_v1',
  offer_version text NOT NULL DEFAULT '2026-08-02',
  offer_snapshot jsonb NOT NULL DEFAULT jsonb_build_object(
    'offer_code', 'standard_operator_v1', 'currency', 'USD',
    'validation_fee', 5000, 'launch_total_fee', 20000,
    'monthly_retainer', 2500, 'revenue_share_percent', 10,
    'validation_credit_days', 30
  ),
  currency text NOT NULL DEFAULT 'USD',
  stage text NOT NULL DEFAULT 'prospect_intake',
  status text NOT NULL DEFAULT 'active',
  owner text,
  reviewer text,
  next_action text,
  next_action_due_at timestamptz,
  gate_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocker_codes text[] NOT NULL DEFAULT '{}',
  validation_contract_id uuid REFERENCES public.sales_contracts(id) ON DELETE SET NULL,
  launch_contract_id uuid REFERENCES public.sales_contracts(id) ON DELETE SET NULL,
  operator_contract_id uuid REFERENCES public.sales_contracts(id) ON DELETE SET NULL,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_japan_operator_cases_offer_check CHECK (
    offer_code IN ('standard_operator_v1', 'country_partner_setup_v1', 'custom_approved_v1')
  ),
  CONSTRAINT sales_japan_operator_cases_stage_check CHECK (
    stage IN (
      'prospect_intake', 'evidence_verified', 'memo_ready', 'human_approved',
      'permission_sent', 'replied', 'qualification', 'validation_sow',
      'paid_validation', 'launch_sow', 'operator_contract', 'active_operator'
    )
  ),
  CONSTRAINT sales_japan_operator_cases_status_check CHECK (
    status IN ('active', 'on_hold', 'won', 'lost', 'disqualified')
  ),
  CONSTRAINT sales_japan_operator_cases_gate_data_check CHECK (jsonb_typeof(gate_data) = 'object'),
  CONSTRAINT sales_japan_operator_cases_revision_check CHECK (revision BETWEEN 1 AND 1000000),
  CONSTRAINT sales_japan_operator_cases_owner_check CHECK (
    owner IS NULL OR length(trim(owner)) BETWEEN 2 AND 120
  )
);

ALTER TABLE public.sales_japan_operator_cases
  ADD COLUMN IF NOT EXISTS engagement_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS offer_version text NOT NULL DEFAULT '2026-08-02',
  ADD COLUMN IF NOT EXISTS offer_snapshot jsonb NOT NULL DEFAULT jsonb_build_object(
    'offer_code', 'standard_operator_v1', 'currency', 'USD',
    'validation_fee', 5000, 'launch_total_fee', 20000,
    'monthly_retainer', 2500, 'revenue_share_percent', 10,
    'validation_credit_days', 30
  ),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_stage text,
  to_stage text,
  actor text NOT NULL,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  auth_source text NOT NULL,
  note text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_japan_operator_events_action_check CHECK (
    action IN ('case_created', 'wave1_seeded', 'set_check', 'save_next_action', 'advance', 'set_status')
  ),
  CONSTRAINT sales_japan_operator_events_actor_check CHECK (length(trim(actor)) BETWEEN 2 AND 120),
  CONSTRAINT sales_japan_operator_events_note_check CHECK (length(trim(note)) BETWEEN 2 AND 2000),
  CONSTRAINT sales_japan_operator_events_detail_check CHECK (jsonb_typeof(detail) = 'object')
);

ALTER TABLE public.sales_japan_operator_events
  ADD COLUMN IF NOT EXISTS actor_key text,
  ADD COLUMN IF NOT EXISTS actor_email text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS auth_source text;
UPDATE public.sales_japan_operator_events
SET actor_key = coalesce(actor_key, actor),
    actor_role = coalesce(actor_role, 'system'),
    auth_source = coalesce(auth_source, 'migration')
WHERE actor_key IS NULL OR actor_role IS NULL OR auth_source IS NULL;
ALTER TABLE public.sales_japan_operator_events
  ALTER COLUMN actor_key SET NOT NULL,
  ALTER COLUMN actor_role SET NOT NULL,
  ALTER COLUMN auth_source SET NOT NULL;

CREATE INDEX IF NOT EXISTS sales_japan_operator_cases_stage_due_idx
  ON public.sales_japan_operator_cases(status, stage, next_action_due_at);
CREATE INDEX IF NOT EXISTS sales_japan_operator_cases_owner_idx
  ON public.sales_japan_operator_cases(owner, updated_at DESC);
CREATE INDEX IF NOT EXISTS sales_japan_operator_events_case_created_idx
  ON public.sales_japan_operator_events(case_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sales_japan_operator_cases_company_engagement_uidx
  ON public.sales_japan_operator_cases(company_id, engagement_no);

ALTER TABLE public.sales_japan_operator_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sales_japan_operator_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sales_japan_operator_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sales_japan_operator_cases TO service_role;
GRANT SELECT, INSERT ON TABLE public.sales_japan_operator_events TO service_role;

DROP POLICY IF EXISTS "sales_japan_operator_cases service role" ON public.sales_japan_operator_cases;
CREATE POLICY "sales_japan_operator_cases service role"
  ON public.sales_japan_operator_cases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sales_japan_operator_events service role" ON public.sales_japan_operator_events;
CREATE POLICY "sales_japan_operator_events service role"
  ON public.sales_japan_operator_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sales_apply_japan_operator_action(
  p_case_id uuid,
  p_expected_revision integer,
  p_action text,
  p_actor text,
  p_note text,
  p_to_stage text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_gate_data jsonb DEFAULT NULL,
  p_next_action text DEFAULT NULL,
  p_next_action_due_at timestamptz DEFAULT NULL,
  p_owner text DEFAULT NULL
)
RETURNS SETOF public.sales_japan_operator_cases
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_case public.sales_japan_operator_cases%ROWTYPE;
  updated_case public.sales_japan_operator_cases%ROWTYPE;
  stages constant text[] := ARRAY[
    'prospect_intake', 'evidence_verified', 'memo_ready', 'human_approved',
    'permission_sent', 'replied', 'qualification', 'validation_sow',
    'paid_validation', 'launch_sow', 'operator_contract', 'active_operator'
  ];
BEGIN
  IF p_action NOT IN ('set_check', 'save_next_action', 'advance', 'set_status') THEN
    RAISE EXCEPTION 'unsupported Japan operator action';
  END IF;
  IF length(trim(coalesce(p_actor, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'actor is required';
  END IF;
  IF length(trim(coalesce(p_note, ''))) NOT BETWEEN 2 AND 2000 THEN
    RAISE EXCEPTION 'action note is required';
  END IF;

  SELECT * INTO current_case
  FROM public.sales_japan_operator_cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Japan operator case not found'; END IF;
  IF current_case.revision <> p_expected_revision THEN RAISE EXCEPTION 'Japan operator case revision conflict'; END IF;

  IF p_action = 'set_check' THEN
    IF p_gate_data IS NULL OR jsonb_typeof(p_gate_data) <> 'object' THEN
      RAISE EXCEPTION 'gate data must be an object';
    END IF;
    UPDATE public.sales_japan_operator_cases
    SET gate_data = p_gate_data,
        revision = revision + 1,
        updated_at = now()
    WHERE id = p_case_id
    RETURNING * INTO updated_case;
  ELSIF p_action = 'save_next_action' THEN
    UPDATE public.sales_japan_operator_cases
    SET next_action = nullif(trim(p_next_action), ''),
        next_action_due_at = p_next_action_due_at,
        owner = coalesce(nullif(trim(p_owner), ''), owner),
        revision = revision + 1,
        updated_at = now()
    WHERE id = p_case_id
    RETURNING * INTO updated_case;
  ELSIF p_action = 'advance' THEN
    IF array_position(stages, p_to_stage) IS NULL
      OR array_position(stages, p_to_stage) <> array_position(stages, current_case.stage) + 1 THEN
      RAISE EXCEPTION 'Japan operator stage transition must advance exactly one stage';
    END IF;
    UPDATE public.sales_japan_operator_cases
    SET stage = p_to_stage,
        stage_entered_at = now(),
        reviewer = p_actor,
        next_action = null,
        next_action_due_at = null,
        revision = revision + 1,
        updated_at = now()
    WHERE id = p_case_id
    RETURNING * INTO updated_case;
  ELSE
    IF p_status NOT IN ('active', 'on_hold', 'won', 'lost', 'disqualified') THEN
      RAISE EXCEPTION 'invalid Japan operator case status';
    END IF;
    UPDATE public.sales_japan_operator_cases
    SET status = p_status,
        revision = revision + 1,
        updated_at = now()
    WHERE id = p_case_id
    RETURNING * INTO updated_case;
  END IF;

  INSERT INTO public.sales_japan_operator_events (
    case_id, action, from_stage, to_stage, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) VALUES (
    p_case_id,
    p_action,
    current_case.stage,
    updated_case.stage,
    trim(p_actor),
    trim(p_actor),
    NULL,
    'system',
    'legacy_rpc',
    trim(p_note),
    jsonb_build_object(
      'before_revision', current_case.revision,
      'after_revision', updated_case.revision,
      'status', updated_case.status,
      'gate_snapshot', updated_case.gate_data,
      'next_action', updated_case.next_action,
      'next_action_due_at', updated_case.next_action_due_at
    )
  );

  RETURN NEXT updated_case;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_apply_japan_operator_action(
  uuid, integer, text, text, text, text, text, jsonb, text, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_apply_japan_operator_action(
  uuid, integer, text, text, text, text, text, jsonb, text, timestamptz, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.sales_create_japan_operator_case(
  p_company_id uuid,
  p_offer_code text,
  p_actor text,
  p_owner text,
  p_note text
)
RETURNS SETOF public.sales_japan_operator_cases
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_case public.sales_japan_operator_cases%ROWTYPE;
BEGIN
  IF p_offer_code NOT IN ('standard_operator_v1', 'country_partner_setup_v1', 'custom_approved_v1') THEN
    RAISE EXCEPTION 'invalid Japan operator offer code';
  END IF;
  IF p_offer_code = 'custom_approved_v1' THEN
    RAISE EXCEPTION 'custom offer cases require finance-approved migration or contract record';
  END IF;
  IF length(trim(coalesce(p_actor, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'actor is required';
  END IF;
  IF length(trim(coalesce(p_note, ''))) NOT BETWEEN 2 AND 2000 THEN
    RAISE EXCEPTION 'creation note is required';
  END IF;

  INSERT INTO public.sales_japan_operator_cases (company_id, offer_code, owner)
  VALUES (p_company_id, p_offer_code, nullif(trim(p_owner), ''))
  RETURNING * INTO created_case;

  INSERT INTO public.sales_japan_operator_events (
    case_id, action, from_stage, to_stage, actor, actor_key, actor_email, actor_role, auth_source, note, detail
  ) VALUES (
    created_case.id,
    'case_created',
    NULL,
    created_case.stage,
    trim(p_actor),
    trim(p_actor),
    NULL,
    'system',
    'legacy_rpc',
    trim(p_note),
    jsonb_build_object('offer_code', created_case.offer_code, 'external_messages_sent', 0)
  );

  RETURN NEXT created_case;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_create_japan_operator_case(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_create_japan_operator_case(uuid, text, text, text, text)
  TO service_role;

WITH wave_one AS (
  SELECT id
  FROM public.sales_companies
  WHERE lower(company_name) = ANY (ARRAY[
    'chefclean',
    'little archive / dongjin bedding',
    'b.fter / another day',
    'holen',
    'qurv / f.r.p. industry'
  ])
)
INSERT INTO public.sales_japan_operator_cases (
  company_id,
  offer_code,
  stage,
  status,
  owner,
  next_action,
  next_action_due_at,
  gate_data
)
SELECT
  id,
  'standard_operator_v1',
  'evidence_verified',
  'active',
  'Paradigm commercial lead',
  'Japan Opportunity Memoを作成し、人間レビューへ回す',
  now() + interval '3 days',
  jsonb_build_object(
    'evidence_verified',
    jsonb_build_object(
      'intent_source_current', true,
      'contact_route_verified', true,
      'incumbent_partner_checked', true,
      'product_scope_identified', true
    )
  )
FROM wave_one
ON CONFLICT (company_id, engagement_no) DO NOTHING;

INSERT INTO public.sales_japan_operator_events (
  case_id, action, from_stage, to_stage, actor, actor_key, actor_email, actor_role, auth_source, note, detail, idempotency_key
)
SELECT
  operator_case.id,
  'wave1_seeded',
  NULL,
  operator_case.stage,
  'RevenueOS migration',
  'migration:revenueos',
  NULL,
  'system',
  'migration',
  'Evidence-backed Wave 1 case initialized; no external message was sent.',
  jsonb_build_object('external_messages_sent', 0, 'offer_code', operator_case.offer_code),
  'japan-operator-wave1:' || operator_case.company_id::text
FROM public.sales_japan_operator_cases AS operator_case
JOIN public.sales_companies AS company ON company.id = operator_case.company_id
WHERE lower(company.company_name) = ANY (ARRAY[
  'chefclean',
  'little archive / dongjin bedding',
  'b.fter / another day',
  'holen',
  'qurv / f.r.p. industry'
])
ON CONFLICT (idempotency_key) DO NOTHING;

COMMENT ON TABLE public.sales_japan_operator_cases IS
  'Case SSOT for evidence, approval, contract and operating gates in the external Japan market operator offer.';
COMMENT ON TABLE public.sales_japan_operator_events IS
  'Append-only audit history for Japan operator gate, stage and disposition changes.';
COMMENT ON FUNCTION public.sales_apply_japan_operator_action(
  uuid, integer, text, text, text, text, text, jsonb, text, timestamptz, text
) IS 'Atomic service-role-only mutation and audit event for a Japan operator case.';
COMMENT ON FUNCTION public.sales_create_japan_operator_case(uuid, text, text, text, text)
  IS 'Atomically creates a Japan operator case and its first audit event.';

NOTIFY pgrst, 'reload schema';
