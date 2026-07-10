import { expect, test } from "@playwright/test"

test.describe("Japan Entry conversion path", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 })

  test("English homepage presents the fixed offer without legacy low-cost CTAs", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByRole("heading", { name: "Launch in Japan without hiring a local team" })).toBeVisible()
    await expect(page.getByText("$12,000", { exact: true })).toBeVisible()
    await expect(page.getByText("$0/month for the first six months", { exact: false })).toBeVisible()
    await expect(page.getByText("$1,500", { exact: false })).toHaveCount(0)
    await expect(page.getByText("Book a free 30-min call", { exact: false })).toHaveCount(0)
  })

  test("homepage metadata, social preview, and structured offer stay aligned", async ({ page, request }) => {
    await page.goto("/en")

    await expect(page).toHaveTitle(/Japan Entry Package for Fast-Decision SMBs/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /\$12,000 fixed Japan entry setup/,
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Japan Entry Package/,
    )

    const schemas = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
    const schemaText = schemas.join("\n")
    expect(schemaText).toContain('"@type":"Service"')
    expect(schemaText).toContain('"@type":"Offer"')
    expect(schemaText).toContain('"price":"12000"')
    expect(schemaText).toContain('"priceCurrency":"USD"')
    expect(schemaText).toContain('"@type":"FAQPage"')

    const ogResponse = await request.get("/en/opengraph-image")
    expect(ogResponse.ok()).toBe(true)
    expect(ogResponse.headers()["content-type"]).toContain("image/png")
  })

  test("Japan Entry CTA opens the decision-speed application", async ({ page }) => {
    await page.goto("/en")

    const applyLink = page
      .locator('a[href="/en/contact?intent=japan-entry"]:visible')
      .first()
    await expect(applyLink).toHaveAttribute("href", "/en/contact?intent=japan-entry")
    await applyLink.click()

    await expect(page).toHaveURL(/\/en\/contact\?intent=japan-entry/)
    await expect(page).toHaveTitle(/Apply for the Japan Entry Package/)
    await expect(page.getByText("Japan Entry Application", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Final decision authority")).toBeVisible()
    await expect(page.getByLabel("$12,000 approval timeline")).toBeVisible()
    await expect(page.getByText("Submit Japan Entry Application", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to the Japan Entry Package" })).toHaveAttribute("href", "/en")

    const schemas = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
    expect(schemas.join("\n")).toContain('"@type":"ContactPage"')
    expect(schemas.join("\n")).toContain("intent=japan-entry")

    await page.goto("/en/contact")
    await expect(page).toHaveTitle(/Apply for the Japan Entry Package/)
    await expect(page.getByText("Japan Entry Application", { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to the Japan Entry Package" })).toHaveAttribute("href", "/en")
  })

  test("every maintained English marketing page is healthy and commercially aligned", async ({ page }) => {
    test.setTimeout(120_000)
    const paths = [
      "/en",
      "/en/about",
      "/en/pricing",
      "/en/faq",
      "/en/contact",
      "/en/works",
      "/en/blog",
      "/en/privacy",
      "/en/legal",
    ]

    for (const path of paths) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} response`).toBeLessThan(400)
      await expect(page.locator("html")).toHaveAttribute("lang", "en")
      await expect(page.locator("h1").first()).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://paradigmjp.com${path}`,
      )
      const body = await page.locator("body").innerText()
      expect(body, `${path} legacy copy`).not.toMatch(
        /book a free consult|free 30-min|¥198,000|¥300,000|\$1,300|200\+ clients|98% retention/i,
      )
      const fitsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      )
      expect(fitsViewport, `${path} horizontal overflow`).toBe(true)
    }
  })

  test("legacy and unmaintained international offers consolidate into Japan Entry", async ({ request }) => {
    test.setTimeout(60_000)
    const legacyEnglishPaths = [
      "/en/services",
      "/en/services/web",
      "/en/services/meo",
      "/en/services/seo",
      "/en/services/ai",
      "/en/lp/web",
      "/en/lp/meo",
      "/en/lp/seo",
      "/en/lp/ai",
      "/en/video",
      "/en/agency",
    ]
    for (const path of legacyEnglishPaths) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect([307, 308], `${path} redirect status`).toContain(response.status())
      expect(response.headers().location, `${path} redirect target`).toContain(
        "/en#japan-entry-pricing",
      )
    }

    const international = await request.get(
      "/de/contact?utm_source=partner",
      { maxRedirects: 0 },
    )
    expect(international.status()).toBe(308)
    expect(international.headers().location).toContain("/en/contact")
    expect(international.headers().location).toContain("intent=japan-entry")
    expect(international.headers().location).toContain("utm_source=partner")
  })

  test("every maintained Japanese marketing page is healthy and claim-safe", async ({ page }) => {
    test.setTimeout(180_000)
    const paths = [
      "/ja",
      "/ja/about",
      "/ja/works",
      "/ja/blog",
      "/ja/pricing",
      "/ja/faq",
      "/ja/contact",
      "/ja/services",
      "/ja/services/web",
      "/ja/services/meo",
      "/ja/services/seo",
      "/ja/services/ai",
      "/ja/lp/web",
      "/ja/lp/meo",
      "/ja/lp/seo",
      "/ja/lp/ai",
      "/ja/video",
      "/ja/agency",
      "/ja/legal",
      "/ja/privacy",
    ]

    for (const path of paths) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} response`).toBeLessThan(400)
      await expect(page.locator("html")).toHaveAttribute("lang", "ja")
      await expect(page.locator("h1").first()).toBeVisible()
      const body = await page.locator("body").innerText()
      expect(body, `${path} unverified or stale public claim`).not.toMatch(
        /成果保証|成果報酬|平均\s*(?:2\.5\s*倍|40\s*%|3\s*ヶ?月)|TOP\s*3\s*表示を実現|問い合わせが\s*2\s*倍|人的コストほぼゼロ|依頼無制限|依頼し放題|修正無制限|永久配信|85\s*%\s*以上|品質保証|n8n|最終更新日:\s*2025|提供開始後の返品・返金はいたしかねます|無料相談を予約する/i,
      )
      const fitsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      )
      expect(fitsViewport, `${path} horizontal overflow`).toBe(true)
    }
  })

  test("Japan Entry diagnostic preview is explicitly illustrative and uses the fixed offer", async ({ page }) => {
    const response = await page.goto("/en/report/demo/japan_entry")

    expect(response?.status()).toBeLessThan(400)
    await expect(page.getByText(
      "Illustrative fictional scenario. Names, figures, and findings are not client results or an outcome guarantee.",
      { exact: true },
    )).toBeVisible()
    await expect(page.locator("h1")).toContainText("Illustrative Exporter, Inc.")
    await expect(
      page.getByText(/Setup is fixed at USD \$12,000\./),
    ).toBeVisible()
    await expect(
      page.getByText(
        /then \$995\/month; future-period cancellation follows the signed terms\./,
      ),
    ).toBeVisible()
    await expect(
      page.getByText(/The launch target is 21 business days/),
    ).toBeVisible()
    expect(response?.headers()["x-robots-tag"]).toContain("noindex")
    const body = await page.locator("body").innerText()
    expect(body).not.toMatch(/EcoVantage|free assessment|\$22K|\$82K|¥300,000/i)
    await expect(page.locator('a[href*="/blog/"]')).toHaveCount(0)
  })
})
