import { describe, expect, it } from "vitest"
import { parseManualWorkUrls, runWithConcurrency } from "./ManualJapanEntryWorkConsole"

describe("manual Japan Entry work input", () => {
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
