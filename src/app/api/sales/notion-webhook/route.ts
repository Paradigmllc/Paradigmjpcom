/**
 * POST /api/sales/notion-webhook
 *
 * Notion Integration → 本番API。全DB変更をリアルタイム受信し、
 * 該当する sync-knowledge-from-notion をトリガー。
 *
 * WW-EVENT: Webhook駆動。cron不使用。
 *
 * 認証: X-Webhook-Secret + echo防止 (bot自身の変更は無視)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionGetBotId } from "@/lib/notion"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DB_TOOLS     = process.env.NOTION_DB_TOOLS    ?? "389a2b78f3fc8169a987deb00a3e373e"
const DB_PHASES    = process.env.NOTION_DB_PHASES   ?? "389a2b78-f3fc-81b8-b0fd-d3730ec12560"
const DB_DIAGNOSIS = process.env.NOTION_DB_DIAGNOSIS ?? "389a2b78-f3fc-81e1-a8da-c784a4fb1976"

const ALL_DB_IDS = new Set([DB_TOOLS, DB_PHASES, DB_DIAGNOSIS])

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  try {
    const body = await req.json()
    const data = body.data ?? body

    // Echo防止: bot自身の変更は無視
    const botId = await notionGetBotId()
    if (botId && data.by_user?.id === botId) {
      return NextResponse.json({ ok: true, skipped: "bot-self-echo" })
    }

    // 対象DBの変更かチェック
    const parentDbId = data.parent?.database_id
    if (!parentDbId || !ALL_DB_IDS.has(parentDbId)) {
      return NextResponse.json({ ok: true, skipped: "non-target-db" })
    }

    // 変更があったDBだけsync
    const dbType = parentDbId === DB_TOOLS ? "tools"
      : parentDbId === DB_PHASES ? "phases"
      : "diagnosis"

    // Trigger sync internally (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET!

    fetch(`${baseUrl}/api/sales/sync-knowledge-from-notion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({ db_type: dbType }),
    }).catch((e) => console.error("[notion-webhook] sync trigger failed:", e))

    return NextResponse.json({ ok: true, db_type: dbType, action: "sync_triggered" })
  } catch {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 })
  }
}
