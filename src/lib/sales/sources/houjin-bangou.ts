/**
 * 国税庁法人番号API — free corporate number lookup (no API key)
 * https://api.houjin-bangou.nta.go.jp/
 * Replaces gBizInfo for basic corporate data when key is unavailable.
 */

export interface HoujinBangouResult {
  ok: boolean
  corporateNumber: string | null
  name: string | null
  prefecture: string | null
  city: string | null
  address: string | null
  error?: string
}

export async function lookupByCorporateNumber(number: string): Promise<HoujinBangouResult> {
  try {
    const url = `https://api.houjin-bangou.nta.go.jp/4/name?id=${encodeURIComponent(number)}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, corporateNumber: number, name: null, prefecture: null, city: null, address: null, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as {
      "last-modified-date"?: string
      count?: number
      corporations?: Array<{
        sequenceNumber?: number
        corporateNumber?: string
        process?: string
        correct?: string
        updateDate?: string
        changeDate?: string
        name?: string
        nameImageId?: string
        kind?: string
        prefectureName?: string
        cityName?: string
        streetNumber?: string
        addressImageId?: string
        prefectureCode?: string
        cityCode?: string
        postCode?: string
        addressOutside?: string
        addressOutsideImageId?: string
        closeDate?: string
        closeCause?: string
        successorCorporateNumber?: string
        changeCause?: string
        assignmentDate?: string
        enName?: string
        enPrefectureName?: string
        enCityName?: string
        enAddressOutside?: string
        furigana?: string
        hihyoji?: string
      }>
    }

    const corp = body.corporations?.[0]
    if (!corp) {
      return { ok: true, corporateNumber: number, name: null, prefecture: null, city: null, address: null }
    }

    return {
      ok: true,
      corporateNumber: corp.corporateNumber ?? number,
      name: corp.name ?? null,
      prefecture: corp.prefectureName ?? null,
      city: corp.cityName ?? null,
      address: [corp.prefectureName, corp.cityName, corp.streetNumber].filter(Boolean).join("") || null,
    }
  } catch (e) {
    console.error("[houjin-bangou] lookup failed:", e)
    return {
      ok: false,
      corporateNumber: number,
      name: null,
      prefecture: null,
      city: null,
      address: null,
      error: e instanceof Error ? e.message : "Houjin Bangou lookup failed",
    }
  }
}

/**
 * Search by company name (free text, approximate match).
 * Limited to first 10 results.
 */
export async function searchByName(name: string): Promise<HoujinBangouResult[]> {
  try {
    // The API supports name search with `name` parameter in v4
    const url = `https://api.houjin-bangou.nta.go.jp/4/name?id=${encodeURIComponent(name)}&mode=2`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) return []

    const body = (await res.json()) as {
      corporations?: Array<{
        corporateNumber?: string
        name?: string
        prefectureName?: string
        cityName?: string
        streetNumber?: string
      }>
    }

    return (body.corporations ?? []).slice(0, 10).map((c) => ({
      ok: true,
      corporateNumber: c.corporateNumber ?? null,
      name: c.name ?? null,
      prefecture: c.prefectureName ?? null,
      city: c.cityName ?? null,
      address: [c.prefectureName, c.cityName, c.streetNumber].filter(Boolean).join("") || null,
    }))
  } catch (e) {
    console.error("[houjin-bangou] search failed:", e)
    return []
  }
}
