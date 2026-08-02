-- Phase 2: finance close, fulfilment/support, incidents, KPI and durable outbox.

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_finance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  settlement_currency text NOT NULL,
  fx_rate numeric(18,8) NOT NULL DEFAULT 1 CHECK (fx_rate > 0),
  gross_minor bigint NOT NULL DEFAULT 0,
  refund_minor bigint NOT NULL DEFAULT 0,
  tax_minor bigint NOT NULL DEFAULT 0,
  channel_fee_minor bigint NOT NULL DEFAULT 0,
  payment_fee_minor bigint NOT NULL DEFAULT 0,
  fulfillment_minor bigint NOT NULL DEFAULT 0,
  freight_duty_minor bigint NOT NULL DEFAULT 0,
  marketing_minor bigint NOT NULL DEFAULT 0,
  other_deduction_minor bigint NOT NULL DEFAULT 0,
  net_revenue_minor bigint NOT NULL DEFAULT 0,
  revenue_share_minor bigint NOT NULL DEFAULT 0,
  retainer_minor bigint NOT NULL DEFAULT 0,
  payable_minor bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','review','approved','invoiced','paid','locked')),
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  approved_by_key text,
  approved_at timestamptz,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, period_start, period_end, settlement_currency),
  CONSTRAINT operator_finance_period_check CHECK (period_end >= period_start),
  CONSTRAINT operator_finance_approval_check CHECK (
    status NOT IN ('approved','invoiced','paid','locked')
    OR (evidence_id IS NOT NULL AND approved_by_key IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_finance_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.sales_japan_operator_finance_periods(id) ON DELETE CASCADE,
  external_order_id text,
  channel text NOT NULL,
  transaction_at timestamptz NOT NULL,
  source_currency text NOT NULL,
  gross_minor bigint NOT NULL DEFAULT 0,
  refund_minor bigint NOT NULL DEFAULT 0,
  tax_minor bigint NOT NULL DEFAULT 0,
  channel_fee_minor bigint NOT NULL DEFAULT 0,
  payment_fee_minor bigint NOT NULL DEFAULT 0,
  fulfillment_minor bigint NOT NULL DEFAULT 0,
  freight_duty_minor bigint NOT NULL DEFAULT 0,
  marketing_minor bigint NOT NULL DEFAULT 0,
  other_deduction_minor bigint NOT NULL DEFAULT 0,
  net_revenue_minor bigint NOT NULL DEFAULT 0,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  actor_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_operational_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'order','inventory','return','refund','fulfillment','customer_support',
    'marketing','change_request','data_export','credential_handoff'
  )),
  external_ref text,
  sku_id uuid REFERENCES public.sales_japan_operator_skus(id) ON DELETE SET NULL,
  status text NOT NULL,
  quantity numeric(18,4),
  amount_minor bigint,
  currency text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  owner text,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  incident_type text NOT NULL CHECK (incident_type IN ('quality','safety','recall','regulatory','privacy','fraud','delivery','service','other')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  sku_id uuid REFERENCES public.sales_japan_operator_skus(id) ON DELETE SET NULL,
  lot_code text,
  external_order_id text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','contained','investigating','resolved','closed')),
  title text NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  operations_paused boolean NOT NULL DEFAULT false,
  owner text NOT NULL,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  resolution text,
  resolved_at timestamptz,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_kpi_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  targets jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(targets) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','accepted','cure_period','failed','superseded')),
  exclusivity_decision text CHECK (exclusivity_decision IN ('continue','modify','terminate','not_applicable')),
  cure_due_at timestamptz,
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  approved_by_key text,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, period_start, period_end),
  CONSTRAINT operator_kpi_period_check CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_offboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','review','completed','cancelled')),
  reason text NOT NULL,
  effective_at timestamptz,
  checklist jsonb NOT NULL DEFAULT jsonb_build_object(
    'finance_reconciled',false,'inventory_dispositioned',false,'data_exported',false,
    'credentials_revoked',false,'support_handoff_complete',false,'brand_assets_returned',false
  ) CHECK (jsonb_typeof(checklist) = 'object'),
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  approved_by_key text,
  completed_at timestamptz,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_offboarding_complete_check CHECK (
    status <> 'completed' OR (evidence_id IS NOT NULL AND approved_by_key IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  dedup_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  destination text NOT NULL CHECK (destination IN ('db_bell','slack','email','workflow','source_ingest')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','retry','sent','dead_letter','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_japan_operator_finance_periods_case_idx ON public.sales_japan_operator_finance_periods(case_id, period_start DESC);
CREATE INDEX IF NOT EXISTS sales_japan_operator_finance_lines_period_idx ON public.sales_japan_operator_finance_lines(period_id, transaction_at);
CREATE INDEX IF NOT EXISTS sales_japan_operator_operations_case_idx ON public.sales_japan_operator_operational_records(case_id, record_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS sales_japan_operator_incidents_open_idx ON public.sales_japan_operator_incidents(case_id, status, severity);
CREATE INDEX IF NOT EXISTS sales_japan_operator_kpi_case_idx ON public.sales_japan_operator_kpi_periods(case_id, period_start DESC);
CREATE INDEX IF NOT EXISTS sales_japan_operator_outbox_due_idx ON public.sales_japan_operator_outbox(status, next_attempt_at);

ALTER TABLE public.sales_japan_operator_finance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_finance_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_finance_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_finance_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_operational_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_operational_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_incidents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_kpi_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_kpi_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_offboarding FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_outbox FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.sales_japan_operator_finance_periods, public.sales_japan_operator_finance_lines,
  public.sales_japan_operator_operational_records, public.sales_japan_operator_incidents,
  public.sales_japan_operator_kpi_periods, public.sales_japan_operator_offboarding,
  public.sales_japan_operator_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_finance_periods TO service_role;
GRANT SELECT,INSERT ON public.sales_japan_operator_finance_lines TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_operational_records TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_incidents TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_kpi_periods TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_offboarding TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.sales_japan_operator_outbox TO service_role;

DROP POLICY IF EXISTS "operator finance periods service" ON public.sales_japan_operator_finance_periods;
CREATE POLICY "operator finance periods service" ON public.sales_japan_operator_finance_periods FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator finance lines read" ON public.sales_japan_operator_finance_lines;
CREATE POLICY "operator finance lines read" ON public.sales_japan_operator_finance_lines FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "operator finance lines append" ON public.sales_japan_operator_finance_lines;
CREATE POLICY "operator finance lines append" ON public.sales_japan_operator_finance_lines FOR INSERT TO service_role WITH CHECK (true);
DROP POLICY IF EXISTS "operator records service" ON public.sales_japan_operator_operational_records;
CREATE POLICY "operator records service" ON public.sales_japan_operator_operational_records FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator incidents service" ON public.sales_japan_operator_incidents;
CREATE POLICY "operator incidents service" ON public.sales_japan_operator_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator kpi service" ON public.sales_japan_operator_kpi_periods;
CREATE POLICY "operator kpi service" ON public.sales_japan_operator_kpi_periods FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator offboarding service" ON public.sales_japan_operator_offboarding;
CREATE POLICY "operator offboarding service" ON public.sales_japan_operator_offboarding FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator outbox service" ON public.sales_japan_operator_outbox;
CREATE POLICY "operator outbox service" ON public.sales_japan_operator_outbox FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sales_record_japan_operator_incident_v1(
  p_case_id uuid, p_incident_type text, p_severity text, p_title text,
  p_description text, p_occurred_at timestamptz, p_owner text, p_evidence_id uuid,
  p_actor_key text, p_actor_email text, p_actor_role text
)
RETURNS SETOF public.sales_japan_operator_incidents
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE incident public.sales_japan_operator_incidents%ROWTYPE; current_case public.sales_japan_operator_cases%ROWTYPE;
BEGIN
  IF p_actor_role NOT IN ('admin','delivery','japan_operator') THEN RAISE EXCEPTION 'delivery role required'; END IF;
  INSERT INTO public.sales_japan_operator_incidents(case_id,incident_type,severity,title,description,occurred_at,operations_paused,owner,evidence_id,actor_key,actor_email,actor_role)
  VALUES (p_case_id,p_incident_type,p_severity,p_title,p_description,p_occurred_at,p_severity IN ('high','critical'),p_owner,p_evidence_id,p_actor_key,p_actor_email,p_actor_role)
  RETURNING * INTO incident;
  SELECT * INTO current_case FROM public.sales_japan_operator_cases WHERE id=p_case_id FOR UPDATE;
  IF p_severity IN ('high','critical') AND current_case.status='active' THEN
    PERFORM set_config('app.japan_operator_mutation','rpc',true);
    UPDATE public.sales_japan_operator_cases SET status='on_hold',blocker_codes=array_append(blocker_codes,'incident:'||incident.id::text),revision=revision+1,updated_at=now() WHERE id=p_case_id;
  END IF;
  INSERT INTO public.sales_japan_operator_events(case_id,action,from_stage,to_stage,actor,actor_key,actor_email,actor_role,auth_source,note,detail)
  VALUES (p_case_id,'record_created',current_case.stage,current_case.stage,coalesce(p_actor_email,p_actor_key),p_actor_key,p_actor_email,p_actor_role,'server',
    'Operational incident recorded.',jsonb_build_object('incident_id',incident.id,'severity',p_severity,'operations_paused',incident.operations_paused));
  INSERT INTO public.sales_japan_operator_outbox(case_id,dedup_key,event_type,destination,payload)
  VALUES (p_case_id,'incident:'||incident.id::text||':slack','operator_incident','slack',jsonb_build_object('incident_id',incident.id,'severity',p_severity,'title',p_title)),
    (p_case_id,'incident:'||incident.id::text||':bell','operator_incident','db_bell',jsonb_build_object('incident_id',incident.id,'severity',p_severity,'title',p_title));
  RETURN NEXT incident;
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_claim_japan_operator_outbox_v1(p_worker text, p_limit integer DEFAULT 25)
RETURNS SETOF public.sales_japan_operator_outbox
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.sales_japan_operator_outbox
    WHERE status IN ('queued','retry') AND next_attempt_at <= now()
    ORDER BY next_attempt_at, created_at FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,100))
  )
  UPDATE public.sales_japan_operator_outbox o
  SET status='processing',attempts=attempts+1,locked_at=now(),locked_by=p_worker,updated_at=now()
  FROM due WHERE o.id=due.id RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_record_japan_operator_incident_v1(uuid,text,text,text,text,timestamptz,text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sales_claim_japan_operator_outbox_v1(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sales_record_japan_operator_incident_v1(uuid,text,text,text,text,timestamptz,text,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sales_claim_japan_operator_outbox_v1(text,integer) TO service_role;

COMMENT ON TABLE public.sales_japan_operator_outbox IS 'Idempotent retryable delivery ledger for SLA, notification and source jobs.';
COMMENT ON TABLE public.sales_japan_operator_finance_periods IS 'Monthly auditable operator settlement close including deductions and revenue share.';
NOTIFY pgrst, 'reload schema';
