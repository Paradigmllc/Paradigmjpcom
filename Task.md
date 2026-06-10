## ACTIVE HANDOFF — 2026-06-10 全面実運用監査 → 全修正完了

### 監査サマリー
| 重大度 | 件数 | 状態 |
|--------|------|------|
| 🔴 即時 | 5 | ✅ 全修正完了 |
| 🟠 今週中 | 6 | ✅ 全修正完了 |
| 🟡 今月中 | 7 | ✅ 全修正完了 |
| 🔵 長期 | 最後に列挙 | 📋 計画待ち |

### 修正ファイル一覧 (全30+ファイル / tsc 0エラー)

| # | 分類 | ファイル | 内容 |
|---|------|---------|------|
| 1 | 🔴 | `docker-compose.oss-ai-services.yml` | DeepSeekキーenv化, Morphic検索API修正, SEARXNG_SECRET env化, Skyvern DB pw env化, 全サービスにリソース制限 |
| 2 | 🔴 | `docker-compose.oss-osint.yml` | SEARXNG_SECRET env化 |
| 3 | 🔴 | `docker/hyperframes-compose.yml` | HYPERFRAMES_API_KEY env化, バージョン固定 |
| 4 | 🔴 | `docker-compose.hf-renderer.yml` | 起動時再インストール廃止, ヘルスチェック curl化, リソース制限 |
| 5 | 🔴 | `docker-compose.trigger-oss.yml` | POSTGRES_PASSWORD/CLICKHOUSE_PASSWORD 危険デフォルト `:?`必須化 |
| 6 | 🔴 | `Dockerfile` | node 24→22.12.0, PAYLOAD_READS typo修正, npm ci化 |
| 7 | 🔴 | `payload.config.ts` | fallback-secret廃止→未設定時起動拒否 |
| 8 | 🔴 | `src/app/api/admin/route.ts` | ハードコードパスワード除去, 全list系`.limit(500)`, reorder_faqs N+1→一括upsert |
| 9 | 🔴 | `src/lib/sales/enrich.ts` | 36並列Promise.all→batchAll(8並列concurrency制御) |
| 10 | 🔴 | `src/lib/sales/companies.ts` | batchFindExistingByDomains追加 |
| 11 | 🔴 | `src/lib/sales/sources/spiderfoot-source.ts` | 空catch 5件→console.warn |
| 12 | 🔴 | `src/lib/sales/sources/maigret-source.ts` | 空catch 5件→console.warn |
| 13 | 🔴 | `src/lib/sales/sources/katana-source.ts` | 空catch 5件→console.warn |
| 14 | 🔴 | `src/hooks/auditLog.ts` | safeDiff空catch→console.warn |
| 15 | 🔴 | `src/lib/sales/error-monitor.ts` | ensureTable空catch→console.error, flush空catch→process.stderr.write |
| 16 | 🟠 | `src/app/api/sales/import-csv/route.ts` | N+1→batchFindExistingByDomains一括先読み |
| 17 | 🟠 | `src/app/api/sales/lead-discovery/route.ts` | N+1→batchFindExistingByDomains一括先読み |
| 18 | 🟠 | `src/app/api/sales/sync-companies-from-notion/route.ts` | N+1→batchFindExistingByDomains一括先読み |
| 19 | 🟠 | `src/app/api/sales/weekly-digest/route.ts` | 無制限select→`.limit(5000)` |
| 20 | 🟠 | `src/lib/sales/enrichment-jobs.ts` | TRIGGER_API_URL localhost fallback除去 |
| 21 | 🟠 | `src/lib/sales/oss-health-infra.ts` | TRIGGER_API_URL localhost fallback除去 |
| 22 | 🟠 | `src/app/api/sales/health/route.ts` | TRIGGER_API_URL localhost fallback除去 |
| 23 | 🟠 | `src/lib/sales/video-trigger.ts` | TRIGGER_API_URL localhost fallback除去 |
| 24 | 🟠 | `src/lib/sales/sales-pipeline-helpers.ts` | TRIGGER_API_URL localhost fallback除去 |
| 25 | 🟠 | `src/lib/sales/post-outreach-webhooks.ts` | TRIGGER_API_URL localhost fallback除去 |
| 26 | 🟡 | `src/lib/sales/diagnostic/` (新規3ファイル) | diagnostic.ts 548→140行 + types.ts + constants.ts + checks.ts |
| 27 | 🟡 | `src/components/diagnostic/report-website-sections.tsx` | `<img>`→next/Image (screenshots) |
| 28 | 🟡 | `src/components/ui/` (13ファイル) | `import * as React`→named imports |
| 29 | 🟡 | `src/lib/sales/comfyui-workflows.ts` | JSON.parse→try/catch |
| 30 | 🟡 | `src/lib/sales/twenty-crm-metadata.ts` | JSON.parse→try/catch |
| 31 | 🟡 | `scripts/render-all-demo-videos.mjs` | R2キーenv化 |
| 32 | 🟡 | `scripts/verify-pipeline.mjs` | webhookシークレットenv化 |
| 33 | 🟡 | `scripts/lib/coolify-env.mjs` | Coolify URL/UUID env化 |
| 34 | 🟡 | `scripts/check-dns.mjs` | CF Zone ID env化 |
| 35 | 🟡 | `scripts/notion-*.mjs` (15ファイル) | Notion APIキーenv化 |
| 36 | 🟡 | `scripts/seed-global-templates.mjs` | Notion APIキーenv化 |

