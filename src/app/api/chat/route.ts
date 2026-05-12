import { NextRequest, NextResponse } from "next/server"

/**
 * /api/chat — locale-aware Dify → Gemini fallback
 *
 * Dify キー戦略: locale ごとに別の App を用意できるよう、
 *   - DIFY_API_KEY_JA / DIFY_API_KEY_EN を優先
 *   - なければ共通の DIFY_API_KEY を使う
 * クライアントは { message, conversationId, locale: "ja" | "en" } を送信する。
 */

// 2026-05-13 DIFY-CLOUD-ONLY 永久ルール + appexx.me 一時断絶:
// 旧 fallback "https://dify.appexx.me" は OSS Dify (削除済) を指していたため撤去。
// env 未設定なら Dify Cloud 公式 endpoint をデフォルトに。
const DIFY_BASE = process.env.DIFY_BASE_URL || "https://api.dify.ai"
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""

type Locale = "ja" | "en"

function resolveDifyKey(locale: Locale): string {
  if (locale === "en") return process.env.DIFY_API_KEY_EN || process.env.DIFY_API_KEY || ""
  return process.env.DIFY_API_KEY_JA || process.env.DIFY_API_KEY || ""
}

const SYSTEM_PROMPT_JA = `あなたはParadigm合同会社の公式AIアシスタントです。
誠実で親切な口調で、以下の知識をもとに正確・具体的に答えてください。

【会社概要】
会社名: Paradigm合同会社
所在地: 東京都
創業: 2022年
得意分野: ホームページ制作・LP・MEO対策・SEO/GEO・AI導入支援・ECサイト構築
特徴: 実績200社以上、継続率98%、格安×高品質×スピード納品
問い合わせ先: https://paradigmjp.com/contact（無料相談）
メール: info@paradigmjp.com

【料金・サービス一覧】
■ ホームページ制作
 - シンプルプラン (5P): ¥198,000〜
 - スタンダード (10P): ¥350,000〜
 - プレミアム (20P〜): ¥600,000〜
■ ランディングページ (LP): ¥150,000〜¥400,000
■ MEO対策: 月額¥30,000〜¥80,000
■ SEO/GEO対策: 月額¥50,000〜¥200,000
■ ECサイト構築: ¥500,000〜
■ AI導入支援: ¥200,000〜

【制作の流れ】
1. 無料相談（15分・オンライン可）
2. ヒアリング・お見積もり提出（3営業日以内）
3. デザイン制作・フィードバック
4. 開発・構築
5. テスト・修正
6. 納品・公開

【納期目安】
- LP: 1〜2週間 / HP(5P): 2〜4週間 / HP(10P〜): 4〜8週間 / ECサイト: 6〜10週間

【サポート】
- 納品後3ヶ月: 修正・相談無料
- 月額保守: ¥10,000〜
- 平日9:00〜18:00 チャット・メール対応

回答は200文字以内で簡潔に、日本語で。具体的な数字や料金を積極的に提示してください。`

const SYSTEM_PROMPT_EN = `You are the official AI assistant for Paradigm LLC.
Answer accurately and helpfully in concise English, based on the knowledge below.

[About Paradigm LLC]
Company: Paradigm LLC (Paradigm合同会社)
Location: Tokyo, Japan
Founded: 2022
Specialties: Web development, Landing pages, Local SEO (MEO), SEO/GEO, AI enablement, E-commerce
Track record: 200+ clients, 98% retention, productized services built by operators in Tokyo.
Contact: https://paradigmjp.com/contact (free consultation)
Email: info@paradigmjp.com

[Pricing]
- Web build (5p): from ¥198,000 (~$1,300 USD)
- Web build (10p Standard): from ¥350,000 (~$2,300 USD)
- Web build (20p+ Premium): from ¥600,000 (~$4,000 USD)
- Landing Page: ¥150,000–¥400,000
- Local SEO (MEO): from ¥30,000/month (~$200 USD/mo)
- SEO / GEO: from ¥50,000/month
- E-commerce build: from ¥500,000
- AI enablement: from ¥200,000

[Process]
1. Free 15-min consultation (online is fine)
2. Discovery + quote within 3 business days
3. Design + feedback loop
4. Build
5. QA + revisions
6. Launch

[Timelines]
LP: 1–2 weeks / Web 5p: 2–4 weeks / Web 10p+: 4–8 weeks / E-commerce: 6–10 weeks

[Support]
- 3-month free-fix window after launch
- Maintenance plans from ¥10,000/month
- Chat/email support, weekdays 9:00–18:00 JST

Keep responses under ~200 characters in English. Lead with concrete numbers and currency where possible.`

