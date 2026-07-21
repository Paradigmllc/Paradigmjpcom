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
    return "canonical URLと取得済みトップページの再利用を試しましたが、企業サイトの公開ページ監査を完了できませんでした。"
  }
  if (errorMessage?.includes("Homepage returned HTTP")) {
    return "企業サイトのトップページが正常なHTMLを返しませんでした。URLまたはサイト稼働状況の確認が必要です。"
  }
  if (errorMessage?.includes("timed out") || errorMessage?.includes("fetch failed")) {
    return "企業サイトの取得が時間内に完了しませんでした。取得履歴は保持されています。"
  }
  return "取得先または生成処理で一時的な問題が発生しました。履歴は保持されています。外部送信とTwenty追加は行わず安全に停止しています。"
}

export function manualWorkOperatorNotice(item: ManualJapanEntryWorkRow): ManualWorkOperatorNotice | null {
  if (item.twenty_sync_status === "failed") {
    return {
      title: "Twentyへの保存を完了できませんでした",
      detail: "初回処理内の自動再試行後もTwentyの保存確認だけが完了しませんでした。解析結果は履歴に保持され、外部送信は行っていません。復旧操作ではTwenty保存を優先して再確認します。",
      retryLabel: "保存を復旧",
      tone: "red",
    }
  }
  if (item.status === "failed") {
    return {
      title: "解析を完了できませんでした",
      detail: `${failedAnalysisDetail(item.error_message)} 初回処理内の自動再試行は完了しています。`,
      retryLabel: "復旧再実行",
      tone: "red",
    }
  }
  if (generationFailed(item) && item.status !== "rejected") {
    return {
      title: "企業別フォーム文面を再生成してください",
      detail: "公開根拠の検証または品質審査が自動修正後も基準を満たしませんでした。解析データはTwentyへ要確認として保存され、外部送信は行いません。",
      retryLabel: "復旧再実行",
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
        detail: "通常探索・Crawl4AI・実HTML検証は完了していますが、送信に使える公開フォームを高い確度で確認できませんでした。解析データはTwentyへ保存済みです。",
        retryLabel: "人が確認",
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
