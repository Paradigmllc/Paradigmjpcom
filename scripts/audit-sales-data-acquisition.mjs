#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js"
import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs"

const DEFAULT_TEST_DOMAIN = "paradigmjp.com"
const DEFAULT_TEST_URL = `https://${DEFAULT_TEST_DOMAIN}`

const CATEGORY_LABELS = {
  orchestration: "オーケストレーション",
  list: "営業リスト取得",
  analysis: "データ分析・診断",
  outreach: "営業実行",
  demo: "デモ/資料",
  video: "動画",
}

const SOURCES = [
  source("deepseek", "DeepSeek V4 API", "orchestration", ["DEEPSEEK_API_KEY"]),
  source("n8n", "n8n OSS", "orchestration", ["N8N_WEBHOOK_SECRET"], ["N8N_BASE_URL", "N8N_SALES_ENRICHMENT_WEBHOOK_URL"]),
  source("dify_cloud", "Dify Cloud", "orchestration", [
    "DIFY_API_KEY",
    "DIFY_DIAGNOSIS_API_KEY",
    "DIFY_FORM_MESSAGE_KEY",
    "DIFY_FORM_VIOLATION_KEY",
    "DIFY_TEMPLATE_PICKER_KEY",
    "DIFY_KARTE_TO_REPORT_API_KEY",
    "DIFY_KARTE_TO_REPORT_KEY",
    "DIFY_KARTE_TO_SALES_MATERIAL_API_KEY",
    "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
    "DIFY_VIDEO_WORKFLOW_API_KEY",
    "DIFY_VIDEO_API_KEY",
  ]),
  source("hermes_slack", "Hermes Agent / Slack", "orchestration", ["HERMES_AGENT_WEBHOOK_URL", "SLACK_WEBHOOK_URL", "SLACK_BOT_TOKEN"]),
  source("notion_mcp", "Notion MCP", "orchestration", ["NOTION_API_KEY", "NOTION_MCP_TOKEN"]),
  source("supabase_mcp", "Supabase MCP / NocoDB", "orchestration", ["SUPABASE_ACCESS_TOKEN", "NOCODB_BASE_URL"]),
  source("listmonk_mautic", "Listmonk / Mautic", "orchestration", ["LISTMONK_BASE_URL", "MAUTIC_BASE_URL"]),
  source("chrome_mcp", "Chrome MCP", "orchestration", ["CHROME_MCP_URL"]),
  source("crawlee", "Crawlee", "orchestration", ["CRAWLEE_WORKER_URL"]),
  source("crawl4ai", "Crawl4AI", "orchestration", ["CRAWL4AI_BASE_URL"]),
  source("playwright_stealth", "Playwright Stealth", "orchestration", ["OUTREACH_WORKER_URL", "PLAYWRIGHT_STEALTH_ENABLED"]),
  source("rsshub", "RSSHub", "orchestration", ["RSSHUB_BASE_URL"], [], checkRssHub),
  source("browserless", "Browserless", "orchestration", ["BROWSERLESS_URL"], ["BROWSERLESS_TOKEN"], checkBrowserless),
  source("camoufox", "Camoufox", "orchestration", ["CAMOUFOX_WS_URL"]),
  source("wayback_machine", "Wayback Machine", "orchestration", [], [], checkWayback),

  source("apollo", "Apollo.io / Apollo Exporter", "list", ["APOLLO_API_KEY"], ["APOLLO_EXPORTER_TOKEN"]),
  source("fumadata", "Fumadata", "list", ["FUMADATA_API_KEY"]),
  source("bizmap", "BIZMap", "list", ["BIZMAP_API_KEY"]),
  source("gbizinfo", "gBizInfo API", "list", ["GBIZ_API_TOKEN"]),
  source("jgrants", "jGrants API", "list", ["JGRANTS_API_KEY"]),
  source("houjin_bangou", "国税庁法人番号API", "list", ["HOUJIN_BANGOU_API_ID"]),
  source("apify", "Apify API", "list", ["APIFY_API_TOKEN"], [], checkApify),
  source("outscraper", "Outscraper", "list", ["OUTSCRAPER_API_KEY"]),
  source("common_crawl", "Common Crawl", "list", [], [], checkCommonCrawl),
  source("tranco", "Tranco List", "list", [], [], checkTranco),
  source("rapidapi", "RapidAPI wrappers", "list", ["RAPIDAPI_KEY"]),
  source("google_crux", "Google CrUX API", "list", ["GOOGLE_CRUX_API_KEY", "GOOGLE_PSI_API_KEY"], [], checkCrux),
  source("crunchbase_open_data", "Crunchbase Open Data Map", "list", ["CRUNCHBASE_API_KEY"]),
  source("meta_ad_library", "Meta Ad Library API", "list", ["META_AD_LIBRARY_ACCESS_TOKEN"]),

  source("cloudflare_radar", "Cloudflare Radar API", "analysis", ["CLOUDFLARE_API_TOKEN"], [], checkCloudflareRadar),
  source("wappalyzer", "Wappalyzer CLI / local signatures", "analysis", [], [], checkWappalyzerLite),
  source("pagespeed", "PageSpeed Insights API", "analysis", ["GOOGLE_PSI_API_KEY"], [], checkPageSpeed),
  source("dataforseo", "DataForSEO", "analysis", ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], [], checkDataForSeo),
  source("urlscan", "urlscan.io", "analysis", ["URLSCAN_API_KEY"], [], checkUrlscan),
  source("publicwww", "PublicWWW", "analysis", ["PUBLICWWW_API_KEY"]),
  source("whatweb", "WhatWeb API", "analysis", ["WHATWEB_API_URL"]),
  source("mobsf", "Mobile Security Framework MobSF", "analysis", ["MOBSF_BASE_URL"], ["MOBSF_API_KEY"]),
  source("massdns", "MassDNS", "analysis", ["MASSDNS_BIN"]),
  source("serp_tavily", "Serp API / Tavily", "analysis", ["SERPAPI_API_KEY", "TAVILY_API_KEY"]),
  source("shodan_censys", "Shodan / Censys", "analysis", ["SHODAN_API_KEY", "CENSYS_API_ID"], [], checkShodan),
  source("securitytrails", "SecurityTrails API", "analysis", ["SECURITYTRAILS_API_KEY"]),
  source("mozilla_observatory", "Mozilla Observatory API", "analysis", ["MOZILLA_OBSERVATORY_API_URL"], [], checkMozillaObservatory),
  source("ssllabs", "SSL Labs API", "analysis", [], [], checkSslLabs),
  source("google_places", "Google Places API", "analysis", ["GOOGLE_PLACES_API_KEY"]),
  source("subfinder", "Subfinder", "analysis", ["SUBFINDER_BIN"]),
  source("httpx", "httpx", "analysis", ["HTTPX_BIN"]),
  source("crtsh", "crt.sh", "analysis", [], [], checkCrtsh),
  source("abstract_api", "Abstract API", "analysis", ["ABSTRACT_API_KEY"]),
  source("mozscape", "MozScape API", "analysis", ["MOZ_ACCESS_ID", "MOZ_SECRET_KEY"]),
  source("storeleads_cartleads", "Storeleads / CartLeads", "analysis", ["STORELEADS_API_KEY", "CARTLEADS_API_KEY"]),
  source("github_rest", "GitHub REST API", "analysis", ["GITHUB_TOKEN"], [], checkGitHub),
  source("appfigures_apptweak", "Appfigures / AppTweak", "analysis", ["APPFIGURES_CLIENT_KEY", "APPTWEAK_API_KEY"]),
  source("ahrefs_free", "Ahrefs Free Traffic Checker", "analysis", ["AHREFS_FREE_CHECKER_URL"]),
  source("similarweb_free_ui", "Similarweb Free Web UI", "analysis", ["SIMILARWEB_API_KEY", "SIMILARWEB_FREE_UI_URL"]),
  source("pytrends", "Pytrends OSS", "analysis", ["PYTRENDS_WORKER_URL"]),
  source("myipms", "Myip.ms", "analysis", ["MYIPMS_WORKER_URL"]),
  source("searxng", "SearxNG", "analysis", ["SEARXNG_BASE_URL"], [], checkSearxng),
  source("whoogle", "Whoogle Search", "analysis", ["WHOOGLE_BASE_URL"], [], checkWhoogle),
  source("overpass", "OverPass / OpenStreetMap API", "analysis", ["OVERPASS_API_URL"], [], checkOverpass),
  source("yelp_graphql", "Yelp GraphQL API", "analysis", ["YELP_API_KEY"]),
]

