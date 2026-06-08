/**
 * W3C Validator — HTML quality check via public Nu Html Checker API
 * Free, no API key. Rate limit: ~100 req/min (generous).
 * https://validator.w3.org/nu/
 */

export interface W3cValidationResult {
  ok: boolean
  url: string
  errors: number
  warnings: number
  info: number
  totalIssues: number
  isClean: boolean
  topIssues: string[]
  error?: string
}

export async function validateHtml(url: string): Promise<W3cValidationResult> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`
    const res = await fetch(`https://validator.w3.org/nu/?out=json&doc=${encodeURIComponent(fullUrl)}&level=error`, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) {
      return { ok: false, url: fullUrl, errors: 0, warnings: 0, info: 0, totalIssues: 0, isClean: false, topIssues: [], error: `HTTP ${res.status}` }
    }

    const messages = (await res.json()) as Array<{ type?: string; message?: string; subType?: string; lastLine?: number }>
    const errors = messages.filter((m) => m.type === "error").length
    const filteredWarnings = messages.filter((m) => m.type === "info" && m.subType === "warning").length
    const info = messages.filter((m) => m.type === "info" && m.subType !== "warning").length

    const topIssues = messages
      .filter((m) => m.type === "error")
      .slice(0, 5)
      .map((m) => `${m.message ?? "unknown"}${m.lastLine ? ` (line ${m.lastLine})` : ""}`)

    return {
      ok: true,
      url: fullUrl,
      errors,
      warnings: filteredWarnings,
      info,
      totalIssues: messages.length,
      isClean: errors === 0 && filteredWarnings === 0,
      topIssues,
    }
  } catch (e) {
    console.error("[w3c-validator] validation failed:", e)
    return {
      ok: false,
      url,
      errors: 0,
      warnings: 0,
      info: 0,
      totalIssues: 0,
      isClean: false,
      topIssues: [],
      error: e instanceof Error ? e.message : "W3C validation failed",
    }
  }
}
