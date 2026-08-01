import { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message"
import type { SourceCoverageItem, SourceCoverageSnapshot } from "./source-coverage"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { JapanMarketAudit, JapanMarketAuditStatus } from "./sources/japan-market-audit"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type { ManualMasterLeadLedger, ManualQualificationLedger } from "./manual-japan-entry-source-ledger"
import { buildManualMarketLens } from "./manual-japan-entry-market-lens"
import type { JapanEntryProjection } from "./japan-entry-projection"
import { buildManualCustomerReportView } from "./manual-japan-entry-customer-report"
import type {
  ManualJapanEntryReportData,
  ManualReportDecisionStatus,
  ManualReportGap,
} from "./manual-japan-entry-report-types"
import { MANUAL_JAPAN_ENTRY_REPORT_SCHEMA } from "./manual-japan-entry-report-types"
import { isVerifiedManualFormResult } from "./manual-japan-entry-workflow-helpers"

const GAP_META: Record<string, { statusKey: keyof JapanMarketAuditStatus; title: string }> = {
  "japan-audit-language": { statusKey: "japanese_language_missing", title: "Japanese-language customer path" },
  "japan-audit-jpy": { statusKey: "jpy_currency_missing", title: "Customer-facing JPY pricing" },
  "japan-audit-shipping": { statusKey: "japan_shipping_missing", title: "Japan delivery terms" },
  "japan-audit-payments": { statusKey: "local_payments_missing", title: "Japan-local payment references" },
  "japan-audit-commerce-disclosure": { statusKey: "tokushoho_missing", title: "Japan-specific commerce disclosure" },
}

const MARKET_COPY = {
  global_priority: {
    label: "Global-priority market",
    rationale: "Prioritize companies with visible international sales capability and a clear owner for expansion decisions.",
  },
  regional_core: {
    label: "Regional core market",
    rationale: "Prioritize export-ready product companies with visible evidence of international customers or operations.",
  },
  precision: {
    label: "Precision market",
    rationale: "Use a smaller, evidence-led list and favor founder accessibility over raw market volume.",
  },
  selective: {
    label: "Selective market",
    rationale: "Advance only companies with explicit international traction or commercial proof on their public pages.",
  },
  individual_review: {
    label: "Company-level review",
    rationale: "Judge the company on its product, international proof, and decision structure rather than country-level purchasing power.",
  },
} as const

function reportGaps(profile: ManualCompanyProfile, audit: JapanMarketAudit): ManualReportGap[] {
  return buildJapanEntryPersonalizationFacts(audit, profile.businessModel).flatMap((fact) => {
    const meta = GAP_META[fact.id]
    if (!meta || audit.status[meta.statusKey] !== true) return []
    return [{
      id: fact.id,
      title: meta.title,
      observation: fact.statement,
      confidence: Math.round(fact.confidence * 100),
      source: fact.source,
    }]
  })
}

function sourceItem(input: Omit<SourceCoverageItem, "score">): SourceCoverageItem {
  return { ...input, score: input.status === "collected" ? 100 : 0 }
}

function buildSourceCoverage(input: {
  profile: ManualCompanyProfile
  audit: JapanMarketAudit
  form: FormDiscoveryResult
  initialMessage: string | null
  messageReview: Record<string, unknown>
  sourceUrl: string
}): SourceCoverageSnapshot {
  const messagePassed = Boolean(input.initialMessage) && input.messageReview.passed === true
  const items: SourceCoverageItem[] = [
    sourceItem({
      slug: "company-public-website",
      label: "Company public website",
      category: "company",
      status: input.sourceUrl ? "collected" : "missing",
      detail: "Company and product wording was collected from the company’s own public website.",
      meaning: "The product description and personalized first-touch evidence must come from first-party pages.",
      missingConsequence: "Without first-party wording, personalized outreach remains blocked.",
      nextStep: "Recheck the website if the offer or positioning changes.",
    }),
    sourceItem({
      slug: "deepseek-company-classification",
      label: "DeepSeek V4 company classification",
      category: "analysis",
      status: "collected",
      detail: `Country=${input.profile.countryCode ?? "unconfirmed"}; SMB=${input.profile.smbStatus} (${input.profile.smbConfidence}/100); Japan Entry fit=${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100).`,
      meaning: "Confidence is shown so uncertain classifications stay in operator review.",
      missingConsequence: "An uncertain company cannot be treated as send-ready.",
      nextStep: "Review the country, SMB status, and offer fit before outreach.",
    }),
    sourceItem({
      slug: "japan-market-public-page-audit",
      label: "Japan public-page readiness audit",
      category: "analysis",
      status: input.audit.pages_checked.length > 0 ? "collected" : "missing",
      detail: `${input.audit.pages_checked.length} public page(s) checked; only business-model-relevant observations are included.`,
      meaning: "This bounded screen records what the checked pages did or did not show.",
      missingConsequence: "Without checked pages, a Japan Entry diagnosis would be generic.",
      nextStep: "Validate market, commercial, and legal requirements with primary sources during delivery.",
    }),
    sourceItem({
      slug: "verified-contact-form",
      label: "Verified public inquiry form",
      category: "outreach",
      status: isVerifiedManualFormResult(input.form) ? "collected" : "missing",
      detail: `${input.form.method} discovery; verification=${input.form.verification}; confidence=${input.form.confidence}/100.`,
      meaning: "A fetched page containing a usable form is required for send-readiness, while the analysis record can still be stored in Twenty for review.",
      missingConsequence: "The record remains in Twenty as review-required and is never sent automatically.",
      nextStep: "Open and manually confirm the form before sending anything.",
    }),
    sourceItem({
      slug: "initial-interest-message-review",
      label: "Initial-interest message quality review",
      category: "outreach",
      status: messagePassed ? "collected" : "missing",
      detail: messagePassed
        ? `DeepSeek V4 review passed at ${String(input.messageReview.score ?? "unscored")}/100; URL, source citation, attachment, and call offers are prohibited.`
        : "No first-touch draft passed both deterministic and editorial gates.",
      meaning: "The first touch is a human-reviewed initial-interest message, not an automated commercial offer.",
      missingConsequence: "The company cannot be treated as send-ready.",
      nextStep: "Review the draft against the public-page facts before manually submitting it.",
    }),
  ]
  const scored = items.filter((item) => item.status !== "not_applicable")
  return {
    score: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : 0,
    collected: items.filter((item) => item.status === "collected").length,
    configured: items.filter((item) => item.status === "configured").length,
    missing: items.filter((item) => item.status === "missing").length,
    items,
  }
}

function finiteScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null
}

