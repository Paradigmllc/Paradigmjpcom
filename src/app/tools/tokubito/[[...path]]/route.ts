/**
 * /tools/tokubito — SNS 投稿運用ダッシュボードを Payload のログインで守る
 *
 * ダッシュボード本体は別サービス(Coolify の tokubito-dash)。
 * ここは「Payload にログイン済みか」を確かめてから中継するだけの窓口。
 *
 * サブドメイン + 専用トークンをやめてサブディレクトリにした理由:
 *   - 運用者が覚える認証情報を Payload のログイン1つに減らす
 *   - ダッシュボードのトークンをブラウザに一切出さない
 *     (URL に ?t= を付ける方式だと、履歴・ブックマーク・共有で漏れる)
 *
 * 必要な環境変数:
 *   TOKUBITO_DASH_ORIGIN  例 https://dash.paradigmjp.com
 *   TOKUBITO_DASH_TOKEN   ダッシュボード側の DASHBOARD_TOKEN と同じ値
 */

import { NextRequest, NextResponse } from "next/server"
import type { getPayload as getPayloadType } from "payload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BASE = "/tools/tokubito"

/** Payload のセッションを確かめる。ログインしていなければ null */
async function currentUser(req: NextRequest) {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ])
  const payload = await getPayload({
    config: config as Parameters<typeof getPayloadType>[0]["config"],
  })
  const { user } = await payload.auth({ headers: req.headers })
  return user ?? null
}

function upstream() {
  const origin = process.env.TOKUBITO_DASH_ORIGIN
  const token = process.env.TOKUBITO_DASH_TOKEN
  // 空文字フォールバックにすると、未設定のまま素通りして
  // 認証なしの相手に繋ぎに行くので、明示的に落とす
  if (!origin || !token) {
    console.error(
      "[tools/tokubito] TOKUBITO_DASH_ORIGIN / TOKUBITO_DASH_TOKEN が未設定です",
    )
    return null
  }
  return { origin: origin.replace(/\/$/, ""), token }
}

async function proxy(req: NextRequest, method: "GET" | "POST") {
  const user = await currentUser(req)
  if (!user) {
    // 画面遷移なら Payload のログインへ送る。API 呼び出しには JSON で返す
    if (method === "GET") {
      const back = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
      return NextResponse.redirect(new URL(`/admin/login?redirect=${back}`, req.url))
    }
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const up = upstream()
  if (!up) {
    return NextResponse.json(
      { error: "ダッシュボードの接続先が設定されていません" },
      { status: 503 },
    )
  }

  // /tools/tokubito/img/... → /tools/tokubito/img/... のまま渡す。
  // ダッシュボード側は BASE_PATH を知っているので、そのまま解釈できる。
  const target = new URL(up.origin + req.nextUrl.pathname + req.nextUrl.search)
  target.searchParams.set("t", up.token)

  const res = await fetch(target, {
    method,
    headers: { "Content-Type": req.headers.get("content-type") ?? "text/plain" },
    body: method === "POST" ? await req.text() : undefined,
    // 書き出しは数分かかる
    signal: AbortSignal.timeout(15 * 60 * 1000),
    cache: "no-store",
  })

  const type = res.headers.get("content-type") ?? "application/octet-stream"
  const headers = new Headers({ "Content-Type": type, "Cache-Control": "no-store" })
  // 上流の Set-Cookie は中継しない。トークンをブラウザに渡さないため
  return new NextResponse(res.body, { status: res.status, headers })
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET")
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST")
}
