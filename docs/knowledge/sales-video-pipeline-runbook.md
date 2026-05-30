# Sales Video Pipeline Runbook

## 目的

営業動画と動画サブスク納品を、Sales OS上で一元管理する。Supabase OSSをSSOTにし、n8nは交通整理だけを担当する。実レンダーはHyperFrames、Remotion、OpenMontage、ComfyUI、Vast.ai、R2に分ける。

## 2段構成

1. 営業動画
   - 用途: 診断レポート、営業資料、Twenty企業ページに添える60秒前後の動画。
   - 主レンダー: HyperFramesまたはRemotion。
   - n8nの役割: 企業カルテ取得、Dify文面生成、レンダーAPI呼び出し、Slack確認、R2 URL保存。
   - GPU: 原則使わない。ComfyUI素材が必要な場合だけ短時間利用する。

2. 動画サブスク納品
   - 用途: 顧客向けに月次で複数本を納品する動画制作ライン。
   - 主レンダー: OpenMontage + ComfyUI + Vast.ai + R2。
   - n8nの役割: 月次ブリーフ、素材生成、GPU起動、レンダー、字幕、アップロード、納品URL記録。
   - GPU: Vast.aiを利用する。ただし初回納品と高コスト実行は人間承認を必須にする。

## GUI

`/ja/admin/sales` の「動画制作」タブで操作する。

- 対象企業を選ぶ
- 営業動画または動画サブスクを選ぶ
- セグメント別テンプレを選ぶ
- 訴求軸を選ぶ
- 損失シミュレータで仮説値を調整する
- 用途とレンダーエンジンを選ぶ
- 制作ジョブを作成する
- n8n投入、承認、完了URL記録を操作する

## セグメント別テンプレ

初期対応セグメント:

- 代理店ホワイトラベル
- SaaSマーケティング
- ECブランド
- ローカルSMB
- YouTube / クリエイター
- 日本参入パッケージ
- GTMエンジニアリング

Difyは `target_segment` と `offer_angle` を見て、動画構成、ナレーション、字幕、CTAのテンプレを選ぶ。テンプレはワンパターンにせず、セグメントごとに「損失」「競合」「市場タイミング」「制作コスト」「日本参入」「地域信頼」を切り替える。

## 損失シミュレータ

Sales OSのGUIで以下を調整する。

- 月間失注件数
- 平均案件単価
- 月間動画予算
- 現動画本数
- 競合動画本数
- 粗利率

結果は `sales_video_jobs.loss_simulation` に保存する。これはヒアリング前の仮説なので、顧客向け文面では必ず「推定」「可能性」「仮説」として扱う。

## 未検証断定ガード

`sales_video_jobs.claim_guard` はDifyとn8nに渡す安全ルール。

顧客向け文面で一次情報URLが必須なもの:

- 法改正日
- 罰金額
- 市場規模
- CAGR
- 業界平均倍率

一次情報URLが無い場合、Difyはこれらを動画、資料、フォーム文面、診断レポートの顧客向けコピーに入れない。内部メモとして残す場合も「未検証」と明記する。

## n8n Webhook

`N8N_VIDEO_PIPELINE_WEBHOOK_URL` にSales OSからジョブが送られる。n8n側は次の順番で処理する。

1. Supabaseの `sales_video_jobs` と `sales_companies` を読む
2. Dify Cloudでセグメントテンプレ、構成、ナレーション、字幕、CTAを生成する
3. `claim_guard` に反する未検証断定を弾く
4. 必要な場合だけComfyUIプロンプトを実行する
5. 動画サブスクまたは重い生成の場合だけVast.ai GPUを起動する
6. HyperFrames / Remotion / OpenMontageへレンダー依頼する
7. MP4、SRT、サムネイル、素材をR2へ保存する
8. Slackに確認依頼を出す
9. Sales OS APIで `sales_video_jobs` を完了にする

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

未設定でもUIは落ちない。不足している箇所は「未設定」または「人間確認」として表示する。

## ガードレール

- n8nはレンダラーではなく交通整理役にする
- 未検証の数値、実績、法改正、罰金、市場統計、CAGRを顧客向けに断定しない
- 初回顧客納品、契約前送信、GPU起動は人間承認を挟む
- CAPTCHA回避やログイン突破を動画制作パイプラインに混ぜない
- 完成URLはR2に置き、SupabaseとTwentyに記録する
