import { randomUUID } from "node:crypto"
import { after, NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { demoSourceManifestSchema, validateDemoSourceManifest } from "@/lib/sales/demo-source-policy"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { INDUSTRIES } from "@/lib/sales/types"
import { activateSignedPrivateDemo } from "@/lib/sales/demo-private-access"
import {
  claimDemoBatchDrain,
  dispatchDemoBatchDrain,
  releaseDemoBatchDrain,
} from "@/lib/sales/demo-batch-drain"
import { demoSiteUrl } from "@/lib/sales/routing"
import { DEMO_QUALITY_THRESHOLD } from "@/lib/sales/demo-quality-gate"
import { queueReviewedDemoItem } from "@/lib/sales/demo-batch-queue"

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
const issueSchema = z.object({ jobIds: z.array(z.uuid()).min(1).max(100), ttlDays: z.number().int().min(1).max(7).default(7) })
const drainSchema = z.object({
  limit: z.number().int().min(1).max(3).default(3),
  drainId: z.string().uuid().optional(),
  automated: z.boolean().default(false),
})

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
      const queued = await queueReviewedDemoItem(item, "demo_batch_console")
      results.push({ index, ...queued })
    }

    const queuedCount = results.filter((result) => result.ok && result.status === "queued").length
    const reusedCount = results.filter((result) => result.ok && result.reused).length
    const acceptedCount = queuedCount + reusedCount
    const drainId = randomUUID()
    if (queuedCount > 0) {
      after(async () => {
        const dispatched = await dispatchDemoBatchDrain({ drainId })
        if (!dispatched.ok) console.error("[demo-batch] initial automatic drain failed:", dispatched.error)
      })
    }
    return NextResponse.json({
      ok: acceptedCount === results.length,
      queued: queuedCount,
      reused: reusedCount,
      rejected: results.length - acceptedCount,
      automated: queuedCount > 0,
      drainId,
      sendingEnabled: false,
      results,
    }, {
      status: acceptedCount > 0 ? 202 : 422,
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
      const qualityReport = row.result_payload?.quality_report
      const qualityPassed = Boolean(
        qualityReport
        && typeof qualityReport === "object"
        && !Array.isArray(qualityReport)
        && qualityReport.passed === true
        && typeof qualityReport.score === "number"
        && qualityReport.score >= DEMO_QUALITY_THRESHOLD,
      )
      if (!slug || !sourceReview.ok || !sourceReview.manifest || !qualityPassed) {
        const errorMessage = !slug
          ? "slug missing"
          : !qualityPassed
            ? "quality report missing or below publication threshold"
            : sourceReview.errors.join(", ")
        issued.push({ jobId: row.id, ok: false, error: errorMessage })
        continue
      }
      const access = await activateSignedPrivateDemo({
        slug,
        ttlDays: parsed.data.ttlDays,
        assets: sourceReview.manifest.assets,
      })
      const locale = row.input_payload?.locale === "en" ? "en" : "ja"
      const previewUrl = `${demoSiteUrl()}/api/demo-preview/${encodeURIComponent(slug)}?token=${encodeURIComponent(access.token)}&locale=${locale}`
      const nextResult = {
        ...row.result_payload,
        preview_expires_at: access.expiresAt,
        publication_status: "private_review",
        sending_enabled: false,
      }
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

export async function PATCH(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = drainSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })

  const drainId = parsed.data.drainId ?? randomUUID()
  const lease = await claimDemoBatchDrain(drainId)
  if (!lease.ok) return NextResponse.json({ ok: false, error: lease.error, sendingEnabled: false }, { status: 503 })
  if (!lease.claimed) return NextResponse.json({ ok: true, status: "already_running", drainId, sendingEnabled: false }, { status: 202 })

  try {
    const { runEnrichmentJobs } = await import("@/lib/sales/enrichment-jobs-runner")
    const result = await runEnrichmentJobs(parsed.data.limit, ["demo_generate"])
    const sb = getServiceSalesSupabase()
    if (!sb) throw new Error("Supabase service_role not configured")
    const due = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .select("id", { count: "exact", head: true })
      .eq("job_type", "demo_generate")
      .eq("status", "queued")
      .lte("next_run_at", new Date().toISOString())
    if (due.error) throw new Error(due.error.message)
    const remaining = due.count ?? 0

    if (remaining > 0) {
      after(async () => {
        const dispatched = await dispatchDemoBatchDrain({ drainId, limit: parsed.data.limit })
        if (!dispatched.ok) {
          console.error("[demo-batch] chained automatic drain failed:", dispatched.error)
          await releaseDemoBatchDrain(drainId)
        }
      })
    } else {
      await releaseDemoBatchDrain(drainId)
    }

    return NextResponse.json({
      ...result,
      status: remaining > 0 ? "continuing" : "drained",
      remaining,
      drainId,
      automated: parsed.data.automated,
      sendingEnabled: false,
    }, { status: result.ok ? 200 : 207 })
  } catch (error) {
    console.error("[demo-batch] automatic drain failed:", error)
    await releaseDemoBatchDrain(drainId)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "自動生成に失敗しました", drainId, sendingEnabled: false }, { status: 500 })
  }
}

function readManifestFromRelatedCompany(company: unknown) {
  if (!company || typeof company !== "object" || Array.isArray(company)) return validateDemoSourceManifest(null)
  const meta = (company as { meta?: unknown }).meta
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return validateDemoSourceManifest(null)
  return validateDemoSourceManifest((meta as Record<string, unknown>).demo_source_manifest)
}
