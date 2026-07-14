// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ListLeadRepairPanel } from "./ListLeadRepairPanel"

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

vi.mock("sonner", () => ({ toast }))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe("ListLeadRepairPanel", () => {
  it("previews drift before enabling the audited repair", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        scanned: 79,
        drifted: 3,
        repaired: 0,
        failed: 0,
        anomalies: [{ companyId: "company-1", domain: "example.com", reasons: ["twenty_summary_drift"], repaired: false, error: null }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        scanned: 79,
        drifted: 3,
        repaired: 3,
        failed: 0,
        anomalies: [],
      }), { status: 200, headers: { "content-type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    await act(async () => root.render(<ListLeadRepairPanel operatorName="Sato" />))
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")]
    const preview = buttons.find((button) => button.textContent?.includes("不整合を確認"))
    const repair = buttons.find((button) => button.textContent?.includes("不整合だけ修復"))
    if (!preview || !repair) throw new Error("repair controls not found")
    expect(repair.disabled).toBe(true)

    await act(async () => preview.click())
    await vi.waitFor(() => expect(repair.disabled).toBe(false))
    expect(container.textContent).toContain("example.com: twenty_summary_drift")

    await act(async () => repair.click())
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ action: "preview", operatorName: "Sato", limit: 100 })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ action: "repair", operatorName: "Sato", limit: 100 })
    expect(toast.success).toHaveBeenCalledWith("3社を修復。外部送信0件")
  })
})
