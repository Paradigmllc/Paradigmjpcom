import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { matchContentTemplate } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"
import { getR2StorageConfig, sanitizeR2ObjectName } from "./r2-storage"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import crypto from "node:crypto"

import { buildVariantVideoHtml } from "./video-templates"
import { DB_TABLES } from "@/lib/sales/db-tables"

import { type NarrationScript, generateNarrationScript, fallbackScript } from "./video-narration"

// Re-export narration for backwards compat
export type { NarrationScript } from "./video-narration"
export { generateNarrationScript, fallbackScript } from "./video-narration"

// Re-export ComfyUI types and functions for backwards compat
export type {
  ComfyuiGenerationResult,
  ProfessionalVideoResult,
  ProfessionalVideoOptions,
} from "./video-comfyui"
export {
  generateComfyUIBackground,
  generateComfyUIAvatar,
  generateComfyUIBroll,
  generateComfyUIThumbnail,
  generateComfyUIVideo,
  generateProfessionalVideo,
} from "./video-comfyui"

export function buildHyperFramesHtml(data: DiagnosticReportData, script: NarrationScript): string {
  return buildVariantVideoHtml(data, script)
}

function getHyperframesApi(): string | null {
  const value = process.env.HYPERFRAMES_API_URL
  if (!value) return null
  return value.replace(/\/+$/, "")
}

function getHyperframesApiKey(): string | null {
  const value = process.env.HYPERFRAMES_API_KEY
  return value && value.trim().length > 0 ? value.trim() : null
}

function getBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL
  return value ? value.replace(/\/+$/, "") : "https://paradigmjp.com"
}

async function renderLocallyAndUpload(
  html: string,
  company: { id: string; slug?: string | null },
  locale: string,
): Promise<{ ok: boolean; video_url?: string; error?: string }> {
  const r2 = getR2StorageConfig()
  const tmpDir = path.join(os.tmpdir(), `hf-render-${crypto.randomUUID().slice(0, 8)}`)
  
  try {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.mkdirSync(path.join(tmpDir, "renders"), { recursive: true })

    // Write composition files
    fs.writeFileSync(path.join(tmpDir, "index.html"), html, "utf-8")
    fs.writeFileSync(path.join(tmpDir, "hyperframes.json"), JSON.stringify({
      registry: "https://hyperframes.ai/registry",
      paths: {
        blocks: "compositions",
        components: "compositions/components",
        assets: "assets",
      },
      render: { defaults: { fps: 30, quality: "standard", format: "mp4" } }
    }))

    // Render MP4
    const outName = `diagnostic-${company.id.slice(0, 8)}-${Date.now()}`
    execSync(`npx hyperframes render --fps 30 --quality standard --output "renders/${outName}.mp4"`, {
      cwd: tmpDir, stdio: "pipe", timeout: 300_000,
    })

    const renderDir = path.join(tmpDir, "renders")
    const files = fs.readdirSync(renderDir).filter(f => f.endsWith(".mp4"))
    if (!files.length) return { ok: false, error: "No MP4 produced by hyperframes render" }

    const mp4Path = path.join(renderDir, files[0])
    const mp4Buf = fs.readFileSync(mp4Path)

    // Upload to R2
    if (r2.ready && r2.bucket) {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
      const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
      const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
      if (accountId && accessKey && secretKey) {
        const s3 = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        })
        const key = sanitizeR2ObjectName(`videos/${company.slug || company.id.slice(0, 8)}/${locale}/${files[0]}`)
        await s3.send(new PutObjectCommand({
          Bucket: r2.bucket, Key: key, Body: mp4Buf, ContentType: "video/mp4",
        }))
        const publicUrl = r2.publicBaseUrl
          ? `${r2.publicBaseUrl.replace(/\/+$/, "")}/${key}`
          : null
        return { ok: true, video_url: publicUrl ?? undefined }
      }
    }
    return { ok: false, error: "R2 not configured" }
  } catch (error) {
    console.error("[video-generator] local render failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (e) { console.error("[video-generator] cleanup failed:", e) }
  }
}

