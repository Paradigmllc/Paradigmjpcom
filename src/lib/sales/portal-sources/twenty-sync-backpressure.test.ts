import { describe, expect, it } from "vitest"
import { isTwentyBackpressureError } from "./twenty-sync"

describe("isTwentyBackpressureError", () => {
  it.each([
    "Twenty circuit breaker is open — all calls blocked temporarily",
    '{"statusCode":429,"messages":["Limit reached (100 tokens per 60000 ms)"]}',
    "Twenty API HTTP 429",
  ])("recognizes retryable Twenty backpressure: %s", (message) => {
    expect(isTwentyBackpressureError(message)).toBe(true)
  })

  it("does not defer unrelated validation failures", () => {
    expect(isTwentyBackpressureError("company id missing")).toBe(false)
  })
})
