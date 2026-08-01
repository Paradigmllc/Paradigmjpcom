import "server-only"

import type { ManualMessageAngleSelection } from "./manual-japan-entry-angle"
import type { ManualMessageVariantSelection } from "./manual-japan-entry-experiment"
import type { ManualWorkSourceInput } from "./manual-japan-entry-source-ledger"
import {
  attachManualWorkSource,
  createManualWork,
  findManualLeadSource,
  findManualWorkByDomain,
  updateManualWork,
} from "./manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { normalizeManualWorkUrl } from "./manual-japan-entry-workflow-helpers"
import { failManualWork } from "./manual-work-failure-persistence"
import { collectFastManualWorkEvidence } from "./manual-work-fast-evidence"
import { buildFastManualCompanyProfile } from "./manual-work-fast-qualification"
import { slugifyCompanyName } from "./routing"

export interface FastManualWorkProcessResult {
  item: ManualJapanEntryWorkRow
  duplicate: boolean
  artifactsPreserved: false
}

function hasRecordedOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(
    item.manually_sent_at
    || item.reply_received_at
    || item.founder_forwarded_at
    || item.meeting_converted_at,
  )
}

export async function processFastManualWorkUrl(
  rawUrl: string,
  variantSelection: ManualMessageVariantSelection = "auto",
  angleSelection: ManualMessageAngleSelection = "auto",
  sourceInput: ManualWorkSourceInput = { sourceSlug: "manual_input" },
): Promise<FastManualWorkProcessResult> {
  const normalized = normalizeManualWorkUrl(rawUrl)
  const sourceCatalog = await findManualLeadSource(sourceInput.sourceSlug)
  if (!sourceCatalog) throw new Error("選択した営業ソースは台帳に存在しません")

  const requestedVariant = variantSelection === "auto" ? "estimate_off_price_off" : variantSelection
  const requestedAngle = angleSelection === "auto" ? "problem" : angleSelection
  const existing = await findManualWorkByDomain(normalized.domain)
  if (existing && hasRecordedOutcome(existing)) {
    await attachManualWorkSource(existing.id, sourceInput)
    return { item: existing, duplicate: true, artifactsPreserved: false }
  }

  let work = existing
    ? await updateManualWork(existing.id, {
        status: "processing",
        stage: "fetching",
        attempts: existing.attempts + 1,
        message_variant_requested: requestedVariant,
        message_variant: requestedVariant,
        message_angle_requested: requestedAngle,
        message_angle: requestedAngle,
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
        twenty_sync_status: "skipped",
        error_message: null,
      })
    : await createManualWork({
        ...normalized,
        messageVariantRequested: requestedVariant,
        messageAngleRequested: requestedAngle,
      })

  try {
    await attachManualWorkSource(work.id, sourceInput)
    const evidence = await collectFastManualWorkEvidence(normalized.domain)
    const { profile, qualification } = buildFastManualCompanyProfile({
      domain: normalized.domain,
      companyName: evidence.companyName,
      productContext: evidence.productContext,
      productNames: evidence.productNames,
      businessModel: evidence.businessModel,
      title: evidence.title,
      description: evidence.description,
      headings: evidence.headings,
      audit: evidence.audit,
    })

    const rejected = profile.isJapaneseCompany || qualification.priority === "low"
    const reason = profile.isJapaneseCompany
      ? "高速一次判定で日本企業と確認したため対象外です。"
      : `高速一次判定 ${qualification.score}/100。現時点では営業優先度が低い候補です。 ${qualification.reasons.join(" ")}`

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
      evidence: {
        analysis_mode: "fast_qualification",
        sourceUrl: evidence.sourceUrl,
        title: evidence.title,
        description: evidence.description,
        headings: evidence.headings,
        productNames: evidence.productNames,
        evidenceMode: evidence.evidenceMode,
        audit: evidence.audit,
        fastQualification: qualification,
      },
      form_discovery: {
        outcome: "deferred_to_chatgpt_brief",
        outcomeReason: "高速一次判定ではフォーム探索と送信文生成を実行しません。残す企業だけChatGPT Pro用ブリーフへ進めます。",
        checkedUrlCount: 0,
        checkedAt: new Date().toISOString(),
      },
      form_url: null,
      initial_message: null,
      message_review: {
        purpose: "fast_qualification",
        generation_status: "not_requested",
        automatic_send_allowed: false,
        api_used: false,
        fast_qualification: qualification,
      },
      qualification_ledger: {},
      master_lead_ledger: {},
      report_data: {},
      report_url: null,
      twenty_company_id: existing?.twenty_company_id ?? null,
      twenty_sync_status: "skipped",
      status: rejected ? "rejected" : "completed",
      stage: "complete",
      error_message: rejected ? reason.slice(0, 2_000) : null,
    })

    return { item: work, duplicate: false, artifactsPreserved: false }
  } catch (error) {
    return {
      item: await failManualWork(work, error, null),
      duplicate: false,
      artifactsPreserved: false,
    }
  }
}
