import "server-only"

import { MANUAL_FORM_SIGNATURE, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import { reviewManualMessageDistinctness } from "./manual-japan-entry-message-similarity"
import {
  findManualWorkById,
  listRecentManualMessages,
  updateManualWork,
} from "./manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { manualChatGptBrief } from "./manual-work-chatgpt-handoff"

const BODY_MIN_WORDS = 60
const BODY_MAX_WORDS = 135

const BANNED_COPY = [
  /\bI reviewed your (?:website|site)\b/i,
  /\buntapped opportunity\b/i,
  /\bJapan is (?:a )?(?:large|huge|major) market\b/i,
  /\bexplore (?:a )?(?:partnership|collaboration)\b/i,
  /\bthat leaves Japan untested rather than disproven\b/i,
  /\bwe help overseas companies enter (?:the )?Japanese market\b/i,
  /\bhope this message finds you well\b/i,
]

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bwe (?:found|identified|measured|noticed) (?:that )?(?:you have|your) (?:Japan|Japanese) (?:traffic|customers?|demand|sales|revenue)\b/i,
  /\byou(?:'re| are) (?:losing|missing out on|leaving) (?:revenue|sales|money)\b/i,
  /\bJapanese (?:customers?|buyers?|users?) (?:already|are currently|want|prefer|expect)\b/i,
  /\bguarantee(?:d)?\b/i,
]

export interface ManualChatGptImportItem {
  workId: string
  status: "ready" | "insufficient"
  subject: string | null
  body: string | null
  evidenceIds: string[]
  score: number
  reasoningSummary: string | null
  insufficiencyReason: string | null
}

export interface ManualChatGptImportResult {
  workId: string
  ok: boolean
  item?: ManualJapanEntryWorkRow
  error?: string
}

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function hasOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}

function bodyIssues(input: {
  body: string
  evidenceIds: string[]
  score: number
  item: ManualJapanEntryWorkRow
}): string[] {
  const brief = manualChatGptBrief(input.item)
  if (!brief) return ["ChatGPT用ブリーフが存在しないか、根拠が不足しています"]
  const issues: string[] = []
  const count = words(input.body)
  if (count < BODY_MIN_WORDS || count > BODY_MAX_WORDS) {
    issues.push(`本文は${BODY_MIN_WORDS}〜${BODY_MAX_WORDS}語である必要があります（現在${count}語）`)
  }
  if (input.score < 88) issues.push("ChatGPT自己評価が88点未満です")
  const allowed = new Set(brief.evidence.map((point) => point.id))
  const validIds = [...new Set(input.evidenceIds.filter((id) => allowed.has(id)))]
  if (validIds.length < 2) issues.push("保存済み企業根拠IDを2件以上使用してください")
  for (const pattern of BANNED_COPY) if (pattern.test(input.body)) issues.push(`定型句を検出しました: ${pattern.source}`)
  for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) if (pattern.test(input.body)) issues.push(`未確認の断定表現を検出しました: ${pattern.source}`)
  const anchors = [brief.companyName, ...brief.productNames]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 3)
  if (!anchors.some((anchor) => input.body.toLowerCase().includes(anchor))) {
    issues.push("企業名または固有の商品名を本文に含めてください")
  }
  return issues
}

export async function importManualChatGptItem(input: ManualChatGptImportItem): Promise<ManualChatGptImportResult> {
  try {
    const existing = await findManualWorkById(input.workId)
    if (!existing) return { workId: input.workId, ok: false, error: "企業履歴が見つかりません" }
    if (existing.is_japanese_company || existing.country_code === "JP") {
      return { workId: input.workId, ok: false, error: "日本企業は対象外です" }
    }
    if (hasOutcome(existing)) {
      return { workId: input.workId, ok: false, error: "送信・返信・商談記録があるため上書きできません" }
    }
    const brief = manualChatGptBrief(existing)
    if (!brief) return { workId: input.workId, ok: false, error: "先にChatGPT用ブリーフを準備してください" }

    if (input.status === "insufficient") {
      const reason = input.insufficiencyReason?.trim() || "ChatGPTが高品質文面を作るには公開根拠が不足すると判断しました。"
      const item = await updateManualWork(existing.id, {
        status: "needs_review",
        stage: "complete",
        initial_message: null,
        evidence: { ...existing.evidence, analysis_mode: "chatgpt_brief_ready" },
        message_review: {
          ...existing.message_review,
          purpose: "chatgpt_handoff",
          generation_status: "chatgpt_insufficient",
          imported_at: new Date().toISOString(),
          score: input.score,
          insufficiency_reason: reason,
          automatic_send_allowed: false,
          api_used: false,
        },
        error_message: reason.slice(0, 2_000),
      })
      return { workId: input.workId, ok: true, item }
    }

    const body = input.body?.trim() ?? ""
    const issues = bodyIssues({ body, evidenceIds: input.evidenceIds, score: input.score, item: existing })
    const priorMessages = await listRecentManualMessages(100, existing.id)
    const message = [manualFormGreeting(brief.companyName), body, MANUAL_FORM_SIGNATURE].join("\n\n")
    const similarity = reviewManualMessageDistinctness({
      message,
      companyName: brief.companyName,
      priorMessages,
      threshold: 0.30,
      ctaThreshold: 0.38,
    })
    if (!similarity.passed) issues.push(...similarity.reasons)
    if (issues.length > 0) {
      return { workId: input.workId, ok: false, error: [...new Set(issues)].join(" / ") }
    }

    const validEvidenceIds = [...new Set(input.evidenceIds.filter((id) => brief.evidence.some((point) => point.id === id)))]
    const item = await updateManualWork(existing.id, {
      status: "completed",
      stage: "complete",
      initial_message: message,
      evidence: { ...existing.evidence, analysis_mode: "chatgpt_manual_import" },
      message_review: {
        ...existing.message_review,
        purpose: "initial_interest",
        generation_status: "imported_chatgpt_pro",
        generation_engine: "chatgpt_pro_manual_handoff",
        imported_at: new Date().toISOString(),
        subject: input.subject?.trim() || null,
        score: input.score,
        reasoning_summary: input.reasoningSummary?.trim() || null,
        evidence_ids: validEvidenceIds,
        validation: {
          word_count: words(body),
          similarity_passed: similarity.passed,
          max_similarity: similarity.maxSimilarity,
          max_cta_similarity: similarity.maxCtaSimilarity ?? null,
        },
        automatic_send_allowed: false,
        api_used: false,
      },
      error_message: null,
    })
    return { workId: input.workId, ok: true, item }
  } catch (error) {
    return {
      workId: input.workId,
      ok: false,
      error: error instanceof Error ? error.message : "ChatGPT出力を保存できませんでした",
    }
  }
}
