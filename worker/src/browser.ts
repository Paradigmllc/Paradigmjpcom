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

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function steelCdpEndpoint(): string | null {
  const cdpEndpoint = optionalEnv("CDP_ENDPOINT")
  if (cdpEndpoint) return cdpEndpoint

  const steelBaseUrl = optionalEnv("STEEL_BASE_URL")
  if (!steelBaseUrl) return null

  try {
    const url = new URL(steelBaseUrl)
    url.protocol = "ws:"
    url.port = "9223"
    return url.toString()
  } catch (error) {
    console.warn("[worker/browser] invalid STEEL_BASE_URL:", error)
    return null
  }
}

async function launch(): Promise<Browser> {
  const cdp = optionalEnv("CDP_ENDPOINT") ?? steelCdpEndpoint()
  if (cdp) return chromium.connectOverCDP(cdp)

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })
}

export async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const browser = await browserPromise
      if (!browser.isConnected()) {
        console.warn("[worker/browser] browser is disconnected, restarting...")
        browserPromise = null
      }
    } catch (error) {
      console.warn("[worker/browser] browser connection check failed, resetting...", error)
      browserPromise = null
    }
  }
  if (!browserPromise) browserPromise = launch()
  return browserPromise
}

export async function withContext<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser()
  const proxyUrl = process.env.MUBENG_PROXY_URL
  const username = process.env.MUBENG_PROXY_USERNAME
  const password = process.env.MUBENG_PROXY_PASSWORD
  const proxyConfig = proxyUrl ? {
    server: proxyUrl,
    ...(username && password ? { username, password } : {}),
  } : undefined

  const ctx = await browser.newContext({
    locale: "ja-JP",
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    ...(proxyConfig ? { proxy: proxyConfig } : {}),
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
