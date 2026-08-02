# Japan Market Operator — Operating Manual v1

Owner: Paradigm Commercial Lead  
Applies to: overseas brands asking Paradigm to validate, launch, sell, or operate in Japan  
System of record: RevenueOS `sales_japan_operator_cases`, contract status from Docuseal, finance evidence from the agreed sales ledger  
External sending: human-only; the case board records approvals and results but does not send messages

## 1. Offer routing and quote discipline

Do not combine the two public offers in one quote.

| Lane | Use when | Commercial terms | Explicitly not included |
|---|---|---|---|
| Country Partner Setup | An inbound company wants a fixed Japan-facing setup or localized buyer path, without distribution rights or performance-linked operation | $15,000 setup; selected managed-operation terms under its signed scope | Territory/SKU exclusivity, distributor appointment, 10% revenue share |
| External Japan Market Operator | A consumer brand wants Paradigm to validate, launch and operate a Japan business with channel responsibility | $5,000 validation; $20,000 launch total; $2,500/month + 10% of Net Collected Japan Sales | Inventory purchase by Paradigm, guaranteed sales, unbounded legal/regulatory work |

All five outbound Wave 1 brands use `standard_operator_v1`. `custom_approved_v1` requires a written margin calculation, finance approval, expiry date and named approver before a quote is issued. A discount never silently changes deliverables, acceptance, revenue-share definitions or liability allocation.

## 2. Minimum qualification

### Hard gates

- A current, attributable signal that the brand is seeking Japan distribution, agency or market-entry support.
- No known incumbent exclusive Japan operator for the proposed SKU/channel scope.
- A real decision-maker can approve contract, inventory, media budget and product claims.
- Product gross margin and landed-cost headroom can support local operations.
- The brand can supply current product, safety, ingredient/material, test, labeling and claims documentation.
- Paradigm is not expected to buy inventory, guarantee revenue or act as importer of record by default.

### Immediate stop or specialist-review triggers

- Food, supplement, cosmetic, medical or quasi-drug claims.
- Electrical, wireless, gas, child-safety or other regulated product categories.
- Missing manufacturer identity, safety file, recall history or product-liability insurance.
- Requests to conceal seller/importer identity, evade tax/duties, bypass marketplace rules or use unsupported claims.
- A current Japan exclusive partner, open dispute, unresolved recall or materially inconsistent public information.

