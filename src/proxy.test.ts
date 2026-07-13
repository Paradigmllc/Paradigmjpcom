import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { proxy } from "./proxy"

describe("public status host", () => {
  it("uses the deployed readiness endpoint instead of an optional internal dashboard", () => {
    const response = proxy(
      new NextRequest("https://status.paradigmjp.com/", {
        headers: { host: "status.paradigmjp.com" },
      }),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe("https://paradigmjp.com/api/ready")
  })
})

describe("demo subdomain", () => {
  it("rewrites the short company path to the private Next.js demo route", () => {
    const response = proxy(new NextRequest("https://demo.paradigmjp.com/example/about", {
      headers: { host: "demo.paradigmjp.com" },
    }))
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://demo.paradigmjp.com/ja/demo/example/about")
    expect(response.headers.get("x-robots-tag")).toContain("noindex")
  })

  it("keeps signed preview entry on the Next.js host", () => {
    const response = proxy(new NextRequest("https://demo.paradigmjp.com/api/demo-preview/example?token=test", {
      headers: { host: "demo.paradigmjp.com" },
    }))
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  it("redirects the legacy nested path to the short canonical path", () => {
    const response = proxy(new NextRequest("https://demo.paradigmjp.com/ja/demo/example/services", {
      headers: { host: "demo.paradigmjp.com" },
    }))
    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe("https://demo.paradigmjp.com/example/services")
  })

  it("redirects locale-prefixed demo URLs to the company-only canonical path", () => {
    const response = proxy(new NextRequest("https://demo.paradigmjp.com/ja/example/contact", {
      headers: { host: "demo.paradigmjp.com" },
    }))
    expect(response.status).toBe(308)
    expect(response.headers.get("location")).toBe("https://demo.paradigmjp.com/example/contact")
  })
})
