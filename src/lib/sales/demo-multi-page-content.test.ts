import { describe, expect, it } from "vitest"
import { buildSlug } from "./demo-multi-page-content"

describe("demo company slug", () => {
  it("uses only the human-readable company name", () => {
    expect(buildSlug({ company_name: "Cafe SOSOMU" })).toBe("cafe-sosomu")
    expect(buildSlug({ company_name: "及川洋菓子店" })).toBe("及川洋菓子店")
  })
})
