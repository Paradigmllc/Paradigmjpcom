import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { ingestLeadCandidatesDurable } from "@/lib/sales/lead-candidate-runs"
import { getLeadSourceReadiness } from "@/lib/sales/lead-source-records"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  countryCodes: z.array(z.string().length(2)).min(1).max(20),
  technology: z.string().trim().min(1).max(80).optional(),
  limitPerCountry: z.number().int().min(1).max(5_000).default(100),
  verifyPerCountry: z.number().int().min(1).max(1_000).default(20),
  minOpportunityScore: z.number().int().min(0).max(100).default(68),
  minSmbScore: z.number().int().min(0).max(100).default(50),
  minFormConfidence: z.number().int().min(0).max(100).default(80),
  executionMode: z.enum(["pilot", "batch"]).default("pilot"),
  operatorName: z.string().trim().min(2).max(120),
  confirmBatch: z.string().optional(),
})

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}

function boundedRunLimit(value: string | null): number {
  const parsed = Number(value ?? 30)
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), 100) : 30
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
    const limit = boundedRunLimit(req.nextUrl.searchParams.get("limit"))
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
      .select("id, source_slug, country_code, technology, status, execution_mode, operator_status, cancel_requested, requested_limit, verify_limit, min_opportunity_score, min_smb_score, min_form_confidence, fetched_count, verified_count, scored_count, source_qualified_count, quality_rejected_count, review_required_count, forms_checked_count, forms_qualified_count, promoted_count, operator_approved_count, operator_rejected_count, twenty_synced_count, failure_count, error_message, heartbeat_at, started_at, created_at, updated_at")
      .eq("source_slug", "evidence_first_sources")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, runs: data ?? [] })
  } catch (error) {
    console.error("[lead-candidate-factory] list failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory runs could not be loaded" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const countryCodes = [...new Set(parsed.data.countryCodes.map((code) => code.toUpperCase()))]
    if (parsed.data.executionMode === "pilot" && (countryCodes.length > 3 || parsed.data.limitPerCountry > 100 || parsed.data.verifyPerCountry > 25)) {
      return NextResponse.json({ ok: false, error: "Pilot mode is limited to 3 countries, 100 candidates and 25 verifications per country" }, { status: 400 })
    }
    if (parsed.data.executionMode === "batch" && parsed.data.confirmBatch !== "START VERIFIED BATCH") {
      return NextResponse.json({ ok: false, error: "Batch confirmation phrase is required" }, { status: 400 })
    }
    const readiness = await getLeadSourceReadiness(countryCodes)
    const missingSources = countryCodes.filter((countryCode) => parsed.data.executionMode === "batch"
      ? (readiness[countryCode]?.scaleReadyRecordCount ?? 0) === 0
      : (readiness[countryCode]?.recordCount ?? 0) === 0)
    if (missingSources.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `証拠付き収集元の取込データがありません: ${missingSources.join(", ")}`,
        readiness,
      }, { status: 409 })
    }
    const runs = await mapLimit(countryCodes, 2, async (countryCode) => ingestLeadCandidatesDurable({
      countryCode,
      sourceConfigIds: parsed.data.executionMode === "batch"
        ? readiness[countryCode]?.scaleReadySourceIds ?? []
        : readiness[countryCode]?.sourceIds ?? [],
      technology: parsed.data.technology,
      limit: parsed.data.limitPerCountry,
      verifyLimit: parsed.data.verifyPerCountry,
      promote: false,
      minOpportunityScore: parsed.data.minOpportunityScore,
      minSmbScore: parsed.data.minSmbScore,
      requireVerifiedForm: true,
      minFormConfidence: parsed.data.minFormConfidence,
      syncTwenty: false,
      executionMode: parsed.data.executionMode,
    }))
    try {
      await Promise.all(runs.map((run, index) => recordLeadOperatorEvent({
        runId: run.runId,
        entityType: "run",
        entityId: run.runId,
        action: parsed.data.executionMode === "pilot" ? "pilot_started" : "batch_started",
        operatorName: parsed.data.operatorName,
        detail: { countryCode: countryCodes[index], limitPerCountry: parsed.data.limitPerCountry, verifyPerCountry: parsed.data.verifyPerCountry, runnerStarted: run.ok },
      })))
    } catch (auditError) {
      console.error("[lead-candidate-factory] audit persistence failed; cancelling runs:", auditError)
      const sb = getServiceSalesSupabase()
      if (sb) {
        const cancelled = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({
          cancel_requested: true,
          status: "cancelled",
          completed_at: new Date().toISOString(),
          error_message: "Operator audit persistence failed before run acknowledgement",
        }).in("id", runs.map((run) => run.runId))
        if (cancelled.error) console.error("[lead-candidate-factory] failed to cancel unaudited runs:", cancelled.error.message)
      }
      throw new Error("Operator audit could not be persisted; all started runs were cancelled")
    }
    const failed = runs.filter((run) => !run.ok)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: `フォーム適格リスト量産: ${runs.length}地域`,
        message: `${parsed.data.executionMode}候補取得→実フォーム確認→人手レビュー待ち。Twenty同期・送信・文面生成・レポート生成は起動しません。開始失敗${failed.length}件。`,
        link: "/ja/admin/lead-factory",
        type: "form_qualified_lead_factory_started",
      })
    } catch (error) {
      console.error("[lead-candidate-factory] notification failed:", error)
    }
    return NextResponse.json({ ok: failed.length === 0, runs, failed: failed.length, readiness }, { status: failed.length === 0 ? 202 : 207 })
  } catch (error) {
    console.error("[lead-candidate-factory] start failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory could not be started" }, { status: 500 })
  }
}
