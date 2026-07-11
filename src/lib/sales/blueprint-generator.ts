/**
 * blueprint-generator.ts — DeepSeek V4 generates JSON blueprint (NOT code).
 * AI selects which molds to use + what data to inject.
 *
 * Token cost: ~500 output tokens = ~$0.00014 per company.
 */
import { parseJsonObject, readChatContent } from "./llm-response"

const API = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1"
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"

const MOLD_CATALOG = [
  { type: "HeroDarkGradient", for: "スタートアップ/SaaS/テック", props: "headline,subheadline,image?,primaryCta,secondaryCta?,accentColor?" },
  { type: "HeroSplitImage", for: "一般企業/サービス業", props: "headline,subheadline,image,primaryCta,secondaryCta?,theme?" },
  { type: "HeroNeonUrgent", for: "緊急サービス/駆けつけ/修理", props: "headline,subheadline,primaryCta,phone" },
  { type: "HeroMinimalTrust", for: "士業/医療/金融", props: "headline,subheadline,primaryCta,accentColor?" },
  { type: "HeroBoldCentered", for: "クリエイティブ/デザイン/飲食", props: "headline,subheadline,primaryCta,secondaryCta?" },
  { type: "FeatureGrid3Col", for: "汎用サービス紹介", props: "items:{title,body,icon}[]" },
  { type: "FeatureGridIcon", for: "アイコン重視の特徴一覧", props: "items:{title,body,icon}[],columns?" },
  { type: "TimelineVertical", for: "歴史/実績/沿革", props: "items:{year,title,body}[]" },
  { type: "TrustMetrics", for: "数字で信頼醸成", props: "items:{value,label}[]" },
  { type: "PricingCards", for: "料金プラン", props: "plans:{name,price,description,features[],cta,featured?}[]" },
  { type: "TestimonialSlider", for: "お客様の声", props: "items:{quote,author,role}[]" },
  { type: "FAQAccordionMold", for: "よくある質問", props: "items:{q,a}[]" },
  { type: "ContactSplit", for: "問い合わせフォーム", props: "title,body,fields[],theme?" },
  { type: "CTAFloating", for: "モバイル用固定CTA", props: "text,phone,ctaLabel,ctaHref" },
]

export interface BlueprintResult {
  ok: boolean
  blueprint?: Record<string, unknown>
  error?: string
}

export async function generateBlueprint(companyData: {
  companyName: string; domain: string; industry: string | null; location: string | null; locale: string
  painSummary: string; pagespeedMobile: number | null; pagespeedDesktop: number | null
  services: string[]; aboutText: string; testimonials: string[]
}): Promise<BlueprintResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return { ok: false, error: "no API key" }

  const catalog = MOLD_CATALOG.map(m => `  ${m.type}(${m.for})`).join("\n")

  const system = [
    "あなたはWebサイトの設計図を作るアーキテクトです。コードは書かない。JSONだけを出力する。",
    "",
    "== 利用可能なコンポーネント ==",
    catalog,
    "",
    "== 出力ルール ==",
    "1. 企業データを読んで、最適なコンポーネントを3〜7個選べ",
    "2. 各コンポーネントに流し込むPropsを具体的に指定せよ",
    "3. ヘッドラインは企業の業種・課題・地域を織り込んだ具体的な日本語にせよ",
    "4. 出力はJSONのみ。コードは絶対に書くな",
  ].join("\n")

  const user = [
    `企業名: ${companyData.companyName}`,
    `業種: ${companyData.industry || "不明"}`,
    `所在地: ${companyData.location || "不明"}`,
    `課題: ${companyData.painSummary}`,
    `PageSpeed: ${companyData.pagespeedMobile ?? "?"}点(モバイル)`,
    `サービス: ${companyData.services.join(", ")}`,
    `会社概要: ${companyData.aboutText}`,
    `顧客の声: ${companyData.testimonials.join(" | ")}`,
    "",
    "上記の企業に最適なコンポーネントを選択し、完全なBlueprint JSONを出力せよ。",
    "",
    "JSON形式:",
    '{ "site": { "companyName": "...", "pages": [...], "footer": {...} },',
    '  "blocks": [',
    '    { "type": "HeroDarkGradient", "props": { "headline": "...", ... } },',
    '    { "type": "FeatureGrid3Col", "props": { "items": [...] } },',
    '    ...',
    "  ]",
    "}",
    "",
    "JSONのみ出力。説明禁止。",
  ].join("\n")

  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.7, max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    })
    const data: unknown = await res.json()
    const json = parseJsonObject(readChatContent(data))
    return { ok: true, blueprint: json }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
