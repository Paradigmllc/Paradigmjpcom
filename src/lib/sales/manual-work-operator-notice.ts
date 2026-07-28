import { manualFormDiscoveryPresentation } from "./manual-form-discovery-status"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { manualWorkReasonCopies } from "./manual-work-reasons"

export interface ManualWorkOperatorNotice {
  title: string
  detail: string
  reasons: string[]
  nextAction: string
  retryLabel: string
  tone: "amber" | "red" | "slate"
}

function generationFailed(item: ManualJapanEntryWorkRow): boolean {
  return ["failed", "failed_quality_gate"].includes(String(item.message_review.generation_status ?? "")) || (
    item.stage === "complete"
    && !item.initial_message
    && Boolean(item.error_message)
    && item.evidence.analysis_mode !== "fast_qualification"
  )
}

function preservedRegenerationFailure(item: ManualJapanEntryWorkRow): boolean {
  const value = item.message_review.last_regeneration_failure
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && "artifacts_preserved" in value
    && value.artifacts_preserved === true,
  )
}

function fastQualification(item: ManualJapanEntryWorkRow): {
  score: number | null
  priority: "promote" | "review" | "low"
  reasons: string[]
} | null {
  if (item.evidence.analysis_mode !== "fast_qualification") return null
  const value = item.evidence.fastQualification
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { score: null, priority: "review", reasons: [] }
  }
  const record = value as Record<string, unknown>
  const priority = record.priority === "promote" || record.priority === "low" ? record.priority : "review"
  return {
    score: typeof record.score === "number" ? record.score : null,
    priority,
    reasons: Array.isArray(record.reasons)
      ? record.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 8)
      : [],
  }
}

function formReason(item: ManualJapanEntryWorkRow): string | null {
  const form = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
  if (form.state === "verified_form") return null
  if (form.state === "contact_page_only") return "問い合わせページ候補はありますが、入力フォームの実検証は行っていません。"
  if (form.state === "no_public_form") return "サイト内を探索しましたが、使用可能な公開問い合わせフォームは見つかりませんでした。"
  if (form.state === "site_unreachable") return "企業サイトへアクセスできず、問い合わせフォームの有無を確認できませんでした。"
  return "連絡経路の確度が不足しています。"
}

function reasonsOrFallback(item: ManualJapanEntryWorkRow, fallback: string): string[] {
  const reasons = manualWorkReasonCopies(item.error_message)
  return reasons.length > 0 ? reasons : [fallback]
}

function reasonsWithForm(item: ManualJapanEntryWorkRow, fallback: string): string[] {
  const reasons = reasonsOrFallback(item, fallback)
  const missingFormReason = formReason(item)
  return [...reasons, ...(missingFormReason ? [missingFormReason] : [])]
    .filter((reason, index, values) => values.indexOf(reason) === index)
}

