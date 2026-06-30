/**
 * website-extract.ts — Real website asset extraction for demo personalization.
 *
 * Crawls the company's actual website with Playwright and extracts:
 *  - Hero images, logo, gallery images (downloaded as buffers)
 *  - Brand colors from CSS (primary, background, text, accent, header)
 *  - Schema.org JSON-LD and OGP metadata
 *  - Subpage content (about, services, pricing, testimonials) via Jina Reader
 *
 * Uses only OSS/free tools (no Google Maps/Tavily/SerpAPI).
 * Images are NOT free stock — they come from the company's own website.
 */
import { readWithJina, type JinaReaderResult } from "./jina-reader"

export interface WebsiteImage {
  url: string
  width: number
  height: number
  alt: string | null
  buffer: Buffer | null
  contentType: string | null
}

export interface WebsiteColors {
  primary: string | null
  background: string | null
  text: string | null
  accent: string | null
  headerBg: string | null
  ctaBg: string | null
  ctaText: string | null
}

export interface WebsiteContent {
  about: { title: string | null; text: string } | null
  services: { title: string | null; text: string } | null
  pricing: { title: string | null; text: string } | null
  testimonials: { title: string | null; text: string } | null
  contact: { title: string | null; text: string } | null
  blog: { title: string | null; text: string } | null
}

export interface WebsiteStructured {
  organization: Record<string, unknown> | null
  localBusiness: Record<string, unknown> | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogSiteName: string | null
  twitterImage: string | null
}

export interface WebsiteExtractData {
  domain: string
  images: {
    hero: WebsiteImage | null
    logo: WebsiteImage | null
    gallery: WebsiteImage[]
  }
  colors: WebsiteColors
  content: WebsiteContent | null
  structured: WebsiteStructured | null
}

export interface WebsiteExtractResult {
  ok: boolean
  data?: WebsiteExtractData
  error?: string
}

// ── Helpers ──

