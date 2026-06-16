## CURRENT STATUS - 2026-06-16 RevenueOS round 4 — Twenty→Report 404 root cause fix + resilience hardening

### Round 4: Twenty同期→診断レポート404根本原因修正

**Root Cause Analysis — 3つの独立した問題が重なっていた:**
1. ~~`fetchDiagnosticReport` フレッシュネスチェックが7日以内のレポートで `return null`~~ → Round 3で修正済み (`add9d47`)
2. **Twenty pull が既存企業の `slug` を更新していない** → 今回修正
3. **`findCompanyBySlug` が `report_url` でフォールバックしていない** → 今回修正

**Round 4 fixes:**

**Core: Twenty pull slug 設定 (404の根本原因)**
- `twenty-pull.ts:236-240`: SELECTに `slug, report_locale, target_country, template_variant` を追加（型安全性）
- `twenty-pull.ts:311-334`: 既存企業更新時にslugがNULLの場合、`buildCompanySlug` で生成・自動設定。`report_url` 未設定の場合も補完。`report_locale`/`target_country`/`template_variant` のNULLバックフィルも追加。

**Core: レポートページ lookup 耐障害性強化**
- `companies.ts:167-218`: `findCompanyBySlug` に第3フォールバック追加 — `report_url` LIKE `%/${slug}` 検索でslugカラムがNULLでも企業を見つけられる。ヒット時にslugを自動修復。

**Pipeline flow verified:**
- `sales-pipeline-watchdog.ts:84-85`: 60秒毎のウォッチドッグが `runTwentySyncTick` (Twenty→Supabase pull) + `runReportRegeneratorTick` (未生成レポート自動生成) を呼び出し。
- `enrichment-worker.ts:69-73`: `runTwentySyncTick` は `autoRunPipeline: true` + `dispatchPipeline: true` で pull → パイプライン走行。
- `sales-pipeline-execution.ts:211`: パイプラインが `enqueueCompanyEnrichment` を呼び出しエンリッチメントジョブを作成。
- `enrichment-worker.ts:36`: エンリッチメントワーカーが10秒毎にキューを消化。

### All prior fixes (Round 3)

**API Routeエラーハンドリング (15件)**
- Silent catch 7件 + try/catch欠落 6件 + .then/.catchパターン修正 1件 + response.ok未確認 1件

**Lib層 (5件)**
- `twenty-crm-metadata.ts`: 4箇所 silent catch修正
- `db-tables.ts`: migrationコメント誤記修正

**UI層 (5件)**
- `<a>`→`<Link>` 2件 + `aria-label` 1件 + `SalesDashboardShell` エラー/ローディング状態

**DB (1件)**
- `migration_045`: ヘッダコメント修正

### Verified
- `npx tsc --noEmit`: 0 errors
- `node scripts/paradigm-quality-guard.mjs`: 0 errors, 0 silent catch blocks, 57 pre-existing warnings

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- `scripts/unlock-payload-users.sh` remains intentionally untracked.
- TwentyCMS is an alias (`twenty_cms_alias`) in integration-defs, not a separate service. Production CRM is Twenty OSS.
- Pipeline auto-runs on production: watchdog → Twenty pull → pipeline → enrichment → report generation.
- Next: real workload runs (form outreach dry-run, Twenty sync bulk, lead candidate multi-source).
