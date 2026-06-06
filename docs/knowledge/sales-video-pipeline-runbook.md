# Sales Video Production Pipeline Runbook

## 目的

営業動画と動画サブスク納品を、Supabase SSOT、Trigger.devジョブ制御、Dify Cloud文面生成、HyperFrames / OpenMontage / ComfyUI / Vast.ai制作、Cloudflare R2保存で量産する。

## 役割分担

- Supabase: `sales_video_jobs` をSSOTにする。制作プロフィール、ジョブ状態、R2保存先、承認履歴、エラーを保存する。
- Trigger.dev: 長時間ジョブのキュー、リトライ、同時実行制御を担当する。レンダラーではない。
- Dify Cloud: 文面、構成、テンプレート判定、CTAを生成する。未検証の法務、罰金、市場統計、CAGRは顧客向けに断定しない。
- HyperFrames: レポート用動画などGPU不要の軽量レンダーを担当する。
- ComfyUI + Vast.ai: プロ級動画の背景、B-roll、サムネイル、アバター、動画素材生成を担当する。GPUは必要時だけVast.aiで起動する。
- OpenMontage: ComfyUI素材、音声、字幕、ロゴを納品動画へ組み立てる。
- Cloudflare R2: master.mp4、review proxy、SRT、VTT、thumbnail、transcript、source-manifest、render-metadataを保存する。

## GUI

Revenue OSでは旧「動画制作」タブをアーカイブし、用途別に2つの入口へ分ける。

- `/ja/admin/sales?tab=reportVideoStudio`: レポート用動画スタジオ。GPUなし、HyperFrames中心。
- `/ja/admin/sales?tab=proVideoStudio`: プロ級動画スタジオ。Vast.ai、ComfyUI API、OpenMontage、Trigger.dev、R2を使う。

旧 `?tab=videoPipeline` は後方互換としてレポート用動画スタジオへ誘導する。

## レポート用動画スタジオ

1. 対象企業を選ぶ。
2. 尺、音声、ストーリー、CTAを指定する。
3. ブリーフ保存、または保存してHyperFrames生成を実行する。
4. 承認後、R2納品URLを登録する。

このラインではComfyUI、Vast.ai、OpenMontageを使わない。診断レポートの数字カード、根拠、CTAを速く安定して動画化する。

## プロ級動画スタジオ

1. 対象企業を選ぶ。
2. 納品形式、ジャンル、品質、音声、アバター、字幕を指定する。
3. ナラティブプロンプト、ComfyUIプロンプト、ネガティブプロンプトを入力する。
4. ブリーフ保存、Trigger.devへ投入、またはVast.ai + ComfyUIヘッドレス実行を選ぶ。
5. 初稿確認後、R2納品URLを登録する。

ComfyUI GUIはworkflow開発・調整用であり、日常の量産はComfyUI APIをヘッドレス実行する。Vast.aiインスタンス内に消えて困るデータを置かず、workflowはGit/Supabase、素材と成果物はR2、ジョブ状態はSupabaseに保存する。

## Trigger.dev Task Payload

`POST https://api.trigger.dev/api/v1/tasks/{TRIGGER_VIDEO_PIPELINE_TASK_ID}/trigger` に以下を渡す。

- `payload.job_id`, `job_type`, `company_id`, `locale`
- `payload.target_platform`, `render_engine`, `target_segment`, `offer_angle`
- `payload.production_profile`: genre / voice / avatar / captions / story / quality
- `payload.dify`: provider / base_url / workflow_url / configured_groups / missing_groups
- `payload.r2`: bucket / prefix / public_url / asset_manifest / upload_endpoint
- `payload.storyboard`, `production_plan`, `loss_simulation`, `claim_guard`, `input_assets`
- `options.idempotencyKey`: `sales-video-{jobId}`
- `options.queue`: `sales-video-pipeline`, concurrency limit 2

## R2 Upload API

レンダラーやTrigger.devタスクは、ジョブ単位で署名付きPUT URLを発行できる。

```http
POST /api/sales/video-pipeline/jobs/{jobId}/assets
Content-Type: application/json
X-Webhook-Secret: {TRIGGER_WEBHOOK_SECRET}

{
  "files": [
    { "name": "master.mp4", "content_type": "video/mp4" },
    { "name": "captions.vtt", "content_type": "text/vtt" },
    { "name": "thumbnail.webp", "content_type": "image/webp" }
  ]
}
```

認証ヘッダー名は `X-Webhook-Secret` のまま、値は `TRIGGER_WEBHOOK_SECRET` を使う。旧 `N8N_WEBHOOK_SECRET` は受信互換のみ。

## 必須環境変数

- `TRIGGER_SECRET_KEY`
- `TRIGGER_API_URL`
- `TRIGGER_VIDEO_PIPELINE_TASK_ID`
- `TRIGGER_DASHBOARD_URL`
- `DIFY_API_KEY` または用途別Difyキー
- `COMFYUI_API_URL`
- `VAST_API_KEY`
- `OPENMONTAGE_API_URL`
- `OPENMONTAGE_API_KEY`
- `HYPERFRAMES_RENDERER_URL`
- `REMOTION_RENDERER_URL`
- `CLOUDFLARE_R2_BUCKET` または `R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL` または `R2_PUBLIC_BASE_URL`
- R2へ実アップロードするワーカー側では `CLOUDFLARE_R2_ACCOUNT_ID`、`CLOUDFLARE_R2_ACCESS_KEY_ID`、`CLOUDFLARE_R2_SECRET_ACCESS_KEY`

## 禁止事項

- Trigger.devをレンダラー化しない。
- CAPTCHA回避、ログイン突破、危険なフォーム自動送信を動画制作パイプラインに混ぜない。
- 未検証の法務、罰金、市場統計、CAGR、業界平均を断定しない。
- GPUを大量起動する前にレビューとコスト確認を省略しない。
- 完成URLをR2以外の一時URLだけで納品しない。
