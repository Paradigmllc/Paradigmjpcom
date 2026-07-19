import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { generateScreenshotToCode, isScreenshotToCodeConfigured } from "@/lib/sales/screenshot-to-code-client"
import { siteUrl } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const imageSchema = z.string().min(16).max(8_000_000).refine(
  (value) => value.startsWith("data:image/") || value.startsWith("https://"),
  "画像はdata:imageまたはHTTPS URLで指定してください",
)

const requestSchema = z.object({
  company_id: z.uuid(),
  slug: z.string().min(1).max(160).regex(/^[^/]+$/u).optional(),
  image_data_urls: z.array(imageSchema).min(1).max(3),
  prompt: z.string().max(6_000).default(""),
  design_system: z.string().max(12_000).optional(),
  visual_evidence: z.string().max(48_000).optional(),
})

export async function GET(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const slug = request.nextUrl.searchParams.get("slug")?.trim()
  if (!slug) return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  const { data, error } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .select("slug, company_id, meta")
    .eq("slug", slug)
    .maybeSingle()
  if (error) {
    console.error("[screenshot-to-code] artifact lookup failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 })
  }
  if (!data) return NextResponse.json({ ok: false, error: "demo not found" }, { status: 404 })
  const meta = data.meta && typeof data.meta === "object" && !Array.isArray(data.meta) ? data.meta as Record<string, unknown> : {}
  const artifact = meta.screenshot_to_code
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    return NextResponse.json({ ok: false, error: "screenshot-to-code artifact not generated" }, { status: 404 })
  }
  const record = artifact as Record<string, unknown>
  const previewToken = typeof record.preview_token === "string" ? record.preview_token : null
  const expiresAt = typeof record.expires_at === "string" ? record.expires_at : null
  return NextResponse.json({
    ok: true,
    slug: data.slug,
    companyId: data.company_id,
    status: record.status ?? "review",
    generatedAt: record.generated_at ?? null,
    codeBytes: record.code_bytes ?? null,
    upstreamCommit: record.upstream_commit ?? null,
    provider: record.provider ?? null,
    model: record.model ?? null,
    visualMode: record.visual_mode ?? null,
    visualEvidenceMode: record.visual_evidence_mode ?? "metadata",
    visionAnalyzed: record.vision_analyzed === true,
    expiresAt,
    previewUrl: previewToken ? `${siteUrl()}/api/sales/demo-site/screenshot-to-code/preview/${encodeURIComponent(data.slug)}?token=${encodeURIComponent(previewToken)}` : null,
  }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!isScreenshotToCodeConfigured()) {
    return NextResponse.json({ ok: false, error: "screenshot-to-code gateway is not configured" }, { status: 503 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[screenshot-to-code] request JSON parse failed:", error)
    return null
  }))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  try {
    const { company_id: companyId, slug: requestedSlug } = parsed.data
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, slug")
      .eq("id", companyId)
      .maybeSingle()
    if (companyError) throw new Error(companyError.message)
    if (!company) return NextResponse.json({ ok: false, error: "company not found" }, { status: 404 })
    const slug = requestedSlug ?? company.slug
    if (!slug) return NextResponse.json({ ok: false, error: "company has no demo slug" }, { status: 422 })

    const { data: page, error: pageError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("meta")
      .eq("slug", slug)
      .eq("company_id", companyId)
      .maybeSingle()
    if (pageError) throw new Error(pageError.message)
    if (!page) return NextResponse.json({ ok: false, error: "demo page not found" }, { status: 404 })

    const generated = await generateScreenshotToCode({
      imageDataUrls: parsed.data.image_data_urls,
      prompt: `${company.company_name}の公開提案用サイト。${parsed.data.prompt}`.trim(),
      designSystem: parsed.data.design_system,
      visualEvidence: parsed.data.visual_evidence,
    })
    const previousMeta = page.meta && typeof page.meta === "object" && !Array.isArray(page.meta) ? page.meta as Record<string, unknown> : {}
    const artifact = {
      status: "review",
      code: generated.code,
      code_bytes: Buffer.byteLength(generated.code, "utf8"),
      generated_at: new Date().toISOString(),
      upstream_commit: generated.upstreamCommit,
      provider: generated.provider,
      model: generated.model,
      visual_mode: generated.visualMode,
      visual_evidence_mode: generated.visualEvidenceMode,
      vision_analyzed: generated.visionAnalyzed,
      source: "abi/screenshot-to-code",
      preview_token: randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const { error: updateError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .update({ meta: { ...previousMeta, screenshot_to_code: artifact } })
      .eq("slug", slug)
      .eq("company_id", companyId)
    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({
      ok: true,
      slug,
      companyId,
      companyName: company.company_name,
      artifact: {
        status: artifact.status,
        codeBytes: artifact.code_bytes,
        upstreamCommit: artifact.upstream_commit,
        provider: artifact.provider,
        model: artifact.model,
        visualMode: artifact.visual_mode,
        visualEvidenceMode: artifact.visual_evidence_mode,
        expiresAt: artifact.expires_at,
        generatedAt: artifact.generated_at,
      },
      previewUrl: `${siteUrl()}/api/sales/demo-site/screenshot-to-code/preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(artifact.preview_token)}`,
      sendingEnabled: false,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[screenshot-to-code] generation failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "generation failed" }, { status: 502 })
  }
}
