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
  - [ ] P17-10. `src/app/[locale]/HomeClient.tsx` (426行) の messages 化（hero/services/CTA抽出）
  - [ ] P17-11. `src/app/[locale]/services/page.tsx`/contact/about の messages 化
  - [ ] P17-12. `src/app/[locale]/p/[slug]/AllInOneClient.tsx` (1972行) の messages 化（Plan B 範囲外・別 PR）
  - [ ] P17-13. PayloadCMS 既存 Posts/Services/Works content の DeepSeek 自動翻訳実行（手動キュレーション補正後）
  - [ ] P17-14. 12 locale 全動作検証 + Coolify deploy + production fingerprint check
  - [ ] P17-15. SEO: hreflang タグ全 locale 対応・sitemap.xml 12 locale 出力

## 📋 未着手（順番厳守）

（なし — P17 完遂後に追加）

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
