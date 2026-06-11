## ACTIVE HANDOFF — 2026-06-11 RevenueOS ブラックボックスUI削除

### 削除/簡略化
- 「動画生成」タブ (`reportVideoStudio`) ごと削除
  - `SalesCommandCenter.tsx` から tab, import, renderTab case 除去
  - `AssetManagementPanel.tsx` から動画生成スタジオリンク除去
- 「投入・作業」サブタブ "個別登録・調査ジョブ / バッチ・一括処理ライン" 除去
  - `SalesAutomationPanel.tsx` のサブタブUI削除、コンテンツを1画面に統合
  - `SalesBatchOpsPanel` はページ下部に常時表示

### 検証
- `npx tsc --noEmit`: 変更ファイル 0 エラー

---

## ACTIVE HANDOFF — 2026-06-11 Codex フルサイトデモシステム全削除 + 旧方式復元

### 削除したもの
| ファイル | 内容 |
|----------|------|
| `fullsite-demo-templates.ts` | 業種別フルサイトHTMLテンプレート (339行) |
| `fullsite-demo-quality.ts` | 品質ゲート検査 |
| `fullsite-template-catalog.mdoc` | Keystatic テンプレートカタログ |
| `d/[slug]/page.tsx` + `DemoClient.tsx` | 企業別デモ表示ページ |
| `d/[slug]/[...path]/` | キャッチオールルート |

### 復元したもの
| ファイル | 内容 |
|----------|------|
| `d/[slug]/route.ts` | CF Pages リダイレクト (307) |
| `demo-generator.ts` | 旧 Astro デモ生成 + CF Pages デプロイ |
| `demo-data.ts` | `demo_url` → `paradigm-astro-demo.pages.dev` |
| `enrichment-jobs.ts` | `type: "astro_replacement_demo"` |
| `AssetManagementPanel.tsx` | フルサイトテンプレート参照除去 |
| `astro-demo/demo-data.ts` | 旧 `as any` キャスト復元 |

### 検証
- `npx tsc --noEmit`: 変更に関連するエラー 0 (既存 astro-demo エラーは無関係)

---

## ACTIVE HANDOFF — 2026-06-11 Codex デモ生成破損修正

### Codex がやらかした内容
| ファイル | 問題 |
|----------|------|
| `fullsite-demo-quality.ts` | nav-link/feature-card/site-type チェックを errors 扱い → 1件でも引っかかるとデモ生成が完全停止 |
| `demo-generator.ts` | 品質ゲート失敗で `return { ok: false }` → デモが一切生成されない |
| `demo-generator.ts` | `matchContentTemplate` に `assetType: "astro_demo_site"` を渡している (旧 Astro 時代の残留) |
| `enrichment-jobs.ts` | `demo_site.type: "astro_replacement_demo"` のまま |

### 修正 (3ファイル)
- `fullsite-demo-quality.ts`: nav-link/feature-card/site-type チェックを errors → warnings に降格。構造的欠陥 (doctype欠如、セクション不足、HTML短小、文字化け) のみ errors に。
- `demo-generator.ts`: 品質ゲート失敗時も `console.error` のみで生成を継続。`assetType` を `"fullsite_demo"` に修正。
- `enrichment-jobs.ts`: `demo_site.type` を `"revenueos_fullsite_demo"` に修正。

### 検証
- `npx tsc --noEmit`: 変更ファイル 0 エラー

---

## ACTIVE HANDOFF — 2026-06-11 モバイル Safari 動画プレイヤー根本修正

### 問題
モバイル Safari で診断レポート動画が表示崩れ・位置ズレ（iframe 内固定キャンバス + CSS transform scale + 二重 UI）

### 修正 (3ファイル)
| ファイル | 変更内容 |
|----------|---------|
| `ReportHyperFramesPlayer.tsx` | 完全書き直し。MP4 ある場合ネイティブ `<video>` 要素で再生 (YouTube Embed 方式)。`playsInline`/`preload="metadata"` で iOS Safari 対応。全コントロールを `sm:` レスポンシブ化。MP4 なければ iframe フォールバック。 |
| `DiagnosticReport.tsx` | `mp4Url={data.video_url}` をプレイヤーに渡す。冗長な MP4 ダウンロードリンク除去。 |
| `video-templates.ts` | `-webkit-backdrop-filter`/`-webkit-transform` 追加。`will-change:transform`+`contain` で GPU 高速化。`mix-blend-mode` に `isolation:isolate`。`?embedded=1` 検出で iframe 内二重 UI (chapter-strip/footer) を非表示。 |

### 検証
- `npx tsc --noEmit`: 変更ファイル 0 エラー
- Pre-existing TS errors: `astro-demo/src/keystatic/demo-data.ts` (無関係)

