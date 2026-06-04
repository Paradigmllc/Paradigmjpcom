# Task.md

## CODEX UPDATE - 2026-06-04 Diagnostic Report Scope

- Confirmed the CompassLabs-style diagnostic report is the public route, not the Revenue OS Keystatic/admin preview: `https://paradigmjp.com/ja/report/codex-oss-verification-demo-qnxbms`.
- Report UI is shared by `/[locale]/report/[slug]`; added template-variant offer copy for website, Japan-entry, video, outreach, and security reports instead of hardcoding `/ja` or HP/video wording.
- Slug lookup now falls back across regions when the requested locale region has no row, while scoped region matches still win first.
- Verification: `npx tsc --noEmit --pretty false`, targeted vitest, `git diff --check`, Playwright production check for the sample URL.

## CODEx UPDATE - 2026-06-04 Trigger.dev Video Studio Fix

- 動画パイプライン投入をn8n webhookからTrigger.dev Management API `POST /api/v1/tasks/{taskIdentifier}/trigger` へ差し替え。
- `src/lib/sales/video-trigger.ts` を追加し、Trigger.dev task dispatch、idempotency key、company concurrency key、queue設定を集約。
- 既存DB列 `n8n_workflow_url` / `n8n_execution_id` は互換のため残し、中身はTrigger endpoint/run idとして利用。
- レポート用/プロ級スタジオと共通ラベルの文字化け、横幅崩れ、旧n8nエラー表示を修正。
- `.env.example` / runbook に `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`, `TRIGGER_VIDEO_PIPELINE_TASK_ID`, `TRIGGER_DASHBOARD_URL` を追加。
- 検証: `npx tsc --noEmit --pretty false`, targeted vitest, `npm run build`, `git diff --check`, `npm run context:audit` passed.
- Playwright local desktop 1365px / mobile 390px: report/pro panels rendered, no horizontal overflow, no mojibake pattern, no old n8n env error. Pro studio shows Trigger.dev.
- Commit `efdf5fb refactor: replace video pipeline n8n with trigger dev`, Coolify deployment `zl74t7u4wskkxwnj30mye2uv` finished.
- Production UI/API audit passed. `/api/sales/video-pipeline/jobs` returns `orchestrator.provider: trigger.dev`, no legacy `config.n8n`. `orchestrator.ready` is false until real `TRIGGER_SECRET_KEY` and `TRIGGER_VIDEO_PIPELINE_TASK_ID` are added.

## CODEx UPDATE - 2026-06-04 Video Studio Split

- 旧「全部入り」動画制作スタジオはライブ導線から外し、`docs/handoff-archive/2026-06-04-legacy-sales-video-pipeline-panel.tsx.txt` に完全アーカイブした。
- Revenue OS の動画制作入口を2つに分離した。
  - `/ja/admin/sales?tab=reportVideoStudio`: GPUなしのレポート用動画スタジオ。HyperFramesで診断レポート解説動画を生成する。
  - `/ja/admin/sales?tab=proVideoStudio`: GPUありのプロ級動画スタジオ。Vast.ai固定、ComfyUI APIヘッドレス、OpenMontage/n8n/R2連携を前提にする。
- 旧 `?tab=videoPipeline` は後方互換としてレポート用動画スタジオへ誘導する。
- 変更ファイル:
  - `src/components/sales-dashboard/SalesCommandCenter.tsx`
  - `src/components/sales-dashboard/SalesUnifiedOpsPanel.tsx`
  - `src/components/sales-dashboard/SalesReportVideoStudioPanel.tsx`
  - `src/components/sales-dashboard/SalesProVideoStudioPanel.tsx`
  - `docs/knowledge/sales-video-pipeline-runbook.md`
  - `docs/knowledge/video-production-guide.md`
