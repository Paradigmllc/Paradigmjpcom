/**
 * lib/sales/sources/places.ts — Sprint 15 Google Places API
 *
 * 役割: 店舗系 (美容室 / 飲食店 / 歯科) の住所・電話・評価・営業時間を取得.
 *       MEO 提案の根拠データ (口コミ数 / 平均評価 / プロフィール充実度).
 *
 * API: Google Places API New (https://developers.google.com/maps/documentation/places/web-service)
 *      無料枠 $200/月 ≈ 11,500 Text Search OR 17,000 Place Details
 */

const PLACES_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText"

export interface PlaceResult {
  found: boolean
  place_id: string | null
  name: string | null
  formatted_address: string | null
  phone: string | null
  rating: number | null
  review_count: number | null
  website: string | null
  opening_hours_weekly: string[] | null
  business_status: string | null  // OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
}

/** 会社名 + 都道府県で検索 (例: "ヘアサロン ルフレ 東京都") */
export async function findPlace(
  companyName: string,
  prefecture: string | null,
): Promise<PlaceResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY ?? ""
  if (!key) {
    return {
      found: false,
      place_id: null,
      name: null,
      formatted_address: null,
      phone: null,
      rating: null,
      review_count: null,
      website: null,
      opening_hours_weekly: null,
      business_status: null,
    }
  }
  try {
    const textQuery = prefecture ? `${companyName} ${prefecture}` : companyName
    const res = await fetch(PLACES_TEXT_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.regularOpeningHours,places.businessStatus",
      },
      body: JSON.stringify({ textQuery, languageCode: "ja", regionCode: "JP", pageSize: 1 }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return {
        found: false,
        place_id: null,
        name: null,
        formatted_address: null,
        phone: null,
        rating: null,
        review_count: null,
        website: null,
        opening_hours_weekly: null,
        business_status: null,
      }
    }
    const data = (await res.json()) as {
      places?: Array<{
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        internationalPhoneNumber?: string
        rating?: number
        userRatingCount?: number
        websiteUri?: string
        regularOpeningHours?: { weekdayDescriptions?: string[] }
        businessStatus?: string
      }>
    }
    const p = data.places?.[0]
    if (!p) {
      return {
        found: false,
        place_id: null,
        name: null,
        formatted_address: null,
        phone: null,
        rating: null,
        review_count: null,
        website: null,
        opening_hours_weekly: null,
        business_status: null,
      }
    }
    return {
      found: true,
      place_id: p.id ?? null,
      name: p.displayName?.text ?? null,
      formatted_address: p.formattedAddress ?? null,
      phone: p.internationalPhoneNumber ?? null,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      website: p.websiteUri ?? null,
      opening_hours_weekly: p.regularOpeningHours?.weekdayDescriptions ?? null,
      business_status: p.businessStatus ?? null,
    }
  } catch {
    return {
      found: false,
      place_id: null,
      name: null,
      formatted_address: null,
      phone: null,
      rating: null,
      review_count: null,
      website: null,
      opening_hours_weekly: null,
      business_status: null,
    }
  }
}
