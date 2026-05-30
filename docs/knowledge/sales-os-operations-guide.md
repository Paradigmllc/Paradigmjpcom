# Paradigm Sales OS 運用ガイド

## 基本思想

営業データの正本は Supabase OSS です。Twenty、NocoDB、Appsmith、Metabase、n8n、Cal.com、Docuseal はすべて用途別の操作画面として扱います。

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
| n8n OSS | 自動化 | ジョブ起動、Slack通知、外部API連携 |
| Cal.com OSS | 予約 | 商談予約 |
| Docuseal OSS | 契約 | 契約書送付、署名ステータス |

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

## 意図的に手動確認を残している箇所

- 初回ライブフォーム送信5件
- CAPTCHA、ログイン必須、強いSPAフォーム
- 法務・業種リスクがある送信先
- Dify文面の初期品質確認
- 大量送信前のドメインウォームアップと送信上限調整

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

- `POST /api/sales/content-templates/match`: Dify/n8nがテンプレート選定だけを行う。
- `POST /api/sales/generate-sales-asset`: Slidev資料、動画ブリーフ、Astroデモブリーフ、診断JSONを生成し、`sales_deliveries` にレビュー待ちで記録する。
- `node scripts/seed-sales-content-templates.mjs`: migration_022適用後に初期テンプレートをSupabaseへ投入する。

## Coolifyにログインできない場合

`scripts/sales-os-no-login-deploy.mjs` を使います。Coolify API接続が残っていれば、UIログインなしで以下を一括実行できます。

```bash
node scripts/sales-os-no-login-deploy.mjs
```

このスクリプトは、Supabase商品マスター反映、Coolifyデプロイ、デプロイ完了待ち、主要URLのHTTP確認まで行います。秘密情報は出力しません。
