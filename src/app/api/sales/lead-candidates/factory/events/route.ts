import { RealtimeClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getSalesSupabaseConfig, getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const fields = "id, source_slug, country_code, technology, status, requested_limit, verify_limit, min_opportunity_score, min_smb_score, min_form_confidence, fetched_count, verified_count, scored_count, source_qualified_count, quality_rejected_count, review_required_count, forms_checked_count, forms_qualified_count, promoted_count, twenty_synced_count, failure_count, error_message, heartbeat_at, started_at, created_at, updated_at"

function realtimeUrl(restUrl: string): string {
  const explicit = process.env.SALES_SUPABASE_REALTIME_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "").endsWith("/realtime/v1") ? explicit.replace(/\/+$/, "") : `${explicit.replace(/\/+$/, "")}/realtime/v1`
  const parsed = new URL(restUrl)
  if (/^supabase-rest-1$/i.test(parsed.hostname)) return "http://supabase-realtime:4000/realtime/v1"
  parsed.pathname = "/realtime/v1"
  parsed.search = ""
  parsed.hash = ""
  parsed.protocol = parsed.protocol.replace(/^ws/i, "http")
  return parsed.toString()
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const sb = getServiceSalesSupabase()
  const config = getSalesSupabaseConfig()
  if (!sb || !config) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
  const encoder = new TextEncoder()
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }
      const snapshot = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select(fields).in("source_slug", ["evidence_first_sources", "multi_source_domains"]).order("created_at", { ascending: false }).limit(50)
      if (snapshot.error) {
        console.error("[lead-candidate-factory-events] snapshot failed:", snapshot.error.message)
        send({ type: "error", message: snapshot.error.message, runs: [] })
      } else send({ type: "snapshot", runs: snapshot.data ?? [], at: new Date().toISOString() })

      const realtime = new RealtimeClient(realtimeUrl(config.url), {
        params: { apikey: config.serviceKey },
        headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
      })
      const channel = realtime.channel("form-qualified-lead-factory-events").on("postgres_changes", {
        event: "*", schema: "public", table: DB_TABLES.SALES_LEAD_CANDIDATE_RUNS,
      }, async (payload: { new?: { id?: string; source_slug?: string }; old?: { id?: string; source_slug?: string } }) => {
        const changed = payload.new ?? payload.old
        if (closed || !changed?.source_slug || !["evidence_first_sources", "multi_source_domains"].includes(changed.source_slug) || !changed.id) return
        const fresh = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select(fields).eq("id", changed.id).maybeSingle()
        if (fresh.error) {
          console.warn("[lead-candidate-factory-events] refresh failed:", fresh.error.message)
          send({ type: "warning", message: fresh.error.message })
        } else send({ type: "update", runs: fresh.data ? [fresh.data] : [], at: new Date().toISOString() })
      }).subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") send({ type: "warning", message: `Realtime channel status: ${status}` })
      })

      req.signal.addEventListener("abort", async () => {
        closed = true
        try {
          controller.close()
          await realtime.removeChannel(channel)
          await realtime.disconnect()
        } catch (error) {
          console.warn("[lead-candidate-factory-events] cleanup failed:", error)
        }
      })
    },
  })
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } })
}
