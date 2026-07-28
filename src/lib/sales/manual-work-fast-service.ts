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
import { buildManualFirstTouchCopy } from "./manual-work-first-touch"
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
      contact: evidence.contact,
    })

    const rejected = profile.isJapaneseCompany || qualification.priority === "low"
    const firstTouch = rejected
      ? null
      : buildManualFirstTouchCopy({
          companyName: profile.companyName,
          productNames: evidence.productNames,
          businessModel: profile.businessModel,
          audit: evidence.audit,
          mode: "fast",
        })
    const reasonPrefix = profile.isJapaneseCompany
      ? "高速一次判定で日本企業と確認したため対象外です。"
      : qualification.priority === "promote"
        ? `高速一次判定 ${qualification.score}/100。初回文面を作成し、詳細解析への昇格を推奨します。`
        : qualification.priority === "review"
          ? `高速一次判定 ${qualification.score}/100。短文を作成済みです。必要なら詳細解析へ昇格できます。`
          : `高速一次判定 ${qualification.score}/100。現時点では営業優先度が低い候補です。`

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
        fastContact: evidence.contact,
      },
      form_discovery: evidence.contact.contactUrl
        ? {
            outcome: "contact_page_only",
            outcomeReason: "高速一次判定で公開連絡先ページ候補を確認しました。フォームの実HTML検証は詳細解析で行います。",
            verification: "page",
            confidence: 70,
            candidates: [evidence.contact.contactUrl],
            checkedUrlCount: 1,
            checkedAt: new Date().toISOString(),
            publicEmail: evidence.contact.publicEmail,
          }
        : {
            outcome: "deferred_to_full_analysis",
            outcomeReason: evidence.contact.publicEmail
              ? "高速一次判定で公開メールを確認しました。フォーム探索は詳細解析で行います。"
              : "高速一次判定では追加ページのフォーム探索を実行しません。",
            checkedUrlCount: 1,
            checkedAt: new Date().toISOString(),
            publicEmail: evidence.contact.publicEmail,
          },
      form_url: null,
      initial_message: firstTouch?.message ?? null,
      message_review: firstTouch
        ? {
            ...firstTouch.review,
            fast_qualification: qualification,
            contact_url: evidence.contact.contactUrl,
            public_email: evidence.contact.publicEmail,
          }
        : {
            purpose: "fast_qualification",
            generation_status: "not_generated_low_priority",
            automatic_send_allowed: false,
            fast_qualification: qualification,
          },
      qualification_ledger: {},
      master_lead_ledger: {},
      report_data: {},
      report_url: null,
      twenty_sync_status: "skipped",
      status: rejected ? "rejected" : "completed",
      stage: "complete",
      error_message: rejected ? `${reasonPrefix} ${qualification.reasons.join(" ")}`.slice(0, 2_000) : null,
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
