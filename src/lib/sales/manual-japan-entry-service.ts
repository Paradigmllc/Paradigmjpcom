import "server-only"

import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { normalizeDomain } from "./dedup"
import { collectInitialFormDraftEvidence } from "./initial-form-draft-evidence"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"
import { collectManualMarketProjection } from "./manual-japan-entry-market-context"
import { analyzeManualCompanyProfile } from "./manual-japan-entry-profile"
import {
  assignManualMessageVariant,
  isManualMessageVariant,
  nonEstimateVariant,
  type ManualMessageVariant,
  type ManualMessageVariantSelection,
  variantOptions,
} from "./manual-japan-entry-experiment"
import {
  createManualWork,
  findManualWorkByDomain,
  updateManualWork,
} from "./manual-japan-entry-store"
import { syncManualWorkToTwenty } from "./manual-japan-entry-twenty"
import type { ManualCompanyProfile, ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import {
  discoverFormUrl,
  type FormDiscoveryResult,
} from "./sources/form-discovery"
import { verifyExternalFormDiscoveryHit } from "./sources/external-form-verification"
import { discoverWithCrawl4Ai } from "./sources/external-form-discovery"
import { findTwentyCompanyByDomain } from "./twenty-sync-company-home"

export interface ManualWorkEligibility {
  eligible: boolean
  reasons: string[]
}

export function normalizeManualWorkUrl(input: string): {
  inputUrl: string
  canonicalUrl: string
  domain: string
} {
  const trimmed = input.trim()
  if (!trimmed) throw new Error("URL is required")
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch (error) {
    console.error("[manual-work] invalid URL:", { input: trimmed, error })
    throw new Error("A valid public company URL is required")
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP(S) company URLs are allowed")
  }
  const domain = normalizeDomain(url.hostname)
  if (!domain || !isCustomerFacingBusinessDomain(domain)) {
    throw new Error("A customer-facing company domain is required")
  }
  return { inputUrl: trimmed, canonicalUrl: `https://${domain}`, domain }
}

export function manualWorkEligibility(input: {
  profile: ManualCompanyProfile
  form: FormDiscoveryResult
  messageOk: boolean
  messagePassed: boolean
}): ManualWorkEligibility {
  const reasons: string[] = []
  if (!input.profile.countryCode) reasons.push("Country is unconfirmed")
  if (input.profile.isJapaneseCompany || input.profile.countryCode === "JP") reasons.push("Japanese companies are excluded")
  if (input.profile.smbStatus !== "qualified" || input.profile.smbConfidence < 70) reasons.push("SMB classification needs review")
  if (input.profile.japanEntryFitStatus !== "qualified" || input.profile.japanEntryFitConfidence < 70) reasons.push("Japan Entry fit needs review")
  if (input.form.verification !== "form" || input.form.confidence < 90 || !input.form.formUrl) reasons.push("A high-confidence public form was not verified")
  if (!input.messageOk || !input.messagePassed) reasons.push("The initial message did not pass the production quality gate")
  return { eligible: reasons.length === 0, reasons }
}

function formResultRank(result: FormDiscoveryResult): number {
  if (result.verification === "form") return 300 + result.confidence
  if (result.verification === "page") return 200 + result.confidence
  if (result.verification === "fallback") return 100 + result.confidence
  return result.confidence
}

export function selectBestManualFormResult(
  results: Array<FormDiscoveryResult | null>,
): FormDiscoveryResult {
  const available = results.filter((result): result is FormDiscoveryResult => Boolean(result))
  const selected = [...available].sort((a, b) => formResultRank(b) - formResultRank(a))[0]
  return selected ?? {
    formUrl: null,
    method: "none",
    verification: "none",
    confidence: 0,
    inspection: null,
    candidates: [],
    traceMs: 0,
  }
}

export function buildManualInitialMessageInput(input: {
  profile: ManualCompanyProfile
  evidence: Awaited<ReturnType<typeof collectInitialFormDraftEvidence>>
  variant?: ManualMessageVariant
  projection?: Awaited<ReturnType<typeof collectManualMarketProjection>>["projection"]
}): Parameters<typeof generatePersonalizedJapanEntryMessage>[0] {
  const variant = input.variant ?? "estimate_off_price_off"
  return {
    companyName: input.profile.companyName,
    industry: input.profile.industry,
    productContext: input.evidence.productContext,
    targetCountry: input.profile.countryCode,
    businessModel: input.profile.businessModel,
    audit: input.evidence.audit,
    purpose: "initial_interest",
    projection: input.projection ?? undefined,
    initialInterestOptions: variantOptions(variant),
  }
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

async function failWork(id: string, error: unknown): Promise<ManualJapanEntryWorkRow> {
  const message = error instanceof Error ? error.message : "Manual Japan Entry processing failed"
  console.error("[manual-work] processing failed:", { id, error })
  return updateManualWork(id, {
    status: "failed",
    stage: "failed",
    error_message: message.slice(0, 2_000),
    twenty_sync_status: "skipped",
  })
}

export async function processManualJapanEntryUrl(
  rawUrl: string,
  variantSelection: ManualMessageVariantSelection = "auto",
): Promise<{
  item: ManualJapanEntryWorkRow
  duplicate: boolean
}> {
  const normalized = normalizeManualWorkUrl(rawUrl)
  const requestedVariant = isManualMessageVariant(variantSelection)
    ? variantSelection
    : assignManualMessageVariant(normalized.domain)
  const existing = await findManualWorkByDomain(normalized.domain)
  if (existing) return { item: existing, duplicate: true }

  let work = await createManualWork({ ...normalized, messageVariantRequested: requestedVariant })
  try {
    try {
      const twentyExisting = await findTwentyCompanyByDomain(normalized.domain)
      if (twentyExisting?.id) {
        work = await updateManualWork(work.id, {
          status: "duplicate",
          stage: "complete",
          twenty_company_id: twentyExisting.id,
          twenty_sync_status: "duplicate",
          error_message: "This domain already exists in Twenty; no fields were overwritten.",
        })
        return { item: work, duplicate: true }
      }
    } catch (error) {
      console.warn("[manual-work] Twenty duplicate precheck unavailable; continuing without write:", error)
    }

    const evidence = await collectInitialFormDraftEvidence({
      domain: normalized.domain,
      industry: null,
      techStack: {},
    })
    work = await updateManualWork(work.id, {
      stage: "classifying",
      evidence: {
        sourceUrl: evidence.sourceUrl,
        title: evidence.title,
        description: evidence.description,
        headings: evidence.headings,
        audit: evidence.audit,
      },
      product_context: evidence.productContext,
    })

    const profile = await analyzeManualCompanyProfile({
      domain: normalized.domain,
      fallbackCompanyName: evidence.companyName,
      productContext: evidence.productContext,
      title: evidence.title,
      description: evidence.description,
      headings: evidence.headings,
      audit: evidence.audit,
    })
    work = await updateManualWork(work.id, {
      company_name: profile.companyName,
      country_code: profile.countryCode,
      is_japanese_company: profile.isJapaneseCompany,
      smb_status: profile.smbStatus,
      smb_confidence: profile.smbConfidence,
      japan_entry_fit_status: profile.japanEntryFitStatus,
      japan_entry_fit_confidence: profile.japanEntryFitConfidence,
      business_model: profile.businessModel,
      industry: profile.industry,
      product_context: profile.productContext,
      profile,
      stage: "form_discovery",
    })
    if (profile.isJapaneseCompany || profile.countryCode === "JP") {
      work = await updateManualWork(work.id, {
        status: "rejected",
        stage: "complete",
        twenty_sync_status: "skipped",
        error_message: "Japanese companies are outside the Japan Entry Package target.",
      })
      return { item: work, duplicate: false }
    }

    const origin = new URL(evidence.sourceUrl).origin
    const requestedOptions = variantOptions(requestedVariant)
    const marketProjectionPromise = requestedOptions.includeEstimate
      ? collectManualMarketProjection({ domain: normalized.domain, profile })
      : Promise.resolve({ visibility: null, projection: null, fallbackReason: null })
    const [baselineForm, crawl4ai, marketProjection] = await Promise.all([
      discoverFormUrl({
        homeUrl: origin,
        region: "global",
        enableCrawl4Ai: false,
        enableLlm: true,
        timeoutMs: 10_000,
      }),
      discoverWithCrawl4Ai({ origin, region: "global", timeoutMs: 10_000 }),
      marketProjectionPromise,
    ])
    const verifiedCrawl4Ai = crawl4ai
      ? await verifyExternalFormDiscoveryHit({ origin, hit: crawl4ai, timeoutMs: 10_000 })
      : null
    const form = selectBestManualFormResult([baselineForm, verifiedCrawl4Ai])
    const effectiveVariant = requestedOptions.includeEstimate && !marketProjection.projection
      ? nonEstimateVariant(requestedVariant)
      : requestedVariant
    work = await updateManualWork(work.id, {
      form_discovery: { ...form, crawl4ai, baseline: baselineForm, verified_crawl4ai: verifiedCrawl4Ai },
      form_url: form.formUrl,
      message_variant: effectiveVariant,
      message_variant_fallback_reason: marketProjection.fallbackReason,
      evidence: {
        sourceUrl: evidence.sourceUrl,
        title: evidence.title,
        description: evidence.description,
        headings: evidence.headings,
        audit: evidence.audit,
        market_visibility: marketProjection.visibility,
        message_projection: marketProjection.projection,
      },
      stage: "copy_generation",
    })

    const generated = await generatePersonalizedJapanEntryMessage(buildManualInitialMessageInput({
      profile,
      evidence,
      variant: effectiveVariant,
      projection: marketProjection.projection,
    }))
    const messageReview = {
      ...jsonRecord(generated.review),
      purpose: "initial_interest",
      product_context_source: "public_homepage",
      message_variant_requested: requestedVariant,
      message_variant: effectiveVariant,
      message_variant_fallback_reason: marketProjection.fallbackReason,
    }
    const reportUrl = `https://paradigmjp.com/en/work-report/${work.report_token}`
    work = await updateManualWork(work.id, {
      initial_message: generated.message ?? null,
      message_review: messageReview,
      stage: "report_generation",
      error_message: generated.ok ? null : generated.error ?? "Initial message generation failed",
    })

    const report = await buildManualJapanEntryReport({
      profile,
      audit: evidence.audit,
      form,
      initialMessage: generated.message ?? null,
      messageReview,
      reportUrl,
      sourceUrl: evidence.sourceUrl,
    })
    const eligibility = manualWorkEligibility({
      profile,
      form,
      messageOk: generated.ok,
      messagePassed: generated.review?.passed === true,
    })
    work = await updateManualWork(work.id, {
      report_data: report,
      report_url: reportUrl,
      stage: eligibility.eligible ? "twenty_sync" : "complete",
      status: eligibility.eligible ? "processing" : "needs_review",
      twenty_sync_status: eligibility.eligible ? "not_started" : "skipped",
      error_message: eligibility.eligible ? null : eligibility.reasons.join("; "),
    })
    if (!eligibility.eligible || !form.formUrl || !generated.message) {
      return { item: work, duplicate: false }
    }

    try {
      const synced = await syncManualWorkToTwenty({
        domain: normalized.domain,
        profile,
        formUrl: form.formUrl,
        reportUrl,
        initialMessage: generated.message,
      })
      work = await updateManualWork(work.id, {
        status: synced.status === "duplicate" ? "duplicate" : "completed",
        stage: "complete",
        twenty_company_id: synced.companyId,
        twenty_sync_status: synced.status,
        error_message: synced.status === "duplicate" ? "This domain already exists in Twenty; no fields were overwritten." : null,
      })
    } catch (error) {
      console.error("[manual-work] Twenty sync failed:", { id: work.id, error })
      work = await updateManualWork(work.id, {
        status: "needs_review",
        stage: "complete",
        twenty_sync_status: "failed",
        error_message: error instanceof Error ? error.message : "Twenty sync failed",
      })
    }
    return { item: work, duplicate: false }
  } catch (error) {
    return { item: await failWork(work.id, error), duplicate: false }
  }
}
