import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { diagnoseQuotes } from "@/lib/quote-recovery/diagnosis"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BODY_BYTES = 1_000_000

const quoteSchema = z.object({
  quoteId: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(1).max(200),
  quoteDate: z.iso.date(),
  amount: z.number().int().nonnegative().max(10_000_000_000),
  owner: z.string().trim().max(120).nullable(),
  lastContactDate: z.iso.date().nullable(),
  nextActionDate: z.iso.date().nullable(),
  status: z.enum(["open", "won", "lost"]),
})

const bodySchema = z.object({
  rows: z.array(quoteSchema).min(1).max(1_000),
  source: z.enum(["sample", "csv"]).default("csv"),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "quote-recovery-diagnose", max: 15, windowMs: 10 * 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "診断回数の上限に達しました。しばらくしてから再度お試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    )
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 })
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "CSVデータが大きすぎます。1,000件以下に分割してください。" }, { status: 413 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    console.warn("[quote-recovery/diagnose] invalid JSON:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "リクエスト形式を確認してください。" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "見積データの形式を確認してください。", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const diagnosis = diagnoseQuotes(parsed.data.rows)
  let measurement: "saved" | "unavailable" | "failed" = "unavailable"
  const supabase = getServiceSalesSupabase()
  if (supabase) {
    const { error } = await supabase.from("quote_recovery_diagnostic_runs").insert({
      source: parsed.data.source,
      row_count: diagnosis.sourceRows,
      open_quote_count: diagnosis.openQuotes,
      open_amount: diagnosis.openAmount,
      stale_quote_count: diagnosis.staleQuotes,
      stale_amount: diagnosis.staleAmount,
      missing_next_action_count: diagnosis.missingNextAction,
      unassigned_quote_count: diagnosis.unassignedQuotes,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      referrer: request.headers.get("referer")?.slice(0, 500) ?? null,
    })
    if (error) {
      measurement = "failed"
      console.error("[quote-recovery/diagnose] measurement insert failed:", error.message)
    } else {
      measurement = "saved"
    }
  }

  return NextResponse.json(
    { ok: true, diagnosis, measurement },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  )
}
