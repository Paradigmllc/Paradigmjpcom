import { describe, expect, it } from "vitest"
import { sanitizePublicJson, sanitizePublicRecord } from "./public-surface"

describe("public surface sanitization", () => {
  it("removes sensitive fields recursively while preserving public blocks", () => {
    const result = sanitizePublicRecord({
      title: "Public demo",
      company_id: "internal-id",
      blocks: [{ type: "hero", props: { headline: "Hello", apiKey: "secret" } }],
      nested: { diagnostic: { score: 42 }, description: "safe" },
    })

    expect(result).toEqual({
      title: "Public demo",
      blocks: [{ type: "hero", props: { headline: "Hello" } }],
      nested: { description: "safe" },
    })
  })

  it("normalizes scalar public values without throwing", () => {
    expect(sanitizePublicJson(null)).toBeNull()
    expect(sanitizePublicJson("safe")).toBe("safe")
    expect(sanitizePublicJson([{ token: "secret" }, 1])).toEqual([{}, 1])
  })
})