function source(slug, label, category, requiredAnyEnv = [], optionalEnv = [], check = null) {
  return { slug, label, category, requiredAnyEnv, optionalEnv, check }
}

function envValue(envs, name) {
  const value = envs[name] ?? process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function configuredNames(envs, names) {
  return names.filter((name) => envValue(envs, name))
}

function isConfigured(envs, names) {
  return names.length === 0 || configuredNames(envs, names).length > 0
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    headers: {
      "User-Agent": "Paradigm Acquisition Auditor/1.0 (+https://paradigmjp.com)",
      ...(options.headers ?? {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text.slice(0, 200)
  }
  return { ok: res.ok, status: res.status, body }
}

async function checkPageSpeed(envs) {
  const params = new URLSearchParams({ url: DEFAULT_TEST_URL, strategy: "mobile", category: "performance" })
  const key = envValue(envs, "GOOGLE_PSI_API_KEY")
  if (key) params.set("key", key)
  const res = await fetchJson(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, { timeoutMs: 60_000 })
  const score = res.body?.lighthouseResult?.categories?.performance?.score
  return {
    ok: res.ok && typeof score === "number",
    label: typeof score === "number" ? `mobile score ${Math.round(score * 100)}` : `HTTP ${res.status}`,
  }
}

async function checkWappalyzerLite() {
  const res = await fetch(DEFAULT_TEST_URL, {
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    headers: { "User-Agent": "Paradigm Wappalyzer Lite/1.0" },
  })
  const html = await res.text()
  const hits = []
  if (/__NEXT_DATA__|_next\/static/i.test(html)) hits.push("Next.js")
  if (/wp-content|wp-includes/i.test(html)) hits.push("WordPress")
  if (/googletagmanager\.com|GTM-/i.test(html)) hits.push("Google Tag Manager")
  if (/cloudflare|cdn-cgi/i.test(`${html}\n${res.headers.get("server") ?? ""}`)) hits.push("Cloudflare")
  return { ok: res.ok, label: hits.length > 0 ? hits.join(", ") : "HTML fetched; no signature hit" }
}

async function checkSslLabs() {
  const res = await fetchJson("https://api.ssllabs.com/api/v3/info")
  return { ok: res.ok, label: res.body?.version ? `API ${res.body.version}` : `HTTP ${res.status}` }
}

async function checkWayback() {
  const res = await fetchJson(`https://archive.org/wayback/available?url=${encodeURIComponent(DEFAULT_TEST_DOMAIN)}`)
  return { ok: res.ok, label: res.body?.archived_snapshots ? "snapshot endpoint OK" : `HTTP ${res.status}` }
}

async function checkCommonCrawl() {
  const res = await fetchJson("https://index.commoncrawl.org/collinfo.json")
  return { ok: res.ok && Array.isArray(res.body), label: Array.isArray(res.body) ? `${res.body.length} indexes` : `HTTP ${res.status}` }
}

async function checkTranco() {
  const res = await fetch("https://tranco-list.eu/top-1m.csv.zip", { method: "HEAD", signal: AbortSignal.timeout(12_000) })
  return { ok: res.ok, label: `HTTP ${res.status}` }
}

async function checkCrux(envs) {
  const key = envValue(envs, "GOOGLE_CRUX_API_KEY") ?? envValue(envs, "GOOGLE_PSI_API_KEY")
  if (!key) return { ok: false, label: "GOOGLE_CRUX_API_KEY/GOOGLE_PSI_API_KEY not configured" }
  const res = await fetchJson(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin: DEFAULT_TEST_URL }),
  })
  return { ok: res.ok, label: res.ok ? "origin record checked" : `HTTP ${res.status}` }
}

