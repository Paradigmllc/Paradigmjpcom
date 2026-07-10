import { describe, expect, it } from "vitest"
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "./security-headers"

describe("public HTTP security headers", () => {
  it("sets the browser hardening headers on every response", () => {
    const headers = new Map(
      buildSecurityHeaders(true).map(({ key, value }) => [key, value]),
    )

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000")
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN")
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    )
    expect(headers.get("Permissions-Policy")).toContain("camera=()")
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups",
    )
  })

  it("keeps CSP compatible with the public integrations without allowing plugins", () => {
    const policy = buildContentSecurityPolicy(true)

    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("frame-ancestors 'self'")
    expect(policy).toContain("https://challenges.cloudflare.com")
    expect(policy).toContain("https://www.googletagmanager.com")
    expect(policy).toContain("https://connect.facebook.net")
    expect(policy).toContain("https://fonts.googleapis.com")
    expect(policy).toContain("https://fonts.gstatic.com")
    expect(policy).toContain("img-src 'self' data: blob: https:")
    expect(policy).toContain("connect-src 'self' https: wss:")
    expect(policy).toContain("upgrade-insecure-requests")
    const scriptSources = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src "))
      ?.split(" ")
      .slice(1)
    expect(scriptSources).not.toContain("https:")
  })

  it("does not upgrade local HTTP development requests", () => {
    expect(buildContentSecurityPolicy(false)).not.toContain(
      "upgrade-insecure-requests",
    )
  })
})
