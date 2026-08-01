import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { buildDemoData } from "@/lib/sales/demo-data"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import {
  buildFirstImpressionSignals,
  buildJapanMarketMetrics,
  buildJapanRequirementChecks,
  buildPageSpeedComparison,
  buildSecurityChecks,
  parseExplicitPositiveAmount,
} from "./report-evidence"
import { SaviorPositioning } from "./report-pain-sections"
import { ReportExecutiveSummary } from "./ReportExecutiveSummary"
import ReportDarkSurface from "./ReportDarkSurface"
import { ReportScoreOverview } from "./ReportScoreOverview"
import { REPORT_COPY } from "./report-copy"

function reportWithMeta(meta: Record<string, unknown>): DiagnosticReportData {
  return {
    ...buildDemoData("japan_entry", "en"),
    meta,
  }
}

describe("diagnostic evidence boundaries", () => {
  it("keeps missing or zero loss values unknown", () => {
    expect(parseExplicitPositiveAmount("Not estimated")).toBeNull()
    expect(parseExplicitPositiveAmount("¥0")).toBeNull()
    expect(parseExplicitPositiveAmount(0)).toBeNull()
    expect(parseExplicitPositiveAmount("$12,500")).toBe(12_500)
  })

  it("requires an explicit sourced PageSpeed target before comparing", () => {
    expect(buildPageSpeedComparison(reportWithMeta({
      scan: { mobile_score: 38 },
    }))).toBeNull()

    expect(buildPageSpeedComparison(reportWithMeta({
      scan: { mobile_score: 38 },
      report_benchmarks: {
        pagespeed_mobile: { value: 75, source: "Published benchmark URL" },
      },
    }))).toEqual({
      measuredScore: 38,
      targetScore: 75,
      source: "Published benchmark URL",
    })
  })

  it("keeps missing security evidence unknown instead of passing it", () => {
    const checks = buildSecurityChecks(reportWithMeta({ dns: {} }))

    expect(checks.map((check) => check.status)).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ])
    expect(checks.find((check) => check.labelEn === "HSTS Preload")?.detailEn).toBe(
      "Not measured",
    )
  })

  it("uses only explicit security measurements for pass or fail", () => {
    const checks = buildSecurityChecks(reportWithMeta({
      ssl: { grade: "A" },
      hsts_preload: { preloaded: true },
      dns: { dnssec: false },
      mozilla_observatory: { score: 0 },
      security_headers: { hasCsp: false },
    }))

    expect(checks.map((check) => check.status)).toEqual([
      "pass",
      "pass",
      "fail",
      "fail",
      "fail",
    ])
  })

  it("reads the nested Japan audit schema and never treats a missing audit as ready", () => {
    const missing = buildJapanRequirementChecks(reportWithMeta({}))
    expect(missing.every((check) => check.status === "unknown")).toBe(true)

    const measured = buildJapanRequirementChecks(reportWithMeta({
      japan_market_audit: {
        status: {
          tokushoho_missing: false,
          appi_missing: true,
          local_payments_missing: false,
        },
      },
    }))
    expect(measured.map((check) => check.status)).toEqual([
      "pass",
      "fail",
      "pass",
      "unknown",
    ])
  })

  it("does not derive private traffic or revenue from free public signals", () => {
    const withoutModel = buildJapanMarketMetrics(reportWithMeta({
      similarweb_free: {
        estimatedMonthlyVisits: 100_000,
        topCountries: ["US", "JP"],
      },
    }), "en")

    expect(withoutModel[0]?.value).toBe("Not measured")
    expect(withoutModel[1]?.value).toBe("Not measured")
    expect(withoutModel[3]?.value).toBe("Not publicly disclosed")
    expect(JSON.stringify(withoutModel)).not.toMatch(/100,000|8%|2%|15,000/)

    const withPublicSignals = buildJapanMarketMetrics(reportWithMeta({
      smb_signals: {
        marketVisibility: {
          index: 72,
          band: "top-1m",
          bestRank: 120_000,
          countrySignals: [{ countryCode: "GB", signal: "ccTLD", value: ".uk" }],
        },
      },
    }), "en")
    expect(withPublicSignals[0]?.value).toBe("Public visibility 72/100")
    expect(withPublicSignals[1]?.value).toBe("Market signals: GB")
    expect(withPublicSignals[3]?.value).toBe("Not publicly disclosed")
  })

  it("does not infer healthy first-impression signals from missing acts or metadata", () => {
    const unknown = buildFirstImpressionSignals(reportWithMeta({}), "en")
    expect(unknown.every((signal) => signal.status === "unknown")).toBe(true)

    const measured = buildFirstImpressionSignals(reportWithMeta({
      scan: { mobile_score: 38, hasOgp: true },
      ssl: { grade: "A+" },
    }), "en")
    expect(measured.map((signal) => signal.status)).toEqual(["issue", "pass", "pass"])
  })

  it("describes remediation scope without fixed outcome or same-day promises", () => {
    const html = renderToStaticMarkup(
      <SaviorPositioning data={reportWithMeta({})} lang="en" />,
    )

    expect(html).toContain("Potential remediation scope")
    expect(html).toContain("acceptance checks")
    expect(html).not.toMatch(/85\+|A\+ grade|Same-day|We solve all/i)
  })

  it("does not present missing loss or confidence as zero", () => {
    const data = reportWithMeta({})
    const summary = renderToStaticMarkup(
      <ReportExecutiveSummary
        lang="en"
        companyName={data.company_name}
        reportLabel="Diagnostic"
        businessImpact="Evidence review"
        firstAction="Collect the missing evidence"
        sourceScore={0}
        findingsCount={data.acts.length}
      />,
    )
    expect(summary).not.toContain("Monthly Loss")
    expect(summary).not.toContain("Confidence")
    expect(summary).not.toContain("$0")

    const surface = renderToStaticMarkup(
      <ReportDarkSurface
        data={data}
        copy={REPORT_COPY.en}
        confidence={null}
        monthlyLoss={null}
        lang="en"
        sourceScore={0}
      />,
    )
    expect(surface.match(/Not measured/g)?.length).toBeGreaterThanOrEqual(2)
    expect(surface).not.toContain("$0")

    const overview = renderToStaticMarkup(
      <ReportScoreOverview data={data} lang="en" confidence={null} sourceScore={0} />,
    )
    expect(overview).not.toContain("Industry Avg")
    expect(overview).not.toContain("Standard")
  })
})
