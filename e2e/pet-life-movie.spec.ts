import { expect, test } from "@playwright/test"

const projectId = "00000000-0000-4000-8000-000000000001"
const assetIds = Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`)

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
  await expect(page.getByRole("heading", { name: "写真を、家族の物語に。" })).toBeVisible()
  await page.getByLabel("ペットのお名前").fill("Mugi")
  await page.getByLabel("一緒に過ごした時間").fill("12年間")
  await page.getByPlaceholder("1.").fill("川沿いの散歩")
  await page.getByLabel("写真を5〜20枚選ぶ").setInputFiles(assetIds.map((_, index) => ({
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
  await expect(page.getByRole("button", { name: /Storyを選ぶ|有料レンダリング準備中|Choose Story|Paid render coming soon/ }).first()).toBeVisible()
})
