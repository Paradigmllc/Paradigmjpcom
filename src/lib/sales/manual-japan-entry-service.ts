import "server-only"

import { collectInitialFormDraftEvidence } from "./initial-form-draft-evidence"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"
import { collectManualMarketProjection } from "./manual-japan-entry-market-context"
import { analyzeManualCompanyProfile } from "./manual-japan-entry-profile"
import {
  assignManualMessageVariant,
  isManualMessageVariant,
  nonEstimateVariant,
  type ManualMessageVariantSelection,
  variantOptions,
} from "./manual-japan-entry-experiment"
import {
  assignManualMessageAngle,
  isManualMessageAngle,
  resolveManualMessageAngle,
  type ManualMessageAngleSelection,
} from "./manual-japan-entry-angle"
import {
  createManualWork,
  attachManualWorkSource,
  findManualLeadSource,
  findManualWorkByDomain,
  updateManualWork,
} from "./manual-japan-entry-store"
import {
  buildManualSourceLedgers,
  type ManualWorkSourceInput,
} from "./manual-japan-entry-source-ledger"
import {
  buildManualInitialMessageInput,
  manualWorkEligibility,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
} from "./manual-japan-entry-workflow-helpers"
import { syncManualWorkToTwenty } from "./manual-japan-entry-twenty"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { discoverFormUrl } from "./sources/form-discovery"
import { verifyExternalFormDiscoveryHit } from "./sources/external-form-verification"
import { discoverWithCrawl4Ai } from "./sources/external-form-discovery"
import { findTwentyCompanyByDomain } from "./twenty-sync-company-home"

export {
  buildManualInitialMessageInput,
  manualWorkEligibility,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
} from "./manual-japan-entry-workflow-helpers"

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

export function isRetryableManualWork(item: Pick<ManualJapanEntryWorkRow, "status">): boolean {
  return item.status === "failed"
}

export async function processManualJapanEntryUrl(
  rawUrl: string,
  variantSelection: ManualMessageVariantSelection = "auto",
  angleSelection: ManualMessageAngleSelection = "auto",
  sourceInput: ManualWorkSourceInput = { sourceSlug: "manual_input" },
): Promise<{
  item: ManualJapanEntryWorkRow
  duplicate: boolean
}> {
  const normalized = normalizeManualWorkUrl(rawUrl)
  const requestedVariant = isManualMessageVariant(variantSelection)
    ? variantSelection
    : assignManualMessageVariant(normalized.domain)
  const requestedAngle = isManualMessageAngle(angleSelection)
    ? angleSelection
    : assignManualMessageAngle(normalized.domain)
  const sourceCatalog = await findManualLeadSource(sourceInput.sourceSlug)
  if (!sourceCatalog) throw new Error("選択した営業ソースは台帳に存在しません")
  const existing = await findManualWorkByDomain(normalized.domain)
  if (existing && !isRetryableManualWork(existing)) {
    await attachManualWorkSource(existing.id, sourceInput)
    return { item: existing, duplicate: true }
  }

  let work = existing
    ? await updateManualWork(existing.id, {
        status: "processing",
        stage: "fetching",
        error_message: null,
        twenty_sync_status: "not_started",
        message_variant_requested: requestedVariant,
        message_angle_requested: requestedAngle,
      })
    : await createManualWork({
        ...normalized,
        messageVariantRequested: requestedVariant,
        messageAngleRequested: requestedAngle,
      })
  try {
    await attachManualWorkSource(work.id, sourceInput)
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
      outreach_playbook: profile.outreachPlaybook,
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
    const effectiveOptions = variantOptions(effectiveVariant)
    const resolvedAngle = resolveManualMessageAngle({
      requested: requestedAngle,
      hasVerifiedCompetitor: false,
      hasModeledOpportunity: effectiveOptions.includeEstimate && Boolean(marketProjection.projection),
      hasPreparedPositioningConcept: Boolean(profile.positioningConcept),
    })
    const sourceLedgers = buildManualSourceLedgers({
      domain: normalized.domain,
      source: sourceCatalog,
      sourcePageUrl: sourceInput.sourcePageUrl?.trim() || null,
      sourceDate: sourceInput.observedOn ?? new Date().toISOString().slice(0, 10),
      profile,
      audit: evidence.audit,
      form,
      projection: marketProjection.projection,
    })
    work = await updateManualWork(work.id, {
      form_discovery: { ...form, crawl4ai, baseline: baselineForm, verified_crawl4ai: verifiedCrawl4Ai },
      form_url: form.formUrl,
      message_variant: effectiveVariant,
      message_variant_fallback_reason: marketProjection.fallbackReason,
      message_angle: resolvedAngle.angle,
      message_angle_fallback_reason: resolvedAngle.fallbackReason,
      qualification_ledger: sourceLedgers.qualification,
      master_lead_ledger: sourceLedgers.master,
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
      angle: resolvedAngle.angle,
      projection: marketProjection.projection,
    }))
    const messageReview = {
      ...jsonRecord(generated.review),
      purpose: "initial_interest",
      product_context_source: "public_homepage",
      message_variant_requested: requestedVariant,
      message_variant: effectiveVariant,
      message_variant_fallback_reason: marketProjection.fallbackReason,
      message_angle_requested: requestedAngle,
      message_angle: resolvedAngle.angle,
      message_angle_fallback_reason: resolvedAngle.fallbackReason,
      outreach_playbook: profile.outreachPlaybook,
      positioning_concept_prepared: Boolean(profile.positioningConcept),
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
      qualificationLedger: sourceLedgers.qualification,
      masterLeadLedger: sourceLedgers.master,
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
