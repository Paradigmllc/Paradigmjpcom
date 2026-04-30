/**
 * /api/contact — お問い合わせ受信エンドポイント
 *
 * 役割:
 *   1. ContactForm の POST を受け、必須バリデーション
 *   2. Cloudflare Turnstile CAPTCHA 検証 (TURNSTILE_SECRET_KEY 設定時のみ)
 *   3. IP 単位で rate-limit (5 req / 60s)
 *   4. Slack 通知 (appexx.me API 経由)
 *   5. Supabase leads テーブルに保存
 *
 * 入力: POST JSON { name, company?, email, phone?, services?[], message, budget?, locale?, turnstileToken? }
 * 出力: { success, message } | { error }
 *
 * 永久ルール (BB / E): catch{} 握りつぶし禁止 — エラーは console.error で可視化。
 */

import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getClientIp, verifyTurnstile } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    // 1. Rate limit (5 / 60s per IP)
    const rl = checkRateLimit({ ip, key: "contact-post", max: 5, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
          },
        },
      )
    }

    const body = await req.json()
    const { name, company, email, phone, services, message, budget, locale, turnstileToken } = body

    // 2. Required field validation
    if (!name || !email || !message) {
      return NextResponse.json({ error: "必須項目が入力されていません" }, { status: 400 })
    }

    // 3. Turnstile CAPTCHA (no-op if TURNSTILE_SECRET_KEY unset)
    const captchaOk = await verifyTurnstile(turnstileToken)
    if (!captchaOk) {
      return NextResponse.json(
        { error: "ボット検証に失敗しました。ページを再読み込みしてもう一度お試しください。" },
        { status: 403 },
      )
    }

    const isJa = locale === "ja"

    // 4. Slack notification (best-effort)
    const slackText = [
      "📩 *paradigmjp.com お問い合わせ*",
      `*locale:* ${locale ?? "ja"}`,
      `*お名前:* ${name}`,
      company ? `*会社名:* ${company}` : null,
      `*メール:* ${email}`,
      phone ? `*電話:* ${phone}` : null,
      services?.length ? `*興味のあるサービス:* ${services.join(", ")}` : null,
      budget ? `*ご予算:* ${budget}` : null,
      `*ご相談内容:*\n${message}`,
    ]
      .filter(Boolean)
      .join("\n")

    try {
      await fetch("https://appexx.me/api/studio/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "#all-paradigm", text: slackText }),
        signal: AbortSignal.timeout(5_000),
      })
    } catch (e) {
      console.error("[contact] Slack notify failed (best-effort):", e)
    }

    // 5. Supabase leads insert (best-effort)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            business_name: company || name,
            email,
            phone: phone || null,
            country: locale === "ja" ? "JP" : "US",
            industry: services?.[0] || "問い合わせ",
            pipeline_stage: "inbound",
            source: "paradigmjp.com",
            meta: {
              contact_form: {
                name,
                company,
                services,
                message,
                budget,
                locale,
                ip,
                submitted_at: new Date().toISOString(),
              },
            },
          }),
          signal: AbortSignal.timeout(8_000),
        })
      } catch (e) {
        console.error("[contact] Supabase insert failed (best-effort):", e)
      }
    }

    return NextResponse.json({
      success: true,
      message: isJa
        ? "お問い合わせを受け付けました。1営業日以内にご連絡いたします。"
        : "Thank you. We'll reply within one business day.",
    })
  } catch (e) {
    console.error("[contact] unexpected error:", e)
    return NextResponse.json(
      { error: "送信に失敗しました。しばらく後にお試しください。" },
      { status: 500 },
    )
  }
}