async function checkCloudflareRadar(envs) {
  const token = envValue(envs, "CLOUDFLARE_API_TOKEN")
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetchJson("https://api.cloudflare.com/client/v4/radar/entities/locations?limit=1", { headers })
  return { ok: res.ok, label: res.ok ? "locations endpoint OK" : `HTTP ${res.status}` }
}

async function checkDataForSeo(envs) {
  const login = envValue(envs, "DATAFORSEO_LOGIN")
  const password = envValue(envs, "DATAFORSEO_PASSWORD")
  if (!login || !password) return { ok: false, label: "DATAFORSEO_LOGIN/PASSWORD not configured" }
  const auth = Buffer.from(`${login}:${password}`).toString("base64")
  const res = await fetchJson("https://api.dataforseo.com/v3/appendix/user_data", { headers: { Authorization: `Basic ${auth}` } })
  return { ok: res.ok, label: res.ok ? "user_data OK" : `HTTP ${res.status}` }
}

async function checkUrlscan(envs) {
  const key = envValue(envs, "URLSCAN_API_KEY")
  if (!key) return { ok: false, label: "URLSCAN_API_KEY not configured" }
  const res = await fetchJson("https://urlscan.io/user/quotas", { headers: { "API-Key": key } })
  return { ok: res.ok, label: res.ok ? "quota OK" : `HTTP ${res.status}` }
}

