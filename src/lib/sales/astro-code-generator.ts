/**
 * astro-code-generator.ts — DeepSeek generates complete Astro source code,
 * not a design.json. The output is a real index.astro file that imports
 * from the pipeline component library and renders a complete site.
 */
import type { DesignPromptInput } from "./demo-design-prompts"

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat" // DeepSeek V4 Pro (via LiteLLM proxy or direct API)
const TIMEOUT_MS = 90_000
const MAX_TOKENS = 8192

export interface AstroCodeResult {
  ok: boolean
  code?: string
  error?: string
}

// ── System Prompt ──

const SYSTEM_PROMPT = [
  "あなたはAppleやStripeのデザインをコードに変換するシニアAstroエンジニアです。",
  "",
  "== 絶対ルール ==",
  "1. 出力は**有効なAstroコード**のみ。説明やマークダウンは一切禁止。```astro のコードブロックも禁止。",
  "2. 使用するAstroバージョン: v4+（server output mode）",
  "3. 以下のコンポーネントライブラリをimportして使うこと。自作コンポーネントは極力避ける。",
  "",
  "== 利用可能なコンポーネント ===",
  "HeroSection — ヒーローセクション",
  "  Props: headline, subheadline?, image?, primaryCta:{label,href}, secondaryCta?:{label,href}, variant?:\"fullbleed\"|\"split\"|\"centered\"|\"gradient\", colors?:{primary?,bg?,text?}",
  "",
  "ProofStrip — 数値/実績ストリップ",
  "  Props: items:{value,label}[], colors?",
  "",
  "ServiceCards — サービス/メニューカード",
  "  Props: title, items:{title,body,icon?}[], layout?:\"3-col\"|\"2-col\"",
  "",
  "TestimonialCards — お客様の声",
  "  Props: items:{quote,author,role?}[], colors?",
  "",
  "PricingTable — 料金プラン",
  "  Props: plans:{name,price,description,features:[],featured?:boolean,cta:{label,href}}[], colors?",
  "",
  "FAQAccordion — よくある質問",
  "  Props: items:{question,answer}[]",
  "",
  "CTABanner — 行動喚起バナー",
  "  Props: title, subtitle?, ctas:{label,href}[], colors?",
  "",
  "ContactForm — 問い合わせフォーム",
  "  Props: title, body?, fields?:(\"name\"|\"email\"|\"phone\"|\"company\"|\"message\")[], successMessage?",
  "",
  "PageLayout — サイト外枠（nav+footer）",
  "  Props: companyName, pages:{label,href}[], footer:{address?,phone?,email?}",
  "",
  "== コード生成ルール ==",
  "1. ファイル先頭は `---` でコンポーネントをimport",
  "2. 各セクションはsectionタグでラップ。ページ全体をPageLayoutで囲む",
  "3. 色は企業データから抽出された実色を使う。なければ warm-earthy系を生成",
  "4. 診断データの数値（PageSpeedスコア、離脱率等）を自然に本文に織り込む",
  "5. 画像URLは与えられた実画像URLを使う。なければ画像なしでレイアウトする",
  "6. 企業名・地名・業種を具体的に本文に入れる",
  "7. 日本語でプロフェッショナルな文体。バズワード禁止",
  "8. 出力するコードだけで完結すること。外部依存なし",
  "",
  "== 出力形式 ==",
  "index.astro ファイルの完全な内容。先頭の---（フロントマター）から末尾の</html>まで。",
].join("\n")

// ── Generate ──

export async function generateAstroCode(input: DesignPromptInput): Promise<AstroCodeResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return { ok: false, error: "DEEPSEEK_API_KEY not configured" }

  const isJa = input.locale === "ja"
  const companyData = [
    `企業名: ${input.company.name}`,
    `業種: ${input.company.industry || "不明"}`,
    `所在地: ${input.company.location || "不明"}`,
    `ドメイン: ${input.company.domain}`,
    `利用可能な画像: hero=${input.images.hero_url || "なし"}, logo=${input.images.logo_url || "なし"}, gallery=${input.images.gallery_urls.length}枚`,
    input.colors ? `抽出されたブランド色: primary=${input.colors.primary}, bg=${input.colors.background}, accent=${input.colors.accent}, text=${input.colors.text}` : "ブランド色: 未抽出",
    `実テキスト(about): ${input.content.about?.slice(0, 500) || "なし"}`,
    `実テキスト(services): ${input.content.services?.slice(0, 500) || "なし"}`,
    `実テキスト(testimonials): ${input.content.testimonials?.slice(0, 500) || "なし"}`,
    `診断: ${input.diagnosis.pain_summary}`,
    `PageSpeed: モバイル${input.diagnosis.pagespeed_mobile ?? "?"}点, デスクトップ${input.diagnosis.pagespeed_desktop ?? "?"}点`,
    `改善案: ${input.diagnosis.improvements.map(a => `${a.headline}(${a.metrics.join(",")})`).join("; ") || "なし"}`,
  ].join("\n")

  const userPrompt = [
    companyData,
    "",
    isJa
      ? "上記の企業データを使って、完全な index.astro ファイルを生成せよ。"
      : "Generate a complete index.astro file using the company data above.",
    isJa
      ? "コードのみを出力。説明やマークダウンブロックは禁止。"
      : "Output only the code. No explanations or markdown blocks.",
  ].join("\n")

  try {
    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    let raw = data.choices?.[0]?.message?.content ?? ""
    if (!raw) return { ok: false, error: "DeepSeek returned empty content" }

    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:astro|html|jsx)?\s*\n?/, "").replace(/\n?```\s*$/, "")

    // Validate basic structure
    if (!raw.includes("---") || !raw.includes("<")) {
      return { ok: false, error: "Output doesn't look like Astro code" }
    }

    return { ok: true, code: raw }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
