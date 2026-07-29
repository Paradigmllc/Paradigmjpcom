import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createAdminSessionToken } from "@/lib/admin-auth"
import { GET } from "./route"

describe("work API session bootstrap", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sets a short-lived HttpOnly API cookie and returns to /work", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const adminToken = createAdminSessionToken()
    const request = new NextRequest("https://paradigmjp.com/work/session?redirect=%2Fwork", {
      headers: { cookie: `paradigm_admin_token=${adminToken}` },
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://paradigmjp.com/work")
    const cookie = response.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("paradigm_work_api_token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("SameSite=strict")
  })

  it("rejects open redirects", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const adminToken = createAdminSessionToken()
    const request = new NextRequest("https://paradigmjp.com/work/session?redirect=https%3A%2F%2Fevil.example", {
      headers: { cookie: `paradigm_admin_token=${adminToken}` },
    })

    const response = await GET(request)
    expect(response.headers.get("location")).toBe("https://paradigmjp.com/work")
  })
})
