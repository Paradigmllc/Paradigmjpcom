import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/admin-auth", () => ({
  authorizePayloadAdminRequest: vi.fn(),
}))

import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { GET } from "./route"

const mockedAuthorize = vi.mocked(authorizePayloadAdminRequest)

describe("Video Factory admin launcher", () => {
  beforeEach(() => {
    mockedAuthorize.mockReset()
  })

  it("redirects an authenticated admin to the cache-safe public console path", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: true,
      source: "legacy",
      userEmail: null,
    })
    const request = new NextRequest(
      "http://0.0.0.0:3000/admin/video-factory",
      {
        headers: {
          "x-forwarded-host": "www.paradigmjp.com",
          "x-forwarded-proto": "https",
        },
      },
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/video-factory-console/")
    expect(response.headers.get("location")).not.toContain("0.0.0.0")
    expect(response.headers.get("cache-control")).toContain("no-store")
  })

  it("keeps an unauthenticated login redirect relative as well", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: false,
      source: "none",
      userEmail: null,
    })
    const request = new NextRequest(
      "http://0.0.0.0:3000/admin/video-factory",
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "/admin/login?redirect=%2Fvideo-factory-console%2F",
    )
    expect(response.headers.get("location")).not.toContain("0.0.0.0")
  })
})
