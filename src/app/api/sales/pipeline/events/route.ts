import { NextRequest, NextResponse } from "next/server"
import { RealtimeClient } from "@supabase/supabase-js"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getSalesSupabaseConfig, getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface PipelineRunEventRow {
  id?: string
  status?: string | null
  current_step?: string | null
  company_id?: string | null
  error_message?: string | null
  updated_at?: string | null
}

interface PipelineChangePayload {
  eventType?: string
  new?: PipelineRunEventRow | null
  old?: PipelineRunEventRow | null
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function normalizeRealtimeUrl(url: string): string {
  const base = url.replace(/\/+$/, "")
  return base.endsWith("/realtime/v1") ? base : `${base}/realtime/v1`
}

function getSalesRealtimeUrl(restUrl: string): string {
  const explicit = optionalEnv("SALES_SUPABASE_REALTIME_URL") ?? optionalEnv("NEXT_PUBLIC_SUPABASE_REALTIME_URL")
  if (explicit) return normalizeRealtimeUrl(explicit)

  const parsed = new URL(restUrl)
  if (/^supabase-rest-1$/i.test(parsed.hostname)) {
    return "http://supabase-realtime:4000/realtime/v1"
  }

  parsed.pathname = "/realtime/v1"
  parsed.search = ""
  parsed.hash = ""
  parsed.protocol = parsed.protocol.replace(/^ws/i, "http")
  return parsed.toString()
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
  const config = getSalesSupabaseConfig()
  if (!config) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 500 })

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch (error) {
          console.warn("[pipeline-events] close failed:", error)
        }
      }

      // Initial snapshot
      const { data: runs } = await sb
        .from(DB_TABLES.SALES_PIPELINE_RUNS)
        .select("id, status, current_step, company_id, error_message, updated_at, sales_companies(company_name)")
        .in("status", ["queued", "running", "waiting_external"])
        .order("updated_at", { ascending: false })
        .limit(10)

      send({ type: "snapshot", runs: runs ?? [], at: new Date().toISOString() })

      const realtimeUrl = getSalesRealtimeUrl(config.url)
      const realtime = new RealtimeClient(realtimeUrl, {
        params: { apikey: config.serviceKey },
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
        },
      })

      const channel = realtime
        .channel("sales-pipeline-runs-events")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: DB_TABLES.SALES_PIPELINE_RUNS },
          async (payload: PipelineChangePayload) => {
            if (closed) return
            const row = payload.new
            const id = row?.id
            if (!id) return
            const updatedAt = row.updated_at ? Date.parse(row.updated_at) : 0
            if (Number.isFinite(updatedAt) && updatedAt > 0 && Date.now() - updatedAt > 300_000) return

            const { data: fresh, error } = await sb
              .from(DB_TABLES.SALES_PIPELINE_RUNS)
              .select("id, status, current_step, company_id, error_message, updated_at, sales_companies(company_name)")
              .eq("id", id)
              .limit(1)
              .maybeSingle()
            if (error) {
              console.warn("[pipeline-events] realtime fetch failed:", error.message)
              return
            }
            if (fresh) send({ type: "update", runs: [fresh], at: new Date().toISOString() })
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            send({ type: "warning", message: `Realtime channel status: ${status}`, at: new Date().toISOString() })
            console.warn("[pipeline-events] realtime channel status:", status)
          }
        })

      req.signal.addEventListener("abort", async () => {
        close()
        try {
          await realtime.removeChannel(channel)
          await realtime.disconnect()
        } catch (error) {
          console.warn("[pipeline-events] remove channel failed:", error)
        }
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
