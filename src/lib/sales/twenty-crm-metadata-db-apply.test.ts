import { describe, expect, it } from "vitest"
import { normalizeTwentyCompanyViewsViaDatabase } from "./twenty-crm-metadata-db-apply"

describe("normalizeTwentyCompanyViewsViaDatabase", () => {
  it("persists visibility and position in application-owned universal overrides", () => {
    const source = normalizeTwentyCompanyViewsViaDatabase.toString()

    expect(source.match(/view_field\."overrides"/g)).toHaveLength(2)
    expect(source.match(/"overrides" =/g)).toHaveLength(2)
    expect(source.match(/jsonb_build_object/g)).toHaveLength(2)
    expect(source.match(/'isVisible'/g)).toHaveLength(2)
    expect(source.match(/'position'/g)).toHaveLength(2)
    expect(source).toContain("OUT_OF_SCOPE_FOREIGN_VALUE")
    expect(source).toContain("operand = 'IS_NOT'")
  })
})
