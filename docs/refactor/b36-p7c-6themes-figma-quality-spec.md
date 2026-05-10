# B36-P7C 6 Design Themes — Figma Community Template Quality

> **状態**: 📋 **DRAFT — 壁打ち & ユーザー承認待ち**
> **作成**: 2026-05-10
> **背景**: ユーザー指示「Stripe を細部まで模倣した (Figma コミュニティテンプレ級のクオリティ) に仕上げて. ただ色やフォントを変えるだけでは意味がない」.
> **依存関係**: Phase 7-B (industry × pitch_angle template matrix) 完了後・report_templates テーブルの design_theme 列が確定.

---

## 1. 設計原則 — 「色変えだけ」を超える 4 軸

各 theme は以下 **4 軸** で differentiation する (色だけのスキン変更は禁止):

| 軸 | 説明 | 観測可能な実装証跡 |
|---|------|-----------------|
| **A. 色彩システム** | semantic color tokens (primary / accent / surface / muted / destructive 等) を意味付き 7 階層で持つ. 不揃いな hex は禁止 | `tokens.json` の OKLCH 色域定義 |
| **B. タイポグラフィ階層** | heading (display / h1-h4) / body / mono の各 6 weight × 動的 line-height. 縦リズム 4px grid | `font-family` / `font-feature-settings` (ss01-ss20) |
| **C. コンポーネントモチーフ** | Card / Button / Badge / Section の form factor (radius / shadow / border / outline) を theme 固有に造形 | `Card.tsx` 等の variant prop |
| **D. ブランド固有装飾** | theme を一目で判別できる視覚的 hook (Stripe = mesh gradient + 3D card / Reflect = serif headline + indented quote 等) | dedicated SVG / CSS 装飾 |

---

## 2. 6 Themes 詳細仕様

### 2.1 Stripe (✨ flagship・最深く模倣)

