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
import { captureException } from "@/lib/error-monitor"
import { LOCALE_COUNTRY, localeContentVariant } from "@/lib/locale-map"
import { enrichFromContact } from "@/lib/sales/enrich"
import { buildReportUrl, normalizeReportLocale } from "@/lib/sales/routing"
import { notifySlack } from "@/lib/notify"

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

    const reportLocale = normalizeReportLocale(locale, "jp")
    const variant = localeContentVariant(reportLocale)
    const country = (LOCALE_COUNTRY as Record<string, string>)[reportLocale] ?? "US"

    // 4. Slack notification (best-effort)
    const slackText = [
      "📩 *paradigmjp.com お問い合わせ*",
      `*locale:* ${reportLocale}`,
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

    // 2026-05-13 appexx.me 連携一時断絶: SLACK_WEBHOOK_URL env から
    // Slack Incoming Webhook を直接呼ぶ。env 未設定なら no-op + warn (fail-soft)。
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: slackText }),
          signal: AbortSignal.timeout(5_000),
        })
      } catch (e) {
        console.error("[contact] Slack notify failed (best-effort):", e)
      }
    } else {
      console.warn(
        "[contact] SLACK_WEBHOOK_URL not set — skipping Slack notify (appexx.me archive 2026-05-13)",
      )
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
            country,
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
                report_locale: reportLocale,
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

    // 6. sales_companies auto-enrich (fire-and-forget・client への応答は遅延させない)
    //    corporate domain なら PSI + gBizInfo + scanDomain で 1 行作成
    //    自由メール (gmail 等) は skip
    void (async () => {
      try {
        const enrich = await enrichFromContact({
          email,
          company: company ?? null,
          message,
          services,
          reportLocale,
          targetCountry: country,
          source: "paradigmjp.com/contact",
        })
        if (enrich.ok && enrich.company) {
          const c = enrich.company
          const blocks = [
            {
              type: "header",
              text: { type: "plain_text", text: `🌱 新規リード: ${c.company_name}` },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*ドメイン*\n${c.domain}` },
                { type: "mrkdwn", text: `*業種*\n${c.industry ?? "未推定"}` },
                {
                  type: "mrkdwn",
                  text: `*PSI モバイル*\n${c.pagespeed_mobile ?? "?"} / 100`,
                },
                {
                  type: "mrkdwn",
                  text: `*検出課題*\n${(c.detected_issues ?? []).join(", ") || "なし"}`,
                },
              ],
            },
            {
              type: "actions",
              elements: [
                // Sprint 13: 営業データは Notion ⇔ Supabase MCP に集約 (admin dashboard 撤廃)
                // 診断レポート URL は slug 設定後のみ active (未設定なら domain 直リンク)
                ...(c.slug
                  ? [
                      {
                        type: "button",
                        text: { type: "plain_text", text: "診断レポート" },
                        url: c.report_url ?? buildReportUrl(normalizeReportLocale(c.report_locale, c.region), c.slug),
                        style: "primary",
                      },
                    ]
                  : []),
                {
                  type: "button",
                  text: { type: "plain_text", text: "Notion で開く" },
                  url: `https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4`,
                },
              ],
            },
          ]
          await notifySlack(
            `🌱 新規リード: ${c.company_name} (${c.domain})`,
            blocks,
          )
        } else if (enrich.skipped === "personal_domain") {
          console.log("[contact] enrich skipped (personal_domain):", email)
        } else if (enrich.error) {
          console.error("[contact] enrich failed:", enrich.error)
        }
      } catch (e) {
        console.error("[contact] enrich pipeline error:", e)
      }
    })()

    return NextResponse.json({
      success: true,
      message: variant === "ja"
        ? "お問い合わせを受け付けました。1営業日以内にご連絡いたします。"
        : "Thank you. We'll reply within one business day.",
    })
  } catch (e) {
    await captureException(e, { source: "/api/contact", severity: "error" })
    return NextResponse.json(
      { error: "送信に失敗しました。しばらく後にお試しください。" },
      { status: 500 },
    )
  }
}
