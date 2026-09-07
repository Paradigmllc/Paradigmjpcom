// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { FormData, MockAgent, fetch as undiciFetch } from "undici"
import { loadBuffer } from "cheerio"
import sharp from "sharp"
import { readFileSync } from "node:fs"
import { Blob } from "node:buffer"

const clients: MockAgent[] = []
afterEach(async () => { await Promise.all(clients.splice(0).map((client) => client.close())) })

describe("studio shared dependency compatibility", () => {
  it("retains authenticated JSON request/response behavior without external requests", async () => {
    const client = new MockAgent()
    clients.push(client)
    client.disableNetConnect()
    client.get("https://studio.invalid").intercept({
      path: "/v1/test", method: "POST", body: JSON.stringify({ project: "fixture" }),
      headers: { "x-api-key": "test-only-not-a-production-secret", "content-type": "application/json" },
    }).reply(200, { ok: true, state: "draft_review_required" })
    const response = await undiciFetch("https://studio.invalid/v1/test", {
      dispatcher: client, method: "POST", body: JSON.stringify({ project: "fixture" }),
      headers: { "x-api-key": "test-only-not-a-production-secret", "content-type": "application/json" },
    })
    expect(await response.json()).toEqual({ ok: true, state: "draft_review_required" })
    client.assertNoPendingInterceptors()
  })

  it("retains multipart form support used by media integrations", async () => {
    const client = new MockAgent()
    clients.push(client)
    client.disableNetConnect()
    client.get("https://studio.invalid").intercept({ path: "/upload", method: "POST" }).reply(201, { ok: true })
    const form = new FormData()
    form.set("caption", "日本語字幕")
    form.set("file", new Blob(["fixture"], { type: "text/plain" }), "fixture.txt")
    const response = await undiciFetch("https://studio.invalid/upload", { method: "POST", body: form, dispatcher: client })
    expect(response.status).toBe(201)
    client.assertNoPendingInterceptors()
  })

  it("decodes Japanese HTML in the actual Cheerio dependency", () => {
    const html = loadBuffer(Buffer.from('<meta charset="utf-8"><h1>制作条件</h1><a href="/review">レビュー</a>'))
    expect(html("h1").text()).toBe("制作条件")
    expect(html("a").attr("href")).toBe("/review")
  })

  it("keeps jsdom controls and URL behavior used by the UI tests", () => {
    const container = document.createElement("div")
    container.innerHTML = '<label>尺<input name="duration" value="30"></label>'
    expect(container.querySelector("input")?.value).toBe("30")
    expect(new window.URL("?version=1", "https://studio.invalid/review").pathname).toBe("/review")
  })

  it("retains native image processing without introducing an image-size replacement", async () => {
    const png = await sharp({ create: { width: 128, height: 256, channels: 3, background: "#ffffff" } }).png().toBuffer()
    expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: 128, height: 256 })
  })

  it("pins the reviewed same-major Undici fix and keeps the existing Sharp override", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"))
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
    expect(pkg.overrides.undici).toBe("7.29.1")
    expect(lock.packages["node_modules/undici"].version).toBe("7.29.1")
    expect(pkg.overrides.sharp).toBe("$sharp")
  })
})
