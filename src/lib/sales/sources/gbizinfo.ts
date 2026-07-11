/**
 * lib/sales/sources/gbizinfo.ts — Sprint 11
 *
 * 役割: 経産省 gBizInfo API で法人番号 / 法人名 → 企業属性を取得.
 *       sales_companies の enrichment に使用. 完全無料.
 *
 * API: https://info.gbiz.go.jp/hojin/v1/hojin
 *      ToS: 法人情報は無償提供・自由利用可
 */

const GBIZ_API = "https://info.gbiz.go.jp/hojin/v1/hojin"

export interface GBizCompany {
  corporate_number: string
  name: string
  name_kana?: string
  postal_code?: string
  location?: string
  prefecture?: string
  city?: string
  business_summary?: string
  business_items?: string[]
  founded?: string
  capital_stock?: number
  employee_number?: number
  representative_name?: string
  female_workers_proportion?: number
  status?: string
}

/** 法人番号 (13桁) で検索 */
export async function getCompanyByCorporateNumber(
  corporateNumber: string,
): Promise<GBizCompany | null> {
  const token = process.env.GBIZ_API_TOKEN?.trim()
  if (!token) {
    console.warn("[gbizinfo] GBIZ_API_TOKEN not set")
    return null
  }
  try {
    const res = await fetch(`${GBIZ_API}/${corporateNumber}`, {
      headers: {
        "X-hojinInfo-api-token": token,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { 'hojin-infos'?: GBizCompany[] }
    return data['hojin-infos']?.[0] ?? null
  } catch (e) {
    console.warn("[gbizinfo] company lookup failed:", e instanceof Error ? e.message : String(e))
    return null
  }
}

/** 法人名で検索 (前方一致) */
export async function searchByName(
  name: string,
  limit: number = 5,
): Promise<GBizCompany[]> {
  const token = process.env.GBIZ_API_TOKEN?.trim()
  if (!token) return []
  try {
    const params = new URLSearchParams({ name, limit: String(limit) })
    const res = await fetch(`${GBIZ_API}?${params}`, {
      headers: {
        "X-hojinInfo-api-token": token,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { 'hojin-infos'?: GBizCompany[] }
    return data['hojin-infos'] ?? []
  } catch (e) {
    console.warn("[gbizinfo] name search failed:", e instanceof Error ? e.message : String(e))
    return []
  }
}

/** gBizInfo データを sales_companies meta JSONB に格納する shape に整形 */
export function toCompanyMeta(g: GBizCompany): Record<string, unknown> {
  return {
    gbiz: {
      corporate_number: g.corporate_number,
      employee_number: g.employee_number,
      capital_stock: g.capital_stock,
      founded: g.founded,
      business_items: g.business_items,
      prefecture: g.prefecture,
      city: g.city,
      representative_name: g.representative_name,
    },
  }
}
