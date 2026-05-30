import { afterEach, describe, expect, it, vi } from "vitest"
import { detectTechStack } from "./wappalyzer"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("detectTechStack", () => {
  it("detects framework, analytics, bot protection, and header evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          [
            '<script src="/_next/static/app.js"></script>',
            '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script>',
            '<div class="cf-turnstile"></div>',
          ].join(""),
          {
            status: 200,
            headers: {
              server: "cloudflare",
              "cf-cache-status": "DYNAMIC",
            },
          },
        ),
      ),
    )

    const result = await detectTechStack("https://example.com")
    const names = result.tech.map((item) => item.name)
    expect(names).toContain("Next.js")
    expect(names).toContain("Google Tag Manager")
    expect(names).toContain("Cloudflare")
    expect(names).toContain("Cloudflare Turnstile")
  })
})
