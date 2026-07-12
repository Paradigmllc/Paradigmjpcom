import { describe, expect, it } from "vitest"
import { buildDemoData } from "./demo-data"

describe("Japan Entry report demo", () => {
  it("uses an explicit fictional scenario and the fixed commercial terms", () => {
    const demo = buildDemoData("japan_entry", "en")
    const copy = JSON.stringify(demo)

    expect(demo.company_name).toBe("Illustrative Exporter, Inc.")
    expect(demo.total_loss).toBe("Not estimated")
    expect(demo.demo_url).toBeNull()
    expect(demo.video_url).toBeNull()
    expect(demo.content_template.offer_code).toBe("global_jaas")
    expect(copy).toContain("$12,000")
    expect(copy).toContain("$995/month")
    expect(copy).toContain("14 business days")
    expect(copy).toContain("not guaranteed")
    expect(copy).not.toMatch(/EcoVantage|free assessment|30 days|\$22K|\$82K/i)
  })
})
