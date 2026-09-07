import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

test("chapter form preserves JSON fields and invalidates in-flight planning", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  let planned: Record<string, unknown> | null = null
  let releasePlan: (() => void) | undefined
  const planGate = new Promise<void>((resolveGate) => { releasePlan = resolveGate })
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== "factory-fixture.test") return route.abort()
    if (url.pathname === "/v1/briefs/plan") {
      planned = route.request().postDataJSON() as Record<string, unknown>
      await planGate
      return route.fulfill({ json: { shots: [{ id: "fixture" }], duration_seconds: 5, metadata: { chapters: [] } } })
    }
    if (url.pathname.startsWith("/v1/")) return route.fulfill({ status: 401, json: { detail: "Offline fixture" } })
    const filename = url.pathname === "/console/" ? "console.html" : url.pathname.slice("/console/".length)
    if (!url.pathname.startsWith("/console/") || !/^[a-z-]+\.(html|js|css)$/.test(filename)) return route.fulfill({ status: 404, body: "Unknown fixture" })
    return route.fulfill({ body: await readFile(resolve("services/video-factory/src/video_factory/static", filename)), contentType: filename.endsWith(".js") ? "application/javascript" : filename.endsWith(".css") ? "text/css" : "text/html" })
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("https://factory-fixture.test/console/#create")
  await page.getByRole("button", { name: "章を追加", exact: true }).click()
  await page.getByLabel("章1のタイトル", { exact: true }).fill("商品の導入")
  await page.getByRole("button", { name: "章1にショットを追加" }).click()
  await page.getByLabel("章1ショット1 タイトル", { exact: true }).fill("カップの質感")
  await page.getByLabel("章1ショット1 映像指示", { exact: true }).fill("陶器のカップを横から捉え、光と湯気の動きを見せる")
  await page.getByLabel("章1ショット1 ナレーション", { exact: true }).fill("朝の時間を、少し丁寧に。")
  await expect(page.locator("#chapter-editor-status")).toContainText("合計 5秒")
  await page.locator("#duration").fill("5")
  await expect(page.locator("#chapter-editor-status")).toContainText("完成尺と一致")
  await page.getByText("詳細JSON（フォームと同期）", { exact: true }).click()
  const raw = page.getByLabel("章とショットの台本", { exact: true })
  const original = JSON.parse(await raw.inputValue())
  original[0].shots[0].source_assets = ["/data/fixture/cup.png"]
  original[0].shots[0].workflow_id = "reviewed-fixture"
  await raw.fill(JSON.stringify(original))
  await page.getByLabel("章1ショット1 見出し", { exact: true }).fill("<img src=x onerror=alert(1)>")
  expect(JSON.parse(await raw.inputValue())[0].shots[0]).toMatchObject({ source_assets: ["/data/fixture/cup.png"], workflow_id: "reviewed-fixture" })
  await page.getByRole("button", { name: "章1にショットを追加" }).click()
  await page.getByLabel("章1ショット2 タイトル", { exact: true }).fill("二つ目の場面")
  await page.getByRole("button", { name: "章1ショット2を上へ" }).click()
  expect(JSON.parse(await raw.inputValue())[0].shots[0].title).toBe("二つ目の場面")
  await page.getByRole("button", { name: "直前の追加・削除・移動を戻す" }).click()
  expect(JSON.parse(await raw.inputValue())[0].shots[0].title).toBe("カップの質感")
  await page.getByLabel("編集するショット", { exact: true }).selectOption("1")
  await page.getByRole("button", { name: "章1ショット2を削除" }).click()
  const valid = await raw.inputValue()
  await raw.fill("{invalid")
  await expect(page.getByRole("button", { name: "章を追加", exact: true })).toBeDisabled()
  await expect(raw).toHaveValue("{invalid")
  await raw.fill(valid)
  await page.getByRole("button", { name: "課金せず章台本を検証" }).click()
  await expect.poll(() => planned).not.toBeNull()
  expect(planned).toMatchObject({ chapters: JSON.parse(valid) })
  await page.getByLabel("章1ショット1 ナレーション", { exact: true }).fill("検証中に変更した原稿です。")
  releasePlan?.()
  await expect(page.locator("#editorial-plan-result")).toContainText("検証中に入力が変更されました")
  await page.getByRole("button", { name: "課金せず章台本を検証" }).click()
  await expect(page.locator("#editorial-plan-result")).toContainText("構造検証のみ合格")
  const saved = await raw.inputValue()
  const large = JSON.parse(saved)
  large[0].shots = Array.from({ length: 200 }, () => ({ ...large[0].shots[0] }))
  await raw.fill(JSON.stringify(large))
  await expect(page.locator(".chapter-editor-shot")).toHaveCount(1)
  await expect(page.getByRole("button", { name: "章1にショットを追加" })).toBeDisabled()
  large[0].shots.push(large[0].shots[0])
  await raw.fill(JSON.stringify(large))
  await expect(page.locator("#chapter-editor-status")).toContainText("JSONをフォームに読み込めません")
  await raw.fill(saved)
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByText("詳細JSON（フォームと同期）", { exact: true }).click()
  await page.locator("#chapter-editor").screenshot({ path: testInfo.outputPath("chapter-editor.png") })
})
