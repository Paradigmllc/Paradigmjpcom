import type { DiagnosticReportData } from "./diagnostic"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { JapanMarketAudit } from "./sources/japan-market-audit"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

function gapRows(audit: JapanMarketAudit): Array<{ key: string; title: string; detail: string }> {
  const rows = [
    ["japanese_language_missing", "Japanese-language customer path", "The checked public pages did not show a clear Japanese-language path."],
    ["jpy_currency_missing", "JPY pricing", "The checked public pages did not show customer-facing JPY pricing."],
    ["japan_shipping_missing", "Japan delivery terms", "The checked public pages did not show Japan-specific delivery terms."],
    ["local_payments_missing", "Japan-local payments", "The checked public pages did not show JCB, PayPay, Paidy, or konbini references."],
    ["tokushoho_missing", "Commerce disclosure", "The checked public pages did not show a Japan-specific commercial-transactions disclosure."],
    ["appi_missing", "Japan privacy context", "The checked public pages did not show an explicit APPI-oriented privacy explanation."],
  ] as const
  return rows
    .filter(([key]) => audit.status[key])
    .map(([key, title, detail]) => ({ key, title, detail }))
}

export function buildManualJapanEntryReport(input: {
  profile: ManualCompanyProfile
  audit: JapanMarketAudit
  form: FormDiscoveryResult
  initialMessage: string | null
  messageReview: Record<string, unknown>
  reportUrl: string
  sourceUrl: string
}): DiagnosticReportData {
  const gaps = gapRows(input.audit)
  const topGaps = gaps.slice(0, 3)
  const sourceItems = [
    {
      slug: "homepage",
      label: "Company public website",
      category: "company",
      status: "collected" as const,
      score: 90,
      detail: `Public company and product evidence collected from ${input.sourceUrl}.`,
      meaning: "Grounds the company profile and product context in the company’s own public copy.",
      missingConsequence: "Without it, company-specific outreach cannot be produced safely.",
      nextStep: "Recheck the public website before sending if the offer or positioning changes.",
    },
    {
      slug: "deepseek-profile",
      label: "DeepSeek V4 company classification",
      category: "analysis",
      status: "collected" as const,
      score: Math.min(input.profile.smbConfidence, input.profile.japanEntryFitConfidence),
      detail: `SMB=${input.profile.smbStatus}; Japan Entry fit=${input.profile.japanEntryFitStatus}.`,
      meaning: "Separates qualified overseas SMBs from Japanese companies and uncertain cases.",
      missingConsequence: "The company must remain in manual review.",
      nextStep: "Human-review any low-confidence company or country classification.",
    },
    {
      slug: "japan-readiness",
      label: "Japan public-page readiness audit",
      category: "analysis",
      status: "collected" as const,
      score: input.audit.score,
      detail: `${input.audit.pages_checked.length} public pages checked; ${gaps.length} possible gaps observed.`,
      meaning: "Identifies public customer-journey gaps without claiming legal non-compliance.",
      missingConsequence: "The Japan Entry angle would be generic rather than evidence-led.",
      nextStep: "Validate legal and commercial requirements with primary sources during delivery.",
    },
    {
      slug: "crawl4ai-form",
      label: "Contact-form discovery",
      category: "outreach",
      status: input.form.verification === "form" ? "collected" as const : "missing" as const,
      score: input.form.confidence,
      detail: `${input.form.method} discovery; verification=${input.form.verification}.`,
      meaning: "Confirms whether there is a usable public inquiry route.",
      missingConsequence: "The record stays in manual review and is not added to Twenty automatically.",
      nextStep: "Manually verify the contact page before any outreach.",
    },
  ]
  const collected = sourceItems.filter((item) => item.status === "collected").length
  const missing = sourceItems.filter((item) => item.status === "missing").length
  const score = Math.round(sourceItems.reduce((sum, item) => sum + item.score, 0) / sourceItems.length)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1_000).toISOString()

  return {
    company_name: input.profile.companyName,
    report_locale: "en",
    target_country: input.profile.countryCode ?? "Unknown",
    template_variant: "japan_entry",
    industry: input.profile.industry,
    prefecture: null,
    expires_at: expiresAt,
    hook: `${input.profile.companyName} has a real product story; the public Japan customer path still needs evidence-led localization before launch.`,
    total_loss: "0",
    acts: topGaps.map((gap, index) => ({
      type: (["pain", "fear", "hope"] as const)[index] ?? "pain",
      icon: index === 2 ? "→" : "!",
      headline: gap.title,
      body: gap.detail,
      metric_label: "Public-page observation",
      metric_value: "Observed",
      metric_unit: "",
      metric_bench: "Human review required before implementation",
      severity: index === 0 ? "warning" : "info",
    })),
    cta_text: "Use the Japan Entry Package to turn these public gaps into a localized, launch-ready customer path.",
    video_thumbnail: null,
    demo_url: null,
    screenshot_url: null,
    visual_annotations: [],
    visitor_journey: gaps.slice(0, 5).map((gap) => ({
      id: gap.key,
      label: gap.title,
      detail: gap.detail,
      status: "weak" as const,
    })),
    source_coverage: { score, collected, configured: 0, missing, items: sourceItems },
    intelligence: {
      signals: [
        {
          id: "company-profile",
          label: "Company profile",
          value: `${input.profile.businessModel} / ${input.profile.industry}`,
          source: "Public website + DeepSeek V4 Pro",
          category: "company",
          tone: input.profile.smbStatus === "qualified" ? "good" : "warning",
          detail: input.profile.productContext,
          whyItMatters: "The Japan offer must match the company’s actual product and operating model.",
        },
        {
          id: "contact-form",
          label: "Public contact route",
          value: input.form.verification === "form" ? "Verified form" : "Needs review",
          source: input.form.method === "crawl4ai" ? "Crawl4AI" : `Form discovery (${input.form.method})`,
          category: "outreach",
          tone: input.form.verification === "form" ? "good" : "warning",
          detail: input.form.formUrl ?? "No verified form URL was found.",
          whyItMatters: "A verified route is required before the record can enter the manual outreach list.",
        },
      ],
      painPoints: (topGaps.length > 0 ? topGaps : [{ key: "validation", title: "Japan path validation", detail: "Public signals exist, but the full Japan customer journey still needs human validation." }]).map((gap) => ({
        id: gap.key,
        title: gap.title,
        severity: "warning" as const,
        evidence: gap.detail,
        implication: "This can create friction before a Japanese buyer can evaluate or purchase the offer.",
        recommendedAction: "Validate and implement the missing customer-path layer inside the fixed Japan Entry scope.",
      })),
      nextActions: [
        "Human-review the generated first-touch message before sending.",
        "Confirm the target company, country, and public form route.",
        "Use primary-source legal and payment requirements during delivery.",
      ],
    },
    meta: {
      manual_work: true,
      source_url: input.sourceUrl,
      japan_market_audit: input.audit,
      manual_company_profile: input.profile,
      form_discovery: input.form,
      japan_entry_initial_message: input.initialMessage,
      japan_entry_message_review: input.messageReview,
    },
    contactFormUrl: input.form.formUrl,
    content_template: {
      title: "Japan Entry public-path diagnostic",
      purpose: "Turn public evidence into a focused Japan Entry opportunity brief without inventing demand, traffic, or sales.",
      quality_bar: "Every finding is tied to public-page evidence and remains subject to human review.",
      dify_selection_rule: "Manual workbench only; not part of the automated sales pipeline.",
      prompt_template: "Use only observed public evidence.",
      offer_code: "japan-entry-package",
      appeal_angle: "japan_entry",
    },
    report_url: input.reportUrl,
    localized_report_urls: [{ label: "English", url: input.reportUrl }],
  }
}
