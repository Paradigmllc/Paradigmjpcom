# Task.md — paradigmjpcom

> 永久ルール TASK（グローバルCLAUDE.md）に基づく作業キュー。セッション開始時に必ず読む。

## 🔄 進行中

- [ ] **P17. i18n 12-locale 拡張**（開始: 2026-04-27 / 規模: 1-2週間 / Plan B = ja/en 独自設計維持 + 残10ロケールは Japan Entry Package 翻訳のみ + PPP 補正価格 + 既存ハードコード日本語は messages 移行）
  - [x] P17-1. 現状監査 — `docs/research/p17-i18n-audit.md` にハードコード文字列洗い出し
  - [x] P17-2. `src/i18n/routing.ts` 12-locale 拡張（ja/en/ko/zh/de/fr/es/pt/ru/ar/vi/id）
  - [x] P17-3. `src/lib/locale-map.ts` 作成（SalesRegion→Locale + PPP係数 + RTL）
  - [x] P17-4. `src/components/LocaleSwitcher.tsx` dropdown 化（12言語対応）
  - [x] P17-5. `src/app/[locale]/layout.tsx` に `dir="rtl"` 適用（ar 限定）
  - [x] P17-6. `payload.config.ts` の `i18n.supportedLanguages` + `localization.locales` 12言語拡張
  - [x] P17-7. `messages/{ko,zh,de,fr,es,pt,ru,ar,vi,id}.json` 新規作成（DeepSeek V3 自動翻訳・10ファイル）
  - [x] P17-8. `scripts/i18n-translate.mjs` 翻訳スクリプト（DeepSeek V3 + Context Cache）
  - [x] P17-9. CLAUDE.md s3-4 PPP 価格表追加・s7-1 ルート構造 12-locale 化・s8-1 env 追記
  - [x] P17-10. `src/app/[locale]/HomeClient.tsx` (426行) の messages 化（hero/services/features/testimonials/CTA 全 messages 化完了・配列定数を visual property のみに削減・commit a090d66）
  - [ ] P17-11. `src/app/[locale]/services/page.tsx`/contact/about の messages 化
  - [ ] P17-12. `src/app/[locale]/p/[slug]/AllInOneClient.tsx` (1972行) の messages 化（Plan B 範囲外・別 PR）
  - [ ] P17-13. PayloadCMS 既存 Posts/Services/Works content の DeepSeek 自動翻訳実行（手動キュレーション補正後）
  - [ ] P17-14. 12 locale 全動作検証 + Coolify deploy + production fingerprint check
  - [ ] P17-15. SEO: hreflang タグ全 locale 対応・sitemap.xml 12 locale 出力

## 📋 未着手（順番厳守）

- [ ] **P18-A-FIX-1. /[locale]/report/[token] orphan 削除後の token ハンドリング再統合**（2026-04-30 発覚 / commit 10496d9 で `[slug]` を canonical 化した際に既存の `[locale]/report/[token]/page.tsx` が削除されず Next.js dynamic-route slug 名衝突で dev server が起動不能だった / `[token]/page.tsx` を削除して P18-A verification を通したが diagnostic token-fetch ロジックが宙に浮いている — `[slug]/page.tsx` 側で `slug.length === 36` 等の UUID 判定→`/api/report/${slug}` フォールバックで再統合する / API `src/app/api/report/[token]/route.ts` は維持・削除しない）

