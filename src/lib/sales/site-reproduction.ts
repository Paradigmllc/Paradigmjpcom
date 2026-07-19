import "server-only"

import { createHash } from "node:crypto"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { load } from "cheerio"
import { captureWebsiteScreenshotDataUrl } from "./visual-evidence"
import { generateScreenshotToCode } from "./screenshot-to-code-client"
import { captureWebsiteDomEvidence } from "./site-dom-evidence"

const MAX_PAGES = 24
const MAX_HTML_BYTES = 2_000_000
const REQUEST_TIMEOUT_MS = 25_000
const SKIP_PATH = /\/(?:wp-admin|wp-login|cart|checkout|login|logout|account|search|feed|sitemap)(?:\/|$)/iu
const SKIP_EXTENSION = /\.(?:pdf|zip|csv|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|svg|mp4|mov|avi|css|js|xml)(?:$|\?)/iu

export interface SitePageTarget {
  id: string
  url: string
  path: string
  title: string
}

export interface SitePageArtifact {
  id: string
  path: string
  url: string
  title: string
  code: string
  codeBytes: number
  sourceScreenshots: {
    desktop: { provider: string; width: number; height: number; sha256: string }
    mobile: { provider: string; width: number; height: number; sha256: string }
  }
  visualEvidenceMode: "dom-css" | "vision+dom-css" | "metadata"
  sourceDomEvidence: { provider: string; desktopBytes: number; mobileBytes: number; desktopElements: number; mobileElements: number; imageCount: number }
  quality: SitePageQuality
}

export interface SitePageQuality {
  score: number
  passed: boolean
  blockers: string[]
  warnings: string[]
  checks: Record<string, boolean>
  visualSimilarity?: { desktop: number; mobile: number }
}

export interface SiteReproductionArtifact {
  status: "review" | "quality_review"
  sourceUrl: string
  generatedAt: string
  expiresAt: string
  previewToken: string
  visionRequired: boolean
  visualEvidenceMode: "dom-css" | "vision+dom-css" | "metadata"
  pages: SitePageArtifact[]
  discovery: {
    requested: number
    discovered: number
    captured: number
    generated: number
  }
  quality: {
    score: number
    passed: boolean
    blockers: string[]
    warnings: string[]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true
  const [a, b] = octets
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase()
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")
}

async function assertPublicUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    console.error("[site-reproduction] invalid source URL:", error)
    throw new Error("source_url must be a valid HTTPS URL")
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("source_url must be HTTPS without credentials or a custom port")
  const hostname = url.hostname.toLowerCase()
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("private hostnames are not allowed")
  const ipVersion = isIP(hostname)
  if ((ipVersion === 4 && isPrivateIpv4(hostname)) || (ipVersion === 6 && isPrivateIpv6(hostname))) throw new Error("private IP addresses are not allowed")
  if (!ipVersion) {
    const records = await lookup(hostname, { all: true, verbatim: true })
    if (records.length === 0 || records.some((record) => record.family === 4 ? isPrivateIpv4(record.address) : isPrivateIpv6(record.address))) throw new Error("source host resolves to a private address")
  }
  url.hash = ""
  return url
}

async function fetchText(url: string, redirectDepth = 0): Promise<{ url: string; text: string }> {
  const requested = await assertPublicUrl(url)
  const response = await fetch(requested, {
    redirect: "manual",
    headers: { "User-Agent": "Paradigm-Demo-Review/1.0 (+https://paradigmjp.com)" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (response.status >= 300 && response.status < 400) {
    if (redirectDepth >= 3) throw new Error("source page redirected too many times")
    const location = response.headers.get("location")
    if (!location) throw new Error("source page returned a redirect without a location")
    const redirected = new URL(location, requested)
    return fetchText(redirected.toString(), redirectDepth + 1)
  }
  const finalUrl = await assertPublicUrl(response.url || requested.toString())
  if (!response.ok) throw new Error(`source page returned HTTP ${response.status}`)
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
  if (contentType && !/(?:text\/html|application\/xhtml\+xml|application\/xml|text\/xml)/u.test(contentType)) throw new Error("source URL did not return HTML/XML")
  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > MAX_HTML_BYTES) throw new Error("source page is too large")
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_HTML_BYTES) throw new Error("source page is too large")
  return { url: finalUrl.toString(), text }
}

function normalizePageUrl(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin)
    if (url.protocol !== "https:" || url.origin !== origin) return null
    url.hash = ""
    url.search = ""
    if (SKIP_PATH.test(url.pathname) || SKIP_EXTENSION.test(url.pathname)) return null
    if (url.pathname.length > 180) return null
    return url.toString()
  } catch (error) {
    console.warn("[site-reproduction] ignored malformed internal link:", error)
    return null
  }
}