function decisionStatus(input: {
  profile: ManualCompanyProfile
  form: FormDiscoveryResult
  messagePassed: boolean
}): ManualReportDecisionStatus {
  if (input.profile.isJapaneseCompany || input.profile.smbStatus === "rejected" || input.profile.japanEntryFitStatus === "rejected") {
    return "rejected"
  }
  if (
    input.profile.smbStatus === "qualified"
    && input.profile.japanEntryFitStatus === "qualified"
    && isVerifiedManualFormResult(input.form)
    && input.messagePassed
  ) return "qualified"
  return "review_required"
}

function decisionReasons(input: {
  profile: ManualCompanyProfile
  form: FormDiscoveryResult
  messagePassed: boolean
}): string[] {
  const reasons = [
    `Overseas company check: ${input.profile.isJapaneseCompany ? "failed" : "passed"}.`,
    `SMB classification: ${input.profile.smbStatus} (${input.profile.smbConfidence}/100).`,
    `Japan Entry fit: ${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100).`,
    `Inquiry route: ${isVerifiedManualFormResult(input.form) ? "verified public form" : "operator review required"}.`,
    `First-touch quality gate: ${input.messagePassed ? "passed" : "blocked"}.`,
  ]
  return reasons
}

export function buildManualJapanEntryReport(input: {
  profile: ManualCompanyProfile
  audit: JapanMarketAudit
  form: FormDiscoveryResult
  initialMessage: string | null
  messageReview: Record<string, unknown>
  reportUrl: string
  sourceUrl: string
  qualificationLedger?: ManualQualificationLedger | Record<string, unknown>
  masterLeadLedger?: ManualMasterLeadLedger | Record<string, unknown>
  projection?: JapanEntryProjection | null
}): ManualJapanEntryReportData {
  const gaps = reportGaps(input.profile, input.audit)
  const messagePassed = Boolean(input.initialMessage) && input.messageReview.passed === true
  const status = decisionStatus({ profile: input.profile, form: input.form, messagePassed })
  const commercialSignals = input.profile.commercialSignals ?? []
  const marketLens = input.profile.marketLens ?? buildManualMarketLens({
    countryCode: input.profile.countryCode,
    commercialSignals,
  })
  const marketCopy = MARKET_COPY[marketLens.priority]
  const domain = new URL(input.sourceUrl).hostname.replace(/^www\./, "")
  const routeVerified = isVerifiedManualFormResult(input.form)
  const reviewSummary = typeof input.messageReview.rationale === "string"
    ? input.messageReview.rationale
    : messagePassed ? "The draft passed deterministic and editorial review." : "The draft did not pass all quality gates."

  return {
    schemaVersion: MANUAL_JAPAN_ENTRY_REPORT_SCHEMA,
    reportKind: "customer_japan_entry_opportunity_report",
    generatedAt: new Date().toISOString(),
    reportUrl: input.reportUrl,
    company: {
      name: input.profile.companyName,
      domain,
      countryCode: input.profile.countryCode,
      businessModel: input.profile.businessModel,
      industry: input.profile.industry,
      productContext: input.profile.productContext,
    },
    customerView: buildManualCustomerReportView({
      profile: input.profile,
      gaps,
      messageReview: input.messageReview,
      projection: input.projection ?? null,
      reviewedPages: [input.sourceUrl, ...input.audit.pages_checked],
    }),
    decision: {
      status,
      summary: status === "qualified"
        ? "The public evidence meets the current manual-workbench gates. A human must still review and submit the first touch."
        : status === "rejected"
          ? "The company does not meet the overseas-SMB scope and must not enter the manual outreach list."
          : "One or more evidence gates remain unresolved. Keep this record in operator review.",
      reasons: decisionReasons({ profile: input.profile, form: input.form, messagePassed }),
      smb: { status: input.profile.smbStatus, confidence: input.profile.smbConfidence },
      japanEntryFit: { status: input.profile.japanEntryFitStatus, confidence: input.profile.japanEntryFitConfidence },
    },
    market: {
      priority: marketLens.priority,
      label: marketCopy.label,
      rationale: marketCopy.rationale,
      focusIndustries: marketLens.focusIndustries,
      commercialEvidenceStatus: marketLens.commercialEvidenceStatus,
      commercialSignals,
      pricingPolicy: "no_automatic_country_adjustment",
    },
    japanReadiness: {
      checkedPageCount: input.audit.pages_checked.length,
      gaps,
      summary: gaps.length
        ? `${gaps.length} business-model-relevant Japan customer-path question${gaps.length === 1 ? "" : "s"} were not resolved by the checked pages.`
        : "No missing business-model-relevant signal was observed in this bounded screen. This is not proof of Japan readiness.",
      disclaimer: input.audit.legal_disclaimer,
    },
    contactRoute: {
      url: routeVerified ? input.form.formUrl : null,
      status: routeVerified ? "verified" : "missing",
      method: input.form.method,
      confidence: input.form.confidence,
      reason: routeVerified
        ? "A public page containing a usable inquiry form was fetched and verified."
        : "A verified public inquiry form is required before manual submission.",
    },
    outreach: {
      purpose: "initial_interest",
      draft: input.initialMessage,
      qualityPassed: messagePassed,
      score: finiteScore(input.messageReview.score),
      uniquenessScore: finiteScore(input.messageReview.uniquenessScore ?? input.messageReview.uniqueness_score),
      playbook: input.profile.outreachPlaybook,
      variant: typeof input.messageReview.message_variant === "string" ? input.messageReview.message_variant : "unrecorded",
      angle: typeof input.messageReview.message_angle === "string" ? input.messageReview.message_angle : "unrecorded",
      reviewSummary,
      neverSent: true,
    },
    sourceCoverage: buildSourceCoverage(input),
    qualificationLedger: input.qualificationLedger ? { ...input.qualificationLedger } : {},
    nextActions: [
      "Review the company, country, product wording, and every quoted public fact.",
      "Open the verified inquiry form and check its no-solicitation language before manual submission.",
      "Review the first-touch draft for factual accuracy, naturalness, and fit with the recipient’s business.",
      "Verify the contracting entity, decision maker, and payment capacity before discussing commercial terms.",
    ],
    guardrails: [
      "This report uses public-page evidence only and is not proof of demand, revenue, legal compliance, or purchase intent.",
      "Country context never changes the existing offer price automatically.",
      "The first-touch draft contains no URL or source citation and must be submitted by a human.",
      "No automated sending path is allowed from this workbench.",
    ],
    provenance: {
      evidenceContract: "public-pages-only",
      sourceUrl: input.sourceUrl,
      generatedBy: "manual_japan_entry_workbench",
      legacyTemplateUsed: false,
      automaticSendAllowed: false,
    },
  }
}
