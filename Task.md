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
