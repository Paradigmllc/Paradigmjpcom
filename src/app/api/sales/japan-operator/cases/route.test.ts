import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), rpc: vi.fn(), caseSingle: vi.fn(), companySingle: vi.fn(), notify: vi.fn() }))

vi.mock("@/lib/sales/api-auth", () => ({ authorizeSalesApiRequest: mocks.authorize }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))
vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({
    rpc: mocks.rpc,
    from: (table: string) => ({ select: () => ({ eq: () => ({ single: table === "sales_japan_operator_cases" ? mocks.caseSingle : mocks.companySingle }) }) }),
  }),
}))

import { PATCH } from "./route"

const caseId = "11111111-1111-4111-8111-111111111111"
const companyId = "22222222-2222-4222-8222-222222222222"
const principal = { key: "payload:user-1", email: "sato@example.com", role: "admin", authSource: "payload" }

function request(body: Record<string, unknown>) {
  return new NextRequest("https://paradigmjp.com/api/sales/japan-operator/cases", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  })
}

describe("Japan operator case API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ ok: true, principal })
    mocks.caseSingle.mockResolvedValue({ data: { id: caseId, company_id: companyId, stage: "memo_ready", status: "active", revision: 3, gate_data: {} }, error: null })
    mocks.companySingle.mockResolvedValue({ data: { company_name: "CHEFCLEAN" }, error: null })
    mocks.rpc.mockResolvedValue({ data: [{ id: caseId, stage: "human_approved", revision: 4 }], error: null })
    mocks.notify.mockResolvedValue({ ok: true, slack: { ok: true }, database: { ok: true } })
  })

  it("rejects unauthenticated case mutations", async () => {
    mocks.authorize.mockResolvedValue({ ok: false, principal: null })
    const response = await PATCH(request({ action: "advance", caseId, expectedRevision: 3, note: "Human review completed" }))
    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("fails closed when next-stage checks are incomplete", async () => {
    const response = await PATCH(request({ action: "advance", caseId, expectedRevision: 3, note: "Human review completed" }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ ok: false })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("uses a server-derived principal for atomic advancement and dual notification", async () => {
    mocks.caseSingle.mockResolvedValue({
      data: { id: caseId, company_id: companyId, stage: "memo_ready", status: "active", revision: 3,
        gate_data: { human_approved: { factual_claims_reviewed: true, financial_assumptions_labeled: true, legal_disclaimer_present: true, send_copy_approved: true } } },
      error: null,
    })
    const response = await PATCH(request({ action: "advance", caseId, expectedRevision: 3, note: "Facts, assumptions and send copy reviewed" }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith("sales_apply_japan_operator_action_v2", expect.objectContaining({
      p_action: "advance", p_to_stage: "human_approved", p_expected_revision: 3,
      p_actor_key: principal.key, p_actor_email: principal.email, p_actor_role: principal.role,
    }))
    expect(mocks.notify).toHaveBeenCalledWith(expect.stringContaining("CHEFCLEAN"), expect.objectContaining({ type: "japan_operator_case_updated" }))
  })

  it("does not expose an external-send action or accept a client actor", async () => {
    const response = await PATCH(request({ action: "send_message", caseId, expectedRevision: 3, actor: "spoofed", note: "Attempt external send" }))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
