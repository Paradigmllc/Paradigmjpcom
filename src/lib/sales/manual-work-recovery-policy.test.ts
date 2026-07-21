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
})
