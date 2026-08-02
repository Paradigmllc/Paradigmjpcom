BEGIN;

ALTER TABLE public.content_products
  DROP CONSTRAINT IF EXISTS content_products_content_type_check;

ALTER TABLE public.content_products
  ADD CONSTRAINT content_products_content_type_check
  CHECK (content_type IN ('decision_packet', 'dataset', 'report', 'investor_brief'));

CREATE INDEX IF NOT EXISTS content_products_type_locale_active_idx
  ON public.content_products (content_type, locale, updated_at DESC)
  WHERE is_active = true;

WITH briefs AS (
  SELECT *
  FROM jsonb_to_recordset($investor_briefs$
  [
    {
      "slug":"buying-property-in-japan-as-a-foreigner",
      "title":"Buying Property in Japan as a Foreigner: Investment Decision Brief",
      "summary":"A foreign-investor framework for testing title, transaction evidence, acquisition costs, rental taxation and local execution before buying Japanese real estate.",
      "preview":{"category":"Real estate","region":"Japan","assetClass":"Direct property","decisionStage":"Pre-acquisition","readTime":"11 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"FOREIGN BUYER / REAL ESTATE",
        "answer":"A foreign buyer should not treat legal ability to acquire an asset as proof that the investment works. Advance only after a licensed professional confirms title and transaction procedure, official transaction evidence supports the price, every acquisition and holding cost is modeled, and a Japan-based tax and property-management workflow is assigned.",
        "decisionQuestion":"Can a non-resident buy this Japanese property on terms that survive tax, operating and exit diligence?",
        "audience":["Non-resident individuals","Family offices","Cross-border property investors"],
        "keyFacts":[
          {"label":"Comparable evidence","value":"Official transaction-price records","meaning":"MLIT publishes anonymized transaction-price information by property type and location. Underwriting should begin with completed transactions, not only asking prices.","sourceIds":["mlit-transactions"]},
          {"label":"Tax stack","value":"Buying, holding and selling are separate tax stages","meaning":"Registration and license tax and real-estate acquisition tax can arise on purchase; fixed-asset tax applies during ownership; income or corporate tax can arise on sale.","sourceIds":["mlit-land-tax"]},
          {"label":"Non-resident rent","value":"Japan-source income with filing workflow","meaning":"The NTA treats rent from Japanese real estate as domestic-source income and describes withholding and tax-representative requirements for non-residents.","sourceIds":["nta-nonresident-rent"]}
        ],
        "risks":[
          {"title":"Asking-price anchoring","level":"high","whyItMatters":"Portal listings may not represent executable or completed market prices, particularly where local liquidity is thin.","diligenceAction":"Build a comparable set from MLIT transaction data and document adjustments for age, access, tenure, size and condition."},
          {"title":"Unmodeled tax and closing costs","level":"high","whyItMatters":"A headline gross yield can compress materially after acquisition taxes, registration, professional fees, repairs and ongoing administration.","diligenceAction":"Obtain a written closing-cost and annual-tax schedule from licensed Japanese professionals before agreeing a final price."},
          {"title":"Remote ownership operations","level":"medium","whyItMatters":"Tax filings, tenant communication, maintenance and emergency decisions require named local owners and response standards.","diligenceAction":"Contract the tax representative, property manager and emergency authority before completion, with fees included in the downside case."}
        ],
        "decisionGates":[
          {"title":"Rights and transfer","evidence":"Current registry, seller authority, liens, easements, boundaries, building compliance and transaction flow reviewed by qualified counsel and transaction professionals.","passCondition":"No unresolved title, authority or use restriction can impair ownership, financing, operation or resale."},
          {"title":"Price and net return","evidence":"Completed comparables, rent evidence, vacancy, repairs, taxes, management, insurance and exit costs in base and downside models.","passCondition":"Net return remains inside mandate after all identified costs and a documented downside scenario."},
          {"title":"Non-resident operations","evidence":"Named tax representative, property manager, bank/payment path, insurance and escalation procedure.","passCondition":"Every recurring obligation has an accountable Japan-side owner and budget."}
        ],
        "checklist":["Current real-property registry and seller identity","MLIT completed-transaction comparable set","Licensed inspection and near-term capital plan","Written acquisition, holding and exit tax schedule","Non-resident tax representative engagement","Property-management agreement and emergency response SLA","Base-currency FX and exit-liquidity downside cases"],
        "faqs":[
          {"question":"Does foreign ownership remove the need for a Japanese operating setup?","answer":"No. Even where an acquisition can proceed, tax filing, payments, tenant or guest operations, repairs and regulated activities still require a workable Japan-side execution chain."},
          {"question":"Is the listing yield enough to compare properties?","answer":"No. Compare net operating income after vacancy, management, maintenance, taxes, insurance and planned capital expenditure, then test exit costs and currency movement."}
        ],
        "methodology":{"purpose":"Help foreign buyers reject weak real-estate opportunities before incurring full diligence cost.","process":"Paradigm maps official MLIT and NTA guidance into an evidence-first acquisition workflow, then separates confirmed facts from asset-specific assumptions.","limitations":"Rules, tax treatment, facts and transaction practices can change. This brief does not verify a particular asset or replace licensed legal, tax, brokerage, valuation or engineering work.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"mlit-transactions","title":"Supplying information on real estate transaction prices, etc.","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/totikensangyo/totikensangyo_fr5_000014.html","accessedAt":"2026-08-02"},
          {"id":"mlit-land-tax","title":"Outline of tax system for land and real estate","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/totikensangyo/totikensangyo_fr5_000025.html","accessedAt":"2026-08-02"},
          {"id":"nta-nonresident-rent","title":"Real estate income of non-residents","publisher":"National Tax Agency Japan","url":"https://www.nta.go.jp/english/taxes/individual/12014.htm","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-real-estate-taxes-for-non-residents","tokyo-multifamily-investment-due-diligence","hokkaido-resort-property-investment"]
      }
    },
    {
      "slug":"japan-real-estate-taxes-for-non-residents",
      "title":"Japan Real Estate Taxes for Non-Resident Investors: Diligence Brief",
      "summary":"A tax-workflow brief for non-resident property investors covering acquisition, ownership, rental income, withholding, filing and exit questions to resolve before underwriting.",
      "preview":{"category":"Tax diligence","region":"Japan","assetClass":"Income property","decisionStage":"Underwriting","readTime":"10 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"NON-RESIDENT / TAX WORKFLOW",
        "answer":"Model Japanese property taxes as a lifecycle, not a single closing percentage. Before investing, obtain professional calculations for acquisition, annual ownership, rental-income filing, withholding mechanics and disposal, and confirm whether a treaty or ownership vehicle changes the treatment for the specific investor.",
        "decisionQuestion":"Has the investment model captured the actual Japanese tax workflow for this non-resident owner?",
        "audience":["Non-resident landlords","Cross-border tax teams","Real-estate funds"],
        "keyFacts":[
          {"label":"Lifecycle model","value":"Purchase, ownership and sale each create tax questions","meaning":"MLIT identifies distinct taxes at acquisition, during ownership and on transfer. A one-line closing-cost assumption is not sufficient.","sourceIds":["mlit-tax-outline"]},
          {"label":"Rental withholding","value":"20.42% in the NTA business-payer example","meaning":"The NTA example states that a Japanese company paying rent to a non-resident withholds 20.42%; exceptions and final settlement depend on the payer and facts.","sourceIds":["nta-rental-income"]},
          {"label":"Tax administration","value":"A Japan-resident tax representative may be required","meaning":"The NTA describes appointing and notifying a tax representative for a non-resident filing Japanese real-estate income.","sourceIds":["nta-rental-income"]}
        ],
        "risks":[
          {"title":"Gross-yield tax omission","level":"high","whyItMatters":"Ignoring acquisition, fixed-asset, income and exit taxes can turn an attractive gross yield into a weak net result.","diligenceAction":"Require a year-by-year cash tax schedule linked to the actual owner, use and exit plan."},
          {"title":"Withholding treated as final tax","level":"high","whyItMatters":"Withholding and final filing are different steps; assuming the withheld amount is the final liability can distort cash flow.","diligenceAction":"Have a qualified Japanese tax professional document payer obligations, filing, credits and settlement timing."},
          {"title":"Vehicle and treaty mismatch","level":"medium","whyItMatters":"Individual, corporate and fund structures can produce different filings and cross-border consequences.","diligenceAction":"Compare only structures that have been reviewed in both Japan and the investor home jurisdiction."}
        ],
        "decisionGates":[
          {"title":"Owner classification","evidence":"Written confirmation of tax residence, owner type, permanent-establishment position and treaty assumptions.","passCondition":"The model and filing calendar use one reviewed ownership fact pattern."},
          {"title":"Lifecycle tax schedule","evidence":"Acquisition, annual, rental-income, withholding and exit calculations with payment dates and responsible parties.","passCondition":"Base and downside returns include every identified cash tax and professional fee."},
          {"title":"Administration readiness","evidence":"Tax representative, recordkeeping, payer communication and annual filing scope agreed before income begins.","passCondition":"No filing or withholding obligation lacks an owner, deadline or evidence source."}
        ],
        "checklist":["Investor tax residence and entity documents","Japan and home-country treaty review","Written acquisition-tax estimate","Fixed-asset tax and annual compliance estimate","Lease-payer withholding analysis","Tax representative appointment process","Exit and repatriation tax scenario"],
        "faqs":[
          {"question":"Is 20.42% always the final tax on Japanese rent?","answer":"No. The NTA page describes withholding in a defined non-resident rental example and settlement through a final return. The actual result depends on the payer, investor, deductions, treaty and filing facts."},
          {"question":"Can the buyer use a generic percentage for closing taxes?","answer":"Use a generic range only for an early screen. A decision model should use the asset value, land/building allocation, ownership form and current local calculations reviewed by professionals."}
        ],
        "methodology":{"purpose":"Prevent foreign-property models from presenting pre-tax cash flow as investor return.","process":"Paradigm converts official MLIT tax categories and NTA non-resident guidance into a lifecycle cash-flow and responsibility checklist.","limitations":"This is not a tax opinion. Rates, valuation bases, exemptions, treaties and taxpayer facts change and require licensed professional confirmation.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"mlit-tax-outline","title":"Outline of tax system for Land Economy and Construction and Engineering Industry Bureau","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/totikensangyo/totikensangyo_fr5_000025.html","accessedAt":"2026-08-02"},
          {"id":"nta-rental-income","title":"Real estate income of non-residents","publisher":"National Tax Agency Japan","url":"https://www.nta.go.jp/english/taxes/individual/12014.htm","accessedAt":"2026-08-02"},
          {"id":"mlit-transaction-law","title":"Basic information about laws concerning Japanese real estate transactions","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/report/press/totikensangyo13_hh_000003.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["buying-property-in-japan-as-a-foreigner","tokyo-multifamily-investment-due-diligence"]
      }
    },
    {
      "slug":"tokyo-multifamily-investment-due-diligence",
      "title":"Tokyo Multifamily Investment Due Diligence for Foreign Buyers",
      "summary":"An evidence and downside framework for foreign investors underwriting Tokyo rental housing, from completed comparables and rent rolls to financing, tax and exit liquidity.",
      "preview":{"category":"Residential","region":"Tokyo","assetClass":"Multifamily","decisionStage":"Underwriting","readTime":"12 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"TOKYO / MULTIFAMILY",
        "answer":"A Tokyo multifamily acquisition should advance only when completed-transaction evidence supports the basis, the rent roll is verified tenant by tenant, near-term capital expenditure is priced, and the deal remains acceptable under higher financing cost, vacancy and yen scenarios. Citywide demand narratives cannot substitute for building-level evidence.",
        "decisionQuestion":"Does this Tokyo rental asset produce a defensible net return without relying on asking-price comps or perpetual low rates?",
        "audience":["Multifamily investors","Family offices","Cross-border real-estate funds"],
        "keyFacts":[
          {"label":"Transaction basis","value":"Completed sale records are available","meaning":"MLIT transaction data includes property type, location, transaction period, size, structure and planning attributes useful for a comparable set.","sourceIds":["mlit-comps"]},
          {"label":"Financing context","value":"Policy is decided at scheduled BOJ meetings","meaning":"The BOJ uses monetary-policy operations to influence interest rates. Debt assumptions should be dated and stress-tested rather than treated as permanent.","sourceIds":["boj-policy"]},
          {"label":"Owner taxation","value":"Japanese rental income is domestic-source income","meaning":"Non-resident ownership adds withholding, filing and tax-representative workflow that must be reflected in distributable cash.","sourceIds":["nta-rent"]}
        ],
        "risks":[
          {"title":"Building-level vacancy hidden by metro averages","level":"high","whyItMatters":"Micro-location, unit mix, lease terms and building condition can diverge sharply from broad Tokyo demand indicators.","diligenceAction":"Reconcile the full rent roll to leases, deposits, arrears, move-outs and competing units within the same catchment."},
          {"title":"Deferred capex","level":"high","whyItMatters":"Elevator, waterproofing, facade, mechanical and seismic work can absorb multiple years of modeled cash flow.","diligenceAction":"Commission engineering review and include a dated capital plan in every return scenario."},
          {"title":"Rate and FX double exposure","level":"medium","whyItMatters":"Financing cost and base-currency return can move in different directions, weakening distributions or exit proceeds.","diligenceAction":"Run interest-rate and yen shocks separately and together, including refinance and hedge cost."}
        ],
        "decisionGates":[
          {"title":"Income verification","evidence":"Lease-level rent roll, bank receipts, arrears, concessions, deposits, turnover and recoverable expense records.","passCondition":"Trailing income reconciles to cash and normalized occupancy without unsupported market-rent uplift."},
          {"title":"Physical plan","evidence":"Inspection, seismic documentation, code status and ten-year capital schedule.","passCondition":"Required capex is funded and downside return remains within mandate."},
          {"title":"Exit depth","evidence":"Completed comparable sales, buyer profiles, lot size, financing availability and realistic sales costs.","passCondition":"The exit case does not require cap-rate compression or a narrower buyer pool than current evidence supports."}
        ],
        "checklist":["Completed-sale comparable set by micro-market","Tenant-by-tenant lease and payment reconciliation","Seismic, code and engineering reports","Ten-year capex reserve schedule","Debt term sheet and refinance stress","Non-resident tax and cash-repatriation workflow","Exit buyer and liquidity evidence"],
        "faqs":[
          {"question":"Is Tokyo population or rent growth enough to justify the deal?","answer":"No. Macro demand helps frame the market, but the investment requires building-level lease evidence, condition, regulation, operating costs and exit comparables."},
          {"question":"Should underwriting assume current Japanese debt cost continues?","answer":"No. Date the debt quote, model maturity and refinance, and test higher interest cost. The BOJ policy framework means rate assumptions are an input, not a constant."}
        ],
        "methodology":{"purpose":"Turn a Tokyo multifamily narrative into a building-level advance, reprice or decline decision.","process":"Paradigm combines official transaction, monetary-policy and non-resident tax sources with a rent-roll, engineering, financing and exit evidence model.","limitations":"No asset has been inspected or valued. Market, legal, tax, financing and physical facts require current third-party diligence.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"mlit-comps","title":"Supplying information on real estate transaction prices, etc.","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/totikensangyo/totikensangyo_fr5_000014.html","accessedAt":"2026-08-02"},
          {"id":"boj-policy","title":"Outline of Monetary Policy","publisher":"Bank of Japan","url":"https://www.boj.or.jp/en/mopo/outline/index.htm","accessedAt":"2026-08-02"},
          {"id":"nta-rent","title":"Real estate income of non-residents","publisher":"National Tax Agency Japan","url":"https://www.nta.go.jp/english/taxes/individual/12014.htm","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["buying-property-in-japan-as-a-foreigner","japan-real-estate-taxes-for-non-residents"]
      }
    },
    {
      "slug":"osaka-hotel-investment-due-diligence",
      "title":"Osaka Hotel and Licensed Lodging Investment Due Diligence",
      "summary":"A foreign-investor screen for Osaka hotels and lodging assets using official demand data, license-path verification, operating evidence and neighborhood-compliance risk.",
      "preview":{"category":"Hospitality","region":"Osaka","assetClass":"Hotel / lodging","decisionStage":"Pre-acquisition","readTime":"12 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"OSAKA / HOSPITALITY",
        "answer":"An Osaka lodging investment should be underwritten against the exact operating license, address and management model—not a generic tourism-growth thesis. Verify the permitted use, current city rules, room-level operating history and complaint response, then stress occupancy, ADR, labor and channel fees before assigning any value to upside.",
        "decisionQuestion":"Is this Osaka lodging asset legally operable and economically resilient under its actual license path?",
        "audience":["Hotel investors","Hospitality operators","Cross-border property funds"],
        "keyFacts":[
          {"label":"Demand evidence","value":"Visitor, spend and prefecture lodging series are available","meaning":"JNTO provides inbound arrivals, travel consumption and overnight-stay data that can segment demand by market and region.","sourceIds":["jnto-statistics"]},
          {"label":"License path","value":"Hotel, special-zone and home-sharing paths differ","meaning":"Osaka City states that paid lodging requires a permit, special-zone certification or a residential-accommodation notification, depending on the operation.","sourceIds":["osaka-lodging"]},
          {"label":"Current rule change","value":"Osaka special-zone minpaku new applications ended May 29, 2026","meaning":"A buyer must verify the existing facility status and transfer or continuation path rather than assume a fresh special-zone application remains available.","sourceIds":["osaka-lodging"]}
        ],
        "risks":[
          {"title":"License-value assumption","level":"high","whyItMatters":"A property price that assumes continued lodging use can fail if the permission, operator or facility conditions do not survive the transaction.","diligenceAction":"Obtain written regulatory confirmation tied to the exact address, operator, ownership transfer and intended operating model."},
          {"title":"Complaint and enforcement exposure","level":"high","whyItMatters":"Noise, waste, emergency response and neighborhood communication can trigger operational restrictions or enforcement.","diligenceAction":"Review complaint history, response logs, staffing, signage, waste contracts and city inspection records."},
          {"title":"Top-line tourism extrapolation","level":"medium","whyItMatters":"Prefecture arrivals do not equal property occupancy, ADR or net operating income.","diligenceAction":"Reconcile room-night sales, channel mix, cancellations, labor, cleaning, utilities and capex to bank and tax records."}
        ],
        "decisionGates":[
          {"title":"Regulatory continuity","evidence":"Permit or notification, floor plans, fire compliance, operator identity, transfer requirements and city correspondence.","passCondition":"Qualified counsel and authorities confirm the intended operation can continue after closing without an unpriced approval dependency."},
          {"title":"Property-level earnings","evidence":"At least trailing monthly occupancy, ADR, RevPAR, channel fees, labor, utilities, cleaning, repairs and cancellations reconciled to cash.","passCondition":"Normalized NOI remains positive under occupancy, ADR and labor downside cases."},
          {"title":"Community operations","evidence":"24-hour contact, response time, complaint register, waste and noise controls, and multilingual guest rules.","passCondition":"The operating plan meets current city obligations and has a funded accountable operator."}
        ],
        "checklist":["Exact lodging permit or notification and transfer memo","Fire, building and zoning compliance documents","Room-level trailing operating data","OTA contracts and channel-fee schedule","Complaint, incident and city-inspection history","Labor and cleaning capacity plan","Tourism-demand downside by source market"],
        "faqs":[
          {"question":"Can an investor assume a special-zone minpaku license for a new Osaka property?","answer":"No. Osaka City states that new applications and room-addition change applications ended on May 29, 2026. Confirm the exact current pathway with qualified local professionals and authorities."},
          {"question":"Do record inbound arrivals prove hotel profitability?","answer":"No. They establish market context only. Profitability depends on the asset license, location, room product, channel mix, labor, operating discipline, capex and acquisition basis."}
        ],
        "methodology":{"purpose":"Screen Osaka lodging investments for license continuity and property-level operating evidence before valuation upside.","process":"Paradigm maps Osaka City rules and national tourism statistics to a regulatory, operating and neighborhood diligence sequence.","limitations":"City guidance and facility status can change. This brief is not a permit opinion, appraisal, operating forecast or legal advice.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"jnto-statistics","title":"Japan Tourism Statistics","publisher":"Japan National Tourism Organization","url":"https://statistics.jnto.go.jp/en/","accessedAt":"2026-08-02"},
          {"id":"osaka-lodging","title":"Information about minpaku and other lodging facilities","publisher":"Osaka City","url":"https://www.city.osaka.lg.jp/kenko/page/0000382418.html","accessedAt":"2026-08-02"},
          {"id":"jta-accommodation","title":"Accommodation Survey","publisher":"Japan Tourism Agency","url":"https://www.mlit.go.jp/kankocho/tokei_hakusyo/shukuhakutokei.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["kyoto-ryokan-investment-due-diligence","hokkaido-resort-property-investment"]
      }
    },
    {
      "slug":"kyoto-ryokan-investment-due-diligence",
      "title":"Kyoto Ryokan and Machiya Lodging Investment Due Diligence",
      "summary":"A permit-first investment framework for Kyoto ryokan, machiya and small lodging assets covering registered use, building constraints, neighborhood operations and demand evidence.",
      "preview":{"category":"Hospitality","region":"Kyoto","assetClass":"Ryokan / machiya","decisionStage":"Pre-acquisition","readTime":"12 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"KYOTO / RYOKAN & MACHIYA",
        "answer":"A Kyoto lodging asset is investable only when its current permission, building condition, fire and planning constraints, operating history and neighborhood obligations are verified for the exact property. Heritage appeal and visitor demand can support pricing, but they cannot cure an untransferable operating model or unfunded restoration risk.",
        "decisionQuestion":"Can this Kyoto lodging property lawfully continue operating and fund the building stewardship its concept requires?",
        "audience":["Boutique hospitality investors","Heritage-property buyers","Family offices"],
        "keyFacts":[
          {"label":"Facility evidence","value":"Kyoto publishes permitted accommodation lists","meaning":"The city list identifies facility, address, operator, accommodation type and permission date, providing a starting point for property-specific verification.","sourceIds":["kyoto-list"]},
          {"label":"Operating regimes","value":"Private lodging and hotel-law operations are not interchangeable","meaning":"The national minpaku portal separates residential-accommodation notification, management, intermediary and hotel-law concepts and procedures.","sourceIds":["minpaku-portal"]},
          {"label":"Demand context","value":"Overnight stays can be segmented by prefecture and origin","meaning":"JNTO regional lodging data can test source-market concentration, but it does not replace property-level revenue records.","sourceIds":["jnto-tourism"]}
        ],
        "risks":[
          {"title":"Permission and operator mismatch","level":"high","whyItMatters":"The public facility record may identify an operator and accommodation type that cannot simply be assumed to continue after a sale.","diligenceAction":"Match registry, seller, operator, permit, plans and post-closing structure; obtain written advice on continuation or reapplication."},
          {"title":"Heritage capex uncertainty","level":"high","whyItMatters":"Traditional structures can contain hidden fire, seismic, moisture, access and conservation costs.","diligenceAction":"Use specialists experienced in Kyoto traditional buildings and price a phased restoration and code-compliance plan."},
          {"title":"Neighborhood operating friction","level":"medium","whyItMatters":"Guest noise, waste, check-in and emergency response can impair license compliance and brand value.","diligenceAction":"Review complaint history and operate staffed, multilingual prevention and response procedures."}
        ],
        "decisionGates":[
          {"title":"Permission chain","evidence":"City facility record, permit documents, approved plans, operator agreements and transaction-specific continuity advice.","passCondition":"The closing structure preserves or lawfully replaces the required operating authorization."},
          {"title":"Building stewardship","evidence":"Structural, seismic, fire, moisture, utilities and conservation review with costed schedule.","passCondition":"Immediate and recurring capex are funded without relying on unverified ADR growth."},
          {"title":"Operating proof","evidence":"Room-night, ADR, channel, cancellation, labor and guest-issue records reconciled to cash.","passCondition":"Normalized operations cover fixed costs and stewardship reserve in downside months."}
        ],
        "checklist":["Kyoto permitted-facility record match","Permit, approved plan and operator documents","Specialist traditional-building inspection","Fire and seismic compliance review","Monthly room and channel performance","Complaint and emergency-response log","Conservation and capex reserve plan"],
        "faqs":[
          {"question":"Is a Kyoto accommodation listing proof that the buyer may continue the business?","answer":"No. It is an evidence lead. The buyer must confirm the permit, operator, property and transaction-specific continuation requirements with qualified local parties."},
          {"question":"Should traditional character be valued as an automatic premium?","answer":"Only after pricing the physical and operational obligations that preserve it. Character without verified condition, permission and maintenance funding can be a liability."}
        ],
        "methodology":{"purpose":"Keep Kyoto heritage and tourism narratives subordinate to permit continuity, building facts and operating cash flow.","process":"Paradigm combines city facility records, the national lodging framework and official tourism data into an address-specific diligence model.","limitations":"The public record is not a legal opinion or current facility inspection. Verify all permissions and building facts before a transaction.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"kyoto-list","title":"List of Accommodations and Facilities","publisher":"Kyoto City","url":"https://www.city.kyoto.lg.jp/hokenfukushi/cmsfiles/contents/0000193/193116/20260131itiran_eng.pdf","accessedAt":"2026-08-02"},
          {"id":"minpaku-portal","title":"Private Lodging Business Act portal","publisher":"Japan Tourism Agency","url":"https://www.mlit.go.jp/kankocho/minpaku/","accessedAt":"2026-08-02"},
          {"id":"jnto-tourism","title":"Japan Tourism Statistics","publisher":"Japan National Tourism Organization","url":"https://statistics.jnto.go.jp/en/","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["osaka-hotel-investment-due-diligence","hokkaido-resort-property-investment"]
      }
    },
    {
      "slug":"hokkaido-resort-property-investment",
      "title":"Hokkaido Resort Property Investment Due Diligence",
      "summary":"A foreign-buyer framework for Hokkaido resort and hospitality assets covering seasonal demand, completed comparables, winter operations, remote management, tax and exit liquidity.",
      "preview":{"category":"Resort property","region":"Hokkaido","assetClass":"Hospitality / residential","decisionStage":"Underwriting","readTime":"11 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"HOKKAIDO / RESORT ASSETS",
        "answer":"A Hokkaido resort asset should be priced from season-by-season cash flow, winter-access and maintenance cost, verified planning and utility capacity, and a realistic exit buyer pool. Foreign demand and snow-market narratives are context; they are not substitutes for completed comparables, operating evidence or year-round property management.",
        "decisionQuestion":"Does the Hokkaido asset remain investable after seasonality, winter operations, remote ownership and exit depth are fully priced?",
        "audience":["Resort-property investors","Hospitality operators","Lifestyle-investment buyers"],
        "keyFacts":[
          {"label":"Regional demand","value":"Official prefecture lodging series","meaning":"JNTO provides overnight-stay data by prefecture and origin, allowing investors to test source-market and seasonal concentration.","sourceIds":["jnto-regional"]},
          {"label":"Price evidence","value":"Completed transaction attributes","meaning":"MLIT transaction data supports a comparable set using location, property type, period, land or floor area, structure and planning information.","sourceIds":["mlit-prices"]},
          {"label":"Non-resident cash flow","value":"Japan rental income has local tax workflow","meaning":"Rental income from Japanese real estate is domestic-source income and can require withholding, filing and a tax representative.","sourceIds":["nta-rental"]}
        ],
        "risks":[
          {"title":"Peak-season annualization","level":"high","whyItMatters":"Multiplying peak winter rates across the year overstates occupancy and ignores shoulder-season fixed costs.","diligenceAction":"Build monthly room or lease economics using actual history and source-market-specific downside."},
          {"title":"Winter and utility capex","level":"high","whyItMatters":"Snow clearing, heating, freeze protection, roof loading, road access, water and wastewater constraints can dominate operating cost.","diligenceAction":"Obtain engineering, utility-capacity and winter-operations plans with vendor quotes and contingency."},
          {"title":"Thin exit market","level":"medium","whyItMatters":"Specialized resort assets may depend on a narrow buyer segment and volatile foreign demand.","diligenceAction":"Identify completed sales, financing availability and likely domestic and international buyer pools by lot size and use."}
        ],
        "decisionGates":[
          {"title":"Seasonal demand","evidence":"Monthly occupancy or tenancy, ADR or rent, origin mix, cancellations and channel data reconciled to cash.","passCondition":"Annual cash flow covers fixed costs and reserves without extrapolating peak season."},
          {"title":"Physical and access resilience","evidence":"Snow, heating, structural, road, utility, water, wastewater and emergency-response diligence.","passCondition":"All-season operation is feasible and funded under adverse weather assumptions."},
          {"title":"Exit and local management","evidence":"Buyer-depth evidence plus a contracted local operator with decision rights and service levels.","passCondition":"The asset can be operated remotely and sold without an unsupported liquidity premium."}
        ],
        "checklist":["Monthly source-market demand history","Completed local transaction comparables","Winter engineering and snow plan","Utility and wastewater capacity","Local management and emergency SLA","Non-resident tax workflow","Exit buyer and financing map"],
        "faqs":[
          {"question":"Does rising foreign tourism validate a Hokkaido resort purchase?","answer":"It supports a demand hypothesis, not the asset price. Test the exact catchment, season, product, access, operating cost and exit market."},
          {"question":"What is the most commonly missed operating cost?","answer":"There is no universal answer, but winter access, heating, snow management, utilities and remote maintenance deserve explicit quotes rather than a generic reserve."}
        ],
        "methodology":{"purpose":"Replace resort narrative underwriting with monthly demand, physical resilience and exit evidence.","process":"Paradigm links official tourism and transaction data to property-specific winter operations, local management, tax and liquidity gates.","limitations":"This brief does not verify land, infrastructure, environmental, planning, hospitality-license or physical facts for a specific site.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"jnto-regional","title":"Japan Tourism Statistics","publisher":"Japan National Tourism Organization","url":"https://statistics.jnto.go.jp/en/","accessedAt":"2026-08-02"},
          {"id":"mlit-prices","title":"Supplying information on real estate transaction prices, etc.","publisher":"Ministry of Land, Infrastructure, Transport and Tourism","url":"https://www.mlit.go.jp/en/totikensangyo/totikensangyo_fr5_000014.html","accessedAt":"2026-08-02"},
          {"id":"nta-rental","title":"Real estate income of non-residents","publisher":"National Tax Agency Japan","url":"https://www.nta.go.jp/english/taxes/individual/12014.htm","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["osaka-hotel-investment-due-diligence","buying-property-in-japan-as-a-foreigner"]
      }
    },
    {
      "slug":"japan-data-center-investment",
      "title":"Japan Data Center Investment: Site and Policy Due Diligence",
      "summary":"A site-selection and policy-risk brief for foreign data-center investors covering power, communications, resilience, regional concentration, community execution and FDI screening.",
      "preview":{"category":"Digital infrastructure","region":"Japan","assetClass":"Data centers","decisionStage":"Site selection","readTime":"13 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / DIGITAL INFRASTRUCTURE",
        "answer":"A Japanese data-center opportunity should advance only when grid capacity and delivery timing, fiber diversity, hazard resilience, water and cooling design, land control, community approvals and customer demand are evidenced together. National policy supports resilient and more distributed infrastructure, but policy direction does not guarantee power, permits, economics or FDI clearance for a site.",
        "decisionQuestion":"Does the proposed Japanese data-center site have executable power, network, resilience and regulatory pathways?",
        "audience":["Infrastructure funds","Data-center developers","Hyperscale and colocation investors"],
        "keyFacts":[
          {"label":"Policy direction","value":"Greater geographic distribution is an explicit topic","meaning":"METI and MIC discuss correcting concentration in Tokyo and Osaka while strengthening resilient digital infrastructure and international data-distribution functions.","sourceIds":["meti-dc"]},
          {"label":"Power dependency","value":"Electricity and telecom planning must be coordinated","meaning":"Japan's energy policy materials highlight uneven data-center power demand and the timing mismatch between data-center construction and decarbonized power development.","sourceIds":["meti-energy"]},
          {"label":"Foreign investment","value":"Designated-sector screening may apply","meaning":"MOF publishes FEFTA laws, orders, designated sectors and exemption conditions that require transaction-specific screening.","sourceIds":["mof-fdi"]}
        ],
        "risks":[
          {"title":"Power promise without deliverable date","level":"high","whyItMatters":"A nominal grid connection or policy aspiration may not provide required capacity on the construction and customer schedule.","diligenceAction":"Obtain utility-backed capacity, substation, reinforcement, curtailment and energization milestones with dependencies."},
          {"title":"Resilience concentration","level":"high","whyItMatters":"Power, fiber, hazard and supply-chain dependencies can share hidden common failure points.","diligenceAction":"Map independent routes and failure domains for grid, generation, fiber, water, access and critical equipment."},
          {"title":"Screening and community timeline","level":"medium","whyItMatters":"FDI review, land use, environmental, noise, water and local acceptance can alter control rights and schedule.","diligenceAction":"Run legal screening and stakeholder mapping before land becomes non-refundable."}
        ],
        "decisionGates":[
          {"title":"Power and network","evidence":"Utility studies, energization schedule, tariff, redundancy, fiber carriers, physical routes and latency targets.","passCondition":"Capacity and diversity are contractible on the customer-ready schedule under base and delay cases."},
          {"title":"Site resilience","evidence":"Hazard, geotechnical, flood, seismic, water, cooling, access, fuel and supply-chain analysis.","passCondition":"No common-mode failure or unpriced mitigation exceeds the investment mandate."},
          {"title":"Regulatory and commercial path","evidence":"FEFTA memo, land and permit pathway, community plan, anchor demand and phased capacity economics.","passCondition":"The project has a lawful control structure and phased demand supports committed capital."}
        ],
        "checklist":["Utility capacity and energization evidence","Independent fiber-route survey","Hazard and common-mode failure map","Water and cooling design","FEFTA transaction-screening memo","Land, permit and community pathway","Phased customer demand and capex model"],
        "faqs":[
          {"question":"Does government support for regional data centers make a site bankable?","answer":"No. It supports the strategic thesis. Bankability still requires site-specific power, network, permits, resilience, customers, construction cost and an executable transaction structure."},
          {"question":"When should FEFTA screening start?","answer":"Before transaction terms or control rights are fixed. Qualified counsel should map the investor, target activities, ownership and designated-sector rules early."}
        ],
        "methodology":{"purpose":"Screen digital-infrastructure sites before land and grid commitments lock in hidden dependencies.","process":"Paradigm translates METI, MIC and MOF policy into site-level power, network, resilience, regulatory and demand evidence gates.","limitations":"Policy sources do not confirm a particular utility connection, permit, customer, site condition or FDI outcome.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"meti-dc","title":"Interim Report 3.0 on the Development of Digital Infrastructures","publisher":"Ministry of Economy, Trade and Industry","url":"https://www.meti.go.jp/english/press/2024/1004_001.html","accessedAt":"2026-08-02"},
          {"id":"meti-energy","title":"Cabinet Decision on the Energy White Paper 2025","publisher":"Ministry of Economy, Trade and Industry","url":"https://www.meti.go.jp/english/press/2025/0613_002.html","accessedAt":"2026-08-02"},
          {"id":"mof-fdi","title":"Foreign Direct Investment Laws and Regulations","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/english/policy/international_policy/fdi/Laws_and_Regulations/index.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-foreign-direct-investment-screening","japan-renewable-energy-investment"]
      }
    },
    {
      "slug":"japan-renewable-energy-investment",
      "title":"Japan Renewable Energy Investment: FIT, FIP and Project Due Diligence",
      "summary":"A project-screening brief for foreign renewable-energy investors covering support-scheme eligibility, grid and market exposure, land, permits, community obligations and policy-change risk.",
      "preview":{"category":"Energy infrastructure","region":"Japan","assetClass":"Renewable power","decisionStage":"Project screening","readTime":"12 min","sourceCount":2},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / RENEWABLE POWER",
        "answer":"A Japanese renewable project should be valued from its exact technology, capacity, commissioning date, FIT or FIP status, grid terms, land rights, permits, curtailment exposure and operating history. National support exists, but prices and eligibility are category- and year-specific; no project should inherit a generic tariff or policy assumption.",
        "decisionQuestion":"Are the project's support scheme, grid rights, land, permits and downside revenue proven for this exact facility?",
        "audience":["Renewable infrastructure funds","Project developers","Energy-transition investors"],
        "keyFacts":[
          {"label":"Scheme specificity","value":"FIT and FIP treatment varies by technology and scale","meaning":"METI publishes category, size, bidding and year-specific treatment. The project's documentary status must match the modeled revenue mechanism.","sourceIds":["meti-renewable-2026"]},
          {"label":"Annual change","value":"Prices and scheme details are reset through official decisions","meaning":"METI's renewable-energy releases show that purchase prices, bidding and other scheme details are set for fiscal-year cohorts.","sourceIds":["meti-renewable"]},
          {"label":"System cost context","value":"The surcharge is not project revenue","meaning":"The national renewable surcharge reflects system-level cost recovery and should not be substituted for facility tariff, premium or merchant-price evidence.","sourceIds":["meti-renewable-2026"]}
        ],
        "risks":[
          {"title":"Wrong tariff cohort or eligibility","level":"high","whyItMatters":"Using a headline rate from another technology, capacity band or commissioning cohort can invalidate the revenue model.","diligenceAction":"Tie every modeled support payment to the project's approval, accreditation, contract and commissioning evidence."},
          {"title":"Grid and curtailment exposure","level":"high","whyItMatters":"Connection cost, output control, congestion and imbalance can reduce delivered energy and cash flow.","diligenceAction":"Review utility agreement, grid studies, historical curtailment, forecasting and balancing responsibility."},
          {"title":"Land and community continuity","level":"medium","whyItMatters":"Land rights, drainage, decommissioning, local benefit and environmental obligations can outlive construction.","diligenceAction":"Audit the full land-right chain, permits, community commitments, restoration security and transfer consents."}
        ],
        "decisionGates":[
          {"title":"Revenue entitlement","evidence":"Accreditation, tariff or premium status, offtake, market route, commissioning and compliance records.","passCondition":"The modeled revenue maps to enforceable project documents for the full forecast period."},
          {"title":"Grid and production","evidence":"Connection, curtailment, metering, resource assessment, degradation, outage and operating history.","passCondition":"P50 and downside generation reflect actual grid and plant constraints."},
          {"title":"Land, permits and end-of-life","evidence":"Land rights, permits, environmental conditions, local agreements, transfer consents and decommissioning plan.","passCondition":"Control and compliance survive acquisition and end-of-life obligations are fully funded."}
        ],
        "checklist":["FIT/FIP accreditation and cohort evidence","Grid connection and curtailment records","Offtake or market-access contracts","Independent production assessment","Land-right and permit chain","Community and environmental commitments","Decommissioning and restoration security"],
        "faqs":[
          {"question":"Can an investor use the latest published FIT price for an existing project?","answer":"No. Existing-project economics depend on the project's own technology, scale, approval, commissioning cohort, contract and compliance history."},
          {"question":"Is a project low risk because it has FIT or FIP support?","answer":"No. Support may reduce part of revenue risk, but grid, production, counterparty, land, permit, equipment, operating and transfer risks remain."}
        ],
        "methodology":{"purpose":"Prevent policy headlines from replacing project-document and grid diligence.","process":"Paradigm converts current METI scheme publications into revenue-entitlement, grid, production, land and end-of-life gates.","limitations":"This brief does not confirm a project's accreditation, tariff, grid agreement, permits, production or legal transferability.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"meti-renewable","title":"Renewable Energy in Japan","publisher":"Ministry of Economy, Trade and Industry","url":"https://www.meti.go.jp/english/policy/energy_environment/renewable/","accessedAt":"2026-08-02"},
          {"id":"meti-renewable-2026","title":"FY2026 onward FIT and FIP purchase prices and FY2026 surcharge","publisher":"Ministry of Economy, Trade and Industry","url":"https://www.meti.go.jp/press/2025/03/20260319004/20260319004.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-data-center-investment","japan-foreign-direct-investment-screening"]
      }
    },
    {
      "slug":"japan-sme-acquisition-due-diligence",
      "title":"Japan SME Acquisition Due Diligence for Foreign Buyers",
      "summary":"A buyer-side evidence framework for acquiring a Japanese SME, covering advisor conflicts, normalized earnings, owner dependence, liabilities, transferability and post-close operating control.",
      "preview":{"category":"Private markets","region":"Japan","assetClass":"SME acquisition","decisionStage":"Deal screening","readTime":"13 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / SME ACQUISITION",
        "answer":"A foreign buyer should treat a Japanese SME acquisition as an operating transition, not only a valuation exercise. Advance only after advisor roles and fees are transparent, earnings and liabilities reconcile to evidence, licenses and customer relationships can transfer, the seller's tacit knowledge is captured, and a bilingual 100-day control plan is funded.",
        "decisionQuestion":"Can the target transfer its earnings, licenses, relationships and operating knowledge to a foreign owner without hidden dependency?",
        "audience":["Search funds","Private-equity buyers","Strategic acquirers","Family offices"],
        "keyFacts":[
          {"label":"Process standard","value":"SME Agency M&A Guidelines, third edition","meaning":"The official framework addresses safe SME M&A and the conduct of support providers; buyers should map advisor role, fee and conflict disclosures to it.","sourceIds":["smea-guideline"]},
          {"label":"Advisor verification","value":"Registered support-provider database","meaning":"Japan's M&A Support Institution Registration System provides an official starting point for checking participating support providers.","sourceIds":["smea-register"]},
          {"label":"Foreign-control review","value":"FEFTA screening can be transaction-specific","meaning":"Ownership in designated sectors can require prior notification or other analysis under the published foreign-investment regime.","sourceIds":["mof-screening"]}
        ],
        "risks":[
          {"title":"Owner-dependent earnings","level":"high","whyItMatters":"Customer trust, pricing, technical judgment and staff retention may reside with the selling owner rather than the company.","diligenceAction":"Map owner tasks, customer relationships and approvals; contract a documented transition with measurable knowledge transfer."},
          {"title":"Advisor conflict and opaque fees","level":"high","whyItMatters":"An intermediary's role, dual representation, success fee and incentives can affect process quality and negotiation.","diligenceAction":"Document representation, fee basis, referral economics, conflict controls and buyer-side independent counsel."},
          {"title":"Unrecorded operating liabilities","level":"medium","whyItMatters":"Employment practices, guarantees, tax, environmental, product, data and compliance issues may not appear in headline EBITDA.","diligenceAction":"Run financial, tax, legal, labor, commercial, technology and operational diligence with indemnity and escrow strategy."}
        ],
        "decisionGates":[
          {"title":"Earnings quality","evidence":"Bank, tax, ledger, customer, supplier and payroll reconciliation plus normalized owner compensation and one-offs.","passCondition":"Normalized cash earnings are repeatable without unsupported add-backs or customer concentration assumptions."},
          {"title":"Transferability","evidence":"License, lease, contract, guarantee, customer, supplier, employee and IP change-of-control review.","passCondition":"Critical rights and relationships transfer or have binding, priced remediation before closing."},
          {"title":"Post-close control","evidence":"Named Japan operator, authority matrix, bilingual reporting, cash controls, retention and 100-day plan.","passCondition":"The buyer can operate, report and intervene from day one without sole dependence on the seller."}
        ],
        "checklist":["Advisor role, registration, fee and conflict memo","Bank-tax-ledger earnings reconciliation","Customer and supplier concentration calls","License and change-of-control matrix","Labor, guarantee and contingent-liability review","Seller knowledge-transfer plan","Bilingual 100-day governance and reporting plan"],
        "faqs":[
          {"question":"Is an SME Agency-registered advisor automatically independent?","answer":"Registration is an evidence point, not a substitute for engagement review. Confirm who the advisor represents, how it is paid, whether it represents both sides and how conflicts are managed."},
          {"question":"What should a foreign buyer diligence beyond EBITDA?","answer":"Transferability of customers, licenses, people, guarantees, tacit know-how, leases, data, IP and Japan-side operating control often matters more than a single adjusted-earnings number."}
        ],
        "methodology":{"purpose":"Screen Japanese SME deals for transferable cash flow and executable post-close control.","process":"Paradigm maps SME Agency process guidance and MOF screening rules into buyer-side financial, conflict, transfer and operating-control gates.","limitations":"This is not transaction, legal, accounting, tax, valuation or M&A intermediary advice and does not assess a specific target or advisor.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"smea-guideline","title":"SME M&A Guidelines","publisher":"Small and Medium Enterprise Agency","url":"https://www.chusho.meti.go.jp/zaimu/shoukei/m_and_a_guideline.html","accessedAt":"2026-08-02"},
          {"id":"smea-register","title":"M&A Support Institution Registration System","publisher":"Small and Medium Enterprise Agency","url":"https://ma-shienkikan.go.jp/","accessedAt":"2026-08-02"},
          {"id":"mof-screening","title":"Foreign Direct Investment Laws and Regulations","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/english/policy/international_policy/fdi/Laws_and_Regulations/index.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-foreign-direct-investment-screening","japan-company-setup-for-foreign-investors"]
      }
    },
    {
      "slug":"japan-startup-investment-due-diligence",
      "title":"Japan Startup Investment Due Diligence for Overseas Investors",
      "summary":"A foreign-VC decision framework for Japanese startups covering ecosystem access, customer evidence, cap table and IP, governance, financing path, cross-border scaling and FDI screening.",
      "preview":{"category":"Venture capital","region":"Japan","assetClass":"Startups","decisionStage":"Investment screening","readTime":"12 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / VENTURE INVESTMENT",
        "answer":"An overseas investor should use Japan's public startup programs and portfolios for sourcing, not as investment validation. Advance only after customer and revenue evidence, cap table, IP ownership, governance, financing needs, global expansion assumptions and any foreign-investment screening are independently verified.",
        "decisionQuestion":"Is the Japanese startup investable on company evidence rather than ecosystem endorsement or program participation?",
        "audience":["Overseas venture funds","Corporate venture capital","Family offices","Strategic investors"],
        "keyFacts":[
          {"label":"Sourcing access","value":"JETRO programs and startup portfolio","meaning":"JETRO provides startup scouting, alumni and acceleration-program access across stages and sectors; these are sourcing channels rather than diligence conclusions.","sourceIds":["jetro-startup"]},
          {"label":"Collaboration path","value":"Public cross-border ecosystem programs","meaning":"JETRO describes platforms connecting Japanese corporates and overseas companies, useful for testing partnership pathways and commercial introductions.","sourceIds":["jetro-ecosystem"]},
          {"label":"Ownership review","value":"FEFTA designated-sector analysis","meaning":"Investments involving designated or core sectors can require notification or exemption analysis based on investor, company activity and governance rights.","sourceIds":["mof-fdi-startup"]}
        ],
        "risks":[
          {"title":"Program-status halo","level":"high","whyItMatters":"Accelerator or government-program participation does not verify product-market fit, financial accuracy, IP or valuation.","diligenceAction":"Treat program status as a sourcing signal and independently validate every investment claim."},
          {"title":"Japan-only revenue mistaken for global scalability","level":"high","whyItMatters":"Domestic distribution, procurement and relationship advantages may not transfer to other markets.","diligenceAction":"Separate Japan defensibility from international repeatability and verify overseas pipeline, localization and channel economics."},
          {"title":"Governance rights trigger screening or friction","level":"medium","whyItMatters":"Board rights, information rights and sector exposure can change regulatory analysis and founder-investor operations.","diligenceAction":"Run FEFTA and governance review before issuing a term sheet with control or information provisions."}
        ],
        "decisionGates":[
          {"title":"Commercial evidence","evidence":"Customer contracts, invoices, retention, cohort, pipeline and unit-economics reconciliation by market.","passCondition":"Traction is supported by customer-level evidence and downside runway is explicit."},
          {"title":"Ownership and IP","evidence":"Cap table, options, convertibles, founder vesting, employee and contractor IP assignments, licenses and disputes.","passCondition":"The company owns or controls essential IP and the fully diluted ownership model is complete."},
          {"title":"Governance and cross-border path","evidence":"FEFTA memo, board and information rights, reporting, financing plan, foreign-market milestones and responsible operators.","passCondition":"Investment rights are lawful and the next financing and expansion plan has owners, evidence gates and cash."}
        ],
        "checklist":["Customer-level revenue and retention evidence","Fully diluted cap table and financing instruments","Founder, employee and contractor IP chain","Product, security and regulatory diligence","FEFTA sector and governance-rights memo","Japan versus overseas unit economics","Runway, milestones and next-financing downside"],
        "faqs":[
          {"question":"Does JETRO support mean a startup passed investment diligence?","answer":"No. JETRO programs can improve discovery, mentoring and connection. Investors still need independent commercial, financial, legal, technical and governance diligence."},
          {"question":"Can a minority investment require foreign-investment analysis?","answer":"Potentially. The analysis depends on the investor, ownership, target activities and rights. Qualified counsel should review the current FEFTA framework before terms are fixed."}
        ],
        "methodology":{"purpose":"Separate useful ecosystem sourcing signals from company-level investment evidence.","process":"Paradigm maps JETRO sourcing and collaboration resources plus MOF screening rules into commercial, ownership, governance and scaling gates.","limitations":"This brief does not endorse any startup, program, valuation or investment and is not venture, legal, tax or regulatory advice.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"jetro-startup","title":"JETRO Startup","publisher":"Japan External Trade Organization","url":"https://www.jetro.go.jp/en/startup/","accessedAt":"2026-08-02"},
          {"id":"jetro-ecosystem","title":"Japan's Innovation Ecosystem","publisher":"Japan External Trade Organization","url":"https://static.jetro.go.jp/en/invest/investment_environment/ecosystem/","accessedAt":"2026-08-02"},
          {"id":"mof-fdi-startup","title":"Foreign Direct Investment Laws and Regulations","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/english/policy/international_policy/fdi/Laws_and_Regulations/index.html","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-foreign-direct-investment-screening","japan-sme-acquisition-due-diligence"]
      }
    },
    {
      "slug":"japan-foreign-direct-investment-screening",
      "title":"Japan Foreign Direct Investment Screening: Investor Decision Brief",
      "summary":"An early-stage FEFTA screening workflow for overseas investors evaluating Japanese companies, designated sectors, governance rights, notification timing and transaction conditions.",
      "preview":{"category":"Regulatory diligence","region":"Japan","assetClass":"Direct investment","decisionStage":"Pre-term-sheet","readTime":"13 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / FDI SCREENING",
        "answer":"Foreign-investment screening should begin before control rights, board access, information rights and closing dates are fixed. Map the investor and ultimate controller, target activities and subsidiaries, designated or core sectors, ownership and governance rights, exemption conditions and filing timeline against current MOF materials and the 2026 amendment implementation schedule.",
        "decisionQuestion":"Could the investor, target sector or proposed rights trigger a Japanese foreign-investment filing or transaction constraint?",
        "audience":["Foreign strategic investors","Private equity","Venture investors","Infrastructure funds"],
        "keyFacts":[
          {"label":"Primary framework","value":"FEFTA laws, orders, sector notices and exemptions","meaning":"MOF publishes the legal framework and designated/core sector materials needed for transaction-specific screening.","sourceIds":["mof-laws"]},
          {"label":"Current change","value":"A 2026 FEFTA amendment was promulgated","meaning":"MOF states that the amendment adds indirect acquisitions and other higher-risk patterns and clarifies risk-mitigation measures; effective details require current counsel review.","sourceIds":["mof-amendment"]},
          {"label":"Screening lens","value":"National-security and sector impact","meaning":"Published screening factors address investor conduct, governance, technology and designated or core business activities.","sourceIds":["mof-factors"]}
        ],
        "risks":[
          {"title":"Sector mapping done from marketing copy","level":"high","whyItMatters":"Actual products, technology, customers, licenses and subsidiaries may fall within designated sectors even when the company description appears ordinary.","diligenceAction":"Map revenue, technology, data, facilities and subsidiaries to the current sector notices with qualified counsel."},
          {"title":"Rights negotiated before screening","level":"high","whyItMatters":"Board, consent, information and influence rights can affect the analysis and may require term or timing changes.","diligenceAction":"Screen the proposed rights package before term-sheet signature and make conditions precedent explicit."},
          {"title":"Amendment timing mismatch","level":"medium","whyItMatters":"Promulgation, implementing rules and effective dates can differ, so an older memo may not cover the closing date.","diligenceAction":"Date the legal analysis and refresh it immediately before signing and closing."}
        ],
        "decisionGates":[
          {"title":"Investor classification","evidence":"Investor, ultimate ownership, controllers, affiliates, state connections and investment vehicle documented.","passCondition":"Counsel can classify the investor using current rules without an unresolved ownership gap."},
          {"title":"Target and rights mapping","evidence":"Target and subsidiary activities, designated/core sectors, share percentage, board, consent, information and technology-access rights.","passCondition":"Every relevant activity and right is included in the screening memo."},
          {"title":"Filing and closing plan","evidence":"Notification or exemption conclusion, agent, documents, review period, risk mitigation, conditions precedent and long-stop date.","passCondition":"The transaction timetable and documents accommodate the required process without illegal early control."}
        ],
        "checklist":["Investor and ultimate-controller chart","Target activity and subsidiary sector map","Current designated and core sector notices","Shareholding and governance-rights term sheet","Exemption-condition analysis","Notification agent and filing calendar","2026 amendment effective-date refresh"],
        "faqs":[
          {"question":"Is FEFTA screening only for acquisitions of control?","answer":"Do not assume so. The regime can turn on shareholding, target sector, investor classification and governance or information rights. Review the actual proposed transaction."},
          {"question":"Can an investor rely on a screening memo from the start of a long process?","answer":"Not without a refresh. Target activities, rights, ownership and the law can change between first review, signing and closing."}
        ],
        "methodology":{"purpose":"Move FDI screening ahead of commercial terms so legal timing and rights are designed into the deal.","process":"Paradigm organizes current MOF legal sources into investor, target, rights and filing evidence gates for counsel and deal teams.","limitations":"Only qualified legal counsel and authorities can determine filing obligations or outcomes for a transaction. This is not legal advice.","reviewedBy":"Paradigm Japan Asset Intelligence Desk"},
        "sources":[
          {"id":"mof-laws","title":"Foreign Direct Investment Laws and Regulations","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/english/policy/international_policy/fdi/Laws_and_Regulations/index.html","accessedAt":"2026-08-02"},
          {"id":"mof-amendment","title":"Act Partially Amending the Foreign Exchange and Foreign Trade Act","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/policy/international_policy/gaitame_kawase/press_release/20260312152131.html","accessedAt":"2026-08-02"},
          {"id":"mof-factors","title":"Factors considered in foreign direct investment screening","publisher":"Ministry of Finance Japan","url":"https://www.mof.go.jp/english/policy/international_policy/fdi/gaitamehou_20200508.htm","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-data-center-investment","japan-sme-acquisition-due-diligence","japan-startup-investment-due-diligence"]
      }
    },
    {
      "slug":"japan-company-setup-for-foreign-investors",
      "title":"Japan Company Setup for Foreign Investors: Branch, Subsidiary or Validation First",
      "summary":"A foreign-investor decision brief for choosing a representative office, branch, subsidiary or staged validation path before committing to a Japanese operating entity.",
      "preview":{"category":"Market entry","region":"Japan","assetClass":"Operating company","decisionStage":"Entry structure","readTime":"12 min","sourceCount":3},
      "payload":{
        "schemaVersion":"1.0",
        "kicker":"JAPAN / OPERATING STRUCTURE",
        "answer":"Choose the lightest Japan structure that can lawfully perform the next evidence-producing activity. A representative office cannot conduct sales; a branch or subsidiary adds registration, tax, banking, employment and compliance obligations. Validate demand, regulated activities, importer or license needs and unit economics before selecting a structure that the business cannot yet operate.",
        "decisionQuestion":"Does the planned Japan entity match the activities, licenses, people and evidence the investor actually needs next?",
        "audience":["Foreign founders","Corporate expansion teams","Strategic investors","Cross-border operators"],
        "keyFacts":[
          {"label":"Entry forms","value":"Representative office, branch or subsidiary","meaning":"JETRO describes three common forms and notes that representative offices are not permitted to engage in sales activities.","sourceIds":["jetro-qa"]},
          {"label":"Setup sequence","value":"Registration is one part of a larger operating flow","meaning":"JETRO's setup flow includes FEFTA notification, registration, tax notices, bank account, licenses, office, people and residence steps.","sourceIds":["jetro-setup"]},
          {"label":"Regulated finance path","value":"Dedicated English support exists for overseas financial firms","meaning":"The FSA describes English-language administrative and setup support for overseas financial companies, underscoring that sector-specific licensing changes the entry path.","sourceIds":["fsa-support"]}
        ],
        "risks":[
          {"title":"Entity before demand evidence","level":"high","whyItMatters":"Fixed compliance, office, payroll and administration costs can begin before product, price or channel fit is demonstrated.","diligenceAction":"Define the next market evidence and test whether it can be produced through a lawful staged-validation model first."},
          {"title":"Activity-structure mismatch","level":"high","whyItMatters":"A representative office cannot be treated as a sales entity, while regulated, import or employment activities may require additional licenses and responsible parties.","diligenceAction":"Map every planned activity, contract, invoice, import, claim, hire and data flow to the selected legal structure."},
          {"title":"Banking and operations treated as post-registration details","level":"medium","whyItMatters":"Registration alone does not create bank access, accounting, payroll, tax, customer support or operating control.","diligenceAction":"Build a day-one operating checklist with named providers, lead times, documents and fallback paths."}
        ],
        "decisionGates":[
          {"title":"Activity definition","evidence":"Product, customers, contracting entity, revenue, imports, claims, licenses, people and data flows documented.","passCondition":"Counsel and tax advisors can map each activity to a lawful structure and filing path."},
          {"title":"Validation economics","evidence":"Demand, price, channel, compliance and unit-economics evidence with a go, revise or stop threshold.","passCondition":"The business has enough evidence to justify the fixed cost and obligations of the selected structure."},
          {"title":"Operating readiness","evidence":"Registration, FEFTA, tax, bank, office, payroll, insurance, accounting, license and governance owners and dates.","passCondition":"The entity can invoice, pay, report, support customers and remain compliant from launch."}
        ],
        "checklist":["Japan activity and contracting map","Representative office, branch and subsidiary comparison","Market-validation evidence and stop rules","FEFTA and sector-license screen","Tax, accounting and payroll operating plan","Banking and payment evidence path","Japan-side governance and service-provider matrix"],
        "faqs":[
          {"question":"Should every foreign company create a Japanese subsidiary before testing demand?","answer":"No. The right order depends on the activity, licenses, contracting and evidence needs. Use the lightest lawful path that produces the next decision-quality evidence."},
          {"question":"Can a representative office sell in Japan?","answer":"JETRO states that representative offices are not permitted to engage in sales activities. Confirm the exact planned activities and structure with qualified professionals."}
        ],
        "methodology":{"purpose":"Prevent entity formation from becoming a substitute for market validation and operating design.","process":"Paradigm maps JETRO and FSA setup resources into activity, evidence and day-one operations gates before structure selection.","limitations":"Entity, visa, tax, employment, banking, licensing and FEFTA requirements depend on current facts and professional advice.","reviewedBy":"Paradigm Enter & Operate Japan Desk"},
        "sources":[
          {"id":"jetro-setup","title":"Setting Up Business in Japan","publisher":"Japan External Trade Organization","url":"https://www.jetro.go.jp/en/invest/setting_up/","accessedAt":"2026-08-02"},
          {"id":"jetro-qa","title":"Investing in Japan Q&A","publisher":"Japan External Trade Organization","url":"https://www.jetro.go.jp/en/invest/setting_up/qa/","accessedAt":"2026-08-02"},
          {"id":"fsa-support","title":"FSA Support for Overseas Financial Companies","publisher":"Financial Services Agency Japan","url":"https://www.fsa.go.jp/internationalfinancialcenter/en/our-support/","accessedAt":"2026-08-02"}
        ],
        "relatedSlugs":["japan-foreign-direct-investment-screening","japan-startup-investment-due-diligence"]
      }
    }
  ]
  $investor_briefs$::jsonb) AS brief(
    slug text,
    title text,
    summary text,
    preview jsonb,
    payload jsonb
  )
)
INSERT INTO public.content_products (
  slug,
  locale,
  title,
  summary,
  content_type,
  access_model,
  price_usdc,
  network,
  preview,
  payload,
  source_url,
  license,
  version,
  is_active,
  published_at,
  updated_at
)
SELECT
  briefs.slug,
  'en',
  briefs.title,
  briefs.summary,
  'investor_brief',
  'free',
  0,
  'eip155:8453',
  briefs.preview,
  briefs.payload,
  'https://paradigmjp.com/en/japan-opportunities/invest/' || briefs.slug,
  'Paradigm API Terms; attribution required. Not investment, legal, tax, brokerage or financial advice.',
  1,
  true,
  '2026-08-02T00:00:00Z',
  '2026-08-02T00:00:00Z'
FROM briefs
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content_type = EXCLUDED.content_type,
  access_model = EXCLUDED.access_model,
  price_usdc = EXCLUDED.price_usdc,
  network = EXCLUDED.network,
  preview = EXCLUDED.preview,
  payload = EXCLUDED.payload,
  source_url = EXCLUDED.source_url,
  license = EXCLUDED.license,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active,
  published_at = EXCLUDED.published_at,
  updated_at = EXCLUDED.updated_at;

COMMENT ON INDEX public.content_products_type_locale_active_idx IS
  'Supports public content-type catalogs, sitemap generation and investor pSEO routing without exposing the table to anon users.';

COMMIT;
