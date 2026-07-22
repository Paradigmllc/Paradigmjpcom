import { describe, expect, it } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import {
  buildLastGoodArtifactRestorePatch,
  captureManualWorkLastGoodArtifacts,
} from "./manual-work-last-good"

function row(overrides: Partial<ManualJapanEntryWorkRow> = {}): ManualJapanEntryWorkRow {
  return {
    initial_message: "Hello Acme team,\n\nA grounded draft.\n\nBest,\nTomohiro H",
    report_url: "https://paradigmjp.com/en/work-report/token",
    report_data: { schemaVersion: "manual_japan_entry_strategy_v4" },
    message_review: { passed: true, score: 94 },
    twenty_sync_status: "synced",
    twenty_company_id: "company-1",
    ...overrides,
  } as ManualJapanEntryWorkRow
}

describe("manual work last-known-good artifact preservation", () => {
  it("captures only a passed message paired with a V4 report", () => {
    expect(captureManualWorkLastGoodArtifacts(row())).toMatchObject({
      initial_message: expect.stringContaining("grounded draft"),
      report_url: expect.stringContaining("work-report"),
      twenty_sync_status: "synced",
    })
    expect(captureManualWorkLastGoodArtifacts(row({ message_review: { passed: false } }))).toBeNull()
    expect(captureManualWorkLastGoodArtifacts(row({ report_data: { schemaVersion: "legacy" } }))).toBeNull()
  })

  it("restores saved artifacts while exposing the regeneration failure", () => {
    const snapshot = captureManualWorkLastGoodArtifacts(row())
    expect(snapshot).not.toBeNull()
    const patch = buildLastGoodArtifactRestorePatch(snapshot!, "DeepSeek repair exhausted", "2026-07-22T00:00:00.000Z")

    expect(patch).toMatchObject({
      status: "needs_review",
      stage: "complete",
      initial_message: expect.stringContaining("grounded draft"),
      twenty_sync_status: "synced",
      error_message: "DeepSeek repair exhausted",
      message_review: {
        passed: true,
        last_regeneration_failure: {
          failed_at: "2026-07-22T00:00:00.000Z",
          message: "DeepSeek repair exhausted",
          artifacts_preserved: true,
        },
      },
    })
  })
})