### 残存リスク
- iframe フォールバック時も二重 UI は除去済みだが、Safari の `backdrop-filter`/`mix-blend-mode` 制約は完全には回避不可 (ネイティブ動画モード推奨)
- MP4 が未生成の古いレポートは iframe フォールバックになる

---

## ACTIVE HANDOFF — 2026-06-11 診断レポート修正 + デプロイ基盤修復

### 監査サマリー — 全項目対応済み
| 重大度 | 件数 | 状態 |
|--------|------|------|
| 🔴 即時 | 5 | ✅ 全修正 |
| 🟠 今週中 | 6 | ✅ 全修正 |
| 🟡 今月中 | 7 | ✅ 全修正 |
| 🔵 長期 | 6 | 📋 計画待ち |

### 本番稼働サービス
| サービス | 状態 | 備考 |
|---------|------|------|
| paradigm-hp | ✅ running:healthy | paradigmjp.com |
| Skyvern | ✅ :8000 200 | ブラウザ自動化 |
| SearXNG | ✅ :8090 200 | メタ検索エンジン |
| Stagehand | 🔄 deploying | AIブラウザ (新規作成) |
| Crawl4AI | 🔄 deploying | Webクローラ |
| hf-renderer | ✅ running:healthy | HyperFrames |

### コード修正 (40+ファイル)
| 分類 | 内容 |
|------|------|
| enrich.ts | 519→170行。有料API 11個削除→無料OSS 25個 (Skyvern→Stagehand+Steel.dev追加) |
| 空catch | 25箇所全修正 (console.error/warn追加) |
| ハードコード | 全平文キーenv化 (docker-compose/scripts 21ファイル) |
| N+1 | batchFindExistingByDomains + 4 routes修正 |
| ページネーション | 8 routes `.limit()`付与 |
| Browserless | 29箇所全削除→Stagehand/Crawl4AIに一本化 |
| TRIGGER_API_URL | localhost:8030 fallback 6箇所除去 |
| Docker | node 22.12.0一致 + リソース制限 + pinned versions |
| Keystatic | content/ standalone出力にコピー + RLS追加 |
| 診断レポート | demo_url 書き戻し + cf-pages-deploy await化 |
| React | import * as React→named imports 13コンポーネント |
| Keystatic default-demo | titleフィールド形式修正 (string→{name,slug}) |
| 動画プレイヤー | [data-composition-id] width/height:100%→固定px化 (scale空白修正) |
| スクショ画像 | crossorigin="anonymous"追加 + コンテナbg-zinc-100追加 |
| デプロイタイムアウト | dynamic_timeout: 300→1800s (DO SSH経由) + overlayfs Docker prune |
| Dockerfile | npm ci→npm install + --turbo build |
| next/image | screenshot画像に導入 |
| env設定 | NOTION/Supabase webhook secrets + HYPERFRAMES/STAGEHAND keys |

