import { describe, expect, it } from "vitest"
import { isContactAttemptLog } from "./activity"

describe("isContactAttemptLog", () => {
  it("counts only actual or possible submit attempts for dedup", () => {
    expect(isContactAttemptLog({ kind: "form_outreach", outreach_stage: "submitted" }, "success")).toBe(true)
    expect(isContactAttemptLog({ kind: "form_outreach", outreach_stage: "submit_uncertain" }, "follow_up")).toBe(true)
    expect(isContactAttemptLog({ kind: "form_outreach", outcome: "submitted" }, "success")).toBe(true)
    expect(isContactAttemptLog({ kind: "form_outreach", outcome: "uncertain" }, "follow_up")).toBe(true)
  })

  it("does not count review, classification, or preflight stops as contacted", () => {
    expect(isContactAttemptLog({ kind: "form_outreach", outreach_stage: "manual_queue" }, "follow_up")).toBe(false)
    expect(isContactAttemptLog({ kind: "form_outreach", outreach_stage: "classified_skip" }, "declined")).toBe(false)
    expect(isContactAttemptLog({ kind: "form_outreach", outreach_stage: "preflight_failed" }, "declined")).toBe(false)
    expect(isContactAttemptLog({ kind: "other", outreach_stage: "submitted" }, "success")).toBe(false)
  })
})
