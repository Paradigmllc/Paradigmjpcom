import { describe, expect, it } from "vitest"
import {
  buildManualInitialMessageInput,
  buildManualWorkRetryPatch,
  isRetryableManualWork,
  ManualWorkRetryConflictError,
  manualWorkEligibility,
  manualWorkTerminalStatus,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
  shouldUseTwentyOnlyRetry,
} from "./manual-japan-entry-service"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import { isExplicitManualWorkArtifactRefresh } from "./manual-work-recovery-policy"
import type { FormDiscoveryResult } from "./sources/form-discovery"

const qualifiedProfile: ManualCompanyProfile = {
  companyName: "Acme",
  countryCode: "US",
  isJapaneseCompany: false,
  smbStatus: "qualified",
  smbConfidence: 88,
  smbEvidence: ["Public product and company evidence"],
  japanEntryFitStatus: "qualified",
  japanEntryFitConfidence: 82,
  japanEntryFitEvidence: ["Product can be localized for Japan"],
  businessModel: "saas",
  industry: "Technology / IT",
  productContext: "A public software platform for small business teams.",
  observedFacts: ["Offers a software platform"],
  outreachPlaybook: "saas_ai_devtools",
  positioningConcept: null,
}

const verifiedForm: FormDiscoveryResult = {
  formUrl: "https://acme.com/contact",
  method: "crawl4ai" as const,
  verification: "form" as const,
  confidence: 94,
  inspection: {
    status: "form",
    reason: "verified_contact_fields",
    fields: ["name", "email", "message", "submit"],
    formCount: 1,
    action: "https://acme.com/contact",
    sameOrigin: true,
    trustedProvider: false,
  },
  candidates: ["https://acme.com/contact"],
  traceMs: 20,
}

