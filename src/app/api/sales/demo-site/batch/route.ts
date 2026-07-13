import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { findCompanyById, upsertCompanyByDomain } from "@/lib/sales/companies"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { demoSourceManifestSchema, sourceManifestToCompanyMeta, validateDemoSourceManifest } from "@/lib/sales/demo-source-policy"
import { enqueueCompanyEnrichment } from "@/lib/sales/enrichment-jobs"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { INDUSTRIES } from "@/lib/sales/types"
import { activateSignedPrivateDemo } from "@/lib/sales/demo-private-access"
import { demoSiteUrl } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const itemSchema = z.object({
  companyId: z.uuid().optional(),
  companyName: z.string().min(1).max(160).optional(),
  industry: z.enum(INDUSTRIES).default("consulting"),
  prefecture: z.string().max(80).optional(),
  locale: z.enum(["ja", "en"]).default("ja"),
  manifest: demoSourceManifestSchema,
}).refine((item) => Boolean(item.companyId || item.companyName), {
  message: "companyId または companyName が必要です",
})

const requestSchema = z.object({ items: z.array(itemSchema).min(1).max(100) })
const issueSchema = z.object({ jobIds: z.array(z.uuid()).min(1).max(100), ttlDays: z.number().int().min(1).max(30).default(14) })

function syntheticDomain(companyName: string, manifest: z.infer<typeof demoSourceManifestSchema>): string {
  const seed = `${companyName}:${manifest.sources.map((source) => source.url).sort().join("|")}`
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 16)
  return `demo-only-${hash}.invalid`
}

export async function GET(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  const { data, error } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("id, company_id, status, attempts, max_attempts, error_message, result_payload, created_at, updated_at")
    .eq("job_type", "demo_generate")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) {
    console.error("[demo-batch] queue fetch failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 })
  }
  const companyIds = [...new Set((data ?? []).map((row) => row.company_id).filter((id): id is string => typeof id === "string"))]
  const companies = companyIds.length > 0
    ? await sb.from(DB_TABLES.SALES_COMPANIES).select("id, company_name").in("id", companyIds)
    : { data: [], error: null }
  if (companies.error) {
    console.error("[demo-batch] company fetch failed:", companies.error.message)
    return NextResponse.json({ ok: false, error: companies.error.message }, { status: 503 })
  }
  const companyById = new Map((companies.data ?? []).map((company) => [company.id, company]))
  const jobs = (data ?? []).map((row) => ({
    ...row,
    sales_companies: row.company_id ? companyById.get(row.company_id) ?? null : null,
  }))
  return NextResponse.json({ ok: true, jobs }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    }

    const results: Array<Record<string, unknown>> = []
    for (const [index, item] of parsed.data.items.entries()) {
      const review = validateDemoSourceManifest(item.manifest)
      if (!review.ok || !review.manifest) {
        results.push({ index, ok: false, error: review.errors.join(", ") })
        continue
      }

      const existing = item.companyId ? await findCompanyById(item.companyId) : null
      if (item.companyId && !existing) {
        results.push({ index, ok: false, error: "company not found" })
        continue
      }
      const companyName = existing?.company_name ?? item.companyName ?? ""
      const saved = await upsertCompanyByDomain({
        domain: existing?.domain ?? syntheticDomain(companyName, review.manifest),
        company_name: companyName,
        region: item.locale === "ja" ? "jp" : "global",
        report_locale: item.locale,
        industry: existing?.industry ?? item.industry,
        prefecture: existing?.prefecture ?? item.prefecture ?? null,
        pipeline_status: "manual_queue",
        source: "reviewed_demo_manifest",
        meta: sourceManifestToCompanyMeta(review.manifest),
      })
      if (!saved.ok || !saved.company) {
        results.push({ index, ok: false, error: saved.error ?? "company save failed" })
        continue
      }

      const queued = await enqueueCompanyEnrichment({
        companyId: saved.company.id,
        jobType: "demo_generate",
        source: "reviewed_demo_manifest",
        triggeredBy: "demo_batch_console",
        priority: 60,
        payload: { locale: item.locale, source_policy: "reviewed_manifest", sending_enabled: false },
      })
      results.push({
        index,
        ok: queued.ok,
        companyId: saved.company.id,
        companyName: saved.company.company_name,
        jobId: queued.job?.id,
        error: queued.error,
      })
    }

    const queuedCount = results.filter((result) => result.ok).length
    return NextResponse.json({ ok: queuedCount === results.length, queued: queuedCount, rejected: results.length - queuedCount, results }, {
      status: queuedCount > 0 ? 202 : 422,
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("[demo-batch] enqueue failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "enqueue failed" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })
  try {
    const parsed = issueSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    const { data, error } = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .select("id, company_id, status, input_payload, result_payload")
      .eq("job_type", "demo_generate")
      .eq("status", "completed")
      .in("id", parsed.data.jobIds)
    if (error) throw new Error(error.message)

    const companyIds = [...new Set((data ?? []).map((row) => row.company_id).filter((id): id is string => typeof id === "string"))]
    const companies = companyIds.length > 0
      ? await sb.from(DB_TABLES.SALES_COMPANIES).select("id, meta").in("id", companyIds)
      : { data: [], error: null }
    if (companies.error) throw new Error(companies.error.message)
    const companyById = new Map((companies.data ?? []).map((company) => [company.id, company]))

    const issued: Array<Record<string, unknown>> = []
    for (const row of data ?? []) {
      const related = row.company_id ? companyById.get(row.company_id) : null
      const sourceReview = readManifestFromRelatedCompany(related)
      const slug = typeof row.result_payload?.slug === "string" ? row.result_payload.slug : null
      if (!slug || !sourceReview.ok || !sourceReview.manifest) {
        issued.push({ jobId: row.id, ok: false, error: slug ? sourceReview.errors.join(", ") : "slug missing" })
        continue
      }
      const access = await activateSignedPrivateDemo({ slug, ttlDays: parsed.data.ttlDays, assets: sourceReview.manifest.assets })
      const locale = row.input_payload?.locale === "en" ? "en" : "ja"
      const previewUrl = `${demoSiteUrl()}/api/demo-preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(access.token)}&locale=${locale}`
      const nextResult = { ...row.result_payload, preview_issued_at: new Date().toISOString(), preview_expires_at: access.expiresAt }
      const update = await sb.from(DB_TABLES.SALES_ENRICHMENT_JOBS).update({ result_payload: nextResult }).eq("id", row.id)
      if (update.error) console.error("[demo-batch] preview audit update failed:", update.error.message)
      issued.push({ jobId: row.id, ok: true, slug, previewUrl, expiresAt: access.expiresAt })
    }
    return NextResponse.json({ ok: issued.some((item) => item.ok), issued }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[demo-batch] preview issue failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "preview issue failed" }, { status: 500 })
  }
}

function readManifestFromRelatedCompany(company: unknown) {
  if (!company || typeof company !== "object" || Array.isArray(company)) return validateDemoSourceManifest(null)
  const meta = (company as { meta?: unknown }).meta
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return validateDemoSourceManifest(null)
  return validateDemoSourceManifest((meta as Record<string, unknown>).demo_source_manifest)
}
