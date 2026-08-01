import type { JapanEntryProjection } from "./japan-entry-projection"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type {
  ManualReportGap,
  ManualStrategyChapter,
  ManualStrategyEvidenceItem,
} from "./manual-japan-entry-report-types"

function sentence(value: string): string {
  const normalized = value.trim()
  return /[.!?。！？]$/.test(normalized) ? normalized : `${normalized}.`
}

function compactEvidenceText(value: string, maxLength = 280): string {
  const candidates = value
    .split(/\s*\|\s*|(?<=[.!?。！？])\s+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 12)
  const compact = [...new Set(candidates.map((part) => part.toLowerCase()))]
    .slice(0, 2)
    .map((key) => candidates.find((part) => part.toLowerCase() === key) ?? key)
    .join(" ") || value.replace(/\s+/g, " ").trim()
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength - 1).trimEnd()}…`
}

function observed(label: string, detail: string): ManualStrategyEvidenceItem {
  return { classification: "observed", label, detail: sentence(detail) }
}

function hypothesis(label: string, detail: string): ManualStrategyEvidenceItem {
  return { classification: "hypothesis", label, detail: sentence(detail) }
}

function action(label: string, detail: string): ManualStrategyEvidenceItem {
  return { classification: "recommended_action", label, detail: sentence(detail) }
}

function projectionEvidence(projection: JapanEntryProjection | null): ManualStrategyEvidenceItem {
  if (!projection) {
    return hypothesis(
      "Commercial magnitude",
      "No defensible public-visibility range was available, so this report intentionally avoids a traffic, revenue, or opportunity-loss claim",
    )
  }
  return {
    classification: "modeled",
    label: "Public-signal scenario",
    detail: `The public-signal model places monthly site visibility in a ${projection.monthlyVisitRange.low.toLocaleString("en-US")}–${projection.monthlyVisitRange.high.toLocaleString("en-US")} range. This is not first-party analytics and is not a forecast of Japan demand or revenue.`,
  }
}

function gapSummary(gaps: ManualReportGap[]): string {
  if (!gaps.length) return "The bounded public-page review did not expose a decisive Japan customer-path gap; readiness therefore remains unproven rather than confirmed."
  return `The review did not resolve ${gaps.map((gap) => gap.title.toLowerCase()).join(", ")}. These are observable content or journey gaps, not proof of lost demand.`
}

function primaryFact(profile: ManualCompanyProfile): string {
  return compactEvidenceText(profile.observedFacts.find((fact) => fact.trim().length >= 12) ?? profile.productContext, 240)
}

function countryContext(countryCode: string | null): string {
  if (!countryCode) return "The company’s operating country remains unconfirmed in the public evidence"
  try {
    const country = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode.toUpperCase()) ?? countryCode
    return `The current public-site classification points to ${country}`
  } catch (error) {
    console.warn("[manual-work-report] country display name failed:", error)
    return `The current public-site classification uses country code ${countryCode.toUpperCase()}`
  }
}

export function buildManualStrategyChapters(input: {
  profile: ManualCompanyProfile
  gaps: ManualReportGap[]
  projection: JapanEntryProjection | null
  targetSegment: string
  opportunityAngle: string
  whyNow: string
}): ManualStrategyChapter[] {
  const { profile, gaps, projection, targetSegment, opportunityAngle, whyNow } = input
  const company = profile.companyName
  const productContext = compactEvidenceText(profile.productContext)
  const product = sentence(productContext)
  const fact = sentence(primaryFact(profile))
  const gap = gapSummary(gaps)
  const commercial = profile.commercialSignals?.length
    ? profile.commercialSignals.slice(0, 2).map((signal) => sentence(compactEvidenceText(signal.sourcePhrase, 180))).join(" ")
    : "No public foreign-revenue, global-customer, funding, or operating-scale signal was strong enough to treat budget capacity as confirmed."
  const homeMarket = countryContext(profile.countryCode)

  return [
    {
      id: "executive_decision",
      number: 1,
      title: "Executive decision and investment thesis",
      executiveTakeaway: `${company} has enough product specificity for a bounded Japan validation, but the evidence does not support a full-market launch decision yet.`,
      narrative: [
        `${product} The strategic question is therefore not whether Japan is broadly attractive, but whether one defined Japanese segment can understand, trust, buy, and receive this specific offer through a workable customer journey. The recommended posture is an evidence-building sprint with explicit stop conditions, not a translation-first rollout or a country-wide sales commitment.`,
        `${homeMarket}. ${gap} That boundary matters because a missing public signal can reveal a question worth testing, but it cannot establish demand, buyer intent, conversion loss, or legal exposure. The first investment should buy decision quality: a validated segment, tested positioning, routed conversations, and documented objections.`,
        `The management decision is to authorize a narrow validation only if ${company} can assign an accountable owner, preserve the existing core offer, and accept that the result may be go, refine, or stop. Expansion capital should follow observed Japanese conversations and buying-path evidence rather than precede them.`,
      ],
      evidence: [observed("Public offer", fact), hypothesis("Operating-market classification", homeMarket), hypothesis("Japan thesis", opportunityAngle), projectionEvidence(projection)],
      actions: [
        "Name one executive owner for the Japan validation decision and one operating owner for weekly evidence capture.",
        `Approve ${targetSegment} as a hypothesis to test, not as a confirmed buyer segment.`,
        "Set a written maximum validation budget and a stop date before customer-facing work begins.",
      ],
      kpis: ["Qualified conversations", "Evidence-backed segment refinements", "Go / refine / stop decision by the agreed date"],
      decisionGate: "Proceed only when the company can treat Japan as a controlled learning investment rather than a predetermined launch.",
    },
    {
      id: "company_product_diagnostic",
      number: 2,
      title: "Company and product diagnostic",
      executiveTakeaway: `Japan positioning must preserve what ${company} demonstrably sells while translating the buying logic, not merely the words.`,
      narrative: [
        `${fact} This first-party wording is the anchor for the report. It is stronger than a generic industry label because it identifies the actual capability or workflow that a Japanese prospect would need to evaluate. Any localized claim must remain traceable to this public product context unless new evidence is supplied by ${company}.`,
        `${company} is currently classified as ${profile.businessModel} in ${profile.industry}, with SMB confidence ${profile.smbConfidence}/100 and Japan-entry-fit confidence ${profile.japanEntryFitConfidence}/100. These scores are workflow prioritization aids, not company-size verification, credit assessment, or proof that the offer will sell in Japan.`,
        `The diagnostic implication is to isolate one purchase-relevant use case, one buyer role, and one proof requirement. A broad corporate introduction would dilute the observed product strength; an over-specific outcome claim would exceed the evidence. The first Japanese proposition should therefore pair the original capability with a measurable evaluation question.`,
      ],
      evidence: [observed("Product context", productContext), observed("Observed company fact", primaryFact(profile)), hypothesis("Classification boundary", `SMB=${profile.smbStatus}; Japan fit=${profile.japanEntryFitStatus}`)],
      actions: [
        "Create a fact ledger separating public product claims, company-supplied proof, modeled estimates, and unverified hypotheses.",
        "Select one use case that can be demonstrated without changing the core product or promising an unverified outcome.",
        "Identify which proof assets a Japanese decision-maker would need and mark each as available, adaptable, or missing.",
      ],
      kpis: ["Claims with first-party evidence", "Proof assets ready for localization", "Unresolved product questions"],
      decisionGate: "Do not localize unsupported benefits; first obtain a source, remove the claim, or convert it into an explicit test hypothesis.",
    },
    {
      id: "japan_opportunity_thesis",
      number: 3,
      title: "Japan opportunity thesis and priority segment",
      executiveTakeaway: `${targetSegment} is the initial segment hypothesis because it creates a focused learning path; it is not asserted as an existing market.`,
      narrative: [
        `${opportunityAngle}. The opportunity thesis starts with product-to-problem fit and then tests country fit. It does not start with Japan population, GDP, category size, or generalized cultural assumptions, because none of those prove that this particular offer has a reachable and motivated buyer.`,
        `${whyNow} This explains why a validation can be timely without claiming urgency or competitive loss. The test should compare the current global proposition with a Japanese decision narrative that states the use case, operating consequence, proof, buying route, and support boundary in a form that can be evaluated.`,
        `Segment qualification should combine role, company context, active workflow, and ability to buy from an overseas supplier. Nationality alone is not a segment. A prospect should enter the primary test only when the use case and decision ownership are plausible enough to produce useful evidence even if the answer is no.`,
      ],
      evidence: [hypothesis("Priority segment", targetSegment), hypothesis("Opportunity angle", opportunityAngle), projectionEvidence(projection)],
      actions: [
        "Write inclusion and exclusion criteria for the initial segment before building the outreach list.",
        "Create a ten-question discovery guide that can disprove the segment hypothesis as well as support it.",
        "Separate market-interest evidence from procurement feasibility, product readiness, and channel reachability.",
      ],
      kpis: ["Segment-qualified accounts", "Problem-confirming conversations", "Disconfirming evidence captured"],
      decisionGate: "Keep the segment only if multiple independent conversations reveal a repeatable evaluation problem that the existing offer can address.",
    },
    {
      id: "customer_journey_readiness",
      number: 4,
      title: "Japan customer-journey readiness audit",
      executiveTakeaway: gap,
      narrative: [
        `A Japan customer journey must let a qualified prospect move from recognition to evaluation, trust, commercial understanding, inquiry, and handoff. The current audit only records what appeared on checked public pages. It does not test comprehension, accessibility, legal sufficiency, checkout completion, support quality, or actual buyer behavior.`,
        `${gap} The correct response is not to rebuild the entire site. Each unresolved point should become a testable journey decision: what must be visible before outreach, what can be explained during a human conversation, what requires specialist review, and what can wait until demand is observed.`,
        `For ${company}, the minimum viable journey should remain consistent with the existing ${profile.businessModel} model. It should provide a Japanese evaluation path, a clear next step, and honest boundaries around delivery and support. It should not imply a local entity, local inventory, regulated status, or Japanese customer base unless those facts are independently verified.`,
      ],
      evidence: [
        ...(gaps.length ? gaps.slice(0, 4).map((item) => observed(item.title, item.observation)) : [observed("Bounded audit", gap)]),
        action("Validation boundary", "Test comprehension and routing before investing in a complete localized journey"),
      ],
      actions: [
        "Map the current path from first page to inquiry and mark every decision a Japanese prospect must make.",
        "Build the smallest Japanese-language path that resolves the top two evidence gaps without changing unverified operating facts.",
        "Run human checks for message comprehension, trust questions, form completion, and internal routing before scale.",
      ],
      kpis: ["Journey steps with a clear owner", "Qualified form completions", "Unanswered trust or procurement questions"],
      decisionGate: "Advance the journey only when prospects can explain the offer, identify the next step, and reach the correct human without hidden assumptions.",
    },
    {
      id: "positioning_localization",
      number: 5,
      title: "Positioning, localization, and trust architecture",
      executiveTakeaway: `The Japan proposition should translate ${company}'s decision value and proof structure, not produce generic Japanese copy.`,
      narrative: [
        `${product} Localization should retain this core meaning while changing sequence, context, terminology, and proof density only where Japanese validation reveals a need. Literal translation is a production technique; it is not a positioning strategy and does not by itself create relevance or trust.`,
        `The first positioning system should contain one category statement, one primary use case, one consequence of the current workflow framed without invented loss, one proof element, and one low-friction action. Every element should be versioned so that outreach responses and conversations can refine the language rather than producing an untraceable rewrite.`,
        `Trust architecture is broader than testimonials. It includes who operates the service, what is delivered, where support begins and ends, how a buyer can evaluate the offer, and how unresolved commercial or compliance questions are handled. Missing proof should be labeled internally and either obtained or excluded from customer-facing claims.`,
      ],
      evidence: [observed("Positioning anchor", productContext), hypothesis("Localized audience", targetSegment), action("Claim discipline", "Use only verified product and operating facts in customer-facing Japanese copy")],
      actions: [
        "Draft three materially different Japanese value propositions tied to the same verified product facts.",
        "Test comprehension and relevance with qualified readers before selecting a primary version.",
        "Maintain an approved terminology and claims register for website, outreach, sales calls, and proposals.",
      ],
      kpis: ["Message comprehension", "Qualified relevance responses", "Claims rejected for insufficient evidence"],
      decisionGate: "Choose the positioning that produces the clearest verified buying conversation, not the most polished or culturally generalized wording.",
    },
    {
      id: "commercial_model",
      number: 6,
      title: "Commercial model and pricing validation",
      executiveTakeaway: `Commercial readiness for ${company} remains a separate validation problem from product interest.`,
      narrative: [
        `${commercial} These public signals help prioritize diligence but do not confirm budget, authority, procurement readiness, contractability, or willingness to pay. The Japan commercial model must be validated through real buying conversations and written operating facts.`,
        `Price localization should not be automatic. A JPY presentation can improve legibility without changing the underlying economics, but exchange-rate display, tax treatment, invoicing entity, payment timing, refunds, renewals, and support scope each require explicit confirmation. This report does not make tax, legal, or accounting determinations.`,
        `The first commercial test should separate value, price, and procurement objections. Discounting before this separation destroys evidence: a positive answer may reflect price relief rather than a repeatable business case. Use a fixed test scope, record every objection, and change only one major commercial variable at a time.`,
      ],
      evidence: [observed("Public commercial signals", commercial), hypothesis("Willingness to pay", "No company-specific Japan willingness-to-pay evidence has been observed"), action("Pricing policy", "Do not adjust price from country stereotypes or purchasing-power assumptions")],
      actions: [
        "Document the contracting entity, currency, tax-review owner, payment method, refund position, renewal treatment, and support scope.",
        "Create a commercial interview script that distinguishes value, budget, authority, timing, and procurement constraints.",
        "Define approval thresholds for discounts or scope changes and require a written reason for every exception.",
      ],
      kpis: ["Qualified price conversations", "Procurement blockers by category", "Commercial exceptions requested"],
      decisionGate: "Publish or scale a Japan commercial offer only after terms are operationally deliverable and repeated objections are understood.",
    },
    {
      id: "go_to_market",
      number: 7,
      title: "Go-to-market experiments and channel sequence",
      executiveTakeaway: `Start with controlled founder or growth-owner learning loops before committing to paid reach or broad localization.`,
      narrative: [
        `The initial route should optimize for evidence quality, not activity volume. Each account should be selected because ${company}'s verified capability connects to a plausible workflow and decision owner. A personalized first touch can request permission to share analysis, but it must not present a modeled number as observed performance or imply that a report proves demand.`,
        `Channel order should follow observability. Founder-led outreach and targeted introductions provide direct qualitative evidence; a focused Japanese page provides message and routing evidence; partner or community tests can reveal access constraints; paid acquisition should wait until the segment, proposition, and conversion event are defined.`,
        `Every experiment needs a hypothesis, eligible audience, message variant, success metric, maximum volume, stop condition, and evidence log. Reply rate alone is insufficient: routing quality, relevance objections, meeting quality, buying constraints, and reasons for no action determine whether the strategy is learning.`,
      ],
      evidence: [observed("Workbench route", "The current workflow prepares human-reviewed inquiry-form outreach and does not auto-send"), hypothesis("Primary access", "Founder or international-growth routing is the first access hypothesis"), action("Experiment discipline", "Run bounded channel tests with explicit learning goals")],
      actions: [
        "Build the first account set from segment criteria and company-specific evidence, not from a generic country list.",
        "Run small message cells with one controlled difference and preserve every outcome in Twenty.",
        "Review evidence weekly and stop channels that produce volume without qualified decision information.",
      ],
      kpis: ["Correct-person routing rate", "Qualified reply rate", "Decision-relevant objections per experiment"],
      decisionGate: "Scale a channel only when it repeatedly reaches the intended owner and produces evidence that improves a commercial decision.",
    },
    {
      id: "operating_model",
      number: 8,
      title: "Japan operating model, service boundary, and controls",
      executiveTakeaway: `${company} should define who owns Japan decisions and delivery before increasing market-facing commitments.`,
      narrative: [
        `A credible operating model connects the overseas product team, Japan-facing commercial work, customer support, contracting, finance, and specialist review. It does not require a local entity by default, and this report does not recommend or assess entity formation. It requires named owners, response standards, escalation paths, and an auditable decision record.`,
        `The minimum model should state which team answers product questions, who approves Japanese claims, who can quote commercial terms, who handles customer data, and when legal, tax, privacy, employment, or regulatory specialists must be engaged. The answer may differ by customer and use case; unresolved matters should block the affected promise rather than the entire learning program.`,
        `Service boundaries should appear consistently across the customer journey and internal playbooks. Japanese-language access without Japanese-language delivery capacity can create an expectation gap. Conversely, waiting for a fully localized organization can delay inexpensive learning. The operating design should match the exact validation promise.`,
      ],
      evidence: [hypothesis("Operating owner", "Public pages do not confirm the internal owner or Japan delivery model"), observed("Current offer model", profile.businessModel), action("Control design", "Assign owners and escalation conditions before external commitments")],
      actions: [
        "Create a RACI for product, sales, support, contracts, finance, privacy, and specialist escalation.",
        "Set Japanese inquiry response standards and document what can be answered, quoted, or promised without escalation.",
        "Review data handling, contract, tax, and sector-specific questions with qualified specialists where applicable.",
      ],
      kpis: ["Inquiry response time", "Escalations resolved within standard", "Promises blocked or corrected before delivery"],
      decisionGate: "Do not increase customer-facing volume beyond the capacity of the named operating owners and verified service boundary.",
    },
    {
      id: "roadmap_metrics",
      number: 9,
      title: "90/180-day roadmap and management dashboard",
      executiveTakeaway: `The roadmap converts ${company}'s Japan entry from a launch project into staged management decisions with measurable evidence.`,
      narrative: [
        `For ${company}, days 0–30 should establish the evidence baseline: approved claims, target-segment criteria, customer-journey gaps, operating owners, and a small account set. Days 31–90 should run bounded outreach and interview cycles, test the minimum Japanese journey, and record objections and routing outcomes. No scale assumption is required to complete this phase.`,
        `Days 91–180 should repeat only the experiments that produced qualified evidence. The team can then deepen proof, commercial terms, channel access, and delivery readiness for the strongest use case. If evidence remains fragmented, the correct outcome is refinement or stop, not a larger campaign designed to force a positive result.`,
        `The management dashboard should distinguish activity, learning, pipeline, and readiness. Activity measures work performed; learning captures what changed; pipeline records qualified commercial progression; readiness tracks whether the organization can deliver what it says. A green activity dashboard with no decision evidence is not success.`,
      ],
      evidence: [action("0–30 days", "Build the fact base, segment rules, journey prototype, and operating ownership"), action("31–90 days", "Run controlled customer and channel validation"), action("91–180 days", "Repeat proven loops and make an investment decision")],
      actions: [
        "Hold a weekly evidence review with one owner responsible for updating hypotheses and stop conditions.",
        "Maintain separate dashboards for activity, learning, qualified pipeline, and operating readiness.",
        "Make a formal day-90 and day-180 go / refine / stop decision with the evidence attached.",
      ],
      kpis: ["Qualified segment conversations", "Hypotheses confirmed or rejected", "Pipeline stage progression", "Readiness controls completed"],
      decisionGate: "Release the next tranche of time or budget only when the prior phase resolves its named decision questions.",
    },
    {
      id: "risks_recommendation",
      number: 10,
      title: "Risk register, recommendation, and next engagement",
      executiveTakeaway: `The principal risk is not choosing Japan; it is investing before separating observed facts, modeled scenarios, and unverified assumptions.`,
      narrative: [
        `Strategic risks include a segment that is too broad, product value that does not survive localization, weak access to the decision owner, and a channel that produces interest without buying ability. Operating risks include unsupported claims, unclear service boundaries, slow inquiry routing, contracting uncertainty, and a delivery promise that exceeds current capacity.`,
        `Evidence risk deserves separate management. Public-page absence is not proof of demand or loss; public visibility models are not measured analytics; favorable replies are not revenue; and a small validation sample is not a market-size estimate. Each risk should have an owner, early indicator, mitigation, and trigger for pause or specialist review.`,
        `Paradigm's recommended next step is a bounded Japan opportunity validation built around ${company}'s verified product facts, ${targetSegment}, and the customer-path decisions identified in this report. The engagement should produce reusable decision assets and a documented go / refine / stop conclusion. It must never guarantee demand, revenue, compliance, or market entry success.`,
      ],
      evidence: [observed("Evidence boundary", gap), hypothesis("Primary strategic risk", "A broad launch could spend resources without resolving product, segment, channel, or operating fit"), action("Recommended posture", "Authorize a bounded validation with explicit stop conditions")],
      actions: [
        "Create a live risk register with owner, indicator, mitigation, and escalation trigger for every material assumption.",
        "Confirm the validation scope, decision owners, operating constraints, and evidence deliverables in writing.",
        "Schedule the first decision review before any broad launch, paid acquisition, or unsupported localization commitment.",
      ],
      kpis: ["Open high-severity risks", "Risks retired with evidence", "Decision assets accepted by management"],
      decisionGate: "Recommend go only when segment, proposition, access, commercial path, and operating readiness all have independent supporting evidence.",
    },
  ]
}

export function countStrategyWords(chapters: ManualStrategyChapter[]): number {
  return chapters.flatMap((chapter) => [
    chapter.title,
    chapter.executiveTakeaway,
    ...chapter.narrative,
    ...chapter.evidence.flatMap((item) => [item.label, item.detail]),
    ...chapter.actions,
    ...chapter.kpis,
    chapter.decisionGate,
  ]).join(" ").split(/\s+/).filter(Boolean).length
}
