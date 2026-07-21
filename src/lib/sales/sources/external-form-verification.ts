import {
  isAllowedFormUrlForOrigin,
  type ExternalFormDiscoveryHit,
} from "./external-form-discovery"
import {
  fetchContactPageHtml,
  inspectContactPage,
  type FormDiscoveryResult,
} from "./form-discovery"

function uniqueUrls(urls: Iterable<string>): string[] {
  return [...new Set(urls)].slice(0, 80)
}

async function mapLimit<T, R>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}

export async function verifyExternalFormDiscoveryHit(input: {
  origin: string
  hit: ExternalFormDiscoveryHit
  timeoutMs: number
}): Promise<FormDiscoveryResult | null> {
  const started = Date.now()
  const candidates = uniqueUrls([
    ...(input.hit.formUrl ? [input.hit.formUrl] : []),
    ...input.hit.candidates,
  ]).filter((url) => isAllowedFormUrlForOrigin(input.origin, url))
  if (candidates.length === 0) return null
  const homepageHtml = await fetchContactPageHtml(input.origin, input.timeoutMs)

  const inspected = await mapLimit(candidates.slice(0, 12), 3, async (url) => ({
    url,
    inspection: await inspectContactPage(url, input.origin, input.timeoutMs, homepageHtml),
  }))
  const verifiedForm = inspected.find((item) => item.inspection.status === "form")
  if (verifiedForm) {
    return {
      formUrl: verifiedForm.url,
      method: input.hit.source === "crawl4ai" ? "crawl4ai" : "spa",
      verification: "form",
      confidence: Math.max(input.hit.confidence, 90),
      inspection: verifiedForm.inspection,
      candidates,
      traceMs: Date.now() - started,
      outcome: "verified_form",
      outcomeReason: "A public inquiry form with usable email, message, and submit controls was verified.",
      checkedUrlCount: inspected.length + 1,
      checkedAt: new Date().toISOString(),
    }
  }

  const verifiedPage = inspected.find((item) => item.inspection.status === "page")
  if (!verifiedPage) return null
  return {
    formUrl: verifiedPage.url,
    method: input.hit.source === "crawl4ai" ? "crawl4ai" : "spa",
    verification: "page",
    confidence: Math.min(input.hit.confidence, 74),
    inspection: verifiedPage.inspection,
    candidates,
    traceMs: Date.now() - started,
    outcome: "contact_page_only",
    outcomeReason: "A contact page was found, but it does not contain a usable public inquiry form.",
    checkedUrlCount: inspected.length + 1,
    checkedAt: new Date().toISOString(),
  }
}
