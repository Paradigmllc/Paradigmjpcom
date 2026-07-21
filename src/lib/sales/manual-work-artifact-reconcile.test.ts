import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  restore: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getServiceSalesSupabase }))
vi.mock("./manual-work-artifact-authority", () => ({ restoreManualWorkTwentyHomes: mocks.restore }))

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

beforeEach(() => vi.clearAllMocks())

describe("manual work artifact reconciliation", () => {
  it("reconciles 100 companies in one bulk authority pass with zero sends", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      domain: `company-${index}.example`,
      twenty_company_id: `twenty-${index}`,
      sent: false,
    }))
    mocks.getServiceSalesSupabase.mockReturnValue(queryResult(rows))
    mocks.restore.mockResolvedValue(rows.map((row) => ({ domain: row.domain, protected: true })))

    const result = await reconcileManualWorkArtifacts({ limit: 100 })

    expect(result).toEqual({ checked: 100, repaired: 100, skipped: 0, failed: 0, errors: [], sent: 0 })
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
})