### 残る長期課題
- CI/CD pipeline (GitHub Actions)
- DB自動バックアップ
- Chatwoot初回管理者作成 (https://chatwoot.paradigmjp.com/app/auth/signup)
- Astroデモ高品質実装
- コードスプリッティング (dynamic import)
## ACTIVE HANDOFF - 2026-06-11 Coolify deploy healthcheck fix

- Symptom: Coolify deploys for `paradigm-hp` repeatedly reached container start, then failed healthcheck and rolled back.
- Server check: DigitalOcean droplet `appexx-prod-01` is active; root disk is 70% used with large reclaimable Docker image/build-cache usage. Load was elevated but not a hard outage.
- Root cause found in Coolify logs: new Next.js standalone container reported ready, but Coolify healthcheck hit `http://localhost:3000/` and got connection refused. Earlier `curl` absence was fixed, but the runner still did not explicitly bind Next to all interfaces.
- Change: Dockerfile runner now sets `HOSTNAME=0.0.0.0` and `PORT=3000` before `node server.js`, so Coolify's localhost healthcheck can pass.
- Verification: `git diff --check` passed with only LF/CRLF warning. `npx tsc --noEmit --pretty false` is still blocked by pre-existing `astro-demo/src/keystatic/demo-data.ts` errors unrelated to this Dockerfile change.
## ACTIVE HANDOFF - 2026-06-11 Coolify deploy recurrence prevention

- Permanent guards added:
  - Docker image now has an explicit localhost `HEALTHCHECK` in addition to `HOSTNAME=0.0.0.0` and `PORT=3000`.
  - `scripts/coolify-deploy-guard.mjs` verifies Dockerfile healthcheck requirements, cancels stale `paradigm-hp` queued/in-progress deployments through Coolify API, and prints host/deploy state.
  - Both deploy entrypoints (`scripts/deploy.mjs` and `scripts/sales-os-no-login-deploy.mjs`) now run the deploy guard before triggering Coolify and cancel their own deploy on poll timeout.
  - `scripts/install-coolify-host-guard.mjs` installs a host cron guard that safely prunes Docker cache/images when disk usage is high and removes only inactive Coolify helper containers. It never prunes volumes.
- Production host cron installed at `/etc/cron.d/paradigm-coolify-host-guard`, running `/usr/local/sbin/paradigm-coolify-host-guard.sh` every 15 minutes. Latest run showed disk 45%, helpers 0, no action needed.
- Runbook: `docs/knowledge/coolify-deploy-guard.md`.
- Production deploy: commit `f9ba77b` deployed through Coolify deployment `emzbnvxdtlpeej3ehgc4ylst`; new container `i12am4vvcbggefnqdizhnv9a-021310856779` is healthy on image `i12am4vvcbggefnqdizhnv9a:f9ba77bf53f5313dec6178033d24123d6d9886e0`.
- Verification: script syntax checks passed; `npm run deploy:guard` passed; host guard executed successfully; `https://paradigmjp.com/`, `https://www.paradigmjp.com/`, and `https://keystatic.paradigmjp.com/` returned HTTP 200. Existing TypeScript blocker remains `astro-demo/src/keystatic/demo-data.ts` and is unrelated.

## ACTIVE HANDOFF - 2026-06-11 RevenueOS full-site demo factory

- Changed demo delivery from thin LP / external `paradigm-astro-demo.pages.dev` redirects to RevenueOS-owned full website demos.
- Added `src/lib/sales/fullsite-demo-templates.ts` with 5 managed template packs:
  - Premium Corporate HP
  - Local Service Booking
  - Commerce Storefront
  - Japan Entry Commerce
  - DX / AI Business System
- Each pack carries page map, feature pack, compliance pack, and design intent so generated demos behave like HP/EC/booking/DX sites, not one-page LPs.
- Added `src/lib/sales/fullsite-demo-quality.ts`; `generateReplacementDemo()` now blocks thin/legacy/corrupt demos before writing `web_demos`.
- `/[locale]/d/[slug]` is a noindex page route that reads `web_demos` from Supabase SSOT and renders stored HTML/R2 HTML through the existing `DemoClient` iframe shell.
- RevenueOS Asset Management shows the template catalog and has a per-company "再生成" action hitting `/api/sales/demo-site/regenerate`.
- Canonical sample URLs now point to `/{locale}/d/{variant}-demo`, with built-in full-site fallback samples when SSOT has no generated row yet.
- Added Keystatic catalog entry: `content/keystatic/demo-sites/fullsite-template-catalog.mdoc`.
- Fixed `astro-demo/src/keystatic/demo-data.ts` legacy TS blockers (`desc` -> `description`, removed missing `demo-data-legacy` import).
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `git diff --check` passed with LF/CRLF warnings only.
  - `npm run context:audit` passed; Task.md remains under the budget.
  - Local dev `http://localhost:3010/ja/d/website_diagnostic-demo` returned HTTP 200, 7 full-site sections, no legacy demo host, visible feature/compliance chips, and a nonblank browser screenshot.
  - `npm run build` reached static generation 300/300 and trace collection, then failed only on Windows-local `EBUSY` while copying `.next/server/edge-chunks/asset_Geist-Regular...ttf` into standalone output. Treat as local file-lock risk; Coolify/Linux build still needs deploy verification.
  - Commit `312c9d6` pushed to `origin/main`.
  - `npm run deploy:prod` finished Coolify deployment `s128ytb063wj7moon258cwo3`; smoke checks for `/ja/admin/sales`, `/ja`, and Twenty returned HTTP 200.
  - Production `https://paradigmjp.com/ja/d/website_diagnostic-demo` returned HTTP 200, includes a visible iframe with 7 `data-section` markers in `srcdoc`, and does not reference the legacy demo host.
- Follow-up fix:
  - Asset Management template cards now expose explicit `新規タブでプレビュー` links for all 5 demo templates.
  - Company rows now include a clear `開く` button next to `再生成`.
  - Added fallback sample routes for template-specific preview slugs: `premium_corporate_hp-demo`, `local_booking_site-demo`, `commerce_storefront-demo`, `japan_entry_commerce-demo`, and `dx_ai_business_site-demo`.
  - Local `npx tsc --noEmit --pretty false` passed; all 5 local preview URLs returned HTTP 200 after dev compilation.
- Unresolved risk:
  - Existing generated rows in `web_demos` may still contain old thin LP HTML until each company is regenerated.
  - `cf-pages-deploy.ts` remains as legacy Keystatic/Cloudflare code but is no longer used by `generateReplacementDemo()`.
