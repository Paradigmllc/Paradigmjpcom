/**
 * MVP API auth helpers.
 * n8n / cron / Slack callback から叩かれる route の shared-secret check.
 *
 * 永久ルール準拠: B36 #19 — public web に晒さない (Slack/n8n のみ叩ける).
 */

import { NextResponse } from "next/server";

/**
 * Header `X-MVP-Secret: <MVP_API_SECRET>` または query `?secret=<MVP_API_SECRET>` を期待.
 * env 未設定 = fail-closed (503 で全 reject).
 */
export function requireMvpSecret(req: Request): NextResponse | null {
  const expected = process.env.MVP_API_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "MVP_API_SECRET not configured" },
      { status: 503 }
    );
  }
  const header = req.headers.get("x-mvp-secret") ?? "";
  const url = new URL(req.url);
  const query = url.searchParams.get("secret") ?? "";
  if (header !== expected && query !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
