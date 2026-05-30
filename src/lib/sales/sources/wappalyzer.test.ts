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

  it("detects Shopify, TikTok Pixel, and Klaviyo for global SMB offers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          [
            '<script src="https://cdn.shopify.com/s/files/1/theme.js"></script>',
            '<script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>',
            "<script>ttq.load('PIXEL_ID'); window._learnq = window._learnq || [];</script>",
            '<script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>',
          ].join(""),
          { status: 200 },
        ),
      ),
    )

    const result = await detectTechStack("https://shop.example")
    const names = result.tech.map((item) => item.name)
    expect(names).toContain("Shopify")
    expect(names).toContain("TikTok Pixel")
    expect(names).toContain("Klaviyo")
  })
})
