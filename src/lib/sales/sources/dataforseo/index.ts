/**
 * lib/sales/sources/dataforseo/index.ts — Sprint 14 DataForSEO 移植 (Phase A) orchestrator
 *
 * 役割: domain を渡すと DataForSEO 経由で SEO 系メトリクスを集約取得.
 *       Phase A: Lighthouse (mobile + desktop 並列) のみ.
 *       Phase B (report 設計後): on-page audit / backlinks / GEO LLM mentions を追加予定.
 *
 * 入力: domain (例 "example.com" or "https://example.com")
 * 出力: SeoScanResult { mobile, desktop, totalCostUsd, errors[] }
 *
 * コスト感: 1 ドメイン scan = mobile + desktop 並列 = 約 $0.01 USD (2026-05 時点).
 *
 * 利用者:
 *   - /api/sales/scan/[domain] (将来拡張) → 既存 scanner.ts と並列で SEO データ補強
 *   - 診断レポート (`/[locale]/report/[slug]` rebuild 後) → s3-1 HP診断の数値根拠
 *
 * 注意 (重要):
 *   - DataForSEO は **従量課金**. 全リード一括 enrich (lib/sales/enrich.ts) では呼ばないこと.
 *   - 呼ぶのは「ユーザが診断 CTA を押した」「report を生成する」等の明示的タイミングのみ.
 */

import { runLighthouse, type LighthouseSummary, type LighthouseStrategy } from "./lighthouse"

export interface SeoScanOptions {
  /** 取得する Lighthouse strategy. デフォルト両方並列. */
  strategies?: readonly LighthouseStrategy[]
}

export interface SeoScanResult {
  domain: string
  /** strategy ごとの Lighthouse summary (取得失敗時も error code 付きで返る) */
  lighthouse: Partial<Record<LighthouseStrategy, LighthouseSummary>>
  /** この scan で実消費した DataForSEO 課金 USD 合計 */
  totalCostUsd: number
  /** いずれかの feature が失敗した場合の error code 一覧 (orchestrator は throw しない) */
  errors: string[]
}

const DEFAULT_STRATEGIES = ["mobile", "desktop"] as const satisfies readonly LighthouseStrategy[]

/**
 * DataForSEO で domain の SEO メトリクスを集約取得.
 * 例外は投げず、失敗時は errors[] に code を積んで返す (他ソースと並列実行できる safe pattern).
 */
export async function scanDomainSeo(
  domain: string,
  options: SeoScanOptions = {},
): Promise<SeoScanResult> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const strategies = options.strategies ?? DEFAULT_STRATEGIES

  const summaries = await Promise.all(
    strategies.map((strategy) => runLighthouse({ url, strategy })),
  )

  const lighthouse: Partial<Record<LighthouseStrategy, LighthouseSummary>> = {}
  const errors: string[] = []
  let totalCostUsd = 0

  for (const summary of summaries) {
    lighthouse[summary.strategy] = summary
    totalCostUsd += summary.costUsd
    if (summary.error) {
      errors.push(`lighthouse.${summary.strategy}:${summary.error}`)
    }
  }

  return { domain, lighthouse, totalCostUsd, errors }
}

export { runLighthouse } from "./lighthouse"
export type { LighthouseSummary, LighthouseStrategy } from "./lighthouse"
export { DataforseoError } from "./client"
export type { DataforseoApiCallCost, DataforseoApiResponse } from "./cost"
