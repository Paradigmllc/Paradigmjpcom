/**
 * /[locale]/themes-showcase — B33 (2026-05-07/08) 6 design theme 検証ページ
 *
 * paradigm-blocks の ThemeProvider + 4 themed Block (Hero/CTA/Pricing/FeatureGrid) が
 * 6 design theme (raycast/stripe/reflect/family/posthog/glean) で正しく描画されるかを
 * 視覚的に確認するための内部 showcase。本番用ではなく、開発・QA・営業デモ用途。
 *
 * 動作:
 *   - URL: /[locale]/themes-showcase                         → 6 テーマ全部を縦に並べて比較表示 (default)
 *   - URL: /[locale]/themes-showcase?theme=raycast           → 1 テーマだけ全画面表示
 *   - URL: /[locale]/themes-showcase?layout=grid             → 24 セル grid 比較 (4 Block × 6 theme・Phase 7)
 *   - URL: /[locale]/themes-showcase?layout=grid&block=hero  → 1 Block × 6 theme の横並び比較
 *
 * 2026-05-13 audit fix: 内部 QA ページのため SAMPLE_* data は JP のみ (intentional)・
 *   生 JP 文字が i18n 対象外であることを示すために robots: noindex,nofollow を強制。
 */
import type { Metadata } from "next"
import {
  ThemeProvider,
  DESIGN_THEMES,
  DESIGN_THEME_TOKENS,
  isValidDesignTheme,
  type DesignTheme,
} from "@paradigmllc/blocks"
import { HeroBlock } from "@paradigmllc/blocks/blocks/Hero"
import { FeatureGridBlock } from "@paradigmllc/blocks/blocks/FeatureGrid"
import { PricingBlock } from "@paradigmllc/blocks/blocks/Pricing"
import { CTABlock } from "@paradigmllc/blocks/blocks/CTA"

export const metadata: Metadata = {
  title: "Themes Showcase (internal QA)",
  description: "Internal design theme comparison page. Not for public consumption.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export const dynamic = "force-dynamic"

// ─── Sample data ──────────────────────────────────────────────────────

const SAMPLE_HERO = {
  title: "Web サイト健康診断レポート",
  subtitle: "業界中央値・上位 10% との比較で、年間機会損失と回収プランを 60 秒で可視化します。",
  ctaLabel: "対策パッケージを見る",
  ctaUrl: "#",
  variant: "centered" as const,
}

const SAMPLE_FEATURES = {
  heading: "検出された痛み",
  columns: 3 as const,
  features: [
    { icon: "⚡", title: "ページ速度", description: "LCP 4.2s — 業界中央値の 1.7 倍。CVR -22% 推定。" },
    { icon: "🛡️", title: "セキュリティ", description: "TLS 1.0 残存 + HSTS 未設定。GDPR 罰金リスク。" },
    { icon: "🔍", title: "SEO", description: "Core Web Vitals 3 項目すべて Poor。検索流入 -38% 機会損失。" },
  ],
}

const SAMPLE_PRICING = {
  heading: "対策パッケージ",
  plans: [
    { name: "梅", price: "¥350K", cycle: "/初回", features: ["診断レポート", "30 日間の電話相談"], ctaLabel: "梅で始める", ctaUrl: "#", highlighted: false },
    { name: "竹", price: "¥980K", cycle: "/初回", features: ["診断 + 実装支援", "90 日伴走", "月次ヘルスチェック"], ctaLabel: "竹で始める", ctaUrl: "#", highlighted: true },
    { name: "松", price: "¥2,400K", cycle: "/初回", features: ["全部入り", "12 ヶ月主治医契約", "成果保証"], ctaLabel: "松で始める", ctaUrl: "#", highlighted: false },
  ],
}

const SAMPLE_CTA = {
  heading: "今、あなたの Web サイトに何が起きているか、知っていますか?",
  description: "Paradigm の主治医ポジション診断で、月次ヘルスチェックが始まります。",
  buttonLabel: "無料診断を申し込む",
  buttonUrl: "#",
  variant: "primary" as const,
}

const BLOCK_KEYS = ["hero", "feature_grid", "pricing", "cta"] as const
type BlockKey = (typeof BLOCK_KEYS)[number]

const BLOCK_LABELS: Record<BlockKey, string> = {
  hero: "Hero",
  feature_grid: "FeatureGrid",
  pricing: "Pricing",
  cta: "CTA",
}

// ─── Cell Renderer ────────────────────────────────────────────────────

function renderBlock(blockKey: BlockKey) {
  switch (blockKey) {
    case "hero":         return <HeroBlock {...SAMPLE_HERO} />
    case "feature_grid": return <FeatureGridBlock {...SAMPLE_FEATURES} />
    case "pricing":      return <PricingBlock {...SAMPLE_PRICING} />
    case "cta":          return <CTABlock {...SAMPLE_CTA} />
  }
}

function isValidBlockKey(value: unknown): value is BlockKey {
  return typeof value === "string" && (BLOCK_KEYS as readonly string[]).includes(value)
}

// ─── Default: full-page stacked per-theme view ────────────────────────

function ThemeBlock({ theme }: { theme: DesignTheme }) {
  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          minHeight: "100vh",
          background: "rgb(var(--paradigm-paper))",
          color: "rgb(var(--paradigm-ink))",
          paddingBottom: 48,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: "12px 24px",
            background: "rgb(var(--paradigm-paper-deep))",
            borderBottom: "1px solid rgb(var(--paradigm-line))",
            fontSize: 12,
            letterSpacing: "0.16em",
            fontWeight: 800,
            textTransform: "uppercase",
            color: "rgb(var(--paradigm-accent))",
          }}
        >
          THEME · {theme}
        </div>
        <HeroBlock {...SAMPLE_HERO} />
        <FeatureGridBlock {...SAMPLE_FEATURES} />
        <PricingBlock {...SAMPLE_PRICING} />
        <CTABlock {...SAMPLE_CTA} />
      </div>
    </ThemeProvider>
  )
}

