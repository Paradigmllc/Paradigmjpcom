# Paradigm Sales OS 運用ガイド

## 基本思想

営業データの正本は Supabase OSS です。Twenty、NocoDB、Appsmith、Metabase、Cal.com、Docuseal、OpenClaw はすべて用途別の操作画面として扱います。

## 毎日の使い方

1. Apollo / Fumadata / BIZMap / 手元CSVなどの営業リストを Supabase に投入する。
2. 大量編集や重複整理が必要な場合は NocoDB を使う。
3. enrichment job を実行し、企業カルテ、診断レポート、Astro差し替えデモを生成する。
4. 営業担当は Twenty の企業ページで、診断レポートURL、フォームURL、推奨商材、商談を確認する。
5. フォーム営業は Dify 文面生成とフォーム判定を通し、初回ライブ送信5件やリスク判定分は Appsmith の手動キューで確認する。
6. 商談予約は Cal.com、契約は Docuseal、分析は Metabase で確認する。

## ツールの役割

| ツール | 役割 | 使いどころ |
| --- | --- | --- |
| Supabase OSS | SSOT | 営業データ、企業カルテ、ジョブ、Webhook、同期ログ |
| NocoDB OSS | 一括編集 | リストの整形、重複整理、ステータス一括変更 |
| Twenty OSS | CRM | 企業ページ、商談、担当、活動履歴 |
| Appsmith OSS | 手動承認 | 初回送信承認、CAPTCHA/SPAフォーム確認 |
| Metabase OSS | 分析 | 返信率、商談化率、ソース別成績 |
| OpenClaw | オーケストレーター/リサーチ | ジョブ起動、Slack通知、外部API連携、Crawleeリサーチ |
| Cal.com OSS | 予約 | 商談予約 |
| Docuseal OSS | 契約 | 契約書送付、署名ステータス |
| Paradigm AI Bot | Telegram司令塔 | @aiparadigmbot からHermes/Paperclip/OpenCode/OpenClawへ営業指示を渡す |

## 自動化済み

- CSV投入から Supabase 登録
- enrichment job 作成
- 企業カルテ生成
- 診断レポートURL生成
- Astro差し替えデモURL生成
- 言語・業界・商材・訴求・成果物タイプ別のテンプレート選定
- Twenty企業HOME項目同期
- 推奨商材からTwenty商談候補生成
- Dify優先のフォーム文面生成
- フォームURL判定と手動キュー振り分け
- Cal.com / Docuseal webhook のSupabase反映
- Coolify UIログインなしのデプロイ導線
- Telegram経由のAIチーム指示受付、コマンド台帳、営業ジョブ起動、手動承認キュー化

## 意図的に手動確認を残している箇所

- 初回ライブフォーム送信5件
- CAPTCHA、ログイン必須、強いSPAフォーム
- 法務・業種リスクがある送信先
- Dify文面の初期品質確認
- 大量送信前のドメインウォームアップと送信上限調整
- Telegramからのライブ送信、契約、DNS/インフラ変更

## Paradigm AI Bot / 自律営業チーム

`@aiparadigmbot` は営業OSのチャット入口です。Telegramからの指示は OpenClaw Pipeline または Hermes Agent が
`POST /api/sales/agent/telegram-command` に渡し、Supabaseの `sales_agent_commands` に記録します。

役割:

- CEO Hermes Agent: 指示を営業方針、優先度、承認要否に分解する。
- Paperclip Operator: Supabaseジョブ、Appsmith手動キュー、Slack通知、証跡保存を担当する。
- OpenCode Engineer: コード修正、テスト、デプロイ準備、Docs更新を担当する。
- OpenClaw Researcher: Crawlee、Crawl4AI、PageSpeed、Wappalyzer、公開APIから企業情報を集める。
- Outreach Worker: Dify文面生成、フォーム判定、dry-run、承認後の送信準備を担当する。

使える指示例:

- `今日の営業OS状況を見て`
- `カルテ生成を3件進めて`
- `フォーム営業dry-runを5件実行して`
- `Twenty同期して`
- `Web制作向けの資料と動画ブリーフを準備して`

自律レベル:

- `observe`: 状況確認のみ。DBや外部サービスを更新しない。
- `copilot`: ジョブ作成、下書き、手動キュー化まで。実送信はしない。
- `autopilot_guarded`: カルテ生成やdry-runを実行。ただしライブ送信と契約は承認必須。

安全ルール:

