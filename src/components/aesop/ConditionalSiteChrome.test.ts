import { describe, expect, it } from "vitest"
import { isStandaloneRoute } from "./standalone-routes"

describe("ConditionalSiteChrome standalone routes", () => {
  it.each([
    "/en/report/acme",
    "/en/work-report/11111111-1111-4111-8111-111111111111",
    "/ja/opportunity/acme",
    "/en/demo/acme",
  ])("removes the marketing chrome from %s", (pathname) => {
    expect(isStandaloneRoute(pathname)).toBe(true)
  })

  it.each(["/en", "/en/about", "/en/work", "/en/about/report-format"])(
    "keeps the marketing chrome on %s",
    (pathname) => {
      expect(isStandaloneRoute(pathname)).toBe(false)
    },
  )
})
