import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/admin-auth", () => ({
  authorizePayloadAdminRequest: vi.fn(),
}))

import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { proxyVideoFactoryRequest } from "./video-factory-internal-proxy"

const mockedAuthorize = vi.mocked(authorizePayloadAdminRequest)

describe("Video Factory internal proxy redirects", () => {
  beforeEach(() => {
    mockedAuthorize.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns a relative admin-login redirect for HTML navigation", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: false,
      source: "none",
      userEmail: null,
    })
    const request = new NextRequest("http://0.0.0.0:3000/console/", {
      headers: { accept: "text/html" },
    })

    const response = await proxyVideoFactoryRequest(request, "/console/")

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "/admin/login?redirect=%2Fadmin%2Fvideo-factory",
    )
    expect(response.headers.get("location")).not.toContain("0.0.0.0")
  })

  it("supports a cache-safe alias as the post-login destination", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: false,
      source: "none",
      userEmail: null,
    })
    const request = new NextRequest(
      "http://0.0.0.0:3000/video-factory-console/",
      { headers: { accept: "text/html" } },
    )

    const response = await proxyVideoFactoryRequest(request, "/console/", {
      loginRedirectPath: "/video-factory-console/",
    })

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "/admin/login?redirect=%2Fvideo-factory-console%2F",
    )
  })

  it("rewrites console asset URLs for a cache-safe public alias", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: true,
      source: "legacy",
      userEmail: null,
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(
        '<!doctype html><link href="/console/console.css"><script src="/console/console.js"></script></body>',
        { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
      )),
    )
    const request = new NextRequest(
      "http://0.0.0.0:3000/video-factory-console/",
      { headers: { accept: "text/html" } },
    )

    const response = await proxyVideoFactoryRequest(request, "/console/", {
      consoleEntry: true,
      consolePublicBase: "/video-factory-console/",
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('/video-factory-console/console.css')
    expect(html).toContain('/video-factory-console/console.js')
    expect(html).toContain('/video-factory-console/console-run-poll.js')
    expect(html).not.toContain('"/console/')
  })

  it("rewrites an internal upstream Location and preserves public forwarded headers", async () => {
    mockedAuthorize.mockResolvedValue({
      ok: true,
      source: "legacy",
      userEmail: null,
    })
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get("x-forwarded-host")).toBe("www.paradigmjp.com")
      expect(headers.get("x-forwarded-proto")).toBe("https")
      return new Response(null, {
        status: 307,
        headers: { location: "http://127.0.0.1:8080/console/" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)
    const request = new NextRequest("http://0.0.0.0:3000/console", {
      headers: {
        accept: "text/html",
        host: "0.0.0.0:3000",
        "x-forwarded-host": "www.paradigmjp.com",
        "x-forwarded-proto": "https",
      },
    })

    const response = await proxyVideoFactoryRequest(request, "/console")

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/console/")
    expect(response.headers.get("location")).not.toContain("127.0.0.1")
  })
})
