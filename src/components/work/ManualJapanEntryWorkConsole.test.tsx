import { describe, expect, it } from "vitest"
import { buildManualWorkRequest, parseManualWorkUrls, runWithConcurrency } from "./ManualJapanEntryWorkConsole"

describe("manual Japan Entry work input", () => {
  it("identifies the exact persistent row when the operator requests regeneration", () => {
    expect(buildManualWorkRequest({
      url: "https://example.com",
      variant: "auto",
      angle: "auto",
      sourceSlug: "manual_input",
      sourcePageUrl: "",
      retryItem: { id: "106db008-80af-4c56-93ee-916643d84c1b" },
    })).toMatchObject({
      retry: true,
      workId: "106db008-80af-4c56-93ee-916643d84c1b",
    })
  })

  it("accepts newline, spaces, and comma delimiters while removing duplicates", () => {
    expect(parseManualWorkUrls("a.com\nb.com, a.com  c.com")).toEqual(["a.com", "b.com", "c.com"])
  })

  it("never runs more than three URL jobs at once", async () => {
    let active = 0
    let peak = 0
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      active += 1
      peak = Math.max(peak, active)
      await Promise.resolve()
      active -= 1
    })
    expect(peak).toBe(3)
  })
})
