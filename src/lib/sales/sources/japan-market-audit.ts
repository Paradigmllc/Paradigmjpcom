import { load } from "cheerio"
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

export type JapanPresenceLevel = "none" | "language" | "support" | "sales"

export interface JapanMarketPresence {
  existing: boolean
  level: JapanPresenceLevel
  signals: string[]
  urls: string[]
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
  // New audits always populate this. It remains optional at the shared type
  // boundary so persisted legacy reports and older test fixtures continue to
  // deserialize without pretending that historical records had this analysis.
  presence?: JapanMarketPresence
  pages_checked: string[]
  sales_pitch_context: string
  human_review_required: boolean
  legal_disclaimer: string
}

interface AuditPage {
  url: string
  text: string
  html: string
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

const PRESENCE_LEVEL_RANK: Record<JapanPresenceLevel, number> = {
  none: 0,
  language: 1,
  support: 2,
  sales: 3,
}

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

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function japanUrlSignal(value: string): boolean {
  try {
    const url = new URL(value)
    const path = `${url.pathname}${url.search}`.toLowerCase()
    return /(?:^|\/)(?:ja|ja-jp|jp)(?:\/|$)/.test(path)
      || /(?:japan|where-to-buy-jp|support[_/-]?jp|jp[_/-](?:ja|en)|[_/-]jp(?:[_/-]|$))/.test(path)
  } catch {
    return false
  }
}

function strongestPresence(values: JapanMarketPresence[]): JapanMarketPresence {
  const level = values.reduce<JapanPresenceLevel>((current, value) => (
    PRESENCE_LEVEL_RANK[value.level] > PRESENCE_LEVEL_RANK[current] ? value.level : current
  ), "none")
  const signals = [...new Set(values.flatMap((value) => value.signals))].slice(0, 12)
  const urls = [...new Set(values.flatMap((value) => value.urls))].slice(0, 12)
  return { existing: level !== "none", level, signals, urls }
}

export function detectJapanPresenceFromHtml(pageUrl: string, html: string): JapanMarketPresence {
  const $ = load(html)
  const signals = new Set<string>()
  const urls = new Set<string>()
  let level: JapanPresenceLevel = "none"

  const promote = (next: JapanPresenceLevel, signal: string, url?: string) => {
    if (PRESENCE_LEVEL_RANK[next] > PRESENCE_LEVEL_RANK[level]) level = next
    signals.add(clean(signal).slice(0, 240))
    if (url) urls.add(url)
  }

  const pagePath = (() => {
    try {
      return new URL(pageUrl).pathname.toLowerCase()
    } catch {
      return ""
    }
  })()
  if (japanUrlSignal(pageUrl)) {
    const pageLevel: JapanPresenceLevel = /(?:where-to-buy|store|shop|retail|dealer|distributor|stockist)/.test(pagePath)
      ? "sales"
      : /(?:support|service|repair|warranty|contact)/.test(pagePath)
        ? "support"
        : "language"
    promote(pageLevel, `Japanese-market route detected: ${pagePath || pageUrl}`, pageUrl)
  }

  $('link[hreflang],a[href]').each((_, element) => {
    const node = $(element)
    const href = node.attr("href")?.trim()
    const hreflang = node.attr("hreflang")?.trim().toLowerCase() ?? ""
    if (!href) return
    let resolved: string
    try {
      resolved = new URL(href, pageUrl).toString()
    } catch {
      return
    }
    const text = clean(node.text())
    const combined = `${resolved} ${text} ${hreflang}`
    const japanese = /^ja(?:-|$)/.test(hreflang)
      || japanUrlSignal(resolved)
      || /(?:日本語|日本|\bJapan\b)/i.test(text)
    if (!japanese) return

    const commercial = /(?:where[-\s]?to[-\s]?buy|authorized retailers?|store|shop|retail|dealer|distributor|stockist|buy)/i.test(combined)
    const support = /(?:support|service|repair|warranty|contact|after[-\s]?sales)/i.test(combined)
    const next: JapanPresenceLevel = commercial ? "sales" : support ? "support" : "language"
    promote(next, `${next === "sales" ? "Japan sales" : next === "support" ? "Japan support" : "Japanese-language"} link: ${text || resolved}`, resolved)
  })

  const visible = clean($("body").text())
  if (/(?:where\s+to\s+buy|authorized retailers?|store|shop|dealer|distributor|stockist).{0,120}(?:Japan|日本)|(?:Japan|日本).{0,120}(?:where\s+to\s+buy|authorized retailers?|store|shop|dealer|distributor|stockist)/i.test(visible)) {
    promote("sales", "Public page lists a Japan retail or distributor route", pageUrl)
  } else if (/(?:local\s+support|support|service|repair|warranty).{0,120}(?:Japan|日本)|(?:Japan|日本).{0,120}(?:local\s+support|support|service|repair|warranty)/i.test(visible)) {
    promote("support", "Public page lists Japan support or service coverage", pageUrl)
  } else if (/[\u3040-\u30ff\u3400-\u9fff]{8,}/.test(visible)) {
    promote("language", "Japanese-language customer content is present", pageUrl)
  }

  return { existing: level !== "none", level, signals: [...signals].slice(0, 12), urls: [...urls].slice(0, 12) }
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
    return text.length > 0 ? { url: res.url || url, text: text.slice(0, 80_000), html: html.slice(0, 300_000) } : null
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

function buildSalesContext(status: JapanMarketAuditStatus, presence: JapanMarketPresence): string {
  if (presence.level === "sales") {
    return "公開ページ上で日本向け販売・小売導線を確認しました。新規日本参入案件としては原則対象外とし、既存日本事業の再構築案件として扱う場合だけ人が再評価します。"
  }
  if (presence.level === "support") {
    return "公開ページ上で日本向けサポートまたは現地パートナー導線を確認しました。日本未進出とは扱わず、既存体制の有無を確認してから判断します。"
  }
  if (presence.level === "language") {
    return "日本語の顧客導線を確認しました。日本未対応という前提では営業せず、販売・サポート・運営体制の不足が別途確認できる場合だけ再評価します。"
  }

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

  return `公開ページ上では ${gaps.join("、")} が不足している可能性があります。これは法的断定ではなく、日本参入営業の仮説として、人間確認と一次情報確認を挟んで提案文面へ反映します。`
}

function buildJapanMarketAudit(pages: AuditPage[]): JapanMarketAudit {
  const joined = pages.map((page) => page.text).join("\n")
  const presence = strongestPresence(pages.map((page) => detectJapanPresenceFromHtml(page.url, page.html)))

  const tokushoho = collectSignals(joined, TOKUSHOHO_PATTERNS)
  const appi = collectSignals(joined, APPI_PATTERNS)
  const localPayments = collectSignals(joined, LOCAL_PAYMENT_PATTERNS)
  const japaneseLanguage = collectSignals(joined, JAPANESE_LANGUAGE_PATTERNS)
  if (presence.existing && japaneseLanguage.length === 0) japaneseLanguage.push(...presence.signals.slice(0, 2))
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
    presence,
    pages_checked: pages.map((page) => page.url),
    sales_pitch_context: buildSalesContext(status, presence),
    human_review_required: presence.existing || Object.values(status).some(Boolean),
    legal_disclaimer:
      "This is a public-page heuristic for sales triage, not legal advice. Customer-facing legal, penalty, market, or compliance claims require human review and primary-source verification.",
  }
}

export function auditJapanMarketReadinessFromHtml(url: string, html: string): JapanMarketAudit {
  const text = stripHtml(html)
  return buildJapanMarketAudit(text ? [{ url, text: text.slice(0, 80_000), html: html.slice(0, 300_000) }] : [])
}

export async function auditJapanMarketReadiness(domainOrUrl: string): Promise<JapanMarketAudit> {
  const origin = normalizeOrigin(domainOrUrl)
  const urls = [...new Set(AUDIT_PATHS.map((item) => `${origin}${item}`))]
  const pages = (await Promise.all(urls.map((url) => fetchAuditPage(url)))).filter(
    (page): page is AuditPage => page !== null,
  )
  return buildJapanMarketAudit(pages)
}
