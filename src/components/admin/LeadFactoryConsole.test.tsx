// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LeadFactoryConsole } from "./LeadFactoryConsole"

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

vi.mock("sonner", () => ({ toast, Toaster: () => null }))

const staleRun = {
  id: "run-stale",
  source_slug: "evidence_first_sources",
  country_code: "US",
  technology: "Shopify",
  status: "running",
  execution_mode: "pilot",
  operator_status: "pending_review",
  cancel_requested: false,
  requested_limit: 1000,
  verify_limit: 120,
  min_opportunity_score: 68,
  min_smb_score: 50,
  min_form_confidence: 80,
  fetched_count: 1000,
  verified_count: 108,
  scored_count: 104,
  source_qualified_count: 44,
  quality_rejected_count: 40,
  review_required_count: 16,
  forms_checked_count: 108,
  forms_qualified_count: 40,
  promoted_count: 0,
  operator_approved_count: 0,
  operator_rejected_count: 0,
  twenty_synced_count: 0,
  failure_count: 4,
  error_message: null,
  heartbeat_at: "2026-07-14T00:00:00.000Z",
  started_at: "2026-07-14T00:00:00.000Z",
  created_at: "2026-07-14T00:00:00.000Z",
  updated_at: "2026-07-14T00:00:00.000Z",
}

class FakeEventSource {
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  vi.stubGlobal("EventSource", FakeEventSource)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe("LeadFactoryConsole stalled run recovery", () => {
  it("shows stale activity and resumes through the authenticated process API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/runs/run-stale/process")) {
        return new Response(JSON.stringify({ ok: true, processed: 12, twentySynced: 0, hasMore: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      if (url.includes("/lead-candidates/factory")) {
        return new Response(JSON.stringify({ ok: true, runs: init?.method === "POST" ? [] : [staleRun] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      if (url.endsWith("/api/sales/lead-sources")) {
        return new Response(JSON.stringify({ ok: true, sources: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    await act(async () => root.render(<LeadFactoryConsole />))
    await vi.waitFor(() => expect(container.querySelector<HTMLButtonElement>('button[aria-label="USの停滞runを再開"]')).not.toBeNull())
    const operator = container.querySelector<HTMLInputElement>("#factory-operator")
    if (!operator) throw new Error("operator input not found")
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      if (!valueSetter) throw new Error("input value setter not found")
      valueSetter.call(operator, "Sato")
      operator.dispatchEvent(new Event("input", { bubbles: true }))
    })
    const recover = container.querySelector<HTMLButtonElement>('button[aria-label="USの停滞runを再開"]')
    if (!recover) throw new Error("stalled run recovery button not found")
    await act(async () => recover.click())

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/sales/lead-candidates/runs/run-stale/process",
      expect.objectContaining({ method: "POST" }),
    ))
    const recoveryCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/runs/run-stale/process"))
    expect(recoveryCall).toBeDefined()
    expect(JSON.parse(String(recoveryCall?.[1]?.body))).toEqual({ async: false, batchSize: 24, maxBatches: 10, operatorName: "Sato" })
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("12件を復旧し、人手レビュー待ちへ進めました。Twenty同期0件"))
  })
})
