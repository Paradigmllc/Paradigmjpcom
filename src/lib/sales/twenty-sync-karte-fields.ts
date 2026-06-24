import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"

export function outreachGateSummary(karte: CompanyKarteSnapshot): { label: string; detail: string; nextAction: string } {
  const blockers: string[] = []
  const warnings: string[] = []
  if (!karte.reportUrl) blockers.push("diagnostic report URL missing")
  if (!karte.formUrl) warnings.push("form URL missing")
  if (!karte.industry) warnings.push("industry not normalized")
  if (karte.errorCount > 0) warnings.push(`${karte.errorCount} source error(s)`)
  if (!karte.diagnosisSummary && karte.sourceScore < 20) warnings.push(`low evidence coverage (${karte.sourceScore}%)`)

  if (blockers.length > 0) {
    return {
      label: "blocked",
      detail: blockers.join(" / "),
      nextAction: "Generate a diagnostic report, then sync this company to Twenty again.",
    }
  }
  if (warnings.length > 0) {
    return {
      label: "review_required",
      detail: warnings.join(" / "),
      nextAction: karte.formUrl ? "Review copy and evidence before first-5 approval." : "Discover the form URL with Crawl4AI/Crawlee/Stagehand.",
    }
  }
  return {
    label: "send_ready",
    detail: "Report URL, form URL, and evidence are present.",
    nextAction: "Run dry-run, then move to first-5 approval.",
  }
}

export function sourceDataStatus(karte: CompanyKarteSnapshot): string {
  const gate = outreachGateSummary(karte)
  return `${gate.label}: ${gate.detail}`
}

export function sourceDataCounts(karte: CompanyKarteSnapshot): string {
  const total = karte.sourceItems.length || karte.collectedCount + karte.configuredCount + karte.missingCount + karte.errorCount
  const collectedLabels = karte.sourceItems
    .filter((source) => source.status === "collected")
    .slice(0, 5)
    .map((source) => source.label)
    .join(", ")
  const prefix = `${total}+ API/OSS catalog`
  const counts = `collected ${karte.collectedCount}/${total} / configured ${karte.configuredCount} / missing ${karte.missingCount} / error ${karte.errorCount}`
  return collectedLabels ? `${prefix}: ${counts}; evidence: ${collectedLabels}` : `${prefix}: ${counts}`
}

export function firstSourceError(karte: CompanyKarteSnapshot): string | null {
  const item = karte.sourceItems.find((source) => source.status === "error")
  return item ? `${item.label}: ${item.detail}`.slice(0, 500) : null
}

// Phase 7-1: per-category breakdown so the 50+ API/OSS catalog is visible in Twenty,
// not just an aggregate count. Shows collected/total (+errors) for each source category.
export function sourceCategoryBreakdown(karte: CompanyKarteSnapshot): string {
  const categories = ["analysis", "list", "outreach", "orchestration", "demo", "video", "post_outreach", "asset"] as const
  const items = karte.sourceItems
  const parts = categories
    .map((cat) => {
      const inCat = items.filter((s) => s.category === cat)
      if (inCat.length === 0) return null
      const collected = inCat.filter((s) => s.status === "collected").length
      const error = inCat.filter((s) => s.status === "error").length
      return `${cat} ${collected}/${inCat.length}${error > 0 ? ` (err ${error})` : ""}`
    })
    .filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(" / ") : "no source data"
}

// Phase 7-2: deep link to the Twenty Sales OS source-coverage panel for per-source detail
// (the full 50+ catalog with status/meaning/nextStep is shown in the dashboard).
export function sourceCoveragePanelLink(karte: CompanyKarteSnapshot): string {
  const base = (process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://paradigmjp.com").replace(/\/+$/, "")
  const q = encodeURIComponent(karte.companyName ?? "")
  return `${base}/ja/admin/sales?q=${q}`
}