async function saveVideoUrlToDb(companyId: string, videoUrl: string, _script: unknown) {
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return
    await sb.from(DB_TABLES.SALES_COMPANIES).update({ meta: { video_url: videoUrl, video_generated_at: new Date().toISOString() } }).eq("id", companyId)
  } catch (error) {
    console.error("[video-generator] failed to save video_url to DB:", error)
  }
}

export interface VideoGenerationResult {
  ok: boolean
  video_url?: string
  duration_sec?: number
  script?: NarrationScript
  html?: string
  content_template?: {
    title: string
    quality_bar: string
    dify_selection_rule: string
  }
  error?: string
}

import { isUuid } from "./japan-readiness-utils"

export async function generateDiagnosticVideo(
  companyIdOrSlugOrDomain: string,
  reportLocale?: string | null,
): Promise<VideoGenerationResult> {
  const requestedLocale = reportLocale ? normalizeReportLocale(reportLocale, "jp") : null
  const requestedRegion = requestedLocale ? localeToRegion(requestedLocale) : "jp"
  let company = await findCompanyBySlug(companyIdOrSlugOrDomain, requestedRegion)
  if (!company) {
    company = isUuid(companyIdOrSlugOrDomain)
      ? await findCompanyById(companyIdOrSlugOrDomain)
      : companyIdOrSlugOrDomain.includes(".")
        ? await findCompanyByDomain(companyIdOrSlugOrDomain)
        : null
  }
  if (!company) return { ok: false, error: "company not found" }

  const data = await fetchDiagnosticReport({
    companyId: company.id,
    reportLocale: requestedLocale ?? company.report_locale ?? undefined,
  })
  if (!data) return { ok: false, error: "diagnostic data unavailable" }

  const narration = await generateNarrationScript(data)
  const script = narration.script ?? fallbackScript(data)
  const html = buildHyperFramesHtml(data, script)
  const contentTemplate = await matchContentTemplate({
    reportLocale: data.report_locale,
    targetCountry: data.target_country,
    industry: data.industry,
    assetType: "sales_video",
    templateVariant: data.template_variant,
  })
  const previewUrl = company.slug ? `${getBaseUrl()}/${data.report_locale}/report/${company.slug}/video` : null
  const api = getHyperframesApi()
  const apiKey = getHyperframesApiKey()

  const baseResult = {
    script,
    html,
    content_template: {
      title: contentTemplate.title,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
    },
    duration_sec: 60,
  }

  // Try HyperFrames API first
  if (api && apiKey) {
    try {
      const res = await fetch(`${api}/render`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ html, format: "mp4", width: 1920, height: 1080, fps: 30, duration_sec: 60 }),
        signal: AbortSignal.timeout(180_000),
      })
      if (res.ok) {
        const result = (await res.json()) as { video_url?: string; ok?: boolean }
        const mp4Url = result.video_url
        if (mp4Url) {
          // Save to DB
          await saveVideoUrlToDb(company.id, mp4Url, script)
          return { ok: true, video_url: mp4Url, ...baseResult }
        }
      }
      console.warn("[video-generator] HF API returned non-ok, falling back to local render")
    } catch (error) {
      console.error("[video-generator] HF API failed, falling back to local render:", error)
    }
  }

  // Fallback: local render via hyperframes CLI + R2 upload
  const localResult = await renderLocallyAndUpload(html, company, data.report_locale)
  if (localResult.ok && localResult.video_url) {
    await saveVideoUrlToDb(company.id, localResult.video_url, script)
    return { ok: true, video_url: localResult.video_url, ...baseResult }
  }

  // Final fallback: HTML preview only
  return {
    ok: !!previewUrl,
    video_url: previewUrl ?? undefined,
    ...baseResult,
    error: localResult.error ?? "Video render unavailable; HTML preview returned",
  }
}
