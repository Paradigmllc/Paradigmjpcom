/**
 * lib/sales/sources/hunter.ts — Sprint 15 Hunter.io メール取得
 *
 * 役割: 法人ドメインから決裁者メールアドレスを取得 (Hunter.io free 25 req/月).
 *       営業フォーム送信不可・直接メール送信のフォールバック.
 *
 * API: https://hunter.io/api-documentation/v2
 */

const HUNTER_API = "https://api.hunter.io/v2"

export interface HunterEmail {
  email: string
  first_name: string | null
  last_name: string | null
  position: string | null
  confidence: number | null
}

/** domain → 該当法人のメール 1-5 件 (free plan は first page 10 件まで) */
export async function findEmailsByDomain(
  domain: string,
  limit: number = 5,
): Promise<{ ok: boolean; emails: HunterEmail[]; error?: string }> {
  const key = process.env.HUNTER_API_KEY ?? ""
  if (!key) {
    return { ok: false, emails: [], error: "HUNTER_API_KEY not configured" }
  }
  try {
    const url = `${HUNTER_API}/domain-search?domain=${encodeURIComponent(domain)}&limit=${limit}&api_key=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      return { ok: false, emails: [], error: `Hunter ${res.status}: ${res.statusText}` }
    }
    const data = (await res.json()) as {
      data?: {
        emails?: Array<{
          value?: string
          first_name?: string | null
          last_name?: string | null
          position?: string | null
          confidence?: number
        }>
      }
    }
    const emails: HunterEmail[] = (data.data?.emails ?? []).map((e) => ({
      email: e.value ?? "",
      first_name: e.first_name ?? null,
      last_name: e.last_name ?? null,
      position: e.position ?? null,
      confidence: e.confidence ?? null,
    }))
    return { ok: true, emails: emails.filter((e) => !!e.email) }
  } catch (e) {
    return { ok: false, emails: [], error: e instanceof Error ? e.message : String(e) }
  }
}
