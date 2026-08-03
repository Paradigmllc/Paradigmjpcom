import { expect, test } from "@playwright/test"

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`Quote Recovery LP is complete on ${viewport.name}`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    const response = await page.goto("/ja/quote-recovery", { waitUntil: "domcontentloaded" })
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: /見積を出した後の/ })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole("heading", { name: "無料トライアルなし。月単位で始められます。" })).toBeVisible()
    await expect(page.getByText("¥29,800").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "導入前によくある質問" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    expect(errors).toEqual([])
  })
}

test("Quote Recovery signup route renders without the server error boundary", async ({ page }) => {
  const response = await page.goto("/ja/quote-recovery/login?mode=signup", { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: "契約アカウントを作成" })).toBeVisible()
  await expect(page.getByLabel("会社名")).toBeVisible()
  await expect(page.getByText("読み込みに失敗しました")).toHaveCount(0)
})

test("pricing CTA reaches the signup form", async ({ page }) => {
  await page.goto("/ja/quote-recovery")
  await page.locator("#pricing").scrollIntoViewIfNeeded()
  const contractLink = page.getByRole("link", { name: "Starterを契約" })
  const signupPath = "/ja/quote-recovery/login?mode=signup"
  await expect(contractLink).toHaveAttribute("href", signupPath)
  if (test.info().project.name === "mobile-safari" && page.url().startsWith("http://")) {
    await page.goto(signupPath)
  } else {
    await contractLink.click()
  }
  await expect(page).toHaveURL(/quote-recovery\/login\?mode=signup/)
  await expect(page.getByRole("heading", { name: "契約アカウントを作成" })).toBeVisible()
})
