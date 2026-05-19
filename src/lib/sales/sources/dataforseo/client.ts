/**
 * lib/sales/sources/dataforseo/client.ts — Sprint 14 DataForSEO 移植 (Phase A)
 *
 * 役割: DataForSEO REST API への低レイヤ POST helper.
 *       Basic 認証ヘッダ生成 / AbortSignal.timeout / JSON parse / cost 抽出.
 *       feature file (lighthouse.ts / onpage.ts 等) からのみ呼ばれる internal 関数.
 *
 * API: https://docs.dataforseo.com/v3/ — Basic auth (login:password Base64)
 *       全 endpoint POST + JSON body. 課金は呼び出し成功時のみ.
 *
 * 出典: openseo (every-app/open-seo) MIT License — 各 feature ファイル POST パターンを抽出
 *       https://github.com/every-app/open-seo
 *
 * 入力: path (例 "on_page/lighthouse/live/json") + body (任意の JSON)
 * 出力: { data, billing } — data は呼び出し側で parse 必須 / billing は cost と path
 *
 * 利用者: ./lighthouse.ts / ./onpage.ts (feature files)
 */

import type { DataforseoApiCallCost } from "./cost"

const DATAFORSEO_BASE = "https://api.dataforseo.com/v3"

export class DataforseoError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly body?: string,
  ) {
    super(message)
    this.name = "DataforseoError"
  }
}

/**
 * DataForSEO API への認証付き POST.
 * 認証情報が未設定の場合は明示エラー (V ルール: 空文字 fallback 禁止).
 *
 * @throws DataforseoError - HTTP 非 2xx / JSON parse 失敗時
 * @throws Error - 認証情報未設定 (即時失敗・サイレントバグ防止)
 */
export async function dataforseoPost<TData = unknown>(
  path: string,
  body: unknown,
  options: { timeoutMs?: number } = {},
): Promise<{ raw: TData; billing: DataforseoApiCallCost }> {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error(
      "[dataforseo] DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD env not set. " +
        "Sign up at https://dataforseo.com/ and configure Coolify env.",
    )
  }

  const credentials = btoa(`${login}:${password}`)
  const url = `${DATAFORSEO_BASE}/${path}`
  const timeoutMs = options.timeoutMs ?? 60_000

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const rawText = await response.text()

  if (!response.ok) {
    throw new DataforseoError(
      `DataForSEO ${path} HTTP ${response.status}`,
      response.status,
      path,
      rawText.slice(0, 500),
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new DataforseoError(
      `DataForSEO ${path} returned non-JSON (content-type: ${response.headers.get("content-type") ?? "unknown"})`,
      response.status,
      path,
      rawText.slice(0, 500),
    )
  }

  const billing = extractBilling(parsed, path)
  return { raw: parsed as TData, billing }
}

/**
 * DataForSEO レスポンス共通形式から cost を抽出.
 * 形式: { tasks: [{ cost: number, result_count: number, ... }], cost: number, ... }
 */
function extractBilling(parsed: unknown, path: string): DataforseoApiCallCost {
  const pathArr = ["v3", ...path.split("/")]
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "cost" in parsed &&
    typeof (parsed as { cost: unknown }).cost === "number"
  ) {
    const root = parsed as {
      cost: number
      tasks?: Array<{ result_count?: number }>
    }
    const resultCount = root.tasks?.[0]?.result_count
    return {
      path: pathArr,
      costUsd: root.cost,
      resultCount: typeof resultCount === "number" ? resultCount : null,
    }
  }
  return { path: pathArr, costUsd: 0, resultCount: null }
}
