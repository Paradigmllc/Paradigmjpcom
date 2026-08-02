# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Foreign Investor pSEO + GEO

- 海外投資家向け英語decision brief 12本を`content_products`のservice-role-only DB台帳へ追加した。不動産・宿泊・データセンター・再エネ・中小企業M&A・スタートアップ・FDI審査・会社設立を、一次情報、key facts、downside risks、decision gates、チェックリスト、FAQ、方法論、更新日で構造化する。
- `/en/japan-opportunities/invest`、12詳細ページ、11の意味のあるA/B比較ページを実装した。任意比較はAPIで動的提供するが、distinct intentを持つcurated pair以外はnoindexとし、scaled content abuseを防ぐ。
- 各詳細ページへ、固有チェックリスト・判断ゲート・リスクから即時計算するEvidence Readiness Toolを実装した。入力はブラウザ内のみで、投資リターン予測として扱わない。
- JSON/Markdown API、比較API、pSEO factory manifest、汎用Content API統合、CORS、rate limit、DBアクセス監査を実装した。12テーマ×47都道府県×5投資家タイプ×12言語と地域比較で189,504候補をモデル化し、一次情報・固有意図・動的ツール・canonical・人手翻訳レビューを通過したものだけ公開可能にする。
- SEO/GEOは英語canonical、非英語からの恒久redirect、index/noindex gate、Article/CollectionPage/Breadcrumb JSON-LD、DB駆動sitemap、robotsのOAI-SearchBot/ChatGPT-User許可、`llms.txt`、一次情報citationを実装した。
- migration `20260802043347_foreign_investor_pseo.sql`は12シード、content type制約、検索index、RLS最小権限を含む。release scriptはmigration、12件・品質契約・anon/authenticated SELECT拒否、本番ページ/API/factory/llms/sitemap fingerprintを自動検証する。
- ローカル検証はTypeScript 0件、ESLint 0警告、Vitest 9/9、品質guard 0エラー、Next.js production build 587 static pagesをpass。DB公開URLを落とさないため`sitemap.xml`はdynamic routeとして確認済み。release doctorはcommit前のdirty/untracked 2項目以外をpassした。

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
- PR **#657**をmain `ad3e6d2b`へsquash mergeし、Coolify deployment `p4vhvcggml1qcnqt22u5wv3e` はfinished。post-deploy doctor、公開smoke、本番管理APIを通過し、Shopify configured、API `2026-07`、商品管理行12件をread-backした。BASE Developersは未ログインのためclient ID/secret未取得で、BASE OAuth・dry-run・実商品同期のみ保留する。重量、配送、対象国、税務が確定するまでJapan以外のMarkets等は変更しない。

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
- Dependency security gate: Next.js `16.2.12`、Sharp `0.35.3`（Next.js配下もdedupe）、full `npm audit` 0 vulnerabilities、production build 552/552、Pet TypeScript/Vitest 9/9、Linux CIを確認した。PR #669のmerge・本番再smoke待ち。

## ACTIVE HANDOFF

- Foreign Investor pSEO: `codex/foreign-investor-pseo`の検証、PR、canonical release、本番read-backを完了する。候補189,504件を一括index化せず、地域固有データと翻訳レビューが揃ったwaveだけを公開する。
- Direct Growth: PR **#665**をmainへsquash mergeし、canonical releaseでmigrationを適用する。3テーブルのRLS/FORCE RLS、anon/authenticated grant 0、service-role policy/RPCをread-backする。
- Direct Growth: 本番管理画面の認証redirect、API未認証401/認証200、4媒体、外部送信controlなし、DBベル+Slackを確認する。架空キャンペーンや外部投稿は作成しない。
- SERICIA: Shopify接続、本番のBASE fail-closed表示、draft theme previewを確認済み。BASE API app取得後にOAuth・dry-run・draft同期・価格/在庫read-backを完了する。
- Japan operator: canonical release後にDB RLS/権限/RPC、認証API、管理画面fingerprint、dry-run許可、未承認live送信拒否を本番確認する。運用開始はCHEFCLEAN→HOLENの順で、中央guardを迂回しない。
- x402: 財務承認後にsecretをapproved storeへ設定し、0.25 USDC実購入、settlement、paid delivery、hashed reference、DBベル、Slackを確認する。
- Pet Life Movie: 市場公開前に承認済みCloudflare API tokenをローテーションする。ローカル診断出力に露出した旧tokenは安全とみなさない。
- Pet Life Movie: PR #669をmerge・canonical releaseし、exact commitでreadyとanonymous create/load/deleteを再確認する。
- Video Factoryは既存の承認済みGPUだけを使用し、既定で追加GPUを作成しない。

## RELEASE REFERENCES

- Foreign Investor pSEO: branch `codex/foreign-investor-pseo` / PR・deploymentはrelease完了後に追記する。
- Direct Growth: PR **#665** / branch `feat/video-direct-growth`。
- SERICIA Shopify storefront and BASE sync: PR **#657** / main `ad3e6d2b` / deployment `p4vhvcggml1qcnqt22u5wv3e`。
- Japan operator OS: PR **#666** / main **cf105607**。
- Content API: PR **#659**、fixes **#660-#662**、deployment `lbxrxhx5vpcyvpolyzusi8qe`。
- Pet Life Movie: PR **#664**、release **30730953842**、deployment `sdldvalovxfxubub7z13edbn`。
- Previous detailed archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`。
