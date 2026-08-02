# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Video Factory Commercial Studio + Direct Growth

- Commercial Studioは5テンプレート、拡張Brand Kit、音声/BGM/字幕、Storyboard差分再生成を本番提供済み。PR **#654**、deployment **d6u37wcjeje7wqq7i8o3qfdl**、5テーブルのRLS/FORCE RLS/最小権限を確認済み。
- Studio案件からX、Instagram Reels、LinkedIn、コールドメール埋め込みの4媒体クリエイティブを一括作成するDirect Growth OSを実装した。媒体別尺・縦横比・コピー上限・Studio deliverable紐付けを台帳化した。
- キャンペーン、媒体variant、append-only監査eventの3テーブルとRPCをservice-role最小権限で追加した。Studio最終承認、4媒体レビュー準備、人間承認、将来日時指定の順に状態遷移を強制する。
- `/ja/admin/video-growth`と`/api/sales/video-growth`にKPI、30秒更新、loading/empty/error、作成、編集、承認、配信予定、手動公開URL、累積成果、監査ログを実装し、全mutationをDBベル+Slackへ通知する。
- 外部投稿・メール送信機能は意図的に持たせない。未保存コピーのレビュー移行、未承認配信、指標の巻き戻し、納品物不一致、revision競合はDB/APIで拒否する。
- PR **#665**。ESLint警告0、TypeScript、Vitest **7件**、Next.js build **564ページ**、Playwright PC/390×844 mobile、release-doctor、PR CI 3 jobsをpass。

## CURRENT STATUS — 2026-08-02 SERICIA Shopify storefront

- Shopify Admin、独自ドメイン、`Tableware` / `Craft` / `Living` / `Gifts` collectionを設定済み。未公開テーマ `SERICIA WoodMart OS2 - Development`（ID `144315482160`）にOS2 storefrontを反映し、公開Riseテーマとpassword保護は変更していない。
- merchant app `SERICIA BASE Sync` は商品・在庫・locationの最小5 scopeでinstall済み。Shopify client credentialsをapproved referenceとCoolifyへ安全に反映し、24時間token exchange、5 scope、active locationをAdmin APIでread-backした。
- BASE OAuth、暗号化token保存、pagination、draft-only `productSet` upsert、在庫同期、dry-run/apply UI、履歴、エラー可視化、通知、service-role-only RLSを実装し、migration `20260802153000_shopify_base_sync.sql` を本番適用済み。自動公開と自動削除は無効。
- PR **#657**は最新mainを統合中。BASE Developersは未ログインのためclient ID/secret未取得で、BASE OAuth・dry-run・実商品同期のみ保留する。重量、配送、対象国、税務が確定するまでJapan以外のMarkets等は変更しない。

## CURRENT STATUS — 2026-08-02 Japan Market Operator Operations OS

- Wave 1案件ボードを、候補収集から契約・請求・SKU・成果物・変更管理・月次精算・KPI・インシデント・終了処理まで扱う実務OSへ拡張した。offer snapshotは不変で保持する。
- 認証済みserver principalから担当者・役割・承認者を記録し、案件の直接更新は禁止。revision付きRPCだけが監査eventと原子更新を作成する。
- 外部送信は中央guardでfail-closedとし、案件・宛先・チャネル・本文SHA-256が完全一致する一回限りの承認だけを送信直前に消費する。dry-runは承認を消費せず、配信停止は全経路へ適用する。
- DocuSealは送信しない下書きだけを冪等作成し、Stripe webhookは支払証跡、請求、30日以内の検証費用控除を冪等記録する。
- SQL chainのtransaction再生、直接UPDATE拒否/RPC更新、TypeScript、ESLint、Vitest 24件、品質guard、production build、認証付きPlaywrightをpass。PR **#666**はmain **cf105607**へ反映済みで、外部送信0件を維持している。

## CURRENT STATUS — 2026-08-02 Content API + Pet Life Movie

- Content APIは公開CORS catalog、全文JSON/Markdown、3つの有料decision packetを日英配信する。PR #659、fix #660-#662、deployment `lbxrxhx5vpcyvpolyzusi8qe`はhealthy。x402は財務承認までHTTP 503でfail-closed、無料APIは継続する。
- Pet Life Movieは公式Stripe、署名webhook、冪等checkout/render、返金、Resend、承認gate、private R2納品、削除、30/90日retentionを実装。本番migration/RLS、release **30730953842**、deployment **sdldvalovxfxubub7z13edbn**、公開smokeを確認済み。
- Pet paid renderはlive Stripe secret/webhook/3 Price IDsとResendが揃うまで無効。実購入・返金・納品証跡が市場公開前に必要。

## ACTIVE HANDOFF

- Direct Growth: PR **#665**をmainへsquash mergeし、canonical releaseでmigrationを適用する。3テーブルのRLS/FORCE RLS、anon/authenticated grant 0、service-role policy/RPCをread-backする。
- Direct Growth: 本番管理画面の認証redirect、API未認証401/認証200、4媒体、外部送信controlなし、DBベル+Slackを確認する。架空キャンペーンや外部投稿は作成しない。
- SERICIA: canonical release後に本番Shopify接続、未接続BASE表示、テーマpreviewを確認する。BASE API app取得後にOAuth・dry-run・draft同期・価格/在庫read-backを完了する。
- Japan operator: canonical release後にDB RLS/権限/RPC、認証API、管理画面fingerprint、dry-run許可、未承認live送信拒否を本番確認する。運用開始はCHEFCLEAN→HOLENの順で、中央guardを迂回しない。
- x402: 財務承認後にsecretをapproved storeへ設定し、0.25 USDC実購入、settlement、paid delivery、hashed reference、DBベル、Slackを確認する。
- Pet Life Movie: 市場公開前に承認済みCloudflare API tokenをローテーションする。ローカル診断出力に露出した旧tokenは安全とみなさない。
- Video Factoryは既存の承認済みGPUだけを使用し、既定で追加GPUを作成しない。

## RELEASE REFERENCES

- Direct Growth: PR **#665** / branch `feat/video-direct-growth`。
- SERICIA Shopify storefront and BASE sync: PR **#657**。
- Japan operator OS: PR **#666** / main **cf105607**。
- Content API: PR **#659**、fixes **#660-#662**、deployment `lbxrxhx5vpcyvpolyzusi8qe`。
- Pet Life Movie: PR **#664**、release **30730953842**、deployment **sdldvalovxfxubub7z13edbn**。
- Previous detailed archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`。
