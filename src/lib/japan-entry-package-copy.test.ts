import { describe, expect, it } from "vitest"
import messages from "../../messages/en.json"

describe("Japan Entry package detail copy", () => {
  const page = messages.packagePage

  it("publishes a complete deliverable map", () => {
    expect(page.workstreams).toHaveLength(7)
    for (const workstream of page.workstreams) {
      expect(workstream.number).toMatch(/^0[1-7]$/)
      expect(workstream.title.trim()).not.toBe("")
      expect(workstream.summary.trim()).not.toBe("")
      expect(workstream.deliverables.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("makes the delivery and operating boundaries explicit", () => {
    expect(page.timeline.steps).toHaveLength(5)
    expect(page.timeline.desc).toContain("Start Date")
    expect(page.operations.items).toHaveLength(8)
    expect(page.operations.capacity.some((item) => item.value.includes("48 business hours"))).toBe(true)
    expect(page.operations.capacity).toHaveLength(4)
    expect(page.operations.capacity.some((item) => item.value.includes("One active request"))).toBe(true)
    expect(page.async.points).toHaveLength(4)
    expect(page.async.meetingPolicy).toContain("two business days")
    expect(page.async.points.some((point) => point.title.includes("Loom"))).toBe(true)
    expect(page.notIncluded.items).toContain("Guaranteed traffic, rankings, conversion rate, revenue, customer acquisition, or ROI")
    expect(page.notIncluded.items).toContain("Company incorporation, licence applications, registrations, certification, or specialist sign-off")
    expect(JSON.stringify(page.commercial)).toContain("$12,000 USD")
    expect(JSON.stringify(page.commercial)).toContain("continuation pricing is agreed separately")
  })

  it("does not frame stock imagery or estimates as proof", () => {
    const copy = JSON.stringify(page)
    const includedCopy = JSON.stringify({
      heroDesc: page.heroDesc,
      workstreams: page.workstreams,
      timeline: page.timeline,
      operations: page.operations,
      commercial: page.commercial,
      ctaDesc: page.ctaDesc,
    })
    expect(copy).toContain("not invented revenue attribution")
    expect(copy).toContain("Private Similarweb-style traffic or sales data presented as observed fact")
    expect(copy).toContain("public-data-based estimates, not actual revenue or guaranteed results")
    expect(includedCopy).not.toMatch(/guaranteed (?:traffic|revenue|roi)/i)
  })
})
