import { expect, test } from "@playwright/test"

const generatedVisualSelectors = [
  '[data-marketing-visuals]',
  '[data-testid="marketing-showreel"]',
  '[data-testid="marketing-visual-carousel"]',
  'img[src*="/visuals/brand/"]',
  'video source[src*="/visuals/brand/"]',
].join(",")

test.describe("public media relevance", () => {
  test.describe.configure({ timeout: 120_000 })

  test("works page keeps portfolio content ahead of unrelated generated media", async ({ page }) => {
    const response = await page.goto("/ja/works")

    expect(response?.status()).toBe(200)
    await expect(page.locator(".page-hero-visual")).toBeVisible()
    await expect(page.getByText("企業サイトの再設計", { exact: true })).toBeVisible()
    await expect(page.getByText("地域ビジネスの発見導線", { exact: true })).toBeVisible()
    await expect(page.getByText("AI活用の業務設計", { exact: true })).toBeVisible()
    await expect(page.locator(generatedVisualSelectors)).toHaveCount(0)
  })

  test("shared marketing pages do not append the retired stock-like visual rail", async ({ page }) => {
    test.setTimeout(120_000)

    for (const path of ["/ja", "/ja/services", "/ja/services/web", "/ja/privacy", "/en/package"]) {
      const response = await page.goto(path)

      expect(response?.status(), `${path} response`).toBeLessThan(400)
      expect(await page.locator(generatedVisualSelectors).count(), `${path} generated visual rail`).toBe(0)
    }
  })
})
