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
  return item.message_review.generation_status === "failed" || (
    item.stage === "complete"
    && !item.initial_message
    && Boolean(item.error_message)
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
  if (form.state === "contact_page_only") return "問い合わせ案内ページはありますが、入力して送信できる公開フォームを確認できませんでした。"
  if (form.state === "no_public_form") return "サイト内を探索しましたが、使用可能な公開問い合わせフォームは見つかりませんでした。"
  if (form.state === "site_unreachable") return "企業サイトへアクセスできず、問い合わせフォームの有無を確認できませんでした。"
  return "フォーム探索結果の確度が不足しているため、有効な問い合わせフォームを確定できませんでした。"
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
      ? `送信候補 ${score}`
      : fast.priority === "review"
        ? `一次判定完了 ${score}`
        : `低優先 ${score}`
    const hasDraft = Boolean(item.initial_message)
    return {
      title,
      detail: hasDraft
        ? "ホームページだけで高速判定し、短い初回メッセージを作成しました。追加のフォーム実検証・詳細レポート・Twenty同期はまだ実行していません。"
        : "ホームページだけで高速判定しました。低優先候補のため初回メッセージは作成していません。",
      reasons: fast.reasons.length > 0
        ? fast.reasons
        : reasonsOrFallback(item, "高速一次判定の根拠を履歴から確認してください。"),
      nextAction: fast.priority === "low"
        ? "追加の強い成長・商品・予算根拠がある場合だけ「詳細解析へ昇格」を実行してください。"
        : "短文をそのまま確認して連絡するか、重要候補だけ「詳細解析へ昇格」でフォーム検証・詳細レポート・Twenty保存へ進めてください。",
      retryLabel: "詳細解析へ昇格",
      tone: fast.priority === "promote" ? "slate" : fast.priority === "review" ? "amber" : "slate",
    }
  }

  if (item.status === "failed") {
    return {
      title: "解析を完了できませんでした",
      detail: "初回処理内の自動再試行後も解析を完了できなかったため、安全に停止しました。",
      reasons: reasonsOrFallback(item, "取得先または生成処理で一時的な問題が発生しました。"),
      nextAction: "URLと企業サイトの稼働状況を確認し、問題が解消した後に「復旧再実行」を実行してください。",
      retryLabel: "復旧再実行",
      tone: "red",
    }
  }
  if (generationFailed(item) && item.status !== "rejected") {
    return {
      title: "企業別フォーム文面を再生成してください",
      detail: "解析データはTwentyへ要確認として保存され、外部送信は行っていません。",
      reasons: reasonsWithForm(item, "初回文面が事実確認・企業固有性・安全性の品質基準を通過しませんでした。"),
      nextAction: "公開根拠を確認してから「復旧再実行」を実行し、合格文面が表示されるまで送信しないでください。",
      retryLabel: "復旧再実行",
      tone: "amber",
    }
  }
  if (preservedRegenerationFailure(item) && item.status !== "rejected") {
    return {
      title: "最新文面への更新を完了できませんでした",
      detail: "既存の合格済み文面とレポートは保持し、外部送信は行っていません。",
      reasons: ["最新の品質基準による文面再生成が、自動修正後も合格しませんでした。"],
      nextAction: "既存文面をそのまま送信せず、「更新を再実行」後の品質スコアと根拠を確認してください。",
      retryLabel: "更新を再実行",
      tone: "amber",
    }
  }
  if (item.status === "rejected") {
    const rejectedReasons = reasonsOrFallback(
      item,
      item.is_japanese_company || item.country_code === "JP"
        ? "日本企業のため、海外SMB向けJapan Country Partnershipの対象外です。"
        : "企業サイトではない、または海外SMB向けJapan Country Partnershipの対象条件を満たしません。",
    )
    return {
      title: "対象外として安全に停止しました",
      detail: "海外SMB向けJapan Country Partnershipの対象条件を満たさないため、外部送信とTwenty追加は行っていません。",
      reasons: rejectedReasons,
      nextAction: "対象判定が誤っていると確認できた場合だけ、正しい企業URLで再解析してください。",
      retryLabel: "再解析",
      tone: "slate",
    }
  }
  if (item.status === "duplicate") {
    return {
      title: "Twentyの既存企業へ統合しました",
      detail: "同一ドメインの企業へ/workの解析情報を統合しています。外部送信は行いません。",
      reasons: ["同一ドメインの企業がTwentyに既に存在したため、新規企業を重複作成しませんでした。"],
      nextAction: "Twentyの既存企業で文面・フォームURL・レポートURLを確認してください。",
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
        title: "公開問い合わせフォームの追加確認が必要です",
        detail: "通常探索・Crawl4AI・実HTML検証は完了していますが、送信に使える公開フォームを高い確度で確認できませんでした。解析データはTwentyへ保存済みです。",
        reasons: [...savedReasons, ...(missingFormReason ? [missingFormReason] : [])]
          .filter((reason, index, reasons) => reasons.indexOf(reason) === index),
        nextAction: "公式サイトのContact・Support・Salesページを人が確認し、有効なフォームがなければ送信対象外として扱ってください。",
        retryLabel: "人が確認",
        tone: "amber",
      }
    }
    return {
      title: "対象判定の追加確認が必要です",
      detail: "文面・フォーム・解析データはTwentyへ保存済みです。海外SMBまたはJapan Country Partnership適合性の公開根拠を人が確認するまで送信不可です。",
      reasons: savedReasons.length > 0
        ? savedReasons
        : ["海外SMBまたはJapan Country Partnership適合性を確定する公開根拠が不足しています。"],
      nextAction: "会社概要・顧客地域・価格・チーム規模を確認し、対象条件を満たす場合だけ送信可否を判断してください。",
      retryLabel: "再解析",
      tone: "amber",
    }
  }
  return null
}

export function manualWorkFailureToast(item: ManualJapanEntryWorkRow): string {
  return manualWorkOperatorNotice(item)?.title ?? "解析を完了できませんでした"
}
