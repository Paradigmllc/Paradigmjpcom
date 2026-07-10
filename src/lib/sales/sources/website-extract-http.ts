/**
 * HTTP-only fallback for website asset extraction.
 *
 * Kept separate from the Playwright extractor so each extraction strategy
 * remains reviewable and the primary module stays below the repository's
 * 500-line hard limit.
 */
import type {
  WebsiteColors,
  WebsiteImage,
  WebsiteStructured,
} from "./website-extract"

interface BrowserImages {
  hero: WebsiteImage | null
  logo: WebsiteImage | null
  gallery: WebsiteImage[]
}

export interface BrowserExtractPayload {
  images: BrowserImages
  colors: WebsiteColors
  structured: WebsiteStructured | null
  internalLinks: string[]
}

export function targetUrl(domain: string): string {
  if (/^https?:\/\//i.test(domain)) return domain
  return `https://${domain}`
}

export async function extractWithHTTP(
  domain: string,
): Promise<BrowserExtractPayload | null> {
  try {
    const baseUrl = targetUrl(domain)
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ParadigmBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null

    const html = await res.text()
    const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)?.[1]
      || null

    const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)
    const imgUrls: string[] = []
    for (const match of imgMatches) {
      const url = match[1]
      if (url && !url.startsWith("data:") && !url.includes("1x1") && !url.includes("pixel")) {
        try {
          imgUrls.push(new URL(url, baseUrl).href)
        } catch (error) {
          console.error("[website-extract] image URL parsing failed:", error instanceof Error ? error.message : String(error))
        }
      }
    }

    const bgMatch = html.match(/background(?:-color)?:\s*([#\w]+)/i)
    const primaryMatch = html.match(/--primary(?:-color)?:\s*([#\w]+)/)
    const colors: WebsiteColors = {
      primary: primaryMatch?.[1] || null,
      background: bgMatch?.[1] || "#ffffff",
      text: null,
      accent: null,
      headerBg: null,
      ctaBg: null,
      ctaText: null,
    }

    const linkMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>/g)
    const internalLinks: string[] = []
    const host = new URL(baseUrl).hostname
    for (const match of linkMatches) {
      try {
        const url = new URL(match[1], baseUrl)
        if (url.hostname === host && !url.hash) internalLinks.push(url.href)
      } catch (error) {
        console.error("[website-extract] internal link URL parsing failed:", error instanceof Error ? error.message : String(error))
      }
    }
    const uniqueLinks = [...new Set(internalLinks)].slice(0, 30)

    const ldJson = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1]
    let organization: Record<string, unknown> | null = null
    if (ldJson) {
      try {
        const parsed = JSON.parse(ldJson) as unknown
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const candidate = parsed as Record<string, unknown>
          if (candidate["@type"] === "Organization" || candidate["@type"] === "LocalBusiness") {
            organization = candidate
          }
        }
      } catch (error) {
        console.error("[website-extract] structured data JSON.parse failed:", error instanceof Error ? error.message : String(error))
      }
    }

    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] || null
    const ogDescription = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1] || null

    let heroImage: WebsiteImage | null = null
    if (ogImage) {
      try {
        const imageUrl = new URL(ogImage, baseUrl).href
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          heroImage = { url: imageUrl, width: 0, height: 0, alt: "hero", buffer, contentType: imgRes.headers.get("content-type") }
        }
      } catch (error) {
        console.error("[website-extract] hero image fetch failed:", error instanceof Error ? error.message : String(error))
      }
    }

    const galleryImages: WebsiteImage[] = []
    for (const url of imgUrls.slice(0, 5)) {
      try {
        const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (imgRes.ok && (imgRes.headers.get("content-type") || "").startsWith("image/")) {
          const buffer = Buffer.from(await imgRes.arrayBuffer())
          galleryImages.push({ url, width: 0, height: 0, alt: "", buffer, contentType: imgRes.headers.get("content-type") })
        }
      } catch (error) {
        console.error("[website-extract] gallery image fetch failed:", error instanceof Error ? error.message : String(error))
      }
    }

    return {
      images: { hero: heroImage, logo: null, gallery: galleryImages },
      colors,
      structured: {
        organization,
        localBusiness: organization?.["@type"] === "LocalBusiness" ? organization : null,
        ogTitle,
        ogDescription,
        ogImage,
        ogSiteName: null,
        twitterImage: null,
      },
      internalLinks: uniqueLinks,
    }
  } catch (error) {
    console.error("[website-extract] HTTP extraction failed:", error instanceof Error ? error.message : String(error))
    return null
  }
}
