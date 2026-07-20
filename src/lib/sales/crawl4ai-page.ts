interface Crawl4AiPageResult {
  url?: unknown
  html?: unknown
  cleaned_html?: unknown
  success?: unknown
  status_code?: unknown
  error_message?: unknown
}

interface Crawl4AiResponse {
  success?: unknown
  results?: unknown
}

export interface Crawl4AiPage {
  url: string
  html: string
}

const MAX_RESPONSE_BYTES = 5_000_000

function configuredBaseUrls(): string[] {
  const raw = process.env.CRAWL4AI_BASE_URL?.trim()
  if (!raw) return []
  const values = raw.includes("crawl4.paradigmjp.com")
    ? ["http://services-crawl4ai-1:11235", raw]
    : [raw]
  return [...new Set(values.map((value) => value.replace(/\/+$/, "")))]
}

async function readBoundedResponse(response: Response): Promise<string> {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new Error("Crawl4AI response exceeded the 5 MB safety limit")
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

export function parseCrawl4AiPage(payload: unknown, requestedUrl: string): Crawl4AiPage | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const response = payload as Crawl4AiResponse
  if (response.success !== true || !Array.isArray(response.results)) return null
  const result = response.results[0]
  if (!result || typeof result !== "object" || Array.isArray(result)) return null
  const page = result as Crawl4AiPageResult
  if (page.success !== true) return null
  const html = typeof page.html === "string" && page.html.length > 0
    ? page.html
    : typeof page.cleaned_html === "string" ? page.cleaned_html : ""
  if (!html) return null
  const url = typeof page.url === "string" && page.url.length > 0 ? page.url : requestedUrl
  return { url, html }
}

export async function fetchPageWithCrawl4Ai(url: string, timeoutMs: number): Promise<Crawl4AiPage | null> {
  const baseUrls = configuredBaseUrls()
  if (baseUrls.length === 0) return null
  const apiKey = process.env.CRAWL4AI_API_KEY?.trim()
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const body = JSON.stringify({
    urls: [url],
    browser_config: { headless: true, user_agent_mode: "random" },
    crawler_config: {
      cache_mode: "BYPASS",
      page_timeout: Math.max(timeoutMs, 10_000),
      wait_until: "load",
      delay_before_return_html: 2,
      scan_full_page: false,
    },
  })
  let lastError: unknown = null
  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/crawl`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(Math.max(timeoutMs + 15_000, 30_000)),
      })
      if (!response.ok) {
        lastError = new Error(`Crawl4AI returned HTTP ${response.status}`)
        continue
      }
      const text = await readBoundedResponse(response)
      const page = parseCrawl4AiPage(JSON.parse(text) as unknown, url)
      if (page) return page
      lastError = new Error("Crawl4AI response did not contain a successful HTML page")
    } catch (error) {
      lastError = error
    }
  }
  console.warn("[crawl4ai-page] browser fallback failed:", { url, error: lastError })
  return null
}
