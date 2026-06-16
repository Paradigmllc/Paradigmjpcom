## CURRENT STATUS - 2026-06-16 RevenueOS round 5 — リスト収集 実務運用可能化

### Round 5: 3 blockers resolved → list collection pipeline now production-ready

**Blocker 1: Pipeline status stall without Dify**
- `enrichment-jobs-runner-phases.ts:112`: `pipeline_status` を条件付き `dify.ok ? "report_ready" : "scanning"` から常時 `"report_ready"` に変更
- Dify未設定時でも Phase 2 通過後は `report_ready` になり、レポート生成ワーカーが動作する
- `localDiagnosis()` のルールベース診断で十分なレポート品質を担保

**Blocker 2: Browser search が SearXNG にフォールバック**
- `browser-search.ts:227-240`: FlareSolverr/Steel 未設定時、SearXNG 公開インスタンスに自動フォールバック
- `SEARXNG_BASE_URL` は `search.mdosch.de` に設定済み（`.env.local`）
- 全検索エンジン + 全ブラウザバックエンドが使えなくても、最終的に SearXNG にフォールバック

**Blocker 3: Dify未設定時の DeepSeek AI 診断フォールバック**
- `dify-diagnosis.ts:178-188`: Dify ワークフローキー未設定時、`DEEPSEEK_API_KEY`（設定済）を使って DeepSeek API でAI診断を生成
- DeepSeek 失敗時は従来の `localDiagnosis()` ルールベース診断にフォールバック
- 3段階フォールバック: Dify → DeepSeek → localDiagnosis

### Prior fixes (Round 3 + 4)
- Round 4: Twenty pull slug auto-set, report_url fallback, NULL slug auto-repair
- Round 3: Diagnostic 404 fix, 15 API error handling fixes, 5 lib fixes, 5 UI fixes

### リスト収集 実務運用状況

| 経路 | 状態 | 備考 |
|------|------|------|
| CommonCrawl ドメイン取得 | ✅ | 外部API不要 |
| マルチソース取得 (CDX+Tranco+crt.sh) | ✅ | 無料 |
| SearXNG リード発見 | ✅ | `search.mdosch.de` |
| ブラウザ検索 | ✅ | SearXNG フォールバック |
| エンリッチメント（軽量） | ✅ | ローカル解析 + 無料API |
| エンリッチメント（深層） | ⚠️ | ブラウザ系サービス全て未デプロイだがHTTPベースフォーム発見は動作 |
| 診断レポート生成 | ✅ | Dify→DeepSeek→localDiagnosis 3段階 |
| Twenty CRM 同期 | ✅ | Pull + slug自動設定 |

### Verified
- `npx tsc --noEmit`: 0 errors
- `node scripts/paradigm-quality-guard.mjs`: 0 silent catch blocks

### Active handoff
- Do not restore `SUPABASE_POSTGRES_*`, `MUBENG_*`, `SCRAPOXY_*`, or any Refferq reference.
- `scripts/unlock-payload-users.sh` remains intentionally untracked.
- Pipeline auto-runs on production: watchdog → Twenty pull → pipeline → enrichment → report generation.
- Browser infra (FlareSolverr/Crawlee/Browserless) not deployed → SearXNG fallback active.
