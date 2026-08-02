import { devices, expect, test } from "@playwright/test"

const projectId = "00000000-0000-4000-8000-000000000001"
const assetIds = Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)

const commercialCopy = {
  ja: "支払方法・時期",
  en: "Payment method and timing",
  es: "Método y momento del pago",
  pt: "Método e momento do pagamento",
} as const

for (const locale of Object.keys(commercialCopy) as Array<keyof typeof commercialCopy>) {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${locale} commercial page is stable on ${viewport.name}`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize(viewport)
      const response = await page.goto(`/${locale}/pet-life-movie`, { waitUntil: "domcontentloaded" })
      expect(response?.status()).toBe(200)
      await expect(page.getByText(commercialCopy[locale], { exact: false }).first()).toBeVisible()
      await expect(page.getByText("$19").first()).toBeVisible()
      await expect(page.getByRole("link", { name: /Pet Life Movie|Condiciones|Termos/ }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
      expect(errors).toEqual([])
    })
  }
}

test("real iPhone profile loads the complete styled experience", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL: process.env.E2E_BASE_URL ?? "https://paradigmjp.com",
  })
  const page = await context.newPage()
  const failedAssets: string[] = []
  page.on("response", (response) => {
    if (response.status() >= 400 && response.request().resourceType() === "stylesheet") failedAssets.push(`${response.status()} ${response.url()}`)
  })
  const response = await page.goto("/ja/pet-life-movie", { waitUntil: "networkidle" })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: /写真を、\s*家族の物語に。/ })).toBeVisible()
  expect(await page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0)
  expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector("h1")!).fontSize))).toBeGreaterThan(30)
  const pipeline = page.getByText("見えない工程まで、誠実に。")
  await pipeline.scrollIntoViewIfNeeded()
  await expect(pipeline).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  expect(failedAssets).toEqual([])
  await context.close()
})

test("creates a no-account Pet Life Movie preview", async ({ page }) => {
  test.setTimeout(60_000)
  await page.route("**/api/pet-life-movie/projects", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, project: { id: projectId }, accessToken: "a".repeat(43) }) })
  })
  await page.route(`**/api/pet-life-movie/projects/${projectId}/uploads`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, uploads: assetIds.map((assetId, index) => ({ assetId, uploadUrl: `https://upload.test/photo-${index}.jpg`, contentType: "image/jpeg" })) }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, uploaded: 5 }) })
  })
  await page.route("https://upload.test/**", async (route) => route.fulfill({ status: 200, body: "" }))
  await page.route(`**/api/pet-life-movie/projects/${projectId}/storyboard`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true,
      storyboard: {
        version: 1,
        locale: "ja",
        title: "Mugiとの大切な時間",
        factualOnly: true,
        durationSeconds: 10,
        scenes: assetIds.map((assetId, index) => ({ id: `scene-${index + 1}`, assetId, durationSeconds: 2, motion: "slow_zoom", caption: index === 0 ? "Mugiと出会えたこと" : "川沿いの散歩", source: index === 0 ? "pet_name" : "memory" })),
        closing: "ずっと、たいせつな家族。",
      },
    }) })
  })
  await page.route(`**/api/pet-life-movie/projects/${projectId}/preview`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, previewUrl: "https://paradigmjp.com/ja/pet-life-movie/memories/private" }) })
  })

  await page.goto("/ja/pet-life-movie")
  await expect(page.getByRole("heading", { name: /写真を、\s*家族の物語に。/ })).toBeVisible()
  await expect(page.getByRole("heading", { name: "注文前に、すべて明確に。" })).toBeVisible()
  await expect(page.getByText("$19").first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth))
  await page.getByRole("button", { name: "次へ" }).click()
  await expect(page.getByText("未入力または確認が必要な項目があります").first()).toBeVisible()
  await page.getByLabel("ペットのお名前").fill("Mugi")
  await page.getByLabel("一緒に過ごした時間").fill("12年間")
  await page.getByRole("button", { name: "次へ" }).click()
  await page.getByLabel("本当にあった思い出 1").fill("川沿いの散歩")
  await page.getByRole("button", { name: "次へ" }).click()
  await page.getByLabel(/写真を追加する/).setInputFiles(assetIds.map((_, index) => ({
    name: `mugi-${index + 1}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from(`photo-${index + 1}`),
  })))
  await page.getByRole("checkbox").check()
  const createButton = page.getByRole("button", { name: "無料プレビューを生成" })
  await createButton.focus()
  await createButton.press("Enter")
  await expect(page.getByText("Mugiとの大切な時間")).toBeVisible()
  await expect(page.getByRole("heading", { name: "透かしなしの本編をつくる" })).toBeVisible()
  await expect(page.getByText("$39").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Storyを選ぶ|有料レンダリング準備中/ }).first()).toBeVisible()
  await expect(page.getByText(/一回払い・5営業日以内/)).toBeVisible()
})
