# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Video Factory Commercial Studio + Direct Growth

- Commercial Studioは`Kinetic Type`、`Product Spotlight`、`UI Focus`、`Data Proof`、`Social CTA`の5テンプレート、拡張Brand Kit、音声/BGM/字幕、Storyboard差分再生成を本番提供済み。PR **#654**、本番deployment **d6u37wcjeje7wqq7i8o3qfdl**、Postgres 5テーブルのRLS/FORCE RLS/最小権限を確認済み。
- 代理店・ホワイトラベルへ過度に依存しない獲得経路として、Studio案件からX、Instagram Reels、LinkedIn、コールドメール埋め込みの4媒体クリエイティブを一括作成するDirect Growth OSを実装した。媒体別尺・縦横比・コピー上限・Studio deliverable紐付けを台帳化した。
- キャンペーン、媒体variant、append-only監査eventの3テーブルとRPCを追加した。全テーブルはRLS/FORCE RLS、anon/authenticated権限なし、service-role最小権限。Studio最終承認、4媒体レビュー準備、人間承認、将来日時指定の順に状態遷移を強制する。
- `/ja/admin/video-growth`と`/api/sales/video-growth`にKPI、30秒更新、loading/empty/error、キャンペーン作成、コピー編集、承認、配信予定、手動公開URL、累積成果入力、監査ログを実装した。全mutationはDBベル+Slackへ通知する。
- X/Instagram/LinkedIn/メールへの外部送信機能は意図的に持たせず、人間承認後に実際の公開URLだけを記録する。未保存コピーのレビュー移行、未承認配信、指標の巻き戻し、納品物不一致、revision競合はDB/APIの両方で拒否する。
- migration runner、DB verifier、release-doctor、Video Factory CIへ配線済み。対象ESLint警告0、TypeScript、workflow/API Vitest **7件**、Next.js production build **564ページ**、Playwright PC/390×844 mobileをpass。

## CURRENT STATUS — Parallel production initiatives

- Pet Life Movie OSS wrapper SaaS MVPはPR **#649/#653**で本番反映済み。5テーブルのRLS/FORCE RLS、private R2、匿名preview/shareをread-back済み。renderer URLとStripe Price 3件が揃うまで有料注文はfail-closedで無効。
- Content API + x402 Wave 1は公開catalog、3つのbilingual decision product、USDC payment middleware、CORS/discovery、RLS台帳を実装済み。production releaseとpublic/402/paid read-backが次のgate。
- Japan market operator Wave 1はcase/memo/evidence/review manual、Opportunity Brief board、RLS台帳を実装済み。外部送信は0件を維持し、人間確認済み案件だけpermission-firstで扱う。
- Tiny Shops Shopify Operations OSは12商品、content、daily metrics、管理画面/API/通知と本番DBを実装済み。Shopify資格情報がapproved secret storeへ入るまで未接続表示を維持する。
- Quote Recovery vertical SaaS validation sliceはno-login CSV診断、候補ランキング、pilot inquiry、aggregate-only RLS台帳を実装済み。実利用・pilot conversion・週次反復を確認してからtenant/auth/billingへ進む。
- Video Factory主要OSS実行基盤は40 profile、固定revision/license/reviewer gate、単一managed GPUのjob-scoped lifecycleを本番提供済み。未設定worker、未審査weight、非商用、24GB超過は理由付きで選択不能を維持する。

## ACTIVE HANDOFF

- Direct Growth: PR CIの`direct-growth`、Video Factory test、production-containerをpassさせ、mainへsquash mergeする。
- Direct Growth: canonical `npm run release:prod`でmigrationを適用し、3テーブルのRLS/FORCE RLS、anon/authenticated grant 0、service-role policy/RPCをread-backする。
- Direct Growth: 本番`/ja/admin/video-growth`認証redirect、`/api/sales/video-growth`未認証401と認証200、4媒体、外部送信controlなし、DBベル+Slackを確認する。検証用の架空キャンペーンや外部投稿は作成しない。
- Japan operator: CHEFCLEAN→HOLENの順に証拠・memo・人間承認gateを完了し、送信と返信をaudit eventへ記録する。契約・表示・規制判断はreview triggerに従う。
- Tiny Shops: canonical release後に管理画面、認証gate、API 401、商品12件、RLS、DBベル+Slackを本番read-backする。
- Video Factory: 管理GPUは既存instance **46258780**のみ。新GPUを作成せず、本番生成中だけ起動し、完了・失敗時にactive run/lease 0なら停止する。Vast API出力へ秘密値を含めない。
- VaaS: Stripe 3商品、Notion/Frame.io/Drive template、初回portfolio、利用規約/Service Orderの日本法レビューを完了してから商用運用を拡張する。

## RELEASE REFERENCES

- Direct Growth branch: `feat/video-direct-growth`
- Video Factory Commercial Studio: PR **#654** / deployment **d6u37wcjeje7wqq7i8o3qfdl**
- Video Factory OSS runtime: PR **#642** / main **b2163b0a** / deployment **ofw2znwsajogrgadwsz0mkjp**
- Pet Life Movie: PR **#649/#653** / main **22c40b84/879870d9**
- Quote Recovery validation: migration `migration_059_quote_recovery_validation.sql`
