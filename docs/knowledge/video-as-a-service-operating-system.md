# Video as a Service Operating System

更新日: 2026-07-28  
対象: Paradigm LLC / 日本語・英語共通運用

## 1. 商品の定義

Paradigm Video as a Serviceは、事業者向けの月額制・リモート完結型動画制作サービスである。顧客は共有ワークスペースへ依頼を登録し、Paradigmはプランごとの制作枠と優先順位に沿って企画、編集、モーション、AI支援素材、字幕、ローカライズ、派生版を継続納品する。

「無制限」は依頼キューと合意ブリーフ内の修正回数を指し、月間完成本数、作業時間、即日納品、同時進行数を無制限にするものではない。

## 2. 標準プラン

| Plan | Price | Request capacity | Active production | Revisions |
|---|---:|---|---:|---|
| Essential | USD 1,500 / month | 条件を満たすショート動画を月10本まで | 1 | 各動画3ラウンド |
| Unlimited | USD 3,500 / month | 依頼登録無制限 | 1 | 合意ブリーフ内は無制限 |
| Priority | USD 5,500 / month | 依頼登録無制限 | 2 | 合意ブリーフ内は無制限・優先キュー |

共通条件:

- 月額前払い
- 月単位の自動更新
- Readyとなった標準依頼へ原則2営業日以内に着手
- リモート完結を標準とする
- 撮影、出演者、高額素材、高度な3D、特急対応は別途
- ダウングレード・解約は次回更新日から適用

## 3. 標準ツール構成

| Purpose | Default | Rule |
|---|---|---|
| 顧客ワークスペース | Notion | 依頼、優先順位、状態、決定、リンクを一元管理 |
| 動画レビュー | Frame.io | タイムコード付きコメントを正本とする |
| ファイル | Google Drive | Source / Working References / Review / Final / Archive |
| 契約 | PDFまたは電子署名 | Service Orderと利用規約を保存 |
| 請求 | Stripe invoice/subscriptionを第一選択 | Wise、銀行振込、USDCは請求書ベースで個別合意 |
| CRM | Twenty | 申請、プラン、金額、開始日、更新日、状態を記録 |
| 社内通知 | Slack + DB notification | Web申請時に自動通知 |

顧客のセキュリティまたは調達要件により別ツールを使用する場合は、Service Orderへ記載する。

## 4. 役割

### Paradigm Producer / Account Owner

- 適合確認
- Service Order作成
- オンボーディング
- 優先順位・制作枠管理
- ブリーフ確認
- 顧客連絡
- 最終QAと納品
- 更新・解約管理

### Lead Creator / Editor

- 制作見積もり
- 編集・モーション・書き出し
- 内部QA修正
- プロジェクトとライセンス記録

### Client Owner

- 事業目的と優先順位を決定
- 素材、アクセス、事実情報を提供
- 統合したフィードバックを提出
- 最終承認

### Optional Specialist

- ナレーション、3D、撮影、翻訳、法務等
- 必要な秘密保持・知財条件へ合意後に参加

## 5. 申込みから契約まで

### Step 1: Application

Webフォームで以下を受け取る。

- 氏名、会社名、メール、電話
- 会社・サービスURL
- 希望プラン
- 月間需要
- 素材準備状況
- 希望開始時期
- 最初に作りたい動画
- 利用規約・取引条件の確認

### Step 2: Fit review

原則1営業日以内に以下を確認する。

- 事業者としての申込みか
- 希望プランと実際の需要が合っているか
- 標準範囲で対応できるか
- 素材・ブランド・承認者が準備できるか
- 違法、危険、権利侵害、プラットフォーム違反のおそれがないか
- AI、機密、データ所在地、ベンダー制限があるか
- 撮影や第三者費用が必要か

判定:

- `ACCEPT`: Service Orderを発行
- `ACCEPT WITH CONDITIONS`: 例外・追加費用・開始条件を明記
- `PILOT RECOMMENDED`: 月額契約前に有料単発制作を提案
- `DECLINE`: 対応不能理由を簡潔に回答

### Step 3: Service Order

最低限以下を確定する。

- 法人名・請求先
- プラン・月額・税・通貨
- 請求日・更新日
- 支払方法
- 対象ブランド・対象チーム
- 標準範囲と明示的除外
- 同時進行枠
- AI・セキュリティ・機密条件
- 編集可能ファイルの扱い
- 承認者
- 予定Start Date
- 利用規約URL・版

### Step 4: Contract and payment

契約成立条件:

1. Service Order合意
2. 利用規約への合意
3. 初月料金の着金

上記が完了するまで制作枠は確保しない。

## 6. Start Dateとオンボーディング

以下がすべて揃った日をProducerがStart Dateとして記録する。

