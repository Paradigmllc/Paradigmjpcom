import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { siteUrl } from "@/lib/sales/routing"
import { generateSiteReproduction } from "@/lib/sales/site-reproduction"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 900

const requestSchema = z.object({
  company_id: z.uuid(),
  source_url: z.string().url().optional(),
  requested_paths: z.array(z.string().max(180)).max(24).optional(),
  max_pages: z.number().int().min(1).max(24).default(12),
  design_system: z.string().max(12_000).optional(),
})

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function previewUrl(slug: string, token: string, page?: string): string {
  const suffix = page ? `&page=${encodeURIComponent(page)}` : ""
  return `${siteUrl()}/api/sales/demo-site/screenshot-to-code/site-preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}${suffix}`
}

export async function GET(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const slug = request.nextUrl.searchParams.get("slug")?.trim()
  if (!slug) return NextResponse.json({ ok: false, error: "slug is required" }, { status: 400 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })
  const { data, error } = await sb.from(DB_TABLES.THEME_DEMO_PAGES).select("slug, company_id, meta").eq("slug", slug).maybeSingle()
  if (error) {
    console.error("[site-reproduction] artifact lookup failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 })
  }
  const artifact = asRecord(asRecord(data?.meta).screenshot_to_code_site)
  if (!data || !artifact.status) return NextResponse.json({ ok: false, error: "site reproduction artifact not generated" }, { status: 404 })
  const token = typeof artifact.preview_token === "string" ? artifact.preview_token : null
  const pages = Array.isArray(artifact.pages) ? artifact.pages.filter((page): page is Record<string, unknown> => page && typeof page === "object" && !Array.isArray(page)) : []
  return NextResponse.json({
    ok: true,
    slug: data.slug,
    companyId: data.company_id,
    status: artifact.status,
    sourceUrl: artifact.source_url ?? null,
    generatedAt: artifact.generated_at ?? null,
    expiresAt: artifact.expires_at ?? null,
    visionRequired: artifact.vision_required === true,
    visualEvidenceMode: artifact.visual_evidence_mode ?? "metadata",
    quality: artifact.quality ?? null,
    discovery: artifact.discovery ?? null,
    pages: pages.map((page) => ({ id: page.id, path: page.path, title: page.title, quality: page.quality ?? null, previewUrl: token && typeof page.id === "string" ? previewUrl(data.slug, token, page.id) : null })),
    previewUrl: token ? previewUrl(data.slug, token) : null,
    sendingEnabled: false,
  }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = requestSchema.safeParse(await request.json().catch((error: unknown) => {
    console.error("[site-reproduction] request JSON parse failed:", error)
    return null
  }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  try {
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, meta")
      .eq("id", parsed.data.company_id)
      .maybeSingle()
    if (companyError) throw new Error(companyError.message)
    if (!company) return NextResponse.json({ ok: false, error: "company not found" }, { status: 404 })
    if (!company.slug) return NextResponse.json({ ok: false, error: "company has no demo slug" }, { status: 422 })
    if (!parsed.data.source_url && (typeof company.domain !== "string" || !company.domain.trim())) return NextResponse.json({ ok: false, error: "company has no public source domain" }, { status: 422 })
    const sourceUrl = parsed.data.source_url?.trim() || (/^https:\/\//iu.test(company.domain) ? company.domain : `https://${company.domain}`)
    const generated = await generateSiteReproduction({
      sourceUrl,
      requestedPaths: parsed.data.requested_paths,
      maxPages: parsed.data.max_pages,
      companyName: company.company_name,
      industry: company.industry,
      designSystem: parsed.data.design_system,
    })
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const artifact = {
      ...generated,
      vision_required: generated.visionRequired,
      visual_evidence_mode: generated.visualEvidenceMode,
      preview_token: token,
      expires_at: expiresAt,
      source: "abi/screenshot-to-code",
      sending_enabled: false,
    }
    const existing = await sb.from(DB_TABLES.THEME_DEMO_PAGES).select("meta, title, theme, blocks").eq("slug", company.slug).maybeSingle()
    if (existing.error) throw new Error(existing.error.message)
    const meta = { ...asRecord(existing.data?.meta), screenshot_to_code_site: artifact }
    const { error: saveError } = await sb.from(DB_TABLES.THEME_DEMO_PAGES).upsert({
      slug: company.slug,
      theme: existing.data?.theme ?? "astrowind",
      title: existing.data?.title ?? `${company.company_name} — visual reproduction review`,
      blocks: existing.data?.blocks ?? [],
      meta,
      company_id: company.id,
      ...(existing.data ? {} : { is_published: false }),
    }, { onConflict: "slug" })
    if (saveError) throw new Error(saveError.message)

    return NextResponse.json({
      ok: generated.quality.passed,
      status: generated.status,
      slug: company.slug,
      companyId: company.id,
      companyName: company.company_name,
      artifact: { status: generated.status, expiresAt, quality: generated.quality, discovery: generated.discovery, visionRequired: generated.visionRequired, visualEvidenceMode: generated.visualEvidenceMode },
      previewUrl: previewUrl(company.slug, token),
      pages: generated.pages.map((page) => ({ id: page.id, path: page.path, title: page.title, quality: page.quality, previewUrl: previewUrl(company.slug, token, page.id) })),
      sendingEnabled: false,
    }, { status: generated.quality.passed ? 201 : 207, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[site-reproduction] generation failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "site reproduction failed", sendingEnabled: false }, { status: 502 })
  }
}
