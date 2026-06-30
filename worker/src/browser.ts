/**
 * Browser lifecycle for the outreach worker.
 *
 * - CDP_ENDPOINT set: connect to Browserless or another remote browser.
 * - CDP_ENDPOINT empty: launch one local Chromium instance and reuse it.
 * Each job gets an isolated context that is always closed after use.
 * Browser is restarted every MAX_CONTEXTS_PER_BROWSER to prevent memory leaks.
 */

import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Browser, BrowserContext } from "playwright"

// Playwright Stealth reduces common automation fingerprints such as navigator.webdriver.
chromium.use(StealthPlugin())

let browserPromise: Promise<Browser> | null = null
let contextCount = 0
const MAX_CONTEXTS_PER_BROWSER = Number(process.env.MAX_CONTEXTS_PER_BROWSER ?? 50)
const CONTEXT_TIMEOUT_MS = Number(process.env.CONTEXT_TIMEOUT_MS ?? 90_000)

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

async function launch(): Promise<Browser> {
  const cdp = optionalEnv("CDP_ENDPOINT")
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
  contextCount++
  if (contextCount >= MAX_CONTEXTS_PER_BROWSER) {
    console.warn(`[worker/browser] context limit (${MAX_CONTEXTS_PER_BROWSER}) reached, restarting browser`)
    contextCount = 0
    await closeBrowser()
    const fresh = await getBrowser()
    return withContextOnBrowser(fresh, fn)
  }
  return withContextOnBrowser(browser, fn)
}

async function withContextOnBrowser<T>(
  browser: Browser,
  fn: (ctx: BrowserContext) => Promise<T>,
): Promise<T> {
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

  let timer: ReturnType<typeof setTimeout> | undefined
  const ctxTimeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`context timeout after ${CONTEXT_TIMEOUT_MS}ms`)), CONTEXT_TIMEOUT_MS)
  })

  try {
    return await Promise.race([fn(ctx), ctxTimeout])
  } finally {
    if (timer) clearTimeout(timer)
    await ctx.close().catch((error) => {
      console.warn("[worker/browser] context close failed:", error)
    })
  }
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return
  const browser = await browserPromise
  await browser.close()
  browserPromise = null
  contextCount = 0
}
