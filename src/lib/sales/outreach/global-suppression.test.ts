import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ supabase: { rpc: vi.fn() } }))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => mocks.supabase }))

import { authorizeOutboundAttempt, outboundMessageSha256 } from "./global-suppression"

describe("global outbound suppression guard", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.supabase.rpc.mockReset() })

  it("hashes the normalized exact message deterministically", () => {
    expect(outboundMessageSha256("Cafe\u0301")).toBe(outboundMessageSha256("Café"))
    expect(outboundMessageSha256("Message A")).not.toBe(outboundMessageSha256("Message B"))
  })

  it("does not consume an authorization during dry run", async () => {
    const result = await authorizeOutboundAttempt({ companyId: "company", channel: "contact_form", recipient: "https://example.com/contact", message: "hello", dryRun: true })
    expect(result).toMatchObject({ allowed: true, reason: "dry_run" })
    expect(mocks.supabase.rpc).not.toHaveBeenCalled()
  })

  it("fails closed when the database blocks a suppressed contact", async () => {
    mocks.supabase.rpc.mockResolvedValueOnce({ data: [{ allowed: false, reason: "suppressed", authorization_id: null, case_id: null }], error: null })
    const result = await authorizeOutboundAttempt({ companyId: "company", channel: "contact_form", recipient: "https://example.com/contact", message: "hello", dryRun: false })
    expect(result).toMatchObject({ allowed: false, reason: "suppressed" })
    expect(mocks.supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it("consumes an operator one-time authorization before allowing submit", async () => {
    mocks.supabase.rpc.mockResolvedValueOnce({ data: [{ allowed: true, reason: "authorized", authorization_id: "auth-1", case_id: "case-1" }], error: null }).mockResolvedValueOnce({ data: true, error: null })
    const result = await authorizeOutboundAttempt({ companyId: "company", channel: "contact_form", recipient: "https://example.com/contact", message: "hello", dryRun: false })
    expect(result).toMatchObject({ allowed: true, authorizationId: "auth-1", operatorCaseId: "case-1" })
    expect(mocks.supabase.rpc).toHaveBeenNthCalledWith(2, "sales_consume_outbound_authorization", { p_authorization_id: "auth-1", p_sales_activity_id: null })
  })
})
