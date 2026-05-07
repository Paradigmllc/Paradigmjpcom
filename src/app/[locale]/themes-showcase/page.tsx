/**
 * /[locale]/themes-showcase — B33 (2026-05-07) 6 design theme 検証ページ
 *
 * paradigm-blocks の ThemeProvider + 4 themed Block (Hero/CTA/Pricing/FeatureGrid) が
 * 6 design theme (raycast/stripe/reflect/family/posthog/glean) で正しく描画されるかを
 * 視覚的に確認するための内部 showcase。本番用ではなく、開発・QA・営業デモ用途。
 *
 * 動作:
 *   - URL: /[locale]/themes-showcase             → 6 テーマ全部を縦に並べて比較表示
 *   - URL: /[locale]/themes-showcase?theme=raycast → 1 テーマだけ全画面表示
 */

import {
  ThemeProvider,
  DESIGN_THEMES,
  isValidDesignTheme,
  type DesignTheme,
} from "@paradigmllc/blocks"
import { HeroBlock } from "@paradigmllc/blocks/blocks/Hero"
import { FeatureGridBlock } from "@paradigmllc/blocks/blocks/FeatureGrid"
import { PricingBlock } from "@paradigmllc/blocks/blocks/Pricing"
import { CTABlock } from "@paradigmllc/blocks/blocks/CTA"

export const dynamic = "force-dynamic"

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
        {/* Theme label badge */}
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

export default async function ThemesShowcase({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>
}) {
  const sp = await searchParams
  const single = isValidDesignTheme(sp.theme) ? (sp.theme as DesignTheme) : null

  if (single) {
    return <ThemeBlock theme={single} />
  }

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
        B33 — 6 Design Theme Showcase ・ ?theme=raycast / stripe / reflect / family / posthog / glean で個別表示
      </div>
      {DESIGN_THEMES.map((t) => (
        <ThemeBlock key={t} theme={t} />
      ))}
    </div>
  )
}
