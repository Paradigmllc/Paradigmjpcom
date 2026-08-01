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

function hasRecordedOutcome(item: ManualJapanEntryWorkRow): boolean {
  return Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}

function mode(item: ManualJapanEntryWorkRow): string {
  return typeof item.evidence.analysis_mode === "string" ? item.evidence.analysis_mode : ""
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []
}

function isChatGptMode(item: ManualJapanEntryWorkRow): boolean {
  return mode(item).startsWith("chatgpt_")
    || item.message_review.purpose === "chatgpt_handoff"
    || item.message_review.generation_status === "imported_chatgpt_pro"
}

function isLegacyUnsent(item: ManualJapanEntryWorkRow): boolean {
  return mode(item) !== "fast_qualification"
    && mode(item) !== "existing_japan_presence"
    && !isChatGptMode(item)
    && item.is_japanese_company !== true
    && item.country_code !== "JP"
    && !hasRecordedOutcome(item)
}

function fastQualification(item: ManualJapanEntryWorkRow): {
  score: number | null
  priority: "promote" | "review" | "low"
  reasons: string[]
} | null {
  if (mode(item) !== "fast_qualification") return null
  const value = item.evidence.fastQualification
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { score: null, priority: "review", reasons: [] }
  }
  const data = value as Record<string, unknown>
  const priority = data.priority === "promote" || data.priority === "low" ? data.priority : "review"
  return {
    score: typeof data.score === "number" ? data.score : null,
    priority,
    reasons: Array.isArray(data.reasons)
      ? data.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 8)
      : [],
  }
}

function formReason(item: ManualJapanEntryWorkRow): string | null {
  const form = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
  if (form.state === "verified_form") return null
  if (form.state === "contact_page_only") return "問い合わせページ候補はありますが、入力フォームの実検証は行っていません。"
  if (form.state === "no_public_form") return "サイト内を探索しましたが、使用可能な公開問い合わせフォームは見つかりませんでした。"
  if (form.state === "site_unreachable") return "企業サイトへアクセスできず、問い合わせフォームの有無を確認できませんでした。"
  return null
}

function reasonsOrFallback(item: ManualJapanEntryWorkRow, fallback: string): string[] {
  const reasons = manualWorkReasonCopies(item.error_message)
  return reasons.length > 0 ? reasons : [fallback]
}

