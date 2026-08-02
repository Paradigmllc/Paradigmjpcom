BEGIN;

WITH expansions AS (
  SELECT *
  FROM jsonb_to_recordset($legacy_expansions$
  [
    {
      "slug":"buying-property-in-japan-as-a-foreigner",
      "chapters":[
        {"title":"Build the price case from completed transactions","lede":"The first underwriting question is not whether a foreign buyer may hold the asset, but whether the proposed basis is supported by transactions that actually completed.","paragraphs":[
            "Start with the Ministry of Land, Infrastructure, Transport and Tourism transaction-price dataset and define a comparable catchment before looking at broker narratives. Match property type, tenure, usable floor area, land area, age, structure, station access, planning controls and transaction period. Record why every included sale is comparable and why every excluded sale is not. This produces an auditable bridge from official observations to the subject price instead of a collection of nearby asking prices selected after the investment thesis was formed.",
            "Official records are a starting point rather than an automated valuation. They may be anonymized, lag the current market and omit condition, lease quality or unusual deal terms. Reconcile the official set with registry evidence, a licensed valuation or broker opinion, building inspection and current rent evidence. Apply adjustments one by one and show the unadjusted range beside the concluded basis. If the price can only be justified by aggressive renovation, rent growth or a future buyer paying a lower yield, the committee should reprice or stop before incurring full diligence cost."
          ],
          "sourceIds":["mlit-transactions"]
        },
        {"title":"Model acquisition, ownership and disposal as separate cash-flow stages","lede":"Japanese real-estate taxes and transaction costs occur at different times and on different bases, so a single closing-cost percentage is not decision-grade.","paragraphs":[
            "Create a dated sources-and-uses schedule covering the purchase price, registration and license tax, real-estate acquisition tax, brokerage, judicial scrivener and legal work, inspection, insurance, financing fees and immediate repairs. Separate land and building assumptions where the calculation requires it, and ask a qualified Japanese professional to document the current valuation bases and available relief for the actual buyer and property. Keep provisional estimates visibly marked until the professional schedule is received; otherwise a temporary screening assumption can silently become the approved investment case.",
            "Extend the model through annual fixed-asset costs, management, compliance, capital reserves and the intended disposal. A sale scenario should include sales costs, taxes reviewed for the owner, loan break or repayment costs, and the time required to remit proceeds. Compare the result in yen and in the investor's reporting currency. This lifecycle view prevents an attractive gross yield from concealing a weak distributable return and makes clear which assumptions must be refreshed if the acquisition date, ownership vehicle or planned use changes."
          ],
          "sourceIds":["mlit-land-tax","nta-nonresident-rent"]
        },
        {"title":"Design the non-resident operating chain before completion","lede":"Remote ownership succeeds only when every tax, payment, tenant and physical-property obligation has a named Japan-side owner and an escalation path.","paragraphs":[
            "Map the full operating calendar: rent collection, invoices, withholding communications, record retention, tax filings, insurance renewal, inspections, repairs, tenant notices and emergency decisions. Confirm who may receive notices and funds, who holds keys, who can approve urgent work and who reports to the beneficial owner. The National Tax Agency guidance on Japanese real-estate income for non-residents should be translated into a written workflow by the buyer's tax adviser, including the tax representative and the evidence required from payers and the property manager.",
            "Test the proposed manager against the asset rather than accepting a generic service description. The agreement should state response times, approval thresholds, arrears handling, contractor controls, monthly reporting fields and termination support. Budget the full fee stack and a realistic vacancy and repair reserve. If the ownership structure depends on a bank, payment provider or overseas approval chain that is not operational by closing, establish a tested fallback. An otherwise sound asset should not proceed while statutory or safety decisions depend on an unnamed person or an inaccessible overseas signatory."
          ],
          "sourceIds":["nta-nonresident-rent"]
        },
        {"title":"Underwrite the exit before accepting the entry price","lede":"The executable buyer pool, sale process and currency result matter as much as the initial legal ability to acquire Japanese property.","paragraphs":[
            "Identify who bought comparable assets in the official transaction evidence and which characteristics broaden or narrow the future buyer pool: lot size, tenure, age, seismic documentation, vacant possession, lease profile, financing eligibility and local management complexity. Model a marketing period and carrying costs rather than an immediate sale. The exit price should be supported by a stable or stressed yield and by completed transactions, not by assuming that the same headline growth story will still attract a foreign buyer at the end of the hold.",
            "Run at least four linked downside cases: lower rent or occupancy, unexpected capital work, a weaker yen in the investor's reporting currency, and a longer sale at a less favorable price. State the investment committee's stop threshold for each and show whether cash reserves can absorb overlapping shocks. Before signing, confirm the title and documentation package that a future buyer and lender will require and retain it during ownership. Exit readiness is therefore an operating discipline from day one, not a spreadsheet assumption added when the asset is marketed."
          ],
          "sourceIds":["mlit-transactions","mlit-land-tax"]
        }
      ]
    },
    {
      "slug":"hokkaido-resort-property-investment",
      "chapters":[
        {"title":"Separate destination demand from asset demand","lede":"Strong tourism interest in Hokkaido does not prove that a particular resort unit will achieve the occupancy, rate or season length in the seller model.","paragraphs":[
            "Use Japan National Tourism Organization regional data to establish the dated tourism context, then rebuild demand at the property's catchment and product level. Segment domestic and international guests, winter sports, green season, groups and long stays. Obtain monthly occupied nights, average daily rate, booking window, cancellations, channel mix and guest origin for the subject and a consistent competitor set. A yearly average can conceal a short peak season that must carry fixed staffing, snow, utility and maintenance costs for the full year.",
            "Verify whether the asset's physical and legal configuration matches the demand being claimed. Unit size, kitchens, parking, shuttle access, storage, food service, on-site management and license conditions change both the guest segment and achievable rate. Record the source and date of every operating benchmark and distinguish regional arrival data from property bookings. If the downside case requires demand from a new country, airline route or unproven shoulder season, treat that contribution as upside until contracts or repeated booking evidence support it."
          ],
          "sourceIds":["jnto-regional"]
        },
        {"title":"Establish basis and liquidity in a thin resort market","lede":"Resort asking prices can move faster than observable completed transactions, making comparable selection and liquidity adjustments central to the decision.","paragraphs":[
            "Build the initial price map from MLIT completed transactions by municipality, property type, land or floor area, structure, age and transaction period. Resort assets often differ in management rights, furniture, leaseback arrangements, operating restrictions and access to common facilities, so note which value elements are absent from the official record. Reconcile the result to registry documents, a current inspection and evidence for any income stream. A distant high-price sale should not be used merely because the local completed set is sparse.",
            "Measure liquidity explicitly. Count relevant completed sales by period, identify likely domestic and foreign buyer segments, estimate the time and cost to market, and test whether local lenders finance the asset type. Model an exit discount for a forced or off-season sale and a separate case in which the operator or management arrangement cannot transfer. The investment should meet its return threshold without assuming perpetual destination scarcity or a sale to another overseas buyer on identical terms."
          ],
          "sourceIds":["mlit-prices"]
        },
        {"title":"Price winter operations and infrastructure dependencies","lede":"Snow, freezing conditions, seasonal labor and transport disruption turn ordinary building assumptions into material operating and capital risks.","paragraphs":[
            "Commission property-specific engineering and operating diligence for roof and ground snow loads, freeze protection, drainage, heating, insulation, water systems, backup power, fire safety and access for guests and emergency services. Review several years of utility use, snow clearing, insurance claims and repair invoices. Confirm who maintains private roads, shared infrastructure and resort services and whether those obligations survive a change of operator. Generic building reserves are not sufficient for an asset whose highest revenue period coincides with its harshest operating conditions.",
            "Map labor, transport and supplier concentration by season. Identify staff accommodation, visa or employment dependencies, shuttle capacity, laundry, waste, food supply, maintenance contractors and the response plan for severe weather. Stress a delayed season opening, several days of access disruption and a utility-price increase while preserving safety standards. The operating plan should name decision rights and cash reserves for each case. An attractive peak-season margin is not investable if a single contractor, access road or unavailable workforce can suspend lawful operations."
          ],
          "sourceIds":["jnto-regional","mlit-prices"]
        },
        {"title":"Connect ownership, tax administration and exit control","lede":"A remote resort holding needs a documented Japanese tax and operating workflow plus a transfer plan for licenses, contracts and guest obligations.","paragraphs":[
            "Translate the National Tax Agency's non-resident rental guidance into the actual ownership facts with qualified advisers. Document who collects revenue, how withholding applies to relevant payers, who keeps Japanese records, which expenses are supported, and how returns and payments are completed. Reconcile operator statements to bank receipts and booking-channel records. The model should show cash available to the investor after local taxes, reserves, management charges and currency conversion rather than presenting operator-level gross revenue as distributable income.",
            "Before acquisition, list every right and relationship that must transfer on exit: property title, lodging permission where relevant, management agreement, booking accounts, deposits, employment obligations, supplier contracts, furniture, brand use and customer data. Confirm termination costs and access to operating history if the incumbent manager changes. Retain an organized evidence room throughout ownership. A future buyer will discount an asset if its revenue history, legal use or operating accounts cannot be separated from the seller, even when the destination remains popular."
          ],
          "sourceIds":["nta-rental","jnto-regional"]
        }
      ]
    },
    {
      "slug":"japan-company-setup-for-foreign-investors",
      "chapters":[
        {"title":"Define the next lawful evidence-producing activity","lede":"Entity selection should follow a precise activity map and a market-validation goal, not the assumption that incorporation itself creates commercial traction.","paragraphs":[
            "Write the next twelve months as observable activities: customer interviews, marketing, contracting, invoicing, importing, hiring, regulated claims, data processing and after-sales support. For each activity, identify the performing person, contracting party, location, payment path and required license or notification. JETRO's explanation of representative offices, branches and subsidiaries provides a useful starting distinction, including the limit on sales activity by a representative office, but the proposed facts still require current legal and tax review.",
            "Attach a decision threshold to the validation work. Evidence may include paid pilots, a repeatable acquisition channel, compliant product claims, distributor terms, gross margin after Japan-specific costs and a support process that customers accept. State which evidence can lawfully be collected before forming a full operating entity and which cannot. This prevents the company from choosing an expensive structure to signal commitment while leaving product, price, channel and regulatory uncertainty unresolved."
          ],
          "sourceIds":["jetro-qa"]
        },
        {"title":"Compare branch and subsidiary on execution, not labels","lede":"The right structure is the one that can perform the planned work with acceptable liability, tax, governance and administrative consequences.","paragraphs":[
            "Build a side-by-side implementation matrix using JETRO's setup flow: registration, foreign-investment procedures, tax notices, office, bank account, licenses, employment, social insurance and residence status where applicable. Add parent-company documentation, translation, notarization, responsible representatives and realistic lead times. A branch and a Japanese subsidiary differ in legal identity and governance, yet both require an executable service-provider and control model rather than registration papers alone.",
            "Compare the structures under the expected revenue, funding, losses, intellectual property, intercompany charges, dividends or remittances and eventual exit. Have Japanese and home-jurisdiction advisers review the same fact pattern so that a local optimization does not create an overseas tax or governance problem. Record the assumptions that would change the recommendation, such as obtaining a regulated license, employing a larger team or bringing in a local investor. The committee can then approve a structure and a review trigger instead of treating the choice as permanent."
          ],
          "sourceIds":["jetro-setup","jetro-qa"]
        },
        {"title":"Make banking, payroll and compliance day-one deliverables","lede":"A registered entity is not operational until it can receive funds, pay staff and vendors, account for transactions and meet every reporting deadline.","paragraphs":[
            "Create an evidence-backed readiness board covering bank and payment applications, beneficial-owner documentation, office requirements, accounting policy, invoice and expense approval, payroll, labor notices, social insurance, tax filings, insurance, privacy and customer support. Assign an owner, required documents, earliest start and fallback for each. JETRO's setup sequence makes clear that registration sits among multiple interdependent tasks; treating the remaining work as post-launch administration creates cash and compliance failures at the moment customers arrive.",
            "Test the first month before launch. Run a sample customer contract and invoice, domestic and overseas vendor payment, employee expense, payroll file, tax evidence capture, support escalation and management report. Define spending and signing authorities between Japan and the parent and ensure time zones do not block urgent action. If a bank account or license is delayed, the fallback must be lawful and documented rather than improvised through a founder's personal account or an unrelated group company."
          ],
          "sourceIds":["jetro-setup"]
        },
        {"title":"Add a sector-specific regulatory path before committing capital","lede":"Financial and other regulated businesses need a licensing and supervisory workstream that can materially change structure, staffing, systems and timing.","paragraphs":[
            "Map every product, customer promise, custody or payment flow, solicitation method and cross-border service to the relevant Japanese regulatory analysis. For overseas financial companies, the Financial Services Agency's English-language support is a current official entry point, but it does not replace counsel or guarantee authorization. Record required licenses, notifications, local responsible persons, capital, policies, systems, outsourcing controls and regulator interactions in the same critical path as incorporation.",
            "Stage spending against regulatory evidence. Early gates may include a written perimeter analysis, an accepted consultation route, a complete application plan and identified qualified personnel; later gates can release office, hiring and technology commitments. Maintain a stop case for a narrower product or partnership if the initial model is not licensable on acceptable economics. This ties entity formation to the ability to operate the actual business and avoids a compliant corporate shell that cannot deliver the service used in the investment thesis."
          ],
          "sourceIds":["fsa-support","jetro-setup"]
        }
      ]
    },
    {
      "slug":"japan-data-center-investment",
      "chapters":[
        {"title":"Treat power as a dated, deliverable project right","lede":"A data-center site has little investment value until grid capacity, connection scope, delivery date, redundancy and operating cost are evidenced for the intended load.","paragraphs":[
            "Translate the Ministry of Economy, Trade and Industry energy context into site-specific documents from the relevant utility and project team. Record requested and committed capacity, connection point, voltage, substation and line work, cost responsibility, milestones, curtailment or interruption terms and the conditions that can move the energization date. Distinguish a preliminary discussion from a binding or sufficiently advanced allocation. Model phased load rather than assuming the full critical capacity earns revenue on the real-estate completion date.",
            "Underwrite the energy bill and resilience design together. Test tariff components, demand charges, losses, backup generation, fuel logistics, storage, renewable procurement and the cost of the redundancy customers require. Establish who bears network upgrade and delay risk in the land, construction, utility and customer contracts. A lower land price cannot compensate for uncertain power delivery, and a sustainability claim should not be used in marketing until the procurement instrument, measurement boundary and reporting responsibility are documented."
          ],
          "sourceIds":["meti-energy"]
        },
        {"title":"Verify network, water, hazard and site dependencies","lede":"Resilience comes from independent systems and tested recovery paths, not from a checklist that counts multiple components sharing one failure point.","paragraphs":[
            "Map carrier routes, meet-me access, ducts, substations, water or cooling supply, drainage, fuel, roads and emergency access onto the site and surrounding infrastructure. Ask whether supposedly diverse power or fiber routes converge outside the parcel. Review flood, earthquake, liquefaction, landslide and extreme-weather evidence with qualified engineers, then connect each hazard to design levels, insurance, repair time and customer commitments. METI's data-center policy materials frame national capacity and location issues, while the asset decision still depends on this parcel-level evidence.",
            "Create a commissioning and failure-test plan before approving the design. It should cover utility loss, generator start, cooling interruption, carrier failure, fire response, control-system recovery, spare-parts availability and access during a regional event. State the tolerated outage, recovery objective and responsible operator for each customer class. Model the capital and operating cost of achieving those objectives and reject resilience features that exist only in marketing language or a single-line equipment specification."
          ],
          "sourceIds":["meti-dc","meti-energy"]
        },
        {"title":"Connect national distribution policy to local execution","lede":"Policy support for regional data-center capacity can improve the context, but it does not remove local permitting, labor, supply-chain or customer-demand risk.","paragraphs":[
            "Use METI materials to identify the policy objective, eligible location and relevant support mechanism, then verify current terms with the administering authority. Build the base investment case without an unconfirmed subsidy and disclose the milestones, domestic content or operating conditions that attach to any support. Confirm land use, building and environmental procedures, construction access, noise, generator and fuel requirements and the public bodies responsible for each. A policy announcement is not a permit, power reservation or customer contract.",
            "Assess whether the location can recruit and retain operations, electrical, mechanical, network and security personnel across every shift. Map specialist contractors, replacement equipment lead times and the logistics needed for construction and long-term maintenance. Compare these costs with the resilience and latency benefit offered to customers. Regional diversification is valuable only if the site can operate independently and if customer architecture uses the location; otherwise the project may add capital while remaining dependent on the same metropolitan systems it was intended to diversify."
          ],
          "sourceIds":["meti-dc"]
        },
        {"title":"Sequence screening, contracts and customer commitments","lede":"Foreign-investment review, land control, utility obligations, construction and customer sales must share one conditional closing and capital-release plan.","paragraphs":[
            "Screen the investor, target entities, land interests, governance rights, data-center activities and customer sectors under the current Ministry of Finance foreign-investment framework with qualified counsel. Document whether a filing, waiting period or information package is required and make the transaction timetable and agreements consistent with that advice. Do not describe the investment as cleared because a similar deal proceeded; the result depends on the actual investor, rights, business and current rules.",
            "Link major capital commitments to evidence gates: site control and title, power milestones, key permits, design completion, fixed or bounded construction pricing, operator readiness and customer contracts with credible delivery conditions. Reconcile the power and commissioning schedule in every lease or capacity reservation to avoid damages before the site can perform. The downside case should show delay cost, unused committed power, customer concentration and a slower ramp. This creates a financeable sequence instead of several independent workstreams each assuming the others will complete on time."
          ],
          "sourceIds":["mof-fdi","meti-dc"]
        }
      ]
    },
    {
      "slug":"japan-foreign-direct-investment-screening",
      "chapters":[
        {"title":"Map the investor, target and acquired rights before classifying the filing","lede":"Foreign-investment screening is fact-specific, so the analysis begins with the full ownership and control chain rather than a headline share percentage.","paragraphs":[
            "Prepare a single verified fact pack for Japanese counsel using the Ministry of Finance legal sources: every direct and indirect investor, beneficial owner, government relationship where relevant, fund manager and limited-partner control, target entity and subsidiary, business activity, listed or unlisted status, proposed percentage, board or observer right, veto, information access and contractual influence. Include parallel acquisitions and side agreements. Small economic ownership can still require analysis when governance or designated-business facts differ.",
            "Freeze a dated transaction diagram and rights schedule for the advice. Corporate-development, legal and financing teams should use the same version so that a late board right, option or investor change does not remain outside the screening analysis. Record unknowns and the owner and deadline for resolving each. The output should be a written classification and filing path for the actual transaction, not a reusable statement that the target is generally outside or inside the regime."
          ],
          "sourceIds":["mof-laws","mof-factors"]
        },
        {"title":"Test exemptions and prior-notification requirements against conduct","lede":"An exemption or different filing category should be treated as a continuing operating condition, not a convenient transaction label.","paragraphs":[
            "Have counsel assess the current statutory thresholds, designated business status, investor classification and exemption conditions using the Ministry of Finance materials. List the conduct and governance limits on which the conclusion depends, including involvement in management or access to sensitive non-public information where applicable. If the investment thesis requires influence that is inconsistent with the proposed exemption, change the filing plan or the rights before signing rather than relying on informal separation after closing.",
            "Create a compliance matrix that links every exemption condition to the shareholder agreement, board procedures, information protocol and named monitoring owner. Test proposed observer access, secondments, technical collaboration, commercial diligence and post-close integration against that matrix. Include a change-control trigger for ownership, governance and target activities. This turns a legal conclusion made at signing into an auditable control and reduces the risk that ordinary portfolio-management behavior later conflicts with the basis of the filing."
          ],
          "sourceIds":["mof-laws","mof-factors"]
        },
        {"title":"Put regulatory timing and outcomes into the transaction documents","lede":"Screening uncertainty must appear in conditions, covenants, information duties and long-stop mechanics rather than sitting outside the deal timetable.","paragraphs":[
            "Build the regulatory schedule from current counsel advice and official procedure, allowing time to prepare ownership, business and security information, respond to questions and implement any permitted mitigation. Align signing, financing availability, customer communications, employee actions and integration planning with that schedule. The Ministry of Finance amendment and legal materials should be checked again before filing because the regime, designated sectors and procedures can change during a long negotiation.",
            "Draft responsibility for filings, cooperation, information accuracy, authority communications, remedy discussions, withdrawal rights and the allocation of delay cost. Define which conditions an investor may accept without changing the economics or governance case and who approves any concession. Model a delayed, conditioned and prohibited outcome before signing. A transaction should not depend on unconditional clearance if its financing or commercial arrangements cannot survive the review period or an acceptable restriction."
          ],
          "sourceIds":["mof-amendment","mof-laws"]
        },
        {"title":"Operate a post-close screening control","lede":"The relevant facts can change after acquisition through follow-on funding, governance amendments, new business lines, reorganizations or transfers.","paragraphs":[
            "Maintain the filed transaction diagram, legal advice, authority correspondence, conditions and supporting documents in the portfolio compliance record. Before changing equity, board rights, information access, management involvement, intercompany arrangements or sensitive activities, route the proposal through a new screening check. Give the company a clear escalation contact so operational teams do not implement a rights change before counsel assesses it.",
            "Review the target's activities and the Ministry of Finance framework on a defined cadence and at every financing, acquisition or restructuring event. Test compliance with any commitments through board minutes, access logs and responsible-officer attestations rather than a generic annual certificate. Include the control in exit planning because the next buyer and acquired rights create a new fact pattern. Effective screening diligence therefore protects the transaction after closing as well as before it."
          ],
          "sourceIds":["mof-factors","mof-laws"]
        }
      ]
    },
    {
      "slug":"japan-real-estate-taxes-for-non-residents",
      "chapters":[
        {"title":"Create an acquisition tax and cost schedule for the actual property","lede":"A screening percentage is useful for comparison, but approval requires dated calculations tied to the buyer, property, assessed values and transaction structure.","paragraphs":[
            "Use the MLIT tax outline to identify the acquisition and registration categories, then obtain written calculations from qualified Japanese professionals. Separate purchase price from the valuation bases used for each tax, land from building where relevant, and tax from brokerage, registration, legal, lender, inspection, insurance and repair costs. Record the due date and payer for every item. If an exemption or reduction is assumed, keep the eligibility evidence and expiry conditions in the investment file.",
            "Reconcile the schedule to closing cash and the accounting opening balance. A deferred bill such as real-estate acquisition tax should still appear in the sources-and-uses model and liquidity reserve. Test changes in closing date, assessed value and ownership vehicle and identify which advice must be refreshed. This produces a cash requirement the investment committee can fund rather than a gross-yield model that discovers material statutory and professional costs after signing."
          ],
          "sourceIds":["mlit-tax-outline","mlit-transaction-law"]
        },
        {"title":"Separate rental withholding from the final income-tax result","lede":"The amount withheld by a payer and the owner's final Japanese tax calculation are different parts of one compliance and cash-flow process.","paragraphs":[
            "Map each tenant or rent payer, its status, payment amount, timing and the rule advised for that fact pattern. The National Tax Agency provides a non-resident rental example that includes withholding by a Japanese company, but exceptions and treaty or taxpayer details require professional confirmation. Show gross rent, withholding cash movement, deductible expenses, filing and final settlement separately. Do not present the withheld amount as either a permanent expense or a guaranteed refund without the completed calculation.",
            "Design the evidence flow from lease and bank receipt through property-manager statement, invoice archive, depreciation support and tax return. State who informs the payer, issues or obtains the relevant documents, keeps Japanese records and reconciles any withholding credit. Include the timing difference in liquidity planning. This lets the owner see distributable cash during the year and the final after-tax return without confusing payer compliance with investor liability."
          ],
          "sourceIds":["nta-rental-income"]
        },
        {"title":"Fund annual administration and property-level reserves","lede":"Non-resident ownership adds coordination cost and deadlines to the ordinary fixed-asset, operating and capital requirements of Japanese property.","paragraphs":[
            "Build an annual calendar for fixed-asset and city-planning tax where applicable, income-tax or corporate filings, tax-representative duties, bookkeeping, manager reports, insurance and statutory or building inspections. Link each deadline to a budget, accountable person and retained document. The MLIT and NTA sources establish the official categories, while the actual amounts and filings must be confirmed for the municipality, owner and use.",
            "Keep tax administration separate from physical reserves but fund both. A current tax estimate does not protect against facade, waterproofing, mechanical, seismic or tenant-turnover costs, and capital work may have distinct accounting treatment. Reconcile monthly cash to the underwritten budget and explain every variance. The return shown to investors should be after realistic management, professional and reserve costs, not the cash remaining temporarily before tax and maintenance obligations are paid."
          ],
          "sourceIds":["mlit-tax-outline","nta-rental-income"]
        },
        {"title":"Model disposal, remittance and tax-representative continuity","lede":"The exit case needs a reviewed sale calculation and an operating plan that remains effective until all Japanese obligations are completed.","paragraphs":[
            "Ask advisers to model the proposed sale price, tax basis, documented improvements, transaction costs, withholding mechanics where relevant, filing and final settlement for the actual owner. Include a slower sale, lower price and different exchange rate. The MLIT transaction-law and tax materials help identify the process categories, but the investment should rely on a current written calculation rather than extrapolating the purchase-year percentage.",
            "Define how sale proceeds reach the owner and what cash must remain in Japan for final invoices, taxes and filings. Keep the tax representative, bank or payment path, records and adviser engagement active until completion and store proof of every settlement. Compare results in yen and the reporting currency and disclose any hedge cost. An exit is not complete when title transfers if unresolved tax administration can still create cash calls or penalties for a non-resident owner."
          ],
          "sourceIds":["mlit-tax-outline","mlit-transaction-law","nta-rental-income"]
        }
      ]
    },
    {
      "slug":"japan-renewable-energy-investment",
      "chapters":[
        {"title":"Identify the revenue scheme and transferable entitlement","lede":"A renewable project must be underwritten against its current approval, contract and market route rather than a generic feed-in-tariff narrative.","paragraphs":[
            "Use the current METI renewable-energy materials to identify the project's technology, certification or approval status, tariff or premium framework where applicable, commercial-operation deadline, offtaker and settlement mechanics. Obtain the original approvals, amendments, correspondence and evidence that milestones were met. Match the legal project entity, site, capacity and equipment to the documents. Any mismatch should remain a closing condition until the authority and qualified advisers confirm the effect.",
            "Model revenue at the metered point after losses, imbalance, aggregation, market, curtailment and operating charges. Separate fixed or supported revenue from merchant exposure and show the dates on which terms expire or change. Confirm whether approvals, grid arrangements and offtake rights transfer with the shares or assets and which consents are required. A headline tariff is not bankable value if the entitlement can lapse, the project data do not match, or the buyer cannot assume the operating obligations."
          ],
          "sourceIds":["meti-renewable-2026","meti-renewable"]
        },
        {"title":"Underwrite grid capacity, curtailment and realized output together","lede":"Nameplate capacity becomes cash flow only through an available grid connection, operating plant and settlement process that perform under current rules.","paragraphs":[
            "Review the executed grid agreement, connection capacity, interconnection costs, curtailment rules, output controls, metering, outages and outstanding network work. Reconcile historical generation to resource data, equipment availability, degradation, losses and curtailed energy by period. METI's official materials establish the framework, while utility notices, meter data and operating records establish the project's realized position. Keep estimates separate from measured output.",
            "Run downside cases for lower resource, equipment downtime, grid outage, curtailment, negative or weaker market pricing where relevant and delayed repairs. Test combined events rather than one-variable sensitivities and include spare-part and contractor lead times. Debt service and distributions should be calculated from net settled energy, not theoretical production. If historical data are short or the grid treatment is changing, require additional reserves or a price adjustment instead of presenting the P50 forecast as a verified result."
          ],
          "sourceIds":["meti-renewable","meti-renewable-2026"]
        },
        {"title":"Verify land, permits, equipment and community obligations","lede":"Generation rights can be impaired by defects in site control, permitting, construction, drainage, maintenance access or local stakeholder commitments.","paragraphs":[
            "Trace title, leases, easements, access roads, cable routes and restoration obligations through the project life. Inventory national and local permits, forestry, agricultural land, environmental, development, building and safety requirements applicable to the actual site and technology with qualified counsel and engineers. Confirm that the built layout matches approvals and that drainage, slope, flood, wind, snow, seismic and fire risks are reflected in design and insurance. A valid revenue approval does not cure a land or physical-compliance defect.",
            "Inspect modules, turbines, inverters, foundations, cabling, substations, batteries and control systems as applicable and reconcile serial, warranty, service and failure records. Record community agreements, benefit payments, vegetation, noise, glare, traffic and complaint handling. Price every corrective action and identify whether a seller warranty, escrow or closing condition addresses it. The operating model should preserve safe access and local obligations even if the current contractor or sponsor exits."
          ],
          "sourceIds":["meti-renewable","meti-renewable-2026"]
        },
        {"title":"Plan transfer, repowering and end-of-life economics","lede":"The buyer needs control of approvals and operations on day one and a funded answer for degradation, repowering and removal at the end of the asset life.","paragraphs":[
            "Create a consent and transition matrix for shares or assets, certification, grid, offtake, land, financing, insurance, operations, warranties, monitoring data and bank accounts. State the sequence, responsible party and long-stop for each. Test that the incoming operator can access systems, spare parts, manuals, passwords, meter data and authority reporting immediately after closing. Retain enough purchase price or security where an essential consent or deliverable remains outstanding.",
            "Extend the model beyond the supported or contracted revenue period. Forecast degradation, major component replacement, merchant or repowering revenue, site lease expiry and decommissioning or recycling obligations under current advice. Verify whether reserves, bonds or contractual security exist and whether they are transferable and sufficient. Compare continued operation, repowering and removal at conservative prices. This prevents a high near-term yield from hiding an unfunded liability or a terminal value that depends on approvals the project does not yet hold."
          ],
          "sourceIds":["meti-renewable-2026","meti-renewable"]
        }
      ]
    },
    {
      "slug":"japan-sme-acquisition-due-diligence",
      "chapters":[
        {"title":"Control the adviser process and evidence chain","lede":"SME transactions often rely on a compact adviser network, so mandate, conflicts, fee incentives and information custody should be explicit from the first approach.","paragraphs":[
            "Use the Small and Medium Enterprise Agency guideline and registered support-organization information to diligence the intermediary or adviser, while confirming the current registration and service scope directly. Obtain the engagement terms, fee triggers, exclusivity, dual-representation position, conflict process and responsibility for verifying information. Identify which claims originate with the seller, intermediary, accountant or another source and preserve the original evidence rather than allowing a summarized information memorandum to become the only record.",
            "Set a buyer-controlled request list, data-room index, question log and versioned decision register. Material gaps and contradictory answers should have an owner and deadline and remain visible in valuation and conditions. Require licensed specialists for legal, tax, labor, environmental, technical or regulated issues outside the intermediary's scope. A friendly succession narrative can improve access, but it cannot replace independent evidence or a process that protects confidential employee, customer and personal data."
          ],
          "sourceIds":["smea-guideline","smea-register"]
        },
        {"title":"Rebuild earnings and cash flow for transferability","lede":"The central valuation question is how much normalized cash flow remains after the founder, related parties and one-off practices are replaced on arm's-length terms.","paragraphs":[
            "Reconcile several years of statutory accounts, tax returns, general ledger, bank activity, invoices and management reports. Separate recurring trading from owner compensation, personal or related-party costs, unusual subsidies, asset sales, temporary savings and underinvestment. Test revenue recognition, inventory, work in progress, receivables, bad debt, payables, accrued payroll and taxes. Every normalization should state evidence, amount, tax effect and whether the buyer can actually realize it.",
            "Convert adjusted earnings to cash by modeling working capital, maintenance capital, lease and debt obligations, taxes and the cost of professionalizing controls. Identify cash collected or expenses paid through the founder or related companies and define how those flows transfer. Price a downside in which customers pay more slowly, inventory requires funding and the founder replacement costs more than assumed. The acquisition multiple should be applied to transferable cash generation, not the most favorable version of seller-reported profit."
          ],
          "sourceIds":["smea-guideline"]
        },
        {"title":"Verify customer, workforce and supplier continuity","lede":"An SME's value may sit in relationships and tacit knowledge that are not owned by the company or documented in a contract.","paragraphs":[
            "Build customer and supplier concentration tables from invoices, receipts and contracts, then interview an approved sample under a controlled communication plan. Record renewal, termination, pricing, rebates, quality claims, personal guarantees and change-of-control terms. Identify business won through the founder personally and test whether another accountable employee can retain it. Treat unsupported pipeline and verbal commitments as upside rather than purchase-price support.",
            "Map every critical process to named employees, manuals, systems, certifications and backups. Review employment terms, overtime, social insurance, benefits, retirement obligations, contractors, disputes and succession for key licenses or responsible roles with qualified advisers. Define retention, communication, training and founder-transition plans before signing. If operations cannot continue during the founder's absence, the buyer should fund a longer transition, change the structure or reduce the price rather than assuming knowledge will transfer after closing."
          ],
          "sourceIds":["smea-guideline"]
        },
        {"title":"Integrate foreign-investment screening and post-close control","lede":"A foreign buyer must align the SME succession timetable with any applicable screening analysis, financing conditions and an executable first hundred days.","paragraphs":[
            "Give counsel a complete investor and target activity map and screen the transaction under the current Ministry of Finance framework before finalizing rights or timing. Include subsidiaries, licenses, customers, technologies, premises and governance terms. Put required filings, cooperation and acceptable outcomes into the conditions and long-stop provisions. Do not rely on the company's small size as evidence that screening is irrelevant.",
            "Turn diligence findings into a day-one and hundred-day control plan for cash, payments, accounting close, cybersecurity, data access, customer commitments, safety, payroll, licenses and board reporting. Assign each remediation, cost and deadline and reconcile the plan to the investment model. Preserve the founder's useful relationships without leaving unbounded authority or undocumented payments. The deal should close only when regulatory timing, business continuity and control transfer can occur in one coordinated sequence."
          ],
          "sourceIds":["mof-screening","smea-guideline"]
        }
      ]
    },
    {
      "slug":"japan-startup-investment-due-diligence",
      "chapters":[
        {"title":"Distinguish ecosystem visibility from company evidence","lede":"Accelerator participation, awards and policy attention can improve sourcing, but they do not verify product demand, economics or execution.","paragraphs":[
            "Use JETRO startup and ecosystem resources to understand programs, hubs and market context, then trace every company claim to primary records. Create a claim ledger for customers, revenue, users, partnerships, grants, intellectual property and regulatory status, showing the source, period and verification owner. A logo, memorandum or pilot should not be described as recurring commercial revenue unless the contract, invoices, collection and renewal behavior support that conclusion.",
            "Benchmark the startup within its actual Japanese and cross-border category rather than the broad national funding narrative. Identify substitutes, buying authority, procurement cycle, required integration, support burden and reasons customers stopped or did not convert. Interview a controlled sample of paying, trial and lost accounts. This makes ecosystem resources a route to better questions and comparable companies, not evidence that the individual investment has reached product-market fit."
          ],
          "sourceIds":["jetro-startup","jetro-ecosystem"]
        },
        {"title":"Rebuild market validation and revenue quality","lede":"The investment case should connect a specific customer problem to repeated paid behavior, retention and unit economics after Japan-specific delivery costs.","paragraphs":[
            "Reconcile contracts, invoices, bank receipts and product data by customer and cohort. Separate recurring, usage, services, hardware, channel and related-party revenue; identify free periods, rebates, acceptance conditions, implementation work and cancellation rights. Calculate gross margin after cloud, support, payment, localization, distribution and compliance costs. Report concentration and renewal dates so a single enterprise pilot is not presented as a diversified annual run rate.",
            "Test the acquisition model using dated funnel evidence: qualified opportunities, decision makers, cycle length, conversion, onboarding, activation, retention, expansion and churn. Compare founder-led sales with the proposed scalable motion and price the Japanese relationship and support work that cannot be automated. Build a downside case with slower procurement, a lower conversion rate and delayed collections. Release growth capital against observed milestones rather than a top-down market share applied to a large ecosystem estimate."
          ],
          "sourceIds":["jetro-ecosystem","jetro-startup"]
        },
        {"title":"Verify cap table, governance, intellectual property and compliance","lede":"A promising product is not investable when ownership, decision rights, code and regulated obligations cannot be proven and transferred.","paragraphs":[
            "Reconcile the corporate registry, shareholder ledger, investment agreements, options, convertible instruments, side letters, board approvals and promised grants into a fully diluted cap table. Model the proposed round, preference stack, anti-dilution, reserved matters, information rights and future financing. Confirm that founders, employees and contractors assigned relevant intellectual property and that key open-source, data and model inputs can be used commercially.",
            "Map privacy, cybersecurity, consumer, employment, advertising and sector-specific obligations to products and data flows with qualified advisers. Inspect security incidents, access controls, vendor dependencies, customer commitments and remediation cost. Governance should give the investor timely evidence and protection without granting rights that conflict with the operating plan or foreign-investment analysis. Any unresolved ownership or compliance issue should affect conditions, valuation and use of proceeds rather than becoming an undocumented post-close task."
          ],
          "sourceIds":["jetro-startup","mof-fdi-startup"]
        },
        {"title":"Plan foreign-investment review, follow-on capital and exit","lede":"The initial investment must fit the current screening framework and a financing path that remains workable through later rounds and strategic outcomes.","paragraphs":[
            "Provide counsel with the direct and indirect investors, beneficial ownership, target and subsidiary activities, technology, customers, proposed percentage and governance or information rights. Screen those facts under the current Ministry of Finance foreign-investment framework and place any filing and waiting period into the round timetable. Reassess the position when new investors, rights, acquisitions or business lines are proposed; an early-stage conclusion should not be treated as permanent.",
            "Build an eighteen-to-twenty-four-month cash and milestone plan with hiring, product, compliance, sales and contingency uses. Model a delayed next round and identify actions that preserve the core business without destroying customer service or regulatory readiness. Understand preference outcomes and realistic acquirers rather than assigning an unsupported terminal multiple. The round should finance measurable de-risking and preserve an executable follow-on or exit path, not merely extend runway while the same evidence gaps remain."
          ],
          "sourceIds":["mof-fdi-startup","jetro-ecosystem"]
        }
      ]
    },
    {
      "slug":"kyoto-ryokan-investment-due-diligence",
      "chapters":[
        {"title":"Verify the exact lodging permission and address","lede":"A Kyoto hospitality thesis begins with the permission, operator and premises recorded by the city, not with the seller's description of the property.","paragraphs":[
            "Use Kyoto City's maintained lodging lists and minpaku portal as official starting points, then obtain the current permit or notification and related authority correspondence for the exact address and operating entity. Match trade name, category, room or occupancy scope, responsible party and conditions to registry, floor plans and actual use. A nearby listing, historical PDF or booking-platform label is not evidence that the asset itself can lawfully operate in the proposed format.",
            "Have qualified local counsel and specialists identify which approvals, consultations, responsible managers and neighborhood procedures apply to the acquisition structure and planned operation. Determine whether a share transfer, asset transfer, renovation, brand change, room change or manager change requires consent, notice or a new process. Put each item into conditions and the opening schedule. Do not capitalize hospitality income until the buyer can demonstrate a continuous lawful path through closing and any construction."
          ],
          "sourceIds":["kyoto-list","minpaku-portal"]
        },
        {"title":"Reconcile heritage appeal with building and life-safety facts","lede":"Traditional character may support pricing, but age, access and construction can make seismic, fire, evacuation and maintenance diligence more important.","paragraphs":[
            "Commission measured surveys and qualified structural, building-services, fire and code reviews. Reconcile the registry, approved drawings and current layout, including unregistered additions or changed use. Inspect roof, timber, moisture, pests, foundations, electrical, plumbing, heating and accessibility, and document the evidence for seismic performance and evacuation. Confirm what work is permitted under heritage, streetscape or local constraints before assuming a modern guest layout can be installed.",
            "Create a phased capital plan separating work required for lawful opening, near-term reliability, guest experience and optional repositioning. Include design, authority consultation, temporary closure, specialist craft, contingencies and the revenue lost during work. Identify hidden spaces and systems that could expand scope after opening. The committee should compare return on the current compliant asset with return after renovation rather than treating the renovation premium as certain while omitting time and execution risk."
          ],
          "sourceIds":["minpaku-portal","kyoto-list"]
        },
        {"title":"Build demand from monthly room and channel evidence","lede":"Kyoto's tourism strength should be translated into the property's achievable room nights, rates, acquisition cost and seasonality.","paragraphs":[
            "Use JNTO tourism data to frame the dated national and regional demand context, then obtain the property's monthly occupied rooms, average daily rate, cancellations, guest origin, length of stay, direct share and platform commissions. Compare consistent nearby licensed products by room type and service level. Separate owner use, complimentary stays and closed inventory. A high citywide occupancy period cannot fill rooms that are offline, poorly distributed or mismatched to the intended guest.",
            "Model domestic and international segments, peak and shoulder periods, weekday performance and the effect of transport or event concentration. Price breakfast, cleaning, laundry, utilities, amenities, multilingual support, payment fees and refunds into channel-level contribution. Test a weaker inbound period and a slower direct-booking ramp while maintaining staffing and neighborhood obligations. Revenue should be supported by observable booking behavior, not an average online rate multiplied by every available night."
          ],
          "sourceIds":["jnto-tourism"]
        },
        {"title":"Design operator continuity, neighborhood control and exit","lede":"The value of a ryokan depends on people, licenses, reputation and local operations that may not transfer automatically with the building.","paragraphs":[
            "Map the manager, staff, vendors, booking accounts, guest communications, food service, waste, cleaning, emergency response and complaint process. Review employment and contractor terms, platform ownership, deposits, future reservations, reviews and personal data. Establish neighborhood communication and an escalation path that operates outside normal hours. If the current seller personally holds relationships or system access, require documented transition, training and buyer-controlled accounts before closing.",
            "Underwrite the exit to both operating and real-estate buyers. Identify what proof a future buyer will need for permission continuity, building compliance, financial history, guest liabilities and transferable systems. Model a sale after operator replacement and a case in which hospitality use pauses. Maintain a current evidence room throughout ownership and refresh the city and JNTO sources. A premium exit should follow demonstrable compliant operations and cash flow, not simply the Kyoto address or the building's aesthetic character."
          ],
          "sourceIds":["kyoto-list","minpaku-portal","jnto-tourism"]
        }
      ]
    },
    {
      "slug":"osaka-hotel-investment-due-diligence",
      "chapters":[
        {"title":"Segment Osaka demand before projecting room revenue","lede":"Official visitor and accommodation trends describe the market context, while the asset case must explain which guests choose this property at what contribution.","paragraphs":[
            "Use JNTO and Japan Tourism Agency statistics as dated reference points, then rebuild performance by month, room type, guest origin, purpose, channel and day of week. Reconcile occupied rooms and rate to the property-management system, booking channels, invoices and bank receipts. Separate cancelled, complimentary, owner, group and out-of-order inventory. A citywide increase in international visitors does not justify a subject forecast unless location, product and distribution convert that demand.",
            "Compare a stable set of licensed competitors on room size, access, service, review themes and all-in guest price, not only a portal's displayed nightly rate. Model channel commission, payment, cleaning, linen, utilities, front desk, breakfast and refund cost to derive contribution by segment. Stress a weaker inbound period, event normalization and domestic price sensitivity. The revenue case should remain viable without every room selling at the visible peak-season rate."
          ],
          "sourceIds":["jnto-statistics","jta-accommodation"]
        },
        {"title":"Verify the license path against the exact operating model","lede":"Hotel, ryokan and special-zone or other lodging routes have different requirements and should not be blended into a generic short-stay permission claim.","paragraphs":[
            "Start with Osaka's current official lodging information and obtain the permission, notification, floor plans, inspection records and authority correspondence for the premises and operator. Match room count, occupancy, reception or management arrangement, fire and building status and any conditions to the intended service. Have qualified local professionals confirm the effect of a share or asset purchase, renovation, brand change and operator replacement.",
            "Map every required consultation, document, inspection and neighbor or waste-control step to an owner and date. Keep planned design changes visibly conditional until authorities and specialists confirm the route. Put transfer or new-permission risk into the purchase agreement and opening model. A booking history cannot be capitalized if it arose under a different operator, layout or permission that the buyer cannot continue."
          ],
          "sourceIds":["osaka-lodging","jta-accommodation"]
        },
        {"title":"Underwrite neighborhood economics and operating capacity","lede":"Osaka submarkets differ in guest purpose, transport, room supply and local operating constraints, so city averages can conceal asset-level weakness.","paragraphs":[
            "Define the walk-time catchment to relevant stations and demand generators and inspect competing supply, planned openings, restaurants, retail, late-night activity and guest access with luggage. Test whether the proposed room and service concept fits that catchment. Record noise, waste, delivery, queue and emergency-access constraints and the cost of managing them. The property should earn its forecast through a clear use case rather than a broad assumption that all Osaka tourism demand is interchangeable.",
            "Build a staffing and vendor plan for every shift and occupancy level, including multilingual support, cleaning, linen, maintenance, security, food service and management cover. Reconcile wages, contractor terms and productivity to the operating forecast. Test several unavailable rooms, an equipment failure and a booking-platform suspension. A high-margin model that depends on unrealistically lean staffing or a single outsourced provider should be corrected before valuation."
          ],
          "sourceIds":["jta-accommodation","jnto-statistics"]
        },
        {"title":"Coordinate operator transition, downside reserves and exit","lede":"The buyer needs uninterrupted control of reservations, cash, safety and customer obligations even if the current operator or brand does not continue.","paragraphs":[
            "Inventory future bookings, deposits, refunds, loyalty or brand obligations, platform accounts, reviews, customer data, staff, vendor contracts, licenses, keys, system access and operating cash. Determine which items transfer and what guest communication or consent is required. Run a cutover rehearsal and require buyer-controlled bank, payment and property systems. Fund working capital and a reserve for cancellations, repairs and a slower ramp.",
            "For exit, separate real-estate value from demonstrated operating value and identify likely owner-operators, domestic groups and financial buyers. Maintain permission, inspection, capex and monthly performance records in an organized evidence room. Model a sale with the management contract terminated and a longer marketing period. The downside case should not rely on another buyer accepting unverified add-backs, platform-dependent demand or a license assumption that was never confirmed."
          ],
          "sourceIds":["osaka-lodging","jta-accommodation","jnto-statistics"]
        }
      ]
    },
    {
      "slug":"tokyo-multifamily-investment-due-diligence",
      "chapters":[
        {"title":"Construct a micro-market basis from completed sales","lede":"Tokyo is not one residential market; station access, tenure, age, unit mix and lot size must be reflected in a documented comparable bridge.","paragraphs":[
            "Use MLIT completed-transaction information to define the subject's micro-market and build a dated set by property type, transaction period, area, structure, age and planning characteristics. Preserve the unadjusted observations and explain adjustments for location, condition, lease status, land share and scale. Reconcile the official evidence with registry facts, engineering condition and a qualified valuation or broker view. Nearby asking prices can test current competition but should not replace completed-sale evidence.",
            "Measure liquidity as well as price. Identify transaction frequency, typical lot sizes, lender appetite and the domestic or foreign buyers able to acquire the asset. Model marketing time and carrying costs and test an exit at a wider yield without cap-rate compression. If the purchase basis requires an exceptional future sale, break-up strategy or redevelopment not yet permitted, isolate that value as contingent upside rather than embedding it in the core multifamily return."
          ],
          "sourceIds":["mlit-comps"]
        },
        {"title":"Reconcile every lease and fund the physical plan","lede":"Metro demand cannot compensate for an inaccurate rent roll, weak tenant documentation or deferred building work.","paragraphs":[
            "Tie each tenant to the executed lease, amendment, deposit, guarantor, move-in date, current rent, arrears, concessions, renewal and notice status, then reconcile the schedule to bank receipts and the general ledger. Separate contractual from proposed market rent and identify units held vacant, used by related parties or subject to disputes. Test turnover by unit type and nearby competing inventory. Revenue growth should follow a lawful and evidenced leasing path, not an immediate reset of every occupied unit.",
            "Commission structural, seismic, facade, waterproofing, roof, elevator, fire, mechanical, electrical and plumbing diligence and review maintenance and incident records. Build a ten-year capital schedule with timing, tax treatment where advised, contingency and units or income disrupted by each project. Reconcile reserves to the lender and investor cash-flow model. A building that meets its headline yield only before necessary work should be repriced at diligence rather than described as a stable income asset."
          ],
          "sourceIds":["mlit-comps"]
        },
        {"title":"Stress financing as a dated contract, not a permanent market condition","lede":"Japanese policy and lending terms can change during the hold, so debt cost, amortization, covenants and refinance capacity require explicit downside cases.","paragraphs":[
            "Use the Bank of Japan policy framework to date the macro context, then underwrite the actual lender term sheet: amount, rate basis, spread, fees, amortization, maturity, covenants, recourse, hedging, reserves and conditions. Align interest and principal with monthly property cash flow and acquisition costs. Do not infer permanent cheap debt from historical policy or a non-binding broker indication.",
            "Run higher base-rate and spread cases, lower valuation at refinance, weaker occupancy, capex overlap and delayed sale, both separately and together. Show the cash injection, covenant headroom and distributable income in each period. If the investor reports in another currency, add yen and hedge scenarios without assuming financing and FX move favorably together. The deal should survive a plausible refinance on its operating cash flow rather than depend on selling into a strong market before maturity."
          ],
          "sourceIds":["boj-policy"]
        },
        {"title":"Connect non-resident tax administration to exit liquidity","lede":"Distributable return depends on a working Japanese filing and payment chain during ownership and a documented tax and buyer process at sale.","paragraphs":[
            "Translate the National Tax Agency non-resident rental guidance into the actual owner and payer facts with qualified advisers. Document withholding, expense evidence, tax representative, filing calendar and cash settlement and reconcile manager statements to bank receipts. Keep tax, management, insurance and capital reserves in the distribution model. The investor should see cash after local obligations, not property-level net operating income presented as immediately remittable return.",
            "Maintain a sale-ready registry, lease, deposit, engineering, capex, tax and operating evidence room. Identify likely buyer groups and the documentation and financing they require, then model sale costs, tax reviewed for the owner, loan repayment, a longer marketing period and currency conversion. MLIT completed sales should anchor the exit range. A Tokyo liquidity narrative is not a substitute for proving that this lot size, condition and lease profile can transfer at the modeled price."
          ],
          "sourceIds":["nta-rent","mlit-comps"]
        }
      ]
    }
  ]
  $legacy_expansions$::jsonb) AS expansion(slug text, chapters jsonb)
)
UPDATE public.content_products AS product
SET payload = jsonb_set(product.payload, '{chapters}', expansion.chapters, true),
    version = product.version + 1,
    updated_at = '2026-08-03T00:00:00Z'::timestamptz
