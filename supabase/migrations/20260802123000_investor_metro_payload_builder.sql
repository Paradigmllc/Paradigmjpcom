BEGIN;

CREATE OR REPLACE FUNCTION public.build_investor_metro_payload(profile jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'schemaVersion', '1.0',
    'kicker', profile ->> 'kicker',
    'answer', profile ->> 'answer',
    'decisionQuestion', profile ->> 'decisionQuestion',
    'audience', jsonb_build_array(
      'Cross-border residential and mixed-use investors',
      'Family offices and private capital',
      'Investment teams comparing Greater Tokyo submarkets'
    ),
    'keyFacts', jsonb_build_array(
      jsonb_build_object(
        'label', '2026 residential land benchmark',
        'value', profile ->> 'priceFact',
        'meaning', profile ->> 'priceMeaning',
        'sourceIds', jsonb_build_array('mlit-land-price-2026')
      ),
      jsonb_build_object(
        'label', '2026 annual benchmark change',
        'value', profile ->> 'growthFact',
        'meaning', profile ->> 'growthMeaning',
        'sourceIds', jsonb_build_array('mlit-land-growth-2026')
      ),
      jsonb_build_object(
        'label', 'Greater Tokyo resale liquidity reference',
        'value', '49,114 condominium contracts in 2025',
        'meaning', 'East Japan REINS reported a third consecutive annual increase in Greater Tokyo used-condominium contracts. This is regional context, not evidence that a particular building, unit or price point will be liquid.',
        'sourceIds', jsonb_build_array('reins-2025')
      ),
      jsonb_build_object(
        'label', 'Greater Tokyo contracted price reference',
        'value', 'JPY 829,800 per m² in 2025',
        'meaning', 'The REINS region-wide used-condominium contract benchmark rose for a thirteenth year. Land benchmarks, condominium contract prices and asset valuations are different measures and must not be substituted for one another.',
        'sourceIds', jsonb_build_array('reins-2025')
      )
    ),
    'risks', jsonb_build_array(
      jsonb_build_object(
        'title', profile ->> 'riskTitle',
        'level', 'high',
        'whyItMatters', profile ->> 'downside',
        'diligenceAction', profile ->> 'riskAction'
      ),
      jsonb_build_object(
        'title', 'Benchmark-to-asset mismatch',
        'level', 'high',
        'whyItMatters', 'The published land-price average is a simple average of standard-site changes and the REINS measure covers contracted used condominiums. Neither is a valuation, rent roll or substitute for building-level comparables.',
        'diligenceAction', 'Build a dated comparable set for the same tenure, use, walking distance, age, structure and unit mix; reconcile it to the seller rent roll and an independent physical inspection.'
      ),
      jsonb_build_object(
        'title', 'Flood, liquefaction and seismic exposure',
        'level', 'high',
        'whyItMatters', 'Greater Tokyo risk changes block by block. River, coastal, reclaimed-land and older-building exposure can alter insurance, financing, business interruption and exit demand.',
        'diligenceAction', 'Export the national and municipal hazard layers for the exact parcel, identify the source agency and update date, then reconcile them with engineering, elevation, structure, evacuation and insurance evidence.'
      ),
      jsonb_build_object(
        'title', 'Financing and exit-buyer compression',
        'level', 'medium',
        'whyItMatters', 'A rising price benchmark can coexist with lower levered returns when debt cost, required capital expenditure or buyer underwriting standards tighten.',
        'diligenceAction', 'Underwrite an unlevered base case, a lender term-sheet case and a no-refinance case; map likely domestic and overseas exit buyers rather than assuming benchmark appreciation continues.'
      )
    ),
    'decisionGates', jsonb_build_array(
      jsonb_build_object(
        'title', 'Comparable evidence gate',
        'evidence', 'Completed transactions and active listings matched by micro-location, tenure, use, age, structure, size, floor, condition and transaction date.',
        'passCondition', 'The investment price is supported by a reconciled comparable range and every material adjustment is documented rather than hidden in a blended average.'
      ),
      jsonb_build_object(
        'title', 'Operating evidence gate',
        'evidence', 'Tenant-level leases, concessions, arrears, deposits, renewal history, operating expenses, taxes, insurance and a dated capital plan.',
        'passCondition', 'Normalized NOI survives tenant, vacancy, expense and capital-expenditure checks with an owner assigned to each missing item.'
      ),
      jsonb_build_object(
        'title', 'Site and hazard gate',
        'evidence', 'Parcel-specific flood, storm-surge, liquefaction, landslide and evacuation evidence plus structural, seismic and insurance review.',
        'passCondition', 'The downside case prices physical exposure, downtime, mitigation and insurability; no risk conclusion relies only on a ward or city average.'
      ),
      jsonb_build_object(
        'title', 'Financing and exit gate',
        'evidence', 'Written financing terms, covenant and refinance stress, buyer map, transaction-cost schedule and base-currency repatriation scenario.',
        'passCondition', 'The deal remains financeable and saleable under a slower exit, higher debt cost and weaker occupancy without relying on continued benchmark inflation.'
      )
    ),
    'checklist', jsonb_build_array(
      'Current registry, tenure, seller identity and encumbrance documents',
      '2026 MLIT standard-site benchmarks for every covered submarket',
      'Completed building- or unit-level comparable set with adjustment ledger',
      'Tenant leases, rent roll, arrears, deposits and concession history',
      'Three- to ten-year operating expenses and capital-expenditure plan',
      'Parcel-level national and municipal hazard-map export',
      'Seismic, structural, building-code and major-equipment inspection',
      'Written acquisition, annual holding, withholding and exit tax workflow',
      'Debt term sheet, covenant case and no-refinance downside',
      'Property-management, emergency-response and reporting SLA',
      'Domestic and overseas exit-buyer evidence',
      'Investment committee record linking each claim to its dated source'
    ),
    'faqs', jsonb_build_array(
      jsonb_build_object(
        'question', 'Does a rising 2026 land benchmark mean this asset is undervalued?',
        'answer', 'No. The land benchmark describes standard sites and average changes, not the value of a particular building, lease stream or condominium. Use it to challenge a thesis, then value the exact asset from matched transactions, income, condition, rights and liabilities.'
      ),
      jsonb_build_object(
        'question', 'Can a foreign investor buy in these markets without Japanese residency?',
        'answer', 'Japan generally does not impose a residency requirement simply to own real estate, but financing, tax representation, identity checks, reporting, management and regulated-use questions can still determine whether the transaction is executable.'
      ),
      jsonb_build_object(
        'question', 'How should the chart be used?',
        'answer', 'Use it to see dispersion inside the covered cluster and to select the comparable set that needs deeper work. Do not convert the average land price directly into a unit, building or portfolio value.'
      )
    ),
    'methodology', jsonb_build_object(
      'purpose', 'Separate a Greater Tokyo location narrative from an evidence-backed advance, reprice or decline decision.',
      'process', 'Paradigm maps the 2026 MLIT residential standard-site averages and annual changes to a distinct submarket thesis, then adds REINS liquidity context, parcel-level hazard diligence and an operating-evidence workflow.',
      'limitations', 'Published averages are not valuations. The page has not inspected an asset, verified a rent roll, obtained financing or provided legal, tax, brokerage, engineering or investment advice. Data definitions and update dates differ by source.',
      'reviewedBy', 'Paradigm Greater Tokyo Real Estate Intelligence Desk'
    ),
    'sources', jsonb_build_array(
      jsonb_build_object('id', 'mlit-land-price-2026', 'title', '2026 Published Land Prices: Tokyo-area city and ward residential averages', 'publisher', 'Ministry of Land, Infrastructure, Transport and Tourism', 'url', 'https://www.mlit.go.jp/tochi_fudousan_kensetsugyo/content/001986139.pdf', 'accessedAt', '2026-08-02'),
      jsonb_build_object('id', 'mlit-land-growth-2026', 'title', '2026 Published Land Prices: Tokyo-area city and ward annual average changes', 'publisher', 'Ministry of Land, Infrastructure, Transport and Tourism', 'url', 'https://www.mlit.go.jp/tochi_fudousan_kensetsugyo/content/001986141.pdf', 'accessedAt', '2026-08-02'),
      jsonb_build_object('id', 'reins-2025', 'title', 'Greater Tokyo real-estate distribution market trends, 2025', 'publisher', 'East Japan Real Estate Information Network', 'url', 'https://www.reins.or.jp/pdf/trend/sf/sf_2025.pdf', 'accessedAt', '2026-08-02'),
      jsonb_build_object('id', 'gsi-hazard', 'title', 'Japan Hazard Map Portal', 'publisher', 'Geospatial Information Authority of Japan / MLIT', 'url', 'https://disaportal.gsi.go.jp/', 'accessedAt', '2026-08-02'),
      jsonb_build_object('id', 'mlit-reinfolib', 'title', 'Real Estate Information Library public API catalog', 'publisher', 'Ministry of Land, Infrastructure, Transport and Tourism', 'url', 'https://www.reinfolib.mlit.go.jp/help/apiManual/', 'accessedAt', '2026-08-02')
    ),
    'relatedSlugs', profile -> 'relatedSlugs',
    'coveredMarkets', profile -> 'coveredMarkets',
    'chapters', jsonb_build_array(
      jsonb_build_object(
        'title', 'Investment thesis and market boundary',
        'lede', profile ->> 'thesisLede',
        'paragraphs', jsonb_build_array(
          profile ->> 'thesis',
          'The investable boundary should follow the tenant, transport and exit-buyer logic rather than a convenient administrative label. The underwriting file must therefore state which stations, walking-distance bands, building ages, tenures and uses are inside the thesis—and which are excluded.'
        ),
        'sourceIds', jsonb_build_array('mlit-land-price-2026', 'mlit-land-growth-2026')
      ),
      jsonb_build_object(
        'title', 'Demand and liquidity evidence',
        'lede', 'Demand is investable only when it appears in leases, completed transactions and a repeatable buyer pool.',
        'paragraphs', jsonb_build_array(
          profile ->> 'demand',
          'The 49,114 Greater Tokyo used-condominium contracts reported for 2025 establish regional market depth, but they do not prove liquidity for an unusual unit mix, lease structure or asking price. Segment the evidence by asset type and micro-location, and measure marketing periods and failed listings as well as successful trades.'
        ),
        'sourceIds', jsonb_build_array('reins-2025', 'mlit-reinfolib')
      ),
      jsonb_build_object(
        'title', 'Supply, condition and operating control',
        'lede', 'A location premium cannot repair an unverified rent roll, deferred capital work or weak operating control.',
        'paragraphs', jsonb_build_array(
          profile ->> 'supply',
          'Reconcile registered rights, approved use, building age, seismic standard, unit configuration and equipment condition to the actual operating statement. Separate recurring operating cost from catch-up capital expenditure, and obtain a local management and emergency-response workflow before assigning stabilized NOI.'
        ),
        'sourceIds', jsonb_build_array('mlit-land-price-2026', 'mlit-reinfolib')
      ),
      jsonb_build_object(
        'title', 'Downside, hazards and exit',
        'lede', profile ->> 'riskLede',
        'paragraphs', jsonb_build_array(
          profile ->> 'downside',
          'Run the parcel through national and municipal hazard layers, retain the exported evidence and identify the agency and update date. Then price insurance, downtime, mitigation and buyer-lender response. The exit case should identify actual buyer types and financing constraints rather than treating the latest benchmark change as a perpetual growth rate.'
        ),
        'sourceIds', jsonb_build_array('gsi-hazard', 'mlit-land-growth-2026', 'reins-2025')
      )
    ),
    'marketEvidence', jsonb_build_object(
      'asOf', '2026-01-01',
      'scope', profile ->> 'evidenceScope',
      'points', profile -> 'evidencePoints'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.build_investor_metro_payload(jsonb) FROM PUBLIC, anon, authenticated;

COMMIT;
