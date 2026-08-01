/**
 * extract-assets.ts — Website asset extraction + R2 upload + meta storage for demo personalization.
 *
 * Called during enrichment Phase 1 to collect real company visuals and content.
 * All images come from the company's own website — no stock photos or AI generation.
 */
import { extractWebsiteAssets, type WebsiteExtractData } from "./sources/website-extract"
import { uploadToR2 } from "./r2-storage"
import type { SalesCompany } from "./types"

export interface ExtractedAssets {
  domain: string
  extracted_at: string
  images: {
    hero: { url: string; width: number; height: number; alt: string | null } | null
    logo: { url: string; width: number; height: number; alt: string | null } | null
    gallery: { url: string; width: number; height: number; alt: string | null }[]
  }
  colors: {
    primary: string | null
    background: string | null
    text: string | null
    accent: string | null
    headerBg: string | null
    ctaBg: string | null
    ctaText: string | null
  }
  content: {
    about: string | null    // markdown text
    services: string | null
    pricing: string | null
    testimonials: string | null
    contact: string | null
    blog: string | null
  } | null
  structured: {
    organization: Record<string, unknown> | null
    localBusiness: Record<string, unknown> | null
    ogTitle: string | null
    ogDescription: string | null
    ogImage: string | null
    ogSiteName: string | null
    twitterImage: string | null
  } | null
  r2_prefix: string | null
}

export interface ExtractAssetsResult {
  ok: boolean
  assets?: ExtractedAssets
  error?: string
  skipped?: string
}

function imageKey(domain: string, type: string, index?: number): string {
  const clean = domain.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").slice(0, 60)
  if (index !== undefined) return `sites/${clean}/${type}-${index}.webp`
  return `sites/${clean}/${type}.webp`
}

async function uploadImage(
  domain: string,
  image: { buffer: Buffer | null; contentType: string | null; url: string; width: number; height: number; alt: string | null },
  type: string,
  index?: number,
): Promise<{ url: string; width: number; height: number; alt: string | null } | null> {
  if (!image.buffer) return null

  try {
    const key = imageKey(domain, type, index)
    const pubUrl = await uploadToR2(key, image.buffer, "image/webp")
    return { url: pubUrl, width: image.width, height: image.height, alt: image.alt }
  } catch (e) {
    console.error(`[extract-assets] R2 upload failed for ${type}:`, e)
    // Fallback: return original URL if upload fails
    return { url: image.url, width: image.width, height: image.height, alt: image.alt }
  }
}

export async function runAssetExtraction(company: SalesCompany): Promise<ExtractAssetsResult> {
  const domain = company.domain
  if (!domain) return { ok: false, error: "company has no domain" }

  const extract = await extractWebsiteAssets(domain)
  if (!extract.ok || !extract.data) {
    return { ok: false, error: extract.error ?? "extraction failed", skipped: "site unreachable or empty" }
  }

  const data = extract.data

  // Upload images to R2 (parallel)
  const [heroUpload, logoUpload, ...galleryUploads] = await Promise.all([
    data.images.hero ? uploadImage(domain, data.images.hero, "hero") : Promise.resolve(null),
    data.images.logo ? uploadImage(domain, data.images.logo, "logo") : Promise.resolve(null),
    ...data.images.gallery
      .filter((g) => g.buffer)
      .slice(0, 6)
      .map((g, i) => uploadImage(domain, g, "gallery", i)),
  ])

  const clean = domain.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").slice(0, 60)

  const assets: ExtractedAssets = {
    domain,
    extracted_at: new Date().toISOString(),
    images: {
      hero: heroUpload,
      logo: logoUpload,
      gallery: [...galleryUploads].filter((g): g is NonNullable<typeof g> => g !== null),
    },
    colors: data.colors,
    content: data.content
      ? {
          about: data.content.about?.text ?? null,
          services: data.content.services?.text ?? null,
          pricing: data.content.pricing?.text ?? null,
          testimonials: data.content.testimonials?.text ?? null,
          contact: data.content.contact?.text ?? null,
          blog: data.content.blog?.text ?? null,
        }
      : null,
    structured: data.structured,
    r2_prefix: `sites/${clean}`,
  }

  return { ok: true, assets }
}
