import { describe, expect, it } from "vitest"
import { manualCompanyEvidenceRejectionReason } from "./manual-company-evidence-policy"

type Evidence = Parameters<typeof manualCompanyEvidenceRejectionReason>[0]

function evidence(overrides: Partial<Evidence>): Evidence {
  return {
    companyName: "Example",
    productContext: "A customer analytics workflow for software teams",
    businessModel: "saas",
    sourceUrl: "https://example.com/",
    title: "Example analytics",
    description: "Customer analytics for software teams",
    headings: ["Understand product use"],
    productNames: ["Example Analytics"],
    evidenceMode: "direct_html",
    audit: {
      status: {},
      signals: {},
      pages_checked: ["https://example.com/"],
    },
    ...overrides,
  } as unknown as Evidence
}

describe("manual work company evidence policy", () => {
  it.each([
    "References to any specific company, product or services on this site are not controlled by GoDaddy.com",
    "Die Domain ist zwar bereits registriert, aber vielleicht noch erhältlich.",
    "This domain name is for sale. Buy this domain.",
  ])("rejects parked or for-sale domains before copy, report, and Twenty promotion", (text) => {
    expect(manualCompanyEvidenceRejectionReason(evidence({ productContext: text }))).toContain("駐車・販売・初期設定ページ")
  })

  it("does not reject a real public product page", () => {
    expect(manualCompanyEvidenceRejectionReason(evidence({}))).toBeNull()
  })
})