### 残る長期課題 (インフラ設計が必要)
- 🔵 CI/CD pipeline不在 (`.github/workflows/` 未作成)
- 🔵 DB自動バックアップ不在 (全PostgreSQL)
- 🔵 Docker Composeネットワーク分断 (4つに分離)
- 🔵 OSINTサービス Runtimeインストール (Dockerfile化すべき)
- 🔵 通知のベルUI未実装 (DBに書き込むのみ)
- 🔵 コードスプリッティング未導入 (全dashboard bundle一体)

### 2026-06-10 Visual Evidence Upgrade
- Added `src/lib/sales/visual-evidence.ts` to capture target-site desktop/mobile screenshots with Browserless first and local Playwright fallback, then store URLs in R2-backed `sales_companies.meta.visual_evidence.screenshots`.
- `/api/sales/screenshot` now uses the shared visual evidence path and returns provider + viewport.
- Sales pipeline `report_generate` now attempts desktop/mobile screenshot evidence before creating the diagnostic report and records readiness/errors in step output.
- Report hero and HyperFrames report video now use `screenshot_url` / `screenshot_mobile_url` when available, so customer-facing assets begin with actual target-site evidence instead of generic visuals.
- Verification: `npx tsc --noEmit` passed; `git diff --check` passed. Remaining risk: local Playwright fallback requires browser binaries on the runtime host; Browserless/R2 env must be configured for production capture.
- Additional visual check: local Webpack dev server on `http://localhost:3032` returned 200 for `/en/report/demo/video_subscription`; H1 rendered, HyperFrames player detected, and Playwright reported no page errors. Demo data has no screenshot URL, so screenshot hero path remains data-dependent.

### 2026-06-10 Visual Evidence P2 Variant Screenshots
- Extended `src/lib/sales/visual-evidence.ts` from desktop/mobile screenshots to typed evidence slots: `social`, `map`, `form`, and `variant`.
- `ensureCompanyVisualEvidence()` now derives a variant-specific external capture target from existing company meta:
  - `video_subscription`: Instagram/TikTok/YouTube profile URLs when present.
  - `meo`: Google Maps URL from meta, with Google Maps search fallback from company name / prefecture / domain.
  - `outreach`: contact form URL from existing form-discovery/contact meta.
- Variant screenshots are stored in `sales_companies.meta.visual_evidence.screenshots.<slot>` without polluting the legacy desktop `meta.screenshot_url`.
- Diagnostic report data now exposes `evidence_screenshot_url` / `evidence_screenshot_kind`; report Hero, screenshot section, asset JSON, and HyperFrames video prefer that variant evidence image when present.
- Verification: `npx tsc --noEmit` passed; `git diff --check` passed; `npm run context:audit` passed. Remaining risk: variant screenshots depend on usable external URLs in company meta, and some social/map pages may block remote browsers.

### 2026-06-10 コンテンツ充実化作業 (Round 1)
- **seed-pricing** API ルート新規作成 — Payload `pricing` collection に web/meo/seo/ai 各3プラン（計12件）を JA+EN でシード
- **seed-faqs** API ルート新規作成 — Payload `faqs` に JA+EN 各18問をシード（Lexical richText 形式）
- **seed-posts** API ルート新規作成 — Payload `posts` に追加5記事を JA+EN でシード（既存4件と合わせて9件）
- **Webサービス詳細** (`/services/web`) に ProcessBand (4step) 追加、i18n 完全対応
- **価格ページ** (`/pricing`) に料金FAQセクション（6問アコーディオン）追加
- 12ロケールすべてに新規 i18n キー反映（`scripts/patch-locale-messages.mjs`）

### 2026-06-10 コンテンツ充実化作業 (Round 3 — サイトマップ + SEOスキーマ + ブログフォールバック)
- **サイトマップ**: `/video`, `/works`, `/agency`, `/pricing` を STATIC_ROUTES に追加
- **JSON-LD 構造化データ**: 10ページに追加
  - `/pricing`: Service schema
  - `/blog`: Article schema
  - `/works`: Article schema
  - `/about`: Article schema
  - `/contact`: Article schema
  - `/video`: Service schema
  - `/agency`: Service schema
  - `/lp/web`, `/lp/meo`, `/lp/seo`, `/lp/ai`: Service schema
- **/blog/[slug]**: 空コンテンツ時に `emptyContent` フォールバックメッセージ表示
- **10ロケール**: lpMeo/lpSeo/lpAi process+plans キー、worksPage.process キー、blogPostPage.emptyContent キーを全追加

