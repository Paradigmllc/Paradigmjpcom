import { getServiceSalesSupabase } from "@/lib/supabase"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

export type SourceCoverageStatus =
  | "collected"
  | "configured"
  | "queued"
  | "missing"
  | "disabled"
  | "not_applicable"
  | "error"

export interface SourceCoverageItem {
  slug: string
  label: string
  category: string
  status: SourceCoverageStatus
  score: number
  detail: string
}

export interface SourceCoverageSnapshot {
  score: number
  collected: number
  configured: number
  missing: number
  items: SourceCoverageItem[]
}

interface SourceDefinition {
  slug: string
  label: string
  category: string
  env?: string[]
  detect: (meta: JsonRecord, company: SalesCompany) => boolean
  detail: string
}

const SOURCES: SourceDefinition[] = [
  { slug: "pagespeed", label: "PageSpeed Insights", category: "analysis", env: ["GOOGLE_PSI_API_KEY"], detect: (_meta, c) => c.pagespeed_mobile !== null || c.pagespeed_desktop !== null, detail: "Core Web Vitals and speed risk" },
  { slug: "html_metadata", label: "HTML metadata scan", category: "analysis", detect: (m) => !!(m.scan as JsonRecord | undefined)?.html_title || !!(m.scan as JsonRecord | undefined)?.html_description, detail: "Title, description, canonical, OGP, and visible HTML evidence" },
  { slug: "robots_sitemap", label: "robots.txt / sitemap.xml", category: "analysis", detect: (m) => !!(m.robots_sitemap as JsonRecord | undefined)?.robotsTxt || !!(m.robots_sitemap as JsonRecord | undefined)?.sitemapXml, detail: "Crawlability and public URL inventory" },
  { slug: "security_headers_free", label: "HTTP security headers", category: "analysis", detect: (m) => !!m.security_headers, detail: "HSTS, CSP, X-Frame-Options, nosniff, and server header" },
  { slug: "dataforseo", label: "DataForSEO", category: "analysis", env: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], detect: (m) => !!m.dataforseo, detail: "SEO and lighthouse enrichment" },
  { slug: "wappalyzer", label: "Wappalyzer CLI", category: "analysis", detect: (m) => Array.isArray((m.tech as JsonRecord | undefined)?.stack), detail: "CMS/framework/analytics stack" },
  { slug: "whatweb", label: "WhatWeb API", category: "analysis", env: ["WHATWEB_API_URL"], detect: (m) => !!m.whatweb || !!(m.tech as JsonRecord | undefined)?.server, detail: "Technology fingerprint fallback" },
  { slug: "urlscan", label: "urlscan.io", category: "analysis", env: ["URLSCAN_API_KEY"], detect: (m) => !!m.urlscan, detail: "Security and resource evidence" },
  { slug: "publicwww", label: "PublicWWW", category: "analysis", env: ["PUBLICWWW_API_KEY"], detect: (m) => !!m.publicwww, detail: "Tracking/script footprint" },
  { slug: "ssllabs", label: "SSL Labs", category: "analysis", detect: (m) => !!m.ssl, detail: "TLS grade and certificate risk" },
  { slug: "mozilla_observatory", label: "Mozilla Observatory", category: "analysis", env: ["MOZILLA_OBSERVATORY_API_URL"], detect: (m) => !!m.mozilla_observatory, detail: "HTTP security headers" },
  { slug: "securitytrails", label: "SecurityTrails", category: "analysis", env: ["SECURITYTRAILS_API_KEY"], detect: (m) => !!m.securitytrails, detail: "DNS and infrastructure history" },
  { slug: "shodan", label: "Shodan/Censys", category: "analysis", env: ["SHODAN_API_KEY", "CENSYS_API_ID"], detect: (m) => !!m.shodan || !!m.censys, detail: "Public exposure scan" },
  { slug: "gbizinfo", label: "gBizInfo API", category: "list", detect: (m) => !!m.corporate_number || !!m.gbizinfo, detail: "Official company registry facts" },
  { slug: "houjin_bangou", label: "National Tax Agency", category: "list", env: ["HOUJIN_BANGOU_API_ID"], detect: (m) => !!m.national_tax_agency, detail: "Corporate number lookup" },
  { slug: "jgrants", label: "jGrants API", category: "list", env: ["JGRANTS_API_KEY"], detect: (m) => !!m.jgrants, detail: "Subsidy opportunity evidence" },
  { slug: "google_places", label: "Google Places", category: "list", env: ["GOOGLE_PLACES_API_KEY"], detect: (m) => !!m.place, detail: "Local presence and MEO facts" },
  { slug: "hunter", label: "Hunter/Apollo contacts", category: "list", env: ["HUNTER_API_KEY", "APOLLO_API_KEY"], detect: (m) => !!m.hunter || !!m.apollo, detail: "Contact discovery" },
  { slug: "form_discovery", label: "Crawlee/Crawl4AI form discovery", category: "outreach", env: ["CRAWL4AI_BASE_URL"], detect: (m) => !!m.contact_form_url || !!m.form_discovery, detail: "Contact form URL evidence" },
  { slug: "browser_worker", label: "Playwright Stealth / Browserless / Camoufox", category: "outreach", env: ["BROWSERLESS_URL", "OUTREACH_WORKER_URL", "CAMOUFOX_WS_URL"], detect: (m) => !!m.browser_worker, detail: "SPA form escalation path" },
  { slug: "dify", label: "Dify pain diagnosis", category: "orchestration", env: ["DIFY_DIAGNOSIS_API_KEY", "DIFY_API_KEY"], detect: (m) => !!m.pain_diagnosis || !!m.dify_diagnosis, detail: "Pain summary and offer mapping" },
  { slug: "deepseek", label: "DeepSeek V4 copy", category: "orchestration", env: ["DEEPSEEK_API_KEY"], detect: (m) => !!m.personalized_copy, detail: "Personalized diagnosis copy" },
  { slug: "n8n_trigger", label: "n8n / Trigger.dev", category: "orchestration", env: ["N8N_SALES_ENRICHMENT_WEBHOOK_URL", "TRIGGER_DEV_SALES_ENRICHMENT_WEBHOOK_URL"], detect: (m) => !!m.enrichment, detail: "Job execution and audit trail" },
  { slug: "astro_demo", label: "Astro replacement demo", category: "demo", detect: (m) => !!m.demo_site, detail: "Generated demo page for the prospect" },
  { slug: "remotion_video", label: "Remotion / OpenMontage video", category: "video", env: ["OPENMONTAGE_API_URL", "COMFYUI_API_URL", "REMOTION_RENDER_URL"], detect: (m) => !!m.video_asset, detail: "Video proposal asset" },
]

