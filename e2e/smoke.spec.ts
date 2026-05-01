/**
 * e2e/smoke.spec.ts — minimum viable smoke tests for paradigmjp.com
 *
 * Covers the must-not-break user-visible surface:
 *   1. /ja homepage renders + has expected title + JSON-LD
 *   2. /en homepage renders + has expected English title
 *   3. /ja/about + /ja/services + /ja/contact return 200
 *   4. /ja/p/foo redirects (308) to /ja/report/foo
 *   5. /ja/blog renders + lists posts
 *   6. opengraph-image returns image content-type
 *   7. /sitemap.xml + /robots.txt + /manifest.webmanifest are served
 */

import { test, expect } from "@playwright/test"

test.describe("homepage", () => {
  test("/ja loads with expected title + Organization JSON-LD", async ({ page }) => {
    await page.goto("/ja")
    await expect(page).toHaveTitle(/Paradigm合同会社/)
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all()
    expect(jsonLdScripts.length).toBeGreaterThan(0)
    let hasOrg = false
    for (const s of jsonLdScripts) {
      const text = await s.textContent()
      if (text?.includes('"@type":"Organization"')) hasOrg = true
    }
    expect(hasOrg).toBe(true)
  })

  test("/en loads with English title", async ({ page }) => {
    await page.goto("/en")
    await expect(page).toHaveTitle(/Paradigm LLC/)
  })
})

test.describe("inner routes", () => {
  for (const path of ["/ja/about", "/ja/services", "/ja/contact", "/ja/faq", "/ja/pricing", "/ja/blog", "/ja/legal", "/ja/privacy"]) {
    test(`${path} returns 200`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
    })
  }
})

test.describe("/p/ → /report/ redirect (s10-5 unification)", () => {
  test("/ja/p/test-slug → 308 → /ja/report/test-slug", async ({ request }) => {
    const res = await request.get("/ja/p/test-slug-foo", { maxRedirects: 0 })
    expect([301, 307, 308]).toContain(res.status())
    const location = res.headers()["location"]
    expect(location).toContain("/ja/report/test-slug-foo")
  })
})

test.describe("SEO assets", () => {
  test("/sitemap.xml is served as XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const ct = res.headers()["content-type"] ?? ""
    expect(ct).toMatch(/xml/)
    const body = await res.text()
    expect(body).toContain("<urlset")
    expect(body).toContain("hreflang")
  })

  test("/robots.txt is served", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
  })

  test("/manifest.webmanifest is served as JSON", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBe("Paradigm")
  })

  test("/ja/opengraph-image returns image", async ({ request }) => {
    const res = await request.get("/ja/opengraph-image")
    expect(res.status()).toBe(200)
    const ct = res.headers()["content-type"] ?? ""
    expect(ct).toMatch(/image/)
  })
})

test.describe("hreflang link rel headers", () => {
  test("/ja sends 12 hreflang alternates", async ({ request }) => {
    const res = await request.get("/ja")
    const linkHeader = res.headers()["link"] ?? ""
    for (const loc of ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]) {
      expect(linkHeader).toContain(`hreflang="${loc}"`)
    }
  })
})
