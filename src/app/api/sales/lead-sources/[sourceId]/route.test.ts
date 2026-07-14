import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
  audit: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => ({ from: mocks.from }) }))
vi.mock("@/lib/sales/lead-operator-audit", () => ({ recordLeadOperatorEvent: mocks.audit }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { PATCH } from "./route"

const sourceId = "11111111-1111-4111-8111-111111111111"
const context = { params: Promise.resolve({ sourceId }) }

function request(body: Record<string, unknown>) {
  return new NextRequest(`https://paradigmjp.com/api/sales/lead-sources/${sourceId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.audit.mockResolvedValue(undefined)
  mocks.notify.mockResolvedValue({ ok: true })
  const query: Record<string, unknown> = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.update = mocks.update.mockImplementation(() => query)
  query.single = mocks.single
  mocks.from.mockReturnValue(query)
})

describe("lead source operator approval", () => {
  it("fails closed when preview evidence is missing", async () => {
    mocks.single.mockResolvedValueOnce({
      data: { approval_status: "draft", terms_checked: true, last_preview: {}, last_previewed_at: null },
      error: null,
    })

    const response = await PATCH(request({ approvalStatus: "approved", operatorName: "Sato" }), context)

    expect(response.status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it("activates only after a fresh successful preview and records both audit stages", async () => {
    const previewedAt = new Date().toISOString()
    mocks.single
      .mockResolvedValueOnce({
        data: { approval_status: "draft", terms_checked: true, last_preview: { accepted: 12 }, last_previewed_at: previewedAt },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: sourceId, name: "Official exporters", approval_status: "approved", terms_checked: true, active: true },
        error: null,
      })

    const response = await PATCH(request({ approvalStatus: "approved", operatorName: "Sato" }), context)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ approval_status: "approved", active: true, approved_by: "Sato" }))
    expect(mocks.audit).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: "source_update_requested", operatorName: "Sato" }))
    expect(mocks.audit).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: "approval_approved", operatorName: "Sato" }))
  })

  it("requires an operator even for non-approval mutations", async () => {
    const response = await PATCH(request({ termsChecked: true }), context)

    expect(response.status).toBe(400)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
