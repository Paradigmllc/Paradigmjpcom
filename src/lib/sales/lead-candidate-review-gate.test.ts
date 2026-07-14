import { describe, expect, it } from "vitest"
import { promotionEligibilityReason, type ReviewItemRow } from "./lead-candidate-review-gate"

const NOW = Date.parse("2026-07-14T12:00:00.000Z")
const RECENT = "2026-07-14T10:00:00.000Z"

function item(patch: Partial<ReviewItemRow> = {}): ReviewItemRow {
  const formUrl = patch.form_url ?? "https://example.com/contact"
  return {
    id: "item-1",
    run_id: "run-1",
    candidate_id: "candidate-1",
    source_config_id: "source-1",
    source_record_id: "record-1",
    domain: "example.com",
    company_name: "Example LLC",
    source_page_url: "https://directory.example/companies/example",
    status: "awaiting_review",
    quality_status: "passed",
    opportunity_score: 82,
    form_url: formUrl,
    form_verified: true,
    form_checked_at: RECENT,
    review_status: "pending",
    promotion_attempts: 0,
    meta: {
      promotion_snapshot: {
        sourceRecord: {
          company_name: "Example LLC",
          source_page_url: "https://directory.example/companies/example",
        },
        qualityGate: { status: "passed" },
        score: { opportunityScore: 82, smbScore: 74 },
        detections: [],
        form: {
          formUrl,
          verification: "form",
          confidence: 92,
          inspection: { status: "form", fields: ["email", "message", "submit"] },
        },
        countryCode: "US",
        techMatched: true,
        verifiedAt: RECENT,
      },
    },
    ...patch,
  }
}

function reason(candidate: ReviewItemRow): string | null {
  return promotionEligibilityReason({
    item: candidate,
    minOpportunityScore: 68,
    minSmbScore: 50,
    sourceConfig: { active: true, approval_status: "approved" },
    sourceRecord: { active: true, observed_at: RECENT },
    nowMs: NOW,
  })
}

describe("promotionEligibilityReason", () => {
  it("allows only fresh, same-origin, approved evidence", () => {
    expect(reason(item())).toBeNull()
  })

  it("rejects third-party or insecure form URLs", () => {
    expect(reason(item({ form_url: "https://forms.example.net/example" }))).toBe("form_url_not_approved_https_destination")
    expect(reason(item({ form_url: "http://example.com/contact" }))).toBe("form_url_not_approved_https_destination")
  })

  it("allows a verified trusted form provider", () => {
    expect(reason(item({ form_url: "https://company.typeform.com/contact" }))).toBeNull()
  })

  it("rejects stale verification before CRM promotion", () => {
    expect(reason(item({ form_checked_at: "2026-06-01T00:00:00.000Z" }))).toBe("verification_stale")
  })

  it("rejects missing immutable promotion evidence", () => {
    expect(reason(item({ meta: {} }))).toBe("promotion_snapshot_missing")
  })

  it("rejects a form URL changed after verification", () => {
    const candidate = item()
    candidate.form_url = "https://example.com/other-contact"
    expect(reason(candidate)).toBe("form_url_changed_since_verification")
  })

  it("rechecks current thresholds instead of trusting the prior decision", () => {
    const candidate = item()
    expect(promotionEligibilityReason({
      item: candidate,
      minOpportunityScore: 90,
      minSmbScore: 50,
      sourceConfig: { active: true, approval_status: "approved" },
      sourceRecord: { active: true, observed_at: RECENT },
      nowMs: NOW,
    })).toBe("score_below_current_threshold")
  })

  it("fails closed when the source is suspended after verification", () => {
    expect(promotionEligibilityReason({
      item: item(),
      minOpportunityScore: 68,
      minSmbScore: 50,
      sourceConfig: { active: false, approval_status: "suspended" },
      sourceRecord: { active: true, observed_at: RECENT },
      nowMs: NOW,
    })).toBe("source_not_currently_approved")
  })

  it("stops repeated Twenty retries after the bounded attempt limit", () => {
    expect(reason(item({ review_status: "promotion_failed", promotion_attempts: 20 }))).toBe("promotion_attempt_limit_reached")
  })
})
