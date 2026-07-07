/**
 * Reconciliation Engine — diffs passive (archive) vs live (re-fetch) Wappalyzer results.
 *
 * Two-pass double verification:
 *   Pass 1 (broad): BigQuery/Common Crawl → offline tech detection
 *   Pass 2 (verify): live Wappalyzer re-fetch → compare & compute confidence delta
 *
 * 2026-07-06: Implemented to close the reconciliation gap.
 */

import type { TechItem } from "./sources/wappalyzer"
import type { HttpArchiveTech } from "./sources/http-archive-bigquery"

// ─── Core reconciliation result ───

export interface ReconciliationResult {
  /** Tech present in BOTH passes — confirmed */
  confirmed: TechItem[]
  /** Tech in passive but NOT in live → site may have been updated */
  gone: TechItem[]
  /** Tech in live but NOT in passive → new additions */
  new: TechItem[]
  /** How many passive detections were confirmed live */
  confirmationRate: number
  /** Confidence adjustment factor (0-1): how much to trust passive evidence */
  confidenceDelta: number
  /** Site was likely updated between passes */
  siteWasUpdated: boolean
  /** Summary for logging */
  summary: string
}

// ─── Category importance weights (some categories mean more for SMB scoring) ───

const CATEGORY_WEIGHTS: Record<string, number> = {
  CMS: 1.5,
  Ecommerce: 1.3,
  "JavaScript Frameworks": 1.1,
  "JavaScript Libraries": 0.8,
  "UI Frameworks": 0.8,
  Analytics: 0.5,
  CDN: 0.3,
  "Font Scripts": 0.2,
}

function categoryWeight(category: string): number {
  return CATEGORY_WEIGHTS[category] ?? 0.7
}

// ─── Main reconciliation function ───

export function reconcileTechDetections(
  passive: TechItem[],
  live: TechItem[],
  options: { passiveLabel?: string; liveLabel?: string } = {},
): ReconciliationResult {
  const passiveLabel = options.passiveLabel ?? "passive"
  const liveLabel = options.liveLabel ?? "live"

  const passiveNames = new Map(passive.map((t) => [normalizeTechKey(t.name, t.category), t]))
  const liveNames = new Map(live.map((t) => [normalizeTechKey(t.name, t.category), t]))

  const confirmed: TechItem[] = []
  const gone: TechItem[] = []
  const new_: TechItem[] = []

  for (const t of passive) {
    const key = normalizeTechKey(t.name, t.category)
    if (liveNames.has(key)) {
      confirmed.push(t)
    } else {
      gone.push(t)
    }
  }

  for (const t of live) {
    const key = normalizeTechKey(t.name, t.category)
    if (!passiveNames.has(key)) {
      new_.push(t)
    }
  }

  const passiveKeyCount = passiveNames.size
  const confirmationRate = passiveKeyCount > 0 ? confirmed.length / passiveKeyCount : 1

  // Confidence delta: weighted by category importance
  const passiveWeight = passive.reduce((sum, t) => sum + (t.confidence ?? 50) * categoryWeight(t.category), 0)
  const goneWeight = gone.reduce((sum, t) => sum + (t.confidence ?? 50) * categoryWeight(t.category), 0)
  const newWeight = new_.reduce((sum, t) => sum + (t.confidence ?? 50) * categoryWeight(t.category), 0)

  const totalWeight = passiveWeight + newWeight
  const confidenceDelta = totalWeight > 0 ? (passiveWeight - goneWeight + newWeight) / totalWeight : 0.5

  const siteWasUpdated = gone.length >= 2 || (gone.length === 1 && gone[0].category === "CMS")

  const summary = [
    `${passive.length}${passiveLabel} → ${live.length}${liveLabel}`,
    `${confirmed.length} confirmed, ${gone.length} gone, ${new_.length} new`,
    `confRate=${(confirmationRate * 100).toFixed(0)}%`,
    `delta=${(confidenceDelta * 100).toFixed(0)}%`,
    siteWasUpdated ? "SITE_UPDATED" : "stable",
  ].join(" ")

  return {
    confirmed,
    gone,
    new: new_,
    confirmationRate,
    confidenceDelta,
    siteWasUpdated,
    summary,
  }
}

// ─── Reconciliation with HTTP Archive BigQuery data ───

export function reconcileBigQueryToLive(
  bigQueryTechs: HttpArchiveTech[],
  liveTechs: TechItem[],
  snapshotMonth: string,
): ReconciliationResult & { snapshotAgeDays: number; needsReVerification: boolean } {
  const passive = bigQueryTechs.map((t) => ({
    name: t.name,
    category: t.category,
    confidence: t.confidence,
    evidence: ["html"] as Array<"html" | "script" | "meta" | "header" | "cookie">,
  }))

  const result = reconcileTechDetections(passive, liveTechs, {
    passiveLabel: "bigquery",
    liveLabel: "live",
  })

  // Freshness from HTTP Archive snapshot age
  const match = snapshotMonth.match(/^(\d{4})_(\d{2})_(\d{2})/)
  let snapshotAgeDays = 90
  if (match) {
    const snapDate = new Date(`${match[1]}-${match[2]}-${match[3]}`)
    const diffMs = Date.now() - snapDate.getTime()
    snapshotAgeDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
  }

  return {
    ...result,
    snapshotAgeDays,
    needsReVerification: snapshotAgeDays > 14 || result.siteWasUpdated,
  }
}

// ─── Adjust candidate score based on reconciliation ───

export interface ReconciliationScoreAdjustment {
  /** Adjusted freshness score (overrides the default lane constant) */
  freshnessScore: number
  /** Adjusted confidence level for the overall candidate */
  confidenceMultiplier: number
  /** Whether this candidate should be prioritized for live re-verification */
  prioritizeReVerify: boolean
}

export function computeReconciliationScoreAdjustment(
  result: ReconciliationResult & { snapshotAgeDays?: number },
): ReconciliationScoreAdjustment {
  const ageDays = result.snapshotAgeDays ?? 90

  // Freshness degrades with snapshot age, boosted by high confirmation rate
  const baseFreshness =
    ageDays <= 14 ? 95
    : ageDays <= 30 ? 80
    : ageDays <= 60 ? 55
    : ageDays <= 90 ? 30
    : 10

  // Confirmation rate adjusts freshness: high conf = trust more, low conf = penalize
  const freshnessScore = Math.round(baseFreshness * (0.5 + result.confirmationRate * 0.5))

  // Confidence multiplier: high conf rate = data is trustworthy, low = suspect
  const confidenceMultiplier = 0.5 + result.confirmationRate * 0.5

  // Prioritize re-verification when: snapshot old, or confirmation rate low, or site updated
  const prioritizeReVerify =
    (ageDays > 30) ||
    result.confirmationRate < 0.6 ||
    (result as ReconciliationResult).siteWasUpdated === true

  return { freshnessScore, confidenceMultiplier, prioritizeReVerify }
}

// ─── Helpers ───

function normalizeTechKey(name: string, category: string): string {
  return `${name.toLowerCase().replace(/[\s.-]/g, "_")}:${category.toLowerCase().replace(/[\s.-]/g, "_")}`
}
