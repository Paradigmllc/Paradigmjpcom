/**
 * lib/sales/auth.ts — Trigger.dev webhook shared secret
 *
 * Role: protect /api/sales/* endpoints called by Trigger.dev, cron, and trusted automation.
 *       Compare `X-Webhook-Secret` with `TRIGGER_WEBHOOK_SECRET`.
 *
 * 設計判断:
 *   - constant-time 比較 (timing attack 防止)
 *   - env 未設定なら **全 reject** (fail-closed・本番事故防止)
 *   - Trigger.dev tasks set `X-Webhook-Secret: $env.TRIGGER_WEBHOOK_SECRET`
 */

import { NextRequest, NextResponse } from "next/server"

/**
 * Constant-time string comparison (timing attack 防止).
 * 長さが違えば即 false・同じなら全 byte XOR で照合。
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Auth check: header の X-Webhook-Secret が env と一致するか.
 *
 * @returns null = 認証 OK / NextResponse = 認証エラー (401 を返す)
 */
export function verifyWebhookSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.TRIGGER_WEBHOOK_SECRET
  if (!expected) {
    // 本番では絶対に env を設定する。未設定時は全リジェクト (fail-closed)
    return NextResponse.json(
      { ok: false, error: "Webhook auth not configured on server" },
      { status: 503 },
    )
  }
  const received = req.headers.get("x-webhook-secret") ?? ""
  if (!safeCompare(received, expected)) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook secret" },
      { status: 401 },
    )
  }
  return null
}
