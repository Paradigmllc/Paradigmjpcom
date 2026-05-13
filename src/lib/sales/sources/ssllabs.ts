/**
 * lib/sales/sources/ssllabs.ts — Sprint 15 SSL 証明書評価
 *
 * 役割: SSL Labs API で SSL 証明書のグレード (A+, A, B, C, D, F) を取得.
 *       speed_critical / ssl_expired の補助診断データとして使用.
 *
 * API: https://www.ssllabs.com/about/terms.html (無料・rate limit: 25 req/分)
 * 注: 初回スキャンに 1-2 分かかる場合がある (cache あり).
 */

const SSLLABS_API = "https://api.ssllabs.com/api/v3"

export interface SslLabsResult {
  grade: string | null // A+/A/B/C/D/F/T
  hasWarnings: boolean
  isExpired: boolean
  daysUntilExpiry: number | null
}

export async function checkSslGrade(domain: string): Promise<SslLabsResult> {
  try {
    // analyze endpoint: cached 結果があれば即返却・なければ READY 待たずに DNS のみ返る
    const url = `${SSLLABS_API}/analyze?host=${encodeURIComponent(domain)}&fromCache=on&maxAge=24&publish=off`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      return { grade: null, hasWarnings: false, isExpired: false, daysUntilExpiry: null }
    }
    const data = (await res.json()) as {
      status?: string
      endpoints?: Array<{
        grade?: string
        hasWarnings?: boolean
        details?: { cert?: { notAfter?: number } }
      }>
    }
    if (data.status !== "READY") {
      return { grade: null, hasWarnings: false, isExpired: false, daysUntilExpiry: null }
    }
    const endpoint = data.endpoints?.[0]
    const grade = endpoint?.grade ?? null
    const notAfter = endpoint?.details?.cert?.notAfter ?? null
    const daysUntilExpiry = notAfter
      ? Math.floor((notAfter - Date.now()) / (1000 * 60 * 60 * 24))
      : null
    return {
      grade,
      hasWarnings: !!endpoint?.hasWarnings,
      isExpired: daysUntilExpiry !== null && daysUntilExpiry < 0,
      daysUntilExpiry,
    }
  } catch {
    return { grade: null, hasWarnings: false, isExpired: false, daysUntilExpiry: null }
  }
}
