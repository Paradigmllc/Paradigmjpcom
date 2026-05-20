/**
 * worker/src/browser.ts — ブラウザのライフサイクル管理 (ディスク/メモリ安全)
 *
 * 案1: CDP_ENDPOINT 指定 → リモートブラウザに connectOverCDP (ローカル Chromium 不要)
 * 案2: 空 → ローカル Chromium を 1 個だけ起動し使い回す
 *
 * context は 1 ジョブ = 1 個・使い終わったら必ず close (メモリリーク防止)。
 */

import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Browser, BrowserContext } from "playwright"

// Playwright Stealth: 自動化検知を回避 (navigator.webdriver 等を隠す)
chromium.use(StealthPlugin())

let browserPromise: Promise<Browser> | null = null

async function launch(): Promise<Browser> {
  const cdp = process.env.CDP_ENDPOINT
  if (cdp) {
    // 案1: リモートブラウザ (Browserless 等)。この箱に Chromium を置かない。
    return chromium.connectOverCDP(cdp)
  }
  // 案2: ローカル Chromium (scale-to-zero 前提)
  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = launch()
  return browserPromise
}

/** 1 ジョブ 1 context・確実に close する高階関数 */
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