- 契約成立
- ブランドガイド
- ロゴ・フォント・既存素材
- 必要な製品・サイト・アカウントアクセス
- 指定承認者
- 最初の完成ブリーフ
- 必要なAI・機密・法務制限

オンボーディング時に作成するもの:

- Notion client home
- Request database
- Decision log
- Brand and rights register
- Frame.io project
- Google Drive folders
- Billing and renewal record in Twenty

## 7. 依頼ステータス

| Status | Meaning | Active slot |
|---|---|---:|
| Backlog | 未整理または将来の依頼 | No |
| Ready | 必要情報・素材が揃い着手可能 | No |
| Active Production | 制作中 | Yes |
| Internal QA | Paradigm社内確認 | Yes |
| Client Review | 顧客確認待ち | No |
| Blocked | 素材・判断・第三者待ち | No |
| Approved | 顧客承認済み | No |
| Delivered | 最終納品済み | No |
| Archived | 完了または長期停止 | No |

運用原則:

- Active ProductionとInternal QAだけが制作枠を消費する。
- Client ReviewまたはBlockedへ移した時点で次のReady依頼を開始できる。
- フィードバック受領後は即時割込みせず、プラン優先度と現在の制作状況に沿って再配置する。
- Priorityは同じReady条件の他プランより先に次の制作枠へ配置する。

## 8. Ready Definition

次の情報が揃っていない依頼はReadyにしない。

- 目的とKPI
- 対象視聴者
- 掲載媒体
- 希望尺とアスペクト比
- CTA
- 台本または必要なメッセージ
- 支給素材
- 参考動画と「何を参考にするか」
- ブランド・禁止表現
- 法務・権利・プラットフォーム条件
- 承認者
- 希望時期

ProducerはReady変更時に以下を記録する。

- Ready timestamp
- Initial delivery range
- Active-slot requirement
- Count for Essential
- Third-party dependency

## 9. 着手時間と納期

### Standard start target

Ready timestampから原則2営業日以内に、以下のいずれかを実行する。

- 構成・台本作成を開始
- 編集タイムラインを開始
- ストーリーボードを開始
- 不足が判明した場合は具体的なBlock理由を記録

これは完成保証ではない。

### Delivery range

各依頼の初期目安:

- 簡易ショート編集: 2〜3営業日
- 広告・SNS動画: 3〜5営業日
- プロダクトデモ: 3〜7営業日
- 説明動画・複雑なモーション: 5〜10営業日以上

素材、尺、表現、レビュー、第三者依存により更新する。日付変更はワークスペースへ理由とともに記録する。

### Business days

- 日本時間の月曜日から金曜日
- 日本の祝日および事前告知した休業日を除く
- Service Orderで別の営業日カレンダーを定められる

## 10. Essentialの「1本」判定

標準の1本:

- 完成尺60秒以内
- 支給素材中心
- 主要目的1つ
- 主要構成1つ
- 言語1つ
- 主アスペクト比1つ
- 主版からの簡易リサイズ1種を含む

別の1本として数えるもの:

- 異なるフック
- 異なる台本・構成
- 別言語
- 別の尺
- 別キャンペーン
- 異なるCTA
- 大幅な素材差替え
- 複数の広告バリエーション

ProducerがReady時にCountを確定し、顧客へ可視化する。未使用枠は繰り越さない。

## 11. 修正とChange Request

### Revision

合意した目的、台本、構成、クリエイティブ方向の範囲内の調整。

例:

- テロップ修正
- カットタイミング
- 色・音量・BGM調整
- 合意構成内の素材差替え
- 軽微なCTA修正

### New request / Rescope

- 目的変更
- 台本全面変更
- 承認済み方向の撤回
- 新言語
- 新しい尺・キャンペーン
- 新素材による再構築
- 新たな出演者・撮影・高度な3D

Essentialは3 revision rounds。Unlimited/Priorityは合意ブリーフ内のrevision roundsに上限を設けないが、顧客は各回で統合した一つのフィードバックを提出する。

## 12. 制作チェックリスト

### Before production

- Brief Ready
- Source asset rights checked
- Output specs fixed
- Brand guidance linked
- AI/vendor restrictions checked
- Claim and legal review owner identified
- Delivery range posted

### Internal QA

- スペル・字幕・数字・URL
- ブランド色・ロゴ・余白
- 解像度・fps・音量・セーフエリア
- ライセンス記録
- 不要な個人情報・機密情報
- CTA・終了画面
- 各言語の自然さ
- ファイル名と版番号

### File naming

`CLIENT_PROJECT_ASSET_LANGUAGE_RATIO_v01_YYYYMMDD.ext`

