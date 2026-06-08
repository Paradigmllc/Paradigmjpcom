/**
 * POST /api/sales/notion-webhook — Notion 編集 → Supabase 即時反映 (イベント駆動)
 *
 * 役割: Notion API Webhook (integration の Webhooks subscription) を受け、
 *       営業 OS 4 DB (リード/顧客/納品/テンプレ) のページ編集を数秒で Supabase へ反映する。
 *       旧 5min cron (sync-*-from-notion) を置き換える主経路。cron は取りこぼし保険として残す。
 *
 * 入力: Notion からの POST (page.created / page.properties_updated / page.content_updated 等)
 * 出力: { ok, ... }
 *
 * セキュリティ (3 段):
 *   1. 検証ハンドシェイク: 登録時に Notion が { verification_token } を 1 度だけ送る
 *      → ログに出すので Coolify env NOTION_WEBHOOK_SECRET に保存 + Notion UI に貼り戻す
 *   2. 署名検証: 毎リクエストの X-Notion-Signature = "sha256=" + HMAC-SHA256(raw body, 鍵=token)
 *      → 生バイト (req.text()) で計算し timing-safe 比較。NOTION_WEBHOOK_SECRET 未設定なら fail-closed
 *   3. エコー防止: 変更者 (authors) が自分の bot のみ = Supabase→Notion 同期由来 → 無視
 *
 * 2026-05-21 新規 (Notion 即時 GUI 化)。
 */

import { NextRequest, NextResponse } from "next/server"
import { notionGetBotId } from "@/lib/notion"
import { routeNotionPage } from "@/lib/sales/notion-apply"
import { verifyNotionSignature } from "@/lib/sales/notion-webhook-verify"
import { isNotionLegacySyncEnabled, notionLegacyDisabledResponse } from "@/lib/sales/notion-legacy-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface NotionWebhookEvent {
  type?: string
  entity?: { id?: string; type?: string }
  authors?: Array<{ id?: string; type?: string }>
  verification_token?: string
}

export async function POST(req: NextRequest) {
  if (!isNotionLegacySyncEnabled()) return notionLegacyDisabledResponse()

  // ── 生ボディを取得 (署名検証は生バイトで行う必要がある) ──
  const rawBody = await req.text()
  let event: NotionWebhookEvent
  try {
    event = JSON.parse(rawBody) as NotionWebhookEvent
  } catch (e) {
    console.error("[notion-webhook] failed to parse event body:", e)
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 })
  }

  // ── 1. 検証ハンドシェイク (subscription 登録時の 1 回だけ) ──
  if (event.verification_token) {
    // この token が以後の署名鍵。一度しか出ないので env に保存して Notion UI に貼り戻す
    console.warn(
      `[notion-webhook] 🔑 VERIFICATION TOKEN (set as NOTION_WEBHOOK_SECRET): ${event.verification_token}`,
    )
    return NextResponse.json({ ok: true, verification_token: event.verification_token })
  }

  // ── 2. 署名検証 (fail-closed) ──
  const secret = process.env.NOTION_WEBHOOK_SECRET
  if (!secret) {
    console.error("[notion-webhook] NOTION_WEBHOOK_SECRET not set — rejecting (fail-closed)")
    return NextResponse.json({ ok: false, error: "webhook secret not configured" }, { status: 503 })
  }
  if (!verifyNotionSignature(rawBody, req.headers.get("x-notion-signature"), secret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 })
  }

  // ── 3. エコー防止: 自分 (bot) の変更なら無視 (Supabase→Notion 同期由来のループ遮断) ──
  const botId = await notionGetBotId()
  const authors = event.authors ?? []
  if (botId && authors.length > 0 && authors.every((a) => a.id === botId)) {
    return NextResponse.json({ ok: true, skipped: "self-authored (echo prevention)" })
  }

  // ── ページイベント以外は無視 (database / data_source / comment 等) ──
  const type = event.type ?? ""
  const pageId = event.entity?.id
  if (!type.startsWith("page.") || event.entity?.type !== "page" || !pageId) {
    return NextResponse.json({ ok: true, skipped: `unhandled event type: ${type}` })
  }

  // ── 対象テーブルへ反映 ──
  try {
    const result = await routeNotionPage(pageId)
    return NextResponse.json({ type, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[notion-webhook] routeNotionPage failed:", msg)
    // 500 で返すと Notion が retry (最大 8 回) → 一時障害は自動復旧
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