Regulatory screening is triage, not legal advice. Electrical and specified consumer products may require a Japan-side notifying/import business operator, conformity steps and marks before sale; see [METI Product Safety](https://www.meti.go.jp/english/policy/economy/consumer/) and [METI procedures for business operators](https://www.meti.go.jp/english/policy/economy/consumer/product_safety/pse_procedure/index.html). Entity and permit choices should be routed to appropriate professionals; see [JETRO's business setup guide](https://www.jetro.go.jp/en/invest/setting_up/guide.html).

## 3. Roles and decision rights

| Work | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Source/evidence verification | Research | Commercial Lead | Regulatory specialist | Sales Operator |
| Opportunity Memo | Strategy | Commercial Lead | Finance, Regulatory | Sales Operator |
| First-touch approval and send | Sales Operator | Commercial Lead | Research | Founder/CEO |
| Qualification and commercial fit | Commercial Lead | Founder/CEO for exceptions | Delivery, Finance | Sales Operator |
| MSA/SOW/Exclusivity | Commercial Lead | Authorized signatory | Counsel, Finance, Regulatory | Delivery |
| Paid validation | Strategy/Delivery | Delivery Lead | Finance, Regulatory | Client approver |
| Launch | Delivery Lead | Japan Operator | Client owners, vendors | Commercial Lead |
| Weekly operation | Japan Operator | Delivery Lead | Channel/CS/creative owners | Client approver |
| Monthly reconciliation | Finance | Authorized signatory | Japan Operator, client finance | Commercial Lead |
| Safety/recall incident | Japan Operator | Named incident owner in SOW | Manufacturer, importer, counsel, insurer | Affected channels/customers as approved |

One person may hold multiple roles in an early-stage case, but the external-send approver and the person who generated the memo must be named separately in the audit record whenever feasible.

## 4. Stage gates and service levels

The admin board enforces the following sequence. Entry conditions must be completed before advancing.

| Stage | Target SLA | Exit evidence |
|---|---:|---|
| Prospect intake | 1 business day | RevenueOS company, offer lane, owner and source recorded |
| Evidence verified | 2 business days | Current intent source, contact route, incumbent check and target SKU scope |
| Memo ready | 3 business days | 3-page memo with sourced comparators, landed-cost model, regulatory screen and 90-day plan |
| Human approved | 1 business day | Named reviewer has checked facts, modeled assumptions, disclaimer, subject, body and recipient |
| Permission sent | Wait 5 business days | Human-sent timestamp/route, suppression check and exact message stored; no attachment unless permitted |
| Replied | Same business day | Reply text, disposition, permission and next action recorded |
| Qualification | Within 3 business days | Revenue/margin/inventory/media/authority/rights/regulatory history confirmed |
| Validation SOW | 3 business days | MSA + $5,000 SOW, exclusions, dependencies, acceptance and Docuseal ID |
| Paid validation | 10 business days | Signed event, cleared payment and inputs; final Go/Revise/Stop report |
| Launch SOW | 5 business days | $20,000-total scope, validation credit, importer/seller/insurance/recall ownership and commitments |
| Operator contract | 5 business days | Monthly fee, revenue share, ledger, audit rights, KPIs, exclusivity, cure and transition signed |
| Active operator | Ongoing | Weekly report, monthly finance close and quarterly KPI decision |

SLA clocks pause only when the named client dependency is late. The owner records the dependency, request date, due date and restart condition in `next_action`; an informal “waiting on client” note is insufficient.

## 5. Daily operator routine

1. At 09:30 JST, sort open cases by overdue next action, reply received, signature/payment event and then stage age.
2. Clear replies and safety/compliance blockers before creating new memos.
3. Every active case must have one owner, one concrete next action and one due timestamp.
4. Complete checkboxes only after the supporting URL, memo, contract ID, payment reference or call note is in its source system.
5. Stage changes require an audit note stating what was checked, the decision, any exception and the next owner.
6. Before end of day, move stale cases to `on_hold`, `lost` or `disqualified` with a reason; do not leave them artificially active.

## 6. Outreach execution

### Pre-send control

- Reopen the evidence URL and contact route on the send date.
- Confirm the recipient is relevant and the route does not prohibit sales contact.
- Check prior contacts, opt-outs, bounces, complaints and incumbent-partner evidence.
- Use one brand-specific fact. Do not fabricate demand, Japanese customers, revenue, traffic or regulatory readiness.
- Ask only for permission to send the memo. Do not attach the memo, propose exclusivity or demand a meeting in first touch.
- Record exact subject/body, operator, date/time, route and recipient after the human send.

### Follow-up cadence

- Day 0: permission-first message.
- Day 5: one concise follow-up adding one useful Japan-specific observation.
- Day 12: final close-the-loop message.
- Then suppress for 90 days unless the brand replies or a material new signal appears.

Positive replies receive the memo within one business day. Neutral replies get one clarifying answer. Negative replies, opt-outs or objections are suppressed immediately.

## 7. Qualification call — 30 minutes

| Time | Questions | Decision evidence |
|---:|---|---|
| 0–5 | Why Japan now? What outcome and decision date? | Urgency and decision process |
| 5–10 | Current annual revenue, AOV, gross margin, repeat rate and proven channels? | Economic headroom |
| 10–15 | Launchable SKUs, MOQ, available inventory, replenishment lead time and shelf life? | Supply feasibility |
| 15–20 | Current markets, claims, tests, incidents, recalls, insurance and Japan rights? | Regulatory/rights risk |
| 20–25 | Initial media budget, retail/wholesale preferences, internal owners and approval SLA? | Execution capacity |
| 25–30 | Explain validation scope, Go/Revise/Stop gate, exclusions and next decision. | Mutual fit |

Disqualify if the brand cannot provide margin/inventory data, cannot identify a decision-maker, expects Paradigm to fund inventory, or refuses responsibility allocation. Use `on_hold` only when a specific missing item and follow-up date exist.

## 8. Paid Market Validation acceptance

The $5,000 validation must produce:

- Executive decision: Go, Revise or Stop, with the top three reasons.
- Demand and competitor evidence with source/observed dates and limitations.
- Proposed customer segment, positioning, Japanese price and priority channels.
- SKU-level landed-cost and unit-economics model with conservative/base/upside assumptions.
- Regulatory, labeling, importer/seller, product-safety and claim-risk screen.
- 90-day plan with owners, dependencies, cash requirements, milestones and stop conditions.
- Open-risk register stating which issues require counsel, testing, certification, insurer or licensed partners.

Acceptance is based on delivery and correction of material factual errors within five business days, not on agreement with a Go decision or on future sales.

## 9. Contract architecture

### MSA

Confidentiality, reusable IP versus client deliverables, approvals, warranties, data handling, subcontractors, payment, suspension, liability cap/carve-outs, dispute law/forum, force majeure and general termination.

### Phase SOW

Named SKUs/channels, deliverables, calendar, owners, client inputs, acceptance, price, tax, payment schedule, approved third-party costs, change control, pause rules and explicit exclusions.

### Operator and exclusivity addendum

- Territory, SKU, channel and cross-border carve-outs.
- Seller of record, importer of record, tax/duty and marketplace-account ownership.
- Inventory title, forecasting, stockout consequences, damaged/returned inventory and end-of-term sell-off.
- Product claims, safety file, incident reporting, recall decision, recall expense and insurance.
- Brand asset licenses, local content ownership and use after termination.
- Monthly fee, revenue-share rate, sales-ledger fields, evidence, FX convention, invoice timing and audit rights.
- Quarterly sales and execution KPIs for both parties; no one-sided exclusivity test.
- 30-day cure by default, conversion to non-exclusive, termination, data/asset handover and customer-support transition.

Counsel must review the binding versions, especially importer/product liability, consumer terms, privacy, tax, competition/exclusivity and dispute provisions.

## 10. Finance and revenue-share close

Standard operator economics are $2,500/month in advance plus 10% of Net Collected Japan Sales in arrears.

`Net Collected Japan Sales = gross cash collected for Japan-attributed orders − consumption tax − refunds − chargebacks − discounts − seller-paid duties − marketplace/payment fees expressly listed in the SOW`

Do not deduct general brand overhead, manufacturing cost, media spend, international salaries or unspecified allocations. Do not share on uncollected, cancelled or fraudulent orders. Use integer minor units and a contract-defined currency/FX source.

Monthly close:

1. Client/channel owner freezes the prior-month sales ledger by business day 5.
2. Japan Operator reconciles orders, refunds and channel statements by business day 8.
3. Client finance raises line-level objections by business day 12.
4. Paradigm issues the revenue-share statement and invoice by business day 15.
5. Corrections after close roll into the next statement with the original order/reference ID; no silent overwrites.

Required ledger fields: order ID, channel, order/collection/refund dates, currency, gross collected, tax, each permitted deduction, net collected, evidence reference and Japan-attribution rule.

## 11. Operating KPIs

### Weekly diagnostics

- Sessions/inquiries by channel, conversion rate, orders, AOV and collected sales.
- Spend, blended CAC or cost per qualified inquiry, creative/channel tests and next hypothesis.
- Refund/return/chargeback rate, top reasons and corrective owner.
- Inventory cover, stockouts, replenishment ETA and forecast risk.
- Support volume, first-response time, unresolved safety/quality issues and escalations.

### Quarterly exclusivity decision

The signed addendum sets numeric targets after validation. At minimum it measures: net collected sales, brand inventory availability, committed media spend, brand approval SLA, Paradigm reporting/execution SLA, compliance closure and unresolved customer/safety risk. Exclusivity continues only when both parties meet material commitments; otherwise use the agreed cure period and then convert to non-exclusive.

## 12. Incident and recall protocol

- Safety, injury, fire, chemical exposure, child-risk, regulator notice or repeat defect is Severity 1.
- The operator acknowledges internally immediately, pauses affected promotion/sales where contractually authorized and notifies the named brand/importer incident owner.
- Preserve product/SKU/lot/order/customer/channel evidence; do not edit or delete the original report.
- Manufacturer/importer, counsel, insurer and authorities decide required reporting, customer notice, withdrawal and recall under the signed responsibility matrix.
- No public statement, admission or “safe” claim is issued without the designated approval path, except urgent customer-safety instructions required by law or platform rules.
- Post-incident review records root cause, affected population, corrective action, owner and reopening condition.

## 13. Offboarding

Within the signed transition period: freeze new commitments; reconcile fees/refunds; export sales, support and analytics data; transfer approved creative, accounts and vendor contacts; revoke credentials; route open customer/incident cases; document inventory and sell-off; confirm deletion/retention duties; and issue a final KPI/finance statement. Exclusivity never survives termination unless the addendum expressly defines a short sell-off period.

## 14. Wave 1 execution order

1. **CHEFCLEAN** — Memo 1. Reconfirm the Japan distributor-intent listing, product/ingredient/claim scope and Japan contact route; complete the household-product regulatory and landed-cost screen before approval.
2. **HOLEN** — Memo 2. Reconfirm agency intent and wholesale route; define IP/licensing, product-category, retail/creator and localization dependencies.
3. **Little Archive / DONGJIN BEDDING** — Validate textile/children-related labeling and safety scope before any commercial promise.
4. **QURV / F.R.P. Industry** — Build a B2B hospitality/design route with freight, installation, damage/returns and project lead-time economics.
5. **B.FTER / Another Day** — Clarify materials, safety, claims and Japanese creative-retail fit before channel selection.

The first external send remains blocked until CHEFCLEAN and HOLEN each have a complete memo gate and a named human reviewer. No send is implied by completing a checkbox.
