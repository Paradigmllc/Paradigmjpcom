import { expect, test } from "@playwright/test"

test.describe("Japan Entry conversion path", () => {
  test("English homepage presents the fixed offer without legacy low-cost CTAs", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByRole("heading", { name: "Launch in Japan without hiring a local team" })).toBeVisible()
    await expect(page.getByText("$12,000", { exact: true })).toBeVisible()
    await expect(page.getByText("$0/month for the first six months", { exact: false })).toBeVisible()
    await expect(page.getByText("$1,500", { exact: false })).toHaveCount(0)
    await expect(page.getByText("Book a free 30-min call", { exact: false })).toHaveCount(0)
  })

  test("Japan Entry CTA opens the decision-speed application", async ({ page }) => {
    await page.goto("/en")

    const applyLink = page.getByRole("link", { name: "Apply for a Japan launch slot" }).first()
    await expect(applyLink).toHaveAttribute("href", "/en/contact?intent=japan-entry")
    await applyLink.click()

    await expect(page).toHaveURL(/\/en\/contact\?intent=japan-entry/)
    await expect(page.getByText("Japan Entry Application", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Final decision authority")).toBeVisible()
    await expect(page.getByLabel("$12,000 approval timeline")).toBeVisible()
    await expect(page.getByText("Submit Japan Entry Application", { exact: true })).toBeVisible()
  })
})
