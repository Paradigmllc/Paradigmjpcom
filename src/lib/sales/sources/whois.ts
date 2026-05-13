/**
 * lib/sales/sources/whois.ts — Sprint 15 Whois ドメイン情報
 *
 * 役割: ドメイン登録日 / 有効期限 / レジストラ情報を取得.
 *       「サイトいつから運営?」「廃業疑惑?」判定の根拠データ.
 *
 * API: WhoisXMLAPI (https://whoisapi.whoisxmlapi.com) free 500 req/月
 *      or 代替 OSS https://github.com/whois-server-list (Node.js wrapper)
 */

const WHOIS_API = "https://www.whoisxmlapi.com/whoisserver/WhoisService"

export interface WhoisResult {
  registrar: string | null
  createdDate: string | null  // ISO date
  updatedDate: string | null
  expiresDate: string | null
  yearsOld: number | null
}

export async function getWhois(domain: string): Promise<WhoisResult> {
  const key = process.env.WHOISXML_API_KEY ?? ""
  if (!key) {
    return { registrar: null, createdDate: null, updatedDate: null, expiresDate: null, yearsOld: null }
  }
  try {
    const url = `${WHOIS_API}?apiKey=${key}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      return { registrar: null, createdDate: null, updatedDate: null, expiresDate: null, yearsOld: null }
    }
    const data = (await res.json()) as {
      WhoisRecord?: {
        registrarName?: string
        createdDate?: string
        updatedDate?: string
        expiresDate?: string
        registryData?: { createdDateNormalized?: string; expiresDateNormalized?: string }
      }
    }
    const rec = data.WhoisRecord
    const createdDate = rec?.createdDate || rec?.registryData?.createdDateNormalized || null
    const expiresDate = rec?.expiresDate || rec?.registryData?.expiresDateNormalized || null
    const yearsOld = createdDate
      ? Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null
    return {
      registrar: rec?.registrarName ?? null,
      createdDate,
      updatedDate: rec?.updatedDate ?? null,
      expiresDate,
      yearsOld,
    }
  } catch {
    return { registrar: null, createdDate: null, updatedDate: null, expiresDate: null, yearsOld: null }
  }
}
