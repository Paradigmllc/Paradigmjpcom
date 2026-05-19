/**
 * lib/sales/sources/dataforseo/lighthouse.ts — Sprint 14 DataForSEO 移植 (Phase A)
 *
 * 役割: DataForSEO Lighthouse API で URL の Core Web Vitals + 4 category scores を取得.
 *       HP診断レポート (s3-1 Quick Fix / Standard Renewal 提案) の数値根拠として使用.
 *
 * API endpoint: POST /v3/on_page/lighthouse/live/json
 *   - DataForSEO 料金 ~$0.005 / call (2026-05 時点)
 *   - mobile / desktop 別 (for_mobile flag)
 *
 * 出典 (参考): openseo (every-app/open-seo) MIT — src/server/lib/dataforseoLighthouse.ts
 *
 * 入力: { url, strategy: "mobile" | "desktop" }
 * 出力: LighthouseSummary (4 scores 0-100 + 3 Core Web Vitals + cost)
 *
 * 利用者: ./index.ts orchestrator scanDomainSeo() / 将来の HP 診断レポート section
 */

import { dataforseoPost, DataforseoError } from "./client"
import type { DataforseoApiResponse } from "./cost"

export type LighthouseStrategy = "mobile" | "desktop"

export interface LighthouseSummary {
  url: string
  strategy: LighthouseStrategy
  /** 4 category スコア (0-100). 取得失敗時は null. */
  scores: {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
  }
  /** Core Web Vitals 数値. s9-4 閾値: LCP<2500ms / INP<200ms / CLS<0.1 */
  vitals: {
    lcpMs: number | null
    cls: number | null
    inpMs: number | null
  }
  /** この呼び出しでの DataForSEO 課金 USD */
  costUsd: number
  /** 取得失敗時の error code (consumers がフォールバック判断に利用) */
  error?: "auth_missing" | "http_error" | "no_data" | "timeout"
}

const REQUEST_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const

type RawLighthouse = {
  tasks?: Array<{
    status_code?: number
    result?: Array<{
      categories?: Record<string, { score?: number | null }>
      audits?: Record<string, { numericValue?: number | null }>
    }>
  }>
}

/**
 * Lighthouse スコア取得. 失敗時は scores/vitals 全 null + error code を返す
 * (例外は投げない・他ソースと並列実行できる safe pattern).
 */
export async function runLighthouse(input: {
  url: string
  strategy: LighthouseStrategy
}): Promise<LighthouseSummary> {
  const empty = (error: LighthouseSummary["error"]): LighthouseSummary => ({
    url: input.url,
    strategy: input.strategy,
    scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
    vitals: { lcpMs: null, cls: null, inpMs: null },
    costUsd: 0,
    error,
  })

  try {
    const { raw, billing } = await dataforseoPost<RawLighthouse>(
      "on_page/lighthouse/live/json",
      [
        {
          url: input.url,
          for_mobile: input.strategy === "mobile",
          categories: REQUEST_CATEGORIES,
        },
      ],
      { timeoutMs: 90_000 },
    )
    return parseLighthouse(raw, input, billing.costUsd) ?? empty("no_data")
  } catch (e) {
    if (e instanceof Error && e.message.includes("DATAFORSEO_LOGIN")) {
      console.warn("[dataforseo/lighthouse]", e.message)
      return empty("auth_missing")
    }
    if (e instanceof DataforseoError) {
      console.warn(`[dataforseo/lighthouse] ${e.message}`, { body: e.body })
      return empty("http_error")
    }
    if (e instanceof Error && e.name === "TimeoutError") {
      return empty("timeout")
    }
    console.warn("[dataforseo/lighthouse] unknown error", e)
    return empty("http_error")
  }
}

function parseLighthouse(
  raw: RawLighthouse,
  input: { url: string; strategy: LighthouseStrategy },
  costUsd: number,
): LighthouseSummary | null {
  const result = raw.tasks?.[0]?.result?.[0]
  if (!result) return null

  const cat = result.categories ?? {}
  const audits = result.audits ?? {}
  const score = (key: string): number | null => {
    const s = cat[key]?.score
    return typeof s === "number" ? Math.round(s * 100) : null
  }
  const vital = (key: string): number | null => {
    const v = audits[key]?.numericValue
    return typeof v === "number" ? v : null
  }

  return {
    url: input.url,
    strategy: input.strategy,
    scores: {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
    },
    vitals: {
      lcpMs: vital("largest-contentful-paint"),
      cls: vital("cumulative-layout-shift"),
      inpMs: vital("interaction-to-next-paint") ?? vital("max-potential-fid"),
    },
    costUsd,
  }
}

/** 内部 raw レスポンス露出版 (デバッグ・admin ダッシュボード用). */
export async function runLighthouseRaw(input: {
  url: string
  strategy: LighthouseStrategy
}): Promise<DataforseoApiResponse<RawLighthouse>> {
  const { raw, billing } = await dataforseoPost<RawLighthouse>(
    "on_page/lighthouse/live/json",
    [
      {
        url: input.url,
        for_mobile: input.strategy === "mobile",
        categories: REQUEST_CATEGORIES,
      },
    ],
    { timeoutMs: 90_000 },
  )
  return { data: raw, billing }
}
