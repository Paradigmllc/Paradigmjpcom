import { expect, test, type BrowserContext } from "@playwright/test"
import { createHash } from "node:crypto"
import { canonicalLibrary, libraryBlockers, type LibrarySave, type LibraryVersion } from "../src/lib/video-studio-control/library"

let loginCookies: Awaited<ReturnType<BrowserContext["cookies"]>> = []
test.beforeAll(async ({ browser }, testInfo) => {
  const base = String(testInfo.project.use.baseURL ?? "")
  test.skip(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base), "Local mocked browser regression only")
  const context = await browser.newContext({ baseURL: base })
  try {
    const login = await context.request.post("/api/admin", { data: { action: "login", password: "lead-factory-e2e-admin-password" } })
    expect(login.status()).toBe(200)
    loginCookies = await context.cookies()
  } finally { await context.close() }
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(loginCookies)
  // Library must work independently of the existing control dashboard's DB outage.
  await page.route("**/api/sales/video-studio-control*", (route) => route.fulfill({ status: 503, json: { ok: false, error: "テスト用の生成台帳停止" } }))
})

test("register, retry an ambiguous commit, derive, duplicate and restore a version URL", async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const rows: LibraryVersion[] = []
  const submitted: LibrarySave[] = []
  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  let listGets = 0
  let ambiguousOnce = true
  await page.route("**/api/sales/video-studio-library*", async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === "GET") {
      const id = url.searchParams.get("versionId")
      if (id) { await route.fulfill({ json: { ok: true, version: rows.find((item) => item.operationId === id) } }); return }
      listGets++
      await route.fulfill({ json: { ok: true, versions: [...rows].reverse(), nextOffset: null, canWrite: true } }); return
    }
    const input = route.request().postDataJSON() as LibrarySave
    submitted.push(input)
    let version = rows.find((item) => item.operationId === input.operationId)
    const replay = !!version
    if (!version) {
      version = { ...input, createdAt: new Date().toISOString(), contentHash: createHash("sha256").update(canonicalLibrary(input)).digest("hex"), status: "draft", blockers: libraryBlockers(input.spec) }
      rows.push(version)
    }
    if (ambiguousOnce) {
      ambiguousOnce = false
      await route.fulfill({ status: 503, json: { ok: false, error: "テスト用: 保存後の応答を確認できません" } }); return
    }
    await route.fulfill({ status: replay ? 200 : 201, json: { ok: true, version, replay, notificationOk: true } })
  })
  await page.goto("/ja/admin/video-studio-control?tab=design", { waitUntil: "domcontentloaded" })
  const panel = page.getByTestId("studio-library")
  await expect(panel.getByText("登録された版はありません。", { exact: false })).toBeVisible()
  await panel.getByLabel("ライブラリ名", { exact: true }).fill("架空の成人・ドラマ案")
  await panel.getByLabel("ジャンル", { exact: true }).fill("実写ドラマ")
  await panel.getByLabel("登録種別").selectOption("character")
  await panel.getByLabel("演出・固定したい条件").fill("同じ青いジャケット、夕方の室内")
  await panel.getByLabel("利用条件・既知の制約").fill("UI回帰テスト用。人物の実生成・権利確認は未実施。")
  await panel.getByLabel("人物設定（成人の架空人物のみ）").fill("架空の30歳の女性、短い黒髪")
  await panel.getByLabel("衣装・外見").fill("青いジャケット")
  await panel.getByRole("button", { name: "未検証の版を保存（課金なし）" }).click()
  await expect(panel.getByRole("alert")).toContainText("応答を確認できません")
  await expect(panel.getByLabel("ライブラリ名", { exact: true })).toBeDisabled()
  await panel.getByRole("button", { name: "同じ保存IDで再試行", exact: true }).click()
  await expect(panel.getByText("選択中: 架空の成人・ドラマ案", { exact: true })).toBeVisible()
  expect(submitted).toHaveLength(2)
  expect(submitted[1]).toEqual(submitted[0])
  expect(rows).toHaveLength(1)
  expect(new URL(page.url()).searchParams.get("tab")).toBe("design")
  expect(new URL(page.url()).searchParams.get("libraryVersion")).toBe(rows[0].operationId)
  await expect(panel.getByText("参照未登録: identity", { exact: true })).toBeVisible()
  await panel.getByRole("button", { name: "この版から派生版を編集" }).click()
  await panel.getByLabel("ライブラリ名", { exact: true }).fill("ドラマ案・衣装変更")
  await panel.getByRole("button", { name: "未検証の版を保存（課金なし）" }).click()
  await expect(panel.getByText("選択中: ドラマ案・衣装変更", { exact: true })).toBeVisible()
  expect(rows).toHaveLength(2)
  expect(rows[1].parentVersionId).toBe(rows[0].operationId)
  expect(rows[1].entryId).toBe(rows[0].entryId)
  await panel.getByRole("button", { name: "別の項目に複製して編集" }).click()
  await panel.getByLabel("ライブラリ名", { exact: true }).fill("別作品の人物案")
  await panel.getByRole("button", { name: "未検証の版を保存（課金なし）" }).click()
  await expect(panel.getByText("選択中: 別作品の人物案", { exact: true })).toBeVisible()
  expect(rows).toHaveLength(3)
  expect(rows[2].parentVersionId).toBeNull()
  expect(rows[2].entryId).not.toBe(rows[0].entryId)
  const previousGets = listGets
  await page.waitForTimeout(1100)
  expect(listGets).toBe(previousGets)
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(panel.getByText("選択中: 別作品の人物案", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await panel.screenshot({ path: testInfo.outputPath("library-version-review.png") })
  expect(browserErrors).toEqual([])
})

test("read-only empty and error states never expose a save action", async ({ page }) => {
  let fails = true
  await page.route("**/api/sales/video-studio-library*", (route) => route.fulfill(fails
    ? { status: 503, json: { ok: false, error: "テスト用のライブラリ停止" } }
    : { json: { ok: true, versions: [], nextOffset: null, canWrite: false } }))
  await page.goto("/ja/admin/video-studio-control", { waitUntil: "domcontentloaded" })
  const panel = page.getByTestId("studio-library")
  await expect(panel.getByRole("alert")).toContainText("ライブラリ停止")
  fails = false
  await panel.getByRole("button", { name: "ライブラリ更新" }).click()
  await expect(panel.getByText("閲覧専用です。", { exact: false })).toBeVisible()
  await expect(panel.getByRole("button", { name: "未検証の版を保存（課金なし）" })).toHaveCount(0)
})
