# Sales Video Production Pipeline Runbook

## 目的

営業動画と動画サブスク納品を、Supabase SSOT、n8n交通整理、Dify Cloud文面生成、HyperFrames / Remotion / OpenMontage / ComfyUI / Vast.ai制作、Cloudflare R2保存で量産する。

## 役割分担

- Supabase: `sales_video_jobs` をSSOTにする。制作プロファイル、ジョブ状態、R2保存先、承認履歴、エラーを保存する。
- n8n: レンダラーではなく交通整理役。Dify、ComfyUI、Vast.ai、レンダラー、Slack、Sales OS APIをつなぐ。
- Dify Cloud: 言語、業界、訴求、制作ジャンルから文面、構成、字幕、CTAを生成する。未検証の法規制、罰金、市場規模、CAGRは顧客向けに断定しない。
- HyperFrames / Remotion: 営業動画、診断ページ埋め込み、営業資料内動画の主レンダラー。
- OpenMontage + ComfyUI + Vast.ai: 動画サブスク納品、アバター、背景、B-roll、重い生成を担当する。
- Cloudflare R2: master.mp4、review proxy、SRT、VTT、thumbnail、transcript、source-manifest、render-metadataを保存する。
- Slack / Appsmith: 初回納品、契約前送付、危険表現、GPU高コストジョブを人間承認に回す。

## GUIでの使い方

Revenue OSでは旧「動画制作」タブをアーカイブし、用途別に2つの入口へ分ける。

- `/ja/admin/sales?tab=reportVideoStudio`: レポート用動画スタジオ。GPUなし、HyperFrames中心。
- `/ja/admin/sales?tab=proVideoStudio`: プロ級動画スタジオ。Vast.ai固定、ComfyUI APIヘッドレス、OpenMontage/n8n/R2連携。

旧 `?tab=videoPipeline` は後方互換としてレポート用動画スタジオへ誘導する。

### レポート用動画スタジオ

1. 対象企業を選ぶ。
2. 尺、音声、ストーリー、CTAを指定する。
3. ブリーフ保存、または保存してHyperFrames生成を実行する。
4. 承認後、R2納品URLを登録する。

このラインではComfyUI、Vast.ai、OpenMontageを使わない。診断レポートの数字カード、根拠、CTAを速く安定して動画化する。

### プロ級動画スタジオ

1. 対象企業を選ぶ。
2. 納品形式、ジャンル、品質、音声、アバター、字幕を指定する。
3. プロンプトとComfyUI生成素材を指定する。
4. ブリーフ保存、n8n投入、またはVast.ai + ComfyUIヘッドレス実行を選ぶ。
5. 初稿確認後、R2納品URLを登録する。

プロ制作プロファイルでは以下を選ぶ。
   - 動画ジャンル: 経営診断、プロダクトデモ、UGC広告風、ショート、導入事例、日本進出ピッチ、月額納品シリーズなど。
   - 音声: コンサル声、創業者声、高級ナレーター、地域向け、日英、音楽+字幕のみ。
   - アバター: なし、案内役、経営アドバイザー、実務責任者、スタジオ登壇者、ブランドキャラクター。
   - 字幕: 焼き込み二言語、下部テロップ、ハイライト、SRT/VTTのみ、SNS安全領域。
   - ストーリー: 問題提起型、Before/After、AIDA、事例型、誤解/真実/根拠、3幕デモ。
   - 品質: 下書き、プロ納品、プレミアム。
ComfyUI GUIはworkflow開発・調整用であり、日常の量産はComfyUI APIをヘッドレス実行する。Vast.aiインスタンス内には消えて困るデータを置かず、workflowはGit/Supabase、素材と成果物はR2、ジョブ状態はSupabaseに保存する。

## R2保存仕様

保存プレフィックスは自動で決まる。

```text
sales-videos/{locale}/{company}/{yyyy-mm}/{job_type}/{production_genre}/
```

必須成果物:

- `master.mp4`
- `review-proxy.mp4`
- `poster.webp`
- `thumbnail.webp`
- `captions.srt`
- `captions.vtt`
- `transcript.txt`
- `source-manifest.json`
- `render-metadata.json`

## n8n Webhook payload

`POST N8N_VIDEO_PIPELINE_WEBHOOK_URL` に以下が渡る。

- `job_id`, `job_type`, `company_id`, `locale`
- `target_platform`, `render_engine`, `target_segment`, `offer_angle`
- `production_profile`: genre / voice / avatar / captions / story / quality
- `r2`: bucket / prefix / public_url / asset_manifest
- `storyboard`, `production_plan`, `loss_simulation`, `claim_guard`, `input_assets`

## R2アップロードAPI

レンダラーやn8nは、ジョブ単位で署名付きPUT URLを発行できる。

```http
POST /api/sales/video-pipeline/jobs/{jobId}/assets
Content-Type: application/json
X-Webhook-Secret: {N8N_WEBHOOK_SECRET}

{
  "files": [
    { "name": "master.mp4", "content_type": "video/mp4" },
    { "name": "captions.vtt", "content_type": "text/vtt" },
    { "name": "thumbnail.webp", "content_type": "image/webp" }
  ]
}
```

レスポンスの `uploadUrl` に直接PUTし、`publicUrl` を納品URLやTwenty/Metabase表示に使う。発行履歴は `sales_video_jobs.asset_manifest.pending_uploads` に保存される。

## 品質ゲート

- 1画面目で「何が損なのか」が一言で分かる。
- 数値は測定値、一次情報、または推定と明記されたものだけを使う。
- 字幕はスマホで読め、重要な根拠カードを隠さない。
- アバターや生成素材は業界とブランドに合う。
- CTAは診断レポート、予約、納品ページのいずれかに接続する。
- R2に動画本体だけでなく、字幕、サムネイル、原稿、メタデータまで残す。

## 必須環境変数

- `N8N_VIDEO_PIPELINE_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `DIFY_API_KEY` または用途別Difyキー
- `COMFYUI_API_URL`
- `VAST_API_KEY`
- `OPENMONTAGE_API_URL`
- `HYPERFRAMES_RENDERER_URL`
- `REMOTION_RENDERER_URL`
- `CLOUDFLARE_R2_BUCKET` または `R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL` または `R2_PUBLIC_BASE_URL`
- R2へ実アップロードするワーカー側では `CLOUDFLARE_R2_ACCOUNT_ID`、`CLOUDFLARE_R2_ACCESS_KEY_ID`、`CLOUDFLARE_R2_SECRET_ACCESS_KEY`

## 禁止事項

- n8nをレンダラー化しない。
- CAPTCHA回避、ログイン突破、危険なフォーム自動送信を動画制作パイプラインに混ぜない。
- 未検証の法規制、罰金、市場統計、CAGR、業界平均を断定しない。
- GPUを大量起動する前にレビューとコスト確認を省略しない。
- 完成URLをR2以外の一時URLだけで納品しない。
