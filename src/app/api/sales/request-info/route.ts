import { NextRequest, NextResponse } from "next/server"
import { notifySlack } from "@/lib/notify"

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
    ).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[request-info] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
