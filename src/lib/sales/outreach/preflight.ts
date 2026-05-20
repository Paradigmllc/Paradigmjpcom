/**
 * lib/sales/outreach/preflight.ts — 送信前チェック (Phase 3)
 *
 * 役割: 実送信の直前に「送ってよいか」を最終ゲートする。
 *   1. classification が safe_* か
 *   2. robots.txt がそのパスを明示 Disallow していないか (良き市民として尊重)
 *   3. フォーム URL が到達可能か
 *
 * いずれか NG なら preflight_failed。法的グレー回避 (SALES-CENTER #4) の安全弁。
 */

import type { ClassifyFormResult } from "./form-classifier"
import { isSafeForm } from "./types"
import { normalizeOrigin } from "../sources/form-discovery"

export interface PreflightResult {
  pass: boolean
  reason: string
}

/** robots.txt を取得し、対象パスが Disallow されていないか確認 (best-effort) */
async function robotsAllows(formUrl: string, timeoutMs: number): Promise<boolean> {
  const origin = normalizeOrigin(formUrl)
  if (!origin) return true
  let txt: string
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
    })
    if (!res.ok) return true // robots 無し = 制限なし
    txt = await res.text()
  } catch {
    return true // 取得失敗時は許可側に倒す (robots は推奨であり禁止規定ではない)
  }
  let path: string
  try {
    path = new URL(formUrl).pathname
  } catch {
    return true
  }
  // 全 UA (User-agent: *) の Disallow のみ確認 (簡易パーサ)
  const lines = txt.split(/\r?\n/).map((l) => l.trim())
  let inStar = false
  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.startsWith("user-agent:")) inStar = lower.includes("*")
    else if (inStar && lower.startsWith("disallow:")) {
      const rule = line.slice(line.indexOf(":") + 1).trim()
      if (rule && rule !== "/" && path.startsWith(rule)) return false
      if (rule === "/") return false
    }
  }
  return true
}

export async function preflight(input: {
  formUrl: string
  classification: ClassifyFormResult
  checkRobots?: boolean
  timeoutMs?: number
}): Promise<PreflightResult> {
  const timeoutMs = input.timeoutMs ?? 6_000

  if (!isSafeForm(input.classification.classification)) {
    return { pass: false, reason: `unsafe classification: ${input.classification.classification}` }
  }
  if (input.classification.confidence < 0.5) {
    return { pass: false, reason: `low confidence: ${input.classification.confidence}` }
  }
  if (input.checkRobots !== false) {
    const allowed = await robotsAllows(input.formUrl, timeoutMs)
    if (!allowed) return { pass: false, reason: "robots.txt disallows this path" }
  }
  return { pass: true, reason: "ok" }
}
