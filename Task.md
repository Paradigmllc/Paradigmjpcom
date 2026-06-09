# Task.md

## CODEX UPDATE - 2026-06-10 コード品質監査 + バグ修正 + OSS健全性

### 孤児ファイル削除 (DONE)
- DiagnosticReport分割時の未配線ファイル4件を削除:
  - `AuditConversionSections.tsx` — モノリシック旧バージョン（モジュール分割版が上位互換）
  - `ReportExecutiveBrief.tsx` — `ReportExecutiveSummary` の下位互換
  - `VideoModal.tsx` — 既存のinline iframe埋め込みでカバー済み
  - `VideoPlayer.tsx` — 既存のroute.tsハンドラでカバー済み（473行、未使用）
- `ReportScoreCard.tsx` → DiagnosticReport.tsx に配線（スコア概要セクション追加）

### コード品質違反修正 (DONE)
- サイレントcatch 41件 → すべてに `console.error()` / `console.warn()` 追加
  - 致命的エラー（API失敗、フォーム送信失敗）: `console.error`
  - 非致命的（ポーリング失敗、パースフォールバック、ヘルスチェックタイムアウト）: `console.warn`
- `process.env.X || ""` 空文字フォールバック 5件 → 未設定時warningログ + nullチェック
- `as any` 23件 → `unknown` + type guard または適切な型に置換
  - `diagnostic.ts`: `CompanyMeta` 型定義
  - `demo-data.ts`: 適切なユニオン型
  - `auditLog.ts`: Payloadコレクション型

### OSS健全性監査 + 修正 (DONE)
- **Skyvern**: プロジェクトに一切存在せず（導入要）
- **SpiderFoot/Katana/Maigret/FlareSolverr**: `INTEGRATION_REGISTRY` に定義追加（ヘルスチェック関数は存在したが定義が不在だった）
- **Cal.com**: `balance: "none"` → `balance: "calcom_health"` 修正（ヘルスチェックが呼ばれないバグ）
- **mubeng**: ヘルスチェックを `integration-registry.ts` のインライン関数から `oss-service-health.ts` に抽出（一貫性）

### その他OSS所見
- n8n: legacy扱いだが `.env.local` に実クレデンシャル残存
- `.env.supabase` がリポジトリにコミット済み（テスト値だがリスク）
- 多数OSSがDocker Compose未定義（Coolify外部管理で許容）

### ファイル状態
| File | Lines | 制限 |
|------|-------|------|
| DiagnosticReport.tsx | ~525 | 微増（ScoreCardセクション追加） |
| integration-definitions.ts | ~920 | 4サービス追加 (+64行) |
| oss-service-health.ts | ~585 | mubeng追加 (+25行) |
| integration-registry.ts | ~240 | インラインmubeng削除 (-18行) |

### tsc --noEmit
- ✅ エラーなし

## ACTIVE HANDOFF
- コード品質監査 ✅ | OSS健全性修正 ✅ | 孤児ファイル削除 ✅
- 全41件サイレントcatch修正 ✅ | 全23件 as any 修正 ✅

## NEXT ACTIONS
- Coolify デプロイ確認 (deploy uuid: btlp4434lxntmelh3wjw2xjm)
- 本番URLで動画品質確認: https://paradigmjp.com/ja/report/demo/website_diagnostic
- GSAP CSP修正の実環境確認
- Skyvern導入検討（プロジェクトに未導入のため新規追加要）
- `.env.supabase` の gitignore 追加検討

## RISKS
- Droplet OOM警戒（8GB, Next.jsビルドが3GB消費）
- 動画GSAP修正（CSP対応 + bento3 id追加）の実環境確認が未実施
- astro-demo ビルドは通ったが Cloudflare Pages デプロイは未実行
- DiagnosticReport.tsx がScoreCardセクション追加で525行前後（500行ギリギリ超過の可能性）