function targetUrl(domain: string): string {
  if (/^https?:\/\//i.test(domain)) return domain
  return `https://${domain}`
}

function ensureProtocol(url: string, base: string): string {
  if (!url) return ""
  if (url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("http")) return url
  try {
    return new URL(url, base).href
  } catch {
    return ""
  }
}

function imageIsDecorative(alt: string | null): boolean {
  if (!alt) return true
  const low = alt.toLowerCase()
  const noise = ["icon", "arrow", "bullet", "dot", "spacer", "divider", "pixel", "tracking", "blank", "bg", "background", "decorative"]
  return noise.some((w) => low === w || low.startsWith(`${w}-`))
}

function imageIsLogo(url: string, alt: string | null, width: number, height: number): boolean {
  const low = (url + (alt ?? "")).toLowerCase()
  if (low.includes("logo")) return true
  if (width > 0 && height > 0 && width === height && width >= 32 && width <= 320) return true
  return false
}

function imageFileType(url: string): { ext: string; mime: string } | null {
  const low = url.split("?")[0].toLowerCase()
  if (low.endsWith(".png")) return { ext: "png", mime: "image/png" }
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return { ext: "jpg", mime: "image/jpeg" }
  if (low.endsWith(".webp")) return { ext: "webp", mime: "image/webp" }
  if (low.endsWith(".svg")) return { ext: "svg", mime: "image/svg+xml" }
  if (low.endsWith(".gif")) return { ext: "gif", mime: "image/gif" }
  return null
}

// ── Browser extraction ──

interface BrowserImages {
  hero: WebsiteImage | null
  logo: WebsiteImage | null
  gallery: WebsiteImage[]
}

interface BrowserExtractPayload {
  images: BrowserImages
  colors: WebsiteColors
  structured: WebsiteStructured | null
  internalLinks: string[]
}

export async function extractWithBrowser(domain: string): Promise<BrowserExtractPayload | null> {
  try {
    const runtimeImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<typeof import("playwright")>
    const { chromium } = await runtimeImport("playwright")
    const browser = await chromium.launch({ headless: true })

    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      })
      const baseUrl = targetUrl(domain)

      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 25_000 })

      // Wait a moment for JS-rendered images and styles
      await page.waitForTimeout(2000)

      // ── Extract images ──
      const rawImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll("img"))
        return imgs.map((img) => {
          const src = (img as HTMLImageElement).src || (img as HTMLImageElement).dataset?.src || ""
          const srcset = (img as HTMLImageElement).srcset || ""
          const sizes = (img as HTMLImageElement).sizes || ""
          return {
            src,
            srcset,
            sizes,
            alt: (img as HTMLImageElement).alt || null,
            width: (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 0,
            height: (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 0,
            renderedWidth: (img as HTMLImageElement).clientWidth || 0,
            renderedHeight: (img as HTMLImageElement).clientHeight || 0,
            isInHeader: !!(img as HTMLImageElement).closest("header"),
            isInFooter: !!(img as HTMLImageElement).closest("footer"),
            position: Array.from((img as HTMLImageElement).parentElement?.children ?? []).indexOf(img),
          }
        })
      })

      // Download and score images
      const scored = await Promise.all(
        rawImages
          .filter((img) => {
            const url = img.src || ""
            if (!url) return false
            if (url.startsWith("data:")) return false
            const w = img.renderedWidth || img.width || 0
            const h = img.renderedHeight || img.height || 0
            return w >= 100 && h >= 80
          })
          .slice(0, 30)
          .map(async (img) => {
            const fullUrl = ensureProtocol(img.src || "", baseUrl)
            let buffer: Buffer | null = null
            let contentType: string | null = null

            try {
              const res = await fetch(fullUrl, { signal: AbortSignal.timeout(10_000) })
              if (res.ok) {
                buffer = Buffer.from(await res.arrayBuffer())
                contentType = res.headers.get("content-type") ?? null
              }
            } catch {
              // image fetch failed, skip gracefully
            }

            const w = img.renderedWidth || img.width || 0
            const h = img.renderedHeight || img.height || 0
            const isHero =
              !img.isInFooter &&
              (img.position <= 3 ||
                (w >= 600 && h >= 300) ||
                (img.alt && !imageIsDecorative(img.alt)))

            const isLogo = imageIsLogo(fullUrl, img.alt, w, h) || img.isInHeader

            return {
              url: fullUrl,
              width: w,
              height: h,
              alt: img.alt,
              buffer,
              contentType,
              score: (isHero ? 30 : 0) + (buffer ? 20 : 0) + Math.min(w, 600) / 20,
              isHero,
              isLogo,
            }
          }),
      )

      // Group into hero, logo, gallery
      const heroCandidates = scored.filter((s) => s.isHero && s.buffer).sort((a, b) => b.score - a.score)
      const logoCandidates = scored.filter((s) => s.isLogo && s.buffer).sort((a, b) => b.score - a.score)
      const galleryCandidates = scored
        .filter((s) => !s.isLogo && s.buffer)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)

      const hero = heroCandidates[0] ?? null
      const logo = logoCandidates[0] ?? null
      const gallery = galleryCandidates.map((s) => ({
        url: s.url,
        width: s.width,
        height: s.height,
        alt: s.alt,
        buffer: s.buffer,
        contentType: s.contentType,
      }))

      // ── Extract colors ──
      const colors = await page.evaluate(() => {
        const getStyle = (el: Element | null, prop: string): string | null => {
          if (!el) return null
          return window.getComputedStyle(el).getPropertyValue(prop) || null
        }
        const rgbToHex = (value: string | null): string | null => {
          if (!value || value === "rgba(0, 0, 0, 0)" || value === "transparent") return null
          const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
          if (!m) return null
          return `#${[m[1], m[2], m[3]].map((v) => parseInt(v).toString(16).padStart(2, "0")).join("")}`
        }

        const body = document.body
        const header = document.querySelector("header, nav, .header, .navbar, [class*='header'], [class*='navbar'], [class*='nav']")
        const ctaLinks = Array.from(document.querySelectorAll("a"))
          .filter((a) => {
            const text = (a as HTMLElement).innerText?.trim() || ""
            return /(contact|お問い合わせ|相談|予約|申込|無料|資料|download)/i.test(text)
          })
        const cta = ctaLinks[0] || document.querySelector("a[class*='btn'], a[class*='button'], a[class*='cta'], button[class*='btn'], button[class*='cta']")

        return {
          primary: rgbToHex(getStyle(cta, "background-color")) ?? rgbToHex(getStyle(cta, "color")),
          background: rgbToHex(getStyle(body, "background-color")),
          text: rgbToHex(getStyle(body, "color")),
          accent: rgbToHex(getStyle(document.querySelector("a"), "color")),
          headerBg: rgbToHex(getStyle(header, "background-color")),
          ctaBg: rgbToHex(getStyle(cta, "background-color")),
          ctaText: rgbToHex(getStyle(cta, "color")),
        }
      })

      // ── Extract structured data (Schema.org JSON-LD + OGP) ──
      const structured = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        const org = scripts
          .map((s) => {
            try { return JSON.parse(s.textContent || "") } catch { return null }
          })
          .find((d) => d?.["@type"] === "Organization" || d?.["@type"] === "LocalBusiness")

        const og = (prop: string) =>
          document.querySelector<HTMLMetaElement>(`meta[property="og:${prop}"]`)?.content ?? null

        return {
          organization: org ?? null,
          localBusiness: org?.["@type"] === "LocalBusiness" ? org : null,
          ogTitle: og("title"),
          ogDescription: og("description"),
          ogImage: og("image"),
          ogSiteName: og("site_name"),
          twitterImage:
            document.querySelector<HTMLMetaElement>(`meta[name="twitter:image"]`)?.content ??
            document.querySelector<HTMLMetaElement>(`meta[property="twitter:image"]`)?.content ??
            null,
        }
      })

      // ── Extract internal links (for subpage discovery) ──
      const internalLinks = await page.evaluate((base) => {
        const host = new URL(base).hostname
        return Array.from(document.querySelectorAll("a[href]"))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => {
            try {
              return new URL(href).hostname === host && !href.startsWith("mailto:") && !href.startsWith("tel:")
            } catch {
              return false
            }
          })
          .slice(0, 30)
          .filter((v, i, a) => a.indexOf(v) === i)
      }, baseUrl)

      return {
        images: { hero: hero ? { url: hero.url, width: hero.width, height: hero.height, alt: hero.alt, buffer: hero.buffer, contentType: hero.contentType } : null, logo: logo ? { url: logo.url, width: logo.width, height: logo.height, alt: logo.alt, buffer: logo.buffer, contentType: logo.contentType } : null, gallery },
        colors: {
          primary: colors.primary,
          background: colors.background,
          text: colors.text,
          accent: colors.accent,
          headerBg: colors.headerBg,
          ctaBg: colors.ctaBg,
          ctaText: colors.ctaText,
        },
        structured,
        internalLinks,
      }
    } finally {
      await browser.close()
    }
  } catch (e) {
    console.error("[website-extract] browser extraction failed:", e)
    return null
  }
}

