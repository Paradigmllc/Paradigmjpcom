# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 SERICIA Shopify storefront

- Shopify Admin、独自ドメイン、`Tableware` / `Craft` / `Living` / `Gifts` collectionを設定済み。未公開テーマ `SERICIA WoodMart OS2 - Development`（ID `144315482160`）にOS2 storefrontを反映し、公開Riseテーマとpassword保護は変更していない。
- merchant app `SERICIA BASE Sync` は商品・在庫・locationの最小5 scopeでinstall済み。Shopify client credentialsをapproved referenceとCoolifyへ安全に反映し、24時間token exchange、5 scope、active locationをAdmin APIでread-backした。
- BASE OAuth、暗号化token保存、pagination、draft-only `productSet` upsert、在庫同期、dry-run/apply UI、履歴、エラー可視化、通知、service-role-only RLSを実装し、production migration `20260802153000_shopify_base_sync.sql` を適用済み。自動公開と自動削除は無効。
- PR #657は最新mainを統合中。merge後にcanonical releaseと本番Shopify接続表示を確認する。BASE Developersは未ログインのためclient ID/secret未取得で、BASE OAuth・dry-run・実商品同期のみ保留する。
- 商品重量、配送service、対象国、税務登録が確定するまで、Japan以外のMarkets、配送料、税登録は変更しない。

## CURRENT STATUS — 2026-08-02 Japan Market Operator Operations OS

- Wave 1案件ボードを、候補収集から契約・請求・SKU・成果物・変更管理・月次精算・KPI・インシデント・終了処理まで扱う実務OSへ拡張した。再契約はengagement単位で分離し、offer snapshotは不変で保持する。
- 認証済みserver principalから担当者・役割・承認者を記録する。案件の直接更新は禁止し、revision付きRPCだけが監査eventと原子更新を作成できる。
- 証跡、役割、承認、送信許可、グローバル配信停止、収集ソース、契約、請求、在庫、成果物、変更依頼、会計明細、運用記録、KPI、独占条件、offboarding、retryable outboxをRLS強制・service-role最小権限で永続化した。
- 外部送信は中央guardでfail-closedとし、案件・宛先・チャネル・本文SHA-256が完全一致する一回限りの承認だけを送信直前に消費する。dry-runは承認を消費しない。配信停止は全経路へ適用する。
- DocuSealはメール/SMSを送らない下書きだけを冪等作成し、契約SSOTへリンクする。Stripe webhookは支払証跡、請求、30日以内の検証費用控除を冪等記録する。
- 管理画面に認証主体、証跡gate、完全一致送信申請/承認、契約・請求・SKU・成果物・精算・運用・KPI・終了記録、loading/empty/error状態を追加した。
- SQL全chainを同一transaction内で2回再生してrollbackし、直接UPDATE拒否とRPC更新を本番Postgresで確認した。TypeScript、対象ESLint、Vitest 24件、品質guard 0 error、production build、認証付きPlaywrightを通過した。
- PR **#666** は専用CIと既存CIを通過し、main `cf105607` へsquash merge済み。最新main `ad3e6d2b` のGitHub production run `30731931603` / Coolify deployment `p4vhvcggml1qcnqt22u5wv3e` はfinished/healthyで、公開VaaSとVideo Factory検証も成功した。
- 本番で3 migrationを1 transaction適用し、案件5件、engagement番号5件、offer snapshot 5件、追加table 17/17、RLS/FORCE RLS 17/17、anon/authenticated SELECT 0、業務RPC 7/7とservice-role実行権限7/7をread-backした。直接UPDATEはDB triggerが拒否した。
- 認証案件APIとworkspaceはHTTP 200（5案件・5 event・14 collection）、管理画面は実ブラウザで見出し・外部送信0・完全一致guard・5 workspace buttonを確認した。dry-runは200、未承認live試行は409で案件紐付き拒否。post-deploy doctorも全gate通過し、外部ブランドへの送信は0件を維持した。

## CURRENT STATUS — 2026-08-02 Content API + x402 Wave 1 released

- 公開CORS APIでcatalog、全文JSON/Markdown、3つの有料decision packetを日英配信する。実装PR #659、release修正 #660/#661/#662。
- 本番main `ba86ab9deb6c8d0f9b03dbb93cbcf0c2840896f4`、Coolify deployment `lbxrxhx5vpcyvpolyzusi8qe` はfinished/healthy。
- `content_products` 6 active、`content_access_events` 8 verification / 0 paid。両tableはRLS/FORCE RLS、PUBLIC/anon/authenticated grant 0、service-role policyのみ。
- x402は受取addressとCDP facilitatorの財務承認までHTTP 503でfail-closed。無料APIは継続する。

## CURRENT STATUS — 2026-08-02 Pet Life Movie market-ready

- 公式Stripe SDK、署名webhook、冪等checkout/render、失敗・返金、Resend配信、承認gate、private multi-format R2納品、管理link、削除、30/90日retentionを実装した。
- 専用Video Factory laneは署名済みR2入力、提供写真に忠実なFFmpeg render、9:16/16:9/1:1出力、draft/final人間承認を強制する。
- migration `20260802020742_pet_life_movie_market_ready.sql` は本番適用済み。deliverablesはRLS/FORCE RLS、anon/authenticated grant 0、service-role policyとone-active-render indexを確認した。
- PR #664をmain `7eb0f92f`へsquash mergeし、GitHub release `30730953842` / Coolify `sdldvalovxfxubub7z13edbn` は成功。公開smokeとowner作成・取得・削除・cleanup確認も通過した。
- paid renderはlive Stripe secret/webhook/3 Price IDsとResendが揃うまで無効。実購入・返金・納品証跡が市場公開前に必要。

## ACTIVE HANDOFF

- SERICIA: PR #657をmerge・canonical releaseし、本番管理画面のShopify接続、未接続BASE表示、テーマpreviewをread-backする。BASE Developersログイン後にAPI appを作成し、OAuth・dry-run・draft同期・価格/在庫read-backを完了する。
- Japan operator: production releaseとread-backは完了。実運用はCHEFCLEAN→HOLENの順に進め、検証済み中央guardと案件台帳を使う。
- Japan operator運用開始時はCHEFCLEAN→HOLENの順に証跡・memo・人間承認を完了し、別担当者が完全一致の一回限り許可を承認する。中央guardを迂回せず、同じ案件IDへ全記録を保存する。
- x402: 財務承認後に必要環境変数を承認済みsecret storeへ設定し、0.25 USDCの実購入、settlement、paid delivery、hashed payment reference、DB bell、Slackを確認する。
- Pet Life Movie: 市場公開前に承認済みCloudflare API tokenをローテーションする。ローカル診断出力に露出した旧tokenは安全とみなさない。
- Video Factoryは既存の承認済みGPUだけを使用し、既定で追加GPUを作成しない。

## RELEASE REFERENCES

- SERICIA Shopify storefront and BASE sync: PR #657。
- Japan operator OS: PR #666、main `cf105607`、GitHub run `30731931603`、Coolify deployment `p4vhvcggml1qcnqt22u5wv3e`。
- Content API: PR #659、release fixes #660/#661/#662、deployment `lbxrxhx5vpcyvpolyzusi8qe`。
- Pet Life Movie: PR #664、GitHub release `30730953842`、deployment `sdldvalovxfxubub7z13edbn`。
- Previous detailed archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`。