### Verification
- `npx tsc --noEmit`: 既存エラー2件（autoTranslate.ts, error-monitor.ts — 当作業範囲外）
- 修正ファイル累計: 40+（page 15, i18n 22, API route 3, sitemap 1）
- 新規ファイル累計: 6（seed 3, patch script 1, schema script 2）
- **/agency ページ**: JP ハードコード → i18n 完全移行 (`getTranslations("agencyPage")`)。プラン・比較表・FAQ・CTAすべて messages 経由に
- **LP 3ページ充実化**:
  - `/lp/seo`: プロセス (3step) + 料金プラン (3ティア) セクション追加
  - `/lp/meo`: プロセス (3step) + 料金プラン (3ティア) セクション追加
  - `/lp/ai`: プロセス (4step) + 料金プラン (3ティア) セクション追加
- **/works ページ**: プロジェクト進行フロー (3step) セクション追加
- **data.ts 12言語化**: 見送り（現行 Plan B 設計通り、非JA/ENは ja fallback で動作）

### Verification
- `npx tsc --noEmit`: 0エラー（Round 1, 2 ともに）
- `git diff --check`: CRLF警告のみ（Windows環境のため想定内）
- 修正ファイル: 20+ (messages 12ロケール + page 5ファイル + API route 3ファイル)
- 新規ファイル: 4 (seed-pricing, seed-faqs, seed-posts, patch-locale-messages.mjs)
- Added diagnostic visual story payload fields: `visual_annotations`, `improvement_preview`, and `visitor_journey`.
- Added `src/lib/sales/diagnostic/visual-story.ts` to derive red-line annotations, before/after preview copy, and a 30-second visitor path from report acts, source coverage, template variant, and optional stored `meta.visual_evidence.annotations`.
- Report Hero now overlays red audit pins on the captured evidence image; `ReportVisualEvidenceShowcase` adds a full evidence section with annotated screenshot, before/after preview, and visitor path replay.
- Demo reports now include a demo screenshot URL via free WordPress mShots so the visual evidence experience is visible in `/report/demo/*` without waiting for a live R2 capture.
- HyperFrames report video now shows audit pins on the screenshot, an after-state preview panel, and animated route steps. Split video theme constants into `src/lib/sales/video-template-theme.ts` and kept `video-templates.ts` under 500 lines.
- Fixed the Three.js background layer selector in `src/lib/sales/video-template-three.ts` (`#three-layer`) so the video page no longer logs the null canvas width error.
- Verification: `npx tsc --noEmit` passed; `git diff --check` passed. Local visual smoke on `http://localhost:3033/en/report/demo/video_subscription` returned 200 and detected Hero pins, Visual Evidence, After-state preview, visitor path, and the video player. Video route `http://localhost:3033/en/report/demo-video_subscription/video?autoplay=1` returned 200 with 3 audit pins, preview panel, 4 route steps, visible hero text, and no page errors.

### 2026-06-10 All Variant Visual Evidence + Web Production Rename
- Extended the visual story copy to all 8 report variants: `website_diagnostic`, `meo`, `security`, `japan_entry`, `video_subscription`, `subsidy`, `outreach`, and `dx_ai_package`.
- Promoted `dx_ai_package` into the canonical `TEMPLATE_VARIANTS` list in both `types.ts` and `routing.ts`, changed `automation_dx` content-template matching from `outreach` to `dx_ai_package`, and added `supabase/migration_043_sales_dx_ai_template_variant.sql` to update DB CHECK constraints.
- Template preview now covers 8 variants x 2 languages x 8 industries = 128 base patterns, including DX/AI.
- Renamed the website report label to `Web制作診断` and aligned English website labels to "Website production" across report offer copy, demo data, preview UI, dashboard cards, layout labels, and tests.
- Verification: `npx tsc --noEmit` passed; `npx vitest run src/components/diagnostic/report-copy.test.ts` passed from `D:\dev\paradigmjpcom`; `git diff --check` passed; BOM check passed for edited UTF-8 files. Local smoke on `http://localhost:3034/{ja,en}/report/demo/{variant}` returned 200 for all 16 pages, with Hero pins and Visual Evidence present on every variant and no page errors.

### 2026-06-10 Mobile Diagnostic Video Optimization
- Added a mobile portrait video format for report video HTML: `?mobile=1` now renders a 1080x1920 composition with larger typography, one-column scenes, taller screenshot evidence, and mobile-safe proof/demo panels.
- Updated the report video player to render a CSS-responsive mobile iframe (`sm:hidden`) from the initial HTML, so mobile does not depend on React hydration timing to switch from the desktop 16:9 video.
- Added `migration_043_sales_dx_ai_template_variant.sql` to the no-login deploy migration path and aligned the `jp_dx_package` product seed to `dx_ai_package`.
- Verification: `npx tsc --noEmit`, `git diff --check`, and `npx vitest run src/components/diagnostic/report-copy.test.ts` passed. Local Playwright mobile smoke on port 3035 confirmed direct video route `data-width=1080`, `data-height=1920`, `.is-portrait`, no page errors; embedded report video selected `/video?mobile=1&autoplay=1` with visible 348x619 iframe ratio 1.78 and no page errors.
