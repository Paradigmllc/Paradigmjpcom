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

  it("allows a non-Japanese fast qualification row to request GPT-5.6 editorial generation", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "completed",
      twenty_sync_status: "skipped",
      is_japanese_company: false,
      country_code: "US",
      evidence: { analysis_mode: "fast_qualification" },
      message_review: { purpose: "fast_qualification", generation_status: "not_requested" },
    })).toBe(true)
  })

  it("allows an unsent legacy review row to be rewritten by GPT-5.6", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "needs_review",
      twenty_sync_status: "synced",
      is_japanese_company: false,
      country_code: "AU",
      evidence: { analysis_mode: "legacy_full" },
      message_review: { generation_status: "passed" },
    })).toBe(true)
  })

  it("allows an unsent GPT-5.6 quality rejection to be regenerated", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "needs_review",
      twenty_sync_status: "skipped",
      is_japanese_company: false,
      country_code: "FI",
      evidence: { analysis_mode: "gpt56_editorial" },
      message_review: { purpose: "editorial_generation", generation_status: "failed_quality_gate" },
    })).toBe(true)
  })

  it("allows an unsent completed GPT-5.6 draft to be re-edited", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "completed",
      twenty_sync_status: "skipped",
      is_japanese_company: false,
      country_code: "SG",
      evidence: { analysis_mode: "gpt56_editorial" },
      message_review: { generation_status: "passed_gpt56_editorial" },
    })).toBe(true)
  })

  it("never reopens a record after an outreach outcome is recorded", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "needs_review",
      twenty_sync_status: "skipped",
      is_japanese_company: false,
      country_code: "US",
      manually_sent_at: "2026-07-29T00:00:00.000Z",
      evidence: { analysis_mode: "gpt56_editorial_failed" },
      message_review: { generation_status: "failed" },
    })).toBe(false)
  })

  it("does not promote a Japanese fast qualification row", () => {
    expect(isManualWorkRecoveryAvailable({
      status: "rejected",
      twenty_sync_status: "skipped",
      is_japanese_company: true,
      country_code: "JP",
      evidence: { analysis_mode: "fast_qualification" },
      message_review: { purpose: "fast_qualification" },
    })).toBe(false)
  })
})
