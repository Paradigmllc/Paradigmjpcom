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
