/**
 * lib/theme-tokens.ts — admin-editable theme tokens → CSS variable injector
 *
 * 役割:
 *   PayloadCMS Settings.theme から取得した色 / フォント / 角丸を Tailwind v4 の
 *   `rgb(var(--paradigm-X))` 形式に合わせた CSS 変数として `<style>` に出力する。
 *
 * 入力フォーマット (admin が入力):
 *   色:   "#FAFAF7" / "rgb(250, 250, 247)" / "250 250 247" (Tailwind v4 raw RGB) のいずれか
 *   フォント: "Noto Sans JP, sans-serif" 等のフルスタック
 *   角丸:   "12px" / "1rem" / "0.75rem" 等の CSS unit
 *
 * 出力:
 *   `:root { --paradigm-paper: 250 250 247; --font-display: ...; }` の形式
 *   layout.tsx で <style id="theme-overrides"> として注入され、globals.css の
 *   default を override する。空 / 未設定のキーは default を残すため省略される。
 */

export interface ThemeTokens {
  colors?: {
    paper?: string | null
    paperDeep?: string | null
    ink?: string | null
    inkSoft?: string | null
    inkMute?: string | null
    line?: string | null
    accent?: string | null
    tech?: string | null
    glow?: string | null
  } | null
  fonts?: {
    display?: string | null
    body?: string | null
  } | null
  radius?: {
    sm?: string | null
    md?: string | null
    lg?: string | null
  } | null
}

/**
 * 入力値を「R G B」形式 (Tailwind v4 rgb(var(--x)) 用) に正規化。
 * 解釈不能なら null を返す (caller は無視 / default fallback)。
 */
export function toRgbTriplet(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Already "R G B" or "R, G, B"
  const triplet = trimmed.match(/^(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})$/)
  if (triplet) {
    const [, r, g, b] = triplet
    if (Number(r) <= 255 && Number(g) <= 255 && Number(b) <= 255) {
      return `${r} ${g} ${b}`
    }
    return null
  }

  // rgb(R, G, B) or rgb(R G B)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    if (Number(r) <= 255 && Number(g) <= 255 && Number(b) <= 255) {
      return `${r} ${g} ${b}`
    }
  }

  // hex #RGB or #RRGGBB
  const hexShort = trimmed.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (hexShort) {
    const [, r, g, b] = hexShort
    return `${parseInt(r + r, 16)} ${parseInt(g + g, 16)} ${parseInt(b + b, 16)}`
  }
  const hexLong = trimmed.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hexLong) {
    const [, r, g, b] = hexLong
    return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`
  }

  return null
}

/** Tailwind v4 では globals.css 内の token は `--paradigm-{key}` 形式。 */
const COLOR_VAR_MAP: Record<keyof NonNullable<ThemeTokens["colors"]>, string> = {
  paper: "--paradigm-paper",
  paperDeep: "--paradigm-paper-deep",
  ink: "--paradigm-ink",
  inkSoft: "--paradigm-ink-soft",
  inkMute: "--paradigm-ink-mute",
  line: "--paradigm-line",
  accent: "--paradigm-accent",
  tech: "--paradigm-tech",
  glow: "--paradigm-glow",
}

/**
 * theme オブジェクト → CSS 文字列。空 / 解釈不能なキーは出力されない (= default 残る)。
 * 出力例:
 *   :root {
 *     --paradigm-paper: 250 250 247;
 *     --paradigm-accent: 99 102 241;
 *     --font-display: "Noto Sans JP", sans-serif;
 *     --radius-md: 12px;
 *   }
 */
export function themeTokensToCss(theme: ThemeTokens | null | undefined): string {
  if (!theme) return ""
  const lines: string[] = []

  // Colors
  const colors = theme.colors
  if (colors) {
    for (const key of Object.keys(COLOR_VAR_MAP) as Array<keyof typeof COLOR_VAR_MAP>) {
      const rgb = toRgbTriplet(colors[key])
      if (rgb) lines.push(`  ${COLOR_VAR_MAP[key]}: ${rgb};`)
    }
  }

  // Fonts (string そのまま — admin が full font-stack を入力前提)
  if (theme.fonts?.display) lines.push(`  --font-display: ${theme.fonts.display};`)
  if (theme.fonts?.body) lines.push(`  --font-body: ${theme.fonts.body};`)

  // Border radius
  if (theme.radius?.sm) lines.push(`  --radius-sm: ${theme.radius.sm};`)
  if (theme.radius?.md) lines.push(`  --radius-md: ${theme.radius.md};`)
  if (theme.radius?.lg) lines.push(`  --radius-lg: ${theme.radius.lg};`)

  if (lines.length === 0) return ""
  return `:root {\n${lines.join("\n")}\n}\n`
}
