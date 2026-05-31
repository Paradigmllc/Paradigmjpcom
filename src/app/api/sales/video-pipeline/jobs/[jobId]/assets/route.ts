import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { createR2SignedUploads, getR2StorageConfig, sanitizeR2ObjectName } from "@/lib/sales/r2-storage"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface RouteContext {
  params: Promise<{ jobId: string }>
}

interface UploadFileInput {
  name?: unknown
  content_type?: unknown
}

function readFileInputs(value: unknown): Array<{ name: string; contentType: string }> {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 20)
    .map((item: UploadFileInput) => {
      const name = typeof item.name === "string" ? sanitizeR2ObjectName(item.name) : ""
      const contentType = typeof item.content_type === "string" && item.content_type.trim() ? item.content_type.trim() : "application/octet-stream"
      return { name, contentType }
    })
    .filter((item) => item.name.length > 0)
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const { jobId } = await ctx.params
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 })
  const { data, error } = await sb
    .from("sales_video_jobs")
    .select("id, r2_bucket, r2_asset_prefix, asset_manifest, delivery_formats, r2_output_url")
    .eq("id", jobId)
    .single()
  if (error) {
    console.error("[sales-video-assets-api] read failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
  }
  return NextResponse.json({ ok: true, r2: getR2StorageConfig(), job: data }, { status: 200 })
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const { jobId } = await ctx.params
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 500 })

  try {
    const body = (await req.json()) as { files?: unknown }
    const files = readFileInputs(body.files)
    if (files.length === 0) return NextResponse.json({ ok: false, error: "files are required" }, { status: 400 })

    const { data: job, error: readError } = await sb
      .from("sales_video_jobs")
      .select("id, r2_asset_prefix, asset_manifest")
      .eq("id", jobId)
      .single()
    if (readError || !job) {
      console.error("[sales-video-assets-api] job lookup failed:", readError?.message)
      return NextResponse.json({ ok: false, error: readError?.message ?? "job not found" }, { status: 404 })
    }

    const prefix = typeof job.r2_asset_prefix === "string" && job.r2_asset_prefix.trim() ? job.r2_asset_prefix.trim() : `sales-videos/manual/${jobId}/`
    const uploads = await createR2SignedUploads(
      files.map((file) => ({
        objectKey: `${prefix.replace(/\/+$/, "")}/${file.name}`,
        contentType: file.contentType,
      })),
    )
    const currentManifest = job.asset_manifest && typeof job.asset_manifest === "object" && !Array.isArray(job.asset_manifest)
      ? (job.asset_manifest as Record<string, unknown>)
      : {}
    const nextManifest = {
      ...currentManifest,
      pending_uploads: uploads.map(({ objectKey, publicUrl, contentType, expiresInSeconds }) => ({
        object_key: objectKey,
        public_url: publicUrl,
        content_type: contentType,
        expires_in_seconds: expiresInSeconds,
      })),
      upload_urls_issued_at: new Date().toISOString(),
    }

    const { error: updateError } = await sb
      .from("sales_video_jobs")
      .update({ asset_manifest: nextManifest, orchestration_stage: "r2_upload_urls_issued" })
      .eq("id", jobId)
    if (updateError) {
      console.error("[sales-video-assets-api] manifest update failed:", updateError.message)
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, uploads }, { status: 200 })
  } catch (error) {
    console.error("[sales-video-assets-api] create upload urls failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown R2 upload preparation error" },
      { status: 500 },
    )
  }
}
