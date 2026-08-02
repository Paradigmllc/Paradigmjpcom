import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  companyName: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  monthlyQuotes: z.enum(["1-20", "21-50", "51-100", "101+"]),
  currentTool: z.string().trim().max(120).optional().default(""),
  openAmount: z.number().int().nonnegative().max(100_000_000_000).optional().default(0),
  staleAmount: z.number().int().nonnegative().max(100_000_000_000).optional().default(0),
  staleQuotes: z.number().int().nonnegative().max(1_000).optional().default(0),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit({ ip, key: "quote-recovery-pilot", max: 4, windowMs: 60 * 60_000 })
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "送信回数の上限に達しました。時間をおいてお試しください。" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    console.warn("[quote-recovery/pilot] invalid JSON:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "入力形式を確認してください。" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "必須項目を確認してください。", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const supabase = getServiceSalesSupabase()
  if (!supabase) {
    console.error("[quote-recovery/pilot] Supabase service client is not configured")
    return NextResponse.json({ error: "現在お申し込みを保存できません。時間をおいてお試しください。" }, { status: 503 })
  }
  const input = parsed.data
  const { data, error } = await supabase.from("quote_recovery_pilot_inquiries").insert({
    company_name: input.companyName,
    contact_name: input.name,
    email: input.email,
    monthly_quote_volume: input.monthlyQuotes,
    current_tool: input.currentTool || null,
    diagnosed_open_amount: input.openAmount,
    diagnosed_stale_amount: input.staleAmount,
    diagnosed_stale_quote_count: input.staleQuotes,
    source: "quote_recovery_diagnostic",
  }).select("id").single()

  if (error || !data) {
    console.error("[quote-recovery/pilot] insert failed:", error?.message ?? "missing inserted row")
    return NextResponse.json({ error: "お申し込みを保存できませんでした。時間をおいてお試しください。" }, { status: 503 })
  }

  await notifyBothChannels(`見積フォローパイロット申込: ${input.companyName}`, {
    title: "Quote Recovery パイロット申込",
    message: `${input.name} / ${input.email} / 月間見積 ${input.monthlyQuotes}件 / 放置額 ¥${input.staleAmount.toLocaleString("ja-JP")}`,
    link: "https://paradigmjp.com/ja/quote-recovery",
    type: "quote_recovery_pilot",
    region: "jp",
    priority: 95,
  })

  return NextResponse.json(
    { ok: true, id: data.id, message: "お申し込みを受け付けました。1営業日以内にご連絡します。" },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  )
}
