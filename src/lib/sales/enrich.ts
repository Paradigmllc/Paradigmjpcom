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
import { searchCrtsh } from "./sources/crtsh"
import { queryCloudflareRadar } from "./sources/cloudflare-radar"
import { scanMozillaObservatory } from "./sources/mozilla-observatory"
import { fetchGoogleTrendsInterest } from "./sources/pytrends"
import { queryDnsRecords } from "./sources/dns-doh"
import { validateHtml } from "./sources/w3c-validator"
import { checkHstsPreload } from "./sources/hsts-preload"
import { queryWaybackMachine } from "./sources/wayback-machine"
import { searchByName as searchHoujinByName } from "./sources/houjin-bangou"
import { queryTrancoRank } from "./sources/tranco"
import { checkEmailReputation } from "./sources/emailrep"
import { checkPhishTank } from "./sources/phishtank"
import { searchOpenCorporates } from "./sources/opencorporates"
import { checkGreenHosting } from "./sources/green-web"
import { detectEcStore } from "./sources/storeleads"
import { discoverSubdomains } from "./sources/massdns"
import { searchGitHubOrg } from "./sources/github-api"
import { detectCartPlatform } from "./sources/cartleads"
import { scrapeSimilarwebFree } from "./sources/similarweb-scraper"
import { estimateTrafficViaSearx } from "./sources/searxng-traffic"
import { lookupBuiltWithFree } from "./sources/builtwith-free"
import { queryCommonCrawl } from "./sources/commoncrawl"
import { checkAhrefsFree } from "./sources/ahrefs-free"
import { INDUSTRY_MARKET_DATA } from "./sources/market-data"
import { collectSmbSignals } from "./sources/smb-signals"
import { enrichDomainWithSpiderFoot } from "./sources/spiderfoot-source"

/**
 * Run promises in batches of concurrency limit to avoid overwhelming APIs.
 * Keeps max `limit` in-flight at a time, starting next batch only when previous completes.
 */
async function batchAll(tasks: (() => Promise<unknown>)[], limit = 8): Promise<unknown[]> {
  const results: unknown[] = new Array(tasks.length)
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map((t) => t()))
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j]
    }
  }
  return results
}
import { crawlWithKatana } from "./sources/katana-source"
import { searchMaigretForDomain } from "./sources/maigret-source"
import { extractSkyvernSiteData, discoverSkyvernForms } from "./sources/skyvern-source"
import { autoPersonalize } from "./personalize"
import { saveTechStackDetections } from "./source-acquisition"
import type { Industry, SalesCompany } from "./types"

