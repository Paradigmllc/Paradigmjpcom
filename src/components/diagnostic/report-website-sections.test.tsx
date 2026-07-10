import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { buildDemoData } from "@/lib/sales/demo-data"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import { BeforeAfterComparison, MobileComparison } from "./report-website-sections"

function reportWithMeta(
  meta: Record<string, unknown>,
  lang: "ja" | "en" = "en",
): DiagnosticReportData {
  return {
    ...buildDemoData("website_diagnostic", lang),
    demo_url: null,
    screenshot_url: "https://example.com/current-site.png",
    meta,
  }
}

function renderTargets(data: DiagnosticReportData, lang: "ja" | "en"): string {
  return renderToStaticMarkup(
    <div>
      <BeforeAfterComparison data={data} lang={lang} />
      <MobileComparison data={data} lang={lang} />
    </div>,
  )
}

describe("website diagnostic target evidence", () => {
  it("does not invent PageSpeed, SSL, or OGP targets from current measurements", () => {
    const base = buildDemoData("website_diagnostic", "en")
    const html = renderTargets(reportWithMeta(base.meta ?? {}), "en")

    expect(html).toContain("Current vs proposed target")
    expect(html).toContain("Proposed target")
    expect(html.match(/Not set/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).not.toContain("85+")
    expect(html).not.toContain(">A+<")
    expect(html).not.toContain("Configured")
    expect(html).not.toContain("AFTER (Target")
  })

  it("shows localized unset states when no explicit Japanese targets exist", () => {
    const html = renderTargets(reportWithMeta({}, "ja"), "ja")

    expect(html).toContain("現状と提案目標値")
    expect(html).toContain("提案目標値")
    expect(html.match(/未設定/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("renders only targets explicitly supplied in website_targets", () => {
    const html = renderTargets(reportWithMeta({
      website_targets: {
        pagespeed_mobile: 92,
        ssl_grade: "A",
        ogp: true,
      },
    }), "en")

    expect(html).toContain("92/100")
    expect(html).toContain(">A<")
    expect(html).toContain("Included in proposal")
  })
})