// ── Subpage content discovery ──

const SUBPAGE_PATTERNS: { key: keyof WebsiteContent; paths: string[] }[] = [
  { key: "about", paths: ["/about", "/about-us", "/company", "/aboutus", "/corporate", "/会社概要", "/会社情報"] },
  { key: "services", paths: ["/services", "/service", "/products", "/solutions", "/事業内容", "/サービス", "/業務内容"] },
  { key: "pricing", paths: ["/pricing", "/price", "/plans", "/料金", "/価格"] },
  { key: "testimonials", paths: ["/testimonials", "/reviews", "/customers", "/cases", "/case-studies", "/works", "/portfolio", "/お客様の声", "/導入事例", "/実績"] },
  { key: "contact", paths: ["/contact", "/contact-us", "/inquiry", "/お問い合わせ", "/相談"] },
  { key: "blog", paths: ["/blog", "/news", "/journal", "/articles", "/posts", "/お知らせ", "/コラム"] },
]

function findSubpageUrls(
  internalLinks: string[],
  baseUrl: string,
): Map<string, string> {
  const found = new Map<string, string>()
  const base = targetUrl(baseUrl)

  for (const { key, paths } of SUBPAGE_PATTERNS) {
    for (const link of internalLinks) {
      try {
        const url = new URL(link, base)
        const pathLower = url.pathname.toLowerCase()
        for (const pattern of paths) {
          if (pathLower === pattern.toLowerCase() || pathLower.startsWith(pattern.toLowerCase() + "/")) {
            // prefer shorter paths
            const existing = found.get(key)
            if (!existing || pathLower.length < new URL(existing, base).pathname.length) {
              found.set(key, link)
            }
          }
        }
      } catch {
        // skip invalid URLs
      }
    }
  }

  return found
}

export async function extractSubpageContent(
  internalLinks: string[],
  domain: string,
): Promise<WebsiteContent | null> {
  const baseUrl = targetUrl(domain)
  const candidates = findSubpageUrls(internalLinks, baseUrl)

  if (candidates.size === 0) return null

  const results = await Promise.all(
    Array.from(candidates.entries()).map(async ([key, url]) => {
      try {
        const result = await readWithJina(url)
        if (result.ok && result.data) {
          return {
            key,
            title: result.data.title ?? null,
            text: result.data.markdown,
          }
        }
      } catch {
        // subpage read failed, skip
      }
      return null
    }),
  )

  const content: WebsiteContent = {
    about: null,
    services: null,
    pricing: null,
    testimonials: null,
    contact: null,
    blog: null,
  }

  for (const r of results) {
    if (r && r.key in content) {
      content[r.key as keyof WebsiteContent] = { title: r.title, text: r.text }
    }
  }

  // If nothing was found, return null
  if (Object.values(content).every((v) => v === null)) return null
  return content
}

