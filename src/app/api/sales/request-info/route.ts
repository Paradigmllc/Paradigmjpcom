import { NextRequest, NextResponse } from "next/server"
import { notifySlack } from "@/lib/notify"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RequestBody {
  company: string
  name: string
  email: string
  interests: string[]
  reportUrl: string
  reportName: string
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
    const rl = checkRateLimit({ ip, key: "api:request-info", max: 5, windowMs: 60_000 })
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

    const body = (await req.json()) as RequestBody

    if (!body.email || !body.interests || body.interests.length === 0) {
      return NextResponse.json({ ok: false, error: "email and interests are required" }, { status: 400 })
    }

    // Notify Slack
    const interestsText = body.interests.map((i, idx) => `${idx + 1}. ${i}`).join("\n")
    await notifySlack(
      `📄 *資料請求がありました*\n` +
      `*会社名*: ${body.company || "未入力"}\n` +
      `*氏名*: ${body.name || "未入力"}\n` +
      `*Email*: ${body.email}\n` +
      `*レポート*: ${body.reportName || "不明"}\n` +
      `*レポートURL*: ${body.reportUrl || "N/A"}\n` +
      `*知りたいこと*:\n${interestsText}`
    ).catch((e) => console.error("[request-info] Slack notification failed:", e))

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[request-info] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
