import { withContext } from "./browser.js"

export interface ScreenshotInput {
  url?: string
  width?: number
  height?: number
  isMobile?: boolean
}

export interface ScreenshotResult {
  ok: boolean
  screenshot?: string
  contentType?: string
  error?: string
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

export async function captureScreenshot(input: ScreenshotInput): Promise<ScreenshotResult> {
  if (!input.url || !/^https?:\/\//i.test(input.url)) {
    return { ok: false, error: "valid url is required" }
  }

  const width = positiveInt(input.width, input.isMobile ? 390 : 1280, 1920)
  const height = positiveInt(input.height, input.isMobile ? 844 : 800, 2400)

  try {
    const buffer = await withContext(async (ctx) => {
      const page = await ctx.newPage()
      await page.setViewportSize({ width, height })
      await page.goto(input.url as string, { waitUntil: "domcontentloaded", timeout: 45_000 })
      await page.addStyleTag({
        content: `
          #cookie-consent, .cookie-banner, .cookie-consent, [id*="cookie"], [class*="cookie"] { display: none !important; }
          .fc-consent-root, #drift-widget-container, #hubspot-messages-iframe-container { display: none !important; }
          iframe[src*="intercom"], iframe[src*="chat"], [class*="chat-widget"], [id*="chat-widget"] { display: none !important; }
        `,
      }).catch(() => undefined)
      await page.waitForTimeout(700)
      return await page.screenshot({ type: "png", fullPage: false })
    })

    return {
      ok: true,
      screenshot: Buffer.from(buffer).toString("base64"),
      contentType: "image/png",
    }
  } catch (error) {
    console.error("[worker/screenshot] capture failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
