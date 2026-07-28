import { describe, expect, it } from "vitest"
import { isManualWorkRecoveryAvailable } from "./manual-work-recovery-policy"

describe("manual work recovery policy", () => {
  it("allows an interrupted processing row explicitly marked retry-required", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "processing",
      twenty_sync_status: "skipped",
      message_review: { generation_status: "retry_required" },
    })).toBe(true)
  })

  it("does not expose recovery for a healthy in-flight processing row", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "processing",
      twenty_sync_status: "not_started",
      message_review: {},
    })).toBe(false)
  })

  it("allows a non-Japanese fast qualification row to promote to full analysis", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "needs_review",
      twenty_sync_status: "skipped",
      is_japanese_company: false,
      evidence: { analysis_mode: "fast_qualification" },
      message_review: { purpose: "fast_qualification", generation_status: "deferred" },
    })).toBe(true)
  })

  it("does not promote a Japanese fast qualification row", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "rejected",
      twenty_sync_status: "skipped",
      is_japanese_company: true,
      evidence: { analysis_mode: "fast_qualification" },
      message_review: { purpose: "fast_qualification" },
    })).toBe(false)
  })
})
