import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  inFilter: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  insertWithOptionalColumns: vi.fn(),
  requireTwentyAuth: vi.fn(),
  twentyFetch: vi.fn(),
  listLeadTwentyPayload: vi.fn(),
  listLeadTwentyReadbackIssues: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getServiceSalesSupabase }))
vi.mock("./safe-supabase-insert", () => ({ insertWithOptionalColumns: mocks.insertWithOptionalColumns }))
vi.mock("./twenty-health", () => ({ requireTwentyAuth: mocks.requireTwentyAuth }))
vi.mock("./twenty-sync-list-lead", () => ({
  listLeadTwentyPayload: mocks.listLeadTwentyPayload,
  listLeadTwentyReadbackIssues: mocks.listLeadTwentyReadbackIssues,
}))
vi.mock("./twenty-sync-utils", () => ({
  domainMatches: (record: { domainName?: { primaryLinkUrl?: string } }, domain: string) => record.domainName?.primaryLinkUrl?.includes(domain) === true,
  twentyFetch: mocks.twentyFetch,
}))

import { syncListLeadsToTwentyBatch } from "./twenty-sync-list-lead-batch"

const company = {
  id: "11111111-1111-4111-8111-111111111111",
  company_name: "Example LLC",
  domain: "example.com",
  target_country: "US",
  source: "evidence_first_sources",
  tech_stack: null,
  meta: { list_only: true, skip_enrichment: true, contact_form_url: "https://example.com/contact" },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.inFilter.mockResolvedValue({ data: [company], error: null })
  mocks.from.mockReturnValue({ select: () => ({ in: mocks.inFilter }) })
  mocks.rpc.mockResolvedValue({ data: [{ company_id: company.id }], error: null })
  mocks.getServiceSalesSupabase.mockReturnValue({ from: mocks.from, rpc: mocks.rpc })
  mocks.insertWithOptionalColumns.mockResolvedValue({ error: null })
  mocks.listLeadTwentyPayload.mockReturnValue({
    paradigmLeadStatus: "フォーム確認済み / Twenty登録済み / 未送信",
    paradigmCountryName: "米国",
    paradigmNextAction: "候補レビュー待ち（未送信）",
    paradigmKarteSummary: { markdown: "未送信" },
  })
  mocks.listLeadTwentyReadbackIssues.mockReturnValue([])
  mocks.twentyFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/rest/companies?") && path.includes("domainName")) {
      return { ok: true, data: { data: { companies: [] } } }
    }
    if (path === "/rest/batch/companies?upsert=true&depth=0") {
      return { ok: true, data: { data: { createCompanies: [{ id: company.id }] } } }
    }
    if (path.startsWith("/rest/companies?") && path.includes("id%5Beq%5D")) {
      return { ok: true, data: { data: { companies: [{ id: company.id }] } } }
    }
    throw new Error(`Unexpected Twenty path: ${path}`)
  })
})

describe("syncListLeadsToTwentyBatch", () => {
  it("upserts a full list-only record once, reads it back and reconciles the DB", async () => {
    const result = await syncListLeadsToTwentyBatch([company.id])

    expect(result).toEqual([{ companyId: company.id, ok: true, twentyCompanyId: company.id }])
    const batchCall = mocks.twentyFetch.mock.calls.find(([path]) => path === "/rest/batch/companies?upsert=true&depth=0")
    expect(batchCall?.[1]).toEqual(expect.objectContaining({ method: "POST" }))
    expect(JSON.parse(String(batchCall?.[1]?.body))).toEqual([
      expect.objectContaining({
        id: company.id,
        name: company.company_name,
        paradigmLeadStatus: "フォーム確認済み / Twenty登録済み / 未送信",
      }),
    ])
    expect(mocks.listLeadTwentyReadbackIssues).toHaveBeenCalledOnce()
    expect(mocks.rpc).toHaveBeenCalledWith("sales_reconcile_list_lead_twenty_batch", expect.objectContaining({
      p_rows: [expect.objectContaining({ company_id: company.id, twenty_company_id: company.id })],
    }))
  })

  it("fails closed without local reconciliation when the Twenty batch write fails", async () => {
    mocks.twentyFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/rest/companies?")) return { ok: true, data: { data: { companies: [] } } }
      return { ok: false, error: "Twenty HTTP 429" }
    })

    await expect(syncListLeadsToTwentyBatch([company.id])).resolves.toEqual([
      { companyId: company.id, ok: false, error: "Twenty HTTP 429" },
    ])
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.listLeadTwentyReadbackIssues).not.toHaveBeenCalled()
  })
})
