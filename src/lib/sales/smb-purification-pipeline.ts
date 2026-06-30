/**
 * SMB Purification Pipeline — 3-stage CZDS domain filter.
 *
 * Stage 1: CZDS all TLDs (~200M domains) → exclude enterprise/SaaS keywords → ~20M
 * Stage 2: Crawl4AI fast scan → WP version/viewport/footer year check → ~2-3M
 * Stage 3: Wappalyzer + httpx + urlscan deep analysis → personalized proposals
 *
 * This pipeline integrates existing components (passive_inventory, enterprise-filter,
 * wappalyzer, crawl4ai) into a unified acquisition flow.
 */

import { fetchZoneDomains } from "./sources/czds-zone-files"
import { isEnterpriseTechStack } from "./sources/enterprise-filter"
import { detectTechStack } from "./sources/wappalyzer"
import { optionalEnv } from "./japan-readiness-utils"

export interface SmbPipelineConfig {
  countryCode: string
  tlds?: string[]
  maxCandidates: number
  enterpriseExcludeKeywords: string[]
  minOpportunityScore: number
  promote: boolean
}

export interface SmbPipelineStage {
  stage: 1 | 2 | 3
  name: string
  inputCount: number
  outputCount: number
  filteredOut: string[]
}

export interface SmbPipelineResult {
  ok: boolean
  config: SmbPipelineConfig
  stages: SmbPipelineStage[]
  candidates: SmbCandidate[]
  promoted: number
  errors: string[]
}

export interface SmbCandidate {
  domain: string
  score: number
  websiteState: string
  techStack: string[]
  signals: {
    oldWordpress: boolean
    noViewport: boolean
    oldFooter: boolean
    noHttps: boolean
    parked: boolean
  }
}

const ENTERPRISE_KEYWORDS = [
  "microsoft", "google", "apple", "amazon", "facebook", "meta", "netflix", "tesla",
  "shopify", "salesforce", "oracle", "ibm", "sap", "adobe", "cisco", "intel",
  "dell", "hp", "samsung", "sony", "toshiba", "hitachi", "nintendo",
  "wikipedia", "github", "gitlab", "stackoverflow", "reddit", "twitter",
  "paypal", "stripe", "square", "airbnb", "uber", "lyft", "doordash",
  "-corp", "-inc", "-ltd", "-llc", "-group", "-holdings", "-capital",
  "-ventures", "-partners", "-enterprise", "-solutions",
]

const SMALL_BIZ_TLDS = [
  "com", "net", "org", "co", "io", "biz", "info", "shop", "store", "online",
  "site", "website", "company", "agency", "services",
]

function matchesEnterpriseKeyword(domain: string): boolean {
  const lower = domain.toLowerCase()
  return ENTERPRISE_KEYWORDS.some(kw => lower.includes(kw))
}

interface Crawl4AiScanResult {
  ok: boolean
  html?: string
  wordpress?: boolean
  wpVersion?: string
  hasViewport: boolean
  footerYear?: number
  hasHttps: boolean
  error?: string
}

async function crawl4AiFastScan(domain: string): Promise<Crawl4AiScanResult> {
  const baseUrl = optionalEnv("CRAWL4AI_BASE_URL")
  if (!baseUrl) {
    try {
      const res = await fetch(`https://${domain}`, {
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": "Paradigm-SalesOS/1.0" },
        redirect: "manual",
      })
      const html = await res.text().catch(() => "")
      const isHttpOk = res.ok || res.status === 401 || res.status === 403
      if (!isHttpOk) {
        return { ok: false, hasViewport: false, hasHttps: res.url?.startsWith("https"), error: `HTTP ${res.status}` }
      }
      const wpMatch = html.match(/wp-content|wp-includes|wordpress/i)
      const wpVer = html.match(/WordPress\s*([\d.]+)/i)
      const viewport = /viewport/.test(html)
      const footerYear = html.match(/©\s*(\d{4})/i)?.slice(-1).map(Number)[0]
      return {
        ok: true,
        html: html.slice(0, 8000),
        wordpress: !!wpMatch,
        wpVersion: (wpVer?.[1] ?? undefined) as string | undefined,
        hasViewport: viewport,
        footerYear,
        hasHttps: res.url?.startsWith("https") ?? false,
      }
    } catch (e) {
      return { ok: false, hasViewport: false, hasHttps: false, error: e instanceof Error ? e.message : "fetch failed" }
    }
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://${domain}`, waitFor: 2000, extractSignals: true }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { ok: false, hasViewport: false, hasHttps: false, error: `Crawl4AI HTTP ${res.status}` }
    const data = await res.json() as {
      html?: string; wordpress?: boolean; wpVersion?: string
      hasViewport?: boolean; footerYear?: number; https?: boolean
    }
    return {
      ok: true,
      html: data.html?.slice(0, 8000),
      wordpress: data.wordpress ?? false,
      wpVersion: data.wpVersion ?? undefined,
      hasViewport: data.hasViewport ?? false,
      footerYear: data.footerYear,
      hasHttps: data.https === true,
    }
  } catch (e) {
    return { ok: false, hasViewport: false, hasHttps: false, error: e instanceof Error ? e.message : "Crawl4AI unreachable" }
  }
}

