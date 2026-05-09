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
 * Slack interactivity signature verification (Phase 4).
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Slack signs each request with X-Slack-Signature header (v0:HMAC-SHA256(body)).
 * Replay attack 防止のため timestamp が 5 分以上ずれていれば reject.
 */
export async function verifySlackSignature(
  req: Request,
  rawBody: string
): Promise<{ ok: boolean; error?: string }> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    // 未設定 = fail-open (Phase 1 動作互換). 設定後は fail-closed
    return { ok: process.env.SLACK_SIGNING_SECRET_REQUIRED !== "true" };
  }
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const slackSig = req.headers.get("x-slack-signature") ?? "";
  if (!timestamp || !slackSig) return { ok: false, error: "missing slack signature headers" };

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return { ok: false, error: "stale request (>5min skew)" };
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = "v0=" + createHmac("sha256", signingSecret).update(baseString).digest("hex");

  // timing-safe compare
  if (slackSig.length !== expected.length) return { ok: false, error: "sig length mismatch" };
  const a = Buffer.from(slackSig);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) return { ok: false, error: "sig mismatch" };
  return { ok: true };
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