function pageId(pathname: string, index: number): string {
  if (pathname === "/" || pathname === "") return "home"
  const cleaned = pathname.replace(/^\/+|\/+$/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")
  return cleaned.slice(0, 70) || `page-${index + 1}`
}

function titleFromHtml(html: string, fallback: string): string {
  const title = load(html)("title").first().text().replace(/\s+/gu, " ").trim()
  return title.slice(0, 160) || fallback
}

async function sitemapUrls(origin: string): Promise<string[]> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  for (const candidate of candidates) {
    try {
      const { text } = await fetchText(candidate)
      const $ = load(text, { xmlMode: true })
      const urls = $("loc").toArray().map((node) => $(node).text().trim()).filter(Boolean)
      if (urls.length > 0) return urls.slice(0, 120)
    } catch (error) {
      console.warn("[site-reproduction] sitemap unavailable:", candidate, error instanceof Error ? error.message : String(error))
    }
  }
  return []
}

export async function discoverSitePages(input: {
  sourceUrl: string
  requestedPaths?: string[]
  maxPages?: number
}): Promise<{ sourceUrl: string; pages: SitePageTarget[]; requested: number; discovered: number }> {
  const root = await assertPublicUrl(input.sourceUrl)
  const sourceUrl = root.toString()
  const maxPages = Math.min(Math.max(Math.floor(input.maxPages ?? 12), 1), MAX_PAGES)
  const requested = (input.requestedPaths ?? []).filter((path) => typeof path === "string" && path.trim()).slice(0, MAX_PAGES)
  const links = new Set<string>([sourceUrl])
  let homepage = ""
  try {
    const fetched = await fetchText(sourceUrl)
    homepage = fetched.text
    const $ = load(homepage)
    $("a[href]").each((_, element) => {
      const normalized = normalizePageUrl($(element).attr("href") ?? "", root.origin)
      if (normalized) links.add(normalized)
    })
  } catch (error) {
    if (requested.length === 0) throw error
    console.warn("[site-reproduction] homepage link discovery failed; using requested paths:", error)
  }
  const sitemap = await sitemapUrls(root.origin)
  for (const value of sitemap) {
    const normalized = normalizePageUrl(value, root.origin)
    if (normalized) links.add(normalized)
  }
  for (const path of requested) {
    const normalized = normalizePageUrl(path, root.origin)
    if (normalized) links.add(normalized)
  }
  const crawlQueue = Array.from(links)
  const visited = new Set<string>()
  let cursor = 0
  while (cursor < crawlQueue.length && crawlQueue.length < maxPages * 2) {
    const candidate = crawlQueue[cursor]
    cursor += 1
    if (visited.has(candidate) || candidate === sourceUrl) continue
    visited.add(candidate)
    try {
      const fetched = await fetchText(candidate)
      const $ = load(fetched.text)
      $("a[href]").each((_, element) => {
        const normalized = normalizePageUrl($(element).attr("href") ?? "", root.origin)
        if (normalized && !links.has(normalized)) {
          links.add(normalized)
          crawlQueue.push(normalized)
        }
      })
    } catch (error) {
      console.warn("[site-reproduction] child page discovery failed:", candidate, error instanceof Error ? error.message : String(error))
    }
  }
  const ordered = [sourceUrl, ...Array.from(links).filter((url) => url !== sourceUrl)]
  const selected = ordered.slice(0, maxPages)
  const pages: SitePageTarget[] = []
  const usedIds = new Set<string>()
  for (let index = 0; index < selected.length; index += 1) {
    const url = selected[index]
    let title = new URL(url).pathname === "/" ? root.hostname : new URL(url).pathname
    if (url === sourceUrl && homepage) title = titleFromHtml(homepage, title)
    const baseId = pageId(new URL(url).pathname, index)
    const id = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId
    usedIds.add(id)
    pages.push({ id, url, path: new URL(url).pathname || "/", title: title.slice(0, 160) })
  }
  return { sourceUrl, pages, requested: requested.length, discovered: links.size }
}