async function checkBrowserless(envs) {
  const rawUrl = envValue(envs, "BROWSERLESS_URL")
  if (!rawUrl) return { ok: false, label: "BROWSERLESS_URL not configured" }
  const url = new URL(rawUrl)
  const token = envValue(envs, "BROWSERLESS_TOKEN") ?? url.searchParams.get("token")
  url.pathname = "/pressure"
  if (token) url.searchParams.set("token", token)
  const res = await fetchJson(url.toString())
  return { ok: res.ok, label: res.ok ? `pressure ${JSON.stringify(res.body).slice(0, 80)}` : `HTTP ${res.status}` }
}

async function checkApify(envs) {
  const token = envValue(envs, "APIFY_API_TOKEN")
  if (!token) return { ok: false, label: "APIFY_API_TOKEN not configured" }
  const res = await fetchJson(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(token)}`)
  return { ok: res.ok, label: res.ok ? "me OK" : `HTTP ${res.status}` }
}

async function checkShodan(envs) {
  const key = envValue(envs, "SHODAN_API_KEY")
  if (!key) return { ok: false, label: "SHODAN_API_KEY not configured" }
  const res = await fetchJson(`https://api.shodan.io/api-info?key=${encodeURIComponent(key)}`)
  return { ok: res.ok, label: res.ok ? "api-info OK" : `HTTP ${res.status}` }
}

async function checkMozillaObservatory(envs) {
  const base = envValue(envs, "MOZILLA_OBSERVATORY_API_URL") ?? "https://observatory-api.mdn.mozilla.net/api/v2"
  const res = await fetchJson(`${base.replace(/\/$/, "")}/analyze?host=${encodeURIComponent(DEFAULT_TEST_DOMAIN)}`, { timeoutMs: 15_000 })
  return { ok: res.ok || res.status === 202, label: `HTTP ${res.status}` }
}

async function checkCrtsh() {
  const res = await fetchJson(`https://crt.sh/?q=${encodeURIComponent(DEFAULT_TEST_DOMAIN)}&output=json`, { timeoutMs: 20_000 })
  return { ok: res.ok, label: Array.isArray(res.body) ? `${res.body.length} cert rows` : `HTTP ${res.status}` }
}

async function checkGitHub(envs) {
  const token = envValue(envs, "GITHUB_TOKEN")
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetchJson("https://api.github.com/rate_limit", { headers })
  return { ok: res.ok, label: res.body?.rate?.remaining !== undefined ? `remaining ${res.body.rate.remaining}` : `HTTP ${res.status}` }
}

async function checkRssHub(envs) {
  const base = envValue(envs, "RSSHUB_BASE_URL") ?? "https://rsshub.app"
  const res = await fetchJson(`${base.replace(/\/$/, "")}/-/healthz`, { timeoutMs: 10_000 })
  return { ok: res.ok, label: `HTTP ${res.status}` }
}

async function checkSearxng(envs) {
  const base = envValue(envs, "SEARXNG_BASE_URL")
  if (!base) return { ok: false, label: "SEARXNG_BASE_URL not configured" }
  const res = await fetchJson(`${base.replace(/\/$/, "")}/search?q=paradigmjp&format=json`, { timeoutMs: 10_000 })
  return { ok: res.ok, label: `HTTP ${res.status}` }
}