FROM expansions AS expansion
WHERE product.slug = expansion.slug
  AND product.locale = 'en'
  AND product.content_type = 'investor_brief'
  AND product.payload -> 'chapters' IS DISTINCT FROM expansion.chapters;

UPDATE public.content_products AS product
SET payload = jsonb_set(
      product.payload,
      '{sources}',
      (
        SELECT jsonb_agg(
          CASE WHEN source ->> 'id' = 'kyoto-list' THEN source || jsonb_build_object(
            'title', 'List of accommodations permitted under the Hotel Business Act',
            'url', 'https://minpakuportal.city.kyoto.lg.jp/list/list1',
            'accessedAt', '2026-08-03'
          ) ELSE source END
          ORDER BY ordinal
        )
        FROM jsonb_array_elements(product.payload -> 'sources') WITH ORDINALITY AS items(source, ordinal)
      ),
      true
    ),
    version = product.version + 1,
    updated_at = '2026-08-03T00:00:00Z'::timestamptz
WHERE product.slug = 'kyoto-ryokan-investment-due-diligence'
  AND product.locale = 'en'
  AND product.content_type = 'investor_brief'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(product.payload -> 'sources') AS source
    WHERE source ->> 'id' = 'kyoto-list'
      AND source ->> 'url' IS DISTINCT FROM 'https://minpakuportal.city.kyoto.lg.jp/list/list1'
  );