// ── Main extraction function ──

export async function extractWebsiteAssets(
  domain: string,
): Promise<WebsiteExtractResult> {
  if (!domain) return { ok: false, error: "domain is required" }

  const baseUrl = targetUrl(domain)
  console.info(`[website-extract] extracting assets from ${baseUrl}`)

  // Step 1: Try fast HTTP extraction (no browser needed)
  const httpData = await extractWithHTTP(domain)
  
  // Step 2: Try browser extraction for richer data (may fail if Playwright unavailable)
  let browserData = null
  try {
    browserData = await extractWithBrowser(domain)
  } catch {
    console.info("[website-extract] browser extraction unavailable, using HTTP fallback")
  }

  // Merge: browser data preferred, HTTP fallback
  const merged = browserData || httpData
  if (!merged) {
    return { ok: false, error: "extraction failed (site unreachable or empty)" }
  }

  // Step 3: Subpage content via Jina Reader
  let subpageContent: WebsiteContent | null = null
  if (merged.internalLinks && merged.internalLinks.length > 0) {
    subpageContent = await extractSubpageContent(merged.internalLinks, domain)
  }

  return {
    ok: true,
    data: {
      domain,
      images: merged.images || { hero: null, logo: null, gallery: [] },
      colors: merged.colors || { primary: null, background: null, text: null, accent: null, headerBg: null, ctaBg: null, ctaText: null },
      content: subpageContent,
      structured: merged.structured || null,
    },
  }
}

// ── HTTP fallback extraction (no browser needed) ──

async function extractWithHTTP(domain: string): Promise<BrowserExtractPayload | null> {
  try {
    const baseUrl = targetUrl(domain)
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ParadigmBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null

    const html = await res.text()

    // Extract og:image
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)?.[1]
      || null

    // Extract all img src
    const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)
    const imgUrls: string[] = []
    for (const m of imgMatches) {
      const url = m[1]
      if (url && !url.startsWith("data:") && !url.includes("1x1") && !url.includes("pixel")) {
        try { imgUrls.push(new URL(url, baseUrl).href) } catch {}
      }
    }

    // Extract colors from CSS
    const bgMatch = html.match(/background(?:-color)?:\s*([#\w]+)/i)
    const primaryMatch = html.match(/--primary(?:-color)?:\s*([#\w]+)/)
    const colors = {
      primary: primaryMatch?.[1] || null,
      background: bgMatch?.[1] || "#ffffff",
      text: null, accent: null, headerBg: null, ctaBg: null, ctaText: null,
    }

    // Extract internal links
    const linkMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>/g)
    const internalLinks: string[] = []
    const host = new URL(baseUrl).hostname
    for (const m of linkMatches) {
      try {
        const url = new URL(m[1], baseUrl)
        if (url.hostname === host && !url.hash) internalLinks.push(url.href)
      } catch {}
    }
    const uniqueLinks = [...new Set(internalLinks)].slice(0, 30)

    // Extract structured data
    const ldJson = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1]
    let organization = null
    if (ldJson) {
      try { const parsed = JSON.parse(ldJson); if (parsed["@type"] === "Organization" || parsed["@type"] === "LocalBusiness") organization = parsed } catch {}
    }

    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] || null
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1] || null

    // Download hero image if available
    let heroImage: WebsiteImage | null = null
    if (ogImage) {
      try {
        const imgRes = await fetch(new URL(ogImage, baseUrl).href, { signal: AbortSignal.timeout(10000) })
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          heroImage = { url: new URL(ogImage, baseUrl).href, width: 0, height: 0, alt: "hero", buffer, contentType: imgRes.headers.get("content-type") }
        }
      } catch {}
    }

    // Download first few images
    const galleryImages: WebsiteImage[] = []
    for (const url of imgUrls.slice(0, 5)) {
      try {
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (imgRes.ok && (imgRes.headers.get("content-type") || "").startsWith("image/")) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          galleryImages.push({ url, width: 0, height: 0, alt: "", buffer, contentType: imgRes.headers.get("content-type") })
        }
      } catch {}
    }

    return {
      images: { hero: heroImage, logo: null, gallery: galleryImages },
      colors,
      structured: { organization, localBusiness: organization?.["@type"] === "LocalBusiness" ? organization : null, ogTitle, ogDescription, ogImage, ogSiteName: null, twitterImage: null },
      internalLinks: uniqueLinks,
    }
  } catch {
    return null
  }
}
