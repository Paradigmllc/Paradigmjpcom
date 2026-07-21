import { getProxyFetchOptions } from "../proxy-agent"

const USER_AGENT = "Mozilla/5.0 (Paradigm Japan Market Auditor/1.0; +https://paradigmjp.com)"

export interface JapanMarketAuditStatus {
  tokushoho_missing: boolean
  appi_missing: boolean
  local_payments_missing: boolean
  japanese_language_missing?: boolean
  jpy_currency_missing?: boolean
  japan_shipping_missing?: boolean
}

export interface JapanMarketAudit {
  engine: "local_heuristic"
  generated_at: string
  score: number
  status: JapanMarketAuditStatus
  signals: {
    tokushoho: string[]
    appi: string[]
    local_payments: string[]
    japanese_language?: string[]
    jpy_currency?: string[]
    japan_shipping?: string[]
  }
  pages_checked: string[]
  sales_pitch_context: string
  human_review_required: boolean
  legal_disclaimer: string
}

interface AuditPage {
  url: string
  text: string
}

const AUDIT_PATHS = [
  "/",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/legal",
  "/law",
  "/tokushoho",
  "/specified-commercial-transactions",
  "/commerce-disclosure",
  "/payment",
  "/checkout",
] as const

const TOKUSHOHO_PATTERNS = [
  /特定商取引法/i,
  /specified commercial/i,
  /販売業者/i,
  /運営責任者/i,
  /所在地/i,
  /電話番号/i,
  /返品/i,
  /返金/i,
  /tokushoho/i,
] as const

const APPI_PATTERNS = [
  /個人情報保護/i,
  /Act on the Protection of Personal Information/i,
  /\bAPPI\b/i,
  /personal information/i,
  /privacy policy/i,
  /第三者提供/i,
  /共同利用/i,
  /越境移転/i,
] as const

const LOCAL_PAYMENT_PATTERNS = [
  /\bJCB\b/i,
  /コンビニ/i,
  /konbini/i,
  /PayPay/i,
  /Paidy/i,
  /Komoju/i,
  /銀行振込/i,
  /Alipay/i,
  /便利店/i,
] as const

const JAPANESE_LANGUAGE_PATTERNS = [/[\u3040-\u30ff\u3400-\u9fff]{8,}/] as const
const JPY_CURRENCY_PATTERNS = [/(?:\bJPY\b|Japanese yen|¥\s?\d|￥\s?\d|\d[\d,]*\s?円)/i] as const
const JAPAN_SHIPPING_PATTERNS = [
  /ship(?:ping)?\s+to\s+japan/i,
  /japan\s+delivery/i,
  /日本(?:へ|向け).{0,16}(?:配送|発送)/i,
] as const

function normalizeOrigin(domainOrUrl: string): string {
  const url = domainOrUrl.startsWith("http") ? domainOrUrl : `https://${domainOrUrl}`
  return new URL(url).origin
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchAuditPage(url: string): Promise<AuditPage | null> {
  try {
    const res = await fetch(
      url,
      getProxyFetchOptions({
        redirect: "follow",
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": USER_AGENT },
      })
    )
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain")) return null
    const html = await res.text()
    const text = stripHtml(html)
    return text.length > 0 ? { url, text: text.slice(0, 80_000) } : null
  } catch (error) {
    console.warn("[japan-market-audit] page fetch failed:", url, error)
    return null
  }
}

function collectSignals(text: string, patterns: readonly RegExp[]): string[] {
  const found = new Set<string>()
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[0]) found.add(match[0])
  }
  return [...found].slice(0, 12)
}

function scoreFromStatus(status: JapanMarketAuditStatus): number {
  const missing = [
    status.tokushoho_missing,
    status.appi_missing,
    status.local_payments_missing,
    status.japanese_language_missing,
    status.jpy_currency_missing,
    status.japan_shipping_missing,
  ].filter(Boolean).length
  return Math.max(0, 100 - missing * 15)
}

function buildSalesContext(status: JapanMarketAuditStatus): string {
  const gaps: string[] = []
  if (status.tokushoho_missing) gaps.push("特定商取引法に基づく表示の確認")
  if (status.appi_missing) gaps.push("日本向け個人情報保護/APPI説明の確認")
  if (status.local_payments_missing) gaps.push("JCB・コンビニ・PayPay・Paidyなど日本ローカル決済の確認")
  if (status.japanese_language_missing) gaps.push("日本語導線の確認")
  if (status.jpy_currency_missing) gaps.push("JPY価格表示の確認")
  if (status.japan_shipping_missing) gaps.push("日本配送条件の確認")

  if (gaps.length === 0) {
    return "公開ページ上では日本向けの法務・プライバシー・決済説明の一部シグナルを確認できました。次は購入導線、翻訳品質、問い合わせ導線の実運用確認に進めます。"
  }

  return `公開ページ上では ${gaps.join("、")} が不足している可能性があります。これは法的断定ではなく、日本参入パッケージの営業仮説として、人間確認と一次情報確認を挟んで提案文面へ反映します。`
}

function buildJapanMarketAudit(pages: AuditPage[]): JapanMarketAudit {
  const joined = pages.map((page) => page.text).join("\n")

  const tokushoho = collectSignals(joined, TOKUSHOHO_PATTERNS)
  const appi = collectSignals(joined, APPI_PATTERNS)
  const localPayments = collectSignals(joined, LOCAL_PAYMENT_PATTERNS)
  const japaneseLanguage = collectSignals(joined, JAPANESE_LANGUAGE_PATTERNS)
  const jpyCurrency = collectSignals(joined, JPY_CURRENCY_PATTERNS)
  const japanShipping = collectSignals(joined, JAPAN_SHIPPING_PATTERNS)
  const status = {
    tokushoho_missing: tokushoho.length === 0,
    appi_missing: appi.length === 0,
    local_payments_missing: localPayments.length === 0,
    japanese_language_missing: japaneseLanguage.length === 0,
    jpy_currency_missing: jpyCurrency.length === 0,
    japan_shipping_missing: japanShipping.length === 0,
  }

  return {
    engine: "local_heuristic",
    generated_at: new Date().toISOString(),
    score: scoreFromStatus(status),
    status,
    signals: {
      tokushoho,
      appi,
      local_payments: localPayments,
      japanese_language: japaneseLanguage,
      jpy_currency: jpyCurrency,
      japan_shipping: japanShipping,
    },
    pages_checked: pages.map((page) => page.url),
    sales_pitch_context: buildSalesContext(status),
    human_review_required: Object.values(status).some(Boolean),
    legal_disclaimer:
      "This is a public-page heuristic for sales triage, not legal advice. Customer-facing legal, penalty, market, or compliance claims require human review and primary-source verification.",
  }
}

export function auditJapanMarketReadinessFromHtml(url: string, html: string): JapanMarketAudit {
  const text = stripHtml(html)
  return buildJapanMarketAudit(text ? [{ url, text: text.slice(0, 80_000) }] : [])
}

export async function auditJapanMarketReadiness(domainOrUrl: string): Promise<JapanMarketAudit> {
  const origin = normalizeOrigin(domainOrUrl)
  const urls = [...new Set(AUDIT_PATHS.map((item) => `${origin}${item}`))]
  const pages = (await Promise.all(urls.map((url) => fetchAuditPage(url)))).filter(
    (page): page is AuditPage => page !== null,
  )
  return buildJapanMarketAudit(pages)
}