async function callGemini(message: string, locale: Locale): Promise<string> {
  if (!GEMINI_API_KEY) return getFallbackAnswer(message, locale)
  try {
    const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return getFallbackAnswer(message, locale)
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || getFallbackAnswer(message, locale)
  } catch {
    return getFallbackAnswer(message, locale)
  }
}

export async function POST(req: NextRequest) {
  const { message, conversationId, locale: rawLocale } = await req.json()
  const locale: Locale = rawLocale === "en" ? "en" : "ja"
  if (!message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 })

  const difyKey = resolveDifyKey(locale)
  if (difyKey) {
    try {
      const body: Record<string, unknown> = {
        inputs: {},
        query: message,
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
        const answer = data.answer?.trim()
        if (answer && answer.length > 10) {
          return NextResponse.json({
            answer,
            conversation_id: data.conversation_id || null,
          })
        }
      }
    } catch {
      // Dify unavailable, fall through to Gemini
    }
  }

  const answer = await callGemini(message, locale)
  return NextResponse.json({ answer, conversation_id: null })
}

function getFallbackAnswer(question: string, locale: Locale): string {
  const q = question.toLowerCase()
  if (locale === "en") return getFallbackAnswerEn(q)
  return getFallbackAnswerJa(q)
}

function getFallbackAnswerJa(q: string): string {
  if (q.includes("見積") || q.includes("料金") || q.includes("費用") || q.includes("価格") || q.includes("いくら")) {
    return "料金の目安です。\n\n💰 主なサービス料金：\n\n• HP制作（シンプル）: ¥198,000〜\n• HP制作（スタンダード）: ¥350,000〜\n• LP: ¥150,000〜\n• MEO対策: ¥30,000〜/月\n• SEO/GEO: ¥50,000〜/月\n• ECサイト: ¥500,000〜\n• AI導入支援: ¥200,000〜\n\n✅ 分割払い（最大6回）対応\n\n無料相談 → https://paradigmjp.com/contact"
  }
  if (q.includes("流れ") || q.includes("プロセス") || q.includes("ステップ") || q.includes("手順")) {
    return "制作の流れです。\n\n1️⃣ 無料相談（15分）\n2️⃣ お見積もり（3営業日以内）\n3️⃣ デザイン\n4️⃣ 開発\n5️⃣ 納品\n\n全国対応・オンラインのみOK。"
  }
  if (q.includes("納期") || q.includes("期間") || q.includes("どのくらい")) {
    return "納期の目安です。\n\n• LP: 1〜2週間\n• HP（5P）: 2〜4週間\n• HP（10P〜）: 4〜8週間\n• EC: 6〜10週間"
  }
  if (q.includes("meo") || q.includes("googleマップ") || q.includes("マップ")) {
    return "📍 MEO対策: 月額¥30,000〜。Googleビジネスプロフィール最適化・口コミ管理・月次レポート込み。無料診断 → https://paradigmjp.com/contact"
  }
  if (q.includes("seo") || q.includes("geo") || q.includes("検索")) {
    return "🔍 SEO/GEO: 月額¥50,000〜。コンテンツ・技術対策・AI検索最適化。無料相談 → https://paradigmjp.com/contact"
  }
  if (q.includes("ai") || q.includes("人工知能") || q.includes("自動化") || q.includes("チャットボット")) {
    return "🤖 AI導入支援: ¥200,000〜。チャットボット・業務自動化・AI集客を御社課題に合わせて提案します。"
  }
  return "ご質問ありがとうございます。\n\n料金・納期・流れ・MEO・SEO・AI導入など、気になるテーマをお聞かせください。\n\n無料相談 → https://paradigmjp.com/contact\n📧 info@paradigmjp.com"
}

