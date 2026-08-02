BEGIN;

WITH target_briefs AS (
  SELECT
    id,
    slug,
    title,
    preview,
    payload,
    COALESCE(NULLIF(preview ->> 'region', ''), title) AS region,
    COALESCE(NULLIF(preview ->> 'category', ''), 'Greater Tokyo real estate') AS category,
    COALESCE(NULLIF(preview ->> 'assetClass', ''), 'real estate') AS asset_class,
    COALESCE(NULLIF(preview ->> 'decisionStage', ''), 'investment screening') AS decision_stage,
    COALESCE(NULLIF(payload ->> 'decisionQuestion', ''), title) AS decision_question,
    COALESCE(NULLIF(payload ->> 'answer', ''), title) AS answer,
    COALESCE(NULLIF(payload #>> '{marketEvidence,scope}', ''), 'Greater Tokyo official benchmark comparison') AS evidence_scope,
    COALESCE(NULLIF(payload #>> '{keyFacts,0,value}', ''), 'the published residential land benchmark') AS price_fact,
    COALESCE(NULLIF(payload #>> '{keyFacts,1,value}', ''), 'the published annual benchmark change') AS growth_fact,
    COALESCE(NULLIF(payload #>> '{risks,0,title}', ''), 'Location-specific execution risk') AS primary_risk,
    COALESCE(NULLIF(payload #>> '{risks,0,whyItMatters}', ''), 'The location thesis must be reconciled to asset-level evidence.') AS risk_case,
    COALESCE(NULLIF(payload #>> '{risks,0,diligenceAction}', ''), 'Reconcile the thesis to parcel, building, tenant, financing and exit evidence.') AS risk_action,
    COALESCE(markets.covered_markets, title) AS covered_markets,
    COALESCE(evidence.evidence_rollup, 'No market benchmark points were available.') AS evidence_rollup
  FROM public.content_products AS product
  LEFT JOIN LATERAL (
    SELECT string_agg(market.value, ', ' ORDER BY market.ordinality) AS covered_markets
    FROM jsonb_array_elements_text(product.payload -> 'coveredMarkets') WITH ORDINALITY AS market(value, ordinality)
  ) AS markets ON true
  LEFT JOIN LATERAL (
    SELECT string_agg(
      format(
        '%s: JPY %s per square metre with a %s%% annual benchmark change',
        point.value ->> 'market',
        to_char((point.value ->> 'averagePriceYenPerSqm')::numeric, 'FM999,999,999'),
        point.value ->> 'annualChangePct'
      ),
      '; ' ORDER BY point.ordinality
    ) AS evidence_rollup
    FROM jsonb_array_elements(product.payload #> '{marketEvidence,points}') WITH ORDINALITY AS point(value, ordinality)
  ) AS evidence ON true
  WHERE product.locale = 'en'
    AND product.content_type = 'investor_brief'
    AND product.is_active = true
    AND product.payload ? 'marketEvidence'
), rebuilt AS (
  SELECT
    id,
    jsonb_build_array(
      jsonb_build_object(
        'title', region || ': investment boundary and basis',
        'lede', format(
          'The %s decision begins by defining the exact %s boundary that can support the proposed %s strategy.',
          region, decision_stage, asset_class
        ),
        'paragraphs', jsonb_build_array(
          concat(
            payload #>> '{chapters,0,paragraphs,0}',
            ' For this ', region, ' screen, the named comparison set is ', covered_markets,
            '. The underwriting file should record why each station catchment, ward or city belongs in the investable boundary, which tenant and exit-buyer assumption it tests, and why superficially nearby alternatives are excluded. That decision log keeps the location thesis auditable when market conditions, financing terms or the proposed building change.'
          ),
          concat(
            evidence_scope, ' The current comparison reads ', evidence_rollup,
            '. These official observations establish dispersion inside ', region,
            '; they do not value a parcel, building, lease stream or development right. The acquisition team should reproduce the source date and definition, then bridge each observation to completed asset comparables matched for tenure, use, walking distance, structure, age, size, condition and transaction timing. Every adjustment should remain visible beside the unadjusted evidence range.'
          ),
          concat(
            'The committee question for ', title, ' is: ', decision_question,
            ' The current screening answer is: ', answer,
            ' Treat that answer as a falsifiable hypothesis. Assign an owner, evidence source and expiry date to each component, and stop or reprice when the parcel, rent roll, planning position or executable buyer pool contradicts it. This creates a region-specific decision record rather than a narrative assembled after the preferred asset has already been selected.'
          )
        ),
        'sourceIds', payload #> '{chapters,0,sourceIds}'
      ),
      jsonb_build_object(
        'title', region || ': demand and exit-liquidity evidence',
        'lede', format(
          'Demand in %s is decision-grade only when the proposed %s can be tied to achieved leases, completed trades and identifiable future buyers.',
          region, asset_class
        ),
        'paragraphs', jsonb_build_array(
          concat(
            payload #>> '{chapters,1,paragraphs,0}',
            ' Test that demand separately across ', covered_markets,
            ', using the same unit type, use, walking-distance band and lease structure proposed for the acquisition. Record achieved rent, incentives, vacancy days, renewals, arrears, tenant origin and failed listings. A regional population, visitor or employment story is supporting context only; it cannot replace evidence that the exact product clears at the modeled rent and remains relevant through the intended hold period.'
          ),
          concat(
            'For ', region, ', the official screening points are ', evidence_rollup,
            '. Pair this dispersion with the Greater Tokyo resale reference, then segment completed transactions by micro-location and product before drawing a liquidity conclusion. The buyer map should distinguish owner-occupiers, domestic income investors, institutions and overseas purchasers, state which group can finance the proposed ticket, and retain marketing periods and withdrawn listings so that unsuccessful price discovery is not omitted from the exit case.'
          ),
          concat(
            title, ' is classified as ', category, ' and the proposed asset class is ', asset_class,
            '. Demand evidence should therefore follow the actual operating model rather than a generic metropolitan average. Build a monthly cohort view for inquiries, applications, signed leases, renewals and move-outs; connect material changes to supply delivery, railway or employer dependence and affordability. The base case should fail when required occupancy or rent growth exceeds what the documented cohort and substitute properties can support.'
          )
        ),
        'sourceIds', payload #> '{chapters,1,sourceIds}'
      ),
      jsonb_build_object(
        'title', region || ': supply, condition and operating controls',
        'lede', format(
          'The %s thesis survives only if supply, physical condition and the local operating chain are reconciled to normalized income.',
          region
        ),
        'paragraphs', jsonb_build_array(
          concat(
            payload #>> '{chapters,2,paragraphs,0}',
            ' For ', title,
            ', map planned completions, conversions, redevelopment and competing older stock across ', covered_markets,
            '. Use the same catchment and product definition used in the demand case, and separate temporary construction effects from permanent additions to supply. The comparison should show unit mix, asking and achieved rent, concessions, occupancy, delivery date and operator, allowing the committee to see whether the proposed asset competes through price, quality, access or a genuinely scarce legal use.'
          ),
          concat(
            'The primary location-specific control is ', primary_risk, '. ', risk_case,
            ' The prescribed diligence response is: ', risk_action,
            ' Translate that response into named evidence owners and closing conditions. Registry rights, approved use, legal access, seismic standard, equipment age, repair history, reserve adequacy and insurance terms should reconcile to the seller statement and physical inspection; unresolved differences remain explicit deductions from price or conditions to advance.'
          ),
          concat(
            'Operating control for ', region, ' must be executable after closing, not merely described in a model. Document who collects rent, approves work, holds keys, handles emergencies, retains invoices, communicates with tenants and reports to the overseas owner. Price recurring management separately from catch-up capital expenditure and stress vacancy during planned works. The service agreement should include response times, approval thresholds, contractor controls, monthly fields and handover obligations suitable for this ', asset_class, ' strategy.'
          )
        ),
        'sourceIds', payload #> '{chapters,2,sourceIds}'
      ),
      jsonb_build_object(
        'title', region || ': downside, hazard and exit tests',
        'lede', format(
          'The downside case for %s must connect parcel hazards, income interruption, financing and the executable exit pool instead of treating them as independent risks.',
          region
        ),
        'paragraphs', jsonb_build_array(
          concat(
            payload #>> '{chapters,3,paragraphs,0}',
            ' The risk register for ', covered_markets,
            ' should identify shared river systems, coastal or reclaimed-land exposure, slopes, railway dependencies, major employers and tenant segments so portfolio concentration is visible. Retain national and municipal hazard exports with the source agency and update date, then reconcile the maps to elevation, critical equipment, evacuation, engineering and insurance evidence for the exact parcel rather than assigning a ward-wide risk label.'
          ),
          concat(
            'The ', region, ' screening anchors are ', price_fact, ' and ', growth_fact,
            ', with the underlying point set reading ', evidence_rollup,
            '. Do not carry either benchmark forward as an automatic appreciation rate. Run linked downside cases for lower achieved rent, vacancy, delayed works, capital overruns, insurance limits, higher debt cost, failed refinance, currency movement and a longer sale at a weaker price. Show cash consumption, covenant headroom and the point at which the committee must reprice, recapitalize or decline.'
          ),
          concat(
            'Exit readiness for ', title,
            ' starts during acquisition. Identify at least two evidenced buyer groups, their normal ticket, financing constraints and required title, lease, engineering, tax and operating records. Model the time and cost to cure missing documents and keep the data room current throughout ownership. The final decision should demonstrate that ', primary_risk,
            ' can be absorbed without relying on uninterrupted benchmark growth, an unnamed future buyer or operational action that the owner and Japan-side manager have not already agreed to perform.'
          )
        ),
        'sourceIds', payload #> '{chapters,3,sourceIds}'
      )
    ) AS chapters
  FROM target_briefs
)
UPDATE public.content_products AS product
SET
  payload = jsonb_set(product.payload, '{chapters}', rebuilt.chapters, false),
  updated_at = '2026-08-03T07:30:00+09:00'::timestamptz
FROM rebuilt
WHERE product.id = rebuilt.id;

DO $$
DECLARE
  diversified_count integer;
  chapter_count integer;
  paragraph_count integer;
  unique_title_count integer;
  unique_paragraph_count integer;
BEGIN
  SELECT count(*) INTO diversified_count
  FROM public.content_products
  WHERE locale = 'en'
    AND content_type = 'investor_brief'
    AND is_active = true
    AND payload ? 'marketEvidence'
    AND jsonb_array_length(payload -> 'chapters') = 4
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(payload -> 'chapters') AS chapter(value)
      WHERE jsonb_array_length(chapter.value -> 'paragraphs') <> 3
    );

  IF diversified_count <> 16 THEN
    RAISE EXCEPTION 'expected 16 diversified Greater Tokyo briefs, found %', diversified_count;
  END IF;

  SELECT count(*), count(DISTINCT chapter.value ->> 'title')
  INTO chapter_count, unique_title_count
  FROM public.content_products AS product
  CROSS JOIN LATERAL jsonb_array_elements(product.payload -> 'chapters') AS chapter(value)
  WHERE product.locale = 'en'
    AND product.content_type = 'investor_brief'
    AND product.is_active = true;

  IF chapter_count <> 112 OR unique_title_count <> chapter_count THEN
    RAISE EXCEPTION 'investor chapter titles are not unique: % unique of %', unique_title_count, chapter_count;
  END IF;

  SELECT count(*), count(DISTINCT paragraph.value)
  INTO paragraph_count, unique_paragraph_count
  FROM public.content_products AS product
  CROSS JOIN LATERAL jsonb_array_elements(product.payload -> 'chapters') AS chapter(value)
  CROSS JOIN LATERAL jsonb_array_elements_text(chapter.value -> 'paragraphs') AS paragraph(value)
  WHERE product.locale = 'en'
    AND product.content_type = 'investor_brief'
    AND product.is_active = true;

  IF paragraph_count <> 288 OR unique_paragraph_count <> paragraph_count THEN
    RAISE EXCEPTION 'investor paragraphs are not unique: % unique of %', unique_paragraph_count, paragraph_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_products AS product
    CROSS JOIN LATERAL jsonb_array_elements(product.payload -> 'chapters') AS chapter(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(chapter.value -> 'paragraphs') AS paragraph(value)
    WHERE product.locale = 'en'
      AND product.content_type = 'investor_brief'
      AND product.is_active = true
      AND length(paragraph.value) < 400
  ) THEN
    RAISE EXCEPTION 'investor analysis contains a paragraph shorter than 400 characters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_products AS product
    CROSS JOIN LATERAL jsonb_array_elements(product.payload -> 'chapters') AS chapter(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(chapter.value -> 'sourceIds') AS source_id(value)
    WHERE product.locale = 'en'
      AND product.content_type = 'investor_brief'
      AND product.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(product.payload -> 'sources') AS source(value)
        WHERE source.value ->> 'id' = source_id.value
      )
  ) THEN
    RAISE EXCEPTION 'investor analysis chapter references an unknown source';
  END IF;
END
$$;

COMMIT;
