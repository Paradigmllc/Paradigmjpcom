import { matchContentTemplate } from "./content-templates"
import type { DiagnosticReportData } from "./diagnostic"
import { formatExpiry } from "./diagnostic/checks"
import { buildJapanEntryPersonalizationFacts } from "./japan-entry-personalized-message"
import type { SourceCoverageItem } from "./source-coverage"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { JapanMarketAudit, JapanMarketAuditStatus } from "./sources/japan-market-audit"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type { ManualMasterLeadLedger, ManualQualificationLedger } from "./manual-japan-entry-source-ledger"

const GAP_META: Record<string, { statusKey: keyof JapanMarketAuditStatus; title: string }> = {
  "japan-audit-language": {
    statusKey: "japanese_language_missing",
    title: "Japanese-language customer path",
  },
  "japan-audit-jpy": {
    statusKey: "jpy_currency_missing",
    title: "Customer-facing JPY pricing",
  },
  "japan-audit-shipping": {
    statusKey: "japan_shipping_missing",
    title: "Japan delivery terms",
  },
  "japan-audit-payments": {
    statusKey: "local_payments_missing",
    title: "Japan-local payment references",
  },
  "japan-audit-commerce-disclosure": {
    statusKey: "tokushoho_missing",
    title: "Japan-specific commerce disclosure",
  },
}

interface ReportGap {
  id: string
  title: string
  detail: string
  confidence: number
  source: string
}