function getFallbackAnswerEn(q: string): string {
  if (q.includes("price") || q.includes("cost") || q.includes("quote") || q.includes("how much") || q.includes("pricing")) {
    return "Here's our pricing snapshot:\n\n💰 Core services:\n• Web build (5p): from ¥198,000 (~$1,300)\n• Web build (10p): from ¥350,000\n• Landing page: from ¥150,000\n• Local SEO (MEO): from ¥30,000/mo\n• SEO/GEO: from ¥50,000/mo\n• E-commerce: from ¥500,000\n• AI enablement: from ¥200,000\n\nSplit-pay (up to 6 installments) supported.\n\nBook a free consult → https://paradigmjp.com/contact"
  }
  if (q.includes("process") || q.includes("step") || q.includes("how does") || q.includes("workflow")) {
    return "Our delivery process:\n\n1️⃣ Free 15-min consult\n2️⃣ Quote within 3 business days\n3️⃣ Design + feedback\n4️⃣ Build\n5️⃣ QA + launch\n\nFully remote, nationwide + international clients supported."
  }
  if (q.includes("timeline") || q.includes("how long") || q.includes("delivery time") || q.includes("weeks")) {
    return "Typical timelines:\n\n• Landing page: 1–2 weeks\n• Web build (5p): 2–4 weeks\n• Web build (10p+): 4–8 weeks\n• E-commerce: 6–10 weeks\n\nRush delivery available — let us know your deadline."
  }
  if (q.includes("meo") || q.includes("local seo") || q.includes("google map") || q.includes("maps")) {
    return "📍 Local SEO (MEO): from ¥30,000/month (~$200). Covers Google Business Profile optimization, review management, and monthly rank reports. Free diagnostic → https://paradigmjp.com/contact"
  }
  if (q.includes("seo") || q.includes("geo") || q.includes("ai search") || q.includes("perplexity")) {
    return "🔍 SEO / GEO: from ¥50,000/month. Keyword strategy, content, technical SEO, and AI-search (Perplexity / ChatGPT) optimization included. Free consult → https://paradigmjp.com/contact"
  }
  if (q.includes("ai") || q.includes("chatbot") || q.includes("automation") || q.includes("enablement")) {
    return "🤖 AI enablement: from ¥200,000. AI chatbots, workflow automation (Dify / n8n), and AI-driven content/SEO. We scope to your specific use case."
  }
  if (q.includes("support") || q.includes("maintenance") || q.includes("after") || q.includes("launch")) {
    return "🛡️ Post-launch support:\n\n• 3-month free-fix window after delivery\n• Maintenance plans from ¥10,000/month\n• Chat/email support, weekdays 9:00–18:00 JST\n• Same-day response for outages"
  }
  if (q.includes("contact") || q.includes("consult") || q.includes("book") || q.includes("talk")) {
    return "Happy to talk!\n\n📞 Free consultation:\n• Book: https://paradigmjp.com/contact\n• Email: info@paradigmjp.com\n• 15–30 min, Zoom or Google Meet\n\nNo pushy sales — first call is 100% free."
  }
  if (q.includes("company") || q.includes("paradigm") || q.includes("who are you") || q.includes("about")) {
    return "🏢 Paradigm LLC (Paradigm合同会社)\n• Tokyo-based, founded 2022\n• 200+ clients, 98% retention\n• Productized services for foreign SMBs entering Japan\n• Remote-first — fully supports overseas clients\n\nhttps://paradigmjp.com/contact"
  }
  return "Thanks for your message!\n\nHappy to help with any of:\n• Pricing & quotes\n• Process & timelines\n• Local SEO (MEO) / SEO / GEO\n• AI enablement\n• Post-launch support\n\nOr book a free consult → https://paradigmjp.com/contact\n📧 info@paradigmjp.com"
}
