import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  restore: vi.fn(),
  isCurrentReport: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getServiceSalesSupabase }))
vi.mock("./manual-work-artifact-authority", () => ({ restoreManualWorkTwentyHomes: mocks.restore }))
vi.mock("./manual-japan-entry-report-types", () => ({ isManualJapanEntryReportData: mocks.isCurrentReport }))

import { reconcileManualWorkArtifacts } from "./manual-work-artifact-reconcile"

function queryResult(data: unknown[]) {
  const result = { data, error: null }
  const chain: Record<string, unknown> = {}
  for (const method of ["select", "in", "not", "order", "limit", "eq"]) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return { from: vi.fn(() => chain) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isCurrentReport.mockImplementation((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false
    return (value as Record<string, unknown>).schemaVersion === "manual_japan_entry_strategy_v4"
  })
})

describe("manual work artifact reconciliation", () => {
  it("reconciles 500 companies in one bulk authority pass with zero sends", async () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: `work-${index}`,
      domain: `company-${index}.example`,
      twenty_company_id: `twenty-${index}`,
      report_url: `https://paradigmjp.com/en/work-report/${String(index).padStart(36, "0")}`,
      report_data: { schemaVersion: "manual_japan_entry_strategy_v4" },
      sent: false,
    }))
    mocks.getServiceSalesSupabase.mockReturnValue(queryResult(rows))
    mocks.restore.mockResolvedValue(rows.map((row) => ({ domain: row.domain, protected: true })))

    const result = await reconcileManualWorkArtifacts({ limit: 500 })

    expect(result).toEqual({
      checked: 500,
      repaired: 500,
      skipped: 0,
      failed: 0,
      errors: [],
      currentReports: 500,
      legacyReports: 0,
      sent: 0,
    })
    expect(mocks.restore).toHaveBeenCalledTimes(1)
    expect(mocks.restore).toHaveBeenCalledWith(rows)
  })

  it("fails closed if the zero-send invariant is ever violated", async () => {
    mocks.getServiceSalesSupabase.mockReturnValue(queryResult([{
      domain: "unsafe.example",
      twenty_company_id: "twenty-unsafe",
      sent: true,
    }]))

    await expect(reconcileManualWorkArtifacts({ limit: 1 })).rejects.toThrow("Zero-send invariant violation")
    expect(mocks.restore).not.toHaveBeenCalled()
  })

  it("reports a legacy database read-back as a reconciliation failure", async () => {
    const row = {
      id: "work-legacy",
      domain: "legacy.example",
      report_url: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
      report_data: { schemaVersion: "manual_japan_entry_v2" },
      sent: false,
    }
    mocks.getServiceSalesSupabase.mockReturnValue(queryResult([row]))
    mocks.restore.mockResolvedValue([{ domain: row.domain, protected: true }])

    await expect(reconcileManualWorkArtifacts({ limit: 1 })).resolves.toMatchObject({
      checked: 1,
      repaired: 1,
      currentReports: 0,
      legacyReports: 1,
      failed: 1,
      sent: 0,
    })
  })
})
