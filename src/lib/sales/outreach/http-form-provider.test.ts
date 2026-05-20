/**
 * http-form-provider.test.ts — ブラウザ不要 HTTP 送信の単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { HttpFormProvider } from "./http-form-provider"

afterEach(() => vi.unstubAllGlobals())

const FORM_HTML = `<html><body>
<form action="/submit" method="post">
  <input name="your-name" value="">
  <input name="your-email" type="email">
  <textarea name="your-message"></textarea>
  <input type="hidden" name="_wpcf7" value="123">
  <button type="submit">送信</button>
</form>
</body></html>`

describe("HttpFormProvider", () => {
  it("dryRun: フォーム解析 + フィールド組立のみ・POST しない", async () => {
    const fetchMock = vi.fn(async () => new Response(FORM_HTML, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const p = new HttpFormProvider()
    const r = await p.submitForm({
      formUrl: "https://a.com/contact",
      fields: { name: "PARADIGM", email: "x@y.com", company: "PARADIGM" },
      message: "本文テスト",
      dryRun: true,
    })
    expect(r.outcome).toBe("uncertain")
    expect(r.detail).toContain("dry-run")
    expect(fetchMock).toHaveBeenCalledTimes(1) // GET のみ・POST なし
  })

  it("実送信: 確認文言があれば submitted", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const isPost = init?.method && init.method !== "GET"
      return isPost
        ? new Response("送信が完了しました。ありがとうございます。", { status: 200 })
        : new Response(FORM_HTML, { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    const p = new HttpFormProvider()
    const r = await p.submitForm({
      formUrl: "https://a.com/contact",
      fields: { email: "x@y.com" },
      message: "本文",
      dryRun: false,
    })
    expect(r.outcome).toBe("submitted")
    expect(fetchMock).toHaveBeenCalledTimes(2) // GET + POST
  })

  it("SPA (server-rendered form 無し) → uncertain", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<div id='root'></div>", { status: 200 })))
    const p = new HttpFormProvider()
    const r = await p.submitForm({ formUrl: "https://a.com", fields: {}, message: "x", dryRun: false })
    expect(r.outcome).toBe("uncertain")
    expect(r.detail).toContain("SPA")
  })

  it("フォーム GET 失敗 → failed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })))
    const p = new HttpFormProvider()
    const r = await p.submitForm({ formUrl: "https://a.com/contact", fields: {}, message: "x", dryRun: false })
    expect(r.outcome).toBe("failed")
  })
})
