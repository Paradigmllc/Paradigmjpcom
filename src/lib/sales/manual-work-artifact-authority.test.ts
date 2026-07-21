import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  parseProfile: vi.fn(),
  resolveReport: vi.fn(),
  isCurrentReport: vi.fn(),
  syncManual: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getServiceSalesSupabase }))
vi.mock("./manual-japan-entry-profile", () => ({ parseManualCompanyProfile: mocks.parseProfile }))
vi.mock("./manual-japan-entry-report-resolver", () => ({ resolveManualJapanEntryReportData: mocks.resolveReport }))
vi.mock("./manual-japan-entry-report-types", () => ({ isManualJapanEntryReportData: mocks.isCurrentReport }))
vi.mock("./manual-japan-entry-twenty", () => ({ syncManualWorkToTwenty: mocks.syncManual }))

import {
  findManualWorkLegacyReportAlias,
  restoreManualWorkTwentyHome,
} from "./manual-work-artifact-authority"

function builder(result: { data: unknown; error: { message: string } | null }) {
  const chain: Record<string, unknown> = {}
  for (const method of ["select", "eq", "in", "not", "order", "limit", "update"]) {
    chain[method] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn(async () => result)
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

function supabaseResults(...results: Array<{ data: unknown; error: { message: string } | null }>) {
  const queue = [...results]
  return { from: vi.fn(() => builder(queue.shift() ?? { data: null, error: null })) }
}

const reportUrl = "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isCurrentReport.mockReturnValue(false)
  mocks.resolveReport.mockReturnValue({ schemaVersion: "manual_japan_entry_strategy_v4" })
  mocks.parseProfile.mockReturnValue({
    companyName: "Paperform",
    smbStatus: "qualified",
    japanEntryFitStatus: "qualified",
  })
  mocks.syncManual.mockResolvedValue({ status: "synced", companyId: "twenty-paperform" })
})

describe("manual work artifact authority", () => {
  it("maps an unambiguous legacy report slug to the dedicated report token", async () => {
    mocks.getServiceSalesSupabase.mockReturnValue(supabaseResults({
      data: [{
        report_token: "11111111-1111-4111-8111-111111111111",
        company_name: "Paperform",
        report_url: reportUrl,
      }],
      error: null,
    }))

    await expect(findManualWorkLegacyReportAlias("paperform")).resolves.toEqual({
      token: "11111111-1111-4111-8111-111111111111",
      companyName: "Paperform",
    })
  })

  it("does not guess when a legacy slug is ambiguous", async () => {
    mocks.getServiceSalesSupabase.mockReturnValue(supabaseResults({
      data: [
        { report_token: "11111111-1111-4111-8111-111111111111", company_name: "Acme", report_url: reportUrl },
        { report_token: "22222222-2222-4222-8222-222222222222", company_name: "Acme", report_url: reportUrl.replace(/1/g, "2") },
      ],
      error: null,
    }))

    await expect(findManualWorkLegacyReportAlias("acme")).resolves.toBeNull()
  })

  it("rebuilds V4 and restores exact /work artifacts instead of allowing a legacy overwrite", async () => {
    const item = {
      id: "work-paperform",
      domain: "paperform.co",
      report_url: reportUrl,
      report_data: { schemaVersion: "manual_japan_entry_v2" },
      profile: {},
      form_url: "https://paperform.co/contact",
      initial_message: "Hello Paperform team",
      message_review: { passed: true },
      error_message: null,
      twenty_sync_status: "synced",
      source_attributions: [],
    }
    mocks.getServiceSalesSupabase.mockReturnValue(supabaseResults(
      { data: item, error: null },
      { data: { id: item.id }, error: null },
      { data: null, error: null },
    ))

    await expect(restoreManualWorkTwentyHome({
      twentyCompanyId: "twenty-paperform",
      domain: "paperform.co",
    })).resolves.toEqual({ protected: true, reportUrl, workId: item.id })

    expect(mocks.resolveReport).toHaveBeenCalledWith(expect.objectContaining({ id: item.id }))
    expect(mocks.syncManual).toHaveBeenCalledWith(expect.objectContaining({
      domain: "paperform.co",
      reportUrl,
      ownedCompanyId: "twenty-paperform",
      readiness: { sendReady: true, reasons: [] },
    }))
  })
})
