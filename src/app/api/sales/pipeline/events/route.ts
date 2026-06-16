import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Initial snapshot
      const { data: runs } = await sb
        .from(DB_TABLES.SALES_PIPELINE_RUNS)
        .select("id, status, current_step, company_id, error_message, updated_at, sales_companies(company_name)")
        .in("status", ["queued", "running", "waiting_external"])
        .order("updated_at", { ascending: false })
        .limit(10)

      send({ type: "snapshot", runs: runs ?? [], at: new Date().toISOString() })

      // Poll every 15 seconds
      let lastIds = new Set((runs ?? []).map((r) => r.id))
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          const { data: fresh } = await sb
            .from(DB_TABLES.SALES_PIPELINE_RUNS)
            .select("id, status, current_step, company_id, error_message, updated_at, sales_companies(company_name)")
            .in("status", ["queued", "running", "waiting_external", "completed", "failed", "needs_review"])
            .gte("updated_at", new Date(Date.now() - 300_000).toISOString())
            .order("updated_at", { ascending: false })
            .limit(15)

          const freshIds = new Set((fresh ?? []).map((r) => r.id))
          const changed = (fresh ?? []).filter((r) => !lastIds.has(r.id) || r.status !== "queued")
          if (changed.length > 0) {
            send({ type: "update", runs: changed, at: new Date().toISOString() })
          }
          lastIds = freshIds
        } catch (e) {
          console.warn("[pipeline-events] poll failed:", e)
        }
      }, 15_000)

      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
