# Sales Video Pipeline Runbook

## 目的

営業動画と動画サブスク納品を同じSales OSで管理する。SupabaseがSSOT、n8nは交通整理、実レンダーはHyperFrames / Remotion / OpenMontage / ComfyUI / Vast.aiに分離する。

## 2段構成

1. 営業動画
   - 用途: 診断レポート、営業資料、Twenty商談ページに添える60秒前後の動画。
   - 主レンダー: HyperFramesまたはRemotion。
   - n8nの役割: 企業カルテ取得、Dify文面生成、レンダーAPI呼び出し、Slack確認、R2 URL保存。
   - GPU: 原則使わない。ComfyUI素材が必要な場合のみ短時間利用。

2. 動画サブスク納品
   - 用途: 顧客向けに月次で複数本を納品する動画制作ライン。
   - 主レンダー: OpenMontage + ComfyUI + Vast.ai + R2。
   - n8nの役割: 月次ブリーフ、素材生成、GPU起動、レンダー、字幕、アップロード、納品URL記録。
   - GPU: Vast.aiを利用。ただし初回納品と高コスト実行は人間承認を必須にする。

## GUI

営業ダッシュボード `/ja/admin/sales` の「動画制作」タブで操作する。

- 対象企業を選ぶ
- 営業動画または動画サブスクを選ぶ
- 用途とレンダーエンジンを選ぶ
- 制作ジョブを作成する
- n8n投入、承認、完了URL記録を操作する

## n8n Webhook

`N8N_VIDEO_PIPELINE_WEBHOOK_URL` にSales OSからジョブが送られる。n8n側は次の順番で処理する。

1. Supabaseの `sales_video_jobs` と `sales_companies` を読む
2. Dify Cloudで構成、ナレーション、字幕、CTAを生成する
3. 必要な場合だけComfyUIプロンプトを実行する
4. 動画サブスクまたは重い生成だけVast.ai GPUを起動する
5. HyperFrames / Remotion / OpenMontageへレンダー依頼する
6. MP4、SRT、サムネイル、素材をR2へ保存する
7. Slackに確認依頼を出す
8. Sales OS APIで `sales_video_jobs` を完了にする

## 必須環境変数

- `N8N_VIDEO_PIPELINE_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `DIFY_API_KEY` または `DIFY_API_KEY_JA` / `DIFY_API_KEY_EN`
- `COMFYUI_API_URL`
- `VAST_API_KEY`
- `OPENMONTAGE_API_URL`
- `HYPERFRAMES_RENDERER_URL`
- `REMOTION_RENDERER_URL`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL` または `R2_PUBLIC_BASE_URL`
- `SLACK_WEBHOOK_URL`

未設定でもGUIは落ちない。足りない箇所は「未設定」または「人間確認」として表示する。

## ガードレール

- n8nはレンダラーではなく交通整理役にする
- 未検証の数値、実績、診断結果を動画に入れない
- 初回顧客納品、契約前送信、GPU起動は人間承認を挟む
- CAPTCHA回避やログイン突破を動画制作パイプラインに混ぜない
- 完成URLはR2に置き、SupabaseとTwentyに記録する