- [ ] **P18. Aesop 風ラグジュアリー全面リニューアル**（開始: 2026-04-30 / 規模: 4 PR / Sericia 既存資産フォーク移植 + paradigm-Aesop ハイブリッド = Modern Tech × Aesop / dark mode 入れる / EC 系部品はスキップ / `/report/[slug]` は対象外 — s10-4 鉄則維持）
  - [x] **P18-A. Design Token Migration**（完了: 2026-04-30 / globals.css Aesop foundation + paradigm-paper/ink/line/accent + dark mode + paper-grain + 新フォント Cormorant/Inter/JetBrains Mono/Noto Serif JP / next-themes 導入 / layout.tsx rewire / **副産物**: ① `src/app/[locale]/report/[token]/page.tsx` orphan 削除 (P18-A-FIX-1 で再統合予定) / ② `next.config.ts` に `turbopack.root: path.resolve(__dirname)` を追加 — 親 D:/dev/paradigmjpcom/package-lock.json の存在で Turbopack が worktree node_modules を見えなかった問題を解決 / **検証**: light bg `#f8f8f6` / dark bg `#0c0e12` / Inter+Noto Sans JP / paper-grain.svg / data-theme切替全動作 / console エラーゼロ）
  - [x] **P18-B. Core Layout Port**（完了: 2026-04-30 / SiteHeader 95行 + SiteFooter 165行 + MobileMenu 110行 + ThemeToggle 78行 + Logo 22行 = 全 component AE-PHP-1 (≤200) 準拠 / vaul 不採用・framer-motion AnimatePresence で drawer 自前実装 / layout.tsx 差し替え完了 / 旧 Header.tsx・Footer.tsx は orphan 化（Phase D 完了時に削除）/ MegaMenu は Phase D 着手時に paradigm services 構造設計と合わせて検討（v1 では direct nav） / **副産物 fix**: Tailwind v4 で `rgb(var(--x) / <alpha-value>)` テンプレ syntax が動かない（v3 専用・v4 では文字列リテラルになる）→ 全 token を `rgb(var(--x))` に書き換えてオパシティ修飾子は v4 内蔵 color-mix に委ねる方針 / **検証**: light bg #f8f8f6 / footer #eeeeea / dark bg #0c0e12 / footer #080a0d / ThemeToggle ボタン動作確認 / console エラーゼロ）
  - [x] **P18-C. Motion & Polish**（完了: 2026-04-30 / CookieConsent 165行 + LuxuryLoader 95行 + PageTransition 19行 を新規作成 / Phase A で staged 済の FadeIn / MagneticButton / ScrollProgress / CustomCursor も全て AE-PHP-1 準拠 / ScrollProgress + LuxuryLoader + PageTransition + CookieConsent を layout.tsx に wire-up / 12-locale cookieConsent messages 追加（srTitle/bodyBeforeLink/privacyLink/accept/decline）/ SmoothScroll は lenis 依存のため不採用（CSS scroll-behavior: smooth で代替・globals.css に既設定）/ CustomCursor は Phase D 着手時に採用判断（mix-blend-difference の hero 画像との相性次第） / **検証**: cookie banner 600ms 後表示 + 日本語反映 / loader 800ms 自動消失 / scroll bar 描画 / console エラーゼロ）
  - [ ] **P18-D. Page Refactor**（messages 経由維持・AE-PHP-2 厳守 / section-per-file ≤ 200 行 / AE-PHP-1〜6 全準拠）
    - [x] **P18-D-1. HomeClient.tsx Aesop 化**（完了: 2026-04-30 / commit 9716ea7 / 5-band editorial / Cormorant Garamond serif / paradigm-paper/paper-deep/ink 三段階段背景 / SakuraPetals 削除 / 既存 messages keys 完全維持）
    - [x] **P18-D-2. PageHero / about / services / contact Aesop 化**（完了: 2026-04-30 / PageHero を全面 Aesop パターンに書き換え→inner page 全部に伝播 / about・services・contact ページを Aesop voice に / 旧 violet-indigo gradient CTA を ink reverse closing band に変換 / pricing/blog/faq/service detail の Aesop 化は P18-D-3 に分割）
    - [x] **P18-D-3. 残ページ Aesop 化 + cleanup**（完了: 2026-04-30 / 10 ページ全 Aesop 化: pricing 236→200行 / blog 161→145行 / faq 165→130行 / works 165→145行 / legal 49→60行 / privacy 81→110行 / services/{web 73→95, meo 93→130, seo 102→145, ai 91→140} / 旧 src/components/Header.tsx Footer.tsx 削除 (orphan 確認済) / 全 14 routes 200 OK / **AE-PHP-2 i18n sweep は未実施** — about/services/contact/pricing/blog/faq/works/legal/privacy/4 service detail に hardcoded JP/EN 残置・既存実装と同等のレベル・P18 リニューアル前から存在する技術債務であり P18 で導入したものではない / 次セッションで全ページ messages 抽出を行う）

