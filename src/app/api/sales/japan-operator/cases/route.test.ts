import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  rpc: vi.fn(),
  caseSingle: vi.fn(),
  companySingle: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({
    rpc: mocks.rpc,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: table === "sales_japan_operator_cases" ? mocks.caseSingle : mocks.companySingle,
        }),
      }),
    }),
  }),
}))

import { PATCH } from "./route"

const caseId = "11111111-1111-4111-8111-111111111111"
const companyId = "22222222-2222-4222-8222-222222222222"

function request(body: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/japan-operator/cases", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("Japan operator case API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue(true)
    mocks.caseSingle.mockResolvedValue({
      data: {
        id: caseId,
        company_id: companyId,
        stage: "memo_ready",
        status: "active",
        revision: 3,
        gate_data: {},
      },
      error: null,
    })
    mocks.companySingle.mockResolvedValue({ data: { company_name: "CHEFCLEAN" }, error: null })
    mocks.rpc.mockResolvedValue({ data: [{ id: caseId, stage: "human_approved", revision: 4 }], error: null })
    mocks.notify.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated case mutations", async () => {
    mocks.authorize.mockResolvedValue(false)
    const response = await PATCH(request({
      action: "advance",
      caseId,
      expectedRevision: 3,
      actor: "Sato",
      note: "Human review completed",
    }))
    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("fails closed when next-stage checks are incomplete", async () => {
    const response = await PATCH(request({
      action: "advance",
      caseId,
      expectedRevision: 3,
      actor: "Sato",
      note: "Human review completed",
    }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ ok: false, error: "次ステージの入場条件が未完了です" })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it("advances atomically and notifies DB bell plus Slack after all gates pass", async () => {
    mocks.caseSingle.mockResolvedValue({
      data: {
        id: caseId,
        company_id: companyId,
        stage: "memo_ready",
        status: "active",
        revision: 3,
        gate_data: {
          human_approved: {
            factual_claims_reviewed: true,
            financial_assumptions_labeled: true,
            legal_disclaimer_present: true,
            send_copy_approved: true,
          },
        },
      },
      error: null,
    })
    const response = await PATCH(request({
      action: "advance",
      caseId,
      expectedRevision: 3,
      actor: "Sato",
      note: "Facts, assumptions and send copy reviewed",
    }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith("sales_apply_japan_operator_action", expect.objectContaining({
      p_action: "advance",
      p_to_stage: "human_approved",
      p_expected_revision: 3,
    }))
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.stringContaining("CHEFCLEAN"),
      expect.objectContaining({ type: "japan_operator_stage_advanced" }),
    )
  })

  it("does not expose an external-send action", async () => {
    const response = await PATCH(request({
      action: "send_message",
      caseId,
      expectedRevision: 3,
      actor: "Sato",
      note: "Attempt external send",
    }))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
