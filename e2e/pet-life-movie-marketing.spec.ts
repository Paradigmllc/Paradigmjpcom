import { expect, test } from "@playwright/test"

test("Pet Life Movie preserves campaign attribution and records the first funnel steps", async ({ page }) => {
  const events: string[] = []
  await page.route("**/api/pet-life-movie/marketing/track", async (route) => {
    const body = route.request().postDataJSON() as { eventName?: string; utmSource?: string }
    if (body.eventName) events.push(body.eventName)
    expect(body.utmSource).toBe("instagram")
    await route.fulfill({ status: 204 })
  })
  await page.goto("/en/pet-life-movie?utm_source=instagram&utm_medium=organic_social&utm_campaign=pet_life_movie_global_launch&utm_content=memory_us_instagram")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.locator('[data-pet-movie-event="hero_cta"]').click()
  await expect(page).toHaveURL(/#create$/)
  await page.locator("#create").scrollIntoViewIfNeeded()
  await expect(page.locator("#create")).toBeVisible()
  await expect.poll(() => events).toContain("page_view")
  await expect.poll(() => events).toContain("hero_cta")
})