export function manualWorkOperatorNotice(item: ManualJapanEntryWorkRow): ManualWorkOperatorNotice | null {
  if (item.twenty_sync_status === "failed") {
    const persistedReasons = manualWorkReasonCopies(item.error_message)
    const reasons = [
      "自動再試行後もTwentyへの保存または保存内容の読み戻し確認を完了できませんでした。",
      ...persistedReasons,
    ].filter((reason, index, values) => values.indexOf(reason) === index)
    return {
      title: "Twentyへの保存を完了できませんでした",
      detail: "解析結果は/workの履歴に保持され、外部送信は行っていません。",
      reasons,
      nextAction: "「保存を復旧」を実行し、Twentyの企業ID・文面・フォームURL・レポートURLの読み戻し完了を確認してください。",
      retryLabel: "保存を復旧",
      tone: "red",
    }
  }

  const fast = fastQualification(item)
  if (fast && item.is_japanese_company !== true) {
    const score = fast.score === null ? "採点要確認" : `${fast.score}/100`
    const title = fast.priority === "promote"
      ? `一次判定 ${score}・高品質文面候補`
      : fast.priority === "review"
        ? `一次判定 ${score}・候補`
        : `一次判定 ${score}・低優先`
    return {
      title,
      detail: "ホームページだけで高速選別しました。この段階ではDeepSeekも定型文も使用しておらず、送信文はまだ作っていません。",
      reasons: fast.reasons.length > 0
        ? fast.reasons
        : ["一次判定に使った公開根拠を確認してください。"],
      nextAction: fast.priority === "low"
        ? "原則スキップです。公開情報にない強い理由がある場合だけ高品質文面へ進めてください。"
        : "残す企業なら「GPT-5.6文面を作る」を実行します。複数ページを短時間で読み、会社固有の論点から文章を新規作成します。",
      retryLabel: "GPT-5.6文面を作る",
      tone: fast.priority === "low" ? "slate" : "amber",
    }
  }

  if (item.status === "failed") {
    return {
      title: "解析を完了できませんでした",
      detail: "処理を完了できなかったため、安全に停止しました。",
      reasons: reasonsOrFallback(item, "取得先または生成処理で一時的な問題が発生しました。"),
      nextAction: "URLと企業サイトの稼働状況を確認し、問題が解消した後に再実行してください。",
      retryLabel: "復旧再実行",
      tone: "red",
    }
  }
  if (generationFailed(item) && item.status !== "rejected") {
    return {
      title: "高品質文面を採用できませんでした",
      detail: "GPT-5.6編集工程または決定論的な固有性・根拠・類似度ゲートを通過しませんでした。外部送信は行っていません。",
      reasons: reasonsWithForm(item, "会社固有の根拠または文章品質が採用基準に届きませんでした。"),
      nextAction: "公開ページの情報量を確認し、十分な根拠が増えた場合だけ再生成してください。",
      retryLabel: "GPT-5.6で再生成",
      tone: "amber",
    }
  }
  if (preservedRegenerationFailure(item) && item.status !== "rejected") {
    return {
      title: "最新文面への更新を完了できませんでした",
      detail: "既存の合格済み文面とレポートは保持し、外部送信は行っていません。",
      reasons: ["最新の品質基準による文面再生成が、自動修正後も合格しませんでした。"],
      nextAction: "既存文面をそのまま送信せず、更新後の品質スコアと根拠を確認してください。",
      retryLabel: "更新を再実行",
      tone: "amber",
    }
  }
  if (item.status === "rejected") {
    const rejectedReasons = reasonsOrFallback(
      item,
      item.is_japanese_company || item.country_code === "JP"
        ? "日本企業のため、海外SMB向けJapan Country Partnershipの対象外です。"
        : "現在のJapan Country Partnership営業対象として優先度が低い企業です。",
    )
    return {
      title: item.is_japanese_company || item.country_code === "JP" ? "対象外" : "低優先",
      detail: "外部送信と自動文面生成は行っていません。",
      reasons: rejectedReasons,
      nextAction: "判定を覆す具体的な商業根拠がある場合だけ再評価してください。",
      retryLabel: "再評価",
      tone: "slate",
    }
  }
  if (item.status === "duplicate") {
    return {
      title: "既存企業へ統合しました",
      detail: "同一ドメインの履歴へ情報を統合しています。外部送信は行いません。",
      reasons: ["同一ドメインの企業が既に存在したため、新規企業を重複作成しませんでした。"],
      nextAction: "既存の企業履歴を確認してください。",
      retryLabel: "再解析",
      tone: "slate",
    }
  }
  if (item.status === "needs_review") {
    const form = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
    const savedReasons = manualWorkReasonCopies(item.error_message)
    if (form.state !== "verified_form") {
      const missingFormReason = formReason(item)
      return {
        title: "追加確認が必要です",
        detail: "文面または連絡経路の採用基準を満たしていません。外部送信は行っていません。",
        reasons: [...savedReasons, ...(missingFormReason ? [missingFormReason] : [])]
          .filter((reason, index, reasons) => reasons.indexOf(reason) === index),
        nextAction: "公式サイトのContact・Salesページと文面根拠を人が確認してください。",
        retryLabel: "人が確認",
        tone: "amber",
      }
    }
    return {
      title: "追加確認が必要です",
      detail: "文面・フォーム・解析データは保存済みですが、送信前に人の判断が必要です。",
      reasons: savedReasons.length > 0 ? savedReasons : ["公開根拠が不足しています。"],
      nextAction: "会社固有の根拠と送信先を確認してください。",
      retryLabel: "再解析",
      tone: "amber",
    }
  }
  return null
}

export function manualWorkFailureToast(item: ManualJapanEntryWorkRow): string {
  return manualWorkOperatorNotice(item)?.title ?? "解析を完了できませんでした"
}
