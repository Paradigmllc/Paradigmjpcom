import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

test("shot revision edits real generation inputs, retains errors and bounds long-form DOM", async ({ page }, testInfo) => {
  const patches: Record<string, unknown>[] = []
  const requests: string[] = []
  const detail = {
    project_id: "revision-fixture", state: { status: "draft_approved" }, qa: { passed: true },
    manifest: {
      primary_deliverable: { language: "ja" }, metadata: { planning_mode: "authored_chapters" },
      shots: Array.from({ length: 200 }, (_, index) => ({
        id: `shot-${String(index + 1).padStart(3, "0")}`, title: `レビュー対象 ${index + 1}`,
        kind: "abstract_broll", engine: "comfyui", duration_seconds: 5,
        headline: "朝の時間", body: "素材テスト", template_id: "product-spotlight",
        metadata: { prompt: "Original direction", narration: "元の原稿", narration_path: "/approved/old.wav" },
      })),
    },
  }
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== "factory-fixture.test") return route.abort()
    if (route.request().method() === "PATCH") {
      const patch = route.request().postDataJSON() as Record<string, unknown>
      patches.push(patch)
      const shot = detail.manifest.shots[0]
      if (typeof patch.prompt === "string") shot.metadata.prompt = patch.prompt
      if (typeof patch.narration === "string") { shot.metadata.narration = patch.narration; shot.metadata.narration_path = "" }
      return route.fulfill({ json: { ok: true, shot, revision: { patch } } })
    }
    if (url.pathname.endsWith("/rerender")) {
      requests.push(route.request().postData() || "")
      return route.fulfill({ status: 409, json: { detail: "生成中です。完了後に修正してください。" } })
    }
    if (url.pathname.startsWith("/v1/")) return route.fulfill({ status: 401, json: { detail: "Offline fixture" } })
    const filename = url.pathname === "/console/" ? "console.html" : url.pathname.slice("/console/".length)
    if (!url.pathname.startsWith("/console/") || !/^[a-z-]+\.(html|js|css)$/.test(filename)) return route.fulfill({ status: 404 })
    return route.fulfill({ body: await readFile(resolve("services/video-factory/src/video_factory/static", filename)), contentType: filename.endsWith(".js") ? "application/javascript" : filename.endsWith(".css") ? "text/css" : "text/html" })
  })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("https://factory-fixture.test/console/#projects")
  await page.evaluate((fixture) => {
    const target = document.querySelector("#project-detail")
    if (!target) throw new Error("Project panel missing")
    target.innerHTML = '<button data-project-action="finalize">最終版を生成</button>' + Reflect.get(window, "studioProjectToolsHtml")(fixture)
    Reflect.get(window, "wireStudioProjectTools")(fixture)
  }, structuredClone(detail))
  await expect(page.locator("[data-shot-editor]")).toHaveCount(1)
  await page.getByLabel("映像の生成指示", { exact: true }).fill("Restrained steam; <img src=x onerror=alert(1)>")
  await page.getByLabel("修正するショット", { exact: true }).selectOption("1")
  await expect(page.getByLabel("修正するショット", { exact: true })).toHaveValue("0")
  await page.getByRole("button", { name: "保存", exact: true }).click()
  expect(patches).toHaveLength(0)
  await page.getByLabel("修正担当者名（承認とは別）", { exact: true }).fill("制作担当")
  await page.getByLabel("ナレーション原稿", { exact: true }).fill("新しい原稿")
  await page.getByRole("button", { name: "保存", exact: true }).click()
  await expect(page.locator("[data-revision-status]")).toContainText("保存済み")
  expect(patches[0]).toEqual({ language: "ja", reviewer: "制作担当", prompt: "Restrained steam; <img src=x onerror=alert(1)>", narration: "新しい原稿" })
  await expect(page.locator("[data-revision-field=narration_path]")).toHaveValue("")
  await expect(page.getByRole("button", { name: "最終版を生成", exact: true })).toBeDisabled()
  await expect(page.locator(".studio-qa")).toContainText("前回版")
  await page.getByRole("button", { name: "保存して再生成", exact: true }).click()
  await expect(page.locator("[data-revision-status]")).toContainText("生成中")
  expect(requests).toEqual([JSON.stringify({ shot_ids: ["shot-001"] })])
  await expect(page.getByLabel("ナレーション原稿", { exact: true })).toHaveValue("新しい原稿")
  await expect(page.locator("[data-shot-editor] img")).toHaveCount(0)
  await page.getByLabel("修正するショット", { exact: true }).selectOption("199")
  await expect(page.locator("[data-shot-editor]")).toHaveAttribute("data-shot-editor", "shot-200")
  await expect(page.locator("[data-shot-editor]")).toHaveCount(1)
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator(".storyboard-section").screenshot({ path: testInfo.outputPath("shot-revision.png") })
})

test("project preview selects the whole master instead of the last source clip", async ({ page }) => {
  const fetched: string[] = []
  const artifacts = ["master/master.mp4", "scenes/raw/default/999-shot-999.mp4"].map((path) => ({
    path, url: `/v1/projects/preview-fixture/files/${path}`, name: path.split("/").at(-1),
    size: 100, media_type: "video/mp4",
  }))
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== "factory-fixture.test") return route.abort()
    if (url.pathname.includes("/files/")) {
      fetched.push(url.pathname)
      // Selection/authenticated fetch test, not a media decoder or quality test.
      return route.fulfill({ contentType: "video/mp4", body: "fixture" })
    }
    if (url.pathname.endsWith("/artifacts")) return route.fulfill({ json: { artifacts } })
    if (url.pathname === "/v1/projects/preview-fixture") return route.fulfill({ json: {
      project_id: "preview-fixture", state: { status: "draft_review_required" },
      manifest: { project_name: "全編確認", duration_seconds: 180, shots: [] },
    } })
    if (url.pathname.startsWith("/v1/")) return route.fulfill({ status: 401, json: { detail: "Offline fixture" } })
    const filename = url.pathname === "/console/" ? "console.html" : url.pathname.slice("/console/".length)
    if (!url.pathname.startsWith("/console/") || !/^[a-z-]+\.(html|js|css)$/.test(filename)) return route.fulfill({ status: 404 })
    return route.fulfill({ body: await readFile(resolve("services/video-factory/src/video_factory/static", filename)), contentType: filename.endsWith(".js") ? "application/javascript" : filename.endsWith(".css") ? "text/css" : "text/html" })
  })
  await page.goto("https://factory-fixture.test/console/#projects")
  await page.evaluate(() => Reflect.get(window, "loadProjectDetail")("preview-fixture"))
  await expect(page.getByLabel("確認する動画", { exact: true })).toHaveValue("0")
  expect(fetched).toEqual([artifacts[0].url])
  await expect(page.locator("#project-preview")).toHaveCount(1)
  await page.getByLabel("確認する動画", { exact: true }).selectOption("1")
  await expect.poll(() => fetched).toEqual([artifacts[0].url, artifacts[1].url])
  await expect(page.locator("#project-preview-status")).toContainText("自動承認されません")
})