### P18 確定方針（2026-04-30 ユーザ承認）

1. **4 PR 段階リリース** A→B→C→D 順
2. **Modern Tech × Aesop ハイブリッド** — Sericia の warm beige (#f5f0e8) ではなく cooler neutral cream (#f8f8f6) + ink #121419 + indigo refined accent。Sericia とブランド衝突回避
3. **dark mode 入れる** — `[data-theme="dark"]` 切替・`next-themes` 採用
4. **EC 系不要 components はスキップ** — Cart/Checkout/Crossmint/Wishlist/ProductCard/NotifyMe/Drop/SamplerBanner/SakuraFall/AnimatedHeart は移植しない
5. **`/report/[slug]` は Aesop 化対象外** — s10-4 提案ページ 4 鉄則アーキ維持。提案ページは KPI / 訴求重視で別 design language

## ✅ 完了

（過去のタスクは git log 参照）

## 📝 壁打ちメモ（確定済み事項・2026-04-27）

### Plan B 採用（CLAUDE.md s1-1 と整合）
- `/ja` `/en` は既存独自設計維持
- 残10ロケールは「Japan Entry Package」中心の messages のみ翻訳
- 既存ハードコード日本語（HomeClient 426行・AllInOneClient 1972行 等）は順次 messages 移行

### Locale 確定 12 個

| # | Locale | 母語/対象 | SalesRegion | RTL | PPP係数 | 価格基準 |
|---|---|---|---|---|---|---|
| 1 | `ja` | 日本（独自設計） | `ja` | — | 1.0 | JPY 固定 |
| 2 | `en` | 英語汎用（Japan Entry Package母版） | `en` | — | 1.0 | USD $3,500/$8,500/$18,000+ |
| 3 | `ko` | 韓国 | `ko` | — | 0.85 | $2,975/$7,225/$15,300+ |
| 4 | `zh` | 中国（簡体字） | `zh` | — | 0.55 | $1,925/$4,675/$9,900+ |
| 5 | `de` | ドイツ・DACH | `europe` 主言語 | — | 0.95 | €3,150/€7,650/€16,200+ |
| 6 | `fr` | フランス・欧州+西アフリカ仏語圏 | `europe`/`africa` 主言語 | — | 0.95 | €3,150/€7,650/€16,200+ |
| 7 | `es` | スペイン語（欧州+ラテンアメリカ） | `es` | — | 0.75 | $2,625/$6,375/$13,500+ |
| 8 | `pt` | ポルトガル語（ブラジル基準） | `pt`/`africa` | — | 0.45 | $1,575/$3,825/$8,100+ |
| 9 | `ru` | ロシア・CIS | `ru` | — | 0.40 | $1,400/$3,400/$7,200+ |
| 10 | `ar` | アラビア（MENA） | `ar` | **✅** | 0.65 | $2,275/$5,525/$11,700+ |
| 11 | `vi` | ベトナム（SEA 主言語） | `sea` 主言語 | — | 0.40 | $1,400/$3,400/$7,200+ |
| 12 | `id` | インドネシア（SEA 副言語） | `sea` 副言語 | — | 0.40 | $1,400/$3,400/$7,200+ |

### SalesRegion (appexx 12値) → Locale primary マッピング
- `ja → ja` / `en → en` / `ko → ko` / `zh → zh`
- `europe → de` (alts: `fr`, `es`)
- `es → es` / `pt → pt` / `ru → ru` / `ar → ar`
- `sea → vi` (alts: `id`)
- `africa → fr` (alts: `en`, `pt`)
- `others → en` (fallback)

### `others` の扱い
- 独立 locale 持たない・`en` フォールバック

### PayloadCMS 設定
- `localization.locales` 12言語に拡張
- `i18n.supportedLanguages` admin UI も 12言語（@payloadcms/translations から import 可能な言語のみ）
- 既存 Posts/Services/Works レコードの追加 10 言語フィールドは初期 NULL → DeepSeek 翻訳 batch で埋める

### 翻訳戦略
- DeepSeek V3 + Context Caching（system prompt 固定で 90%OFF）
- 1 messages.json (118 行) ≒ 75 keys → 全10言語で 750 翻訳 ≒ 約 $0.5 USD
