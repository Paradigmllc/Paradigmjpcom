/**
 * Layer C: SPA contact-form discovery with Crawlee + Playwright Stealth.
 *
 * Next.js handles cheap fetch/sitemap/heuristic discovery first. This worker is
 * reserved for JS-rendered sites where a real browser is needed. It only follows
 * contact-like links and stops after a small crawl budget.
 */

import { PlaywrightCrawler } from "crawlee"
import { chromium } from "playwright-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

chromium.use(StealthPlugin())

const CONTACT_RE =
  /contact|inquiry|enquiry|toiawase|otoiawase|お問い合わせ|お問合せ|問い合わせ|get-in-touch|form|資料請求|相談|無料相談/i

export async function discoverSpaForm(homeUrl: string): Promise<string | null> {
  let found: string | null = null

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 8,
    maxConcurrency: Number(process.env.MAX_CONCURRENCY ?? 2),
    navigationTimeoutSecs: Math.round(Number(process.env.NAV_TIMEOUT_MS ?? 30_000) / 1000),
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
      const msgFieldCount = await page.locator('textarea, input[name*="mail" i], input[type="email"]').count()
      if (formCount > 0 && msgFieldCount > 0 && request.loadedUrl !== homeUrl) {
        found = request.loadedUrl ?? request.url
        return
      }
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