- 検証:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm test -- --run src/lib/sales/video-pipeline.test.ts src/lib/sales/video-production.test.ts` passed.
  - `npm run context:audit` passed.
  - `git diff --check` passed with line-ending warnings only.
- 残リスク:
  - ローカル表示確認は `next dev --webpack -p 3000` 起動後、既知の `routes-manifest.json` パス混線で `/ja/admin/sales` が500になったため未完了。
  - プロ級動画側は既存 `/api/sales/video-pipeline/orchestrate` に接続しているが、ComfyUI本番APIの準備状態は別途 `scripts/audit-video-ops.mjs` で確認が必要。
  - n8n workflow 側の payload キー整合は次の実行テストで確認する。

## CODEx UPDATE - 2026-06-04 Deploy And Audit

- デプロイ:
  - App code commit: `2625d21 refactor: split video studios`
  - Coolify deployment UUID: `n13zyxzw8mienlu6ysoeflqc`
  - Coolify status: `finished`
- 本番UI監査:
  - `https://paradigmjp.com/ja/admin/sales?tab=reportVideoStudio` は認証後に `レポート用動画スタジオ` を表示。
  - `https://paradigmjp.com/ja/admin/sales?tab=proVideoStudio` は認証後に `プロ級動画スタジオ`、`Vast.ai API`、`ComfyUI API`、`Vast.ai + ComfyUIヘッドレス実行` を表示。
  - 旧 `?tab=videoPipeline` は `レポート用動画スタジオ` に後方互換誘導。
  - 旧全部入りタイトル `プロ動画スタジオ` は新タブ上に残っていない。
- 本番API監査:
  - `/api/sales/video-pipeline/jobs?limit=5&report_locale=ja` は認証ヘッダー付きでHTTP 200、`ok: true`、jobs 5件。
  - 本番configは `n8n: true`、`r2: true`、`vast: true`、`comfyui: false`、`hyperframes: false`、`openmontage: false`。
- OSS/環境監査:
  - `node scripts/audit-video-ops.mjs` は全体 `ok: false`。理由は `COMFYUI_API_KEY` 未設定。
  - Vast.ai APIはOK。GPU offer検索HTTP 200、instance一覧HTTP 200。
  - Cloudflare R2はOK。`HeadBucket`、監査用MP4 `PutObject`、公開URL `GET` 成功。
  - ComfyUI APIはNG。`src/lib/sales/comfyui-client.ts` は `COMFYUI_API_KEY` 必須のため、プロ級スタジオのヘッドレス生成はこのenvが入るまで本番実行不可。
  - OpenMontageは `OPENMONTAGE_API_URL` はあるが `OPENMONTAGE_API_KEY` が未設定。
  - HyperFramesはURL系envはあるが `HYPERFRAMES_API_KEY` が未設定。レポート用スタジオの本番レンダー可否は追加の実生成テストが必要。
- インフラリスク:
  - デプロイ前ホストpreflightでroot diskは83%。Docker build cache / unused images prune後も83%。直ちに停止する状態ではないが、継続監視が必要。

## CODEx UPDATE - 2026-06-04 Diagnostic Report Template Refresh

- 旧診断レポートテンプレートを `docs/handoff-archive/2026-06-04-diagnostic-report-template-refresh/` にアーカイブ。
- `https://www.compasslabs.ai/` を参考に、白地、薄いグリッド、大見出し、ピル、暗色プロダクトサーフェス、指標カード、データ台帳を組み合わせた高品質レポートUIへ全面刷新。
- 変更ファイル:
  - `src/app/[locale]/report/[slug]/page.tsx`
  - `src/components/diagnostic/DiagnosticReport.tsx`
  - `src/components/diagnostic/report-copy.ts`
  - `src/components/diagnostic/report-copy.test.ts`
- 表示品質:
  - 旧データに文字化け値が混ざっていても顧客画面へ出さないよう、表示前の文字化け検知フォールバックを追加。
  - ページmetadataの文字化けを修正。
- 検証:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm test -- --run src/components/diagnostic/report-copy.test.ts` passed.
  - `npm run build` passed.
  - `git diff --check` passed with line-ending warnings only.
  - `npm run context:audit` passed.
- デプロイ/本番監査:
  - Commit `3013176 feat: refresh diagnostic report template` をCoolify deploy `zjwa9xb3a3iz9xsccvmd40oq` で `finished`。
  - 本番サンプル `https://paradigmjp.com/ja/report/codex-oss-verification-demo-qnxbms` はHTTP 200。
  - Playwright desktop 1440px / mobile 390px で、新UI marker、文字化けなし、横スクロールなしを確認。
