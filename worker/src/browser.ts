/**
 * Browser lifecycle for the outreach worker.
 *
 * - CDP_ENDPOINT set: connect to Browserless or another remote browser.
 * - CDP_ENDPOINT empty: launch one local Chromium instance and reuse it.
 * Each job gets an isolated context that is always closed after use.
 */

import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Browser, BrowserContext } from "playwright"

// Playwright Stealth reduces common automation fingerprints such as navigator.webdriver.
chromium.use(StealthPlugin())

let browserPromise: Promise<Browser> | null = null

async function launch(): Promise<Browser> {
  const cdp = process.env.CDP_ENDPOINT
  if (cdp) return chromium.connectOverCDP(cdp)

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = launch()
  return browserPromise
}

export async function withContext<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser()
  const ctx = await browser.newContext({
    locale: "ja-JP",
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  })
  try {
    return await fn(ctx)
  } finally {
    await ctx.close()
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise
  await browser.close()
  browserPromise = null
}
