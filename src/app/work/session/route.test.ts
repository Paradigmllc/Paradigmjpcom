import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createAdminSessionToken } from "@/lib/admin-auth"
import { GET } from "./route"

describe("work API session bootstrap", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sets a short-lived HttpOnly API cookie and returns with a relative redirect", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const adminToken = createAdminSessionToken()
    const request = new NextRequest("https://paradigmjp.com/work/session?redirect=%2Fwork", {
      headers: { cookie: `paradigm_admin_token=${adminToken}` },
    })

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/work")
    const cookie = response.headers.get("set-cookie") ?? ""
    expect(cookie).toContain("paradigm_work_api_token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("SameSite=strict")
  })

  it("never redirects the browser to the internal Coolify listener", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const adminToken = createAdminSessionToken()
    const request = new NextRequest("http://0.0.0.0:3000/work/session?redirect=%2Fwork", {
      headers: {
        cookie: `paradigm_admin_token=${adminToken}`,
        "x-forwarded-host": "www.paradigmjp.com",
        "x-forwarded-proto": "https",
      },
    })

    const response = await GET(request)

    expect(response.headers.get("location")).toBe("/work")
    expect(response.headers.get("location")).not.toContain("0.0.0.0")
    expect(response.headers.get("set-cookie") ?? "").toContain("Secure")
  })

  it("rejects open redirects", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(32))
    const adminToken = createAdminSessionToken()
    const request = new NextRequest("https://paradigmjp.com/work/session?redirect=https%3A%2F%2Fevil.example", {
      headers: { cookie: `paradigm_admin_token=${adminToken}` },
    })

    const response = await GET(request)
    expect(response.headers.get("location")).toBe("/work")
  })
})
