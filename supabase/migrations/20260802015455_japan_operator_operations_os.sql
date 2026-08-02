-- Phase 0: fail-closed controls for identity, evidence and outbound activity.

ALTER TABLE public.sales_japan_operator_cases
  DROP CONSTRAINT IF EXISTS sales_japan_operator_cases_company_id_key;
ALTER TABLE public.sales_japan_operator_cases
  ADD COLUMN IF NOT EXISTS engagement_no integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS offer_version text NOT NULL DEFAULT '2026-08-02',
  ADD COLUMN IF NOT EXISTS offer_snapshot jsonb NOT NULL DEFAULT jsonb_build_object(
    'offer_code', 'standard_operator_v1',
    'currency', 'USD',
    'validation_fee', 5000,
    'launch_total_fee', 20000,
    'monthly_retainer', 2500,
    'revenue_share_percent', 10,
    'validation_credit_days', 30
  ),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

UPDATE public.sales_japan_operator_cases
SET offer_snapshot = jsonb_build_object(
  'offer_code', offer_code,
  'currency', 'USD',
  'validation_fee', 5000,
  'launch_total_fee', 20000,
  'monthly_retainer', 2500,
  'revenue_share_percent', 10,
  'validation_credit_days', 30
)
WHERE offer_snapshot = '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS sales_japan_operator_cases_company_engagement_uidx
  ON public.sales_japan_operator_cases(company_id, engagement_no);

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
  ALTER COLUMN auth_source SET NOT NULL,
  DROP CONSTRAINT IF EXISTS sales_japan_operator_events_action_check;
ALTER TABLE public.sales_japan_operator_events
  ADD CONSTRAINT sales_japan_operator_events_action_check CHECK (action IN (
    'case_created', 'wave1_seeded', 'set_check', 'save_next_action', 'advance',
    'set_status', 'reopen', 'evidence_added', 'approval_recorded',
    'outbound_authorized', 'outbound_consumed', 'suppression_recorded',
    'record_created', 'record_updated', 'automation_run'
  ));

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_key text NOT NULL UNIQUE,
  principal_email text,
  operator_role text NOT NULL CHECK (operator_role IN (
    'admin', 'commercial_lead', 'researcher', 'finance', 'legal',
    'delivery', 'japan_operator', 'viewer', 'automation'
  )),
  active boolean NOT NULL DEFAULT true,
  assigned_by_key text NOT NULL,
  assigned_by_email text,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 2 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  stage text NOT NULL,
  check_id text NOT NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'source_url', 'file', 'email', 'form', 'contract', 'invoice',
    'payment', 'system_record', 'meeting_note', 'other'
  )),
  source_url text,
  storage_path text,
  recipient text,
  channel text,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  observed_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  verified_by_key text NOT NULL,
  verified_by_email text,
  verified_by_role text NOT NULL,
  auth_source text NOT NULL,
  note text NOT NULL CHECK (length(trim(note)) BETWEEN 2 AND 2000),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  idempotency_key text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  approval_type text NOT NULL,
  stage text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('requested', 'approved', 'rejected', 'expired', 'revoked')),
  requested_by_key text NOT NULL,
  requested_by_email text,
  decided_by_key text,
  decided_by_email text,
  decided_by_role text,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  note text NOT NULL CHECK (length(trim(note)) BETWEEN 2 AND 2000),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  expires_at timestamptz,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_outbound_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.sales_companies(id) ON DELETE CASCADE,
  channel text NOT NULL,
  recipient text NOT NULL,
  message_sha256 text NOT NULL CHECK (message_sha256 ~ '^[a-f0-9]{64}$'),
  requested_by_key text NOT NULL,
  requested_by_email text,
  approved_by_key text NOT NULL,
  approved_by_email text,
  approved_by_role text NOT NULL CHECK (approved_by_role IN ('admin', 'commercial_lead')),
  override_reason text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  sales_activity_id uuid REFERENCES public.sales_activities(id) ON DELETE SET NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_japan_operator_authorization_separation_check CHECK (
    requested_by_key <> approved_by_key
    OR (approved_by_role = 'admin' AND length(trim(coalesce(override_reason, ''))) >= 10)
  )
);

