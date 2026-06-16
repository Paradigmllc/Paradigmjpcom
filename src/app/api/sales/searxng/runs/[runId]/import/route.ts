import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { importSearxngRunToLeadBatch } from "@/lib/sales/searxng-source"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface Body {
  limit?: number | null
  min_score?: number | null
  enrich?: boolean
  max_outreach_ready?: number | null
}

async function markImportFailed(runId: string, error: unknown): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const message = error instanceof Error ? error.message : String(error)
  const { error: updateError } = await sb
    .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId)
  if (updateError) console.error("[sales-searxng-import] failed to mark run failed:", updateError.message)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { runId } = await params
    let body: Body = {}
    try {
      body = (await req.json()) as Body
    } catch (error) {
      console.warn("[sales-searxng-import] empty or invalid JSON body; using defaults:", error)
    }

    // Normalize camelCase → snake_case (frontend sends camelCase JSON)
    const raw = body as Record<string, unknown>
    const limit = (raw.limit ?? null) as number | null | undefined
    const minScore = (raw.minScore ?? raw.min_score ?? null) as number | null | undefined
    const enrich = (raw.enrich ?? true) as boolean
    const maxOutreachReady = (raw.maxOutreachReady ?? raw.max_outreach_ready ?? null) as number | null | undefined

    // ── Async import: guard against double-fire, set status, return 202 ──
    const sb = getServiceSalesSupabase()

    // Check current status to avoid double-import
    if (sb) {
      const { data: currentRun } = await sb
        .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
        .select("status, updated_at")
        .eq("id", runId)
        .single()

      const currentStatus = (currentRun as { status?: string } | null)?.status
      const updatedAt = (currentRun as { updated_at?: string } | null)?.updated_at
      const importingAgeMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : 0
      if (currentStatus === "imported" || (currentStatus === "importing" && importingAgeMs < 10 * 60 * 1000)) {
        return NextResponse.json(
          { ok: true, status: currentStatus, runId, message: `Import already ${currentStatus}` },
          { status: 200 },
        )
      }

      await sb
        .from(DB_TABLES.SALES_SEARXNG_SEARCH_RUNS)
        .update({ status: "importing" })
        .eq("id", runId)
    }

    const result = await importSearxngRunToLeadBatch({
      runId,
      limit,
      minScore,
      enrich,
      maxOutreachReady,
    })
    if (!result.ok) {
      console.error(`[sales-searxng-import] run ${runId.slice(0, 12)}... failed:`, result.error)
      await markImportFailed(runId, new Error(result.error ?? "SearXNG import failed"))
      return NextResponse.json({ ok: false, status: "failed", runId, error: result.error ?? "SearXNG import failed" }, { status: 502 })
    }
    console.info(`[sales-searxng-import] run ${runId.slice(0, 12)}... imported ${result.imported} companies`)

    return NextResponse.json(
      {
        ok: true,
        status: "imported",
        runId,
        imported: result.imported,
        batch: result.batch ?? null,
        message: "Import completed.",
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "SearxNG import failed"
    console.error("[sales-searxng-import] POST failed:", error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
