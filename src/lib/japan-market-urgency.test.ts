import { describe, expect, it } from "vitest"
import messages from "../../messages/en.json"

describe("international Japan market urgency copy", () => {
  const copy = messages.marketUrgency

  it("uses a strong opportunity-cost frame without an unverifiable rank claim", () => {
    expect(copy.title).toMatch(/Japan/i)
    expect(copy.highlight).toMatch(/cost of waiting/i)
    expect(JSON.stringify(copy)).not.toMatch(/third[- ]largest|third[- ]biggest|world's third/i)
  })

  it("keeps the FX message and commercial boundaries honest", () => {
    expect(copy.body).toContain("USD/EUR")
    expect(copy.body).toContain("FX moves")
    expect(copy.body).toContain("no savings or outcome is guaranteed")
    expect(copy.proof).toContain("no traffic")
    expect(copy.ctaHref).toBe("/package")
  })
})
