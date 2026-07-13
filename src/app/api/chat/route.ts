import { NextRequest, NextResponse } from "next/server"
import { normalizeDifyCloudBaseUrl } from "@/lib/sales/dify-cloud"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import {
  getFallbackAnswer,
  isSafeEnglishCommercialAnswer,
  type ChatLocale,
} from "@/lib/chat-commercial"
import { formatChatKnowledge, retrieveChatKnowledge } from "@/lib/chat-knowledge"

/**
 * /api/chat — locale-aware Dify → Gemini fallback
 *
 * Dify キー戦略: locale ごとに別の App を用意できるよう、
 *   - DIFY_API_KEY_JA / DIFY_API_KEY_EN を優先
 *   - なければ共通の DIFY_API_KEY を使う
 * クライアントは { message, conversationId, locale: "ja" | "en" } を送信する。
 */

// 2026-05-31 DIFY-CLOUD-ONLY:
// env 未設定または古いDify URLが残っている場合も Dify Cloud 公式 endpoint に寄せる。
const DIFY_BASE = normalizeDifyCloudBaseUrl(process.env.DIFY_BASE_URL)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim()

function resolveDifyKey(locale: ChatLocale): string {
  const localeKey = locale === "en" ? process.env.DIFY_API_KEY_EN : process.env.DIFY_API_KEY_JA
  const key = localeKey || process.env.DIFY_API_KEY
  if (!key) {
    console.warn(`[chat] Dify API key not found for locale ${locale} (checked DIFY_API_KEY_${locale.toUpperCase()} and DIFY_API_KEY)`)
  }
  return key ?? ""
}

const SYSTEM_PROMPT_JA = `あなたはParadigm合同会社の公式AIアシスタントです。
公開サイトに明記された事実だけを使い、実績数・創業年・顧客名・価格・保証を推測しないでください。
国内向けサービスの最新条件は https://paradigmjp.com/ja/pricing を案内し、個別条件は契約前の書面で確認すると説明してください。
Japan Entryの支払方法はWise、銀行振込、USDC、クレジットカード（Stripe請求書または決済リンク）です。送付先・ネットワーク・手数料は請求書で確認し、公開フォームで口座情報やウォレットアドレスを求めません。
書面での範囲確定、入金、必要素材・アクセス、承認者が揃った開始日から14営業日以内に合意したセットアップを納品できない場合、セットアップ費用12,000ドルを全額返金します。顧客側の追加変更・保留は記録して時計を一時停止します。
問い合わせ先は https://paradigmjp.com/ja/contact、メールは info@paradigmjp.com です。
簡潔で誠実な日本語で回答してください。`

const SYSTEM_PROMPT_EN = `You are the official AI assistant for Paradigm LLC, a Tokyo-based Japan market-entry operator.
Use only the verified commercial terms below. Never invent client counts, retention rates, case-study names, founding dates, guarantees, discounts, or alternative packages.

[Japan Entry Package]
- Audience: overseas SMBs that can make a final purchasing decision within seven days and assign one launch owner.
- Setup: USD $12,000 fixed, paid before kickoff.
- Payment methods: Wise, bank transfer, USDC, or credit card through a Stripe invoice or payment link after fit review; invoice instructions are authoritative.
- Managed operation: $0/month for the first six months, then $995/month from month seven; the monthly service can be cancelled.
- Delivery guarantee: the Start Date is recorded after written scope acceptance, cleared payment, complete inputs, required access, and an empowered approver. If the agreed fixed setup is not delivered within 14 business days from that Start Date, refund 100% of the USD $12,000 setup fee under the written terms. Client-requested changes or holds pause the clock.
- Includes: localized revenue site and conversion path, buyer-facing trust/compliance coordination, eligible payment or inquiry routing, Japanese AI-assisted support setup, analytics, notifications, launch verification, and handover.
- Excludes unless agreed in writing: third-party platform fees, media spend, taxes, specialist legal/accounting advice, and work outside the fixed deployment scope.
- No sales outcome is guaranteed. Eligibility of payment, entity, and regulated-market routes is confirmed before kickoff.
- Apply: https://paradigmjp.com/en/contact?intent=japan-entry
- Email: info@paradigmjp.com

Answer in concise, plain English. If a fact is not listed, say it will be confirmed in the fixed written scope before payment.
Use the retrieved approved-site context appended below. Never invent a number or outcome that is absent from it.`

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function callGemini(message: string, locale: ChatLocale, context: string): Promise<string> {
  if (!GEMINI_API_KEY) return getFallbackAnswer(message, locale)
  try {
    const basePrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA
    const systemPrompt = `${basePrompt}\n\n[Retrieved approved-site context]\n${context}`
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return getFallbackAnswer(message, locale)
    const data: unknown = await res.json()
    const answer = isRecord(data)
      && Array.isArray(data.candidates)
      && isRecord(data.candidates[0])
      && isRecord(data.candidates[0].content)
      && Array.isArray(data.candidates[0].content.parts)
      && isRecord(data.candidates[0].content.parts[0])
      && typeof data.candidates[0].content.parts[0].text === "string"
      ? data.candidates[0].content.parts[0].text.trim()
      : ""

    if (locale === "en" && !isSafeEnglishCommercialAnswer(answer)) {
      console.warn("[chat] Gemini returned unverified English commercial terms; using verified fallback")
      return getFallbackAnswer(message, locale)
    }

    return answer || getFallbackAnswer(message, locale)
  } catch (e) {
    console.error("[chat] Gemini API call failed:", e)
    return getFallbackAnswer(message, locale)
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit({ ip, key: "api:chat", max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const rawBody: unknown = await req.json().catch((error: unknown) => {
    console.error("[chat] Invalid JSON body:", error)
    return null
  })
  if (!isRecord(rawBody)) return NextResponse.json({ error: "invalid request" }, { status: 400 })
  const message = typeof rawBody.message === "string" ? rawBody.message.trim().slice(0, 2_000) : ""
  const conversationId = typeof rawBody.conversationId === "string" ? rawBody.conversationId.trim().slice(0, 200) : ""
  const rawLocale = rawBody.locale
  const locale: ChatLocale = rawLocale === "en" ? "en" : "ja"
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 })
  const sources = retrieveChatKnowledge(message, locale)
  const context = formatChatKnowledge(sources)

  // The existing English Dify app can contain historical commercial copy.
  // English answers therefore use the verified prompt/fallback path only.
  const difyKey = locale === "en" ? "" : resolveDifyKey(locale)
  if (difyKey) {
    try {
      const body: Record<string, unknown> = {
        inputs: {},
        query: `${message}\n\nUse only this approved site context when answering:\n${context}`,
        response_mode: "blocking",
        user: `visitor-${locale}-${Date.now()}`,
      }
      if (conversationId) body.conversation_id = conversationId

      const res = await fetch(`${DIFY_BASE}/v1/chat-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${difyKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      })

      if (res.ok) {
        const data = await res.json()
        const answer = typeof data.answer === "string" ? data.answer.trim() : ""
        if (answer.length > 10) {
          return NextResponse.json({
            answer,
            conversation_id: data.conversation_id || null,
            sources: sources.map(({ title, href }) => ({ title, href })),
            grounded: sources.length > 0,
          })
        }
      }
    } catch (e) {
      console.error("[chat] Dify unavailable, falling through to Gemini:", e)
    }
  }

  const answer = await callGemini(message, locale, context)
  return NextResponse.json({
    answer,
    conversation_id: null,
    sources: sources.map(({ title, href }) => ({ title, href })),
    grounded: sources.length > 0,
  })
}
