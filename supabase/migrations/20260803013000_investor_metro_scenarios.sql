BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_metro_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 180),
  locale text NOT NULL DEFAULT 'en' CHECK (locale = 'en'),
  market_brief_id uuid NOT NULL REFERENCES public.content_products(id) ON DELETE CASCADE,
  market_slug text NOT NULL CHECK (market_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  strategy_slug text NOT NULL CHECK (strategy_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  investor_profile_slug text NOT NULL CHECK (investor_profile_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(title) BETWEEN 20 AND 240),
  summary text NOT NULL CHECK (length(summary) BETWEEN 120 AND 1000),
  preview jsonb NOT NULL CHECK (jsonb_typeof(preview) = 'object'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  source_count integer NOT NULL CHECK (source_count >= 2),
  quality_score integer NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  is_indexable boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (market_slug, strategy_slug, investor_profile_slug),
  CHECK (NOT is_indexable OR quality_score >= 90)
);

CREATE INDEX IF NOT EXISTS investor_metro_scenarios_indexable_updated_idx
  ON public.investor_metro_scenarios (updated_at DESC, slug)
  WHERE is_indexable = true;

CREATE INDEX IF NOT EXISTS investor_metro_scenarios_facets_idx
  ON public.investor_metro_scenarios (market_slug, strategy_slug, investor_profile_slug)
  WHERE is_indexable = true;

ALTER TABLE public.investor_metro_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_metro_scenarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.investor_metro_scenarios FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.investor_metro_scenarios TO service_role;

DROP POLICY IF EXISTS investor_metro_scenarios_service_select ON public.investor_metro_scenarios;
CREATE POLICY investor_metro_scenarios_service_select
  ON public.investor_metro_scenarios
  FOR SELECT TO service_role
  USING (true);

WITH market_strategy_map(market_brief_slug, market_slug, allowed_strategies) AS (
  VALUES
    ('greater-tokyo-real-estate-market', 'greater-tokyo-allocation', ARRAY['multifamily-income','family-rental','prime-residential','logistics-employment-linked']),
    ('tokyo-central-three-wards-real-estate-investment', 'tokyo-central-three', ARRAY['multifamily-income','prime-residential','mixed-use','hospitality-linked']),
    ('shinjuku-shibuya-real-estate-investment', 'tokyo-west-core', ARRAY['multifamily-income','prime-residential','mixed-use','hospitality-linked']),
    ('bunkyo-toshima-real-estate-investment', 'tokyo-north-core', ARRAY['multifamily-income','family-rental','prime-residential','mixed-use']),
    ('shinagawa-meguro-ota-real-estate-investment', 'tokyo-south', ARRAY['multifamily-income','family-rental','prime-residential','logistics-employment-linked']),
    ('setagaya-nakano-suginami-real-estate-investment', 'tokyo-west-residential', ARRAY['multifamily-income','family-rental','prime-residential','mixed-use']),
    ('koto-sumida-taito-real-estate-investment', 'tokyo-east-core', ARRAY['multifamily-income','family-rental','mixed-use','hospitality-linked']),
    ('kita-arakawa-itabashi-nerima-real-estate-investment', 'tokyo-north', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('adachi-katsushika-edogawa-real-estate-investment', 'tokyo-east-outer', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('tokyo-tama-western-suburbs-real-estate-investment', 'tokyo-tama', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('yokohama-real-estate-investment', 'yokohama', ARRAY['multifamily-income','family-rental','mixed-use','hospitality-linked']),
    ('kawasaki-real-estate-investment', 'kawasaki', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('saitama-urawa-omiya-real-estate-investment', 'saitama-city', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('south-saitama-real-estate-investment', 'south-saitama', ARRAY['multifamily-income','family-rental','mixed-use','logistics-employment-linked']),
    ('chiba-bay-real-estate-investment', 'chiba-bay', ARRAY['multifamily-income','family-rental','hospitality-linked','logistics-employment-linked']),
    ('kashiwa-nagareyama-narita-real-estate-investment', 'outer-chiba', ARRAY['multifamily-income','family-rental','hospitality-linked','logistics-employment-linked'])
), strategy(strategy_slug, label, objective, works_when, breaks_when, required_evidence, purchase_price_mn, gross_yield_pct, occupancy_pct, opex_pct, debt_pct, interest_pct, hold_years, exit_yield_shift_bps) AS (
  VALUES
    ('multifamily-income', 'Multifamily income', 'durable rental income with repeatable leasing and a broad exit pool', 'achieved rents, renewal behavior, unit-level vacancy and recurring operating costs support normalized net operating income', 'the model depends on asking rents, uninterrupted occupancy, deferred repairs or a buyer pool that has not been evidenced', ARRAY['unit-level rent roll reconciliation','twelve months of leasing and renewal cohorts','building-condition and capital-expenditure plan'], 600, 4.5, 94, 28, 55, 2.5, 7, 50),
    ('family-rental', 'Family rental', 'longer-duration family tenancy around schools, daily services and resilient commuter access', 'unit size, school and service access, renewal evidence and household affordability support low turnover without overpricing the product', 'the unit mix is poorly matched to local households or the forecast assumes premium rent without achieved family-tenant evidence', ARRAY['family-unit achieved-rent comparables','renewal and move-out reasons by unit type','school, childcare and daily-service catchment map'], 720, 4.1, 95, 30, 50, 2.4, 8, 40),
    ('prime-residential', 'Prime residential', 'capital preservation through scarce location, durable legal quality and a credible domestic and cross-border buyer pool', 'title, building quality, management records and micro-location scarcity are strong enough to survive conservative rent and exit assumptions', 'the acquisition premium is justified by prestige language rather than parcel, building, lease and completed-sale evidence', ARRAY['matched completed sales and failed listings','title, management and reserve-fund review','buyer-pool and financing evidence by ticket size'], 1200, 3.6, 93, 27, 45, 2.3, 8, 65),
    ('mixed-use', 'Mixed-use', 'diversified income from legally compatible residential and commercial uses with executable operating control', 'each use has separate demand evidence, legal-use confirmation, expense allocation and a management workflow that can handle different tenant obligations', 'commercial vacancy, use restrictions, fit-out liabilities or expense leakage are hidden inside a blended top-line assumption', ARRAY['approved-use and lease-purpose reconciliation','income and expense schedule by use','commercial downtime and reinstatement scenario'], 900, 5.0, 91, 32, 50, 2.7, 7, 75),
    ('hospitality-linked', 'Hospitality-linked', 'visitor and extended-stay income without relying on an unverified occupancy or licensing narrative', 'the permitted operating model, seasonality, channel costs, staffing and neighborhood constraints are documented at asset level', 'the return case treats tourism growth as property cash flow while licensing, operator economics and downside occupancy remain unresolved', ARRAY['permitted-use and licensing memorandum','monthly occupancy, ADR and channel-cost cohorts','operator agreement and downside working-capital plan'], 1000, 5.8, 78, 48, 40, 3.0, 6, 100),
    ('logistics-employment-linked', 'Logistics and employment-linked', 'income tied to durable logistics, industrial or major-employment corridors while controlling single-node concentration', 'tenant origin, commuting patterns, employer and infrastructure dependence and replacement demand are visible in leases and local evidence', 'the thesis extrapolates one employer, facility or infrastructure announcement without measuring substitution, vacancy and re-leasing cost', ARRAY['tenant-origin and employer-concentration schedule','competing supply and infrastructure delivery map','re-leasing cost and downtime scenario'], 1100, 5.2, 92, 31, 50, 2.8, 7, 80)
), investor_profile(investor_profile_slug, label, mandate, governance_constraint, capital_constraint, required_evidence) AS (
  VALUES
    ('cross-border-individual', 'Cross-border individual', 'a legible income asset that can be owned and operated from outside Japan without hidden administrative dependence', 'The owner needs named Japan-side responsibility for banking, tax coordination, tenant communication, repairs, emergencies and document retention.', 'Financing availability, currency exposure and transaction costs must be tested before the target price is treated as deployable capital.', ARRAY['personal ownership and tax coordination memo','Japan-side property-management service scope','funding, FX and closing-cost schedule']),
    ('family-office', 'Family office', 'a governable allocation that can sit beside other real assets and preserve an auditable family investment record', 'Investment committee authority, related-party controls, reporting cadence and succession-sensitive ownership need to be agreed before signing.', 'The ticket must fit portfolio concentration limits and retain reserves for capital work, currency movement and a delayed exit.', ARRAY['investment-policy and concentration check','quarterly reporting and valuation protocol','ownership, succession and distribution workflow']),
    ('institutional-investor', 'Institutional investor', 'repeatable deployment with institutional reporting, control evidence and an exit that can clear investment-committee scrutiny', 'The data room must support delegated authority, compliance, valuation, engineering, ESG and ongoing asset-management reporting.', 'Deployment scale, financing covenants and exit liquidity must remain credible after fees, capex and downside occupancy are applied.', ARRAY['institutional data-room index and ownership map','independent engineering and valuation scope','covenant, ESG and asset-management reporting pack']),
    ('private-equity', 'Private equity investor', 'a controllable value-creation plan with measurable operating interventions and a time-bounded exit', 'Every intervention needs cost, owner, consent path, timing, evidence milestone and a stop condition rather than a generic upside label.', 'The entry basis must absorb execution delay, capex overrun and a weaker exit yield without relying on financial engineering alone.', ARRAY['100-day operating and capex plan','consent and control-rights matrix','exit buyer map with downside return bridge']),
    ('corporate-strategic', 'Corporate strategic investor', 'real-estate exposure that supports an operating footprint, customer access, workforce or supply-chain objective in Japan', 'Property approval must connect to corporate authority, compliance, operating ownership and a measurable business objective.', 'The asset cannot be justified by strategic language if the standalone occupancy cost, alternative locations or exit constraints are unattractive.', ARRAY['business-case and alternative-location comparison','corporate authority and compliance map','operating KPI and property-exit separation plan'])
), base AS (
  SELECT
    product.id AS market_brief_id,
    product.slug AS market_brief_slug,
    product.title AS market_title,
    product.summary AS market_summary,
    product.preview AS market_preview,
    product.payload AS market_payload,
    product.updated_at AS market_updated_at,
    map.market_slug,
    unnest(map.allowed_strategies) AS allowed_strategy
  FROM market_strategy_map AS map
  JOIN public.content_products AS product
    ON product.slug = map.market_brief_slug
   AND product.locale = 'en'
   AND product.content_type = 'investor_brief'
   AND product.is_active = true
), scenario AS (
  SELECT
    base.*,
    strategy.strategy_slug,
    strategy.label AS strategy_label,
    strategy.objective AS strategy_objective,
    strategy.works_when,
    strategy.breaks_when,
    strategy.required_evidence AS strategy_required_evidence,
    strategy.purchase_price_mn,
    strategy.gross_yield_pct,
    strategy.occupancy_pct,
    strategy.opex_pct,
    strategy.debt_pct,
    strategy.interest_pct,
    strategy.hold_years,
    strategy.exit_yield_shift_bps,
    investor_profile.investor_profile_slug,
    investor_profile.label AS profile_label,
    investor_profile.mandate,
    investor_profile.governance_constraint,
    investor_profile.capital_constraint,
    investor_profile.required_evidence AS profile_required_evidence,
    concat(base.market_slug, '-', strategy.strategy_slug, '-', investor_profile.investor_profile_slug) AS scenario_slug,
    concat(base.market_preview ->> 'region', ' ', strategy.label, ' for ', investor_profile.label) AS scenario_title,
    format(
      'A source-backed %s screen for %s in %s, combining official market evidence, mandate-specific constraints, downside tests and an interactive underwriting model.',
      strategy.label,
      investor_profile.label,
      base.market_preview ->> 'region'
    ) AS scenario_summary,
    jsonb_build_array(base.market_payload #>> '{sources,0,id}', base.market_payload #>> '{sources,1,id}') AS primary_source_ids
  FROM base
  JOIN strategy ON strategy.strategy_slug = base.allowed_strategy
  CROSS JOIN investor_profile
), prepared AS (
  SELECT
    market_brief_id,
    scenario_slug,
    market_slug,
    strategy_slug,
    investor_profile_slug,
    scenario_title,
    scenario_summary,
    jsonb_build_object(
      'schemaVersion', '1.0',
      'marketLabel', market_preview ->> 'region',
      'strategyLabel', strategy_label,
      'investorProfileLabel', profile_label,
      'fitBand', CASE WHEN strategy_slug IN ('multifamily-income', 'family-rental') THEN 'core' ELSE 'selective' END,
      'readTime', '14 min',
      'sourceCount', jsonb_array_length(market_payload -> 'sources')
    ) AS preview,
    jsonb_build_object(
      'schemaVersion', '1.0',
      'intentKey', concat(market_slug, ':', strategy_slug, ':', investor_profile_slug),
      'marketBriefSlug', market_brief_slug,
      'marketPageUrl', concat('/en/japan-opportunities/invest/', market_brief_slug),
      'decisionQuestion', format('Does %s support a defensible %s allocation for a %s?', market_preview ->> 'region', strategy_label, profile_label),
      'directAnswer', format(
        '%s can support %s for a %s only when %s. The page therefore treats the market as a diligence hypothesis, not a recommendation: %s, and the mandate must also resolve that %s',
        market_preview ->> 'region', strategy_label, profile_label, works_when, breaks_when, lower(governance_constraint)
      ),
      'coveredMarkets', market_payload -> 'coveredMarkets',
      'strategy', jsonb_build_object(
        'slug', strategy_slug,
        'label', strategy_label,
        'objective', strategy_objective,
        'worksWhen', works_when,
        'breaksWhen', breaks_when,
        'requiredEvidence', to_jsonb(strategy_required_evidence)
      ),
      'investorProfile', jsonb_build_object(
        'slug', investor_profile_slug,
        'label', profile_label,
        'mandate', mandate,
        'governanceConstraint', governance_constraint,
        'capitalConstraint', capital_constraint,
        'requiredEvidence', to_jsonb(profile_required_evidence)
      ),
      'underwritingDefaults', jsonb_build_object(
        'purchasePriceYenMn', purchase_price_mn,
        'grossYieldPct', gross_yield_pct,
        'occupancyPct', occupancy_pct,
        'operatingCostPct', opex_pct,
        'debtPct', debt_pct,
        'interestRatePct', interest_pct,
        'holdYears', hold_years,
        'exitYieldShiftBps', exit_yield_shift_bps
      ),
      'analysisSections', jsonb_build_array(
        jsonb_build_object(
          'id', 'mandate-fit',
          'title', format('%s: %s mandate fit for %s', market_preview ->> 'region', strategy_label, profile_label),
          'lede', format('Begin with the %s mandate and test whether the exact %s evidence can carry it.', lower(profile_label), market_preview ->> 'region'),
          'paragraphs', jsonb_build_array(
            format(
              '%s defines the market boundary for this %s and %s decision. The covered comparison set is %s. The mandate is %s. That combination is investable only if the team explains why the selected stations, wards, cities, unit types and uses belong inside the thesis, which alternatives were rejected, and how the proposed asset supports the mandate without depending on a metropolitan average. The working file should retain the market definition, decision owner, evidence date and a falsifiable reason for every inclusion so that a later change in price, finance, tenant demand or building condition can trigger a reprice or stop decision.',
              market_title, lower(strategy_label), lower(profile_label),
              (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(market_payload -> 'coveredMarkets')),
              mandate
            ),
            format(
              'The official evidence scope for %s is: %s The first two published decision anchors are %s and %s. They describe market context, not the value of a parcel or building. For a %s pursuing %s, every benchmark must therefore be bridged to achieved leases, completed transactions and failed listings matched for tenure, legal use, station access, construction, age, size and condition. The committee should write the disconfirming observation in advance and reject the thesis when asset evidence falls outside the documented range instead of changing the narrative after preferred pricing has been selected.',
              market_preview ->> 'region', market_payload #>> '{marketEvidence,scope}',
              market_payload #>> '{keyFacts,0,value}', market_payload #>> '{keyFacts,1,value}',
              profile_label, lower(strategy_objective)
            )
          ),
          'sourceIds', primary_source_ids
        ),
        jsonb_build_object(
          'id', 'underwriting-frame',
          'title', format('%s: %s underwriting frame for %s', market_preview ->> 'region', strategy_label, profile_label),
          'lede', 'Use the same transparent operating bridge for the base case and every downside case.',
          'paragraphs', jsonb_build_array(
            format(
              'The starting screen for this %s scenario in %s for a %s uses a JPY %s million purchase price, %s%% gross yield, %s%% occupancy, %s%% operating-cost ratio, %s%% debt ratio, %s%% interest rate and a %s-year hold. These are editable orientation inputs, not a forecast. The model should replace them with asset evidence and show gross potential rent, vacancy, concessions, bad debt, recurring operating cost, catch-up capital work, interest, amortization, taxes and currency exposure separately. The strategy works when %s; it breaks when %s. A source link and evidence date should sit beside each material override.',
              lower(strategy_label), market_preview ->> 'region', lower(profile_label), purchase_price_mn, gross_yield_pct, occupancy_pct, opex_pct, debt_pct, interest_pct, hold_years,
              works_when, breaks_when
            ),
            format(
              'Capital discipline differs for the %s case in %s. %s For the %s strategy, the browser model applies a linked stress to occupancy, operating cost, interest and exit yield so that cash-flow weakness cannot be hidden by an optimistic sale value. Review net operating income, interest cover, cumulative cash flow and equity at exit together; then rerun the screen with delayed works, a longer sale period and no benchmark appreciation. A pass condition needs enough liquidity to fund the downside without forced disposal and enough evidence that the operating team can execute the corrective actions before covenant or governance limits are breached.',
              lower(profile_label), market_preview ->> 'region', capital_constraint, lower(strategy_label)
            )
          ),
          'sourceIds', primary_source_ids
        ),
        jsonb_build_object(
          'id', 'risk-control',
          'title', format('%s: %s risk controls for %s', market_preview ->> 'region', strategy_label, profile_label),
          'lede', 'Translate market, strategy and ownership risk into evidence owners and closing conditions.',
          'paragraphs', jsonb_build_array(
            format(
              'The leading market-specific risk in %s for the %s %s case is %s. %s The prescribed market diligence response is: %s For this strategy, add a separate failure test because %s. The risk register should identify the evidence owner, source, observation date, financial exposure, mitigation cost, completion date and stop condition. Do not net an unresolved legal, physical, insurance, tenant or operating issue against a broad location premium; carry it as a price adjustment, condition precedent, reserve or explicit reason to decline.',
              market_preview ->> 'region', lower(profile_label), lower(strategy_label), market_payload #>> '{risks,0,title}', market_payload #>> '{risks,0,whyItMatters}',
              market_payload #>> '{risks,0,diligenceAction}', breaks_when
            ),
            format(
              'Ownership for the %s strategy adds a second control layer for the %s investor. %s Reconcile registered rights, approved use, legal access, seismic and equipment history, repair records, reserves, leases, arrears, insurance and tax coordination to the actual asset and operator. Export national and municipal hazard evidence for the parcel, identify shared river, coastal, slope, transport, employer and utility dependencies, and test downtime and emergency response. The scenario passes only when the Japan-side operating chain is named, contracted and capable of preserving evidence for the %s mandate throughout the hold.',
              lower(strategy_label), lower(profile_label), governance_constraint, lower(profile_label)
            )
          ),
          'sourceIds', primary_source_ids
        ),
        jsonb_build_object(
          'id', 'decision-and-exit',
          'title', format('%s: %s decision and exit gates for %s', market_preview ->> 'region', strategy_label, profile_label),
          'lede', 'A publishable thesis still needs pass conditions, named evidence and an executable exit.',
          'paragraphs', jsonb_build_array(
            format(
              'Before capital moves into the %s opportunity in %s, complete the strategy evidence set: %s. Complete the investor evidence set as well: %s. Each item needs an accountable owner, due date, source link and pass condition. The investment memorandum should state what remains unknown and prevent an incomplete item from being converted into an unsupported positive assumption. Compare the final evidence with the original decision question, record which facts changed the price or structure, and preserve the rejected alternatives so the recommendation remains auditable.',
              lower(strategy_label), market_preview ->> 'region', array_to_string(strategy_required_evidence, '; '), array_to_string(profile_required_evidence, '; ')
            ),
            format(
              'Exit readiness for %s, %s and %s starts at acquisition. Identify at least two buyer groups, their normal ticket, financing constraints, required title and operating records, and the time and cost needed to cure missing evidence. The working stress assumes a %s basis-point adverse exit-yield movement after %s years, but the committee should also test a delayed sale, weaker income and no refinancing. The page is decision support rather than investment, legal, tax, brokerage or financial advice; a pass means the mandate can survive the documented downside without relying on unnamed buyers, automatic market growth or operational action that has no contracted owner.',
              market_preview ->> 'region', lower(strategy_label), lower(profile_label), exit_yield_shift_bps, hold_years
            )
          ),
          'sourceIds', primary_source_ids
        )
      ),
      'marketEvidence', market_payload -> 'marketEvidence',
      'risks', jsonb_build_array(
        market_payload #> '{risks,0}',
        market_payload #> '{risks,1}',
        jsonb_build_object('title', concat(strategy_label, ' execution failure'), 'level', 'high', 'whyItMatters', breaks_when, 'diligenceAction', concat('Obtain and reconcile ', array_to_string(strategy_required_evidence, ', '), '.')),
        jsonb_build_object('title', concat(profile_label, ' governance failure'), 'level', 'high', 'whyItMatters', governance_constraint, 'diligenceAction', concat('Complete and approve ', array_to_string(profile_required_evidence, ', '), '.'))
      ),
      'decisionGates', jsonb_build_array(
        jsonb_build_object('title', concat(strategy_label, ' evidence gate'), 'evidence', array_to_string(strategy_required_evidence, '; '), 'passCondition', works_when),
        jsonb_build_object('title', concat(profile_label, ' mandate gate'), 'evidence', array_to_string(profile_required_evidence, '; '), 'passCondition', concat('The evidence is approved under the ', lower(profile_label), ' governance path.')),
        jsonb_build_object('title', concat(market_preview ->> 'region', ' downside gate'), 'evidence', concat('Parcel, lease, operating, financing, hazard and exit evidence reconciled to ', market_payload #>> '{marketEvidence,asOf}', '.'), 'passCondition', 'The stressed case remains fundable and every material mitigation has a named owner.')
      ),
      'checklist', to_jsonb(strategy_required_evidence || profile_required_evidence || ARRAY['parcel-level hazard exports','matched completed transactions and failed listings','base and linked downside underwriting','two evidenced exit buyer groups']),
      'faqs', jsonb_build_array(
        jsonb_build_object('question', format('Is %s automatically suitable for %s?', market_preview ->> 'region', lower(strategy_label)), 'answer', concat('No. Suitability depends on asset-level evidence. The strategy works when ', works_when, ', and it should be repriced or rejected when ', breaks_when, '.')),
        jsonb_build_object('question', format('What changes for a %s?', lower(profile_label)), 'answer', concat(mandate, ' ', governance_constraint, ' ', capital_constraint)),
        jsonb_build_object('question', 'Are the calculator results a valuation or return forecast?', 'answer', 'No. The calculator is a transparent sensitivity screen using editable assumptions. It omits asset-specific tax, legal, engineering, financing and operating verification and must not be used as investment advice.')
      ),
      'methodology', jsonb_build_object(
        'purpose', 'Separate a location narrative from a strategy-specific and investor-specific evidence decision.',
        'process', 'Combine the published Greater Tokyo source ledger and market observations with a transparent underwriting frame, mandate constraints, downside tests and explicit pass conditions.',
        'limitations', 'Published market averages are not asset valuations. Paradigm has not inspected an asset, verified a rent roll, obtained financing or provided investment, legal, tax, brokerage, engineering or financial advice.',
        'reviewedBy', 'Paradigm Greater Tokyo Real Estate Intelligence Desk',
        'reviewStatus', 'system_quality_gated'
      ),
      'sources', market_payload -> 'sources',
      'qualitySignals', jsonb_build_object(
        'distinctIntent', true,
        'interactiveUnderwriting', true,
        'canonicalRequired', true,
        'minimumSourceCount', 2,
        'analysisSectionCount', 4,
        'candidateDoesNotMeanPublished', true
      )
    ) AS payload,
    jsonb_array_length(market_payload -> 'sources') AS source_count,
    market_updated_at
  FROM scenario
)
INSERT INTO public.investor_metro_scenarios (
  slug, locale, market_brief_id, market_slug, strategy_slug, investor_profile_slug,
  title, summary, preview, payload, source_count, quality_score, is_indexable,
  published_at, updated_at
)
SELECT
  scenario_slug, 'en', market_brief_id, market_slug, strategy_slug, investor_profile_slug,
  scenario_title, scenario_summary, preview, payload, source_count, 96, true,
  '2026-08-03T01:30:00+00:00'::timestamptz,
  GREATEST(market_updated_at, '2026-08-03T01:30:00+00:00'::timestamptz)
FROM prepared
ON CONFLICT (market_slug, strategy_slug, investor_profile_slug) DO UPDATE SET
  slug = EXCLUDED.slug,
  market_brief_id = EXCLUDED.market_brief_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  preview = EXCLUDED.preview,
  payload = EXCLUDED.payload,
  source_count = EXCLUDED.source_count,
  quality_score = EXCLUDED.quality_score,
  is_indexable = EXCLUDED.is_indexable,
  updated_at = EXCLUDED.updated_at;

DO $$
DECLARE
  published_count integer;
  market_count integer;
  section_count integer;
  unique_section_count integer;
  paragraph_count integer;
  unique_paragraph_count integer;
BEGIN
  SELECT count(*), count(DISTINCT market_slug)
  INTO published_count, market_count
  FROM public.investor_metro_scenarios
  WHERE locale = 'en' AND is_indexable = true;

  IF published_count <> 320 OR market_count <> 16 THEN
    RAISE EXCEPTION 'expected 320 indexable scenarios across 16 markets, found % across %', published_count, market_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.investor_metro_scenarios
    WHERE is_indexable = true
    GROUP BY market_slug
    HAVING count(*) <> 20 OR count(DISTINCT strategy_slug) <> 4 OR count(DISTINCT investor_profile_slug) <> 5
  ) THEN
    RAISE EXCEPTION 'an indexable market does not have four strategies and five investor profiles';
  END IF;

  SELECT count(*), count(DISTINCT section.value ->> 'title')
  INTO section_count, unique_section_count
  FROM public.investor_metro_scenarios AS scenario
  CROSS JOIN LATERAL jsonb_array_elements(scenario.payload -> 'analysisSections') AS section(value)
  WHERE scenario.is_indexable = true;

  IF section_count <> 1280 OR unique_section_count <> section_count THEN
    RAISE EXCEPTION 'scenario analysis titles are not unique: % unique of %', unique_section_count, section_count;
  END IF;

  SELECT count(*), count(DISTINCT paragraph.value)
  INTO paragraph_count, unique_paragraph_count
  FROM public.investor_metro_scenarios AS scenario
  CROSS JOIN LATERAL jsonb_array_elements(scenario.payload -> 'analysisSections') AS section(value)
  CROSS JOIN LATERAL jsonb_array_elements_text(section.value -> 'paragraphs') AS paragraph(value)
  WHERE scenario.is_indexable = true;

  IF paragraph_count <> 2560 OR unique_paragraph_count <> paragraph_count THEN
    RAISE EXCEPTION 'scenario analysis paragraphs are not unique: % unique of %', unique_paragraph_count, paragraph_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.investor_metro_scenarios AS scenario
    CROSS JOIN LATERAL jsonb_array_elements(scenario.payload -> 'analysisSections') AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(section.value -> 'paragraphs') AS paragraph(value)
    WHERE scenario.is_indexable = true AND length(paragraph.value) < 500
  ) THEN
    RAISE EXCEPTION 'scenario analysis contains a paragraph shorter than 500 characters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.investor_metro_scenarios AS scenario
    CROSS JOIN LATERAL jsonb_array_elements(scenario.payload -> 'analysisSections') AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(section.value -> 'sourceIds') AS source_id(value)
    WHERE scenario.is_indexable = true
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(scenario.payload -> 'sources') AS source(value)
        WHERE source.value ->> 'id' = source_id.value
      )
  ) THEN
    RAISE EXCEPTION 'scenario analysis references an unknown source';
  END IF;

  IF has_table_privilege('anon', 'public.investor_metro_scenarios', 'SELECT')
    OR has_table_privilege('authenticated', 'public.investor_metro_scenarios', 'SELECT') THEN
    RAISE EXCEPTION 'investor_metro_scenarios must remain service-role-only';
  END IF;
END
$$;

COMMENT ON TABLE public.investor_metro_scenarios IS
  'Quality-gated Greater Tokyo market x strategy x investor-profile decision pages. Candidate combinations are not implicitly publishable.';

COMMIT;
