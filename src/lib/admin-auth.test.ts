import { afterEach, describe, expect, it, vi } from "vitest"
import { createAdminSessionToken, verifyAdminSessionToken } from "./admin-auth"

describe("admin session tokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("signs and verifies a non-password session token", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    vi.stubEnv("ADMIN_PASSWORD", "b".repeat(32))
    const token = createAdminSessionToken(1_700_000_000_000)
    expect(token).toBeTruthy()
    expect(token).not.toContain("b".repeat(32))
    expect(verifyAdminSessionToken(token, 1_700_000_001_000)).toBe(true)
  })

  it("rejects tampered and expired tokens", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const token = createAdminSessionToken(1_700_000_000_000)
    expect(verifyAdminSessionToken(`${token}x`, 1_700_000_001_000)).toBe(false)
    expect(verifyAdminSessionToken(token, 1_700_604_801_000)).toBe(false)
  })
})
