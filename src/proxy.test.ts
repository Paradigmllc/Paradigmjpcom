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
    const response = proxy(new NextRequest("https://demo.paradigmjp.com/ja/example/about", {
      headers: { host: "demo.paradigmjp.com" },
    }))
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://demo.paradigmjp.com/ja/demo/example/about")
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
    expect(response.headers.get("location")).toBe("https://demo.paradigmjp.com/ja/example/services")
  })
})
