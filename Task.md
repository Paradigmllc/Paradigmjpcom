# Paradigmjpcom Task

## CURRENT STATUS — 2026-07-28 Initial Japan Country Partnershipを90日へ変更（実装中 / 外部送信0）

- Japan Entryの標準オファーを`$15,000`のJapan Market Setup＋Go-Live Dateから90日間のInitial Japan Country Operationsへ統一する。
- 契約日ではなくGo-Live Dateを運用期間の起点とし、Day 45/65/75/85の継続判断、Day 90の継続契約または引き継ぎを明記する。
- 月額運用価値は`$2,000/月 × 3か月 = $6,000`、Month 4以降は署名済み条件の$2,000/月。広告費・物流・法務・税務・専門家費用など外部費用は別途とする。

## CURRENT STATUS — 2026-07-28 Japan Entry価格を$15,000へ統一（実装中 / 外部送信0）

- 公開サイト、料金表、FAQ・規約・返金ページ、構造化データ、チャット、営業メッセージ、デモ／診断コピーのJapan Entry固定セットアップ価格を`$15,000`（短縮表記`$15K`）へ統一中。
- `$2,000/月 × 6か月 = $12,000`の選定パートナー向け運用価値は別料金要素のため変更しない。
- 既存の履歴リリース記録とマイグレーション時刻は監査用に保持し、現行コード・公開面のみ更新する。

## CURRENT STATUS — 2026-07-28 グローバル市場機会帯のページ内移動（実装中 / 外部送信0）

- 全英語ページのサイトクローム直下に自動挿入されていた `THE OPPORTUNITY COST OF WAITING` 帯を廃止する。トップのファーストビュー直下はサービス説明を優先し、固定ヘッダー周辺の価格訴求を表示しない。
- 市場機会・規制・意思決定の詳細は、既存の `/en/package` 内 `JapanMarketUrgency` セクションに集約する。日本語サイト、独立デモ、レポート、外部送信経路は変更しない。
- `ConditionalSiteChrome`、locale layout、`SiteWrapper` の責務を整理し、不要になった翻訳注入とグローバル帯の依存を削除する。

## CURRENT STATUS — 2026-07-28 英語ヘッダーCTAの中立化（実装・型検査完了 / 外部送信0）

- 英語圏の固定ヘッダー右上CTAを、価格・申込意図を直接押し出す`Apply — $13K`から通常の`Contact`へ変更し、リンクも`/contact?intent=japan-entry`から`/contact`へ統一した。Japan Entryの価格・申込CTAは本文側に残し、ヘッダーはサービス横断の入口に戻した。
- 変更は`src/components/aesop/SiteHeader.tsx`のみ。既存の日本語`お問い合わせ`、CMSナビが有効な国内ルート、モバイルメニュー、外部送信経路には変更なし。
- `npm exec -- eslint src/components/aesop/SiteHeader.tsx --max-warnings=0`、`npm exec -- tsc --noEmit --pretty false`、`git diff --check`を通過。外部送信は行っていない。

## CURRENT STATUS — 2026-07-28 Video as a Service 商用運用PR検証中

- Video as a Serviceの商品設計を3プランに確定した。
  - Essential: USD 1,500 / month、条件を満たすショート動画を月10本まで、同時進行1本、各動画3修正ラウンド。
  - Unlimited: USD 3,500 / month、依頼キュー無制限、同時進行1本、合意ブリーフ内の修正無制限。
  - Priority: USD 5,500 / month、依頼キュー無制限、同時進行2本、合意ブリーフ内の修正無制限、優先キュー。
- Readyとなった標準依頼へ原則2営業日以内に着手する。これは完成・納品時間の保証ではない。
- 申込み、適合確認、Service Order、初回決済、オンボーディング、制作キュー、レビュー、納品、更新・解約までの運用仕様を `docs/knowledge/video-as-a-service-operating-system.md` に定義した。
- 公開用FAQ・日英利用規約、VaaS専用申込フォーム、CRM/Slack用intent・plan保存、Service Order・Client Brief・メールテンプレートを実装した。
- 既存英語Contact Formが全申請をJapan Entryへ強制変換していたため、`video-as-a-service` intentだけを安全に分離し、その他の英語申請は従来どおりJapan Entryへ正規化する。

## ACTIVE HANDOFF

- Branch: `feat/video-as-a-service-commercial-launch`
- PR: #573 `feat: launch Video as a Service commercial operations`
- PR検証でVitest、TypeScript、ESLint、production buildを通し、mainへ統合後に本番公開と公開URL検証を行う。
- 本番公開後、次の運用準備を完了する。
  - Stripeの3商品・月額Priceと請求方法
  - Notion client workspace template
  - Frame.io project template
  - Google Drive folder template
  - 初回ポートフォリオ3〜6本
  - 日本法弁護士による利用規約とService Orderの最終レビュー
- 公開利用規約は事業者向け共通条件であり、案件固有の条件はService Orderを優先させる。

## RELEASE REFERENCES

- Previous Country Partner implementation PR: #565
- Previous production verification run: `30311462742`
- VaaS implementation PR: #573
- VaaS production deployment: pending
