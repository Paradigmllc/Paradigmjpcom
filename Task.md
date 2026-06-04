# Task.md

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
