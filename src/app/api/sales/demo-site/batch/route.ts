import { randomUUID } from "node:crypto"
import { after, NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { demoSourceManifestSchema, validateDemoSourceManifest } from "@/lib/sales/demo-source-policy"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { INDUSTRIES } from "@/lib/sales/types"
import { activateTemporaryUnlistedDemo } from "@/lib/sales/demo-private-access"
import {
  claimDemoBatchDrain,
  dispatchDemoBatchDrain,
  releaseDemoBatchDrain,
} from "@/lib/sales/demo-batch-drain"
import { demoSiteUrl } from "@/lib/sales/routing"
import { DEMO_QUALITY_THRESHOLD } from "@/lib/sales/demo-quality-gate"
import { queueReviewedDemoItem } from "@/lib/sales/demo-batch-queue"
import { syncDemoCandidateToTwenty } from "@/lib/sales/demo-twenty-sync"
import {
  DEMO_BATCH_DISPLAY_LIMIT,
  DEMO_BATCH_ENQUEUE_CONCURRENCY,
  DEMO_BATCH_MAX_ITEMS,
  mapWithConcurrency,
  summarizeDemoBatchWave,
} from "@/lib/sales/demo-batch-wave"

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

const requestSchema = z.object({ items: z.array(itemSchema).min(1).max(DEMO_BATCH_MAX_ITEMS) })
const issueSchema = z.object({
  jobIds: z.array(z.uuid()).min(1).max(100),
  ttlDays: z.number().int().min(1).max(7).default(7),
  syncTwenty: z.boolean().default(false),
})
const drainSchema = z.object({
  limit: z.number().int().min(1).max(32).default(32),
  drainId: z.string().uuid().optional(),
  automated: z.boolean().default(false),
  action: z.enum(["drain", "retry_failed"]).default("drain"),
  waveId: z.string().uuid().optional(),
}).refine((value) => value.action !== "retry_failed" || Boolean(value.waveId), {
  message: "失敗ジョブの再試行にはwaveIdが必要です",
  path: ["waveId"],
})

export async function GET(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })

  const waveIdValue = request.nextUrl.searchParams.get("waveId")
  const waveId = waveIdValue ? z.string().uuid().safeParse(waveIdValue) : null
  if (waveId && !waveId.success) return NextResponse.json({ ok: false, error: "waveIdが不正です" }, { status: 400 })

  let jobsQuery = sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("id, company_id, status, attempts, max_attempts, error_message, input_payload, result_payload, created_at, updated_at")
    .eq("job_type", "demo_generate")
    .order("created_at", { ascending: false })
  if (waveId?.success) jobsQuery = jobsQuery.eq("input_payload->>wave_id", waveId.data)
  const { data, error } = await jobsQuery.limit(waveId?.success ? DEMO_BATCH_DISPLAY_LIMIT : 100)
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
  return NextResponse.json({
    ok: true,
    waveId: waveId?.success ? waveId.data : null,
    summary: summarizeDemoBatchWave(jobs),
    jobs,
    sendingEnabled: false,
  }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 })
    }

    const waveId = randomUUID()
    const results = await mapWithConcurrency(
      parsed.data.items,
      DEMO_BATCH_ENQUEUE_CONCURRENCY,
      async (item, index): Promise<Record<string, unknown>> => {
        try {
          const queued = await queueReviewedDemoItem({ ...item, waveId }, "demo_batch_console")
          return { index, ...queued }
        } catch (error) {
          console.error(`[demo-batch] wave ${waveId} item ${index} enqueue failed:`, error)
          return { index, ok: false, error: error instanceof Error ? error.message : "enqueue failed" }
        }
      },
    )

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
      waveId,
      requested: parsed.data.items.length,
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
      const access = await activateTemporaryUnlistedDemo({
        slug,
        ttlDays: parsed.data.ttlDays,
        assets: sourceReview.manifest.assets,
      })
      const previewUrl = `${demoSiteUrl()}/${encodeURIComponent(access.urlSlug)}`
      const nextResult = {
        ...row.result_payload,
        preview_expires_at: access.expiresAt,
        publication_status: "private_review",
        sending_enabled: false,
      }
      const update = await sb.from(DB_TABLES.SALES_ENRICHMENT_JOBS).update({ result_payload: nextResult }).eq("id", row.id)
      if (update.error) console.error("[demo-batch] preview audit update failed:", update.error.message)
      issued.push({
        jobId: row.id,
        companyId: row.company_id,
        ok: true,
        slug,
        previewUrl,
        expiresAt: access.expiresAt,
        qualityScore: typeof qualityReport.score === "number" ? qualityReport.score : null,
        sourcePolicy: typeof row.result_payload?.source_policy === "string" ? row.result_payload.source_policy : null,
      })
    }
    if (!parsed.data.syncTwenty) {
      return NextResponse.json({ ok: issued.some((item) => item.ok), issued, twentySync: null }, { headers: { "Cache-Control": "private, no-store" } })
    }

    const syncable = issued.filter((item) =>
      item.ok === true
      && typeof item.companyId === "string"
      && typeof item.jobId === "string"
      && typeof item.previewUrl === "string"
      && typeof item.expiresAt === "string"
      && typeof item.slug === "string",
    )
    const syncResults = await mapWithConcurrency(syncable, 3, async (item) => {
      const result = await syncDemoCandidateToTwenty({
        companyId: item.companyId as string,
        jobId: item.jobId as string,
        previewUrl: item.previewUrl as string,
        expiresAt: item.expiresAt as string,
        slug: item.slug as string,
        qualityScore: typeof item.qualityScore === "number" ? item.qualityScore : null,
        sourcePolicy: typeof item.sourcePolicy === "string" ? item.sourcePolicy : null,
      })
      return {
        jobId: item.jobId,
        ok: result.ok,
        configured: result.configured,
        twentyCompanyId: result.companyId ?? null,
        error: result.error ?? null,
      }
    })
    const syncByJobId = new Map(syncResults.map((item) => [item.jobId, item]))
    const enrichedIssued = issued.map((item) => ({
      ...item,
      twenty: typeof item.jobId === "string" ? syncByJobId.get(item.jobId) ?? null : null,
    }))
    const synced = syncResults.filter((item) => item.ok).length
    const failed = syncResults.length - synced
    return NextResponse.json({
      ok: issued.some((item) => item.ok) && failed === 0,
      issued: enrichedIssued,
      twentySync: {
        requested: syncable.length,
        synced,
        failed,
        results: syncResults,
      },
      sendingEnabled: false,
    }, {
      status: failed === 0 ? 200 : 207,
      headers: { "Cache-Control": "private, no-store" },
    })
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
  if (parsed.data.action === "retry_failed" && parsed.data.waveId) {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Supabase unavailable" }, { status: 503 })
    const { data, error } = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .update({
        status: "queued",
        attempts: 0,
        error_message: null,
        next_run_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        locked_at: null,
        lock_owner: null,
      })
      .eq("job_type", "demo_generate")
      .eq("input_payload->>wave_id", parsed.data.waveId)
      .eq("status", "failed")
      .select("id")
    if (error) {
      console.error("[demo-batch] failed wave retry reset failed:", error.message)
      return NextResponse.json({ ok: false, error: error.message, sendingEnabled: false }, { status: 503 })
    }
    const recovered = data?.length ?? 0
    if (recovered > 0) {
      after(async () => {
        const dispatched = await dispatchDemoBatchDrain({ drainId, limit: parsed.data.limit })
        if (!dispatched.ok) console.error("[demo-batch] retry drain failed:", dispatched.error)
      })
    }
    return NextResponse.json({
      ok: true,
      status: recovered > 0 ? "retry_queued" : "nothing_to_retry",
      recovered,
      drainId,
      waveId: parsed.data.waveId,
      sendingEnabled: false,
    }, { status: recovered > 0 ? 202 : 200 })
  }

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
