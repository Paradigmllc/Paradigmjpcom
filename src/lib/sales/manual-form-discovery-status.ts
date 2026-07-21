export type ManualFormDiscoveryState =
  | "verified_form"
  | "contact_page_only"
  | "no_public_form"
  | "site_unreachable"
  | "unverified"

export interface ManualFormDiscoveryPresentation {
  state: ManualFormDiscoveryState
  label: string
  detail: string
  checkedUrlCount: number | null
  checkedAt: string | null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null
}

export function manualFormDiscoveryPresentation(input: {
  formUrl: string | null
  formDiscovery: Record<string, unknown>
}): ManualFormDiscoveryPresentation {
  const discovery = record(input.formDiscovery)
  const inspection = record(discovery.inspection)
  const outcome = typeof discovery.outcome === "string" ? discovery.outcome : null
  const checkedUrlCount = count(discovery.checkedUrlCount)
  const checkedAt = typeof discovery.checkedAt === "string" ? discovery.checkedAt : null
  const savedReason = typeof discovery.outcomeReason === "string" ? discovery.outcomeReason : null
  const fields = new Set(Array.isArray(inspection.fields) ? inspection.fields.filter((field): field is string => typeof field === "string") : [])
  const confidence = count(discovery.confidence) ?? 0

  if (
    input.formUrl
    && discovery.verification === "form"
    && inspection.status === "form"
    && confidence >= 90
    && fields.has("email")
    && fields.has("message")
    && fields.has("submit")
  ) {
    return {
      state: "verified_form",
      label: "送信フォーム確認済み",
      detail: savedReason ?? "メール・本文・送信操作を備えた公開問い合わせフォームを確認しました。",
      checkedUrlCount,
      checkedAt,
    }
  }
  if (outcome === "contact_page_only" || discovery.verification === "page") {
    return {
      state: "contact_page_only",
      label: "問い合わせページのみ",
      detail: savedReason ?? "問い合わせ案内ページは確認できましたが、入力して送信できる公開フォームはありません。",
      checkedUrlCount,
      checkedAt,
    }
  }
  if (outcome === "no_public_form" || inspection.reason === "spa_fallback_duplicate" || discovery.verification === "fallback") {
    return {
      state: "no_public_form",
      label: "公開フォームなし",
      detail: savedReason ?? "ホーム、サイトマップ、問い合わせ候補、一般的な問い合わせパスを確認しましたが、使用可能な公開フォームは見つかりませんでした。",
      checkedUrlCount,
      checkedAt,
    }
  }
  if (outcome === "site_unreachable") {
    return {
      state: "site_unreachable",
      label: "サイト取得不可",
      detail: savedReason ?? "サイトへアクセスできず、フォームの有無を確認できませんでした。時間を置いて再探索してください。",
      checkedUrlCount,
      checkedAt,
    }
  }
  return {
    state: "unverified",
    label: "フォーム要確認",
    detail: savedReason ?? "前回の探索結果に十分な診断情報がないため、フォームを再探索してください。",
    checkedUrlCount,
    checkedAt,
  }
}
