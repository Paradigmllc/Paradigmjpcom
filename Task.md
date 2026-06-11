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
