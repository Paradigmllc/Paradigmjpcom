import { getServiceSalesSupabase } from "@/lib/supabase"
import { getMubengProxyUrl } from "./proxy-agent"
import { uploadToR2 } from "./r2-storage"
import type { TemplateVariant } from "./types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export type ScreenshotViewport = "desktop" | "mobile"
export type VisualEvidenceSlot = ScreenshotViewport | "variant" | "social" | "map" | "form"

export interface VisualEvidenceCompany {
  id: string
  domain: string
  company_name: string
  template_variant?: TemplateVariant | null
  prefecture?: string | null
  meta: Record<string, unknown> | null
}

export interface ScreenshotEvidence {
  url: string
  objectKey: string
  provider: "playwright"
  viewport: VisualEvidenceSlot
  width: number
  height: number
  capturedAt: string
  sourceUrl: string
}

interface ScreenshotCapture {
  buffer: Buffer
  provider: ScreenshotEvidence["provider"]
}

interface ScreenshotOptions {
  viewport?: ScreenshotViewport
  slot?: VisualEvidenceSlot
  targetUrl?: string
  width?: number
  height?: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function targetUrlForDomain(domain: string): string {
  const trimmed = domain.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function viewportSize(input: ScreenshotOptions): { viewport: VisualEvidenceSlot; width: number; height: number } {
  const viewport = input.slot ?? input.viewport ?? "desktop"
  if (viewport === "mobile") return { viewport, width: input.width ?? 390, height: input.height ?? 844 }
  if (viewport === "social" || viewport === "form") return { viewport, width: input.width ?? 430, height: input.height ?? 860 }
  return { viewport, width: input.width ?? 1280, height: input.height ?? 800 }
}

function viewportIsMobile(viewport: VisualEvidenceSlot): boolean {
  return viewport === "mobile" || viewport === "social" || viewport === "form"
}

function browserCleanupCss(): string {
  return `
    #cookie-consent, .cookie-banner, .cookie-consent, [id*="cookie"], [class*="cookie"] { display: none !important; }
    .fc-consent-root, #drift-widget-container, #hubspot-messages-iframe-container { display: none !important; }
    iframe[src*="intercom"], iframe[src*="chat"], [class*="chat-widget"], [id*="chat-widget"] { display: none !important; }
  `
}

async function captureWithPlaywright(input: {
  targetUrl: string
  width: number
  height: number
  viewport: VisualEvidenceSlot
}): Promise<ScreenshotCapture | null> {
  try {
    const { chromium } = await import("playwright")
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage({
        viewport: { width: input.width, height: input.height },
        isMobile: viewportIsMobile(input.viewport),
        hasTouch: viewportIsMobile(input.viewport),
      })
      await page.goto(input.targetUrl, { waitUntil: "networkidle", timeout: 30_000 })
      await page.addStyleTag({ content: browserCleanupCss() })
      await page.waitForTimeout(800)
      const shot = await page.screenshot({ type: "png", fullPage: false })
      return { buffer: Buffer.from(shot), provider: "playwright" }
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.warn("[visual-evidence] local Playwright screenshot unavailable:", error)
    return null
  }
}

export async function captureWebsiteScreenshot(
  company: Pick<VisualEvidenceCompany, "domain">,
  options: ScreenshotOptions = {},
): Promise<{ ok: true; evidence: ScreenshotEvidence } | { ok: false; error: string }> {
  const size = viewportSize(options)
  const targetUrl = options.targetUrl ?? targetUrlForDomain(company.domain)
  const dateStr = new Date().toISOString().slice(0, 7)
  const fileSlug = company.domain.replace(/[^a-zA-Z0-9.-]+/g, "-")
  const objectKey = `screenshots/${dateStr}/${fileSlug}-${size.viewport}.png`

  try {
    const capture = await captureWithPlaywright({ targetUrl, ...size })
    if (!capture) return { ok: false, error: "No screenshot provider available" }

    const publicUrl = await uploadToR2(objectKey, capture.buffer, "image/png")
    return {
      ok: true,
      evidence: {
        url: publicUrl,
        objectKey,
        provider: capture.provider,
        viewport: size.viewport,
        width: size.width,
        height: size.height,
        capturedAt: new Date().toISOString(),
        sourceUrl: targetUrl,
      },
    }
  } catch (error) {
    console.error("[visual-evidence] screenshot capture failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function evidenceIsFresh(meta: Record<string, unknown>, viewport: VisualEvidenceSlot, maxAgeDays: number): boolean {
  const visual = asRecord(meta.visual_evidence)
  const screenshots = asRecord(visual.screenshots)
  const shot = asRecord(screenshots[viewport])
  const url = typeof shot.url === "string" ? shot.url : viewport === "desktop" && typeof meta.screenshot_url === "string" ? meta.screenshot_url : null
  const capturedAt = typeof shot.captured_at === "string" ? shot.captured_at : typeof meta.screenshot_captured_at === "string" ? meta.screenshot_captured_at : null
  if (!url || !capturedAt) return false
  const captured = Date.parse(capturedAt)
  return Number.isFinite(captured) && Date.now() - captured < maxAgeDays * 86_400_000
}

function valueAtPath(meta: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = meta
  for (const segment of path) {
    const record = asRecord(current)
    current = record[segment]
  }
  return current
}

function normalizeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.toString()
  } catch (error) {
    console.warn("[visual-evidence] invalid external evidence URL:", error)
    return null
  }
}

function firstUrlFromPaths(meta: Record<string, unknown>, paths: readonly (readonly string[])[]): string | null {
  for (const path of paths) {
    const url = normalizeExternalUrl(valueAtPath(meta, path))
    if (url) return url
  }
  return null
}

function googleMapsSearchUrl(company: Pick<VisualEvidenceCompany, "company_name" | "prefecture" | "domain">): string | null {
  const parts = [company.company_name, company.prefecture, company.domain].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  )
  if (parts.length === 0) return null
  const query = encodeURIComponent(parts.join(" "))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function variantEvidenceTarget(
  company: Pick<VisualEvidenceCompany, "company_name" | "domain" | "meta" | "template_variant" | "prefecture">,
): { slot: Exclude<VisualEvidenceSlot, ScreenshotViewport>; targetUrl: string; reason: string } | null {
  const meta = asRecord(company.meta)
  const variant = company.template_variant

  const mapsUrl = firstUrlFromPaths(meta, [
    ["google_maps_url"],
    ["maps_url"],
    ["place", "url"],
    ["place", "googleMapsUri"],
    ["place", "google_maps_url"],
    ["outscraper", "google_maps_url"],
  ]) ?? (variant === "meo" ? googleMapsSearchUrl(company) : null)
  if (variant === "meo" && mapsUrl) {
    return { slot: "map", targetUrl: mapsUrl, reason: "meo: local search evidence" }
  }

  const socialUrl = firstUrlFromPaths(meta, [
    ["instagram_url"],
    ["instagram"],
    ["social", "instagram"],
    ["social_links", "instagram"],
    ["social", "tiktok"],
    ["social_links", "tiktok"],
    ["tiktok_url"],
    ["youtube_url"],
    ["social_links", "youtube"],
  ])
  if ((variant === "video_subscription" || variant === "meo") && socialUrl) {
    return { slot: "social", targetUrl: socialUrl, reason: `${variant}: social profile evidence` }
  }

  const formUrl = firstUrlFromPaths(meta, [
    ["contact_form_url"],
    ["form_url"],
    ["form_discovery", "form_url"],
    ["discovery", "contact_form_url"],
    ["crawl4ai", "contact_form_url"],
  ])
  if (variant === "outreach" && formUrl) {
    return { slot: "form", targetUrl: formUrl, reason: "outreach: contact path evidence" }
  }

  return null
}

export async function saveScreenshotEvidence(
  sb: ServiceSupabase,
  company: VisualEvidenceCompany,
  evidence: ScreenshotEvidence,
): Promise<void> {
  const latest = await sb.from("sales_companies").select("meta").eq("id", company.id).maybeSingle()
  if (latest.error) throw new Error(latest.error.message)
  const currentMeta = asRecord(latest.data?.meta ?? company.meta)
  const visual = asRecord(currentMeta.visual_evidence)
  const screenshots = asRecord(visual.screenshots)
  const shotMeta = {
    url: evidence.url,
    object_key: evidence.objectKey,
    provider: evidence.provider,
    viewport: evidence.viewport,
    width: evidence.width,
    height: evidence.height,
    captured_at: evidence.capturedAt,
    source_url: evidence.sourceUrl,
  }
  const meta = {
    ...currentMeta,
    screenshot_url: evidence.viewport === "desktop" ? evidence.url : currentMeta.screenshot_url,
    screenshot_captured_at: evidence.viewport === "desktop" ? evidence.capturedAt : currentMeta.screenshot_captured_at,
    screenshot_provider: evidence.provider,
    visual_evidence: {
      ...visual,
      last_refreshed_at: evidence.capturedAt,
      screenshots: {
        ...screenshots,
        [evidence.viewport]: shotMeta,
      },
    },
  }
  const { error } = await sb.from("sales_companies").update({ meta }).eq("id", company.id)
  if (error) throw new Error(error.message)
}

export async function ensureCompanyVisualEvidence(input: {
  sb: ServiceSupabase
  companyId: string
  viewports?: ScreenshotViewport[]
  maxAgeDays?: number
  includeVariantEvidence?: boolean
}): Promise<{
  ok: boolean
  screenshots: ScreenshotEvidence[]
  skipped: VisualEvidenceSlot[]
  errors: string[]
  variantTarget: ReturnType<typeof variantEvidenceTarget>
}> {
  const { data, error } = await input.sb
    .from("sales_companies")
    .select("id, domain, company_name, template_variant, prefecture, meta")
    .eq("id", input.companyId)
    .maybeSingle()
  if (error) return { ok: false, screenshots: [], skipped: [], errors: [error.message], variantTarget: null }
  if (!data) return { ok: false, screenshots: [], skipped: [], errors: ["Company not found"], variantTarget: null }

  const company = data as VisualEvidenceCompany
  const meta = asRecord(company.meta)
  const viewports = input.viewports ?? ["desktop", "mobile"]
  const maxAgeDays = input.maxAgeDays ?? 14
  const screenshots: ScreenshotEvidence[] = []
  const skipped: VisualEvidenceSlot[] = []
  const errors: string[] = []

  for (const viewport of viewports) {
    if (evidenceIsFresh(meta, viewport, maxAgeDays)) {
      skipped.push(viewport)
      continue
    }
    const result = await captureWebsiteScreenshot(company, { viewport })
    if (!result.ok) {
      errors.push(`${viewport}: ${result.error}`)
      continue
    }
    await saveScreenshotEvidence(input.sb, company, result.evidence)
    screenshots.push(result.evidence)
  }

  const variantTarget = input.includeVariantEvidence === false ? null : variantEvidenceTarget(company)
  if (variantTarget) {
    if (evidenceIsFresh(meta, variantTarget.slot, maxAgeDays)) {
      skipped.push(variantTarget.slot)
    } else {
      const result = await captureWebsiteScreenshot(company, {
        slot: variantTarget.slot,
        targetUrl: variantTarget.targetUrl,
      })
      if (!result.ok) {
        errors.push(`${variantTarget.slot}: ${result.error}`)
      } else {
        await saveScreenshotEvidence(input.sb, company, result.evidence)
        screenshots.push(result.evidence)
      }
    }
  }

  return {
    ok: errors.length === 0 || screenshots.length > 0 || skipped.length > 0,
    screenshots,
    skipped,
    errors,
    variantTarget,
  }
}