CREATE TABLE IF NOT EXISTS public.sales_contact_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sales_companies(id) ON DELETE CASCADE,
  contact_key text,
  channel text NOT NULL DEFAULT 'all',
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'company', 'contact')),
  reason_code text NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 2 AND 2000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by_key text NOT NULL,
  created_by_email text,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT sales_contact_suppressions_target_check CHECK (
    company_id IS NOT NULL OR length(trim(coalesce(contact_key, ''))) >= 3
  )
);

CREATE INDEX IF NOT EXISTS sales_japan_operator_evidence_lookup_idx
  ON public.sales_japan_operator_evidence(case_id, stage, check_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS sales_japan_operator_authorizations_lookup_idx
  ON public.sales_japan_operator_outbound_authorizations(company_id, channel, status, expires_at);
CREATE INDEX IF NOT EXISTS sales_contact_suppressions_lookup_idx
  ON public.sales_contact_suppressions(company_id, contact_key, channel, status);

ALTER TABLE public.sales_japan_operator_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_role_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_outbound_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_outbound_authorizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contact_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contact_suppressions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.sales_japan_operator_role_assignments,
  public.sales_japan_operator_evidence, public.sales_japan_operator_approvals,
  public.sales_japan_operator_outbound_authorizations, public.sales_contact_suppressions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_role_assignments TO service_role;
GRANT SELECT, INSERT ON public.sales_japan_operator_evidence TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_approvals TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_outbound_authorizations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_contact_suppressions TO service_role;

DROP POLICY IF EXISTS "operator roles service" ON public.sales_japan_operator_role_assignments;
CREATE POLICY "operator roles service" ON public.sales_japan_operator_role_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator evidence read" ON public.sales_japan_operator_evidence;
CREATE POLICY "operator evidence read" ON public.sales_japan_operator_evidence
  FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "operator evidence append" ON public.sales_japan_operator_evidence;
CREATE POLICY "operator evidence append" ON public.sales_japan_operator_evidence
  FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "operator approvals service" ON public.sales_japan_operator_approvals;
CREATE POLICY "operator approvals service" ON public.sales_japan_operator_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator authorizations service" ON public.sales_japan_operator_outbound_authorizations;
CREATE POLICY "operator authorizations service" ON public.sales_japan_operator_outbound_authorizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contact suppressions service" ON public.sales_contact_suppressions;
CREATE POLICY "contact suppressions service" ON public.sales_contact_suppressions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sales_japan_operator_guard_case_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_setting('app.japan_operator_mutation', true) IS DISTINCT FROM 'rpc' THEN
    RAISE EXCEPTION 'Japan operator cases are mutable only through approved RPCs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_japan_operator_cases_write_guard ON public.sales_japan_operator_cases;
CREATE TRIGGER sales_japan_operator_cases_write_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.sales_japan_operator_cases
  FOR EACH ROW EXECUTE FUNCTION public.sales_japan_operator_guard_case_write();

CREATE OR REPLACE FUNCTION public.sales_japan_operator_required_checks(p_stage text)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE p_stage
    WHEN 'evidence_verified' THEN ARRAY['intent_source_current','contact_route_verified','incumbent_partner_checked','product_scope_identified']
    WHEN 'memo_ready' THEN ARRAY['opportunity_thesis','comparator_sources','channel_hypothesis','landed_cost_model','regulatory_screen','ninety_day_plan']
    WHEN 'human_approved' THEN ARRAY['factual_claims_reviewed','financial_assumptions_labeled','legal_disclaimer_present','send_copy_approved']
    WHEN 'permission_sent' THEN ARRAY['delivery_route_verified','suppression_check','sent_logged']
    WHEN 'replied' THEN ARRAY['reply_logged','permission_to_send_memo']
    WHEN 'qualification' THEN ARRAY['annual_revenue_confirmed','gross_margin_confirmed','inventory_capacity_confirmed','monthly_media_budget_confirmed','decision_authority_confirmed','japan_rights_confirmed','regulatory_history_confirmed']
    WHEN 'validation_sow' THEN ARRAY['msa_attached','validation_scope_locked','exclusions_locked','client_dependencies_locked','acceptance_criteria_locked','docuseal_submission_created']
    WHEN 'paid_validation' THEN ARRAY['signed_event_verified','invoice_paid','kickoff_inputs_received']
    WHEN 'launch_sow' THEN ARRAY['validation_decision_go','sku_channel_scope_locked','importer_of_record_allocated','insurance_recall_allocated','inventory_and_media_committed','launch_acceptance_locked']
    WHEN 'operator_contract' THEN ARRAY['launch_sow_signed','net_collected_sales_defined','revenue_share_audit_rights','exclusivity_kpis_locked','cure_and_selloff_locked','operator_contract_signed']
    WHEN 'active_operator' THEN ARRAY['kickoff_complete','weekly_reporting_owner','customer_support_sla','monthly_finance_reconciliation','quarterly_kpi_review']
    ELSE ARRAY[]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.sales_apply_japan_operator_action_v2(
  p_case_id uuid, p_expected_revision integer, p_action text,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text, p_note text,
  p_check_id text DEFAULT NULL, p_checked boolean DEFAULT NULL, p_to_stage text DEFAULT NULL,
  p_status text DEFAULT NULL, p_next_action text DEFAULT NULL,
  p_next_action_due_at timestamptz DEFAULT NULL, p_owner text DEFAULT NULL
)
RETURNS SETOF public.sales_japan_operator_cases
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  current_case public.sales_japan_operator_cases%ROWTYPE;
  updated_case public.sales_japan_operator_cases%ROWTYPE;
  stages constant text[] := ARRAY['prospect_intake','evidence_verified','memo_ready','human_approved','permission_sent','replied','qualification','validation_sow','paid_validation','launch_sow','operator_contract','active_operator'];
  target_stage text;
  required_check text;
BEGIN
  IF p_action NOT IN ('set_check','save_next_action','advance','set_status','reopen') THEN RAISE EXCEPTION 'unsupported Japan operator action'; END IF;
  IF p_actor_role NOT IN ('admin','commercial_lead','researcher','finance','legal','delivery','japan_operator') THEN RAISE EXCEPTION 'operator role cannot mutate cases'; END IF;
  IF length(trim(coalesce(p_actor_key,''))) < 2 OR length(trim(coalesce(p_note,''))) < 2 THEN RAISE EXCEPTION 'principal and action note are required'; END IF;
  SELECT * INTO current_case FROM public.sales_japan_operator_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Japan operator case not found'; END IF;
  IF current_case.revision <> p_expected_revision THEN RAISE EXCEPTION 'Japan operator case revision conflict'; END IF;
  IF current_case.status IN ('won','lost','disqualified') AND p_action <> 'reopen' THEN RAISE EXCEPTION 'terminal Japan operator cases are immutable'; END IF;
  PERFORM set_config('app.japan_operator_mutation', 'rpc', true);

  IF p_action = 'set_check' THEN
    target_stage := stages[array_position(stages, current_case.stage) + 1];
    IF p_check_id IS NULL OR NOT (p_check_id = ANY(public.sales_japan_operator_required_checks(target_stage))) THEN RAISE EXCEPTION 'check is not valid for the next stage'; END IF;
    IF p_checked AND NOT EXISTS (
      SELECT 1 FROM public.sales_japan_operator_evidence e
      WHERE e.case_id = p_case_id AND e.stage = target_stage AND e.check_id = p_check_id
        AND (e.expires_at IS NULL OR e.expires_at > now())
    ) THEN RAISE EXCEPTION 'current evidence is required before completing a gate'; END IF;
    UPDATE public.sales_japan_operator_cases
    SET gate_data = jsonb_set(gate_data, ARRAY[target_stage, p_check_id], to_jsonb(coalesce(p_checked,false)), true), revision = revision + 1, updated_at = now()
    WHERE id = p_case_id RETURNING * INTO updated_case;
  ELSIF p_action = 'save_next_action' THEN
    UPDATE public.sales_japan_operator_cases SET next_action = nullif(trim(p_next_action),''), next_action_due_at = p_next_action_due_at,
      owner = coalesce(nullif(trim(p_owner),''), owner), revision = revision + 1, updated_at = now()
    WHERE id = p_case_id RETURNING * INTO updated_case;
  ELSIF p_action = 'advance' THEN
    IF current_case.status <> 'active' THEN RAISE EXCEPTION 'only active cases can advance'; END IF;
    IF array_position(stages,p_to_stage) <> array_position(stages,current_case.stage) + 1 THEN RAISE EXCEPTION 'stage transition must advance exactly one stage'; END IF;
    FOREACH required_check IN ARRAY public.sales_japan_operator_required_checks(p_to_stage) LOOP
      IF coalesce((current_case.gate_data -> p_to_stage ->> required_check)::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'required gate is incomplete: %', required_check; END IF;
    END LOOP;
    IF p_to_stage = 'human_approved' AND p_actor_role NOT IN ('admin','commercial_lead') THEN RAISE EXCEPTION 'commercial approval role required'; END IF;
    IF p_to_stage = 'paid_validation' AND p_actor_role NOT IN ('admin','finance') THEN RAISE EXCEPTION 'finance role required'; END IF;
    IF p_to_stage = 'operator_contract' AND p_actor_role NOT IN ('admin','commercial_lead','legal') THEN RAISE EXCEPTION 'commercial or legal role required'; END IF;
    UPDATE public.sales_japan_operator_cases SET stage = p_to_stage, stage_entered_at = now(), reviewer = coalesce(p_actor_email,p_actor_key),
      next_action = NULL, next_action_due_at = NULL, revision = revision + 1, updated_at = now()
    WHERE id = p_case_id RETURNING * INTO updated_case;
  ELSIF p_action = 'reopen' THEN
    IF p_actor_role <> 'admin' OR current_case.status NOT IN ('won','lost','disqualified') OR length(trim(p_note)) < 20 THEN RAISE EXCEPTION 'admin and a detailed reason are required to reopen'; END IF;
    UPDATE public.sales_japan_operator_cases SET status = 'on_hold', revision = revision + 1, updated_at = now()
    WHERE id = p_case_id RETURNING * INTO updated_case;
  ELSE
    IF p_status NOT IN ('active','on_hold','won','lost','disqualified') THEN RAISE EXCEPTION 'invalid case status'; END IF;
    IF current_case.status = 'on_hold' AND p_status NOT IN ('active','lost','disqualified') THEN RAISE EXCEPTION 'invalid status transition'; END IF;
    IF current_case.status = 'active' AND p_status NOT IN ('on_hold','won','lost','disqualified') THEN RAISE EXCEPTION 'invalid status transition'; END IF;
    UPDATE public.sales_japan_operator_cases SET status = p_status, revision = revision + 1, updated_at = now()
    WHERE id = p_case_id RETURNING * INTO updated_case;
  END IF;

  INSERT INTO public.sales_japan_operator_events(case_id,action,from_stage,to_stage,actor,actor_key,actor_email,actor_role,auth_source,note,detail)
  VALUES (p_case_id,p_action,current_case.stage,updated_case.stage,coalesce(p_actor_email,p_actor_key),p_actor_key,p_actor_email,p_actor_role,p_auth_source,trim(p_note),
    jsonb_build_object('before_revision',current_case.revision,'after_revision',updated_case.revision,'status',updated_case.status,'check_id',p_check_id,'checked',p_checked));
  RETURN NEXT updated_case;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_create_japan_operator_case_v2(
  p_company_id uuid, p_offer_code text, p_offer_version text, p_offer_snapshot jsonb,
  p_actor_key text, p_actor_email text, p_actor_role text, p_auth_source text,
  p_owner text, p_note text
)
RETURNS SETOF public.sales_japan_operator_cases
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE created_case public.sales_japan_operator_cases%ROWTYPE; next_engagement integer;
BEGIN
  IF p_actor_role NOT IN ('admin','commercial_lead') THEN RAISE EXCEPTION 'commercial lead role required'; END IF;
  IF p_offer_code NOT IN ('standard_operator_v1','country_partner_setup_v1','custom_approved_v1') OR jsonb_typeof(p_offer_snapshot) <> 'object' THEN RAISE EXCEPTION 'valid offer snapshot required'; END IF;
  SELECT coalesce(max(engagement_no),0) + 1 INTO next_engagement FROM public.sales_japan_operator_cases WHERE company_id = p_company_id;
  PERFORM set_config('app.japan_operator_mutation', 'rpc', true);
  INSERT INTO public.sales_japan_operator_cases(company_id,engagement_no,offer_code,offer_version,offer_snapshot,currency,owner)
  VALUES (p_company_id,next_engagement,p_offer_code,p_offer_version,p_offer_snapshot,coalesce(p_offer_snapshot->>'currency','USD'),nullif(trim(p_owner),''))
  RETURNING * INTO created_case;
  INSERT INTO public.sales_japan_operator_events(case_id,action,to_stage,actor,actor_key,actor_email,actor_role,auth_source,note,detail)
  VALUES (created_case.id,'case_created',created_case.stage,coalesce(p_actor_email,p_actor_key),p_actor_key,p_actor_email,p_actor_role,p_auth_source,trim(p_note),
    jsonb_build_object('offer_code',p_offer_code,'offer_version',p_offer_version,'engagement_no',next_engagement));
  RETURN NEXT created_case;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_check_outbound_authorization(
  p_company_id uuid, p_channel text, p_recipient text, p_message_sha256 text
)
RETURNS TABLE(allowed boolean, reason text, authorization_id uuid, case_id uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE operator_case public.sales_japan_operator_cases%ROWTYPE; outbound_auth public.sales_japan_operator_outbound_authorizations%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_contact_suppressions s WHERE s.status='active' AND s.starts_at <= now() AND (s.expires_at IS NULL OR s.expires_at > now())
    AND (s.company_id IS NULL OR s.company_id=p_company_id) AND (s.contact_key IS NULL OR lower(s.contact_key)=lower(p_recipient)) AND (s.channel='all' OR s.channel=p_channel))
  THEN RETURN QUERY SELECT false,'suppressed'::text,NULL::uuid,NULL::uuid; RETURN; END IF;
  SELECT * INTO operator_case FROM public.sales_japan_operator_cases c WHERE c.company_id=p_company_id AND c.status IN ('active','on_hold') ORDER BY c.engagement_no DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT true,'not_operator_case'::text,NULL::uuid,NULL::uuid; RETURN; END IF;
  IF operator_case.status <> 'active' THEN RETURN QUERY SELECT false,'operator_case_on_hold'::text,NULL::uuid,operator_case.id; RETURN; END IF;
  SELECT * INTO outbound_auth FROM public.sales_japan_operator_outbound_authorizations a WHERE a.case_id=operator_case.id AND a.channel=p_channel
    AND lower(a.recipient)=lower(p_recipient) AND a.message_sha256=p_message_sha256 AND a.status='active' AND a.consumed_at IS NULL AND a.expires_at>now()
    ORDER BY a.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'exact_operator_authorization_required'::text,NULL::uuid,operator_case.id; RETURN; END IF;
  RETURN QUERY SELECT true,'authorized'::text,outbound_auth.id,operator_case.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_consume_outbound_authorization(p_authorization_id uuid, p_sales_activity_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  UPDATE public.sales_japan_operator_outbound_authorizations
  SET status='consumed', consumed_at=now(), sales_activity_id=p_sales_activity_id
  WHERE id=p_authorization_id AND status='active' AND consumed_at IS NULL AND expires_at>now();
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_apply_japan_operator_action(uuid,integer,text,text,text,text,text,jsonb,text,timestamptz,text) FROM service_role;
REVOKE ALL ON FUNCTION public.sales_create_japan_operator_case(uuid,text,text,text,text) FROM service_role;
REVOKE ALL ON FUNCTION public.sales_apply_japan_operator_action_v2(uuid,integer,text,text,text,text,text,text,text,boolean,text,text,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sales_create_japan_operator_case_v2(uuid,text,text,jsonb,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sales_check_outbound_authorization(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sales_consume_outbound_authorization(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sales_apply_japan_operator_action_v2(uuid,integer,text,text,text,text,text,text,text,boolean,text,text,text,timestamptz,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_create_japan_operator_case_v2(uuid,text,text,jsonb,text,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_check_outbound_authorization(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_consume_outbound_authorization(uuid,uuid) TO service_role;

COMMENT ON TABLE public.sales_japan_operator_evidence IS 'Append-only evidence ledger for every operator workflow gate.';
COMMENT ON TABLE public.sales_contact_suppressions IS 'Global durable do-not-contact and company/contact/channel suppression ledger.';
NOTIFY pgrst, 'reload schema';
