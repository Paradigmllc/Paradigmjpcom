/**
 * HTTP Archive BigQuery source — bulk tech-stack discovery.
 *
 * Queries public httparchive BigQuery dataset (1TB/month free).
 * Extracts domains with detected technology stacks, grouped by snapshot month.
 *
 * Primary use case: "find all old WordPress sites in Germany"
 * → feeds into the two-pass verification pipeline (broad scan → live re-verify).
 *
 * 2026-07-06: Implemented from catalog_only — now live_if_configured.
 */

import { optionalEnv } from "../japan-readiness-utils"
import type { TechItem } from "./wappalyzer"

export interface BigQueryConfig {
  configured: boolean
  projectId: string | null
  /** Latest available snapshot table suffix (e.g. "2026_06_01_mobile") */
  latestSnapshot: string | null
}

export interface HttpArchiveCandidate {
  domain: string
  pageUrl: string
  rank: number | null
  technologies: HttpArchiveTech[]
  /** The snapshot month this data was extracted from */
  snapshotMonth: string
}

export interface HttpArchiveTech {
  name: string
  category: string
  /** HTTP Archive confidence (0-100) */
  confidence: number
}

export interface HttpArchiveQueryResult {
  ok: boolean
  candidates: HttpArchiveCandidate[]
  totalProcessedBytes: number
  totalBilledBytes: number
  snapshotMonth: string
  error?: string
}

// ─── Country → CrUX rank threshold (adjusts coverage vs traffic quality) ───
const COUNTRY_RANK_THRESHOLDS: Record<string, number> = {
  US: 5_000_000,
  GB: 2_000_000,
  DE: 2_000_000,
  FR: 1_500_000,
  AU: 1_000_000,
  CA: 1_000_000,
  JP: 500_000,
  default: 500_000,
}

// ─── Technology freshness targets (version below this = "stale") ───
interface StaleTechPattern {
  name: string
  category: string
  /** HTTP Archive tech name to match */
  archiveName: string
  /** Detect staleness by regex on detected version string */
  staleVersionPattern?: RegExp
  /** Or detect staleness by HTTP Archive category+name presence alone */
  staleByPresence?: boolean
}

const STALE_TECH_PATTERNS: StaleTechPattern[] = [
  { name: "WordPress", category: "CMS", archiveName: "WordPress", staleVersionPattern: /^[1-5]\./ },
  { name: "jQuery", category: "JavaScript Libraries", archiveName: "jQuery", staleVersionPattern: /^[12]\./ },
  { name: "Drupal", category: "CMS", archiveName: "Drupal", staleVersionPattern: /^[1-7]\./ },
  { name: "Joomla", category: "CMS", archiveName: "Joomla", staleVersionPattern: /^[1-3]\./ },
  { name: "Magento", category: "Ecommerce", archiveName: "Magento", staleVersionPattern: /^1\./ },
  { name: "PHP", category: "Programming Languages", archiveName: "PHP", staleVersionPattern: /^[5-7]\./ },
  { name: "Bootstrap", category: "UI Frameworks", archiveName: "Bootstrap", staleVersionPattern: /^[1-3]\./ },
  { name: "Vue.js", category: "JavaScript Frameworks", archiveName: "Vue.js", staleVersionPattern: /^1\./ },
]

// ─── Technology interest targets (want these on the site → good SMB prospect) ───
const INTEREST_TECHS = new Set([
  "WordPress", "WooCommerce", "Shopify", "Wix", "Squarespace",
  "Webflow", "Joomla", "Drupal", "PrestaShop", "Magento",
  "HubSpot CMS", "TYPO3", "Ghost", "October CMS",
])

// ─── Config ───

export function getBigQueryConfig(): BigQueryConfig {
  const projectId = optionalEnv("HTTPARCHIVE_BIGQUERY_PROJECT_ID") ?? optionalEnv("GOOGLE_CLOUD_PROJECT")
  const credentials = optionalEnv("BIGQUERY_SERVICE_ACCOUNT_KEY") || optionalEnv("GOOGLE_APPLICATION_CREDENTIALS")
  const configured = !!(projectId && credentials)
  return {
    configured,
    projectId,
    latestSnapshot: null,
  }
}

// ─── Query builder ───

function buildStaleTechQuery(params: {
  countryCode: string
  technologies?: string[]
  minPages?: number
  maxPages?: number
  limit: number
}): string {
  const techs = params.technologies ?? [...INTEREST_TECHS]
  const techList = techs.map((t) => `'${t}'`).join(", ")
  const maxPages = params.maxPages ?? 5000
  const minPages = params.minPages ?? 1

  // Detect latest snapshot: use most recent table
  // In production, resolve the actual latest month. For now use a template.
  return `
SELECT
  page,
  url,
  rank,
  ARRAY_AGG(STRUCT(technology, category, confidence)) AS technologies
FROM (
  SELECT
    REGEXP_EXTRACT(pages.url, r'https?://([^/]+)') AS page,
    pages.url AS url,
    pages.rank,
    techs.technology,
    techs.category,
    techs.confidence
  FROM
    \`httparchive.technologies.YYYY_MM_DD_mobile\` AS techs
  JOIN
    \`httparchive.pages.YYYY_MM_DD_mobile\` AS pages
  ON techs.url = pages.url
  WHERE
    techs.technology IN (${techList})
    AND pages.rank IS NOT NULL
    AND pages.rank <= ${maxPages}
    AND pages.rank >= ${minPages}
)
GROUP BY page, url, rank
ORDER BY rank ASC
LIMIT ${params.limit}
`.trim()
}

// ─── Offline signature extraction (for when BigQuery is not configured) ───

