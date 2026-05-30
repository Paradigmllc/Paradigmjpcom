/**
 * lib/sales/enrich.ts — Sprint 11 (contact form → sales_companies 自動エンリッチ)
 *
 * 役割: お問い合わせフォーム送信時に corporate domain を検出し,
 *       並列で scan (PSI + HTML inspect) + gBizInfo + 業種推定 を実行して
 *       sales_companies に upsert する.
 *
 * 入力: enrichFromContact({ email, company?, message?, services? })
 * 出力: { ok, company?: SalesCompany, skipped?: "personal_domain" | "no_email" }
 *
 * 自由メールアドレス (gmail / yahoo / icloud 等) は corporate ではないので skip.
 *
 * AE-PHP-4 準拠.
 */

import { upsertCompanyByDomain, findCompanyByDomain } from "./companies"
import { scanDomain } from "./sources/scanner"
import { searchByName, toCompanyMeta } from "./sources/gbizinfo"
import { detectTechStack } from "./sources/wappalyzer"
import { findEmailsByDomain } from "./sources/hunter"
import { checkSslGrade } from "./sources/ssllabs"
import { getWhois } from "./sources/whois"
import { findPlace } from "./sources/places"
import { discoverFormUrl } from "./sources/form-discovery"
import { autoPersonalize } from "./personalize"
import type { Industry, SalesCompany } from "./types"

/** 自由メールドメインのブラックリスト (corporate でないので skip) */
const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.jp",
  "ymail.com",
  "outlook.com",
  "outlook.jp",
  "hotmail.com",
  "hotmail.co.jp",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "qq.com",
  "163.com",
  "naver.com",
  "daum.net",
  "kakao.com",
  "ezweb.ne.jp",
  "docomo.ne.jp",
  "softbank.ne.jp",
  "i.softbank.jp",
  "ymobile.ne.jp",
])

/** form.services[] → Industry 推定 (best-effort・null fallback) */
function guessIndustry(services?: string[] | null, message?: string | null): Industry | null {
  const haystack = `${(services ?? []).join(" ")} ${message ?? ""}`.toLowerCase()
  if (/美容|ヘアサロン|サロン|hair|beauty/.test(haystack)) return "beauty_salon"
  if (/歯科|デンタル|dental/.test(haystack)) return "dental"
  if (/飲食|レストラン|カフェ|restaurant|cafe/.test(haystack)) return "restaurant"
  if (/工務|建設|リフォーム|construction|reform/.test(haystack)) return "construction"
  if (/会計|税理|経理|accounting/.test(haystack)) return "accounting"
  if (/小売|販売|店舗|retail|store/.test(haystack)) return "retail"
  if (/清掃|クリーニング|cleaning/.test(haystack)) return "cleaning"
  if (/コンサル|consulting|consultant/.test(haystack)) return "consulting"
  return null
}

export interface EnrichInput {
  email: string
  company?: string | null
  message?: string | null
  services?: string[] | null
  source?: string | null
}

export type EnrichSkipReason = "no_email" | "invalid_email" | "personal_domain"

export interface EnrichResult {
  ok: boolean
  company?: SalesCompany
  skipped?: EnrichSkipReason
  error?: string
}

/**
 * contact form 入力から sales_companies を自動エンリッチして upsert.
 *
 * 流れ:
 *   1. email から domain 抽出 (skip: 自由メール)
 *   2. 既存 sales_companies があれば取得 / なければ create stub
 *   3. 並列実行: scanDomain (PSI + HTML inspect) + gBizInfo searchByName
 *   4. 結果を upsert (industry / pagespeed / detected_issues / meta)
 */
