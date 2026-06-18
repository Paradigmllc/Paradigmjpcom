import { getServiceSalesSupabase } from "@/lib/supabase"
import { getMubengProxyUrl } from "./proxy-agent"
import { uploadToR2 } from "./r2-storage"
import { screenshotWithSteel } from "./sources/steel-source"
import type { TemplateVariant } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

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
  provider: "playwright" | "outreach_worker" | "steel"
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

import { optionalEnv } from "./japan-readiness-utils"

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

function withPath(base: string, pathname: string): string {
  const url = new URL(base)
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${pathname.replace(/^\/+/, "")}`.replace(/\/+/g, "/")
  return url.toString()
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

async function bufferFromSteelScreenshot(value: string): Promise<Buffer | null> {
  const trimmed = value.trim()
  if (!trimmed) return null

  const dataUri = trimmed.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.+)$/i)
  if (dataUri?.[1]) return Buffer.from(dataUri[1], "base64")

  if (/^https?:\/\//i.test(trimmed)) {
    const res = await fetch(trimmed, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`Steel screenshot URL fetch failed: HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }

  if (/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
    return Buffer.from(trimmed.replace(/\s+/g, ""), "base64")
  }

  return null
}

async function captureWithOutreachWorker(input: {
  targetUrl: string
  width: number
  height: number
  viewport: VisualEvidenceSlot
}): Promise<ScreenshotCapture | null> {
  const endpoint = optionalEnv("OUTREACH_WORKER_URL") ?? optionalEnv("CRAWLEE_WORKER_URL")
  const secret = optionalEnv("OUTREACH_WORKER_SECRET") ?? optionalEnv("CRAWLEE_WORKER_SECRET")
  if (!endpoint || !secret) return null

  try {
    const res = await fetch(withPath(endpoint, "/screenshot"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": secret,
      },
      body: JSON.stringify({
        url: input.targetUrl,
        width: input.width,
        height: input.height,
        isMobile: viewportIsMobile(input.viewport),
      }),
      signal: AbortSignal.timeout(75_000),
    })
    const text = await res.text()
    if (!res.ok) {
      console.warn("[visual-evidence] outreach worker screenshot unavailable:", text.slice(0, 240))
      return null
    }
    const parsed = text ? (JSON.parse(text) as { screenshot?: unknown }) : {}
    if (typeof parsed.screenshot !== "string" || !parsed.screenshot.trim()) return null
    return { buffer: Buffer.from(parsed.screenshot, "base64"), provider: "outreach_worker" }
  } catch (error) {
    console.warn("[visual-evidence] outreach worker screenshot failed:", error)
    return null
  }
}

async function captureWithSteel(input: {
  targetUrl: string
}): Promise<ScreenshotCapture | null> {
  const result = await screenshotWithSteel(input.targetUrl)
  if (!result.ok || !result.screenshot) {
    if (result.error && result.error !== "STEEL_BASE_URL is not configured") {
      console.warn("[visual-evidence] Steel screenshot unavailable:", result.error)
    }
    return null
  }

  try {
    const buffer = await bufferFromSteelScreenshot(result.screenshot)
    return buffer ? { buffer, provider: "steel" } : null
  } catch (error) {
    console.warn("[visual-evidence] Steel screenshot decode failed:", error)
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
    const capture =
      (await captureWithPlaywright({ targetUrl, ...size })) ??
      (await captureWithOutreachWorker({ targetUrl, ...size })) ??
      (await captureWithSteel({ targetUrl }))
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
  // Atomic deep-merge into visual_evidence.screenshots.{viewport} — single UPDATE,
  // no SELECT→merge→UPDATE TOCTOU race.
  const { error } = await sb.rpc("sales_atomic_screenshot_append", {
    p_company_id: company.id,
    p_viewport: evidence.viewport,
    p_screenshot: shotMeta,
  })
  if (error) {
    console.error("[visual-evidence] saveScreenshotEvidence update failed:", error.message)
    throw new Error(error.message)
  }
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
    .from(DB_TABLES.SALES_COMPANIES)
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
