// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DemoPreviewToolbar, demoPreviewNotice } from "./DemoPreviewToolbar"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe("demo preview toolbar", () => {
  it("renders an honest unlisted notice for public proposal demos", () => {
    expect(demoPreviewNotice()).toContain("検索エンジンには登録されず")
    expect(demoPreviewNotice()).not.toContain("7日以内に削除")
  })

  it("shows the exact expiry date for temporary unlisted previews", () => {
    expect(demoPreviewNotice("2026-07-21T00:00:00.000Z")).toContain("2026/7/21")
    expect(demoPreviewNotice("2026-07-21T00:00:00.000Z")).toContain("失効")
  })

  it("switches iframe width and allows the preview bar to close", async () => {
    await act(async () => root.render(<DemoPreviewToolbar companyName="匠リフォーム"><div>サイト本文</div></DemoPreviewToolbar>))
    const mobile = container.querySelector<HTMLButtonElement>('button[aria-label="モバイル表示"]')
    expect(mobile).not.toBeNull()
    await act(async () => mobile?.click())
    const iframe = container.querySelector<HTMLIFrameElement>('iframe[title="匠リフォーム モバイルプレビュー"]')
    if (!iframe) throw new Error("mobile preview iframe not found")
    expect((iframe.parentElement as HTMLElement).style.width).toBe("390px")

    const noticeClose = container.querySelector<HTMLButtonElement>('button[aria-label="注意事項を閉じる"]')
    await act(async () => noticeClose?.click())
    expect(container.textContent).not.toContain("検索エンジンには登録されず")

    const toolbarClose = container.querySelector<HTMLButtonElement>('button[aria-label="プレビューバーを閉じる"]')
    await act(async () => toolbarClose?.click())
    expect(container.textContent).toContain("サイト本文")
    expect(container.querySelector('button[aria-label="PC表示"]')).toBeNull()
  })

  it("shows a branded loading surface until the preview iframe is ready", async () => {
    await act(async () => root.render(<DemoPreviewToolbar companyName="ノン美容室"><div>サイト本文</div></DemoPreviewToolbar>))
    expect(container.querySelector('[role="status"]')?.textContent).toContain("ノン美容室")
    const iframe = container.querySelector<HTMLIFrameElement>("iframe")
    if (!iframe) throw new Error("preview iframe not found")
    await act(async () => iframe.dispatchEvent(new Event("load")))
    expect(container.querySelector('[role="status"]')).toBeNull()
    expect(iframe.className).toContain("opacity-100")
  })
})
