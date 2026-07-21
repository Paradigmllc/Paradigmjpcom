import type { collectInitialFormDraftEvidence } from "./initial-form-draft-evidence"
import { manualFormCompanyName } from "./manual-japan-entry-copy-envelope"
import { updateManualWork } from "./manual-japan-entry-store"
import { markManualWorkTargetRejectedInTwenty } from "./manual-japan-entry-twenty"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

type ManualHomepageEvidence = Awaited<ReturnType<typeof collectInitialFormDraftEvidence>>

const PARKED_OR_PLACEHOLDER_PATTERNS = [
  /references to any specific company, product or services on this site are not controlled by godaddy\.com/i,
  /(?:this )?domain (?:name )?is (?:parked|for sale|available for (?:sale|purchase))/i,
  /buy this domain/i,
  /(?:domain|website) (?:has been|is) registered (?:but|and).{0,100}(?:available|for sale)/i,
  /die domain ist zwar bereits registriert, aber vielleicht noch erhältlich/i,
  /sedo domain parking/i,
  /hugedomains\.com/i,
  /apache2? (?:ubuntu )?default page/i,
  /welcome to nginx/i,
] as const

function evidenceText(evidence: ManualHomepageEvidence): string {
  return [
    evidence.companyName,
    evidence.title,
    evidence.description,
    ...evidence.headings,
    evidence.productContext,
  ].filter((value): value is string => Boolean(value)).join(" | ")
}

export function manualCompanyEvidenceRejectionReason(
  evidence: ManualHomepageEvidence,
): string | null {
  const text = evidenceText(evidence)
  if (PARKED_OR_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
    return "公開ページは運営企業の商材サイトではなく、駐車・販売・初期設定ページと判定されました"
  }
  return null
}

export async function rejectManualWorkNonCompanyEvidence(
  work: ManualJapanEntryWorkRow,
  evidence: ManualHomepageEvidence,
): Promise<ManualJapanEntryWorkRow | null> {
  const reason = manualCompanyEvidenceRejectionReason(evidence)
  if (!reason) return null
  const companyName = manualFormCompanyName(evidence.companyName ?? work.domain)
  let twentySyncStatus: ManualJapanEntryWorkRow["twenty_sync_status"] = "skipped"
  if (work.twenty_company_id) {
    try {
      await markManualWorkTargetRejectedInTwenty({
        companyId: work.twenty_company_id,
        companyName,
        domain: work.domain,
        reason,
      })
      twentySyncStatus = "synced"
    } catch (error) {
      console.error("[manual-work] rejected target Twenty cleanup failed:", {
        id: work.id,
        companyId: work.twenty_company_id,
        error,
      })
      twentySyncStatus = "failed"
    }
  }
  return updateManualWork(work.id, {
    status: "rejected",
    stage: "complete",
    company_name: companyName,
    is_japanese_company: false,
    smb_status: "rejected",
    smb_confidence: 100,
    japan_entry_fit_status: "rejected",
    japan_entry_fit_confidence: 100,
    form_discovery: {},
    form_url: null,
    initial_message: null,
    message_review: {},
    report_data: {},
    report_url: null,
    legacy_report_slug: null,
    twenty_sync_status: twentySyncStatus,
    error_message: `対象外: ${reason}`,
  })
}
