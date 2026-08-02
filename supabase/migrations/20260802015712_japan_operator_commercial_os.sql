-- Phase 1: recurring sourcing, contract/payment read-back, SKU and deliverables.

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_config_id uuid NOT NULL REFERENCES public.sales_lead_source_configs(id) ON DELETE CASCADE,
  offer_code text NOT NULL DEFAULT 'standard_operator_v1',
  active boolean NOT NULL DEFAULT true,
  cadence_hours integer NOT NULL DEFAULT 168 CHECK (cadence_hours BETWEEN 1 AND 8760),
  next_checked_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(last_result) = 'object'),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  created_by_key text NOT NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_config_id, offer_code)
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_contract_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  contract_kind text NOT NULL CHECK (contract_kind IN ('validation_sow','launch_sow','operator_agreement')),
  sales_contract_id uuid NOT NULL REFERENCES public.sales_contracts(id) ON DELETE RESTRICT,
  docuseal_submission_id text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','signed','declined','expired','voided')),
  signed_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, contract_kind, sales_contract_id)
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  invoice_kind text NOT NULL CHECK (invoice_kind IN ('validation','launch','retainer','revenue_share','expense','adjustment')),
  provider text NOT NULL DEFAULT 'stripe',
  external_invoice_id text,
  external_payment_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','paid','void','uncollectible','refunded','partially_refunded')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  validation_credit_source_id uuid REFERENCES public.sales_japan_operator_invoices(id) ON DELETE RESTRICT,
  validation_credit_minor bigint NOT NULL DEFAULT 0 CHECK (validation_credit_minor >= 0),
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_invoice_id),
  CONSTRAINT operator_invoice_paid_evidence_check CHECK (
    status <> 'paid' OR (paid_at IS NOT NULL AND evidence_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  hs_code text,
  importer_of_record text,
  seller_of_record text,
  labeling_status text NOT NULL DEFAULT 'pending' CHECK (labeling_status IN ('pending','blocked','ready','not_applicable')),
  compliance_status text NOT NULL DEFAULT 'pending' CHECK (compliance_status IN ('pending','blocked','ready','not_applicable')),
  customs_status text NOT NULL DEFAULT 'pending' CHECK (customs_status IN ('pending','blocked','ready','not_applicable')),
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  blocker_codes text[] NOT NULL DEFAULT '{}',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, sku)
);