- Supabaseが唯一の正本。Twenty、NocoDB、Metabase、Appsmithは用途別UIとして同期する。
- Telegramからのフォーム営業は常にdry-runから開始する。
- 初回ライブ送信5件、CAPTCHA、ログイン必須、強いSPA、法務/業種リスクはAppsmith承認へ回す。
- 契約書、請求、DNS、インフラ、APIキー変更はTelegram単独では実行しない。
- すべての指示と結果をSupabaseに記録し、営業ダッシュボードの `AIチーム` タブで監査する。

## 実務運用面の残課題

残課題は「実装漏れ」ではなく、運用品質を上げるための段階的な有効化項目です。

- 外部APIキーとプロキシ残量の定期確認
- Smartlead / Listmonk / Resend の本格送信前ウォームアップ
- Metabaseでソース別返信率と商談化率の週次レビュー
- Appsmithで手動キュー処理UIをさらに薄くする
- Twenty側の項目名/表示順を実運用に合わせて微調整する

## 成果物テンプレート運用

営業成果物は `sales_content_templates` をSSOTにする。対象は次の4種類です。

- 診断レポート: Next.js の `/[locale]/report/[slug]` で表示する。
- デモサイト: Astroで本番化しやすい差し替えデモとして `/[locale]/d/[slug]` に出す。
- 営業資料: Slidev Markdownを生成し、GotenbergでPDF化する。
- 営業動画: ComfyUI / HyperFrames / Remotion / Faster Whisper / MoviePy / R2 を使う動画ブリーフとして生成する。

初期テンプレートは日本語と英語だけを作る。全12言語を一気に作ると運用不能な量になるため、まず `ja` と `en` の `言語 x 業界 x 成果物 x 訴求角度` を整える。Difyはテンプレートの `dify_selection_rule` と企業カルテの痛み根拠を見て、最適なテンプレートを選ぶ。

実行系:

- `POST /api/sales/content-templates/match`: Dify/OpenClawがテンプレート選定だけを行う。
- `POST /api/sales/generate-sales-asset`: Slidev資料、動画ブリーフ、Astroデモブリーフ、診断JSONを生成し、`sales_deliveries` にレビュー待ちで記録する。
- `node scripts/seed-sales-content-templates.mjs`: migration_022適用後に初期テンプレートをSupabaseへ投入する。

## Coolifyにログインできない場合

`scripts/sales-os-no-login-deploy.mjs` を使います。Coolify API接続が残っていれば、UIログインなしで以下を一括実行できます。

```bash
node scripts/sales-os-no-login-deploy.mjs
```

このスクリプトは、Supabase商品マスター反映、Coolifyデプロイ、デプロイ完了待ち、主要URLのHTTP確認まで行います。秘密情報は出力しません。
## 種別

営業OSで分けて管理する種別は次の通りです。

- 商材種別: `jp_web_production`、`jp_dx_package`、`global_jaas`、`global_video_subscription`
- テンプレ種別: `website_diagnostic`、`outreach`、`japan_entry`、`video_subscription` など
- AIチーム指示種別: `status_report`、`run_enrichment`、`run_outreach_dry_run`、`prepare_assets`、`sync_twenty`、`manual_review`
- オペレーターキュー種別: `cleanse`、`call`、`form_send`、`follow_up`、`crm_update`、`meeting_prep`、`analysis`
- 成約後ハンドオフ種別: `manual`、`supabase_webhook`、`docuseal`、`stripe`、`twenty`、`telegram`、`n8n`

## 成約後パイプライン

成約は Twenty の商談だけで完結させず、Supabase を起点に顧客運用へ切り替えます。

1. `sales_companies.deal_stage = 成約`、Docuseal signed webhook、または `POST /api/sales/customer-success/handoff` が入口になる。
2. `runCustomerSuccessHandoff()` が `sales_customers` を作成または更新する。
3. `sales_contracts` に契約を作成または Docuseal submission ID で upsert する。
4. Notion 顧客DBに顧客共有ページを作成し、`sales_customers.notion_page_id` と `meta.customer_success.notion_page_url` に保存する。
5. Twenty 企業HOMEへ、顧客共有Notion URL、契約名、契約ステータス、Cal.com URL、Docuseal URLを投影する。
6. `sales_activity_log` と `sales_sync_logs` にハンドオフ履歴を残す。

Twenty 側に `paradigmCustomerPortalUrl` カスタム項目がある場合はそこへ URL を入れます。項目がまだ無い環境では、HOME の企業カルテ要約に URL を追記する fallback にします。
