/**
 * lib/sales/notion-webhook-verify.ts — Notion Webhook 署名検証 (nodejs only)
 *
 * 役割: Notion が付与する X-Notion-Signature ("sha256=<hex>") を検証する純関数。
 *       鍵は subscription 登録時に 1 度だけ届く verification_token (= NOTION_WEBHOOK_SECRET)。
 *
 * 重要:
 *   - HMAC は **生のリクエストボディ (bytes)** に対して計算する。
 *     JSON.parse → 再 stringify すると署名が変わるので route 側で req.text() を渡すこと。
 *   - timing-safe 比較 (timingSafeEqual) で timing attack を防ぐ。
 *   - crypto を使うため node 専用 (route は runtime="nodejs")。lib/notion.ts に混ぜない
 *     (edge import 汚染を避ける) ため独立ファイルにしている。
 */

import { createHmac, timingSafeEqual } from "node:crypto"

/** raw body + secret から期待署名 "sha256=<hex>" を計算 */
export function computeNotionSignature(rawBody: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
}

/** X-Notion-Signature header を raw body + secret で検証 (timing-safe) */
export function verifyNotionSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header || !secret) return false
  const expected = computeNotionSignature(rawBody, secret)
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