CREATE TABLE IF NOT EXISTS public.sales_japan_operator_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.sales_japan_operator_cases(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('validation','launch','operations','offboarding')),
  deliverable_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  owner text NOT NULL,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','submitted','accepted','rejected','cancelled')),
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(acceptance_criteria) = 'array'),
  accepted_at timestamptz,
  accepted_by_key text,
  change_request_of_id uuid REFERENCES public.sales_japan_operator_deliverables(id) ON DELETE RESTRICT,
  revision integer NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 10000),
  evidence_id uuid REFERENCES public.sales_japan_operator_evidence(id) ON DELETE RESTRICT,
  actor_key text NOT NULL,
  actor_email text,
  actor_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_deliverable_acceptance_check CHECK (
    status <> 'accepted' OR (accepted_at IS NOT NULL AND accepted_by_key IS NOT NULL AND evidence_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS sales_japan_operator_source_links_due_idx
  ON public.sales_japan_operator_source_links(active, next_checked_at);
CREATE INDEX IF NOT EXISTS sales_japan_operator_contract_links_case_idx
  ON public.sales_japan_operator_contract_links(case_id, contract_kind, status);
CREATE INDEX IF NOT EXISTS sales_japan_operator_invoices_case_idx
  ON public.sales_japan_operator_invoices(case_id, invoice_kind, status);
CREATE INDEX IF NOT EXISTS sales_japan_operator_skus_case_idx
  ON public.sales_japan_operator_skus(case_id, compliance_status, customs_status);
CREATE INDEX IF NOT EXISTS sales_japan_operator_deliverables_due_idx
  ON public.sales_japan_operator_deliverables(case_id, status, due_at);

ALTER TABLE public.sales_japan_operator_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_source_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_contract_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_contract_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_skus FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_japan_operator_deliverables FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.sales_japan_operator_source_links, public.sales_japan_operator_contract_links,
  public.sales_japan_operator_invoices, public.sales_japan_operator_skus,
  public.sales_japan_operator_deliverables FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_source_links TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_contract_links TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_skus TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.sales_japan_operator_deliverables TO service_role;

DROP POLICY IF EXISTS "operator source links service" ON public.sales_japan_operator_source_links;
CREATE POLICY "operator source links service" ON public.sales_japan_operator_source_links FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator contract links service" ON public.sales_japan_operator_contract_links;
CREATE POLICY "operator contract links service" ON public.sales_japan_operator_contract_links FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator invoices service" ON public.sales_japan_operator_invoices;
CREATE POLICY "operator invoices service" ON public.sales_japan_operator_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator skus service" ON public.sales_japan_operator_skus;
CREATE POLICY "operator skus service" ON public.sales_japan_operator_skus FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "operator deliverables service" ON public.sales_japan_operator_deliverables;
CREATE POLICY "operator deliverables service" ON public.sales_japan_operator_deliverables FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sales_link_japan_operator_contract_v1(
  p_case_id uuid, p_contract_kind text, p_sales_contract_id uuid,
  p_docuseal_submission_id text, p_status text, p_signed_at timestamptz,
  p_actor_key text, p_actor_email text, p_actor_role text, p_detail jsonb
)
RETURNS SETOF public.sales_japan_operator_contract_links
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE linked public.sales_japan_operator_contract_links%ROWTYPE; current_case public.sales_japan_operator_cases%ROWTYPE;
BEGIN
  IF p_contract_kind NOT IN ('validation_sow','launch_sow','operator_agreement') THEN RAISE EXCEPTION 'invalid operator contract kind'; END IF;
  IF p_actor_role NOT IN ('admin','commercial_lead','legal','automation') THEN RAISE EXCEPTION 'contract role required'; END IF;
  INSERT INTO public.sales_japan_operator_contract_links(case_id,contract_kind,sales_contract_id,docuseal_submission_id,status,signed_at,actor_key,actor_email,actor_role,detail)
  VALUES (p_case_id,p_contract_kind,p_sales_contract_id,p_docuseal_submission_id,p_status,p_signed_at,p_actor_key,p_actor_email,p_actor_role,coalesce(p_detail,'{}'::jsonb))
  ON CONFLICT (case_id,contract_kind,sales_contract_id) DO UPDATE SET docuseal_submission_id=excluded.docuseal_submission_id,
    status=excluded.status,signed_at=excluded.signed_at,synced_at=now(),actor_key=excluded.actor_key,actor_email=excluded.actor_email,
    actor_role=excluded.actor_role,detail=excluded.detail,updated_at=now() RETURNING * INTO linked;
  SELECT * INTO current_case FROM public.sales_japan_operator_cases WHERE id=p_case_id FOR UPDATE;
  PERFORM set_config('app.japan_operator_mutation','rpc',true);
  UPDATE public.sales_japan_operator_cases SET
    validation_contract_id=CASE WHEN p_contract_kind='validation_sow' THEN p_sales_contract_id ELSE validation_contract_id END,
    launch_contract_id=CASE WHEN p_contract_kind='launch_sow' THEN p_sales_contract_id ELSE launch_contract_id END,
    operator_contract_id=CASE WHEN p_contract_kind='operator_agreement' THEN p_sales_contract_id ELSE operator_contract_id END,
    revision=revision+1,updated_at=now() WHERE id=p_case_id;
  INSERT INTO public.sales_japan_operator_events(case_id,action,from_stage,to_stage,actor,actor_key,actor_email,actor_role,auth_source,note,detail)
  VALUES (p_case_id,'record_updated',current_case.stage,current_case.stage,coalesce(p_actor_email,p_actor_key),p_actor_key,p_actor_email,p_actor_role,'server',
    'Contract state synchronized from the signing system.',jsonb_build_object('contract_kind',p_contract_kind,'contract_id',p_sales_contract_id,'status',p_status));
  RETURN NEXT linked;
END;
$$;

REVOKE ALL ON FUNCTION public.sales_link_japan_operator_contract_v1(uuid,text,uuid,text,text,timestamptz,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sales_link_japan_operator_contract_v1(uuid,text,uuid,text,text,timestamptz,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE public.sales_japan_operator_source_links IS 'Recurring approved sources feeding Japan operator candidate discovery.';
COMMENT ON TABLE public.sales_japan_operator_invoices IS 'Invoice, payment and validation-credit read-back for operator engagements.';
NOTIFY pgrst, 'reload schema';
