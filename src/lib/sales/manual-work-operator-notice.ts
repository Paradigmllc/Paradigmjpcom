import { manualFormDiscoveryPresentation } from "./manual-form-discovery-status"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export interface ManualWorkOperatorNotice {
  title: string
  detail: string
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

function failedAnalysisDetail(errorMessage: string | null): string {
  if (errorMessage?.includes("No public pages were available") || errorMessage?.includes("Homepage evidence could not be reused")) {
    return "企業サイトの公開ページ監査を完了できませんでした。canonical URLで再取得し、取得済みトップページを証拠として再利用するため、「再解析」を実行してください。"
  }
  if (errorMessage?.includes("Homepage returned HTTP")) {
    return "企業サイトのトップページが正常なHTMLを返しませんでした。URLとサイト稼働状況を確認してから「再解析」を実行してください。"
  }
  if (errorMessage?.includes("timed out") || errorMessage?.includes("fetch failed")) {
    return "企業サイトの取得が時間内に完了しませんでした。履歴は保持されています。時間を置いて「再解析」を実行してください。"
  }
  return "取得先または生成処理で一時的な問題が発生しました。履歴は保持されています。外部送信とTwenty追加は行わず安全に停止しています。"
}

export function manualWorkOperatorNotice(item: ManualJapanEntryWorkRow): ManualWorkOperatorNotice | null {
  if (item.twenty_sync_status === "failed") {
    return {
      title: "Twentyへの保存を完了できませんでした",
      detail: "解析結果は履歴に保存されています。「再解析・再生成」で公開情報から文面とレポートを作り直し、Twenty保存まで再確認できます。",
      retryLabel: "再解析・再生成",
      tone: "red",
    }
  }
  if (item.status === "failed") {
    return {
      title: "解析を完了できませんでした",
      detail: failedAnalysisDetail(item.error_message),
      retryLabel: "再解析",
      tone: "red",
    }
  }
  if (generationFailed(item)) {
    return {
      title: "企業別フォーム文面を再生成してください",
      detail: "公開根拠の検証または品質審査が未完了です。解析データはTwentyへ要確認として保存されますが、外部送信は行いません。「再解析」で最新の生成結果へ更新できます。",
      retryLabel: "再解析",
      tone: "amber",
    }
  }
  if (item.status === "rejected") {
    return {
      title: "対象外として安全に停止しました",
      detail: "海外SMB向けJapan Entry Packageの対象条件を満たさないため、外部送信とTwenty追加は行っていません。",
      retryLabel: "再解析",
      tone: "slate",
    }
  }
  if (item.status === "duplicate") {
    return {
      title: "Twentyの既存企業へ統合しました",
      detail: "同一ドメインの企業へ/workの解析情報を統合しています。外部送信は行いません。",
      retryLabel: "再解析",
      tone: "slate",
    }
  }
  if (item.status === "needs_review") {
    const form = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
    if (form.state !== "verified_form") {
      return {
        title: "公開問い合わせフォームの追加確認が必要です",
        detail: "解析データはTwentyへ保存済みですが、送信に使えるフォームを高い確度で確認できていません。「再探索・再生成」を実行してください。",
        retryLabel: "再探索・再生成",
        tone: "amber",
      }
    }
    return {
      title: "対象判定の追加確認が必要です",
      detail: "文面・フォーム・解析データはTwentyへ保存済みです。海外SMBまたはJapan Entry適合性の公開根拠を人が確認するまで送信不可です。",
      retryLabel: "再解析",
      tone: "amber",
    }
  }
  return null
}

export function manualWorkFailureToast(item: ManualJapanEntryWorkRow): string {
  return manualWorkOperatorNotice(item)?.title ?? "解析を完了できませんでした"
}
