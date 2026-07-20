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
      detail: "取得先または生成処理で一時的な問題が発生しました。外部送信とTwenty追加は行っていません。「再解析」を実行してください。",
      retryLabel: "再解析",
      tone: "red",
    }
  }
  if (generationFailed(item)) {
    return {
      title: "企業別フォーム文面を再生成してください",
      detail: "公開根拠の検証または品質審査が未完了です。外部送信とTwenty追加は行っていません。「再解析」で最新の生成結果へ更新できます。",
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
      title: "Twentyの既存企業を保持しました",
      detail: "同一ドメインがすでに存在するため、既存情報を上書きせず停止しました。",
      retryLabel: "再解析",
      tone: "slate",
    }
  }
  if (item.status === "needs_review") {
    const form = manualFormDiscoveryPresentation({ formUrl: item.form_url, formDiscovery: item.form_discovery })
    if (form.state !== "verified_form") {
      return {
        title: "公開問い合わせフォームの追加確認が必要です",
        detail: "送信に使えるフォームを高い確度で確認できていないため、Twenty追加を停止しています。「再探索・再生成」を実行してください。",
        retryLabel: "再探索・再生成",
        tone: "amber",
      }
    }
    return {
      title: "対象判定の追加確認が必要です",
      detail: "文面とフォームは保存済みです。海外SMBまたはJapan Entry適合性の公開根拠を人が確認するまで、Twenty追加を停止しています。",
      retryLabel: "再解析",
      tone: "amber",
    }
  }
  return null
}

export function manualWorkFailureToast(item: ManualJapanEntryWorkRow): string {
  return manualWorkOperatorNotice(item)?.title ?? "解析を完了できませんでした"
}
