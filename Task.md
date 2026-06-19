## CURRENT STATUS - 2026-06-19 RevenueOS Twenty country/template routing repair

- Fixed Twenty -> Supabase intake so foreign ccTLDs such as `.co.za` infer the correct target country instead of falling back to `JP/ja`.
- Fixed `salesScopeFromCountry` so English-locale countries keep their own ISO target country (`ZA`, `CA`, etc.) instead of becoming `US`.
- Fixed company upsert to persist `report_locale`, `target_country`, and `template_variant` columns, not only `meta.routing`.
- Fixed Twenty writeback to send country/region/industry/source/status plus visible `Source Coverage` and `Data Sources` counts.
- CRM metadata normalization now pins important Twenty columns near the front: Name, Domain, country, Source Coverage, Data Sources, Data Status.
- Repair-routing now corrects already-bad foreign records that were saved as `JP/ja/website_diagnostic`.
- Verification: `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `npm test -- src/lib/sales/routing.test.ts src/lib/sales/locale-scope.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/source-coverage.test.ts`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 デモHP v2 納品品質 実装完了 🟢

### GitHub: c269889 (pushed to main)
### Astro build: ✅ GREEN (3.61s, 0 errors)

### 実装スコープ サマリー
| カテゴリ | ファイル数 | 状態 |
|---------|-----------|------|
| AstroWind 完全CSS + テーマシステム | 2 | ✅ |
| AstroWind Widgets (オリジナル15種) | 15 | ✅ |
| ScrewFast 完全復元 (enterprise) | 12 | ✅ |
| Astroship 復元 (startup) | 8 | ✅ |
| 固定ページ (会社概要/規約/特商法 etc) | 11 | ✅ |
| 動的ページ (blog/404/sitemap) | 3 | ✅ |
| ブログシステム | 2 routing pages | ✅ |
| 共有コンポーネント (Navbar/Footer/Breadcrumb/BaseLayout) | 4 | ✅ |
| パーソナライズエンジン (8業種×3テーマ) | 1 | ✅ |
| API エンドポイント (/api/demo-pages) | 1 | ✅ |
| Supabase マイグレーション (theme_demo_pages) | 1 | ✅ |
| DBテーブル定義 | 1 | ✅ |
| URL プロキシ (/d/[slug]) | 1 | ✅ |
| デモ生成リライター | 1 | ✅ |
| **合計** | **~165 files** | |

### ページ一覧 (全17ページ + sitemap)
1. `/[slug]` — 動的Widgetマウント（中核、フルページレイアウト）
2. `/about/[company]` — 会社概要（商号・所在地・代表者・資本金・JSON-LD Organization）
3. `/terms/[company]` — 利用規約（全15条、日英対応）
4. `/privacy/[company]` — プライバシーポリシー（11セクション、Cookie同意）
5. `/tokushoho/[company]` — 特商法表記（販売業者・返品・支払方法の全項目）
6. `/contact/[company]` — お問合せ（Web3Forms実送信 + バリデーション）
7. `/faq/[company]` — FAQ（検索 + カテゴリフィルタ + JSON-LD FAQPage）
8. `/services/[company]` — サービス（6カード + プロセスタイムライン）
9. `/pricing/[company]` — 料金（3ティア + 比較表 + Stripeリンク）
10. `/cases/[company]` — 実績（フィルタ可能ポートフォリオグリッド）
11. `/blog` — ブログ一覧（カテゴリフィルタ + ページネーション）
12. `/blog/[slug]` — ブログ記事（prose + 目次 + SNSシェア + JSON-LD Article）
13. `404` — カスタム404（CSSアニメーション + 検索 + リダイレクト）
14. `sitemap.xml` — 動的サイトマップ

### 3テーマ統合詳細
| テーマ | Widget数 | CSSシステム | 特徴 |
|--------|---------|-----------|------|
| **AstroWind** | 15 (Hero×3, Features×3, CTA, Pricing, FAQs, Stats, Steps×2, Testimonials, Contact, Brands) | Tailwind v4 @theme + @utility 完全注入 + color-mix() CSS変数ダークモード | エージェンシー/SaaS向けモダンデザイン |
| **ScrewFast** | 8 (Hero×2, Clients, Features×2, Pricing(gradient), Testimonials(12col), FAQ(accordion)) | OKLCHフルカラーパレット + Preline UI variants.css + anti-FOUC | 建設/物流/B2B向け重厚エンタープライズ |
| **Astroship** | 6 (Hero, Features, CTA, Pricing, Logos, ContactForm) | Bricolage Grotesque可変フォント + モノクローム + Web3Forms API | EC/クリエイター向けモダンスタートアップ |

### 魔改造の中核
- `[slug].astro` — 3テーマCSS条件付き注入 + StickyHeader + 4colFooter + ダークモード + IntersectionObserver
- `registry.astro` — 29 Widgetの静的インポート統合 + ThemeMetadata
- `personalize.ts` — 8業種×ja/en×テーマ自動選択 + サービス/FAQ/指標自動生成
- API: `POST /api/demo-pages/{slug}` (Dify用) / `GET` (Astro SSR用)
- Proxy: `/d/[slug]` → `ASTRO_DEMO_BASE_URL/demo/[slug]`

### 残タスク
- [ ] Coolifyにastro-demoサービス登録 + デプロイ (demo.paradigmjp.com)
- [ ] Supabase migration_058 本番OSS Supabaseに適用
- [ ] ASTRO_DEMO_BASE_URL env設定 (paradigm-hp)
- [ ] Difyワークフロー: Widget JSON生成プロンプト最適化
- [ ] Cloud Supabase 解約
## CURRENT STATUS - 2026-06-18 RevenueOS outreach quality gate

- Implemented shared outreach readiness gate for RevenueOS/Twenty/outreach worker.
- No diagnostic report URL now blocks outreach instead of falling back to `https://paradigmjp.com`.
- RevenueOS CRM tab now shows an operational queue: send-ready / review-required / blocked.
- Twenty company karte summary now includes `Outreach quality gate` and `Next action`.
- Verification: `npm test -- src/lib/sales/outreach/readiness.test.ts src/lib/sales/form-message.test.ts` and `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`.
## CURRENT STATUS - 2026-06-18 RevenueOS Twenty data collection GUI/retry

