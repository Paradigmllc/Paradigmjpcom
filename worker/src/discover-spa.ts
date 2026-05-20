/**
 * worker/src/discover-spa.ts — Layer C: SPA フォーム発見 (Crawlee)
 *
 * Next 側 form-discovery の Layer 0/A (fetch) で見つからなかった
 * SPA サイト (JS でレンダリングされる contact ページ) を Crawlee の
 * PlaywrightCrawler で実ブラウザ巡回して特定する。
 *
 * 暴発防止: maxRequestsPerCrawl=8・contact 系リンクのみ enqueue。
 */

import { PlaywrightCrawler } from "crawlee"
import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

chromium.use(StealthPlugin())

const CONTACT_RE = /contact|inquiry|enquiry|toiawase|otoiawase|問い合わせ|お問合せ|get-in-touch|フォーム/i

export async function discoverSpaForm(homeUrl: string): Promise<string | null> {
  let found: string | null = null

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 8,
    maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? 2),
    navigationTimeoutSecs: Math.round(Number(process.env.NAV_TIMEOUT_MS ?? 30_000) / 1000),
    // playwright-extra + stealth を Crawlee に注入
    launchContext: {
      launcher: chromium,
      launchOptions: {
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      },
    },
    requestHandler: async ({ page, request, enqueueLinks }) => {
      if (found) return
      const formCount = await page.locator("form").count()
      const msgFieldCount = await page
        .locator('textarea, input[name*="mail" i], input[type="email"]')
        .count()
      // homepage 以外で form + メッセージ系フィールドがあれば確定
      if (formCount > 0 && msgFieldCount > 0 && request.loadedUrl !== homeUrl) {
        found = request.loadedUrl ?? request.url
        return
      }
      // contact 系リンクだけ enqueue (暴発防止)
      await enqueueLinks({
        transformRequestFunction: (req) => (CONTACT_RE.test(req.url) ? req : false),
      })
    },
    failedRequestHandler: ({ request }) => {
      console.warn("[worker/discover-spa] failed:", request.url)
    },
  })

  await crawler.run([homeUrl])
  await crawler.teardown()
  return found
}
