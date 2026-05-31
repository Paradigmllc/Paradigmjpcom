/**
 * Final pre-submit gate for form outreach.
 *
 * Requirements:
 * 1. classification is safe_*
 * 2. robots.txt does not explicitly disallow the target path
 * 3. form URL is parseable
 */

import type { ClassifyFormResult } from "./form-classifier"
import { isSafeForm } from "./types"
import { normalizeOrigin } from "../sources/form-discovery"

export interface PreflightResult {
  pass: boolean
  reason: string
}

/** Best-effort robots.txt check for the target form path. */
async function robotsAllows(formUrl: string, timeoutMs: number): Promise<boolean> {
  const origin = normalizeOrigin(formUrl)
  if (!origin) return true
  let txt: string
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "ParadigmFormDiscovery/1.0 (+https://paradigmjp.com)" },
    })
    if (!res.ok) return true
    txt = await res.text()
  } catch (error) {
    console.warn("[sales-preflight] robots.txt fetch failed:", error)
    return true
  }
  let path: string
  try {
    path = new URL(formUrl).pathname
  } catch (error) {
    console.warn("[sales-preflight] invalid form URL:", error)
    return true
  }

  // Minimal parser: honor only User-agent: * Disallow rules.
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
