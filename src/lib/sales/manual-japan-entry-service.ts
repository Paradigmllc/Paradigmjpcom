import "server-only"
import { collectInitialFormDraftEvidence } from "./initial-form-draft-evidence"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"
import { collectManualMarketProjection } from "./manual-japan-entry-market-context"
import { analyzeManualCompanyProfile, parseManualCompanyProfile } from "./manual-japan-entry-profile"
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
  listRecentManualMessages,
  updateManualWork,
} from "./manual-japan-entry-store"
import {
  buildManualSourceLedgers,
  type ManualWorkSourceInput,
} from "./manual-japan-entry-source-ledger"
import {
  buildManualInitialMessageInput,
  manualWorkEligibility,
  manualWorkTerminalStatus,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
} from "./manual-japan-entry-workflow-helpers"
import { ManualTwentySyncError, syncManualWorkToTwenty } from "./manual-japan-entry-twenty"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { runWithManualWorkAutoRecovery } from "./manual-work-auto-recovery"
import { isExplicitManualWorkArtifactRefresh, isManualWorkRecoveryAvailable } from "./manual-work-recovery-policy"
import { discoverFormUrl } from "./sources/form-discovery"
import { verifyExternalFormDiscoveryHit } from "./sources/external-form-verification"
import { discoverWithCrawl4Ai } from "./sources/external-form-discovery"
import { slugifyCompanyName } from "./routing"

export {
  buildManualInitialMessageInput,
  manualWorkEligibility,
  manualWorkTerminalStatus,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
} from "./manual-japan-entry-workflow-helpers"