function hasConfiguredEnv(names?: string[]): boolean {
  if (!names || names.length === 0) return false
  return names.some((name) => {
    const value = process.env[name]
    return typeof value === "string" && value.trim().length > 0
  })
}

function scoreFor(status: SourceCoverageStatus): number {
  if (status === "collected") return 100
  if (status === "configured") return 65
  if (status === "queued") return 45
  if (status === "not_applicable") return 50
  return 0
}

export function computeSourceCoverage(company: SalesCompany): SourceCoverageSnapshot {
  const meta = (company.meta ?? {}) as JsonRecord
  const items = SOURCES.map((source): SourceCoverageItem => {
    const collected = source.detect(meta, company)
    const configured = hasConfiguredEnv(source.env)
    const status: SourceCoverageStatus = collected ? "collected" : configured ? "configured" : "missing"
    return {
      slug: source.slug,
      label: source.label,
      category: source.category,
      status,
      score: scoreFor(status),
      detail: source.detail,
    }
  })
  const scored = items.filter((item) => item.status !== "not_applicable")
  const total = scored.reduce((sum, item) => sum + item.score, 0)
  return {
    score: scored.length > 0 ? Math.round(total / scored.length) : 0,
    collected: items.filter((item) => item.status === "collected").length,
    configured: items.filter((item) => item.status === "configured").length,
    missing: items.filter((item) => item.status === "missing").length,
    items,
  }
}

export async function saveSourceCoverageRows(company: SalesCompany): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const coverage = computeSourceCoverage(company)
  const measuredAt = new Date().toISOString()
  const rows = coverage.items.map((item) => ({
    company_id: company.id,
    source_slug: item.slug,
    category: item.category,
    status: item.status,
    score: item.score,
    details: { label: item.label, detail: item.detail },
    measured_at: measuredAt,
  }))

  const { error } = await sb
    .from("sales_source_runs")
    .upsert(rows, { onConflict: "company_id,source_slug" })
  if (error) console.error("[source-coverage] upsert failed:", error.message)
}
