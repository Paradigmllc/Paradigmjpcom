import { describe, expect, it } from "vitest"
import { isHighConfidenceAutoPromotionItem } from "./lead-candidate-high-confidence-runner"
import type { ReviewItemRow } from "./lead-candidate-review-gate"

function item(gatePatch: Record<string, unknown>): ReviewItemRow {
  const formUrl = "https://example.com/contact"
  return {
    id: "item-1",
    run_id: "run-1",
    candidate_id: "candidate-1",
    source_config_id: "source-1",
    source_record_id: "record-1",
    domain: "example.com",
    company_name: "Example",
    source_page_url: "https://source.example/company",
    status: "awaiting_review",
    quality_status: "passed",
    opportunity_score: 88,
    form_url: formUrl,
    form_verified: true,
    form_checked_at: "2026-07-15T00:00:00.000Z",
    review_status: "pending",
    promotion_attempts: 0,
    meta: {
      promotion_snapshot: {
        sourceRecord: {
          company_name: "Example",
          source_page_url: "https://source.example/company",
          source: { trust_tier: 3 },
        },
        qualityGate: {
          status: "passed",
          smb: { passed: true, score: 98, evidence: ["official_sme_flag:SBIR"] },
          ...gatePatch,
        },
        score: { opportunityScore: 88, smbScore: 90 },
        detections: [],
        form: {
          formUrl,
          verification: "form",
          confidence: 96,
          inspection: { status: "form", fields: ["email", "message", "submit"] },
        },
        countryCode: "US",
        techMatched: true,
        verifiedAt: "2026-07-15T00:00:00.000Z",
      },
    },
  }
}

describe("high-confidence Twenty promotion selection", () => {
  it("accepts objective Tier 3 SMB evidence", () => {
    expect(isHighConfidenceAutoPromotionItem(item({}))).toBe(true)
  })

  it("accepts grounded DeepSeek V4 Pro decisions at 96 percent or higher", () => {
    expect(isHighConfidenceAutoPromotionItem(item({
      smb: { passed: true, score: 90, evidence: ["deepseek_v4_pro:11-50:98"] },
      aiReview: { passed: true, confidence: 0.98, evidenceQuotes: ["quote one", "quote two"], riskFlags: [] },
    }))).toBe(true)
  })

  it("rejects AI decisions below the confidence floor or with risk flags", () => {
    expect(isHighConfidenceAutoPromotionItem(item({
      smb: { passed: true, score: 90, evidence: ["deepseek_v4_pro:11-50:95"] },
      aiReview: { passed: true, confidence: 0.95, evidenceQuotes: ["quote one", "quote two"], riskFlags: [] },
    }))).toBe(false)
    expect(isHighConfidenceAutoPromotionItem(item({
      smb: { passed: true, score: 90, evidence: ["deepseek_v4_pro:11-50:99"] },
      aiReview: { passed: true, confidence: 0.99, evidenceQuotes: ["quote one", "quote two"], riskFlags: ["size uncertain"] },
    }))).toBe(false)
  })
})
