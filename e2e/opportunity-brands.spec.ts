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
})