**aesthetic anchor**: [stripe.com](https://stripe.com) home + dashboard / Figma community template「Stripe Payment Platform SaaS UI」(community 23k+ likes)

| 軸 | 仕様 |
|---|------|
| 色 | `--primary: oklch(58% 0.21 285)` (Stripe purple #635BFF) / `--accent: oklch(70% 0.17 280)` / `--surface: pure white` / `--muted: oklch(96% 0.005 285)` / surface elevations 5 段階 |
| タイポ | Inter 400/500/600/700 + Source Sans 3 fallback / heading: 56/40/28/20/16 (1.1 line-height) / body: 16/14 (1.6) / `font-feature-settings: "cv11", "ss01"` (Inter 5.0 stylistic alts) |
| コンポーネント | Card: `border-radius: 12px` + `box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 24px -8px rgba(99,91,255,0.08)` / Button: `gradient: linear-gradient(180deg, #6F6BFF 0%, #635BFF 100%)` + hover `transform: translateY(-1px)` |
| ブランド hook | **mesh gradient hero** (CSS conic-gradient + 5 color blob blur) / **3D-tilted code blocks** (CSS perspective + transform) / **shimmer keyboard shortcuts** (kbd + ⌘/⏎ icons) / **inline number tickers** (NumberTicker animated) |

**実装ファイル**: `paradigm-blocks/src/_themes/stripe/{tokens.json, Card.tsx, MeshGradientHero.tsx}`

### 2.2 Raycast

**anchor**: raycast.com / dark-first dev tool aesthetic

| 軸 | 仕様 |
|---|------|
| 色 | dark default `--surface: oklch(13% 0.01 280)` + `--primary: oklch(72% 0.17 18)` (vermilion red) / 4 色のみで構成 (制約色彩) / mono font 比重高 |
| タイポ | SF Pro Display / Inter 400/600 + JetBrains Mono / heading: 48/32/24/18 / kbd inline span が定型化 |
| コンポーネント | Card: `border: 1px solid rgba(255,255,255,0.08)` (border-only・shadow 不使用) / radius 8px / Button: outline + `kbd` shortcut hint 必須 |
| hook | **command palette UI** as section header / **keyboard shortcuts inline** (⌘K, ⌘P) / **dark glow accents** (radial gradient behind hero) |

### 2.3 Reflect (note-taking)

**anchor**: reflect.app / serif headlines + rich typography

| 軸 | 仕様 |
|---|------|
| 色 | warm neutrals `--surface: oklch(98% 0.012 80)` (cream paper) / `--primary: oklch(40% 0.04 80)` (dark warm gray) / accent `--accent: oklch(72% 0.17 50)` (warm amber) |
| タイポ | **Cormorant Garamond** (display) + Inter (body) / heading: 64/44/30/20 (1.1) / `font-style: italic` for h2 secondary / drop cap optional |
| コンポーネント | Card: 角丸 16px + 内側 padding 32px / 影なし / Pull-quote block: 左 4px border + italic |
| hook | **inline citations [1] / [2]** (AppendixReferences 連動) / **margin notes** (sidebar marginalia) / **paragraph drop caps** (large initial letter) |

### 2.4 Family (warm domestic)

**anchor**: family.co / warm rounded cards + soft pastels

| 軸 | 仕様 |
|---|------|
| 色 | pastel `--surface: oklch(97% 0.04 60)` / `--primary: oklch(70% 0.17 25)` (coral) / `--accent: oklch(80% 0.13 165)` (soft mint) |
| タイポ | rounded sans-serif: **Plus Jakarta Sans** 400/600/700 / heading: 44/32/24/18 / body: 16/14 (1.7・余白多) |
| コンポーネント | Card: radius 24px (大) / `box-shadow: 0 4px 32px -8px rgba(0,0,0,0.06)` / Button: pill shape (radius 9999px) + soft fill |
| hook | **circular profile photos** (avatar grid) / **hand-drawn dividers** (wavy SVG) / **emoji-friendly headers** |

### 2.5 PostHog (analytics dashboard)

**anchor**: posthog.com / dense data viz + accent dot pattern

| 軸 | 仕様 |
|---|------|
| 色 | `--surface: white` + dark mode auto / `--primary: oklch(58% 0.20 25)` (PostHog orange) / `--accent: oklch(45% 0.18 280)` (deep purple chart) / chart palette 8 色 |
| タイポ | **Matter** + Inter fallback / heading: 48/36/28/22 / monospace data emphasized (large numbers in JetBrains Mono) |
| コンポーネント | Card: 8px radius + `border: 1px solid oklch(92% 0.005 285)` / KPI tiles with NumberTicker / Mini sparklines inline |
| hook | **dot pattern background** (radial-gradient 8px dot grid) / **inline mini-charts** (sparkline SVG within text) / **funnel drop-off visualizations** (stacked bar) |

### 2.6 Glean (search-first knowledge)

**anchor**: glean.com / clean enterprise search UX

| 軸 | 仕様 |
|---|------|
| 色 | `--surface: white` / `--primary: oklch(50% 0.16 250)` (deep azure) / `--accent: oklch(72% 0.13 220)` / minimal accent (search-first ≠ flashy) |
| タイポ | Geist Sans + Geist Mono / heading: 48/36/24/18 (compact) / body 15px (1.55) |
| コンポーネント | Card: 12px radius + subtle border `oklch(94% 0.005 250)` / Search-styled section headers (icon + label inline) |
| hook | **search bar as section heading** (visual metaphor) / **citation chips** (inline source badges) / **knowledge-graph node clusters** (small SVG diagrams) |

---

## 3. 実装場所 (paradigm-blocks)

```
paradigm-blocks/src/_themes/
├── tokens-base.json          # 共通 base (4px grid / spacing scale 等)
├── stripe/
│   ├── tokens.json           # OKLCH 色 + font + radius + shadow vars
│   ├── ThemeProvider.tsx     # CSS variable injection (admin DB tokens override)
│   ├── MeshGradientHero.tsx  # ブランド固有 hook component
│   └── Card.stripe.tsx       # variant override (3D tilt 等)
├── raycast/...
├── reflect/...
├── family/...
├── posthog/...
└── glean/...
```

**ThemeProvider 統合**: 既存 `aesop/ThemeProvider.tsx` は paradigmjpcom 全体の theme. `paradigm-blocks/_themes/<name>/ThemeProvider` は **report 単位の sub-theme**. report_templates.design_theme で選定された theme の ThemeProvider が `<BlocksReportRenderer>` の root に inject される.

---

## 4. テーマ → block の cascade パターン

各 block (TopPainsList / Prescription / Recommendation 等) は generic JSX を保ち、theme は CSS variables で渡す:

```tsx
// paradigm-blocks/src/blocks/Prescription.tsx (generic)
<div className="p-block-prescription bg-[var(--bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
```

- **Stripe**: `--radius-card: 12px`, `--shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 24px -8px rgba(99,91,255,0.08)`
- **Raycast**: `--radius-card: 8px`, `--shadow-card: none`, `--border-card: 1px solid rgba(255,255,255,0.08)`
- **Reflect**: `--radius-card: 16px`, `--shadow-card: none`, `--font-display: "Cormorant Garamond"`
- 等

theme 切替は CSS variable swap だけで成立する (DOM tree 不変). この設計が「同じ block JSON データで 6 通りの見え方」を可能にする.

---

## 5. 実装フェーズ分割 (commit 単位)

| Phase | 内容 | 工数 |
|-------|------|------|
| 7-C-1 | tokens-base.json + 6 theme tokens.json (色 + font + radius + shadow + spacing scale 完備) | 1d |
| 7-C-2 | 6 ThemeProvider.tsx (CSS var injection・admin DB tokens override) + report_templates.design_theme = `'stripe'` 等で挿入対象が決まるルーティング | 0.5d |
| 7-C-3 | Stripe flagship 細部実装 (MeshGradientHero / 3D-tilted Card / shimmer kbd / inline NumberTicker) — Figma quality 1 件 | 2d |
| 7-C-4 | Raycast / Reflect / Family / PostHog / Glean 各 brand hook component (1 hook/theme) | 3d (各 ~半日) |
| 7-C-5 | themes-showcase 24 セル grid 更新 (現 paradigm-blocks v0.3.0 既存) を 6 themes × 4 block で 24 セル比較表示・visual smoke test 化 | 0.5d |
| 7-C-6 | Dify `karteToReport` workflow に `design_theme` を input.user_payload に渡す + paradigmjpcom side で report_templates 由来の theme を inject | 0.5d |

**合計**: ~7.5 日. flagship Stripe 1 件で 2 日かける重み付けが Figma quality を担保する.

---

## 6. 壁打ち質問 (ユーザー承認必要事項)

1. 6 themes (raycast/stripe/reflect/family/posthog/glean) の選定で合意? もしくは追加候補 (linear / notion / vercel / arc / superhuman) を含めて 8 themes 化する?
2. flagship として **Stripe** 1 つに 2 日かける重み付けで OK? もしくは 6 themes 等配分 (~1日ずつ) で平均クオリティ重視?
3. 各 theme で「ブランド固有 hook」を **1 component 必須** とする方針で合意? (色変えだけスキンを禁止する物理ガード)
4. tokens.json は OKLCH (modern color) で記述 — fallback hex も併記する?
5. theme 切替は client-side CSS variable swap で完結 (server-side rendered HTML は同じ・style だけ変わる) で OK? もしくは server-side 完全分岐で Image preload 最適化を狙う?

---

## 7. 関連 spec / 依存

- 業種 × pitch_angle template matrix → `b36-p7b-template-matrix-spec.md` (本 spec の前段)
- BlocksReportRenderer 構造 → `paradigm-blocks/src/BlockRenderer.tsx`
- 現状 paradigm-blocks v1.0.1 の Karte 7 block は本 spec 未対応 (v1.1.0 で 6-theme 統合予定)
