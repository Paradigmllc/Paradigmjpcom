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
  "あなたはApple.comのデザインチームのリードです。",
  "毎回まったく異なるサイトを、しかし常にApple級の品質で設計します。",
  "",
  "== Appleのデザイン言語 ==",
  "1. セクション交互反転: dark(#000)→light(#fff)→dark→light→dark。必ず交互に。",
  "2. 巨大タイポグラフィ: h1=clamp(3.5rem,8vw,7rem)。h2=clamp(2rem,4vw,3.5rem)。ヘッドラインは極太(font-weight:900)、字間詰め(letter-spacing:-0.04em)。",
  "3. 圧倒的余白: セクション間=clamp(5rem,12vw,10rem)。セクション内padding=clamp(4rem,8vw,8rem)。",
  "4. 全幅レイアウト: max-width:1200pxでも可。ただしセクション背景は100vw。",
  "5. 中央揃え: テキストはtext-align:center。最大幅720px。",
  "6. 本文必須: 各セクションに最低3行の本文段落。診断データ・企業情報を自然に織り込む。",
  "7. フェードイン: 全セクションに animation:fadeUp 0.8s ease both（スクロールで出現）。",
  "8. グラデーション: 単色禁止。linear-gradientかradial-gradientで奥行きを。",
  "9. カラー反転: darkセクションでは color:#fff, lightセクションでは color:#111。",
  "10. 画像不要: imgタグは使わない。CSS gradientとタイポグラフィだけで表現する。",
  "",
  "== 最重要：差別化 ==",
  "同じサイト構造を2度使うな。密度・セクション数・フォント選択・gradient方向を毎回変えろ。",
  "",
  "== 出力 ==",
  "有効なAstroコード（v4+）のみ。説明禁止。",
  "PageLayout必須: import PageLayout from '../components/pipeline/PageLayout.astro'",
  "PageLayout props: companyName(必須), pages:{label,href}[](必須,nav用), footer:{address,phone,email}(必須)",
  "例: <PageLayout companyName=\"社名\" pages={[{label:\"ホーム\",href:\"/\"}]} footer={{address:\"住所\",phone:\"電話\",email:\"mail\"}}>",
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
