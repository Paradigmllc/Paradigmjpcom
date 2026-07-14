import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  listRuns: vi.fn(),
  createRun: vi.fn(),
  startRun: vi.fn(),
  from: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/lead-inventory-runs", () => ({
  listLeadInventoryRuns: mocks.listRuns,
  createLeadInventoryRun: mocks.createRun,
  startLeadInventoryRun: mocks.startRun,
}))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => ({ from: mocks.from }) }))

import { GET, POST } from "./route"

let sourceQuery: Record<string, unknown>

function post(body: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/lead-inventory/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.listRuns.mockResolvedValue([])
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.createRun.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", status: "queued" })
  mocks.startRun.mockReturnValue({ started: true, alreadyRunning: false })
  sourceQuery = {}
  sourceQuery.select = vi.fn(() => sourceQuery)
  sourceQuery.eq = vi.fn(() => sourceQuery)
  sourceQuery.not = vi.fn(() => sourceQuery)
  sourceQuery.in = vi.fn(() => sourceQuery)
  sourceQuery.limit = vi.fn(async () => ({ data: [{ id: "22222222-2222-4222-8222-222222222222" }], error: null }))
  mocks.from.mockReturnValue(sourceQuery)
})

describe("verified lead inventory routes", () => {
  it("rejects unauthenticated inventory reads", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await GET(new NextRequest("https://paradigmjp.com/api/sales/lead-inventory/runs"))

    expect(response.status).toBe(401)
    expect(mocks.listRuns).not.toHaveBeenCalled()
  })

  it("starts approved source ingestion without delivery capabilities", async () => {
    const response = await POST(post({ operatorName: "Sato" }))

    expect(response.status).toBe(202)
    expect(mocks.createRun).toHaveBeenCalledWith({
      operatorName: "Sato",
      sourceConfigIds: ["22222222-2222-4222-8222-222222222222"],
    })
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "verified_inventory_started",
      detail: { sourceCount: 1, sendCount: 0, twentySyncCount: 0 },
    }))
    expect(mocks.startRun).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
    expect(mocks.notify).toHaveBeenCalledWith("sales", expect.objectContaining({
      message: expect.stringContaining("外部送信は実行しません"),
    }))
  })

  it("fails closed when no source pack passed governance gates", async () => {
    ;(sourceQuery.limit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [], error: null })

    const response = await POST(post({ operatorName: "Sato" }))

    expect(response.status).toBe(409)
    expect(mocks.createRun).not.toHaveBeenCalled()
  })
})
