/**
 * proposal/theme.ts — 3 テーマプリセット
 *
 * 永久ルール: theme は CSS 変数として一元管理・section component は
 *   var(--proposal-bg) 等を参照するだけ。テーマ追加 = ここに 1 行追加。
 */
import type { ThemeId } from "./manifest"

export interface ProposalTheme {
  bg: string                    // メイン背景
  bgAlt: string                 // セクション交互背景
  surface: string               // カード/パネル
  border: string                // 罫線
  text: string                  // 主要テキスト
  textMuted: string             // 補助テキスト
  accent: string                // ブランドアクセント (CTA等)
  accentSoft: string            // アクセント薄
  warn: string                  // 警告/損失
  shadow: string                // カード影
  fontFamily: string            // ベースフォント
  radiusCard: string            // カード角丸
  heroBg: string                // ヒーロー背景 (グラデーション可)
  heroOverlay: string           // ヒーローオーバーレイ
  heading: string               // 見出し用フォント装飾
}

export const THEMES: Record<ThemeId, ProposalTheme> = {
  // ── Stripe/Linear 系: 白地ミニマル ──────────────────────────
  minimal: {
    bg: "#FAFBFD",
    bgAlt: "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E5E9F0",
    text: "#0F172A",
    textMuted: "#64748B",
    accent: "#635BFF",
    accentSoft: "#EEF2FF",
    warn: "#DC2626",
    shadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    radiusCard: "12px",
    heroBg: "linear-gradient(180deg, #FFFFFF 0%, #F5F7FB 100%)",
    heroOverlay: "transparent",
    heading: "letter-spacing:-0.02em;font-weight:700;",
  },

  // ── Apple/Airbnb 系: ガラス質感プレミアム ───────────────────
  premium: {
    bg: "#0A0A0F",
    bgAlt: "#13131A",
    surface: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    textMuted: "rgba(255, 255, 255, 0.6)",
    accent: "#FFD700",
    accentSoft: "rgba(255, 215, 0, 0.12)",
    warn: "#FF6B6B",
    shadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'SF Pro Display', sans-serif",
    radiusCard: "20px",
    heroBg: "radial-gradient(circle at 30% 20%, rgba(99, 91, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.15) 0%, transparent 50%), #0A0A0F",
    heroOverlay: "linear-gradient(180deg, transparent 0%, rgba(10, 10, 15, 0.4) 100%)",
    heading: "letter-spacing:-0.04em;font-weight:800;",
  },

  // ── Notion/Vercel 系: 雑誌エディトリアル ────────────────────
  editorial: {
    bg: "#FFF8EE",
    bgAlt: "#FFFFFF",
    surface: "#FFFFFF",
    border: "#E8DFCC",
    text: "#1A1410",
    textMuted: "#6B5C4E",
    accent: "#D97706",
    accentSoft: "#FFF1DC",
    warn: "#B91C1C",
    shadow: "0 2px 8px rgba(217, 119, 6, 0.08), 0 8px 32px rgba(26, 20, 16, 0.06)",
    fontFamily: "Georgia, 'Times New Roman', ui-serif, serif",
    radiusCard: "8px",
    heroBg: "linear-gradient(180deg, #FFF8EE 0%, #FFEFD5 100%)",
    heroOverlay: "transparent",
    heading: "letter-spacing:-0.03em;font-weight:700;font-family:Georgia,serif;",
  },
}

export function getTheme(id: ThemeId): ProposalTheme {
  return THEMES[id] ?? THEMES.minimal
}

/** Theme を CSS 変数として root に注入する (style attribute 用) */
export function themeToCssVars(theme: ProposalTheme): React.CSSProperties {
  return {
    ["--p-bg" as string]: theme.bg,
    ["--p-bg-alt" as string]: theme.bgAlt,
    ["--p-surface" as string]: theme.surface,
    ["--p-border" as string]: theme.border,
    ["--p-text" as string]: theme.text,
    ["--p-text-muted" as string]: theme.textMuted,
    ["--p-accent" as string]: theme.accent,
    ["--p-accent-soft" as string]: theme.accentSoft,
    ["--p-warn" as string]: theme.warn,
    ["--p-shadow" as string]: theme.shadow,
    ["--p-radius-card" as string]: theme.radiusCard,
    ["--p-hero-bg" as string]: theme.heroBg,
    ["--p-hero-overlay" as string]: theme.heroOverlay,
    fontFamily: theme.fontFamily,
    color: theme.text,
    background: theme.bg,
  }
}
