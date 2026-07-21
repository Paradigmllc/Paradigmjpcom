import { RealtimeClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getSalesSupabaseConfig } from "@/lib/supabase"
import { getManualWorkBatch } from "@/lib/sales/manual-japan-entry-batch-store"
import {
  isManualWorkBatchTerminal,
  type ManualWorkBatchItemRow,
  type ManualWorkBatchRow,
} from "@/lib/sales/manual-japan-entry-batch-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const paramsSchema = z.object({ batchId: z.string().uuid() })

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function realtimeUrl(restUrl: string): string {
  const explicit = optionalEnv("SALES_SUPABASE_REALTIME_URL") ?? optionalEnv("NEXT_PUBLIC_SUPABASE_REALTIME_URL")
  if (explicit) {
    const base = explicit.replace(/\/+$/, "")
    return base.endsWith("/realtime/v1") ? base : `${base}/realtime/v1`
  }
  const parsed = new URL(restUrl)
  if (/^supabase-rest-1$/i.test(parsed.hostname)) return "http://supabase-realtime:4000/realtime/v1"
  parsed.pathname = "/realtime/v1"
  parsed.search = ""
  parsed.hash = ""
  parsed.protocol = parsed.protocol.replace(/^ws/i, "http")
  return parsed.toString()
}

export async function GET(req: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) return NextResponse.json({ ok: false, error: "有効なバッチIDが必要です" }, { status: 400 })
  const config = getSalesSupabaseConfig()
  if (!config) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })

  const encoder = new TextEncoder()
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch (error) {
          console.warn("[manual-work-batch-events] close failed:", error)
        }
      }
      const sendSnapshot = async () => {
        try {
          const snapshot = await getManualWorkBatch(params.data.batchId)
          send({ type: "snapshot", snapshot, at: new Date().toISOString() })
          return snapshot
        } catch (error) {
          console.error("[manual-work-batch-events] snapshot failed:", error)
          send({ type: "warning", message: error instanceof Error ? error.message : "進捗を取得できませんでした", at: new Date().toISOString() })
          return null
        }
      }

      const initial = await sendSnapshot()
      if (!initial || isManualWorkBatchTerminal(initial.batch.status)) {
        close()
        return
      }

      const realtime = new RealtimeClient(realtimeUrl(config.url), {
        params: { apikey: config.serviceKey },
        headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
      })
      const itemChanged = (payload: { new: unknown }) => {
        const item = payload.new as ManualWorkBatchItemRow
        if (!item || item.batch_id !== params.data.batchId) return
        send({ type: "item", item, at: new Date().toISOString() })
      }
      const batchChanged = (payload: { new: unknown }) => {
        const batch = payload.new as ManualWorkBatchRow
        if (!batch || batch.id !== params.data.batchId) return
        send({ type: "batch", batch, at: new Date().toISOString() })
        if (isManualWorkBatchTerminal(batch.status)) {
          close()
          void realtime.disconnect().catch((error) => {
            console.warn("[manual-work-batch-events] terminal disconnect failed:", error)
          })
        }
      }
      const channel = realtime
        .channel(`manual-work-batch-${params.data.batchId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "manual_japan_entry_batches", filter: `id=eq.${params.data.batchId}` }, batchChanged)
        .on("postgres_changes", { event: "*", schema: "public", table: "manual_japan_entry_batch_items", filter: `batch_id=eq.${params.data.batchId}` }, itemChanged)
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[manual-work-batch-events] realtime status:", status)
            send({ type: "warning", message: `Realtime channel status: ${status}`, at: new Date().toISOString() })
          }
        })

      req.signal.addEventListener("abort", async () => {
        close()
        try {
          await realtime.removeChannel(channel)
          await realtime.disconnect()
        } catch (error) {
          console.warn("[manual-work-batch-events] cleanup failed:", error)
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
