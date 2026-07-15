import { describe, expect, it } from "vitest"
import { hasDeterministicJapanEvidence } from "./manual-japan-entry-profile"

describe("manual company Japan exclusion", () => {
  it("rejects .jp domains regardless of model output", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.co.jp", text: "Example", countryCode: "US", llmJapanese: false })).toBe(true)
  })

  it("rejects explicit Japanese corporate markers", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.com", text: "株式会社 Example", countryCode: null, llmJapanese: false })).toBe(true)
  })

  it("does not reject an overseas domain without Japan evidence", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.com", text: "A Delaware software company", countryCode: "US", llmJapanese: false })).toBe(false)
  })
})