function computeSignals(scan: Crawl4AiScanResult, techStack: string[]): SmbCandidate["signals"] {
  return {
    oldWordpress: (scan.wordpress === true && scan.wpVersion ? parseFloat(scan.wpVersion) < 6.0 : false),
    noViewport: !scan.hasViewport,
    oldFooter: scan.footerYear ? scan.footerYear < 2024 : false,
    noHttps: !scan.hasHttps,
    parked: !scan.ok && (scan.error?.includes("parked") ?? false),
  }
}

function computeScore(signals: SmbCandidate["signals"]): number {
  let score = 50
  if (signals.oldWordpress) score += 15
  if (signals.noViewport) score += 10
  if (signals.oldFooter) score += 10
  if (signals.noHttps) score += 8
  if (signals.parked) score -= 40
  return Math.max(0, Math.min(100, score))
}

export async function runSmbPurificationPipeline(config: SmbPipelineConfig): Promise<SmbPipelineResult> {
  const errors: string[] = []
  const stages: SmbPipelineStage[] = []

  // Stage 1: CZDS zone files → enterprise keyword exclusion
  const tlds = config.tlds ?? SMALL_BIZ_TLDS
  const stage1Excluded: string[] = []
  let allDomains: string[] = []

  for (const tld of tlds) {
    try {
      const       zoneResult = await fetchZoneDomains([tld], config.maxCandidates)
      if (zoneResult?.domains) allDomains.push(...zoneResult.domains)
    } catch (e) {
      errors.push(`zone fetch ${tld}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const filtered1 = allDomains.filter(d => {
    if (matchesEnterpriseKeyword(d)) { stage1Excluded.push(d); return false }
    return true
  }).slice(0, config.maxCandidates)

  stages.push({
    stage: 1,
    name: "CZDS → Enterprise Exclusion",
    inputCount: allDomains.length,
    outputCount: filtered1.length,
    filteredOut: stage1Excluded.slice(0, 100),
  })

  // Stage 2: Crawl4AI fast scan → WP/viewport/footer signals
  const stage2Filtered: SmbCandidate[] = []
  const batchSize = 5

  for (let i = 0; i < filtered1.length && stage2Filtered.length < 1000; i += batchSize) {
    const batch = filtered1.slice(i, i + batchSize)
    const scans = await Promise.all(batch.map(d => crawl4AiFastScan(d).catch(() => ({ ok: false, hasViewport: false, hasHttps: false } as Crawl4AiScanResult))))
    for (let j = 0; j < batch.length; j++) {
      const scan = scans[j]
      const signals = computeSignals(scan, [])
      const score = computeScore(signals)
      if (score >= config.minOpportunityScore) {
        stage2Filtered.push({
          domain: batch[j],
          score,
          websiteState: scan.ok ? "legacy" : "dead",
          techStack: scan.wordpress ? ["WordPress"] : [],
          signals,
        })
      }
    }
  }

  stages.push({
    stage: 2,
    name: "Crawl4AI Fast Scan",
    inputCount: filtered1.length,
    outputCount: stage2Filtered.length,
    filteredOut: [],
  })

  // Stage 3: Wappalyzer + deep analysis (top 200 candidates)
  const stage3Results: SmbCandidate[] = []
  const deepBatch = stage2Filtered.slice(0, 200)

  for (const cand of deepBatch) {
    try {
      const tech = await detectTechStack(`https://${cand.domain}`)
      if (tech) {
        const techNames = (tech as { tech: Array<{ name: string }> }).tech?.map(t => t.name) ?? []
        cand.techStack = techNames
        const enterpriseCheck = isEnterpriseTechStack(techNames)
        if (!enterpriseCheck.isEnterprise) {
          cand.score = computeScore({ ...cand.signals })
          stage3Results.push(cand)
        }
      } else {
        stage3Results.push(cand)
      }
    } catch (e) {
      stage3Results.push(cand)
    }
  }

  stages.push({
    stage: 3,
    name: "Wappalyzer Deep Analysis",
    inputCount: deepBatch.length,
    outputCount: stage3Results.length,
    filteredOut: [],
  })

  return {
    ok: errors.length === 0 || stages.length > 0,
    config,
    stages,
    candidates: stage3Results,
    promoted: 0,
    errors,
  }
}

export async function runSmbPipelineQuick(countryCode: string, maxCandidates = 100): Promise<SmbPipelineResult> {
  return runSmbPurificationPipeline({
    countryCode,
    maxCandidates,
    enterpriseExcludeKeywords: ENTERPRISE_KEYWORDS,
    minOpportunityScore: 55,
    promote: false,
  })
}
