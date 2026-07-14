import { describe, expect, it } from "vitest"
import { shouldSpanOddServiceRow } from "./DemoPremiumV3BeautyServices"

describe("beauty services catalogue layout", () => {
  it("spans only the final card when a two-column grid has an odd count", () => {
    expect([0, 1, 2].map((index) => shouldSpanOddServiceRow(index, 3))).toEqual([false, false, true])
    expect([0, 1, 2, 3].map((index) => shouldSpanOddServiceRow(index, 4))).toEqual([false, false, false, false])
  })
})