export class ManualWorkRetryConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ManualWorkRetryConflictError"
  }
}
export interface ManualWorkProcessOptions {
  retryRequested?: boolean
  expectedWorkId?: string | null
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

export function isRetryableManualWork(
  item: Parameters<typeof isManualWorkRecoveryAvailable>[0],
): boolean {
  return isManualWorkRecoveryAvailable(item)
}

export function shouldUseTwentyOnlyRetry(
  item: Pick<ManualJapanEntryWorkRow, "status" | "twenty_sync_status">,
  retryRequested: boolean,
): boolean {
  return !retryRequested && item.status === "needs_review" && item.twenty_sync_status === "failed"
}

export function buildManualWorkRetryPatch(
  existing: Pick<ManualJapanEntryWorkRow, "attempts">,
  requestedVariant: ManualJapanEntryWorkRow["message_variant_requested"],
  requestedAngle: ManualJapanEntryWorkRow["message_angle_requested"],
): Record<string, unknown> {
  return {
    status: "processing",
    stage: "fetching",
    error_message: null,
    twenty_sync_status: "not_started",
    attempts: existing.attempts + 1,
    company_name: null,
    country_code: null,
    is_japanese_company: null,
    smb_status: null,
    smb_confidence: null,
    japan_entry_fit_status: null,
    japan_entry_fit_confidence: null,
    business_model: null,
    industry: null,
    product_context: null,
    profile: {},
    evidence: {},
    form_discovery: {},
    form_url: null,
    initial_message: null,
    message_review: {},
    qualification_ledger: {},
    master_lead_ledger: {},
    report_data: {},
    report_url: null,
    message_variant_requested: requestedVariant,
    message_variant: requestedVariant,
    message_variant_fallback_reason: null,
    message_angle_requested: requestedAngle,
    message_angle: requestedAngle,
    message_angle_fallback_reason: null,
    outreach_playbook: "general_online_smb",
  }
}

export async function processManualJapanEntryUrl(
  rawUrl: string,
  variantSelection: ManualMessageVariantSelection = "auto",
  angleSelection: ManualMessageAngleSelection = "auto",
  sourceInput: ManualWorkSourceInput = { sourceSlug: "manual_input" },
  options: ManualWorkProcessOptions = {},
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
  const explicitArtifactRefresh = existing ? isExplicitManualWorkArtifactRefresh(existing, Boolean(options.retryRequested)) : false
  if (options.retryRequested) {
    if (!existing || options.expectedWorkId !== existing.id) {
      throw new ManualWorkRetryConflictError("再解析対象の履歴が更新されています。履歴を更新してからもう一度実行してください。")
    }
    if (!isRetryableManualWork(existing) && !explicitArtifactRefresh) {
      throw new ManualWorkRetryConflictError("この履歴は現在再解析できません。最新の状態を確認してください。")
    }
  }
  if (existing && !isRetryableManualWork(existing) && !explicitArtifactRefresh) {
    await attachManualWorkSource(existing.id, sourceInput)
    return { item: existing, duplicate: true }
  }

  if (existing && shouldUseTwentyOnlyRetry(existing, Boolean(options.retryRequested))) {
    await attachManualWorkSource(existing.id, sourceInput)
    if (!existing.report_url) {
      const item = await updateManualWork(existing.id, {
        status: "failed",
        stage: "failed",
        attempts: existing.attempts + 1,
        twenty_sync_status: "skipped",
        error_message: "Twenty再同期に必要な保存済みレポートURLが不足しています。解析をやり直してください。",
      })
      return { item, duplicate: false }
    }
    try {
      const retryProfile = parseManualCompanyProfile(existing.profile)
      const retrySendReady = Boolean(
        existing.form_url
        && existing.initial_message
        && jsonRecord(existing.message_review).passed === true
        && retryProfile.smbStatus === "qualified"
        && retryProfile.japanEntryFitStatus === "qualified",
      )
      const retryReasons = retrySendReady ? [] : ["Saved analysis artifacts require operator review before outreach."]
      const synced = await syncManualWorkToTwenty({
        domain: normalized.domain,
        profile: retryProfile,
        formUrl: existing.form_url,
        reportUrl: existing.report_url,
        initialMessage: existing.initial_message,
        ownedCompanyId: existing.twenty_company_id,
        readiness: {
          sendReady: retrySendReady,
          reasons: retryReasons,
        },
      })
      const item = await updateManualWork(existing.id, {
        status: retrySendReady ? "completed" : "needs_review",
        stage: "complete",
        attempts: existing.attempts + 1,
        twenty_company_id: synced.companyId,
        twenty_sync_status: synced.status,
        error_message: retrySendReady ? null : retryReasons.join("; "),
      })
      return { item, duplicate: false }
    } catch (error) {
      console.error("[manual-work] Twenty re-sync failed:", { id: existing.id, error })
      const item = await updateManualWork(existing.id, {
        attempts: existing.attempts + 1,
        twenty_company_id: error instanceof ManualTwentySyncError ? error.companyId : existing.twenty_company_id,
        twenty_sync_status: "failed",
        error_message: error instanceof Error ? error.message : "Twenty re-sync failed",
      })
      return { item, duplicate: false }
    }
  }

  let work = existing
    ? await updateManualWork(existing.id, buildManualWorkRetryPatch(existing, requestedVariant, requestedAngle))
    : await createManualWork({
        ...normalized,
        messageVariantRequested: requestedVariant,
        messageAngleRequested: requestedAngle,
      })
  try {
    await attachManualWorkSource(work.id, sourceInput)
    const evidenceRun = await runWithManualWorkAutoRecovery({
      phase: "public evidence collection",
      maxAttempts: 2,
      operation: async () => collectInitialFormDraftEvidence({
        domain: normalized.domain,
        industry: null,
        techStack: {},
      }),
    })
    const evidence = evidenceRun.value
    work = await updateManualWork(work.id, {
      stage: "classifying",
      evidence: {
        sourceUrl: evidence.sourceUrl,
        title: evidence.title,
        description: evidence.description,
        headings: evidence.headings,
        productNames: evidence.productNames,
        evidenceMode: evidence.evidenceMode,
        audit: evidence.audit,
        automaticRecovery: { evidenceAttempts: evidenceRun.attempts },
      },
      product_context: evidence.productContext,
    })

    const profileRun = await runWithManualWorkAutoRecovery({
      phase: "company classification",
      maxAttempts: 2,
      operation: async () => analyzeManualCompanyProfile({
        domain: normalized.domain,
        fallbackCompanyName: evidence.companyName,
        productContext: evidence.productContext,
        title: evidence.title,
        description: evidence.description,
        headings: evidence.headings,
        audit: evidence.audit,
      }),
    })
    const profile = profileRun.value
    work = await updateManualWork(work.id, {
      company_name: profile.companyName,
      legacy_report_slug: slugifyCompanyName(profile.companyName),
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
    const [baselineForm, crawl4ai, marketProjection] = await Promise.all([
      discoverFormUrl({
        homeUrl: origin,
        region: "global",
        enableCrawl4Ai: false,
        enableLlm: true,
        timeoutMs: 10_000,
      }),
      discoverWithCrawl4Ai({ origin, region: "global", timeoutMs: 10_000 }),
      collectManualMarketProjection({ domain: normalized.domain, profile }),
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
        productNames: evidence.productNames,
        evidenceMode: evidence.evidenceMode,
        audit: evidence.audit,
        market_visibility: marketProjection.visibility,
        message_projection: marketProjection.projection,
        automaticRecovery: {
          evidenceAttempts: evidenceRun.attempts,
          profileAttempts: profileRun.attempts,
        },
      },
      stage: "copy_generation",
    })

    const priorMessages = await listRecentManualMessages(80, work.id)
    const messageInput = buildManualInitialMessageInput({
      profile,
      evidence,
      variant: effectiveVariant,
      angle: resolvedAngle.angle,
      projection: marketProjection.projection,
      priorMessages,
    })
    const generatedRun = await runWithManualWorkAutoRecovery({
      phase: "initial message generation",
      // The generator already performs bounded transport, schema, safety, and editorial recovery.
      maxAttempts: 1,
      operation: async () => generatePersonalizedJapanEntryMessage(messageInput),
      accept: (result) => result.ok,
    })
    const generated = generatedRun.value
    const generationError = generated.ok
      ? null
      : (generated.error ?? "Initial message generation failed").slice(0, 1_500)
    if (generationError) {
      console.warn("[manual-work] initial message generation did not pass:", {
        id: work.id,
        domain: normalized.domain,
        error: generationError,
      })
    }
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
      strategy: generated.strategy ?? null,
      candidates: generated.candidates ?? [],
      selected_index: generated.selectedIndex ?? null,
      evidence_pack: generated.evidencePack ?? [],
      similarity: generated.similarity ?? null,
      generation_status: generated.ok ? "passed" : "failed",
      generation_error: generationError,
      generation_usage: generated.usage ?? null,
      automatic_generation_attempts: generatedRun.attempts,
      generated_at: new Date().toISOString(),
    }
    const reportUrl = `https://paradigmjp.com/en/work-report/${work.report_token}`
    work = await updateManualWork(work.id, {
      initial_message: generated.message ?? null,
      message_review: messageReview,
      stage: "report_generation",
      error_message: generationError,
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
      projection: marketProjection.projection,
    })
    const eligibility = manualWorkEligibility({
      profile,
      form,
      messageOk: generated.ok,
      messagePassed: generated.review?.passed === true,
    })
    const blockingReasons = [
      ...(generationError ? [`Initial message generation failed: ${generationError}`] : []),
      ...eligibility.reasons,
    ].filter((reason, index, reasons) => reasons.indexOf(reason) === index)
    const terminalStatus = manualWorkTerminalStatus(profile, eligibility.eligible)
    work = await updateManualWork(work.id, {
      report_data: report,
      report_url: reportUrl,
      stage: "twenty_sync",
      status: "processing",
      twenty_sync_status: "not_started",
      error_message: terminalStatus === "completed" ? null : blockingReasons.join("; ").slice(0, 2_000),
    })

    try {
      const syncRun = await runWithManualWorkAutoRecovery({
        phase: "Twenty persistence and read-back",
        maxAttempts: 3,
        operation: async () => syncManualWorkToTwenty({
          domain: normalized.domain,
          profile,
          formUrl: form.formUrl,
          reportUrl,
          initialMessage: generated.message ?? null,
          ownedCompanyId: work.twenty_company_id,
          readiness: { sendReady: eligibility.eligible, reasons: blockingReasons },
        }),
      })
      const synced = syncRun.value
      work = await updateManualWork(work.id, {
        status: terminalStatus,
        stage: "complete",
        twenty_company_id: synced.companyId,
        twenty_sync_status: synced.status,
        evidence: {
          ...jsonRecord(work.evidence),
          automaticRecovery: {
            evidenceAttempts: evidenceRun.attempts,
            profileAttempts: profileRun.attempts,
            messageGenerationAttempts: generatedRun.attempts,
            twentySyncAttempts: syncRun.attempts,
          },
        },
        error_message: terminalStatus === "completed" ? null : blockingReasons.join("; ").slice(0, 2_000),
      })
    } catch (error) {
      console.error("[manual-work] Twenty sync failed:", { id: work.id, error })
      work = await updateManualWork(work.id, {
        status: "needs_review",
        stage: "complete",
        twenty_company_id: error instanceof ManualTwentySyncError ? error.companyId : work.twenty_company_id,
        twenty_sync_status: "failed",
        error_message: error instanceof Error ? error.message : "Twenty sync failed",
      })
    }
    return { item: work, duplicate: false }
  } catch (error) {
    return { item: await failWork(work.id, error), duplicate: false }
  }
}