- Twenty Companies上でRevenueOS取得データを確認できるよう、`Data Status` / `Data Sources` / `Next Action` / `Last Error` をCRM表示順とTwenty metadata DB反映対象に追加。
- enrichment結果のsource名不一致を修正し、Wappalyzer/SSL Labs/form discovery/Cloudflare Radar/Mozilla Observatory/Stagehandなどの取得結果と失敗理由がmetaへ正しく残るようにした。
- source_qualityの失敗/timeoutをSource Coverageの`error`として可視化し、Twenty同期時に最終エラーも反映。
- Twentyからのpullは不正なreport/form URLを信用せず、低カバレッジ・古いデータ・source error・未生成artifactを検出したら既存リストでも再収集/診断レポート生成キューへ戻す。
- Verification: `npm test -- src/lib/sales/source-coverage.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/enrich.test.ts src/lib/sales/external-studio-sync.test.ts`; `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 RevenueOS production recovery

- Production RevenueOS deployed at `5fba242` and `/ja/admin/sales` returns HTTP 200.
- `/api/sales/health` is healthy for Supabase OSS, Payload DB pool, FlareSolverr, Dify, Trigger.dev, Crawl4AI, Stagehand, Steel, Crawlee worker, and Outreach worker.
- Coolify env routing repaired: Sales Supabase uses direct PostgREST compatibility, Crawl4AI/Steel use the live Docker service names.
- Twenty writeback verified on production: `synced=3`, `failed=0`, `rateLimited=false`, enforced limit `3`.
- Visual screenshot evidence verified on production: Figma screenshot saved to R2 through `outreach_worker`, and `sales_companies.meta.visual_evidence.screenshots.desktop` plus `visual_evidence` column were updated.
- Applied/repaired `sales_atomic_screenshot_append` on OSS Supabase and fixed the migration SQL so future restores keep the same behavior.
- Remaining non-blocking health note: optional envs for some paid/manual sources are still missing (`DIFY_DIAGNOSIS_API_KEY`, `DIFY_FORM_MESSAGE_API_KEY`, `NOTION_API_KEY`, `GBIZ_API_TOKEN`, `GOOGLE_PSI_API_KEY`, `HUNTER_API_KEY`). Core pipeline is green; those sources remain optional until keys are supplied.

## CURRENT STATUS - 2026-06-19 Astro demo production recovery

- `https://demo.paradigmjp.com/` restored through Traefik and returns HTTP 200.
- Fixed Astro compatibility routes for generated links:
  - `/demo/{slug}` and `/demo/{slug}/{section}` now redirect to the existing canonical demo/company section pages.
  - `/{lang}/{industry}/{appeal}` now redirects to `/demo?lang=...&industry=...&appeal=...`.
- Rebuilt and restarted the `astro-demo` production container with the new routes.
- Fixed the persistent Traefik file-provider service target for `astrodemo-svc` from `http://172.17.0.1:4321` to `http://astro-demo:4321`; backup saved on host as `/data/coolify/proxy/dynamic/paradigmjp.yml.bak-20260618T221703Z-astrodemo`.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - Container routing: 64/64 industry demo URLs returned 200 after redirects.
  - Public routing: 64/64 `https://demo.paradigmjp.com/{ja,en}/{industry}/{appeal}` URLs returned 200 after redirects.
  - Public sample routes passed: `/`, `/ja/accounting/brand`, `/en/restaurant/sales`, `/demo/astrowind-demo/services`.

## CURRENT STATUS - 2026-06-19 Astro demo visual CSS recovery

- Fixed `/demo` visual breakage caused by React-style `className` attributes in an Astro page. The public HTML now emits `class=` and `className=0`.
- Fixed `DemoLayout` theme variables so `--brand`, `--brand-dark`, and `--brand-light` render actual color values instead of `{accentColor}` literals.
- Added the missing dark page base (`bg-[#050510] text-white`) so white text and glass panels render correctly.
- Rebuilt and restarted the production `astro-demo` container.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - `https://demo.paradigmjp.com/demo`: HTTP 200.
  - Public HTML checks: `className=0`, `accentLiteral=0`, `--brand: #7c3aed`.
  - Chrome headless screenshot saved at `C:\Users\apple\AppData\Local\Temp\demo-paradigmjp-demo-fixed.png` and visually checked.