interface SpiderFootItem { ok?: boolean; source?: string; data?: unknown }
interface KatanaData { crawled?: number; urls?: string[] }
interface MaigretData { profiles_found?: number; sites?: Array<Record<string, unknown>> }

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
  reportLocale?: string | null
  targetCountry?: string | null
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
      report_locale: input.reportLocale,
      target_country: input.targetCountry,
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

  // Step 2: 並列 36-source enrich with concurrency limit (8 at a time)
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const tasks = [
    () => scanDomain(domain).catch((e) => {
      console.error("[enrich] scanDomain failed:", e)
      return null
    }),
    () => searchByName(companyName, 1).catch((e) => {
      console.error("[enrich] gBizInfo failed:", e)
      return []
    }),
    () => detectTechStack(url).catch((e) => {
      console.error("[enrich] wappalyzer failed:", e)
      return { tech: [], server: null }
    }),
    () => checkSslGrade(domain).catch((e) => {
      console.error("[enrich] ssllabs failed:", e)
      return null
    }),
    () => getWhois(domain).catch((e) => {
      console.error("[enrich] whois failed:", e)
      return null
    }),
    () => findPlace(companyName, null).catch((e) => {
      console.error("[enrich] places failed:", e)
      return null
    }),
    () => findEmailsByDomain(domain, 5).catch((e) => {
      console.error("[enrich] hunter failed:", e)
      return { ok: false, emails: [] }
    }),
    () => discoverFormUrl({ homeUrl: domain }).catch((e) => {
      console.error("[enrich] form-discovery failed:", e)
      return null
    }),
    () => searchCrtsh(domain).catch((e) => {
      console.error("[enrich] crt.sh failed:", e)
      return null
    }),
    () => queryCloudflareRadar(domain).catch((e) => {
      console.error("[enrich] cloudflare-radar failed:", e)
      return null
    }),
    () => scanMozillaObservatory(domain).catch((e) => {
      console.error("[enrich] mozilla-observatory failed:", e)
      return null
    }),
    () => fetchGoogleTrendsInterest(domain).catch((e) => {
      console.error("[enrich] pytrends failed:", e)
      return null
    }),
    () => queryDnsRecords(domain).catch((e) => {
      console.error("[enrich] dns-doh failed:", e)
      return null
    }),
    () => validateHtml(url).catch((e) => {
      console.error("[enrich] w3c-validator failed:", e)
      return null
    }),
    () => checkHstsPreload(domain).catch((e) => {
      console.error("[enrich] hsts-preload failed:", e)
      return null
    }),
    () => queryWaybackMachine(domain).catch((e) => {
      console.error("[enrich] wayback-machine failed:", e)
      return null
    }),
    () => searchHoujinByName(companyName).catch((e) => {
      console.error("[enrich] houjin-bangou failed:", e)
      return []
    }),
    () => queryTrancoRank(domain).catch((e) => {
      console.error("[enrich] tranco failed:", e)
      return null
    }),
    () => checkEmailReputation(domain).catch((e) => {
      console.error("[enrich] emailrep failed:", e)
      return null
    }),
    () => checkPhishTank(domain).catch((e) => {
      console.error("[enrich] phishtank failed:", e)
      return null
    }),
    () => searchOpenCorporates(domain).catch((e) => {
      console.error("[enrich] opencorporates failed:", e)
      return null
    }),
    () => checkGreenHosting(domain).catch((e) => {
      console.error("[enrich] green-web failed:", e)
      return null
    }),
    () => detectEcStore(domain).catch((e) => {
      console.error("[enrich] storeleads failed:", e)
      return null
    }),
    () => discoverSubdomains(domain).catch((e) => {
      console.error("[enrich] massdns failed:", e)
      return null
    }),
    () => searchGitHubOrg(domain).catch((e) => {
      console.error("[enrich] github-api failed:", e)
      return null
    }),
    () => detectCartPlatform(domain).catch((e) => {
      console.error("[enrich] cartleads failed:", e)
      return null
    }),
    () => scrapeSimilarwebFree(domain).catch((e) => {
      console.error("[enrich] similarweb-scraper failed:", e)
      return null
    }),
    () => lookupBuiltWithFree(domain).catch((e) => {
      console.error("[enrich] builtwith-free failed:", e)
      return null
    }),
    () => queryCommonCrawl(domain).catch((e) => {
      console.error("[enrich] commoncrawl failed:", e)
      return null
    }),
    () => checkAhrefsFree(domain).catch((e) => {
      console.error("[enrich] ahrefs-free failed:", e)
      return null
    }),
    () => enrichDomainWithSpiderFoot(domain).catch((e) => {
      console.error("[enrich] spiderfoot failed:", e)
      return null
    }),
    () => crawlWithKatana(url).catch((e) => {
      console.error("[enrich] katana failed:", e)
      return null
    }),
    () => searchMaigretForDomain(domain).catch((e) => {
      console.error("[enrich] maigret failed:", e)
      return null
    }),
    () => extractSkyvernSiteData(url).catch((e) => {
      console.error("[enrich] skyvern-site-data failed:", e)
      return null
    }),
    () => discoverSkyvernForms(url).catch((e) => {
      console.error("[enrich] skyvern-forms failed:", e)
      return null
    }),
    () => estimateTrafficViaSearx(domain, companyName ?? undefined).catch((e) => {
      console.error("[enrich] searxng-traffic failed:", e)
      return null
    }),
  ]
  // batchAll returns unknown[] — cast is safe because destructuring matches array order exactly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [
    scan, gbiz, tech, ssl, whois, place, hunter, form, crtsh, radar, observatory, trends, dns, w3c, hsts, wayback, houjin, tranco, emailrep, phishtank, opencorp, greenweb, storeleads, massdns, github, cartleads, simweb, builtwith, commoncrawl, ahrefs, spiderfoot, katana, maigret, skyvernSite, skyvernForms, searxng,
  ] = await batchAll(tasks) as any[]

  // Step 3: 集約して最終 upsert (meta JSONB に 36-source のデータを統合保存)
  const gbizFirst = gbiz?.[0]
  const meta: Record<string, unknown> = {
    sales_os: {
      last_enriched_at: new Date().toISOString(),
      enriched_via: input.source ?? "contact_form",
      sources_collected: [scan, gbiz, tech, ssl, whois, place, hunter, form, crtsh, radar, observatory, trends, dns, w3c, hsts, wayback, houjin, tranco, emailrep, phishtank, opencorp, greenweb, storeleads, massdns, github, cartleads, simweb, builtwith, commoncrawl, ahrefs, spiderfoot, katana, maigret, skyvernSite, skyvernForms]
        .filter((s) => s != null && (Array.isArray(s) ? s.length > 0 : true)).length,
    },
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
    crtsh: crtsh?.ok
      ? { total_certs: crtsh.totalCerts, subdomains: crtsh.subdomains, latest_cert: crtsh.latestCert, oldest_cert: crtsh.oldestCert }
      : null,
    cloudflare_radar: radar?.ok
      ? { rank: radar.rank, rank_bucket: radar.rankBucket, categories: radar.categories }
      : null,
    mozilla_observatory: observatory?.ok
      ? { score: observatory.score, grade: observatory.grade, tests_passed: observatory.testsPassed, tests_total: observatory.testsTotal }
      : null,
    google_trends: trends?.ok
      ? { interest_over_time: trends.interestOverTime }
      : null,
    dns: dns?.ok
      ? {
          mx_records: dns.mxRecords,
          spf: dns.spfRecord,
          dkim_selectors: dns.dkimSelectors,
          dmarc: dns.dmarcRecord,
          a_records: dns.aRecords,
          cname_records: dns.cnameRecords,
          email_provider: dns.emailProvider,
          email_security_ok: dns.hasEmailSecurity,
          dnssec: dns.hasDnssec,
          caa_records: dns.caaRecords,
        }
      : null,
    w3c_validation: w3c?.ok
      ? { errors: w3c.errors, warnings: w3c.warnings, is_clean: w3c.isClean, top_issues: w3c.topIssues }
      : null,
    hsts_preload: hsts?.ok
      ? { preloaded: hsts.isPreloaded, status: hsts.status }
      : null,
    wayback_machine: wayback?.ok
      ? { total_snapshots: wayback.totalSnapshots, first_snapshot: wayback.firstSnapshot, last_snapshot: wayback.lastSnapshot, years_active: wayback.yearsActive }
      : null,
    houjin_bangou: Array.isArray(houjin) && houjin.length > 0
      ? houjin.map((h) => ({ name: h.name, corporate_number: h.corporateNumber, prefecture: h.prefecture, city: h.city, address: h.address }))
      : null,
    tranco: tranco?.ok
      ? { rank: tranco.rank }
      : null,
    email_reputation: emailrep?.ok
      ? { reputation: emailrep.reputation, suspicious: emailrep.suspicious, details: emailrep.details }
      : null,
    phishtank: phishtank?.ok
      ? { is_phishing: phishtank.isPhishing }
      : null,
    opencorporates: opencorp?.ok
      ? { companies: opencorp.companies, total_count: opencorp.totalCount }
      : null,
    green_hosting: greenweb?.ok
      ? { is_green: greenweb.isGreen, provider: greenweb.provider }
      : null,
    ec_platform: storeleads?.ok
      ? { is_ec_site: storeleads.isEcSite, platform: storeleads.platform, product_count: storeleads.productCount }
      : null,
    subdomains: massdns?.ok
      ? { discovered: massdns.subdomains.map((s: { name: string; ips: string[] }) => ({ name: s.name, ips: s.ips })), total: massdns.totalResolved }
      : null,
    github: github?.ok
      ? { org: github.orgName, repos: github.publicRepos, languages: github.topLanguages, stars: github.stars, active: github.recentActivity }
      : null,
    cart_platform: cartleads?.ok
      ? { has_cart: cartleads.hasCart, platform: cartleads.cartPlatform, checkout: cartleads.checkoutPlatform, url: cartleads.cartUrl }
      : null,
    similarweb_free: simweb?.ok
      ? { visits: simweb.estimatedMonthlyVisits, rank: simweb.trafficRank, countries: simweb.topCountries }
      : null,
    builtwith: builtwith?.ok
      ? { tech: builtwith.technologies, traffic: builtwith.trafficTier }
      : null,
    commoncrawl: commoncrawl?.ok
      ? { pages: commoncrawl.pagesInIndex, last_crawled: commoncrawl.lastCrawled }
      : null,
    ahrefs: ahrefs?.ok
      ? { dr: ahrefs.domainRating, backlinks: ahrefs.backlinks, ref_domains: ahrefs.referringDomains, traffic: ahrefs.trafficEstimate }
      : null,
    spiderfoot: Array.isArray(spiderfoot) ? (spiderfoot as SpiderFootItem[]).filter((r) => r?.ok).map((r) => ({ source: r.source, data: r.data })) : null,
    katana: katana?.ok ? { crawled: (katana.data as KatanaData)?.crawled, urls: (katana.data as KatanaData)?.urls?.slice(0, 20) } : null,
    maigret: maigret?.ok ? { profiles_found: (maigret.data as MaigretData)?.profiles_found, sites: (maigret.data as MaigretData)?.sites?.slice(0, 10) } : null,
    searxng_traffic: searxng?.ok ? searxng.data : null,
    skyvern: skyvernSite?.ok || skyvernForms?.ok
      ? {
          site_data: skyvernSite?.ok ? skyvernSite.data : null,
          forms: skyvernForms?.ok ? skyvernForms.data : null,
        }
      : null,
    market_data: industry ? (INDUSTRY_MARKET_DATA[industry as keyof typeof INDUSTRY_MARKET_DATA] ?? null) : null,
    // SMB signals: computed after parallel fetch using Wappalyzer + DNS data
    smb_signals: tech && dns?.ok
      ? await collectSmbSignals(domain, tech.tech.map((t: { name: string }) => t.name), dns.mxRecords).catch(() => null)
      : null,
    ...(gbizFirst ? toCompanyMeta(gbizFirst) : {}),
  }

  const result = await upsertCompanyByDomain({
    domain,
    company_name: gbizFirst?.name ?? scan?.html.title ?? companyName,
    report_locale: input.reportLocale,
    target_country: input.targetCountry,
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

  if (result.company) {
    void saveTechStackDetections(result.company).catch((e) =>
      console.error("[enrich] saveTechStackDetections failed:", e),
    )
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
