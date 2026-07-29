import { expect, test } from "@playwright/test"

const representativeRoutes = [
  { path: "/ja", kind: "general", video: true },
  { path: "/ja/video-as-a-service", kind: "video", video: true },
  { path: "/en/package", kind: "japan", video: false },
  { path: "/ja/services/web", kind: "web", video: false },
] as const

test.describe("public marketing visual system", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  for (const route of representativeRoutes) {
    test(`${route.path} shows contextual media and a readable process`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" })
      expect(response?.ok(), `${route.path} should respond successfully`).toBe(true)

      const section = page.locator(`[data-marketing-visuals="${route.kind}"]`)
      await expect(section).toBeVisible()
      await expect(section.locator('[data-testid="marketing-visual-carousel"]')).toBeVisible()
      await expect(section.locator('[data-testid="marketing-process-table"]')).toBeAttached()

      const images = section.locator("img")
      expect(await images.count()).toBeGreaterThanOrEqual(4)
      await expect(images.first()).toHaveAttribute("alt", /.+/)

      if (route.video) {
        await expect(section.locator('[data-testid="marketing-showreel"]')).toBeVisible()
        await expect(section.locator('source[type="video/mp4"]')).toHaveAttribute(
          "src",
          "/visuals/brand/paradigm-showreel.mp4",
        )
      } else {
        await expect(section.locator('[data-testid="marketing-showreel"]')).toHaveCount(0)
      }
    })
  }

  test("legal pages use the restrained information map", async ({ page }) => {
    const response = await page.goto("/ja/privacy", { waitUntil: "domcontentloaded" })
    expect(response?.ok()).toBe(true)

    const section = page.locator('[data-marketing-visuals="compact"]')
    await expect(section).toBeVisible()
    await expect(section.locator("img")).toHaveAttribute("alt", /.+/)
    await expect(section.locator("li")).toHaveCount(3)
    await expect(page.locator('[data-testid="marketing-showreel"]')).toHaveCount(0)
  })
})
