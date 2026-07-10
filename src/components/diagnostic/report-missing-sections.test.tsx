import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { buildDemoData } from "@/lib/sales/demo-data"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import {
  OutreachFunnelSection,
  OutreachTestSection,
  SubsidyTableSection,
  VideoFlowSection,
} from "./report-missing-sections"

function reportWithMeta(meta: Record<string, unknown>): DiagnosticReportData {
  return {
    ...buildDemoData("outreach", "en"),
    meta,
    contactFormUrl: null,
  }
}

describe("diagnostic missing-section evidence boundaries", () => {
  it("shows unknown states instead of unsupported fixed claims", () => {
    const data = reportWithMeta({})
    const video = renderToStaticMarkup(<VideoFlowSection data={data} lang="en" />)
    const subsidy = renderToStaticMarkup(<SubsidyTableSection data={data} lang="en" />)
    const outreach = renderToStaticMarkup(<OutreachFunnelSection data={data} lang="en" />)
    const form = renderToStaticMarkup(<OutreachTestSection data={data} lang="en" />)

    expect(video).toContain("Not measured")
    expect(video).not.toMatch(/30min|1 day|3 days|Same day/)

    expect(subsidy).toContain("No verified grant data")
    expect(subsidy).not.toMatch(/Manufacturing Subsidy|Biz Restructuring Grant|IT Adoption Subsidy|68%/)

    expect(outreach).toContain("Response-time impact: Not measured")
    expect(outreach).not.toMatch(/58|47hrs|Est\. 12|21%|3min/)

    expect(form).toContain("Form analysis")
    expect(form).toContain("Not measured")
    expect(form).not.toContain("Manual check needed")
    expect(form).not.toContain("Pending approval")
  })

  it("renders measurements only when their explicit meta fields exist", () => {
    const data = reportWithMeta({
      video_production_flow: {
        discovery_duration: "45 minutes",
        planning_duration: "2 business days",
        production_duration: "5 business days",
        delivery_duration: "After approval",
      },
      subsidy_analysis: {
        programs: [{
          name: "Verified Growth Grant",
          max_amount: "$25,000",
          deadline: "2026-09-30",
          eligibility: "manual_review",
        }],
        support_success_rate: "7 of 10 recorded cases",
      },
      outreach_funnel: {
        inquiries: { value: "14/month", percentage: "100%" },
        auto_reply: { value: "9/month", percentage: "64%" },
        sales_reply: { value: "6/month", percentage: "43%" },
        conversations: { value: "3/month", percentage: "21.4%" },
        current_response_time: "9 hours",
        target_response_time: "20 minutes",
      },
      form_test: {
        form_detected: true,
        analysis_completed: true,
        captcha_status: "manual_review",
        send_test_status: false,
      },
    })

    const video = renderToStaticMarkup(<VideoFlowSection data={data} lang="en" />)
    const subsidy = renderToStaticMarkup(<SubsidyTableSection data={data} lang="en" />)
    const outreach = renderToStaticMarkup(<OutreachFunnelSection data={data} lang="en" />)
    const form = renderToStaticMarkup(<OutreachTestSection data={data} lang="en" />)

    expect(video).toContain("45 minutes")
    expect(video).toContain("After approval")
    expect(subsidy).toContain("Verified Growth Grant")
    expect(subsidy).toContain("7 of 10 recorded cases")
    expect(outreach).toContain("14/month")
    expect(outreach).toContain("Recorded response-time comparison: 9 hours → 20 minutes")
    expect(form).toContain("manual review")
    expect(form).toContain("Not completed")
  })
})
