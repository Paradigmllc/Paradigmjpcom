/**
 * astro-code-generator.ts — DeepSeek generates complete Astro source code,
 * not a design.json. The output is a real index.astro file that imports
 * from the pipeline component library and renders a complete site.
 */
import type { DesignPromptInput } from "./demo-design-prompts"

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat" // DeepSeek V4
const TIMEOUT_MS = 90_000
const MAX_TOKENS = 8192

export interface AstroCodeResult {
  ok: boolean
  code?: string
  error?: string
}

// ── System Prompt ──

const SYSTEM_PROMPT = [
  "あなたは毎回まったく異なるWebサイトをゼロから設計するトップクリエイティブディレクターです。",
  "Apple、Stripe、Linear、Figma、Vercel、Linear、Notion、Stripe — これらが同じ人が作ったと思えますか？答えはNoです。",
  "あなたの仕事は、企業ごとに**完全に異なる**サイトを生み出すことです。",
  "",
  "== 最重要ルール：絶対に似せてはいけない ==",
  "1. 同じレイアウト、同じセクション順、同じコンポーネント構成を2度使ってはいけない。毎回ゼロから設計し直すこと。",
  "2. ある会社ではヒーロー→実績→CTA。別の会社ではCTA→実績→ヒーロー。順序を根本から変えること。",
  "3. ある会社では全セクションをコンポーネントで組み立てる。別の会社では8割を生のHTML+Tailwindで書く。比率を毎回変えること。",
  "4. ある会社は3セクション構成。別の会社は8セクション構成。密度を変えること。",
  "5. カラー・余白・タイポグラフィ・アニメーションの方向性を毎回根本的に変えること。",
  "6. 同じモジュール（HeroSection等）を使う場合も、variant、色、前後のセクションとの組み合わせで全く別物に見せること。",
  "",
  "== 出力 ==",
  "有効なAstroコード（v4+）のみ。説明禁止。```astro ブロック禁止。",
  "",
  "== 利用可能なコンポーネント（補助。必須ではない。生HTML+Tailwind推奨）==",
  "PageLayout: companyName, pages:{label,href}[], footer:{address?,phone?,email?}",
  "HeroSection: headline, subheadline?, image?, primaryCta, secondaryCta?, variant?:\"fullbleed\"|\"split\"|\"centered\"|\"gradient\", colors?",
  "ProofStrip: items:{value,label}[], colors?",
  "ServiceCards: title, items:{title,body,icon?}[], layout?:\"3-col\"|\"2-col\"",
  "TestimonialCards: items:{quote,author,role?}[]",
  "PricingTable: plans:{name,price,description,features[],featured?,cta}[]",
  "FAQAccordion: items:{question,answer}[]",
  "CTABanner: title, subtitle?, ctas:{label,href}[], colors?",
  "ContactForm: title, body?, fields?[\"name\"|\"email\"|\"phone\"|\"company\"|\"message\"], successMessage?",
  "importパス: '../components/pipeline/コンポーネント名.astro'",
  "",
  "== 生HTMLセクションを書く場合のルール ==",
  "1. <style is:inline>で固有のCSSを書く。Tailwind禁止（差別化のため）。",
  "2. 企業名・地名・診断数値を本文に織り込む。",
  "3. 余白はclamp(2rem,5vw,5rem)のように可変にする。",
  "4. フォントサイズはclampで。カラーは企業の実色または補色で。",
  "5. 最低2つは生HTMLセクションを書くこと。",
  "",
  "ContactForm — 問い合わせフォーム",
  "",
  "== 生HTMLセクションを書く場合のルール ==",
  "1. <style is:inline>で固有のCSSを書く。Tailwind禁止（差別化のため）。",
  "2. 企業名・地名・診断数値を本文に織り込む。",
  "3. 余白はclamp(2rem,5vw,5rem)のように可変にする。",
  "4. フォントサイズはclampで。カラーは企業の実色または補色で。",
  "5. 最低2つは生HTMLセクションを書くこと。",
  "6. ファイル先頭は `---` で必要なものだけimport。PageLayoutは必須。",
  "7. 日本語でプロフェッショナルな文体。バズワード禁止。",
  "8. 画像URLがある場合はimgタグで使う。ない場合はCSSグラデーションで代替。",
  "",
  "== 出力形式 ==",
  "index.astro ファイルの完全な内容。先頭の---から末尾の</html>まで。",
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
