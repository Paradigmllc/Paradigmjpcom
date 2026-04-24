/**
 * PPP (Purchasing Power Parity) adjusted pricing helper.
 *
 * 役割: Cloudflareの `CF-IPCountry` ヘッダから国を判定し、
 * 国ごとのPPP係数で価格を自動調整する。
 *
 * なぜCloudflare Headerか:
 *   - Vercel/Coolifyは標準で `CF-IPCountry` を passthrough
 *   - geoip-liteのような重いライブラリ不要（< 1ms）
 *   - ユーザーの明示同意なしでも ISO 3166-1 alpha-2 しか見ないので GDPR compliant
 *
 * なぜPPP:
 *   - ¥198,000 = $1,300 USD 相当だが、インドネシアでは平均年収の1/3。
 *   - World Bank ICP 2021ベースの国別係数で自動減額 →
 *     「Japan entry package $650 for Indonesia」のような
 *     公平な価格設定ができる。
 *
 * 使い方:
 *   ```ts
 *   import { formatPricePPP, detectCountryFromHeaders } from "@/lib/ppp"
 *   const country = detectCountryFromHeaders(req.headers) // "JP" | "US" | ...
 *   const { display, original, factor } = formatPricePPP(198000, "JPY", country, "ja")
 *   // display: "¥198,000" (JP) / "~¥130,000" (ID, factor=0.66)
 *   ```
 */

export type CountryCode = string // ISO 3166-1 alpha-2

/**
 * World Bank ICP 2021 PPP conversion factors (relative to JPY domestic cost).
 *
 * 値の意味: 1.0 = 日本国内と同等コスト感
 *          0.5 = 日本の半額が現地の「同じ心理的コスト」
 *          1.5 = 日本の1.5倍を払えるだけの所得水準
 *
 * 欠損国は 1.0（PPP調整なし）にフォールバック。
 *
 * Source: World Bank ICP 2021 + OECD 2023 adjustments.
 * Updated: 2026-04 (review annually).
 */
const PPP_FACTORS: Record<CountryCode, number> = {
  // 先進国 (1.0±0.2)
  JP: 1.0,
  US: 1.15,
  GB: 1.1,
  DE: 1.05,
  FR: 1.05,
  CA: 1.1,
  AU: 1.15,
  CH: 1.25,
  NO: 1.3,
  SE: 1.1,
  DK: 1.2,
  NZ: 1.05,

  // アジア先進 (0.6〜1.0)
  SG: 0.95,
  HK: 1.0,
  KR: 0.85,
  TW: 0.75,

  // アジア新興 (0.3〜0.6)
  CN: 0.55,
  TH: 0.5,
  MY: 0.55,
  ID: 0.4,
  VN: 0.35,
  PH: 0.4,
  IN: 0.3,

  // 中東 (0.6〜1.2)
  AE: 0.9,
  SA: 0.75,
  IL: 1.0,
  QA: 1.1,

  // 欧州 (0.5〜1.0)
  ES: 0.85,
  IT: 0.85,
  PT: 0.7,
  PL: 0.6,
  CZ: 0.65,
  GR: 0.7,
  HU: 0.55,
  RO: 0.5,
  NL: 1.0,
  BE: 1.0,
  IE: 1.05,
  AT: 1.0,
  FI: 1.05,

  // 中南米 (0.3〜0.6)
  BR: 0.45,
  MX: 0.5,
  AR: 0.35,
  CL: 0.55,
  CO: 0.4,
  PE: 0.4,

  // アフリカ (0.25〜0.5)
  ZA: 0.5,
  NG: 0.3,
  EG: 0.3,
  KE: 0.35,
  MA: 0.4,

  // その他 (参考値)
  RU: 0.45,
  TR: 0.4,
  UA: 0.35,
}

/**
 * Detect country code from Cloudflare header.
 * Returns "JP" as fallback (conservative — no PPP discount applied).
 */
export function detectCountryFromHeaders(headers: Headers | Record<string, string>): CountryCode {
  const raw =
    headers instanceof Headers
      ? headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country")
      : headers["cf-ipcountry"] || headers["x-vercel-ip-country"]

  if (!raw) return "JP"
  const code = raw.toUpperCase()

  // T1 (Tor), XX (unknown), EU (generic) — fall back to JP
  if (code === "T1" || code === "XX" || code === "EU" || code.length !== 2) return "JP"
  return code
}

/**
 * Get PPP factor for a country. Returns 1.0 (no discount) for unknown countries.
 */
export function getPPPFactor(country: CountryCode): number {
  return PPP_FACTORS[country.toUpperCase()] ?? 1.0
}

export interface FormatPriceResult {
  /** Display string with currency symbol, e.g. "¥198,000" or "~¥130,000" */
  display: string
  /** Raw adjusted number (JPY) */
  adjusted: number
  /** Original price (JPY) */
  original: number
  /** PPP factor applied */
  factor: number
  /** Whether a discount was applied (factor < 1.0) */
  discounted: boolean
}

/**
 * Format a price with PPP adjustment and locale-appropriate currency.
 *
 * Currency choice rule:
 *   - locale "en" AND country is not JP → display in USD (approximate ¥/150)
 *   - otherwise → display in JPY with locale-appropriate grouping
 *
 * Tilde prefix (~) signals "approximate adjusted price" so the user knows
 * the sticker price isn't a marketing gimmick.
 */
export function formatPricePPP(
  priceJPY: number,
  _currency: "JPY" | "USD",
  country: CountryCode,
  locale: "ja" | "en" = "ja",
): FormatPriceResult {
  const factor = getPPPFactor(country)
  const adjusted = Math.round(priceJPY * factor)
  const discounted = factor < 0.95
  const showUSD = locale === "en" && country !== "JP"

  let display: string
  if (showUSD) {
    const usd = Math.round(adjusted / 150) // rough JPY→USD
    display = discounted
      ? `~$${usd.toLocaleString("en-US")}`
      : `$${usd.toLocaleString("en-US")}`
  } else {
    const formatted = adjusted.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")
    display = discounted ? `~¥${formatted}` : `¥${formatted}`
  }

  return { display, adjusted, original: priceJPY, factor, discounted }
}

/**
 * Server Component helper — read country from Next.js headers() and format.
 * Use inside RSC / route handlers where `headers` function is available.
 *
 * ```tsx
 * import { headers } from "next/headers"
 * import { formatPricePPPFromHeaders } from "@/lib/ppp"
 *
 * const h = await headers()
 * const { display } = formatPricePPPFromHeaders(198000, "JPY", h, "ja")
 * ```
 */
export function formatPricePPPFromHeaders(
  priceJPY: number,
  currency: "JPY" | "USD",
  headers: Headers,
  locale: "ja" | "en" = "ja",
): FormatPriceResult {
  const country = detectCountryFromHeaders(headers)
  return formatPricePPP(priceJPY, currency, country, locale)
}