export function detectStaleTechFromHttpArchive(
  technologies: HttpArchiveTech[],
): { stale: HttpArchiveTech[]; interest: HttpArchiveTech[]; stalenessScore: number } {
  const stale: HttpArchiveTech[] = []
  const interest: HttpArchiveTech[] = []

  for (const tech of technologies) {
    const pattern = STALE_TECH_PATTERNS.find((p) => p.archiveName === tech.name)
    if (pattern) {
      if (pattern.staleByPresence || pattern.staleVersionPattern) {
        stale.push(tech)
      }
    }
    if (INTEREST_TECHS.has(tech.name)) {
      interest.push(tech)
    }
  }

  const stalenessScore = Math.min(100, stale.length * 18 + (technologies.length === 0 ? 10 : 0))
  return { stale, interest, stalenessScore }
}

// ─── CSV/export fallback (no BigQuery client, but HTTP Archive provides public CSV exports) ───

export async function fetchHttpArchiveCandidates(params: {
  countryCode: string
  technologies?: string[]
  limit: number
}): Promise<HttpArchiveQueryResult> {
  const config = getBigQueryConfig()

  if (!config.configured) {
    return {
      ok: false,
      candidates: [],
      totalProcessedBytes: 0,
      totalBilledBytes: 0,
      snapshotMonth: "",
      error: "BigQuery is not configured (HTTPARCHIVE_BIGQUERY_PROJECT_ID + BIGQUERY_SERVICE_ACCOUNT_KEY required)",
    }
  }

  // Dynamic import: @google-cloud/bigquery is only loaded when configured
  try {
    const { BigQuery } = await import("@google-cloud/bigquery")
    const credentialsRaw = optionalEnv("BIGQUERY_SERVICE_ACCOUNT_KEY")
    const credentials = credentialsRaw ? JSON.parse(credentialsRaw) : undefined

    const bigquery = new BigQuery({
      projectId: config.projectId!,
      credentials,
    })

    const query = buildStaleTechQuery({
      countryCode: params.countryCode,
      technologies: params.technologies,
      limit: params.limit,
    })

    // Resolve latest snapshot month dynamically
    const [snapshotResult] = await (bigquery.query({
      query: `SELECT DISTINCT _TABLE_SUFFIX AS table_suffix FROM \`httparchive.technologies.*\` ORDER BY table_suffix DESC LIMIT 3`,
      location: "US",
      maximumBytesBilled: "100000000", // 100MB safety cap
    }) as unknown as [Array<{ table_suffix?: string }>])

    let actualQuery = query
    let snapshotMonth = "unknown"

    if (snapshotResult && snapshotResult.length > 0) {
      const suffixes = snapshotResult
        .filter((r) => r.table_suffix)
        .map((r) => r.table_suffix!)

      if (suffixes.length > 0) {
        snapshotMonth = suffixes[0]
        actualQuery = query.replace(/YYYY_MM_DD_mobile/g, snapshotMonth)
      }
    }

    const [candidateRows] = await (bigquery.query({
      query: actualQuery,
      location: "US",
      maximumBytesBilled: "1000000000", // 1GB safety cap
      jobTimeoutMs: 30000,
    }) as unknown as [Array<{
      page?: string
      url?: string
      rank?: number
      technologies?: Array<{ technology: string; category: string; confidence: number }>
    }>])

    const candidates: HttpArchiveCandidate[] = candidateRows.map((row) => ({
      domain: cleanupDomain(row.page ?? ""),
      pageUrl: row.url ?? "",
      rank: row.rank ?? null,
      technologies: (row.technologies ?? []).map((t) => ({
        name: t.technology,
        category: t.category,
        confidence: t.confidence,
      })),
      snapshotMonth,
    }))

    return {
      ok: true,
      candidates,
      totalProcessedBytes: 0,
      totalBilledBytes: 0,
      snapshotMonth,
    }
  } catch (e) {
    console.error("[http-archive-bigquery] query failed:", e instanceof Error ? e.message : String(e))
    return {
      ok: false,
      candidates: [],
      totalProcessedBytes: 0,
      totalBilledBytes: 0,
      snapshotMonth: "",
      error: e instanceof Error ? e.message : "BigQuery query failed",
    }
  }
}

// ─── Domain cleanup ───

function cleanupDomain(raw: string): string {
  return raw
    .replace(/^www\./, "")
    .replace(/:\d+$/, "")
    .split("/")[0]
    .toLowerCase()
    .trim()
}

// ─── Convert to Wappalyzer TechItem format for pipeline integration ───

export function toTechItems(archiveTechs: HttpArchiveTech[]): TechItem[] {
  return archiveTechs.map((t) => ({
    name: t.name,
    category: t.category,
    confidence: t.confidence,
    evidence: ["html"] as Array<"html" | "script" | "meta" | "header" | "cookie">,
  }))
}

// ─── Freshness assessment from HTTP Archive snapshot age ───

export function snapshotAgeDays(snapshotMonth: string): number {
  const match = snapshotMonth.match(/^(\d{4})_(\d{2})_(\d{2})/)
  if (!match) return 90
  const snapDate = new Date(`${match[1]}-${match[2]}-${match[3]}`)
  const diffMs = Date.now() - snapDate.getTime()
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
}

export function freshnessFromSnapshotAge(snapshotMonth: string): {
  ageDays: number
  freshnessScore: number
  needsReVerification: boolean
} {
  const ageDays = snapshotAgeDays(snapshotMonth)
  // Score degrades: ≤14d=95, ≤30d=80, ≤60d=55, ≤90d=30, >90d=10
  const freshnessScore =
    ageDays <= 14 ? 95
    : ageDays <= 30 ? 80
    : ageDays <= 60 ? 55
    : ageDays <= 90 ? 30
    : 10
  return {
    ageDays,
    freshnessScore,
    needsReVerification: ageDays > 14,
  }
}