例: `ACME_LAUNCH_PRODUCT-DEMO_EN_16x9_v03_20260728.mp4`

## 13. レビュー・承認・納品

1. Review版をFrame.ioへアップロード
2. Notion requestへreview URLと期限を記載
3. 顧客は原則5営業日以内に統合フィードバックまたは承認を提出
4. 修正時はRevisionまたはNew Requestを判定
5. 承認後、最終書き出しをGoogle Drive / Finalへ保存
6. Delivered日時、権利・素材記録、最終URLをNotionへ記録

顧客確認が5営業日を超えた場合、依頼をClient ReviewまたはArchivedとし、次のReady依頼へ進む。

標準納品:

- 合意した最終動画
- 合意した字幕ファイル
- 合意したサムネイルまたは静止画
- 必要に応じたライセンス注記

編集プロジェクト、テンプレート、制作システムはService Orderで明示した場合のみ納品する。

## 14. 知的財産と実績

- 全額支払後、顧客専用の最終成果物についてParadigmが保有する著作権を譲渡する。
- 譲渡には日本著作権法第27条・第28条の権利を明示的に含める。
- Paradigmおよび管理可能な制作担当者は、法令上可能な範囲で著作者人格権を行使しない。
- 第三者素材、顧客素材、既存テンプレート、ノウハウ、ワークフロー、汎用部品は譲渡対象外。
- 実績掲載は必ず事前書面承認を取得する。

## 15. AI利用

契約前に確認する。

- AI使用可否
- 禁止ベンダー
- 入力データの機密区分
- 学習利用禁止要件
- データ所在地
- 生成音声・人物・商標の利用条件
- 人間による最終QA要件

使用した主要AIサービスと生成素材の扱いを権利台帳へ記録する。AIのみで生成された要素の独占性や権利保護可能性は保証しない。

## 16. Billing Operations

### New customer

- Service Order accepted
- Invoice issued
- Payment cleared
- Subscription or next invoice date recorded
- Capacity reserved
- Start Date recorded after onboarding complete

### Renewal

- Stripe subscription: 自動決済結果を確認
- Invoice payment: 更新日前に請求、着金を確認
- 未払い: 制作停止、顧客連絡、CRMとSlackへ記録

### Plan change

- Upgrade: capacity確認 → 差額請求 → 適用日記録
- Downgrade: 次回更新日へ予約
- Cancellation: 次回更新日で終了、最終納品・アクセス終了日を記録

返金・日割りはService Orderまたは法令に別段の定めがある場合のみ。

## 17. CRM Fields

Twentyで最低限保持する。

- Lead / Account / Contact
- Intent: `video-as-a-service`
- Plan
- Monthly fee
- Monthly demand
- Asset readiness
- Preferred start
- Qualification score/tier
- Fit status
- Service Order status
- Payment status
- Start Date
- Renewal date
- Cancellation effective date
- Client owner
- Paradigm owner
- Workspace URLs
- Active requests count
- Risk / hold reason

## 18. Daily and Weekly Cadence

### Daily producer review

- 新規申請
- Readyで48時間に近い依頼
- Active Productionの期限
- Client Review 3営業日超
- Blocked理由
- 支払・更新アラート
- Priorityの空き枠

### Weekly client update

- Delivered this week
- Active now
- Waiting on client
- Next Ready requests
- Risks and decisions
- Capacity recommendation

### Monthly review for Priority

- 制作本数と種類
- レビュー往復回数
- ボトルネック
- 再利用可能なフォーマット
- 次月キャンペーン
- プラン適合性

## 19. Quality, Incidents, and Backup

- SourceとFinalは顧客別にアクセス分離する。
- 退職・契約終了した担当者のアクセスを即時削除する。
- 誤共有・機密漏えいのおそれは制作を停止し、社内責任者へ即時通知する。
- 最終成果物と契約・ライセンス記録は契約終了後90日を標準保管期間とし、Service Orderで変更できる。
- 顧客へ納品後は顧客自身でも最終データを保存するよう案内する。

## 20. Launch Checklist

- [ ] 日本語・英語サービスページ公開
- [ ] 3プラン・FAQ・利用規約公開
- [ ] VaaS専用申込フォーム稼働
- [ ] CRM・SlackでVaaS intentとplanを確認
- [ ] Service Orderテンプレート確定
- [ ] Client Briefテンプレート確定
- [ ] Stripe商品・Price作成
- [ ] Wise / bank / USDC請求手順確定
- [ ] Notion client workspace template作成
- [ ] Frame.io project template作成
- [ ] Google Drive folder template作成
- [ ] 初回営業用ポートフォリオ3〜6本準備
- [ ] 弁護士による利用規約・Service Orderレビュー