function gapRows(profile: ManualCompanyProfile, audit: JapanMarketAudit): ReportGap[] {
  return buildJapanEntryPersonalizationFacts(audit, profile.businessModel).flatMap((fact) => {
    const meta = GAP_META[fact.id]
    if (!meta || audit.status[meta.statusKey] !== true) return []
    return [{
      id: fact.id,
      title: meta.title,
      detail: fact.statement,
      confidence: fact.confidence,
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
  qualificationLedger?: ManualQualificationLedger
  masterLeadLedger?: ManualMasterLeadLedger
}) {
  const messagePassed = Boolean(input.initialMessage) && input.messageReview.passed === true
  const messageVariant = typeof input.messageReview.message_variant === "string"
    ? input.messageReview.message_variant
    : "estimate_off_price_off"
  const priceCell = messageVariant === "estimate_off_price_on" || messageVariant === "estimate_on_price_on"
  const items: SourceCoverageItem[] = [
    sourceItem({
      slug: "company-public-website",
      label: "Company public website",
      category: "company",
      status: input.sourceUrl ? "collected" : "missing",
      detail: `Company and product wording collected from ${input.sourceUrl}.`,
      meaning: "The company description and first-touch product evidence must come from the company’s own public pages.",
      missingConsequence: "Without first-party wording, personalized outreach remains blocked.",
      nextStep: "Recheck the public website if the company changes its offer or positioning.",
    }),
    sourceItem({
      slug: "deepseek-company-classification",
      label: "DeepSeek V4 company classification",
      category: "analysis",
      status: "collected",
      detail: `Country=${input.profile.countryCode ?? "unconfirmed"}; SMB=${input.profile.smbStatus} (${input.profile.smbConfidence}/100); Japan Entry fit=${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100).`,
      meaning: "Classification separates overseas SMB prospects from Japanese or uncertain companies; confidence is shown rather than hidden.",
      missingConsequence: "An uncertain company must remain in manual review.",
      nextStep: "Human-review country, SMB status, and offer fit before any outreach.",
    }),
    sourceItem({
      slug: "japan-market-public-page-audit",
      label: "Japan public-page readiness audit",
      category: "analysis",
      status: input.audit.pages_checked.length > 0 ? "collected" : "missing",
      detail: `${input.audit.pages_checked.length} public page(s) checked; only business-model-relevant observations are shown.`,
      meaning: "The bounded audit identifies what the checked pages did or did not show; it does not establish demand, legal applicability, or non-compliance.",
      missingConsequence: "Without checked pages, the Japan Entry diagnosis would be generic.",
      nextStep: "Validate commercial and legal requirements with primary sources during delivery.",
    }),
    ...(input.profile.positioningConcept ? [sourceItem({
      slug: "draft-japanese-positioning-concept",
      label: "Stored Japanese positioning draft",
      category: "analysis",
      status: "collected",
      detail: `Unpublished draft grounded in the exact public phrase “${input.profile.positioningConcept.sourcePhrase}”.`,
      meaning: "This stored artifact is the only basis for permitting a mockup-led first touch.",
      missingConsequence: "Without a stored draft, mockup-led wording must fall back to a public-page problem statement.",
      nextStep: "Human-review the Japanese wording before publishing or sharing it.",
    })] : []),
    sourceItem({
      slug: "verified-contact-form",
      label: "Verified public inquiry form",
      category: "outreach",
      status: input.form.verification === "form" && Boolean(input.form.formUrl) ? "collected" : "missing",
      detail: `${input.form.method} discovery; verification=${input.form.verification}; confidence=${input.form.confidence}/100.`,
      meaning: "Only a fetched page containing a usable form can enter the Twenty manual-review list.",
      missingConsequence: "The record remains in manual review and is not added to Twenty automatically.",
      nextStep: "Open and manually confirm the form before sending anything.",
    }),
    sourceItem({
      slug: "initial-interest-message-review",
      label: "Initial-interest message quality review",
      category: "outreach",
      status: messagePassed ? "collected" : "missing",
      detail: messagePassed
        ? `DeepSeek V4 Pro review passed at ${String(input.messageReview.score ?? "unscored")}/100; ${priceCell ? "only the approved $12,000 fixed fee and six included support months are allowed" : "price and payment terms are prohibited"}; URL, attachment, and call offers are prohibited.`
        : "No initial-interest message passed the deterministic and editorial gates.",
      meaning: priceCell
        ? "This test cell asks for a founder or growth-owner forward after stating only the approved fixed commercial term."
        : "The first touch asks permission to share a deeper analysis without commercial terms.",
      missingConsequence: "The company cannot be added to the manual outreach list.",
      nextStep: "Human-review the message against the cited public-page facts before sending.",
    }),
  ]
  const scored = items.filter((item) => item.status !== "not_applicable")
  return {
    score: scored.length > 0 ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length) : 0,
    collected: items.filter((item) => item.status === "collected").length,
    configured: items.filter((item) => item.status === "configured").length,
    missing: items.filter((item) => item.status === "missing").length,
    items,
  }
}

export async function buildManualJapanEntryReport(input: {
  profile: ManualCompanyProfile
  audit: JapanMarketAudit
  form: FormDiscoveryResult
  initialMessage: string | null
  messageReview: Record<string, unknown>
  reportUrl: string
  sourceUrl: string
  qualificationLedger?: ManualQualificationLedger
  masterLeadLedger?: ManualMasterLeadLedger
}): Promise<DiagnosticReportData> {
  const gaps = gapRows(input.profile, input.audit)
  const topGaps = gaps.slice(0, 3)
  const coverage = buildSourceCoverage(input)
  const contentTemplate = await matchContentTemplate({
    reportLocale: "en",
    targetCountry: input.profile.countryCode,
    industry: input.profile.industry,
    assetType: "diagnostic_report",
    appealAngle: "japan_entry",
    templateVariant: "japan_entry",
  })
  const noGapCopy = "The bounded public-page screen did not identify a missing customer-path signal relevant to this business model. This is not proof of Japan readiness; commercial and legal validation are still required."
  const acts = topGaps.length > 0
    ? topGaps.map((gap, index) => ({
        type: (["pain", "fear", "hope"] as const)[index] ?? "pain",
        icon: index === 2 ? "→" : "!",
        headline: gap.title,
        body: gap.detail,
        metric_label: "Checked public pages",
        metric_value: "Not observed",
        metric_unit: "",
        metric_bench: "Human validation required before implementation",
        severity: index === 0 ? "warning" as const : "info" as const,
      }))
    : [{
        type: "hope" as const,
        icon: "✓",
        headline: "Bounded Japan customer-path screen",
        body: noGapCopy,
        metric_label: "Business-model-relevant public signals",
        metric_value: "No missing signal observed",
        metric_unit: "",
        metric_bench: "Not a launch or compliance approval",
        severity: "info" as const,
      }]

  return {
    company_name: input.profile.companyName,
    report_locale: "en",
    target_country: input.profile.countryCode ?? "Unknown",
    template_variant: "japan_entry",
    industry: input.profile.industry,
    prefecture: null,
    expires_at: formatExpiry("en"),
    hook: gaps.length > 0
      ? `${input.profile.companyName} has ${gaps.length} business-model-relevant Japan customer-path question${gaps.length === 1 ? "" : "s"} that the checked public pages did not resolve.`
      : `${input.profile.companyName} shows no missing business-model-relevant signal in this bounded public-page screen; deeper market validation is still required.`,
    total_loss: "0",
    acts,
    cta_text: "Use this evidence as the starting point for a human-reviewed Japan Entry decision, not as proof of demand, compliance, traffic, or sales.",
    video_thumbnail: null,
    demo_url: null,
    screenshot_url: null,
    visual_annotations: [],
    visitor_journey: gaps.length > 0
      ? gaps.slice(0, 5).map((gap) => ({ id: gap.id, label: gap.title, detail: gap.detail, status: "weak" as const }))
      : [{ id: "bounded-screen", label: "Bounded public-page screen", detail: noGapCopy, status: "ready" as const }],
    source_coverage: coverage,
    intelligence: {
      signals: [
        {
          id: "company-profile",
          label: "Company profile",
          value: `${input.profile.businessModel} / ${input.profile.industry}`,
          source: "Company public website + DeepSeek V4 Pro classification",
          category: "company",
          tone: input.profile.smbStatus === "qualified" ? "good" : "warning",
          detail: input.profile.productContext,
          whyItMatters: "The Japan offer must match the company’s publicly described product and operating model.",
        },
        ...(input.profile.positioningConcept ? [{
          id: "draft-japanese-positioning",
          label: "Draft Japanese positioning concept",
          value: input.profile.positioningConcept.japaneseHeadline,
          source: `Company public wording: ${input.profile.positioningConcept.sourcePhrase}`,
          category: "company" as const,
          tone: "neutral" as const,
          detail: `${input.profile.positioningConcept.japaneseSupportLine} This is an unpublished draft, not evidence of Japan demand or performance.`,
          whyItMatters: "A mockup-led first touch is permitted only because this concrete draft is stored with the work record.",
        }] : []),
        {
          id: "japan-public-page-screen",
          label: "Business-model-relevant Japan signals",
          value: `${gaps.length} missing signal(s) across ${input.audit.pages_checked.length} checked page(s)`,
          source: "Japan market public-page audit",
          category: "company",
          tone: gaps.length === 0 ? "good" : "warning",
          detail: "Only findings allowed by the classified business model are included.",
          whyItMatters: "This keeps SaaS, service, and ecommerce diagnoses from borrowing irrelevant customer-path assumptions.",
        },
        {
          id: "contact-form",
          label: "Public inquiry route",
          value: input.form.verification === "form" ? "Verified form" : "Needs review",
          source: input.form.method === "crawl4ai" ? "Crawl4AI + HTML verification" : `Form discovery (${input.form.method})`,
          category: "outreach",
          tone: input.form.verification === "form" ? "good" : "warning",
          detail: input.form.formUrl ?? "No verified form URL was found.",
          whyItMatters: "A verified route is required before the record can enter the manual outreach list.",
        },
      ],
      painPoints: gaps.length > 0
        ? gaps.slice(0, 3).map((gap) => ({
            id: gap.id,
            title: gap.title,
            severity: "warning" as const,
            evidence: `${gap.detail} Source=${gap.source}; confidence=${Math.round(gap.confidence * 100)}/100.`,
            implication: "The checked public pages leave this part of a Japan customer path unverified.",
            recommendedAction: "Validate the requirement and implementation scope with primary evidence before delivery.",
          }))
        : [{
            id: "bounded-validation",
            title: "No missing business-model-relevant signal was observed in the bounded screen",
            severity: "opportunity" as const,
            evidence: noGapCopy,
            implication: "Market demand and full launch readiness remain unverified.",
            recommendedAction: "Continue with primary market, commercial, and legal validation before launch.",
          }],
      nextActions: [
        "Human-review the generated first-touch message before sending.",
        "Confirm the target company, country, product wording, and public form route.",
        ...(input.qualificationLedger?.legal_verification.status === "pending"
          ? ["Verify the active contracting entity in an official company registry before treating the lead as send-ready."]
          : []),
        "Use primary-source commercial and legal requirements during delivery; this report is not legal advice.",
      ],
    },
    meta: {
      manual_work: true,
      evidence_contract: "public-pages-only",
      source_url: input.sourceUrl,
      japan_market_audit: input.audit,
      manual_company_profile: input.profile,
      outreach_playbook: input.profile.outreachPlaybook,
      draft_japanese_positioning_concept: input.profile.positioningConcept,
      manual_source_qualification_ledger: input.qualificationLedger ?? null,
      manual_master_lead_ledger: input.masterLeadLedger ?? null,
      form_discovery: input.form,
      japan_entry_initial_message: input.initialMessage,
      japan_entry_message_review: input.messageReview,
    },
    contactFormUrl: input.form.formUrl,
    content_template: {
      title: contentTemplate.title,
      purpose: contentTemplate.purpose,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
      prompt_template: contentTemplate.prompt_template,
      offer_code: contentTemplate.offer_code,
      appeal_angle: contentTemplate.appeal_angle,
    },
    report_url: input.reportUrl,
    localized_report_urls: [{ label: "English", url: input.reportUrl }],
  }
}
