import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { importSearxngRunToLeadBatch } from "@/lib/sales/searxng-source"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface Body {
  limit?: number | null
  min_score?: number | null
  enrich?: boolean
  max_outreach_ready?: number | null
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
    } catch {
      // empty body is fine — use defaults
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
        .select("status")
        .eq("id", runId)
        .single()

      const currentStatus = (currentRun as { status?: string } | null)?.status
      if (currentStatus === "importing" || currentStatus === "imported") {
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

    // Fire background import (NOT awaited — runs after response is sent)
    importSearxngRunToLeadBatch({
      runId,
      limit,
      minScore,
      enrich,
      maxOutreachReady,
    })
      .then((result) => {
        if (result.ok) {
          console.log(`[sales-searxng-import] run ${runId.slice(0, 12)}... imported ${result.imported} companies`)
        } else {
          console.error(`[sales-searxng-import] run ${runId.slice(0, 12)}... failed:`, result.error)
        }
      })
      .catch((err) => {
        console.error(`[sales-searxng-import] run ${runId.slice(0, 12)}... crashed:`, err)
      })

    return NextResponse.json(
      {
        ok: true,
        status: "importing",
        runId,
        message: "Import started in background. Poll GET /api/sales/searxng/runs for status.",
      },
      { status: 202 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "SearxNG import failed"
    console.error("[sales-searxng-import] POST failed:", error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
