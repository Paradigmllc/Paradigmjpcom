import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getServiceSalesSupabase: vi.fn(),
  restore: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: mocks.getServiceSalesSupabase }))
vi.mock("./manual-work-artifact-authority", () => ({ restoreManualWorkTwentyHome: mocks.restore }))

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
  it("reconciles 100 companies with bounded concurrency and zero sends", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      domain: `company-${index}.example`,
      twenty_company_id: `twenty-${index}`,
      sent: false,
    }))
    mocks.getServiceSalesSupabase.mockReturnValue(queryResult(rows))
    let active = 0
    let peak = 0
    mocks.restore.mockImplementation(async (input: { domain: string }) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active -= 1
      return { protected: true, reportUrl: `https://paradigmjp.com/en/work-report/${input.domain}`, workId: input.domain }
    })

    const result = await reconcileManualWorkArtifacts({ limit: 100 })

    expect(result).toEqual({ checked: 100, repaired: 100, skipped: 0, failed: 0, errors: [], sent: 0 })
    expect(mocks.restore).toHaveBeenCalledTimes(100)
    expect(peak).toBeLessThanOrEqual(3)
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
