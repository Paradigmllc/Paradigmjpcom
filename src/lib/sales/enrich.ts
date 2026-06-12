/**
 * lib/sales/enrich.ts — contact form → sales_companies 自動エンリッチ
 *
 * 25 無料 OSS ソースで企業データを収集:
 *   - 自社スキャン (PSI + HTML)
 *   - 公開API (SSL Labs, Whois, crt.sh, DNS, Tranco, CommonCrawl, etc.)
 *   - OSSツール (SpiderFoot, Katana, Maigret, Stagehand, Steel.dev, SearXNG)
 *   - gBizInfo (日本のみ)
 *
 * 入力: enrichFromContact({ email, company?, message?, services? })
 * 出力: { ok, company?: SalesCompany, skipped?: "personal_domain" | "no_email" }
 */
import { upsertCompanyByDomain, findCompanyByDomain } from "./companies"
import { scanDomain } from "./sources/scanner"
import { searchByName, toCompanyMeta } from "./sources/gbizinfo"
import { detectTechStack } from "./sources/wappalyzer"
import { checkSslGrade } from "./sources/ssllabs"
import { getWhois } from "./sources/whois"
import { discoverFormUrl } from "./sources/form-discovery"
import { searchCrtsh } from "./sources/crtsh"
import { queryCloudflareRadar } from "./sources/cloudflare-radar"
import { scanMozillaObservatory } from "./sources/mozilla-observatory"
import { queryDnsRecords } from "./sources/dns-doh"
import { checkHstsPreload } from "./sources/hsts-preload"
import { queryWaybackMachine } from "./sources/wayback-machine"
import { queryTrancoRank } from "./sources/tranco"
import { checkEmailReputation } from "./sources/emailrep"
import { searchOpenCorporates } from "./sources/opencorporates"
import { searchGitHubOrg } from "./sources/github-api"
import { queryCommonCrawl } from "./sources/commoncrawl"
import { enrichDomainWithSpiderFoot } from "./sources/spiderfoot-source"
import { crawlWithKatana } from "./sources/katana-source"
import { searchMaigretForDomain } from "./sources/maigret-source"
import { extractSiteData, discoverForms } from "./sources/stagehand-enrich-source"
import { scrapeWithSteel } from "./sources/steel-source"
import { estimateTrafficViaSearx } from "./sources/searxng-traffic"
import { INDUSTRY_MARKET_DATA } from "./sources/market-data"
import { collectSmbSignals } from "./sources/smb-signals"
import { autoPersonalize } from "./personalize"
import { saveTechStackDetections } from "./source-acquisition"
import type { Industry, SalesCompany } from "./types"

function envFlag(name: string): boolean {
  const value = process.env[name]
  return value === "true" || value === "1"
}

interface SourceMetrics {
  success: number
  failed: number
  timeout: number
  skipped: number
}

async function batchAll(tasks: (() => Promise<unknown>)[], limit = 6): Promise<unknown[]> {
  const results: unknown[] = new Array(tasks.length)
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map((t) => t()))
    for (let j = 0; j < batchResults.length; j++) results[i + j] = batchResults[j]
  }
  return results
}

async function timedTask<R>(
  name: string,
  fn: () => Promise<R>,
  timeoutMs: number,
  fallback: R,
  metrics: Record<string, SourceMetrics>,
): Promise<R> {
  if (!metrics[name]) metrics[name] = { success: 0, failed: 0, timeout: 0, skipped: 0 }
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)),
    ])
    metrics[name].success++
    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === "TIMEOUT") {
      metrics[name].timeout++
      console.warn(`[enrich] ${name} timed out after ${timeoutMs}ms`)
    } else {
      metrics[name].failed++
      console.error(`[enrich] ${name} failed:`, msg)
    }
    return fallback
  }
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.jp", "ymail.com", "outlook.com", "outlook.jp",
  "hotmail.com", "hotmail.co.jp", "live.com", "icloud.com", "me.com", "aol.com",
  "protonmail.com", "pm.me", "gmx.com", "gmx.net", "mail.com", "zoho.com",
  "yandex.com", "qq.com", "163.com", "naver.com", "daum.net", "kakao.com",
  "ezweb.ne.jp", "docomo.ne.jp", "softbank.ne.jp", "i.softbank.jp", "ymobile.ne.jp",
])

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

