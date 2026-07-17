import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  after: vi.fn((callback: () => Promise<void>) => { void callback() }),
  authorize: vi.fn(),
  dispatch: vi.fn(),
  getSupabase: vi.fn(),
  queue: vi.fn(),
}))

vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: mocks.after,
}))
vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/demo-batch-drain", () => ({ dispatchDemoBatchDrain: mocks.dispatch }))
vi.mock("@/lib/sales/demo-list-candidate", () => ({ queueListCandidateDemoForCompany: mocks.queue }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getSupabase }))

import { POST } from "./route"

const companyId = "11111111-1111-4111-8111-111111111111"

function query(data: unknown) {
  const builder = { select: vi.fn(), in: vi.fn() }
  builder.select.mockReturnValue(builder)
  builder.in.mockResolvedValue({ data, error: null })
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.dispatch.mockResolvedValue({ ok: true, status: 200 })
  mocks.queue.mockResolvedValue({ ok: true, companyId, companyName: "サンプル", status: "queued" })
})

describe("list candidate demo route", () => {
  it("queues selected companies as a non-send generated-visual wave", async () => {
    const builder = query([{
      id: companyId,
      company_name: "サンプル",
      company_name_key: null,
      region: "jp",
      domain: "local-sample.no-website.local",
      meta: {},
    }])
    mocks.getSupabase.mockReturnValue({ from: vi.fn().mockReturnValue(builder) })
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/list-candidates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyIds: [companyId], locale: "ja" }),
    }))
    const body = await response.json()
    expect(response.status).toBe(202)
    expect(body).toMatchObject({ ok: true, queued: 1, rejected: 0, sendingEnabled: false, sourcePolicy: "list_candidate_generated_visual" })
    expect(mocks.queue).toHaveBeenCalledWith(expect.objectContaining({ id: companyId }), "ja", "list_candidate_generated_visual", expect.any(String))
    await vi.waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1))
  })

  it("rejects an unauthenticated request before reading the database", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await POST(new NextRequest("https://paradigmjp.com/api/sales/demo-site/list-candidates", {
      method: "POST",
      body: JSON.stringify({ companyIds: [companyId] }),
    }))
    expect(response.status).toBe(401)
    expect(mocks.getSupabase).not.toHaveBeenCalled()
  })
})