export function manualWorkOperatorNotice(item: ManualJapanEntryWorkRow): ManualWorkOperatorNotice | null {
  if (mode(item) === "existing_japan_presence") {
    const summary = record(item.evidence.structuredSummary)
    const presence = record(summary.japanPresence)
    const level = typeof presence.level === "string" ? presence.level : "language"
    const reasons = strings(presence.signals)
    return {
      title: level === "sales"
        ? "日本向け販売・小売導線を確認しました"
        : level === "support"
          ? "日本向けサポート・現地体制を確認しました"
          : "日本語の顧客導線を確認しました",
      detail: "この企業は『日本未進出』ではありません。旧スコアや旧文面は破棄し、新規Japan Country Partner営業の送信対象から外しました。",
      reasons: reasons.length > 0 ? reasons : ["公式サイト上に日本向けの既存顧客導線があります。"],
      nextAction: "原則スキップしてください。既存日本事業の再構築・代理店切替など、別の具体的課題が確認できる場合だけ別案件として調査します。",
      retryLabel: "再評価",
      tone: "slate",
    }
  }

  if (isLegacyUnsent(item)) {
    return {
      title: "旧AI文面・旧判定を使用しません",
      detail: "この履歴は以前のDeepSeekまたは固定構造の生成工程で作られています。表示中の旧文面や旧レポートは営業送信に使わないでください。",
      reasons: [
        "再処理では文章生成APIを呼ばず、公式サイトの複数ページからChatGPT Pro用ブリーフだけを作成します。",
        "完成文はChatGPT Proで最大15社ずつ作り、返却JSONを/workへ戻して保存前検査します。",
      ],
      nextAction: "「APIなしで作り直す」を押して、まず企業ブリーフを準備してください。",
      retryLabel: "APIなしで作り直す",
      tone: "amber",
    }
  }

  const fast = fastQualification(item)
  if (fast && item.is_japanese_company !== true) {
    const score = fast.score === null ? "採点要確認" : `${fast.score}/100`
    const title = fast.priority === "promote"
      ? `一次判定 ${score}・ブリーフ候補`
      : fast.priority === "review"
        ? `一次判定 ${score}・候補`
        : `一次判定 ${score}・低優先`
    return {
      title,
      detail: "ホームページだけで高速選別しました。文章生成モデルも定型文も使っておらず、送信文はまだありません。",
      reasons: fast.reasons.length > 0 ? fast.reasons : ["一次判定に使った公開根拠を確認してください。"],
      nextAction: fast.priority === "low"
        ? "原則スキップです。判定を覆す具体的な商業根拠がある場合だけブリーフ準備へ進めてください。"
        : "残す企業なら「ChatGPTブリーフを準備」を実行します。文章は上部のChatGPT Pro handoffからまとめて作成します。",
      retryLabel: "ChatGPTブリーフを準備",
      tone: fast.priority === "low" ? "slate" : "amber",
    }
  }

  if (mode(item) === "chatgpt_brief_ready") {
    if (item.message_review.generation_status === "chatgpt_insufficient") {
      return {
        title: "ChatGPTが根拠不足と判断しました",
        detail: "無理に薄い文面を保存せず停止しています。外部AI APIと外部送信は使用していません。",
        reasons: reasonsOrFallback(item, "公開情報だけでは会社固有の強い初回文面を構成できませんでした。"),
        nextAction: "追加の公式ニュース・商品ページ・資金調達情報などがある場合だけブリーフを更新してください。",
        retryLabel: "ブリーフを更新",
        tone: "amber",
      }
    }
    return {
      title: "ChatGPT用ブリーフ準備完了",
      detail: "公式サイトの複数ページから、会社・商品・本拠地候補・日本導線・問い合わせ経路を構造化して保存しました。文章生成APIは呼び出していません。",
      reasons: ["上部のChatGPT Pro handoffから、準備済み企業を最大15社まとめてコピーできます。"],
      nextAction: "ChatGPT Proへ貼り付け、返却されたJSONを/workへ一括取込してください。",
      retryLabel: "ブリーフを更新",
      tone: "slate",
    }
  }

  if (mode(item) === "chatgpt_manual_import") return null

  if (item.status === "failed") {
    return {
      title: mode(item) === "chatgpt_brief_failed" ? "ブリーフを準備できませんでした" : "解析を完了できませんでした",
      detail: "処理を完了できなかったため、安全に停止しました。外部AI APIと外部送信は使用していません。",
      reasons: reasonsOrFallback(item, "企業サイトの取得または保存処理で一時的な問題が発生しました。"),
      nextAction: "URLと企業サイトの稼働状況を確認し、問題が解消した後に再実行してください。",
      retryLabel: "ブリーフを再準備",
      tone: "red",
    }
  }

  if (item.twenty_sync_status === "failed") {
    return {
      title: "Twentyへの保存を完了できませんでした",
      detail: "解析結果は/workの履歴に保持され、外部送信は行っていません。",
      reasons: reasonsOrFallback(item, "Twentyへの保存または読み戻し確認を完了できませんでした。"),
      nextAction: "保存先を確認してください。新しいAPIなしフローではTwenty同期を必須にしていません。",
      retryLabel: "ブリーフを準備",
      tone: "red",
    }
  }

  if (item.status === "rejected") {
    return {
      title: item.is_japanese_company || item.country_code === "JP" ? "対象外" : "低優先",
      detail: "外部送信と文面生成は行っていません。",
      reasons: reasonsOrFallback(item, item.is_japanese_company || item.country_code === "JP"
        ? "日本企業のため、海外企業向けJapan Country Partnershipの対象外です。"
        : "現在の営業対象として優先度が低い企業です。"),
      nextAction: "判定を覆す具体的な商業根拠がある場合だけ再評価してください。",
      retryLabel: "ブリーフを再評価",
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
    const reason = formReason(item)
    return {
      title: "追加確認が必要です",
      detail: "公開根拠または連絡経路の確度が不足しています。外部送信は行っていません。",
      reasons: [...reasonsOrFallback(item, "公開根拠が不足しています。"), ...(reason ? [reason] : [])]
        .filter((value, index, values) => values.indexOf(value) === index),
      nextAction: "公式サイトのContact・Salesページと企業固有の根拠を確認してください。",
      retryLabel: "ブリーフを再準備",
      tone: "amber",
    }
  }

  return null
}

export function manualWorkFailureToast(item: ManualJapanEntryWorkRow): string {
  return manualWorkOperatorNotice(item)?.title ?? "解析を完了できませんでした"
}
