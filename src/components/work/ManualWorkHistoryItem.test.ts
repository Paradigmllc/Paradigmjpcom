import { describe, expect, it } from "vitest"
import { formatManualWorkCreatedAt } from "./ManualWorkHistoryItem"

describe("formatManualWorkCreatedAt", () => {
  it("renders a deterministic Japan timestamp on the server and browser", () => {
    expect(formatManualWorkCreatedAt("2026-07-19T21:44:44.864734+00:00")).toBe("2026/7/20 06:44:44")
  })

  it("fails closed for an invalid timestamp", () => {
    expect(formatManualWorkCreatedAt("invalid")).toBe("日時不明")
  })
})
