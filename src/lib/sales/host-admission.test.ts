import { describe, it, expect, vi, afterEach } from "vitest"
import { shouldDeferHeavyDispatch, admissionCap } from "./host-admission"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("admission gate (Phase 9-9)", () => {
  it("is disabled (fail-open) when ADMISSION_MAX_RUNNING_JOBS is unset", async () => {
    vi.stubEnv("ADMISSION_MAX_RUNNING_JOBS", "")
    expect(admissionCap()).toBeNull()
    await expect(shouldDeferHeavyDispatch()).resolves.toBe(false)
  })

  it("is disabled for invalid / non-positive caps", async () => {
    vi.stubEnv("ADMISSION_MAX_RUNNING_JOBS", "0")
    expect(admissionCap()).toBeNull()
    await expect(shouldDeferHeavyDispatch()).resolves.toBe(false)
    vi.stubEnv("ADMISSION_MAX_RUNNING_JOBS", "abc")
    expect(admissionCap()).toBeNull()
  })

  it("parses a positive cap", () => {
    vi.stubEnv("ADMISSION_MAX_RUNNING_JOBS", "5")
    expect(admissionCap()).toBe(5)
  })

  it("admits (returns false) when Supabase is not configured even with a cap set", async () => {
    vi.stubEnv("ADMISSION_MAX_RUNNING_JOBS", "5")
    // No SALES_SUPABASE service role in the test env -> getServiceSalesSupabase() is null -> fail open
    await expect(shouldDeferHeavyDispatch()).resolves.toBe(false)
  })
})
