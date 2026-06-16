## CURRENT STATUS - 2026-06-16 PayloadCMS DB Pooler 根治 + RevenueOS Round 5 リスト収集

### 2026-06-16: Pooler Session→Transaction モード切替 + DB 接続層全面硬化

**問題**: PayloadCMS 管理画面で `ECHECKOUTTIMEOUT: unable to check out connection from the pool after 15000ms in Session mode` が連続18回発生。

**根本原因**: Supabase Pooler が Session モード (port 5432) で稼働していた。Serverless Next.js の複数インスタンスが pool max=8 の接続を占有し、共有 Pooler の接続上限を枯渇。

**実施内容 (全層硬化)**:

| # | 変更 | ファイル | 効果 |
|---|------|---------|------|
| 1 | DATABASE_URI port 5432→6543 (Coolify) | Coolify env (i12am4vv) | Session→Transaction モード切替 |
| 2 | Pool config: 検索パス options, SSL rejectUnauthorized, timeout 30s→15s | payload.config.ts | Transaction モード互換 + 接続効率化 |
| 3 | URI 診断: モード検出, 警告表示, masked URL | src/lib/resolve-database-uri.ts | 障害検知・表示改善 |
| 4 | Circuit breaker: 5→3 retries, pool枯渇検出, metrics export | src/lib/payload-availability.ts | 再試行回数削減 (枯渇時は逆効果) |
| 5 | 新規: Pool monitor + health check | src/lib/db/pool-monitor.ts | TCP接続 + モード検証 |
| 6 | Health endpoint に PayloadCMS DB Pool 行追加 | src/app/api/sales/health/route.ts | ヘルスダッシュボード統合 |
| 7 | Admin 保護画面: プール枯渇診断 + URI 情報表示 | src/app/(payload)/admin/.../page.tsx | 管理画面で即時診断可能 |
| 8 | fix-schema ルート: pool error handler + application_name | src/app/api/sales/fix-schema/route.ts | プールエラー可視化 |
| 9 | ヘルスチェック改善: 両ポート (5432/6543) TCP テスト | scripts/supabase-health-check.mjs | プーラーモード自動判定 |

### Key config changes
- Coolify `DATABASE_URI`: port 5432 → 6543 (Transaction mode)
- `payload.config.ts` pool: `max: 4`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 15000`
- Transaction mode PgBouncer options: `search_path=paradigm`, `idle_in_transaction_session_timeout=30000`, `statement_timeout=30000`
- SSL: pooler 接続は `{ rejectUnauthorized: false }` (ホスト名不一致可能性対応)

### Prior fixes (Round 3-5)
- Round 5: 3 blockers resolved → list collection pipeline production-ready
- Round 4: Twenty pull slug auto-set, report_url fallback, NULL slug auto-repair
- Round 3: Diagnostic 404 fix, 15 API error handling fixes, 5 lib fixes, 5 UI fixes

### Verified
- `npx tsc --noEmit`: 0 errors
- `node scripts/paradigm-quality-guard.mjs`: 0 silent catch blocks

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- Pipeline auto-runs on production: watchdog → Twenty pull → pipeline → enrichment → report generation.
- Browser infra (FlareSolverr/Crawlee/Browserless) not deployed → SearXNG fallback active.