export function qualityForCode(code: string, page: SitePageTarget, options?: { visualEvidenceMode?: string }): SitePageQuality {
  const normalized = code.toLowerCase()
  const blockers: string[] = []
  const warnings: string[] = []
  const checks = {
    hasDocument: /<html[\s>]/iu.test(code) && /<body[\s>]/iu.test(code),
    hasSemanticSections: /<(?:header|main|section|footer)[\s>]/iu.test(code),
    hasNavigation: /<nav[\s>]/iu.test(code) || /href=/iu.test(code),
    hasResponsiveRules: /(?:@media|sm:|md:|lg:)/iu.test(code),
    hasMotion: /(?:transition|animation|motion|transform)/iu.test(code),
    noPlaceholderCopy: !/(?:lorem ipsum|placeholder text|coming soon|sample text)/iu.test(code),
    noInternalLanguage: !/(?:非公開提案用|権利確認前|エキテン掲載素材|内部確認)/iu.test(code),
    pageSpecific: normalized.includes(page.path.toLowerCase()) || normalized.includes(page.title.toLowerCase().slice(0, 8)),
    domEvidence: options ? options.visualEvidenceMode === "dom-css" || options.visualEvidenceMode === "vision+dom-css" : true,
  }
  for (const [name, passed] of Object.entries(checks)) if (!passed) blockers.push(name)
  if (Buffer.byteLength(code, "utf8") < 8_000) warnings.push("code_output_is_short")
  if (!/<img\b[^>]*alt=/iu.test(code) && /<img\b/iu.test(code)) warnings.push("image_alt_missing")
  if (!/aria-/iu.test(code)) warnings.push("aria_attributes_missing")
  const score = Math.max(0, Math.min(100, 100 - blockers.length * 12 - warnings.length * 4))
  return { score, passed: blockers.length === 0 && score >= 85, blockers, warnings, checks }
}

function dataUrlBuffer(value: string): Buffer {
  const encoded = value.split(",", 2)[1]
  if (!encoded) throw new Error("invalid image data URL")
  return Buffer.from(encoded, "base64")
}

async function visualSimilarity(source: string, rendered: string): Promise<number> {
  const sharpModule = await import("sharp")
  const sharp = sharpModule.default
  const [sourcePixels, renderedPixels] = await Promise.all([
    sharp(dataUrlBuffer(source)).resize(32, 32, { fit: "fill" }).greyscale().raw().toBuffer(),
    sharp(dataUrlBuffer(rendered)).resize(32, 32, { fit: "fill" }).greyscale().raw().toBuffer(),
  ])
  let distance = 0
  for (let index = 0; index < Math.min(sourcePixels.length, renderedPixels.length); index += 1) distance += Math.abs(sourcePixels[index] - renderedPixels[index])
  return Math.max(0, Math.round(100 - distance / Math.max(1, Math.min(sourcePixels.length, renderedPixels.length) * 2.55)))
}

async function evaluateRenderedVisuals(input: { desktop: string; mobile: string; code: string }): Promise<{ desktop: number; mobile: number } | null> {
  try {
    const encodedCode = Buffer.from(input.code, "utf8").toString("base64")
    const targetUrl = `data:text/html;base64,${encodedCode}`
    const [desktop, mobile] = await Promise.all([
      captureWebsiteScreenshotDataUrl({ targetUrl, viewport: "desktop" }),
      captureWebsiteScreenshotDataUrl({ targetUrl, viewport: "mobile" }),
    ])
    if (!desktop.ok || !mobile.ok) return null
    return {
      desktop: await visualSimilarity(input.desktop, desktop.dataUrl),
      mobile: await visualSimilarity(input.mobile, mobile.dataUrl),
    }
  } catch (error) {
    console.warn("[site-reproduction] rendered visual regression unavailable:", error)
    return null
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()))
  return results
}