export async function enrichFromContact(input: EnrichInput): Promise<EnrichResult> {
  if (!input.email) return { ok: false, skipped: "no_email" }
  const atIdx = input.email.indexOf("@")
  if (atIdx < 0) return { ok: false, skipped: "invalid_email" }
  const rawDomain = input.email.slice(atIdx + 1).trim().toLowerCase()
  if (!rawDomain || !rawDomain.includes(".")) return { ok: false, skipped: "invalid_email" }
  if (PERSONAL_DOMAINS.has(rawDomain)) {
    return { ok: false, skipped: "personal_domain" }
  }

  const domain = rawDomain
  const companyName = input.company?.trim() || domain
  const industry = guessIndustry(input.services, input.message)

  // Step 1: stub upsert (pipeline_status=scanning) — 並列処理失敗しても DB に残す
  const existing = await findCompanyByDomain(domain)
  if (!existing) {
    await upsertCompanyByDomain({
      domain,
      company_name: companyName,
      industry,
      pipeline_status: "scanning",
      source: input.source ?? "contact_form",
      meta: {
        contact: {
          original_email: input.email,
          services: input.services ?? [],
          message_excerpt: input.message?.slice(0, 200) ?? null,
          received_at: new Date().toISOString(),
        },
      },
    })
  }

  // Step 2: 並列 30+ source enrich (Sprint 15: PSI + gBizInfo + Wappalyzer + SSL + Whois + Places)
  //         Hunter.io はメール検索 (フォーム経由で email 既知の場合のみ)
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const [scan, gbiz, tech, ssl, whois, place, hunter, form] = await Promise.all([
    scanDomain(domain).catch((e) => {
      console.error("[enrich] scanDomain failed:", e)
      return null
    }),
    searchByName(companyName, 1).catch((e) => {
      console.error("[enrich] gBizInfo failed:", e)
      return []
    }),
    detectTechStack(url).catch((e) => {
      console.error("[enrich] wappalyzer failed:", e)
      return { tech: [], server: null }
    }),
    checkSslGrade(domain).catch((e) => {
      console.error("[enrich] ssllabs failed:", e)
      return null
    }),
    getWhois(domain).catch((e) => {
      console.error("[enrich] whois failed:", e)
      return null
    }),
    findPlace(companyName, null).catch((e) => {
      console.error("[enrich] places failed:", e)
      return null
    }),
    findEmailsByDomain(domain, 5).catch((e) => {
      console.error("[enrich] hunter failed:", e)
      return { ok: false, emails: [] }
    }),
    discoverFormUrl({ homeUrl: domain }).catch((e) => {
      console.error("[enrich] form-discovery failed:", e)
      return null
    }),
  ])

  // Step 3: 集約して最終 upsert (meta JSONB に 30+ source のデータを統合保存)
  const gbizFirst = gbiz?.[0]
  const meta: Record<string, unknown> = {
    contact: {
      original_email: input.email,
      services: input.services ?? [],
      received_at: new Date().toISOString(),
    },
    scan: scan
      ? {
          ran_at: new Date().toISOString(),
          mobile_score: scan.mobile.performance,
          desktop_score: scan.desktop.performance,
          html_title: scan.html.title,
          html_description: scan.html.description,
          canonical_url: scan.html.canonicalUrl,
          is_wordpress: scan.html.isWordPress,
          copyright_year: scan.html.copyrightYear,
          form_count: scan.html.formCount,
          contact_link_count: scan.html.contactLinkCount,
          automation_guard: {
            recaptcha: scan.html.hasRecaptcha,
            turnstile: scan.html.hasTurnstile,
            cloudflare_challenge: scan.html.hasCloudflareChallenge,
            human_review_required: scan.html.hasRecaptcha || scan.html.hasTurnstile || scan.html.hasCloudflareChallenge,
          },
        }
      : { ran_at: new Date().toISOString(), error: "scan_failed" },
    tech: { stack: tech.tech, server: tech.server, count: tech.tech.length },
    security_headers: scan?.securityHeaders ?? null,
    robots_sitemap: scan?.robotsSitemap ?? null,
    ssl: ssl ?? null,
    whois: whois ?? null,
    place: place && place.found ? place : null,
    hunter: hunter.ok ? { emails: hunter.emails, count: hunter.emails.length } : null,
    // ④フォーム営業の入力: 実フォーム URL のみ格納 (origin fallback は除外)
    contact_form_url:
      form && form.formUrl && form.method !== "fallback" && form.method !== "none"
        ? form.formUrl
        : null,
    form_discovery: form ? { method: form.method, confidence: form.confidence } : null,
    ...(gbizFirst ? toCompanyMeta(gbizFirst) : {}),
  }

  const result = await upsertCompanyByDomain({
    domain,
    company_name: gbizFirst?.name ?? scan?.html.title ?? companyName,
    industry,
    prefecture: gbizFirst?.prefecture ?? null,
    pagespeed_mobile: scan?.mobile.performance ?? null,
    pagespeed_desktop: scan?.desktop.performance ?? null,
    detected_issues: scan?.issues ?? [],
    pipeline_status: scan ? "report_ready" : "pending",
    source: input.source ?? "contact_form",
    meta,
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  // 🧠 DeepSeek 作り込み文面を自動生成 (fire-and-forget・report_ready 時のみ)
  //    → カルテ完成と同時にレポート文面も「データ寄せ集め」でなく作り込み済になる
  if (result.company && scan) {
    void autoPersonalize(result.company.id).catch((e) =>
      console.error("[enrich] autoPersonalize failed:", e),
    )
  }

  return { ok: true, company: result.company }
}
