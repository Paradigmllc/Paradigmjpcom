BEGIN;

WITH profiles(profile) AS (
  VALUES
  ($profile${
    "slug":"yokohama-real-estate-investment",
    "title":"Yokohama Real Estate Investment: Ward-by-Ward Foreign Investor Guide",
    "summary":"A sourced Yokohama investment screen covering Nishi, Naka, Kohoku, Kanagawa and Tsurumi wards, with rail demand, waterfront hazards, building evidence and exit gates.",
    "category":"Yokohama real estate","region":"Kanagawa - Yokohama","assetClass":"Residential / mixed-use / hospitality","decisionStage":"Ward and corridor selection","readTime":"18 min","kicker":"YOKOHAMA / WARD AND CORRIDOR SELECTION",
    "decisionQuestion":"Which Yokohama ward and railway catchment provides decision-grade income and exit evidence at the proposed basis?",
    "answer":"Treat Yokohama as several operating markets, not a lower-cost substitute for central Tokyo. MLIT's 2026 residential standard-site averages were JPY 425,400 per sq m in Nishi, JPY 405,800 in Naka, JPY 362,400 in Kohoku, JPY 332,800 in Kanagawa and JPY 310,000 in Tsurumi. Advance only after the exact station catchment, tenant segment, parcel hazard, building condition and likely exit buyer support the price.",
    "priceFact":"Nishi JPY 425,400/sq m to Tsurumi JPY 310,000/sq m","priceMeaning":"The five wards span central, waterfront, commuter and industrial interfaces. Their official averages are screening references, not interchangeable comparables or asset values.",
    "growthFact":"Nishi +7.0%; Kanagawa +5.2%; Tsurumi +4.1%; Kohoku +4.0%; Naka +3.6%","growthMeaning":"The 2026 residential changes were positive but dispersed. Price momentum must be reconciled to achieved rent, pipeline supply, building use and buyer depth.",
    "coveredMarkets":["Nishi Ward","Naka Ward","Kohoku Ward","Kanagawa Ward","Tsurumi Ward","Yokohama railway corridors"],
    "evidenceScope":"2026 MLIT residential standard-site averages for five investable Yokohama wards.",
    "evidencePoints":[{"market":"Nishi","averagePriceYenPerSqm":425400,"annualChangePct":7.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Naka","averagePriceYenPerSqm":405800,"annualChangePct":3.6,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Kohoku","averagePriceYenPerSqm":362400,"annualChangePct":4.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Kanagawa","averagePriceYenPerSqm":332800,"annualChangePct":5.2,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Tsurumi","averagePriceYenPerSqm":310000,"annualChangePct":4.1,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"Yokohama value is created by a specific employment, railway, household or visitor catchment rather than by the city brand alone.",
    "thesis":"Nishi and Naka include the central business, visitor and waterfront core; Kohoku has major commuter and family nodes; Kanagawa connects central Yokohama and Tokyo-facing corridors; Tsurumi combines residential and industrial demand. Define whether the investment depends on local employment, Tokyo commuting, tourism, education or logistics before selecting comparables.",
    "demand":"Rebuild demand from achieved leases, renewals, vacancy days and tenant origin. For visitor or furnished strategies, obtain monthly channel, length-of-stay, staffing and legal-use evidence. For residential strategies, segment families, singles and corporate tenants by railway and unit type rather than using city population as a proxy.",
    "supply":"Map high-rise delivery, station redevelopment, older hillside or narrow-access stock and competing rental completions. Verify legal access, slope and retaining-wall condition, seismic status, equipment and management rules; price the full capital plan before assigning a Yokohama location premium.",
    "riskLede":"Waterfront, slope, rail concentration and mixed operating uses produce different downside paths within the same city.",
    "riskTitle":"City-brand and corridor mismatch","downside":"An asset can carry a Yokohama headline while relying on a narrow station, visitor or industrial tenant pool. Flood, storm-surge, slope or access constraints can also impair operations, insurance and exit demand without appearing in a city average.",
    "riskAction":"Define a station-level investment box, export parcel hazard layers, inspect access and structure, reconcile the rent roll and capital plan, and identify at least two evidenced exit-buyer groups before bidding.",
    "relatedSlugs":["greater-tokyo-real-estate-market","kawasaki-real-estate-investment","tokyo-central-three-wards-real-estate-investment"]
  }$profile$::jsonb),
  ($profile${
    "slug":"kawasaki-real-estate-investment",
    "title":"Kawasaki Real Estate Investment: Seven-Ward Rental and Mixed-Use Guide",
    "summary":"A ward-level Kawasaki screen from Kawasaki and Saiwai through Nakahara, Takatsu, Tama, Miyamae and Asao, using official benchmarks and operating diligence.",
    "category":"Kawasaki real estate","region":"Kanagawa - Kawasaki","assetClass":"Multifamily / mixed-use","decisionStage":"Ward and railway selection","readTime":"18 min","kicker":"KAWASAKI / TOKYO-YOKOHAMA CORRIDORS",
    "decisionQuestion":"Does the selected Kawasaki corridor provide sufficient tenant depth, building quality and exit liquidity for the proposed income strategy?",
    "answer":"Kawasaki's Tokyo-Yokohama position is investable only when the exact railway and ward economics are evidenced. In 2026, MLIT residential averages ranged from JPY 475,500 per sq m in Nakahara and JPY 371,600 in Saiwai to JPY 239,400 in Asao. Annual changes ranged from 4.0% to 4.8%. Do not pay for connectivity until achieved rent, walk time, building condition, hazard and buyer evidence confirm it.",
    "priceFact":"Nakahara JPY 475,500/sq m to Asao JPY 239,400/sq m","priceMeaning":"Kawasaki spans dense Tokyo-facing nodes, industrial and waterfront interfaces, and lower-density suburban corridors. One city average conceals a near twofold ward spread.",
    "growthFact":"Asao +4.8%; Kawasaki +4.6%; Nakahara and Miyamae +4.5%; Saiwai +4.3%","growthMeaning":"Relatively tight 2026 growth figures do not make ward risks uniform; income, supply and exit evidence remain local.",
    "coveredMarkets":["Kawasaki Ward","Saiwai Ward","Nakahara Ward","Takatsu Ward","Tama Ward","Miyamae Ward","Asao Ward"],
    "evidenceScope":"2026 MLIT residential standard-site averages for all seven Kawasaki wards.",
    "evidencePoints":[{"market":"Nakahara","averagePriceYenPerSqm":475500,"annualChangePct":4.5,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Saiwai","averagePriceYenPerSqm":371600,"annualChangePct":4.3,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Takatsu","averagePriceYenPerSqm":355200,"annualChangePct":4.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Kawasaki","averagePriceYenPerSqm":329500,"annualChangePct":4.6,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Miyamae","averagePriceYenPerSqm":292900,"annualChangePct":4.5,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Tama","averagePriceYenPerSqm":272100,"annualChangePct":4.2,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Asao","averagePriceYenPerSqm":239400,"annualChangePct":4.8,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"The investment case should name the railway, employment base and household segment that convert Kawasaki's location into recurring income.",
    "thesis":"Nakahara and Saiwai can capture premium Tokyo-facing demand, Kawasaki Ward combines central and industrial-waterfront influences, Takatsu serves dense commuter corridors, and the northern wards include family and suburban markets. A credible mandate separates these roles and states the unit, building and price band that fits each one.",
    "demand":"Trace tenant workplaces, commute routes, household sizes, lease starts, renewals and vacancy days. Test whether a premium depends on one railway or employer cluster, and measure tenant alternatives across Tokyo, Yokohama and other Kawasaki wards under a service interruption or affordability stress.",
    "supply":"Map tower and apartment delivery around major nodes, competing older stock, developable suburban land and industrial adjacency. Inspect seismic, noise, air, access and equipment conditions and reconcile recurring repairs and catch-up capital work to achievable rent.",
    "riskLede":"Connectivity can create demand concentration: the same railway, employer or redevelopment narrative may drive occupancy, price and exit assumptions.",
    "riskTitle":"Connectivity premium without redundancy","downside":"A high basis can depend on uninterrupted rail access and a narrow professional tenant segment, while lower-basis areas can carry weaker exit depth or longer marketing periods. Industrial, river and coastal conditions can add asset-specific costs.",
    "riskAction":"Stress the primary railway and employer thesis, compare substitute stations, retain parcel hazard and environmental evidence, and obtain lender, manager and buyer feedback for the exact asset size.",
    "relatedSlugs":["greater-tokyo-real-estate-market","yokohama-real-estate-investment","shinagawa-meguro-ota-real-estate-investment"]
  }$profile$::jsonb),
  ($profile${
    "slug":"saitama-urawa-omiya-real-estate-investment",
    "title":"Saitama City Real Estate Investment: Urawa, Omiya, Minami and Chuo",
    "summary":"A railway-node and family-rental screen for Urawa, Omiya, Minami and Chuo wards using official land evidence, commute demand, supply and exit diligence.",
    "category":"Saitama City real estate","region":"Saitama - Saitama City","assetClass":"Residential / neighbourhood mixed-use","decisionStage":"Node allocation","readTime":"18 min","kicker":"SAITAMA CITY / URAWA AND OMIYA NODES",
    "decisionQuestion":"Which Saitama City node has enough household, employment and buyer depth to support the basis through a slower Tokyo commuter cycle?",
    "answer":"Select the node and tenant before underwriting Saitama City. MLIT's 2026 residential averages were JPY 428,900 per sq m in Urawa, JPY 358,900 in Omiya, JPY 316,900 in Chuo and JPY 306,800 in Minami. Annual changes ranged from 3.0% to 3.9%. Advance only if achieved rents, household affordability, railway redundancy, pipeline supply and a realistic exit pool support the proposed return.",
    "priceFact":"Urawa JPY 428,900/sq m; Omiya JPY 358,900; Chuo JPY 316,900; Minami JPY 306,800","priceMeaning":"Urawa's residential basis, Omiya's transport and commercial role, and the surrounding family corridors require separate comparable and tenant sets.",
    "growthFact":"Omiya +3.9%; Urawa +3.7%; Chuo +3.4%; Minami +3.0%","growthMeaning":"Positive but moderate 2026 changes should be tested against household income, new supply and the cost of commuting rather than extrapolated.",
    "coveredMarkets":["Urawa Ward","Omiya Ward","Chuo Ward","Minami Ward","Saitama City railway nodes"],
    "evidenceScope":"2026 MLIT residential standard-site averages for four central Saitama City wards.",
    "evidencePoints":[{"market":"Urawa","averagePriceYenPerSqm":428900,"annualChangePct":3.7,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Omiya","averagePriceYenPerSqm":358900,"annualChangePct":3.9,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Chuo","averagePriceYenPerSqm":316900,"annualChangePct":3.4,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Minami","averagePriceYenPerSqm":306800,"annualChangePct":3.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"Saitama City should be underwritten as a hierarchy of transport, administrative, education and family nodes, not as a single commuter discount.",
    "thesis":"Omiya is a major transport and commercial node, Urawa carries administrative and established residential demand, and Chuo and Minami serve distinct family and commuter catchments. State whether rent is supported locally, by Tokyo commuting or by both, then select building and unit types for that demand.",
    "demand":"Measure achieved rents, tenant workplaces, household income, school and childcare relevance, car and bicycle use, renewals and commute alternatives. Stress remote-work and fare sensitivity and identify which tenants would move closer to Tokyo or farther out when affordability changes.",
    "supply":"Map condominium and rental delivery near each station, older family stock, redevelopment and land availability. Quantify concessions and lease-up for competing projects, and inspect unit layouts, parking, bicycle space, seismic condition and equipment for the target household.",
    "riskLede":"A commuter-market basis can rise faster than local rent, leaving returns dependent on continued price growth and a narrow leveraged buyer pool.",
    "riskTitle":"Rent-to-basis and commute-cycle divergence","downside":"If acquisition prices reflect Tokyo spillover but household income and rent lag, NOI yield can compress. New station supply, rail disruption or tighter mortgage and investor financing can then lengthen lease-up and exit periods together.",
    "riskAction":"Bridge every basis assumption to achieved rent and household affordability, inventory the active pipeline, stress commute demand and debt cost, and document both local and Tokyo-facing exit buyers.",
    "relatedSlugs":["greater-tokyo-real-estate-market","south-saitama-real-estate-investment","tokyo-tama-western-suburbs-real-estate-investment"]
  }$profile$::jsonb),
  ($profile${
    "slug":"south-saitama-real-estate-investment",
    "title":"South Saitama Real Estate Investment: Kawaguchi, Toda, Warabi, Wako and Asaka",
    "summary":"A foreign-investor screen for South Saitama's Tokyo-adjacent rental markets, covering basis, rail access, family demand, river hazards, supply and exits.",
    "category":"South Saitama real estate","region":"Saitama - Tokyo border cities","assetClass":"Multifamily / rental residential","decisionStage":"Corridor and yield screen","readTime":"18 min","kicker":"SOUTH SAITAMA / TOKYO-ADJACENT RENTAL",
    "decisionQuestion":"Does the Tokyo-adjacent rent and basis spread remain investable after railway, river, supply and household-affordability risks are priced?",
    "answer":"South Saitama is a set of compact Tokyo-facing markets with different railways and physical risks. MLIT's 2026 residential averages were JPY 325,200 per sq m in Warabi, JPY 312,300 in Toda, JPY 305,000 in Wako, JPY 278,400 in Asaka and JPY 264,900 in Kawaguchi. Annual changes ranged from 4.0% to 6.1%. Advance only when rent, vacancy, building and parcel evidence preserve the apparent basis advantage.",
    "priceFact":"Warabi JPY 325,200/sq m to Kawaguchi JPY 264,900/sq m","priceMeaning":"The compact cluster has a relatively narrow price band, so railway, walk time, flood exposure, unit mix and management quality can determine relative value.",
    "growthFact":"Toda +6.1%; Warabi +5.9%; Kawaguchi +4.5%; Wako and Asaka +4.0%","growthMeaning":"Faster 2026 changes in Toda and Warabi require a supply and affordability check; positive momentum is not a substitute for NOI.",
    "coveredMarkets":["Kawaguchi","Toda","Warabi","Wako","Asaka"],
    "evidenceScope":"2026 MLIT residential standard-site averages for five Tokyo-border Saitama cities.",
    "evidencePoints":[{"market":"Warabi","averagePriceYenPerSqm":325200,"annualChangePct":5.9,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Toda","averagePriceYenPerSqm":312300,"annualChangePct":6.1,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Wako","averagePriceYenPerSqm":305000,"annualChangePct":4.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Asaka","averagePriceYenPerSqm":278400,"annualChangePct":4.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Kawaguchi","averagePriceYenPerSqm":264900,"annualChangePct":4.5,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"The opportunity is a documented rent-to-basis spread for a named Tokyo corridor, not a blanket border-city discount.",
    "thesis":"Kawaguchi, Toda and Warabi serve dense southern corridors, while Wako and Asaka connect through different western rail networks. Define the tenant's Tokyo destination, acceptable commute, household type and alternative stations. The investment should still work if tenants trade location against rent.",
    "demand":"Analyze achieved rent, applicant income, workplace, renewals, guarantor results and vacancy days by station and unit. Test bicycle, bus and alternate-rail options and compare total housing cost with adjacent Tokyo wards and the next stations outward.",
    "supply":"Inventory condominium and rental completions, older small buildings and developable sites around the same station band. Inspect ground-floor and equipment elevation, structure, unit efficiency and maintenance history; separate occupancy from profitable, resilient occupancy.",
    "riskLede":"Railway and river systems can create correlated tenant, downtime, insurance and exit risk across seemingly separate municipalities.",
    "riskTitle":"Border premium and correlated flood exposure","downside":"Tokyo spillover can compress yield before local rents catch up. In low-elevation or river-influenced catchments, a physical event can affect access, tenants, repairs, insurance and future buyer appetite at the same time.",
    "riskAction":"Cap exposure by rail and river system, retain parcel and equipment-elevation evidence, stress rent and downtime, and require lender and buyer feedback at the normalized NOI rather than advertised yield.",
    "relatedSlugs":["greater-tokyo-real-estate-market","saitama-urawa-omiya-real-estate-investment","kita-arakawa-itabashi-nerima-real-estate-investment"]
  }$profile$::jsonb),
  ($profile${
    "slug":"chiba-bay-real-estate-investment",
    "title":"Chiba Bay Real Estate Investment: Urayasu, Ichikawa, Funabashi, Narashino and Chiba",
    "summary":"A bay-corridor investment guide covering Tokyo access, family and logistics demand, reclaimed-land and flood evidence, supply, operations and exit liquidity.",
    "category":"Chiba Bay real estate","region":"Chiba - Tokyo Bay corridor","assetClass":"Residential / mixed-use / logistics-adjacent","decisionStage":"Bay corridor selection","readTime":"18 min","kicker":"CHIBA BAY / ACCESS AND RESILIENCE",
    "decisionQuestion":"Which Chiba Bay node offers enough rent and buyer depth after reclaimed-land, flood, rail, supply and building risks are priced?",
    "answer":"Separate the Chiba Bay corridor by Tokyo access, local employment, household and physical exposure. MLIT's 2026 residential averages were JPY 393,400 per sq m in Urayasu, JPY 306,700 in Ichikawa, JPY 204,400 in Narashino, JPY 198,600 in Funabashi and JPY 149,700 in Chiba City. Annual changes ranged from 2.4% to 5.8%. The basis spread is useful only after parcel hazards and asset-level income are verified.",
    "priceFact":"Urayasu JPY 393,400/sq m to Chiba City JPY 149,700/sq m","priceMeaning":"Tokyo proximity, local nodes and coastal urban form create a wide basis range. City averages cannot price a particular reclaimed parcel, station walk or building.",
    "growthFact":"Chiba City +5.8%; Narashino +5.2%; Funabashi +4.7%; Ichikawa +3.0%; Urayasu +2.4%","growthMeaning":"Higher growth farther along the corridor does not by itself compensate for commute, supply, rent or exit differences.",
    "coveredMarkets":["Urayasu","Ichikawa","Funabashi","Narashino","Chiba City","Tokyo Bay railway corridors"],
    "evidenceScope":"2026 MLIT residential standard-site averages for five Chiba Bay anchors.",
    "evidencePoints":[{"market":"Urayasu","averagePriceYenPerSqm":393400,"annualChangePct":2.4,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Ichikawa","averagePriceYenPerSqm":306700,"annualChangePct":3.0,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Narashino","averagePriceYenPerSqm":204400,"annualChangePct":5.2,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Funabashi","averagePriceYenPerSqm":198600,"annualChangePct":4.7,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Chiba City","averagePriceYenPerSqm":149700,"annualChangePct":5.8,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"Chiba Bay allocation should balance Tokyo access and local demand against physical resilience, competing supply and exit depth.",
    "thesis":"Urayasu and Ichikawa can capture close-in Tokyo-facing demand, Funabashi and Narashino combine commuter, family and local nodes, and Chiba City adds administrative, employment and broader suburban roles. Identify whether the asset is a commuter rental, family product, local-node mixed use or logistics-adjacent strategy.",
    "demand":"Segment tenants by Tokyo workplace, local employment, education, family size and unit type. Reconcile rents and vacancy to exact railway and walking bands, and stress service disruption. Logistics-adjacent demand needs employer, shift, transport and unit evidence rather than warehouse-area growth alone.",
    "supply":"Map tower, condominium and rental deliveries, station redevelopment, older stock and available land. On coastal or reclaimed sites, inspect foundations, utilities, equipment elevation, emergency power and business-continuity capacity and reconcile management reserves to the required work.",
    "riskLede":"Coastal and reclaimed-land exposure can change building operations, insurance and exit liquidity even when regional demand remains strong.",
    "riskTitle":"Bay-corridor resilience and supply concentration","downside":"Flood, storm surge, liquefaction or prolonged transport disruption can combine with concentrated new supply. A city-level average will not reveal parcel elevation, equipment exposure, building resilience or the future buyer's financing response.",
    "riskAction":"Export parcel hazard layers, verify foundations and critical equipment, obtain insurance terms, map competing completions and underwrite downtime and slower disposition with no benchmark appreciation.",
    "relatedSlugs":["greater-tokyo-real-estate-market","kashiwa-nagareyama-narita-real-estate-investment","koto-sumida-taito-real-estate-investment"]
  }$profile$::jsonb),
  ($profile${
    "slug":"kashiwa-nagareyama-narita-real-estate-investment",
    "title":"Kashiwa, Nagareyama and Narita Real Estate Investment Guide",
    "summary":"An outer-Chiba decision brief for Kashiwa, Nagareyama, Matsudo, Inzai and Narita, covering growth nodes, families, airport and logistics demand, supply and exits.",
    "category":"Outer Chiba real estate","region":"Chiba - northwest and airport corridors","assetClass":"Residential / logistics-adjacent / neighbourhood mixed-use","decisionStage":"Growth-node selection","readTime":"18 min","kicker":"OUTER CHIBA / GROWTH AND EMPLOYMENT NODES",
    "decisionQuestion":"Which outer-Chiba node has durable tenant and buyer demand after new supply, demographic, commute and single-engine risks are stressed?",
    "answer":"Outer Chiba is investable through specific growth, employment and transport nodes. MLIT's 2026 residential averages were JPY 194,400 per sq m in Nagareyama, JPY 170,300 in Matsudo, JPY 141,700 in Kashiwa, JPY 67,400 in Narita and JPY 48,400 in Inzai. Nagareyama's annual average rose 13.3%, versus 8.7% in Matsudo, 5.3% in Narita, 5.2% in Kashiwa and 4.9% in Inzai. Strong change increases the need for supply and affordability evidence.",
    "priceFact":"Nagareyama JPY 194,400/sq m to Inzai JPY 48,400/sq m","priceMeaning":"Northwest commuter nodes, planned family markets and airport or logistics corridors have fundamentally different land basis and operating engines.",
    "growthFact":"Nagareyama +13.3%; Matsudo +8.7%; Narita +5.3%; Kashiwa +5.2%; Inzai +4.9%","growthMeaning":"Nagareyama's 2026 change was exceptional within this set, making pipeline, affordability and exit-buyer discipline especially important.",
    "coveredMarkets":["Kashiwa","Nagareyama","Matsudo","Inzai","Narita","Tsukuba Express and airport corridors"],
    "evidenceScope":"2026 MLIT residential standard-site averages for five outer-Chiba growth and employment anchors.",
    "evidencePoints":[{"market":"Nagareyama","averagePriceYenPerSqm":194400,"annualChangePct":13.3,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Matsudo","averagePriceYenPerSqm":170300,"annualChangePct":8.7,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Kashiwa","averagePriceYenPerSqm":141700,"annualChangePct":5.2,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Narita","averagePriceYenPerSqm":67400,"annualChangePct":5.3,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]},{"market":"Inzai","averagePriceYenPerSqm":48400,"annualChangePct":4.9,"sourceIds":["mlit-land-price-2026","mlit-land-growth-2026"]}],
    "thesisLede":"The return must come from an evidenced family, employment, airport or logistics node, not from extrapolating a municipality's recent growth.",
    "thesis":"Nagareyama and parts of Kashiwa and Matsudo serve strong northwest commuter and family corridors; Inzai combines planned communities and employment; Narita adds airport, logistics and visitor-linked demand. Define the primary and secondary demand engine and whether the asset remains viable if one weakens.",
    "demand":"Measure household formation, achieved rent, school and childcare relevance, tenant workplace, railway use and renewals for family markets. For airport, data-centre or logistics exposure, identify employers, shifts, transport, contractor cycles and the unit product actually leased by workers.",
    "supply":"Map land release, subdivisions, multifamily completions and competing owner-occupied product. Growth markets can add supply faster than mature wards, so track concessions, lease-up, unsold inventory and infrastructure delivery. Inspect utilities, access, equipment and management capacity for every asset.",
    "riskLede":"A fast-growing node can combine price momentum, supply elasticity and reliance on one railway, employer cluster or household cohort.",
    "riskTitle":"Growth extrapolation and single-engine exposure","downside":"Recent benchmark growth can attract capital just as household affordability, pipeline supply or infrastructure timing changes. Airport, logistics and data-centre narratives may not translate into the unit-level rent or future buyer assumed in the model.",
    "riskAction":"Build a pipeline and affordability dashboard, separate primary and secondary demand engines, stress rail or employer disruption, and require completed lease and sale evidence for the exact unit and building type.",
    "relatedSlugs":["greater-tokyo-real-estate-market","chiba-bay-real-estate-investment","japan-data-center-investment"]
  }$profile$::jsonb)
), records AS (
  SELECT
    profile ->> 'slug' AS slug,
    profile ->> 'title' AS title,
    profile ->> 'summary' AS summary,
    jsonb_build_object(
      'category', profile ->> 'category', 'region', profile ->> 'region',
      'assetClass', profile ->> 'assetClass', 'decisionStage', profile ->> 'decisionStage',
      'readTime', profile ->> 'readTime', 'sourceCount', 5
    ) AS preview,
    public.build_investor_metro_payload(profile) AS payload
  FROM profiles
)
INSERT INTO public.content_products (
  slug, locale, title, summary, content_type, access_model, price_usdc, network,
  preview, payload, source_url, license, version, is_active, published_at, updated_at
)
SELECT
  slug, 'en', title, summary, 'investor_brief', 'free', 0, 'eip155:8453', preview, payload,
  'https://paradigmjp.com/en/japan-opportunities/invest/' || slug,
  'Paradigm API Terms; attribution required. Not investment, legal, tax, brokerage or financial advice.',
  1, true, '2026-08-02T00:00:00Z'::timestamptz, now()
FROM records
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title, summary = EXCLUDED.summary, content_type = EXCLUDED.content_type,
  access_model = EXCLUDED.access_model, price_usdc = EXCLUDED.price_usdc, network = EXCLUDED.network,
  preview = EXCLUDED.preview, payload = EXCLUDED.payload,
  source_url = EXCLUDED.source_url, license = EXCLUDED.license, version = EXCLUDED.version,
  is_active = EXCLUDED.is_active, published_at = EXCLUDED.published_at, updated_at = now();

COMMIT;