// ─── Grid Cell: 1 Block × 1 Theme miniature ──────────────────────────

function GridCell({ theme, blockKey }: { theme: DesignTheme; blockKey: BlockKey }) {
  const tokens = DESIGN_THEME_TOKENS[theme]
  return (
    <div
      style={{
        border: "1px solid #1F2937",
        borderRadius: 8,
        overflow: "hidden",
        background: "#0F172A",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* cell header */}
      <div
        style={{
          padding: "8px 12px",
          background: "#0B1220",
          borderBottom: "1px solid #1F2937",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          fontFamily: "ui-monospace, SF Mono, Consolas, monospace",
          color: "#94A3B8",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ fontWeight: 700, color: "#F8FAFC" }}>{tokens.displayName}</span>
        <span>{BLOCK_LABELS[blockKey]}</span>
      </div>
      {/* iframe-style scaled preview */}
      <div
        style={{
          height: 360,
          overflow: "auto",
          position: "relative",
          background: `rgb(${tokens.paper})`,
        }}
      >
        <div
          style={{
            transform: "scale(0.42)",
            transformOrigin: "top left",
            width: "238%",  // 100 / 0.42 ≒ 238
            pointerEvents: "none",
          }}
        >
          <ThemeProvider theme={theme}>
            {renderBlock(blockKey)}
          </ThemeProvider>
        </div>
      </div>
    </div>
  )
}

// ─── Grid Layout: 6 themes × 4 blocks = 24 cells ─────────────────────

function GridShowcase({ filterBlock }: { filterBlock?: BlockKey }) {
  const blocks: BlockKey[] = filterBlock ? [filterBlock] : [...BLOCK_KEYS]
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#F8FAFC",
        padding: "20px 16px 80px",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto 24px",
          padding: "0 8px",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            B33 — 6 Design Theme × 4 Block 比較 grid
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
            {filterBlock
              ? `${BLOCK_LABELS[filterBlock]} を 6 テーマで横並び比較中`
              : `4 Block × 6 theme = 24 セル. 各 cell をクリックで全画面表示.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
          <a href="?layout=grid" style={navStyle(!filterBlock)}>ALL</a>
          {BLOCK_KEYS.map((b) => (
            <a key={b} href={`?layout=grid&block=${b}`} style={navStyle(filterBlock === b)}>
              {BLOCK_LABELS[b]}
            </a>
          ))}
          <a href="?" style={navStyle(false)}>↩ Stacked</a>
        </div>
      </div>

      {blocks.map((blockKey) => (
        <section key={blockKey} style={{ maxWidth: 1600, margin: "0 auto 32px" }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#CBD5E1",
              margin: "0 8px 12px",
              borderBottom: "1px solid #1F2937",
              paddingBottom: 8,
            }}
          >
            ▸ {BLOCK_LABELS[blockKey]} Block · 6 Theme Comparison
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              padding: "0 8px",
            }}
          >
            {DESIGN_THEMES.map((theme) => (
              <a
                key={theme}
                href={`?theme=${theme}`}
                style={{ textDecoration: "none", color: "inherit" }}
                title={`Click to view ${theme} full-page`}
              >
                <GridCell theme={theme} blockKey={blockKey} />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function navStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    background: active ? "#1E40AF" : "#0F172A",
    color: active ? "#F8FAFC" : "#94A3B8",
    border: `1px solid ${active ? "#3B82F6" : "#1F2937"}`,
    textDecoration: "none",
    fontWeight: 600,
  }
}

// ─── Page Entry ──────────────────────────────────────────────────────

export default async function ThemesShowcase({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; layout?: string; block?: string }>
}) {
  const sp = await searchParams
  const single = isValidDesignTheme(sp.theme) ? (sp.theme as DesignTheme) : null

  // Single-theme full-page view
  if (single) {
    return <ThemeBlock theme={single} />
  }

  // 24-cell grid comparison view (Phase 7)
  if (sp.layout === "grid") {
    const filterBlock = isValidBlockKey(sp.block) ? sp.block : undefined
    return <GridShowcase filterBlock={filterBlock} />
  }

  // Default: stacked full-page per-theme
  return (
    <div>
      <div
        style={{
          padding: "16px 24px",
          background: "#0F172A",
          color: "#F8FAFC",
          fontSize: 13,
          letterSpacing: "0.04em",
          textAlign: "center",
        }}
      >
        B33 — 6 Design Theme Showcase · ?theme=raycast/stripe/reflect/family/posthog/glean で個別 ·{" "}
        <a href="?layout=grid" style={{ color: "#60A5FA", textDecoration: "underline", marginLeft: 8 }}>
          ?layout=grid で 24 セル比較
        </a>
      </div>
      {DESIGN_THEMES.map((t) => (
        <ThemeBlock key={t} theme={t} />
      ))}
    </div>
  )
}