export async function enrichFromContact(input: EnrichInput): Promise<EnrichResult> {
  if (!input.email) return { ok: false, skipped: "no_email" }
  const atIdx = input.email.indexOf("@")
  if (atIdx < 0) return { ok: false, skipped: "invalid_email" }
  const rawDomain = input.email.slice(atIdx + 1).trim().toLowerCase()
  if (!rawDomain || !rawDomain.includes(".")) return { ok: false, skipped: "invalid_email" }
  if (PERSONAL_DOMAINS.has(rawDomain)) return { ok: false, skipped: "personal_domain" }

  const domain = rawDomain
  const companyName = input.company?.trim() || domain
  const industry = guessIndustry(input.services, input.message)

  // Step 1: stub upsert
  const existing = await findCompanyByDomain(domain)
  if (!existing) {
    await upsertCompanyByDomain({
      domain, company_name: companyName,
      report_locale: input.reportLocale,
      target_country: input.targetCountry,
      industry, pipeline_status: "scanning",
      source: input.source ?? "contact_form",
      meta: { contact: { original_email: input.email, services: input.services ?? [], message_excerpt: input.message?.slice(0, 200) ?? null, received_at: new Date().toISOString() } },
    })
  }

  // Step 2: enrich with concurrency limit (6 at a time)
  // Stagehand (in-process Chromium) is heavy — only enable via STAGEHAND_ENABLED=true
  const url = domain.startsWith("http") ? domain : `https://${domain}`
  const metrics: Record<string, SourceMetrics> = {}
  const stagehandEnabled = envFlag("STAGEHAND_ENABLED")
  const DEFAULT_TIMEOUT = 25_000

  type TaskEntry = { name: string; fn: () => Promise<unknown> }
  const taskDefs: TaskEntry[] = [
    { name: "scan", fn: () => scanDomain(domain) },
    { name: "gbizinfo", fn: () => searchByName(companyName, 1) },
    { name: "wappalyzer", fn: () => detectTechStack(url) },
    { name: "ssllabs", fn: () => checkSslGrade(domain) },
    { name: "whois", fn: () => getWhois(domain) },
    { name: "form_discovery", fn: () => discoverFormUrl({ homeUrl: domain }) },
    { name: "crtsh", fn: () => searchCrtsh(domain) },
    { name: "cloudflare_radar", fn: () => queryCloudflareRadar(domain) },
    { name: "mozilla_observatory", fn: () => scanMozillaObservatory(domain) },
    { name: "dns", fn: () => queryDnsRecords(domain) },
    { name: "hsts", fn: () => checkHstsPreload(domain) },
    { name: "wayback", fn: () => queryWaybackMachine(domain) },
    { name: "tranco", fn: () => queryTrancoRank(domain) },
    { name: "emailrep", fn: () => checkEmailReputation(domain) },
    { name: "opencorp", fn: () => searchOpenCorporates(domain) },
    { name: "github", fn: () => searchGitHubOrg(domain) },
    { name: "commoncrawl", fn: () => queryCommonCrawl(domain) },
    { name: "spiderfoot", fn: () => enrichDomainWithSpiderFoot(domain) },
    { name: "katana", fn: () => crawlWithKatana(url) },
    { name: "maigret", fn: () => searchMaigretForDomain(domain) },
    { name: "searxng_traffic", fn: () => estimateTrafficViaSearx(domain, companyName ?? undefined) },
    ...(stagehandEnabled ? [
      { name: "stagehand_extract", fn: () => extractSiteData(url) },
      { name: "stagehand_forms", fn: () => discoverForms(url) },
    ] : [
      { name: "stagehand_extract", fn: () => Promise.resolve(null) },
      { name: "stagehand_forms", fn: () => Promise.resolve(null) },
    ]),
    { name: "steel", fn: () => scrapeWithSteel(url) },
  ]

  const sources = await batchAll(
    taskDefs.map((def) => () =>
      timedTask(def.name, def.fn, DEFAULT_TIMEOUT, null, metrics).catch(() => null)
    ),
  )
  const sourceMap = Object.fromEntries(taskDefs.map((def, i) => [def.name, sources[i]]))
  const skippedStagehand = !stagehandEnabled

  const [
    scan, gbiz, tech, ssl, whois, form, crtsh, radar, observatory, dns, hsts,
    wayback, tranco, emailrep, opencorp, github, commoncrawl, spiderfoot, katana,
    maigret, searxng,
    stagehandSite, stagehandForms, steel,
  ] = sources as any[]

  // Step 3: 集約
  const gbizFirst = gbiz?.[0]
  const allSourceResults = [scan, gbiz, tech, ssl, whois, form, crtsh, radar, observatory, dns, hsts, wayback, tranco, emailrep, opencorp, github, commoncrawl, spiderfoot, katana, maigret, searxng, steel, ...(stagehandEnabled ? [stagehandSite, stagehandForms] : [])]
  const meta: Record<string, unknown> = {
    sales_os: {
      last_enriched_at: new Date().toISOString(),
      enriched_via: input.source ?? "contact_form",
      sources_collected: allSourceResults.filter(s => s != null && (Array.isArray(s) ? s.length > 0 : true)).length,
      source_quality: {
        ...metrics,
        stagehand_skipped: skippedStagehand,
      },
    },
    contact: { original_email: input.email, services: input.services ?? [], received_at: new Date().toISOString() },
    scan: scan ? {
      mobile_score: scan.mobile.performance, desktop_score: scan.desktop.performance,
      html_title: scan.html.title, html_description: scan.html.description,
      is_wordpress: scan.html.isWordPress, form_count: scan.html.formCount,
      automation_guard: { recaptcha: scan.html.hasRecaptcha, turnstile: scan.html.hasTurnstile, human_review_required: scan.html.hasRecaptcha || scan.html.hasTurnstile },
    } : null,
    tech: { stack: tech.tech, server: tech.server, count: tech.tech.length },
    ssl: ssl ?? null,
    whois: whois ?? null,
    contact_form_url: form?.formUrl && form.method !== "fallback" ? form.formUrl : null,
    form_discovery: form ? { method: form.method, confidence: form.confidence } : null,
    crtsh: crtsh?.ok ? { total_certs: crtsh.totalCerts, subdomains: crtsh.subdomains } : null,
    cloudflare_radar: radar?.ok ? { rank: radar.rank, categories: radar.categories } : null,
    mozilla_observatory: observatory?.ok ? { score: observatory.score, grade: observatory.grade } : null,
    dns: dns?.ok ? { mx_records: dns.mxRecords, spf: dns.spfRecord, dmarc: dns.dmarcRecord, email_provider: dns.emailProvider, dnssec: dns.hasDnssec } : null,
    hsts_preload: hsts?.ok ? { preloaded: hsts.isPreloaded, status: hsts.status } : null,
    wayback: wayback?.ok ? { snapshots: wayback.totalSnapshots, first: wayback.firstSnapshot, years_active: wayback.yearsActive } : null,
    tranco: tranco?.ok ? { rank: tranco.rank } : null,
    emailrep: emailrep?.ok ? { reputation: emailrep.reputation, suspicious: emailrep.suspicious } : null,
    opencorp: opencorp?.ok ? { companies: opencorp.companies, total: opencorp.totalCount } : null,
    github: github?.ok ? { org: github.orgName, repos: github.publicRepos, languages: github.topLanguages, stars: github.stars } : null,
    commoncrawl: commoncrawl?.ok ? { pages: commoncrawl.pagesInIndex, last_crawled: commoncrawl.lastCrawled } : null,
    spiderfoot: Array.isArray(spiderfoot) ? spiderfoot.filter(r => r?.ok).map(r => ({ source: r.source, data: r.data })) : null,
    katana: katana?.ok ? { crawled: katana.data?.crawled, urls: katana.data?.urls?.slice(0, 20) } : null,
    maigret: maigret?.ok ? { profiles: maigret.data?.profiles_found, sites: maigret.data?.sites?.slice(0, 10) } : null,
    searxng_traffic: searxng?.ok ? searxng.data : null,
    stagehand: !skippedStagehand && (stagehandSite?.ok || stagehandForms?.ok) ? { site: stagehandSite?.ok ? stagehandSite.data : null, forms: stagehandForms?.ok ? stagehandForms.data : null } : null,
    steel: steel?.ok ? { title: steel.data?.title, text: steel.data?.text?.slice(0, 2000), links_count: steel.data?.links?.length } : null,
    market_data: industry ? (INDUSTRY_MARKET_DATA[industry as keyof typeof INDUSTRY_MARKET_DATA] ?? null) : null,
    smb_signals: tech && dns?.ok ? await collectSmbSignals(domain, tech.tech.map((t: { name: string }) => t.name), dns.mxRecords).catch(() => null) : null,
    ...(gbizFirst ? toCompanyMeta(gbizFirst) : {}),
  }

  const result = await upsertCompanyByDomain({
    domain, company_name: gbizFirst?.name ?? scan?.html.title ?? companyName,
    report_locale: input.reportLocale, target_country: input.targetCountry,
    industry, prefecture: gbizFirst?.prefecture ?? null,
    pagespeed_mobile: scan?.mobile.performance ?? null,
    pagespeed_desktop: scan?.desktop.performance ?? null,
    detected_issues: scan?.issues ?? [],
    pipeline_status: scan ? "report_ready" : "pending",
    source: input.source ?? "contact_form",
    meta,
  })

  if (!result.ok) return { ok: false, error: result.error }

  if (result.company) {
    void saveTechStackDetections(result.company).catch(e => console.error("[enrich] saveTechStackDetections failed:", e))
    void autoPersonalize(result.company.id).catch(e => console.error("[enrich] autoPersonalize failed:", e))
  }

  return { ok: true, company: result.company }
}