export async function generateSiteReproduction(input: {
  sourceUrl: string
  requestedPaths?: string[]
  maxPages?: number
  companyName: string
  industry?: string | null
  designSystem?: string
}): Promise<Omit<SiteReproductionArtifact, "previewToken" | "expiresAt">> {
  const discovery = await discoverSitePages(input)
  const generatedPages = await mapWithConcurrency(discovery.pages, 2, async (page) => {
    const [desktop, mobile, desktopDom, mobileDom] = await Promise.all([
      captureWebsiteScreenshotDataUrl({ targetUrl: page.url, viewport: "desktop" }),
      captureWebsiteScreenshotDataUrl({ targetUrl: page.url, viewport: "mobile" }),
      captureWebsiteDomEvidence({ targetUrl: page.url, viewport: "desktop", maxBytes: 20_000 }),
      captureWebsiteDomEvidence({ targetUrl: page.url, viewport: "mobile", maxBytes: 20_000 }),
    ])
    if (!desktop.ok) throw new Error(`${page.path}: desktop screenshot capture failed (${desktop.error})`)
    if (!mobile.ok) throw new Error(`${page.path}: mobile screenshot capture failed (${mobile.error})`)
    if (!desktopDom.ok) throw new Error(`${page.path}: desktop DOM/CSS evidence capture failed (${desktopDom.error})`)
    if (!mobileDom.ok) throw new Error(`${page.path}: mobile DOM/CSS evidence capture failed (${mobileDom.error})`)
    const visualEvidence = JSON.stringify({ desktop: JSON.parse(desktopDom.evidence.evidence), mobile: JSON.parse(mobileDom.evidence.evidence) })
    const generated = await generateScreenshotToCode({
      imageDataUrls: [desktop.dataUrl, mobile.dataUrl],
      requireVision: false,
      visualEvidence,
      designSystem: input.designSystem,
      prompt: [
        `Reconstruct the premium Japanese SMB website page for ${input.companyName}.`,
        `Industry: ${input.industry || "unknown"}. Source URL path: ${page.path}. Page title: ${page.title}.`,
        "The supplied desktop and mobile screenshots plus the verified browser DOM/CSS evidence are the source of truth. Reproduce the visual hierarchy, spacing, typography, color system, imagery treatment, responsive behavior and motion with production-quality HTML/Tailwind. Never invent a section, label, image, or business claim that is absent from the evidence.",
        "Keep this page specific to the source page. Do not add unrelated consulting, portfolio, or placeholder sections. Do not show internal proposal, rights, scraping, demo, or review language to the customer.",
        "Use Japanese copy where the source uses Japanese. Include a complete header/navigation, meaningful page content, CTA, footer, accessibility attributes, and mobile layout.",
      ].join(" "),
    })
    const visualEvidenceMode = generated.visualEvidenceMode === "vision" ? "vision+dom-css" : generated.visualEvidenceMode === "dom-css" ? "dom-css" : "metadata"
    const quality = qualityForCode(generated.code, page, { visualEvidenceMode })
    const renderedVisual = await evaluateRenderedVisuals({ desktop: desktop.dataUrl, mobile: mobile.dataUrl, code: generated.code })
    if (!renderedVisual) {
      quality.blockers.push("generated_visual_render_failed")
      quality.checks.generatedVisual = false
      quality.score = Math.max(0, quality.score - 18)
      quality.passed = false
    } else {
      quality.visualSimilarity = renderedVisual
      quality.checks.generatedVisual = renderedVisual.desktop >= 35 && renderedVisual.mobile >= 35
      if (!quality.checks.generatedVisual) {
        quality.warnings.push("visual_similarity_below_review_threshold")
        quality.score = Math.max(0, quality.score - 10)
        quality.passed = false
      }
    }
    return {
      id: page.id,
      path: page.path,
      url: page.url,
      title: page.title,
      code: generated.code,
      codeBytes: Buffer.byteLength(generated.code, "utf8"),
      sourceScreenshots: {
        desktop: { provider: desktop.provider, width: desktop.width, height: desktop.height, sha256: desktop.sha256 },
        mobile: { provider: mobile.provider, width: mobile.width, height: mobile.height, sha256: mobile.sha256 },
      },
      visualEvidenceMode,
      sourceDomEvidence: {
        provider: "playwright",
        desktopBytes: desktopDom.evidence.bytes,
        mobileBytes: mobileDom.evidence.bytes,
        desktopElements: desktopDom.evidence.elementCount,
        mobileElements: mobileDom.evidence.elementCount,
        imageCount: desktopDom.evidence.imageCount + mobileDom.evidence.imageCount,
      },
      quality,
    } satisfies SitePageArtifact
  })
  const blockers = generatedPages.flatMap((page) => page.quality.blockers.map((item) => `${page.path}:${item}`))
  const warnings = generatedPages.flatMap((page) => page.quality.warnings.map((item) => `${page.path}:${item}`))
  const scores = generatedPages.map((page) => page.quality.score)
  const score = scores.length > 0 ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0
  const passed = generatedPages.length === discovery.pages.length && blockers.length === 0 && score >= 85
  return {
    status: passed ? "review" : "quality_review",
    sourceUrl: discovery.sourceUrl,
    generatedAt: new Date().toISOString(),
    visionRequired: generatedPages.some((page) => page.visualEvidenceMode === "vision+dom-css"),
    visualEvidenceMode: generatedPages.some((page) => page.visualEvidenceMode === "vision+dom-css") ? "vision+dom-css" : "dom-css",
    pages: generatedPages,
    discovery: { requested: discovery.requested, discovered: discovery.discovered, captured: generatedPages.length, generated: generatedPages.length },
    quality: { score, passed, blockers, warnings },
  }
}

export function siteArtifactHash(artifact: Omit<SiteReproductionArtifact, "previewToken" | "expiresAt">): string {
  return createHash("sha256").update(JSON.stringify({ sourceUrl: artifact.sourceUrl, pages: artifact.pages.map((page) => ({ id: page.id, sha256: page.sourceScreenshots.desktop.sha256, code: page.code })) })).digest("hex")
}

export function isSiteArtifact(value: unknown): value is SiteReproductionArtifact {
  return isRecord(value) && (value.status === "review" || value.status === "quality_review")
}