DO $$
DECLARE
  expanded_count integer;
BEGIN
  SELECT count(*) INTO expanded_count
  FROM public.content_products
  WHERE locale = 'en'
    AND content_type = 'investor_brief'
    AND slug IN (
      'buying-property-in-japan-as-a-foreigner', 'hokkaido-resort-property-investment',
      'japan-company-setup-for-foreign-investors', 'japan-data-center-investment',
      'japan-foreign-direct-investment-screening', 'japan-real-estate-taxes-for-non-residents',
      'japan-renewable-energy-investment', 'japan-sme-acquisition-due-diligence',
      'japan-startup-investment-due-diligence', 'kyoto-ryokan-investment-due-diligence',
      'osaka-hotel-investment-due-diligence', 'tokyo-multifamily-investment-due-diligence'
    )
    AND jsonb_array_length(payload -> 'chapters') = 4;

  IF expanded_count <> 12 THEN
    RAISE EXCEPTION 'expected 12 expanded legacy investor briefs, found %', expanded_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_products AS product
    CROSS JOIN LATERAL jsonb_array_elements(product.payload -> 'chapters') AS chapter(value)
    CROSS JOIN LATERAL jsonb_array_elements_text(chapter.value -> 'sourceIds') AS source_id(value)
    WHERE product.locale = 'en'
      AND product.content_type = 'investor_brief'
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(product.payload -> 'sources') AS source
        WHERE source ->> 'id' = source_id.value
      )
  ) THEN
    RAISE EXCEPTION 'investor brief chapter references an unknown source id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.content_products
    WHERE locale = 'en'
      AND content_type = 'investor_brief'
      AND payload::text LIKE '%20260131itiran_eng.pdf%'
  ) THEN
    RAISE EXCEPTION 'retired Kyoto lodging PDF URL remains in investor content';
  END IF;
END
$$;

COMMIT;
