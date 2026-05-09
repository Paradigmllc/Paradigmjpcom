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

/**
 * UI-called read endpoints 用. Basic Auth (MVP_BASIC_AUTH_USER/PASS) または
 * X-MVP-Secret のいずれかを受け入れる. middleware が api を除外するため、
 * ブラウザが自動送信する Basic Auth クレデンシャルをここで再チェック.
 */
export function requireMvpUiAuth(req: Request): NextResponse | null {
  const expectedUser = process.env.MVP_BASIC_AUTH_USER;
  const expectedPass = process.env.MVP_BASIC_AUTH_PASS;
  const expectedSecret = process.env.MVP_API_SECRET;

  // Try X-MVP-Secret / ?secret= first (n8n, server-to-server)
  if (expectedSecret) {
    const header = req.headers.get("x-mvp-secret") ?? "";
    const url = new URL(req.url);
    const query = url.searchParams.get("secret") ?? "";
    if (header === expectedSecret || query === expectedSecret) return null;
  }

  // Try Basic Auth (browser fetch after /sales/* gate passed)
  if (expectedUser && expectedPass) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
        const idx = decoded.indexOf(":");
        if (idx > 0 && decoded.slice(0, idx) === expectedUser && decoded.slice(idx + 1) === expectedPass) {
          return null;
        }
      } catch {
        // fallthrough to 401
      }
    }
  }

  if (!expectedSecret && !(expectedUser && expectedPass)) {
    return NextResponse.json(
      { ok: false, error: "MVP auth not configured" },
      { status: 503 }
    );
  }

  return new NextResponse(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Basic realm="Paradigm MVP", charset="UTF-8"',
    },
  });
}
