/**
 * astro-code-generator.ts — DeepSeek generates complete Astro source code,
 * not a design.json. The output is a real index.astro file that imports
 * from the pipeline component library and renders a complete site.
 */
import type { DesignPromptInput } from "./demo-design-prompts"
import { selectDesignSystem } from "./figma-design-system"

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

export function buildSystemPrompt(industry?: string | null): string {
  const ds = selectDesignSystem(industry ?? null)
  const tokens = ds.colors.tokens
  const typo = ds.typography
  const space = ds.spacing
  const rad = ds.radius
  const shadows = ds.shadows
  const comp = ds.components

  const colorTable = Object.entries(tokens).map(([name, t]) =>
    `  --c-${name}: ${t.light} (dark:${t.dark})${t.gradient ? ` gradient(${t.gradient.join(",")})` : ""}`
  ).join("\n")

  return [
    "あなたはFigmaから抽出されたデザインシステムをAstroコードにコンパイルする翻訳エンジンです。",
    "デザインを考えるな。与えられたスペックを忠実にコード化せよ。",
    "",
    "== Figmaデザインシステム（変更禁止）==",
    `カラートークン:\n${colorTable}`,
    "",
    `タイポグラフィ:`,
    `  h1: ${typo.scale.h1.fontSize} weight:${typo.scale.h1.fontWeight} tracking:${typo.scale.h1.letterSpacing}`,
    `  h2: ${typo.scale.h2.fontSize} weight:${typo.scale.h2.fontWeight}`,
    `  h3: ${typo.scale.h3.fontSize} weight:${typo.scale.h3.fontWeight}`,
    `  body: ${typo.scale.body.fontSize}`,
    `  フォント: ${typo.families.heading}`,
    "",
    `余白:`,
    `  セクションpadding: ${space.sectionPadding}`,
    `  コンテナ: ${space.containerMax}`,
    `  カードgap: ${space.cardGap} カードpadding: ${space.cardPadding}`,
    "",
    `半径: sm=${rad.sm} md=${rad.md} lg=${rad.lg} pill=${rad.pill}`,
    `シャドウ: card=${shadows.md} button=${shadows.glow}`,
    "",
    `コンポーネント仕様:`,
    `  カード: bg=${comp.card.background} radius=${comp.card.radius} hover=${comp.card.hover}`,
    `  ボタン(primary): ${comp.button.primary.background} radius=${comp.button.primary.radius} hover=${comp.button.primary.hover}`,
    `  ボタン(secondary): radius=${comp.button.secondary.radius}`,
    `  ナビ: height=${comp.nav.height} bg=${comp.nav.background} blur=${comp.nav.blur}`,
    "",
    "== セクションリズム ==",
    `必須順序: ${ds.layout.sectionRhythm.join(" → ")} → dark(call to action)。絶対にこの順序を守れ。`,
    "",
    "== コンパイルルール ==",
    "1. <style is:inline>で上記トークンをCSSカスタムプロパティとして定義。",
    "2. 各セクションは<section>でラップ。背景色はトークン通り。交互反転厳守。",
    "3. 全セクションに animation:fadeUp .8s ease both を付与。",
    "4. 見出しサイズ・太さ・字間はタイポグラフィ仕様通り。",
    "5. カードはコンポーネント仕様通り。ボタンも同じ。",
    "6. 企業データ（社名・地名・診断数値）を本文に織り込め。最低3段落/セクション。",
    "7. 画像は使わない。CSS gradientで代替。",
    "8. PageLayout必須: import PageLayout from '../components/pipeline/PageLayout.astro'",
    "   props: companyName, pages:{label,href}[], footer:{address,phone,email}",
    "",
    "== 出力 ==",
    "有効なAstroコードのみ。説明禁止。先頭の---から末尾の</html>まで。",
  ].join("\n")
}

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
          { role: "system", content: buildSystemPrompt(input.company.industry) },
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
