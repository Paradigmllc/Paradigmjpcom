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
- PR **#657**をmain `ad3e6d2b`へsquash mergeし、Coolify deployment `p4vhvcggml1qcnqt22u5wv3e` はfinished。post-deploy doctor、公開smoke、本番管理APIを通過し、Shopify configured、API `2026-07`、商品管理行12件をread-backした。BASE Developersは未ログインのためclient ID/secret未取得で、BASE OAuth・dry-run・実商品同期のみ保留する。重量、配送、対象国、税務が確定するまでJapan以外のMarkets等は変更しない。
- 実商品同期前のhardeningとして、BASE/Shopifyの429・一時5xx再試行、Shopify THROTTLED再試行、重複バリエーション名の正規化、DB advisory lockによる同時実行拒否、30分超の中断run回収、実行中/待機/失敗のUI表示を実装。ESLint警告0、Vitest 5ファイル18件pass。全体TypeScript検査はローカル資源競合で10分timeoutしたためPR CIで最終判定する。BASE Developersの本人ログイン後にclient ID/secretをapproved storeへ反映し、OAuth→dry-run→draft同期を行う。

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

## CURRENT STATUS — 2026-08-02 Content API + Pet Life Movie

- Content APIは公開CORS catalog、全文JSON/Markdown、3つの有料decision packetを日英配信する。PR #659、fix #660-#662、deployment `lbxrxhx5vpcyvpolyzusi8qe`はhealthy。x402は財務承認までHTTP 503でfail-closed、無料APIは継続する。
- Pet Life Movieは公式Stripe、署名webhook、冪等checkout/render、返金、Resend、承認gate、private R2納品、削除、30/90日retentionを実装。本番migration/RLS、release **30730953842**、deployment **sdldvalovxfxubub7z13edbn**、公開smokeを確認済み。
- Dependency security gateはPR **#669** / main **d40eef47**へ反映済み。Next.js `16.2.12`、Sharp `0.35.3`（Next.js配下もdedupe）、full `npm audit` 0 vulnerabilities、552/552 production build、Pet TypeScript/Vitest 9/9、Linux validation run **30732125162**を通過した。
- 最新の稼働コンテナはmain **2a036780**（`d40eef47`を包含）でhealthy。Coolify deployment **uiu3j3imc8sq9zero80nnlhi**はfinished。Pet page/renderer ready、anonymous create 201、owner load 200、delete 200、deleted read-back 404を再確認し、検証projectは削除した。checkoutは引き続きfail-closed。
- Pet paid renderはlive Stripe secret/webhook/3 Price IDsとResendが揃うまで無効。実購入・返金・納品証跡が市場公開前に必要。

## ACTIVE HANDOFF

- Direct Growth: PR **#665**をmainへsquash mergeし、canonical releaseでmigrationを適用する。3テーブルのRLS/FORCE RLS、anon/authenticated grant 0、service-role policy/RPCをread-backする。
- Direct Growth: 本番管理画面の認証redirect、API未認証401/認証200、4媒体、外部送信controlなし、DBベル+Slackを確認する。架空キャンペーンや外部投稿は作成しない。
- SERICIA: Shopify接続、本番のBASE fail-closed表示、draft theme previewを確認済み。BASE API app取得後にOAuth・dry-run・draft同期・価格/在庫read-backを完了する。
- Japan operator: production releaseとDB/API/UI/送信guardのread-backは完了。実運用はCHEFCLEAN→HOLENの順に証跡・memo・人間承認を揃え、別担当者が完全一致の一回限り許可を承認する。中央guardを迂回せず、同じ案件IDへ全記録を保存する。
- x402: 財務承認後にsecretをapproved storeへ設定し、0.25 USDC実購入、settlement、paid delivery、hashed reference、DBベル、Slackを確認する。
- Pet Life Movie: 市場公開前に承認済みCloudflare API tokenとCoolify API tokenをローテーションする。ローカル診断出力に露出した旧tokenは安全とみなさない。
- Pet Life Movie: live Stripe secret/webhook/3 Price IDsとResendをapproved secret storeへ設定後、実購入・署名webhook・render・承認・納品・返金を一度通し、checkoutを有効化する。
- Video Factoryは既存の承認済みGPUだけを使用し、既定で追加GPUを作成しない。

## RELEASE REFERENCES

- Direct Growth: PR **#665** / branch `feat/video-direct-growth`。
- SERICIA Shopify storefront and BASE sync: PR **#657** / main `ad3e6d2b` / deployment `p4vhvcggml1qcnqt22u5wv3e`。
- Japan operator OS: PR **#666** / main `cf105607` / GitHub run `30731931603` / Coolify deployment `p4vhvcggml1qcnqt22u5wv3e`。
- Content API: PR **#659**、fixes **#660-#662**、deployment `lbxrxhx5vpcyvpolyzusi8qe`。
- Pet Life Movie: PR **#664** / **#669**、validation **30732125162**、main **d40eef47**、live container **2a036780**、deployment `uiu3j3imc8sq9zero80nnlhi`。
- Previous detailed archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`。
