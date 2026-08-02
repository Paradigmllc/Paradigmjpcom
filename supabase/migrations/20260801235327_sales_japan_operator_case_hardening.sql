-- Harden the Japan operator audit boundary and repair Wave 1 aliases discovered
-- by production read-back. This migration is idempotent and safe to replay.

SELECT set_config('app.japan_operator_mutation', 'rpc', true);

REVOKE ALL ON TABLE public.sales_japan_operator_cases FROM service_role;
REVOKE ALL ON TABLE public.sales_japan_operator_events FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sales_japan_operator_cases TO service_role;
GRANT SELECT, INSERT ON TABLE public.sales_japan_operator_events TO service_role;

DROP POLICY IF EXISTS "sales_japan_operator_cases service role" ON public.sales_japan_operator_cases;
DROP POLICY IF EXISTS "sales_japan_operator_cases read" ON public.sales_japan_operator_cases;
DROP POLICY IF EXISTS "sales_japan_operator_cases create" ON public.sales_japan_operator_cases;
DROP POLICY IF EXISTS "sales_japan_operator_cases update" ON public.sales_japan_operator_cases;

CREATE POLICY "sales_japan_operator_cases read"
  ON public.sales_japan_operator_cases FOR SELECT TO service_role
  USING (true);
CREATE POLICY "sales_japan_operator_cases create"
  ON public.sales_japan_operator_cases FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "sales_japan_operator_cases update"
  ON public.sales_japan_operator_cases FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sales_japan_operator_events service role" ON public.sales_japan_operator_events;
DROP POLICY IF EXISTS "sales_japan_operator_events read" ON public.sales_japan_operator_events;
DROP POLICY IF EXISTS "sales_japan_operator_events append" ON public.sales_japan_operator_events;

CREATE POLICY "sales_japan_operator_events read"
  ON public.sales_japan_operator_events FOR SELECT TO service_role
  USING (true);
CREATE POLICY "sales_japan_operator_events append"
  ON public.sales_japan_operator_events FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON FUNCTION public.sales_apply_japan_operator_action(
  uuid, integer, text, text, text, text, text, jsonb, text, timestamptz, text
) FROM service_role;
GRANT EXECUTE ON FUNCTION public.sales_apply_japan_operator_action(
  uuid, integer, text, text, text, text, text, jsonb, text, timestamptz, text
) TO service_role;
REVOKE ALL ON FUNCTION public.sales_create_japan_operator_case(uuid, text, text, text, text)
  FROM service_role;
GRANT EXECUTE ON FUNCTION public.sales_create_japan_operator_case(uuid, text, text, text, text)
  TO service_role;

-- The fifth Wave 1 company was absent from the production company SSOT. Its
-- official brand site and current Lifestyle Week listing are stored as evidence.
INSERT INTO public.sales_companies (
  domain,
  company_name,
  region,
  pipeline_status,
  source,
  meta
)
VALUES (
  'lovetinycosmos.com',
  'DONGJIN BEDDING Co., Ltd. / Little Archive',
  'global',
  'pending',
  'japan-market-operator-wave1',
  jsonb_build_object(
    'japan_operator_wave1',
    jsonb_build_object(
      'brand', 'Little Archive',
      'legal_name', 'DONGJIN BEDDING Co., Ltd.',
      'brand_site', 'https://en.lovetinycosmos.com/shopinfo/company.html',
      'intent_source', 'https://www.lifestyle-expo.jp/summer/en-gb/search/ls-summer202606/directory.html',
      'evidence_checked_at', '2026-08-02',
      'external_messages_sent', 0
    )
  )
)
ON CONFLICT (domain) DO UPDATE
SET meta = coalesce(public.sales_companies.meta, '{}'::jsonb) || excluded.meta,
    updated_at = now();

WITH wave_one_aliases (canonical_key, priority, aliases, domains) AS (
  VALUES
    ('chefclean', 1, ARRAY['chefclean', 'chefclean co., ltd.']::text[], ARRAY[]::text[]),
    ('holen', 2, ARRAY['holen', 'holen - thai souvenir design']::text[], ARRAY[]::text[]),
    ('little_archive', 3, ARRAY[
      'little archive / dongjin bedding',
      'dongjin bedding co., ltd. / little archive',
      'dongjin bedding co., ltd.'
    ]::text[], ARRAY['lovetinycosmos.com', 'en.lovetinycosmos.com']::text[]),
    ('qurv', 4, ARRAY['qurv / f.r.p. industry', 'home - qurv']::text[], ARRAY[]::text[]),
    ('bfter', 5, ARRAY['b.fter / another day', 'another day / b.fter']::text[], ARRAY[]::text[])
),
wave_one AS (
  SELECT DISTINCT ON (aliases.canonical_key)
    aliases.canonical_key,
    aliases.priority,
    company.id
  FROM wave_one_aliases AS aliases
  JOIN public.sales_companies AS company
    ON lower(trim(company.company_name)) = ANY (aliases.aliases)
    OR lower(trim(company.domain)) = ANY (aliases.domains)
  ORDER BY aliases.canonical_key, company.updated_at DESC, company.id
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
  'Create the Japan Opportunity Memo and route it to human review.',
  now() + make_interval(days => priority),
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

WITH wave_one_aliases (aliases, domains) AS (
  VALUES
    (ARRAY['chefclean', 'chefclean co., ltd.']::text[], ARRAY[]::text[]),
    (ARRAY['holen', 'holen - thai souvenir design']::text[], ARRAY[]::text[]),
    (ARRAY[
      'little archive / dongjin bedding',
      'dongjin bedding co., ltd. / little archive',
      'dongjin bedding co., ltd.'
    ]::text[], ARRAY['lovetinycosmos.com', 'en.lovetinycosmos.com']::text[]),
    (ARRAY['qurv / f.r.p. industry', 'home - qurv']::text[], ARRAY[]::text[]),
    (ARRAY['b.fter / another day', 'another day / b.fter']::text[], ARRAY[]::text[])
),
wave_one AS (
  SELECT DISTINCT company.id
  FROM wave_one_aliases AS aliases
  JOIN public.sales_companies AS company
    ON lower(trim(company.company_name)) = ANY (aliases.aliases)
    OR lower(trim(company.domain)) = ANY (aliases.domains)
)
INSERT INTO public.sales_japan_operator_events (
  case_id,
  action,
  from_stage,
  to_stage,
  actor,
  actor_key,
  actor_email,
  actor_role,
  auth_source,
  note,
  detail,
  idempotency_key
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
JOIN wave_one ON wave_one.id = operator_case.company_id
ON CONFLICT (idempotency_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
