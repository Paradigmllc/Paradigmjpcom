import { describe, expect, it } from "vitest"
import { parseManualWorkUrls } from "./ManualJapanEntryWorkConsole"

describe("manual Japan Entry work input", () => {
  it("accepts newline, spaces, and comma delimiters while removing duplicates", () => {
    expect(parseManualWorkUrls("a.com\nb.com, a.com  c.com")).toEqual(["a.com", "b.com", "c.com"])
  })
})