async function checkWhoogle(envs) {
  const base = envValue(envs, "WHOOGLE_BASE_URL")
  if (!base) return { ok: false, label: "WHOOGLE_BASE_URL not configured" }
  const res = await fetch(`${base.replace(/\/$/, "")}/search?q=paradigmjp`, { signal: AbortSignal.timeout(10_000) })
  return { ok: res.ok, label: `HTTP ${res.status}` }
}

async function checkOverpass(envs) {
  const base = envValue(envs, "OVERPASS_API_URL") ?? "https://overpass-api.de/api"
  const res = await fetch(`${base.replace(/\/$/, "")}/status`, { signal: AbortSignal.timeout(10_000) })
  return { ok: res.ok, label: `HTTP ${res.status}` }
}

function getAtPath(record, path) {
  let current = record
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return null
    current = current[part]
  }
  return current
}

function sourceCollectedFromMeta(source, meta, company) {
  const candidates = [
    source.slug,
    source.slug.replace(/_api$/, ""),
    source.slug.replace(/_machine$/, ""),
    source.slug.replace(/_graphql$/, ""),
    `tech.stack`,
  ]
  if (source.slug === "pagespeed") return company.pagespeed_mobile !== null || company.pagespeed_desktop !== null
  if (source.slug === "wappalyzer") return Array.isArray(getAtPath(meta, "tech.stack")) && getAtPath(meta, "tech.stack").length > 0
  if (source.slug === "google_places") return Boolean(meta.place || meta.google_places)
  if (source.slug === "gbizinfo") return Boolean(meta.gbiz || meta.gbizinfo || meta.corporate_number)
  if (source.slug === "crawl4ai" || source.slug === "crawlee") return Boolean(meta.form_discovery || meta.contact_form_url)
  return candidates.some((key) => Boolean(getAtPath(meta, key)))
}

async function getSupabase(envs) {
  const url = envValue(envs, "SALES_SUPABASE_URL") ?? envValue(envs, "NEXT_PUBLIC_SUPABASE_URL")
  const key = envValue(envs, "SALES_SUPABASE_SERVICE_ROLE_KEY") ?? envValue(envs, "SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) return { sb: null, error: "SALES_SUPABASE_URL or service role key not configured" }
  return { sb: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), error: null }
}

async function readDbSnapshot(sb) {
  const snapshot = {
    companies: 0,
    sourceRuns: 0,
    sourceTypes: 0,
    techDetections: null,
    sourceRows: [],
    companiesRows: [],
    errors: [],
  }
  const { count: companiesCount, data: companies, error: companiesError } = await sb
    .from("sales_companies")
    .select("id, company_name, domain, pagespeed_mobile, pagespeed_desktop, meta", { count: "exact" })
    .limit(5000)
  if (companiesError) snapshot.errors.push(`sales_companies: ${companiesError.message}`)
  snapshot.companies = companiesCount ?? 0
  snapshot.companiesRows = companies ?? []

  const { count: sourceCount, data: sourceRows, error: sourceError } = await sb
    .from("sales_source_runs")
    .select("company_id, source_slug, category, status, measured_at", { count: "exact" })
    .limit(10000)
  if (sourceError) snapshot.errors.push(`sales_source_runs: ${sourceError.message}`)
  snapshot.sourceRuns = sourceCount ?? 0
  snapshot.sourceRows = sourceRows ?? []
  snapshot.sourceTypes = new Set((sourceRows ?? []).map((row) => row.source_slug)).size

  const { count: techCount, error: techError } = await sb
    .from("sales_tech_stack_detections")
    .select("id", { count: "exact", head: true })
  if (techError) snapshot.errors.push(`sales_tech_stack_detections: ${techError.message}`)
  else snapshot.techDetections = techCount ?? 0
  return snapshot
}

