import { expect, test } from "@playwright/test"

test.describe("Japan opportunity brands", () => {
  test("hub exposes the three distinct transaction desks", async ({ page }) => {
    await page.goto("/en/japan-opportunities")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn Japan complexity")
    await expect(page.getByRole("heading", { name: "Japan Asset Intelligence" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Enter & Operate Japan" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Source from Japan" })).toBeVisible()
  })

  test("source desk renders a complete RFQ intake", async ({ page }) => {
    await page.goto("/en/japan-opportunities/source-from-japan")
    await expect(page.getByRole("heading", { level: 1, name: "Source from Japan" })).toBeVisible()
    await expect(page.getByLabel("What do you need?")).toHaveValue("Supplier Shortlist")
    await expect(page.getByRole("button", { name: /Request a scoped next step/ })).toBeEnabled()
  })

  test("public inquiry API rejects incomplete submissions before persistence", async ({ request }) => {
    const response = await request.post("/api/opportunity-inquiries", {
      data: { brand: "source-from-japan" },
    })
    expect(response.status()).toBe(400)
  })

  test("publishes sourced investor briefs in HTML and the public API", async ({ page, request }) => {
    const catalogResponse = await request.get("/api/v1/investor-briefs")
    expect(catalogResponse.ok()).toBeTruthy()
    const catalog = await catalogResponse.json() as { data: Array<{ slug: string }>; meta: { count: number } }
    expect(catalog.meta.count).toBe(28)
    expect(catalog.data.some((item) => item.slug === "japan-data-center-investment")).toBe(true)
    expect(catalog.data.some((item) => item.slug === "yokohama-real-estate-investment")).toBe(true)

    await page.goto("/en/japan-opportunities/invest/japan-data-center-investment")
    await expect(page.getByRole("heading", { level: 1, name: /Japan Data Center Investment/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Primary sources" })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://paradigmjp.com/en/japan-opportunities/invest/japan-data-center-investment",
    )

    await expect(page.getByRole("heading", { name: "Evidence readiness score" })).toBeVisible()

    const factoryResponse = await request.get("/api/v1/investor-briefs/factory")
    expect(factoryResponse.ok()).toBeTruthy()
    const factory = await factoryResponse.json() as { data: { scale: { candidates: { total: number } } } }
    expect(factory.data.scale.candidates.total).toBe(195_264)

    await page.goto("/en/japan-opportunities/invest/compare/japan-data-center-investment-vs-japan-renewable-energy-investment")
    await expect(page.getByRole("heading", { level: 1, name: /Data centers vs Renewable power/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Source ledgers" })).toBeVisible()
  })

  test("filters and stress-tests the Greater Tokyo evidence cluster", async ({ page }) => {
    await page.goto("/en/japan-opportunities/invest")
    await expect(page.getByText("28 distinct decisions, not keyword variants")).toBeVisible()
    await page.getByLabel("Filter by geography").selectOption("Greater Tokyo")
    await page.getByPlaceholder(/Search market/).fill("Yokohama")
    await expect(page.getByText("Showing 2 of 28 evidence-gated briefs.")).toBeVisible()
    await page.getByRole("link", { name: /Yokohama Real Estate Investment/ }).click()

    await expect(page.getByRole("heading", { level: 1, name: /Yokohama Real Estate Investment/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Compare the covered submarkets" })).toBeVisible()
    await page.getByRole("button", { name: "Annual change" }).click()
    await expect(page.getByRole("button", { name: "Annual change" })).toHaveAttribute("aria-pressed", "true")

    const baseYield = page.getByText("Base yield").locator("..")
    await expect(baseYield).toContainText("3.38%")
    await page.getByLabel("Purchase price").fill("800")
    await expect(baseYield).toContainText("2.54%")
    const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(structuredData.some((value) => value.includes('"@type":"Dataset"'))).toBe(true)
    expect(structuredData.some((value) => value.includes('"@type":"FAQPage"'))).toBe(true)
  })

  test("keeps the fixed setup lane distinct from the external operator lane", async ({ page }) => {
    await page.goto("/en/japan-market-partner")
    await expect(page.getByText("This $15,000 fixed setup lane does not appoint Paradigm as a distributor")).toBeVisible()
    await expect(page.getByRole("link", { name: "View the External Japan Market Operator package" })).toHaveAttribute(
      "href",
      "/en/japan-opportunities/enter-and-operate-japan",
    )
  })
})
