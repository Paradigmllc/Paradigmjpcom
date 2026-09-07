import { afterEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn(() => ({ from: vi.fn() })))
vi.mock("@supabase/supabase-js", () => ({ createClient }))

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); createClient.mockClear() })

describe("browser Supabase configuration", () => {
  it("uses public settings and reuses the client without exposing a service key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-public-key")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-server-only-key")
    const { getSupabaseClient } = await import("./supabase")
    expect(getSupabaseClient()).toBe(getSupabaseClient())
    expect(createClient).toHaveBeenCalledExactlyOnceWith("https://fixture.supabase.co", "fixture-public-key")
  })
  it("reports missing public configuration without creating a client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { getSupabaseClient } = await import("./supabase")
    expect(getSupabaseClient()).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith("[supabase] NEXT_PUBLIC_SUPABASE_URL is not configured")
    expect(error).toHaveBeenCalledWith("[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured")
  })
})