- 残リスク:
  - ローカル `.env.local` のSupabase接続は `no available server`。ローカル実データ表示は不可だが、本番実データ表示は確認済み。

## CURRENT STATUS

- Revenue OS の「動画制作」画面は、旧フォームを廃止し、Supabase `sales_video_jobs` をSSOTにする OSS Video Studio として再構成中。
- GUIには制作条件、OSSレンダラー、ComfyUI素材生成、TTS/レンダーskip、損失シミュレーション、制作ジョブ一覧、R2納品URL、プロンプト/調整欄を表示する。
- プロンプト/調整欄は、ナラティブ、ComfyUI向けビジュアル指示、ネガティブプロンプトをSupabase制作ジョブと `/api/sales/video-pipeline/orchestrate` に渡す。
- ComfyUI生成はスタブURLではなく、`src/lib/sales/comfyui-client.ts` の `/prompt` 実行経路を呼ぶよう修正済み。
- Vast.ai検索APIは公式仕様に合わせ、`POST https://console.vast.ai/api/v0/bundles/` を使う。インスタンス作成は `PUT /api/v0/asks/{offer_id}/` へ修正済み。
- Cloudflare R2 は本番envの公開URLを保存済み実値へ修正し、監査用MP4を実際にPutして公開GETまで成功。

## ACTIVE HANDOFF

- 主な変更ファイル:
  - `src/components/sales-dashboard/SalesVideoPipelinePanel.tsx`
  - `src/components/sales-dashboard/SalesVideoStudioKit.tsx`
  - `src/lib/sales/video-generator.ts`
  - `src/lib/sales/video-orchestrator.ts`
  - `src/lib/sales/video-pipeline.ts`
  - `src/lib/sales/vast-client.ts`
  - `src/lib/sales/vast-comfyui-deploy.ts`
  - `src/app/api/sales/video-pipeline/jobs/route.ts`
  - `src/app/api/sales/video-pipeline/orchestrate/route.ts`
  - `scripts/audit-video-ops.mjs`
  - `docs/knowledge/video-ops-audit-latest.json`
- 検証済み:
  - `npx tsc --noEmit --pretty false`
  - `npm test -- --run src/lib/sales/video-pipeline.test.ts src/lib/sales/video-production.test.ts src/lib/sales/integration-registry.test.ts src/lib/sales/r2-storage.test.ts`
  - `node scripts/audit-video-ops.mjs`
- 監査結果:
  - Vast.ai API: OK。オファー検索HTTP 200、インスタンス一覧HTTP 200。
  - Cloudflare R2: OK。`HeadBucket`、監査用MP4 `PutObject`、公開URL `GET` が成功。
  - ComfyUI API: NG。`COMFYUI_API_KEY` が本番envで空、`https://comfyui.paradigmjp.com/system_stats` はTLS検証失敗かつ `-k` でも503。Coolify上の `ComfyUI Landing` はnginx redirectサービスで、本物のComfyUI APIではない。

## NEXT ACTIONS

- ComfyUIは現状、本番投入できない。Vast.aiで本物のComfyUI APIインスタンスを起動するか、Coolify上にComfyUI本体を別サービスとして構築し、`COMFYUI_API_URL` と `COMFYUI_API_KEY` を同じ認証プロキシに接続する。
- ComfyUI復旧後、`node scripts/audit-video-ops.mjs` を再実行し、ComfyUI `system_stats` / `queue`、Vast、R2の全OKを確認する。
- コード変更後は build、commit、push、Coolify deploy、本番URL fingerprint確認まで実施する。

## RISKS

- 現時点でVastとR2は実務経路が通っているが、ComfyUIだけは実APIが存在しないため、Kling/HeyGen級の生成素材作成はまだ本番readyではない。
- R2監査用MP4は `docs/knowledge/video-ops-audit-latest.json` に公開URLを記録している。秘密値は記録していない。