describe("manual Japan Entry work safety gates", () => {
  it("exposes a dedicated conflict type for stale explicit retry requests", () => {
    expect(new ManualWorkRetryConflictError("履歴が更新されています")).toMatchObject({
      name: "ManualWorkRetryConflictError",
      message: "履歴が更新されています",
    })
  })

  it("allows failed persistent work to be analyzed again without creating a duplicate", () => {
    expect(isRetryableManualWork({ status: "failed" })).toBe(true)
    expect(isRetryableManualWork({ status: "needs_review", twenty_sync_status: "failed" })).toBe(true)
    expect(isRetryableManualWork({ status: "needs_review", twenty_sync_status: "skipped" })).toBe(false)
    expect(isRetryableManualWork({
      status: "needs_review",
      twenty_sync_status: "synced",
      is_japanese_company: false,
      business_model: "service",
      japan_entry_fit_status: "rejected",
      profile: {
        productContext: "ERP and CRM software with cloud hosting",
        observedFacts: ["Cloud-hosted ERP and CRM software"],
        japanEntryFitEvidence: ["No Japanese language support or Japan market presence was found."],
      },
    })).toBe(true)
    expect(isRetryableManualWork({ status: "failed", manually_sent_at: "2026-07-19T00:00:00.000Z" })).toBe(false)
    expect(isRetryableManualWork({ status: "rejected", message_review: { generation_status: "failed" } })).toBe(false)
    expect(isRetryableManualWork({ status: "completed" })).toBe(false)
  })

  it("allows an explicit artifact refresh for untouched completed work without exposing routine recovery", () => {
    expect(isExplicitManualWorkArtifactRefresh({ status: "completed" }, true)).toBe(true)
    expect(isExplicitManualWorkArtifactRefresh({ status: "completed" }, false)).toBe(false)
    expect(isExplicitManualWorkArtifactRefresh({ status: "completed", manually_sent_at: "2026-07-21T00:00:00.000Z" }, true)).toBe(false)
    expect(isRetryableManualWork({ status: "completed" })).toBe(false)
  })

  it("increments retry attempts and clears stale generated artifacts before reprocessing", () => {
    expect(buildManualWorkRetryPatch({ attempts: 2 }, "estimate_off_price_off", "problem")).toMatchObject({
      attempts: 3,
      status: "processing",
      stage: "fetching",
      twenty_sync_status: "not_started",
      profile: {},
      evidence: {},
      form_discovery: {},
      form_url: null,
      initial_message: null,
      message_review: {},
      report_data: {},
      report_url: null,
      message_variant: "estimate_off_price_off",
      message_variant_fallback_reason: null,
      message_angle: "problem",
      message_angle_fallback_reason: null,
      outreach_playbook: "general_online_smb",
    })
  })

  it("runs a full regeneration for an explicit operator retry", () => {
    const item = { status: "needs_review", twenty_sync_status: "failed" } as const

    expect(shouldUseTwentyOnlyRetry(item, true)).toBe(false)
    expect(shouldUseTwentyOnlyRetry(item, false)).toBe(true)
  })

  it("normalizes one public company domain", () => {
    expect(normalizeManualWorkUrl("acme.com/about")).toEqual({
      inputUrl: "acme.com/about",
      canonicalUrl: "https://acme.com",
      domain: "acme.com",
    })
  })

  it("allows Twenty sync only after every manual-work gate passes", () => {
    expect(manualWorkEligibility({ profile: qualifiedProfile, form: verifiedForm, messageOk: true, messagePassed: true }))
      .toEqual({ eligible: true, reasons: [] })
  })

  it("blocks Japanese companies and unverified forms", () => {
    const result = manualWorkEligibility({
      profile: { ...qualifiedProfile, countryCode: "JP", isJapaneseCompany: true },
      form: { ...verifiedForm, verification: "page", confidence: 74 },
      messageOk: true,
      messagePassed: true,
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain("Japanese companies are excluded")
    expect(result.reasons).toContain("A high-confidence public form was not verified")
  })

  it("separates terminal offer rejection from evidence review", () => {
    expect(manualWorkTerminalStatus({
      ...qualifiedProfile,
      japanEntryFitStatus: "rejected",
      japanEntryFitEvidence: ["The location-bound service cannot serve or export to Japan."],
    }, false)).toBe("rejected")
    expect(manualWorkTerminalStatus({ ...qualifiedProfile, smbStatus: "review_required" }, false)).toBe("needs_review")
    expect(manualWorkTerminalStatus(qualifiedProfile, true)).toBe("completed")
  })

  it("wires manual work to the light initial-interest contract and raw public evidence", () => {
    const input = buildManualInitialMessageInput({
      profile: { ...qualifiedProfile, productContext: "A model-written summary that must not be used." },
      evidence: {
        companyName: "Acme",
        productContext: "Public homepage wording | Workflow software for small business teams",
        businessModel: "saas",
        sourceUrl: "https://acme.com/",
        title: "Acme",
        description: "Public homepage wording",
        headings: ["Workflow software for small business teams"],
        audit: {
          engine: "local_heuristic",
          generated_at: "2026-07-15T00:00:00.000Z",
          score: 40,
          status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
          signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
          pages_checked: ["https://acme.com/"],
          sales_pitch_context: "Public-page observations",
          human_review_required: true,
          legal_disclaimer: "Not legal advice",
        },
      },
    })

    expect(input).toMatchObject({
      purpose: "initial_interest",
      productContext: "Public homepage wording | Workflow software for small business teams",
    })
    expect(input.productContext).not.toContain("model-written")
  })

  it("uses a Crawl4AI result only after HTML form verification", () => {
    const baseline = { ...verifiedForm, method: "dom" as const, confidence: 94 }
    const crawlVerified = { ...verifiedForm, method: "crawl4ai" as const, confidence: 90 }
    const crawlPageOnly = { ...crawlVerified, verification: "page" as const, confidence: 74 }

    expect(selectBestManualFormResult([baseline, crawlVerified])).toEqual(baseline)
    expect(selectBestManualFormResult([{ ...baseline, verification: "fallback", confidence: 20 }, crawlVerified])).toEqual(crawlVerified)
    expect(selectBestManualFormResult([{ ...baseline, verification: "fallback", confidence: 20 }, crawlPageOnly])).toEqual({
      ...crawlPageOnly,
      formUrl: null,
    })
    expect(selectBestManualFormResult([
      { ...baseline, verification: "fallback", confidence: 20, checkedUrlCount: 16 },
      { ...crawlPageOnly, checkedUrlCount: 2 },
    ])).toMatchObject({
      formUrl: null,
      verification: "page",
      checkedUrlCount: 16,
    })
  })

  it("rejects a form label when the fetched page does not contain verified fields", () => {
    const result = manualWorkEligibility({
      profile: qualifiedProfile,
      form: { ...verifiedForm, inspection: { ...verifiedForm.inspection!, status: "page", fields: [] } },
      messageOk: true,
      messagePassed: true,
    })

    expect(result).toEqual({ eligible: false, reasons: ["A high-confidence public form was not verified"] })
  })
})
