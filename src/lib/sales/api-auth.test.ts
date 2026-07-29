import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createAdminApiSessionToken } from "@/lib/admin-auth"
import { isSalesApiAuthorized } from "./api-auth"

describe("sales API authorization", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts the short-lived work API session cookie", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const token = createAdminApiSessionToken()
    const request = new NextRequest("https://paradigmjp.com/api/work/batches", {
      headers: { cookie: `paradigm_work_api_token=${token}` },
    })

    expect(await isSalesApiAuthorized(request)).toBe(true)
  })
})
