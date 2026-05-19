/**
 * lib/sales/sources/dataforseo/cost.ts — Sprint 14 DataForSEO 移植 (Phase A)
 *
 * 役割: DataForSEO API 1 呼び出しあたりのコスト・パスを表す型定義.
 *       feature wrapper が返す { data, billing } の billing 部分を共通化.
 *
 * 出典: openseo (every-app/open-seo) MIT License — src/server/lib/dataforseoCost.ts
 *       https://github.com/every-app/open-seo
 *
 * 利用者: ./client.ts (低レイヤ) / ./lighthouse.ts / ./onpage.ts (今後の feature)
 */

export interface DataforseoApiCallCost {
  /** API パス (例: ["v3", "on_page", "lighthouse", "live", "json"]) */
  path: string[]
  /** この呼び出しで DataForSEO 側で消費した USD コスト */
  costUsd: number
  /** 取得件数 (集計用・null=取得失敗) */
  resultCount: number | null
}

export interface DataforseoApiResponse<T> {
  data: T
  billing: DataforseoApiCallCost
}
