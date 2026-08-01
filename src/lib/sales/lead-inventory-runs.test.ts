import { describe, expect, it } from "vitest"
import { reusableReadySourceRecordCount } from "./lead-inventory-runs"

describe("reusableReadySourceRecordCount", () => {
  it("reuses a completed source pack instead of fetching it again", () => {
    expect(reusableReadySourceRecordCount({ last_status: "ready", last_record_count: 5_000 })).toBe(5_000)
  })

  it("does not reuse incomplete, empty, or malformed source packs", () => {
    expect(reusableReadySourceRecordCount({ last_status: "running", last_record_count: 5_000 })).toBeNull()
    expect(reusableReadySourceRecordCount({ last_status: "ready", last_record_count: 0 })).toBeNull()
    expect(reusableReadySourceRecordCount({ last_status: "ready", last_record_count: 1.5 })).toBeNull()
  })
})