async function writeSourceRuns(sb, envs, checks, companies) {
  const measuredAt = new Date().toISOString()
  const rows = []
  for (const company of companies) {
    const meta = company.meta && typeof company.meta === "object" ? company.meta : {}
    for (const check of checks) {
      const collected = sourceCollectedFromMeta(check.source, meta, company)
      const configured = check.configured
      rows.push({
        company_id: company.id,
        source_slug: check.source.slug,
        category: check.source.category,
        status: collected ? "collected" : configured ? "configured" : "missing",
        score: collected ? 100 : configured ? 65 : 0,
        details: {
          label: check.source.label,
          detail: check.source.label,
          envConfigured: check.configuredEnv,
          envMissing: check.missingEnv,
          liveStatus: check.liveStatus,
          liveLabel: check.liveLabel,
        },
        measured_at: measuredAt,
      })
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb
      .from("sales_source_runs")
      .upsert(rows.slice(i, i + 500), { onConflict: "company_id,source_slug" })
    if (error) throw new Error(`sales_source_runs upsert failed: ${error.message}`)
  }
  return rows.length
}

function summarizeRows(rows) {
  const byStatus = {}
  const byCategory = {}
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1
  }
  const total = rows.length
  const collected = byStatus.collected ?? 0
  const usable = collected + (byStatus.configured ?? 0)
  return {
    total,
    sourceTypes: new Set(rows.map((row) => row.source_slug)).size,
    collected,
    collectedRate: total > 0 ? Math.round((collected / total) * 100) : 0,
    usable,
    usableRate: total > 0 ? Math.round((usable / total) * 100) : 0,
    byStatus,
    byCategory,
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const write = args.has("--write-source-runs")
  const envs = await readCoolifyApplicationEnvs()
  const { sb, error } = await getSupabase(envs)
  if (!sb) throw new Error(error)

  const checks = []
  for (const def of SOURCES) {
    const configuredEnv = configuredNames(envs, def.requiredAnyEnv)
    const missingEnv = def.requiredAnyEnv.filter((name) => !configuredEnv.includes(name))
    let liveStatus = "not_checked"
    let liveLabel = def.requiredAnyEnv.length > 0 && !isConfigured(envs, def.requiredAnyEnv) ? "missing env" : "configured only"
    if (def.check) {
      try {
        const result = await def.check(envs)
        liveStatus = result.ok ? "ok" : "error"
        liveLabel = result.label
      } catch (checkError) {
        liveStatus = "error"
        liveLabel = checkError instanceof Error ? checkError.message : String(checkError)
      }
    }
    checks.push({ source: def, configured: isConfigured(envs, def.requiredAnyEnv), configuredEnv, missingEnv, liveStatus, liveLabel })
  }

  const before = await readDbSnapshot(sb)
  let writtenRows = 0
  if (write) writtenRows = await writeSourceRuns(sb, envs, checks, before.companiesRows)
  const after = write ? await readDbSnapshot(sb) : before
  const summary = summarizeRows(after.sourceRows)

  const configuredCount = checks.filter((check) => check.configured).length
  const liveOk = checks.filter((check) => check.liveStatus === "ok").length
  const liveError = checks.filter((check) => check.liveStatus === "error").length
  const byCategory = Object.fromEntries(
    Object.entries(CATEGORY_LABELS).map(([category, label]) => [
      label,
      {
        total: checks.filter((check) => check.source.category === category).length,
        configured: checks.filter((check) => check.source.category === category && check.configured).length,
        liveOk: checks.filter((check) => check.source.category === category && check.liveStatus === "ok").length,
      },
    ]),
  )

  const result = {
    checkedAt: new Date().toISOString(),
    target: DEFAULT_TEST_URL,
    catalog: {
      sources: checks.length,
      configured: configuredCount,
      configuredRate: Math.round((configuredCount / checks.length) * 100),
      liveChecked: checks.filter((check) => check.liveStatus !== "not_checked").length,
      liveOk,
      liveError,
      byCategory,
    },
    database: {
      companies: after.companies,
      sourceRuns: after.sourceRuns,
      sourceTypes: after.sourceTypes,
      sourceCollected: summary.collected,
      sourceCollectedRate: summary.collectedRate,
      sourceUsable: summary.usable,
      sourceUsableRate: summary.usableRate,
      byStatus: summary.byStatus,
      byCategory: summary.byCategory,
      techDetections: after.techDetections,
      errors: after.errors,
      writtenRows,
    },
    sources: checks.map((check) => ({
      slug: check.source.slug,
      label: check.source.label,
      category: check.source.category,
      configured: check.configured,
      configuredEnvCount: check.configuredEnv.length,
      missingEnv: check.missingEnv,
      liveStatus: check.liveStatus,
      liveLabel: check.liveLabel,
    })),
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
