import { describe, expect, it } from "vitest"
import { classifyManualWorkFailure } from "./manual-work-failure-policy"

describe("manual work failure policy", () => {
  it.each([
    "fetch failed",
    "The operation was aborted due to timeout",
    "Homepage returned HTTP 404",
    "Homepage did not provide enough grounded product context",
  ])("terminalizes expected source failure without requesting operator retry: %s", (message) => {
    expect(classifyManualWorkFailure("fetching", new Error(message))).toMatchObject({
      status: "rejected",
      stage: "complete",
    })
  })

  it("keeps infrastructure and model failures visible as genuine failures", () => {
    expect(classifyManualWorkFailure("classifying", new Error("fetch failed"))).toEqual({
      status: "failed",
      stage: "failed",
      message: "fetch failed",
    })
    expect(classifyManualWorkFailure("copy_generation", new Error("DeepSeek balance unavailable"))).toEqual({
      status: "failed",
      stage: "failed",
      message: "DeepSeek balance unavailable",
    })
  })
})
