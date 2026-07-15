import { describe, expect, it } from "vitest"
import { pilotReviewEvidence } from "./lead-candidate-review"

describe("pilotReviewEvidence", () => {
  it("requires review only for candidates that actually reached human review", () => {
    expect(pilotReviewEvidence({ formsQualifiedCount: 4, reviewableCount: 1 })).toEqual({
      hasReviewableQualifiedForm: true,
      requiredReviews: 1,
    })
  })

  it("does not treat automatically rejected forms as reviewable pilot evidence", () => {
    expect(pilotReviewEvidence({ formsQualifiedCount: 4, reviewableCount: 0 })).toEqual({
      hasReviewableQualifiedForm: false,
      requiredReviews: 0,
    })
  })

  it("caps the human review sample at three candidates", () => {
    expect(pilotReviewEvidence({ formsQualifiedCount: 7, reviewableCount: 5 })).toEqual({
      hasReviewableQualifiedForm: true,
      requiredReviews: 3,
    })
  })
})
