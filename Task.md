# Paradigmjpcom Task

## CURRENT STATUS - 2026-08-03 SERICIA commercial launch control

- Implemented a truthful 12-gate commercial launch control across Shopify Admin reachability, storefront availability, BASE/OAuth source connection, inventory-sync freshness, real Shopify catalog count, 14-point product evidence, payment proof, real checkout E2E, shipping/tax/returns policy proof, supported social connector health, daily social-run freshness, and explicit public-release approval.
- Added the authenticated `/api/shopify-ops/launch/audit` scheduler endpoint and six-hour GitHub Actions workflow. Every run persists a complete fingerprinted snapshot; DB bell and Slack notifications fire only when the gate state changes, while unchanged blocks remain auditable without notification spam.
- Added a service-role-only `shopify_launch_audit_runs` append-only ledger with RLS and FORCE RLS. Anonymous and authenticated roles have no grants; the release path automatically applies the migration and verifies the table exists.
- Added a dedicated ローンチ tab and replaced the overview's aspirational checklist with current evidence gates, blocker details, Shopify/eligible product counts, storefront lock state, manual re-audit, and audit history.
- Safety remains fail-closed: verification flags default false, public release requires explicit runtime approval plus proof that password protection is removed, and the current password-protected storefront is treated as a healthy pre-launch safety lock. No product, payment, policy, or connector state is fabricated.
- PR #711 is merged and production deployment `hxumws4uga24gktc83k9xd96` is healthy at main `ee5beb80`. The migration is applied in production; read-back confirms RLS/FORCE RLS, no anon/authenticated SELECT, and service-role SELECT/INSERT only after removing inherited UPDATE/DELETE grants.
- Authenticated production canary `1652126e-aa51-4f18-abca-e8a7a06cb42d` returned HTTP 200 `blocked` with 1/12 gates ready, persisted the snapshot, and delivered both DB bell and Slack notification. `sericia.com` remains 302 to `/password`; unauthenticated launch audit returns 401.
- Local verification passed: 7 focused Vitest files / 26 tests, repository-wide TypeScript, targeted ESLint, release-doctor static migration/RLS wiring, `git diff --check`, and the 648-page Next.js production build. GitHub CI and the exact production container passed.
- ACTIVE HANDOFF: merge the least-privilege migration correction and re-run its production read-back. Shopify Admin credentials currently lack `read_products` and `read_inventory`; BASE Developers/OAuth, real products, payments, checkout, policies, and supported social credentials also remain blocked. Commercial launch stays password-protected until all evidence exists.

## CURRENT STATUS - 2026-08-03 Pet Life Movie global growth launch

- Implemented a service-role-only, RLS/FORCE-RLS marketing ledger for campaigns, regional runs, channel posts, retries, publishing outcomes, and privacy-safe attribution events. The seeded launch covers Japanese, English, Spanish, and Portuguese across JP, AU, GB, ES, PT, US, MX, and BR.
- Added deterministic localized content planning and UTM links for APAC, Europe, and Americas. Instagram Business and Pinterest Business can publish directly with Pet-specific credentials; TikTok and YouTube remain draft-only until their public publishing audits are complete. Missing connectors fail closed without losing the generated launch queue.
- Added the authenticated `/ja/admin/pet-life-movie-growth` command center with 30-day funnel KPIs, connector health, regional manual runs, campaign pause/resume, run history, and the content flight board. Mutations emit DB bell and Slack notifications.
- Added LP attribution for page view, hero/experience CTA, wizard start, project creation, preview creation, and checkout start. Only a salted anonymous hash, referrer hostname, path, locale, market, and UTM fields are retained through a rate-limited API.
- Added `.github/workflows/pet-life-movie-global-growth.yml` for three daily global windows and an authenticated daily API with idempotent run/post keys, bounded retries, no duplicate publishing, and no public database grants.
- PR #707 is merged at main `96b01662`; GitHub CI and Coolify deployment `i12m47f4xi35mx7p8n6o0aak` passed. The production LP returns 200 with the attribution marker, unauthenticated daily/status APIs return 401, and a valid anonymous attribution event returns 204 and persists. The growth migration is applied in production with all four tables under FORCE RLS and service-role-only access.
- Production canaries generated 3 APAC, 3 Europe, and 4 Americas posts. The DB contains three idempotent regional runs and ten posts (six scheduled direct-channel items and four draft-only audit-gated items); all runs stopped `blocked` with zero external publishing because Pet-specific Instagram/Pinterest credentials are absent. Re-running APAC reused the same run key and retained three generated items. DB bell and Slack notification delivery passed.
- GitHub Actions workflow run `30767879111` completed successfully against main and exercised the authenticated scheduler-to-production-API path. The canonical release scripts are now being hardened so future deployments automatically apply and verify this migration instead of relying on a one-time production application.
- ACTIVE HANDOFF: merge and deploy the release-wiring hardening, then repeat the production browser/release gates. Keep Instagram/Pinterest direct publishing fail-closed until approved Pet-specific business credentials exist; keep TikTok/YouTube draft-only until their public posting audits are complete. Worldwide scheduling, localized drafts, retries, attribution, and the operator command center are live.

## CURRENT STATUS - 2026-08-03 SERICIA semi-automated storefront operations

- Live storefront URL is `https://sericia.com`; it currently redirects to Shopify's password page and remains intentionally non-public. The private operations console is `https://paradigmjp.com/ja/admin/shopify`.
- Live audit confirms Shopify Admin API is healthy but the store has 0 products. The 12 dashboard rows are planning candidates with inventory/evidence gates at 0/14, not saleable catalog items. The 2026-08-03 SNS scheduled run succeeded technically and stopped safely with 0 eligible/generated/published posts.
- BASE is not yet operationally connected: the production dashboard reports Developers app false, OAuth false, linked products 0, and sync-ready false. Instagram/Pinterest are supported but unconfigured; TikTok/YouTube direct publishing stays disabled pending platform review/audit. Shopify Payments/PayPal completion and a real checkout have not been proven, so global business launch remains blocked.
- Added a webhook-authenticated BASE scheduled endpoint plus GitHub Actions workflow every 30 minutes. Normal diffs update Shopify DRAFT products/inventory; unchanged snapshots skip Shopify writes. Zero source items, source-count collapse/spike, missing connections, or concurrent sync stop fail-closed and persist a blocked/failed run.
- Irregular or material-change runs notify both the DB bell and Slack. Repeated identical connection blocks are throttled for 12 hours and failures for 2 hours. Automatic Shopify publication and product deletion remain disabled.
- Admin UI now shows auto-run/safe-stop state, interval, last scheduled run, and manual/automatic history. Validation: 4 focused Vitest files / 16 tests pass, targeted ESLint passes, and `tsc --noEmit` passes. Local full build was stopped after 23 minutes of resource contention with another workspace build; definitive GitHub CI and production build remain the release gate.
- ACTIVE HANDOFF: merge/deploy only after CI passes, then run one authenticated canary and verify its persisted run plus dual notification. Commercial launch remains fail-closed until verified BASE inventory, product evidence/images/rights/export data, payments, shipping/tax/returns checkout tests, and supported social business credentials are present.

## CURRENT STATUS - 2026-08-03 Investor content authority and GEO distribution (production release)

- The public investor catalog remains deliberately quality-gated at 28 English briefs. All 28 now carry at least four sourced analysis chapters; the 12 original national/sector briefs gained 48 unique chapters and 96 unique substantive paragraphs covering basis, regulation, operations, downside and exit. Every original brief has at least 1,100 human-readable words under the visible-content counter.
- The 16-profile Greater Tokyo cluster continues to cover all 23 Tokyo wards through decision-specific submarkets, Tama, Yokohama, Kawasaki, Saitama City, South Saitama, Chiba Bay and outer-Chiba nodes. Market pages retain 2026 MLIT/REINS evidence, responsive Recharts comparison and the browser-local underwriting stress sandbox.
- Web, JSON and Markdown continue to share one service-role-only DB record. The release validates exactly 28 active briefs, four chapters on every brief, valid chapter-to-source references, 16 market datasets, removal of the temporary payload helper and denied anon/authenticated table access.
- The retired Kyoto City PDF deep link is replaced by the maintained official lodging-list landing page. The migration is replay-safe and fails closed if any chapter cites an unknown source or the retired URL remains in stored content.
- Article JSON-LD now reports words from visible prose instead of serialized JSON keys. Dataset JSON-LD adds stable identifiers, catalog membership, creator URL, geographic entities, keywords, measurement method, version and both JSON and Markdown `DataDownload` distributions.
- Every investor brief now has a dynamic 1200x630 Open Graph/Twitter image using its title, summary, region, category and source count. A logged slug-based fallback still returns a branded image if the content database is temporarily unavailable.
- Quality evidence: TypeScript 0 errors; changed-file ESLint 0 warnings; Vitest 19/19; 12 briefs, 48 chapter titles and 96 paragraphs with zero duplicate titles/paragraphs; minimum paragraph length 401 characters; Next.js production build 636/636 pages; local fallback OG HTTP 200 `image/png` and visually verified without clipping.
- The pSEO manifest still models 195,264 candidates, but candidate generation never grants indexability. Distinct intent, unique sourced analysis, canonical ownership, dynamic evidence, source freshness, quality scoring and human translation review remain mandatory gates; there is no automatic thin-page publication path.
- ACTIVE HANDOFF: monitor Search Console index coverage, query clusters, source freshness, JSON/Markdown API consumption and conversion quality. Expand locales and long-tail combinations only through the existing quality gate; rankings are an external outcome and cannot be guaranteed by page count or metadata alone.

## CURRENT STATUS — 2026-08-02 SERICIA global storefront launch gate

- Shopify production readiness was audited against the live store. The store is on Basic, `sericia.com` is the SSL-enabled primary domain, JPY is the only presentment currency, taxes are included, and shipping zones currently cover Japan plus 27 international destinations. Shopify Payments and PayPal both remain incomplete.
- Shopify and BASE each contain exactly 0 products. The existing Tableware, Craft, Living, and Gifts collections therefore remain empty. No placeholder merchandise, fabricated inventory, or unfulfillable listing was published.
- The OS 2.0 draft theme `SERICIA WoodMart OS2 - Development` (theme 144315482160) now includes an original SERICIA Japanese-craft hero image optimized to WebP, improved Liquid/theme-check hygiene, and the existing English global-marketplace navigation, service promises, category grid, and responsive product sections. The updated theme was pushed successfully but intentionally remains unpublished behind the storefront password.
- 商品運用OSへ14項目の公開ゲートを追加した。在庫、現物、仕入先、画像利用権、原産国、HSコード、輸出表示、梱包・出荷テスト、Shopify商品URLが揃わない商品からはSNS投稿を生成しない。
- Instagram/Pinterest向け英語投稿を日次生成し、自動承認ポリシー、時差別予約、公開、3回再試行、失敗履歴、DBベル+Slack通知を一元化した。接続前も下書き生成は継続し、TikTok/YouTubeはアプリ審査・監査完了まで直接公開しない。GitHub Actionsは1日3回、認証付き日次APIを呼ぶ。
- Verification: Shopify CLI remote upload succeeded; Theme Check 0 errors; SNS実装はTypeScript 0件、対象ESLint 0警告、Vitest 4 files / 15 tests、品質ガード0エラー、Next.js production build 636 pagesを通過した。
- ACTIVE HANDOFF: コードはリリース準備完了。事業公開は、実在商品（画像・価格・在庫・原産国/HS・出荷条件）、Shopify Paymentsの代表者/入金口座、Instagram/Pinterest Business認証が揃うまでfail-closedを維持する。入力後はBASE→Shopify DRAFT同期、SNS canary、checkout/配送/税/ポリシー検証、テーマ公開、password解除、JP/US/EUテスト注文の順で実行する。

## CURRENT STATUS — 2026-08-02 Video Factory Studio Scale Readiness

- 既存Studioの実行環境・5テンプレート・10表現種・技術QA・承認ゲート・キュー容量を実測する量産準備度と本番preflightをAPI/GUI/DBへ追加した。本番実測は86/100、Ready 6、Conditional 4、Blocked 0、安全並列1件。Readyはtext motion、UI capture、chart、generative、supplied edit、transition。3D、技術図解、人物アニメーション、lip syncはfallbackのConditionalで、明示指定時は専用runtime/templateが揃うまでfail-closedとし、見た目の品質はドラフト/最終の人間レビューを維持する。
- 機能PR **#690** はmain **e0b7b6c6**、service-role対象RLS修正PR **#692** はmain **4f9917a2**、packaged runtimeの設定パス修正PR **#694** はmain **311bb3ca** へsquash mergeした。PR #694のdirect-growth、全Video Factory tests、実本番container、routing/storageは全件passし、main CI run **30745264493** もpassした。
- migration `20260802203000_video_factory_studio_scale_readiness.sql` を本番へ適用し、append-only table、RLS/FORCE RLS、service-role SELECT/INSERTのみ、anon/authenticated権限なしをread-backした。本番snapshot **37d0477c-ecbd-496f-b1a0-e3218358f4d7** は86/100・6/4/0・並列1として保存され、運用ベル **a770a8ed-728a-4356-bcd6-224561f45fc6** はopen、Slack送信結果trueを確認した。
- Studio機能のlive verificationはmain **87160b18** / deployment **mwbaxk97us1bdubmec11zu2y** で実施した。後続変更を含む現行本番はmain **36c851f7** / deployment **prmiszbs2vyav4z1tanxokp9** で、公開VaaSと埋め込みVideo Factory verificationを再度passし、準備度86/100・6/4/0・並列1を再読取した。本番`/api/video-factory/ready`はready true、390px管理画面は10 capability、横overflowなし、browser error 0。post-deploy release doctorも全項目passした。
- ACTIVE HANDOFF: 基盤は商用カナリア投入可能。最初の承認済み顧客はReady 6表現種を中心に1案件ずつ流し、権利/訴求承認→ドラフトレビュー→最終レビューを維持する。専用3D・人物・lip sync profile/templateと水平workerを追加するまではConditional 4表現種の明示発注と同時並列2件以上を解放しない。

## CURRENT STATUS — 2026-08-02 Foreign Investor pSEO + GEO

- 海外投資家向け英語decision brief 12本を`content_products`のservice-role-only DB台帳へ追加した。不動産・宿泊・データセンター・再エネ・中小企業M&A・スタートアップ・FDI審査・会社設立を、一次情報、key facts、downside risks、decision gates、チェックリスト、FAQ、方法論、更新日で構造化する。
- `/en/japan-opportunities/invest`、12詳細ページ、11の意味のあるA/B比較ページを実装した。任意比較はAPIで動的提供するが、distinct intentを持つcurated pair以外はnoindexとし、scaled content abuseを防ぐ。
- 各詳細ページへ、固有チェックリスト・判断ゲート・リスクから即時計算するEvidence Readiness Toolを実装した。入力はブラウザ内のみで、投資リターン予測として扱わない。
- JSON/Markdown API、比較API、pSEO factory manifest、汎用Content API統合、CORS、rate limit、DBアクセス監査を実装した。12テーマ×47都道府県×5投資家タイプ×12言語と地域比較で189,504候補をモデル化し、一次情報・固有意図・動的ツール・canonical・人手翻訳レビューを通過したものだけ公開可能にする。
- SEO/GEOは英語canonical、非英語からの恒久redirect、index/noindex gate、Article/CollectionPage/Breadcrumb JSON-LD、DB駆動sitemap、robotsのOAI-SearchBot/ChatGPT-User許可、`llms.txt`、一次情報citationを実装した。
- migration `20260802043347_foreign_investor_pseo.sql`は12シード、content type制約、検索index、RLS最小権限を含む。release scriptはmigration、12件・品質契約・anon/authenticated SELECT拒否、本番ページ/API/factory/llms/sitemap fingerprintを自動検証する。
- ローカル検証はTypeScript 0件、ESLint 0警告、Vitest 9/9、品質guard 0エラー、Next.js production build 587 static pagesをpass。DB公開URLを落とさないため`sitemap.xml`はdynamic routeとして確認済み。release doctorはcommit前のdirty/untracked 2項目以外をpassした。

## CURRENT STATUS — 2026-08-02 Video Subscription Commercial Operations

- Direct Growthを、顧客・契約参照・請求状態・月次制作枠・優先度・言語・担当・開始日・納期・SLAをDB/API/GUIで一元管理する商用実務ワークオーダーへ拡張した。契約、請求・入金、制作ブリーフ、ブランド素材、利用権、LP、計測の7項目がpassed/waivedになるまで案件レビューをDBで拒否する。
- 各動画はContent Revision単位の内部品質QAと顧客公開承認を必須化した。依頼者と承認者を分離し、Admin自己承認は20文字以上の根拠を要求する。旧create/transition/update RPCのservice-role実行権限を外し、商用ガードの迂回を防止した。
- 修正依頼、担当、期限、解決記録、日次成果、累計自動再計算、SLA/承認/修正/月次枠KPI、検索・工程絞込、Excel向けCSV（式注入対策）を追加した。外部SNS投稿・メール送信機能は追加していない。
- PR **#680**をmain `4f39e5ab`へsquash mergeし、CI 5/5、local release doctor、ESLint、TypeScript、Vitest 11件、Next.js build 564ページ、Playwright PC/390×844を通過した。本番deployment `x7ct7g60yj8d2ho5wln6xtpm`はfinishedで、対象main commitと一致する。
- 本番へ4 migrationを適用し、新規5テーブルのRLS/FORCE RLS、video growth全8テーブルのservice-role限定policy、anon/authenticated権限0、旧3 RPC権限失効、新商用RPC限定権限、7項目・二段階承認・職務分離・公開ガードをread-backした。8テーブルは全て0件で、架空案件は作成していない。
- 未認証API/CSV 401、認証API/CSV 200、UTF-8 BOM/no-store、管理画面PC/390×844のAPI 200・H1・管理者表示・CSV導線・横overflowなしを確認した。post-deploy doctorもpass。ACTIVE HANDOFF: 実顧客案件は、承認済みStudio案件を選び、契約/請求/素材/権利/LP/計測を確認してから登録する。外部投稿とメール送信は引き続き人間が実行する。

## CURRENT STATUS — 2026-08-02 Hana Creator Video Factory bridge

- Production verified: PR #677/main `1b0b84b1`, Coolify deployment `bq6td1c4coh8kqaxfbbr7z3a`, and the full post-deploy release gate passed. Live dry-run accepted the same Hana UUID twice with one execution and `idempotent_replay`, completed in draft-review state, exposed the constrained artifact list, and left managed Vast.ai instance 46258780 `exited`.
- Security response: the first env import accidentally created a malformed multiline Coolify value and appeared only in a failed build. The bridge and affected Hana automation/media secrets were rotated in approved storage and both runtimes before the successful deployment; the failed value is no longer valid.
- 独立運用中のHana Creatorから、本番Video Factoryへ安全に制作ジョブを投入する専用machine-to-machine bridgeを追加した。Hana専用secret、承認済み参照画像、`hana-<job UUID>` project、生成shot、ローカル納品だけを許可する。
- Hana job UUIDをVideo Factoryのrun IDとして永続化し、タイムアウト再送やworker再起動でも同じジョブを二重生成しない。既存のVast.ai管理GPU 46258780、1 GPU 1 job、商用ライセンス・workflow審査、完了/失敗時停止をそのまま再利用する。
- bridgeはsubmit/status/artifact listと、Hana projectの画像・動画成果物だけを取得できるprivate file proxyを提供する。他project、brief、review JSON、未承認参照画像は拒否する。
- Active handoff: bridge rollout is complete. Keep the Hana runtime on dry-run and series disabled until commercially approved ComfyUI model/workflow profiles and SNS app credentials/audits are ready; activate one SFW canary series before any broader production run.

## CURRENT STATUS — 2026-08-02 Video Factory Commercial Studio + Direct Growth

- Commercial Studioは5テンプレート、拡張Brand Kit、音声/BGM/字幕、Storyboard差分再生成を本番提供済み。PR **#654**、deployment **d6u37wcjeje7wqq7i8o3qfdl**、5テーブルのRLS/FORCE RLS/最小権限を確認済み。
- Studio案件からX、Instagram Reels、LinkedIn、コールドメール埋め込みの4媒体クリエイティブを一括作成するDirect Growth OSを実装した。媒体別尺・縦横比・コピー上限・Studio deliverable紐付けを台帳化した。
- キャンペーン、媒体variant、append-only監査eventの3テーブルとRPCをservice-role最小権限で追加した。Studio最終承認、4媒体レビュー準備、人間承認、将来日時指定の順に状態遷移を強制する。
- `/ja/admin/video-growth`と`/api/sales/video-growth`にKPI、30秒更新、loading/empty/error、作成、編集、承認、配信予定、手動公開URL、累積成果、監査ログを実装し、全mutationをDBベル+Slackへ通知する。
- 外部投稿・メール送信機能は意図的に持たせない。未保存コピーのレビュー移行、未承認配信、指標の巻き戻し、納品物不一致、revision競合はDB/APIで拒否する。
- PR **#665**をmain `f2339929`へsquash mergeし、feature deployment `ghen9whanscvtws0cqndwj5y`と最新live deployment `szv2lqpeybjf476rtqcu6djm`はいずれもfinished、アプリはhealthy。ESLint警告0、TypeScript、Vitest **7件**、Next.js build **564ページ**、Playwright PC/390×844 mobile、PR CI 3 jobsをpass。
- 本番migrationをPostgreSQLへ適用し、3テーブルすべてでRLS/FORCE RLS、service-role限定policy/table grant、anon/authenticated権限0、RPC 3/3のservice-role限定実行権限をread-backした。未認証API 401、認証API 200、管理画面タイトル、readiness 200、キャンペーン/variant/event 0件を確認し、post-deploy doctorもrelease gateをpass。架空キャンペーンと外部送信は作成していない。

## CURRENT STATUS — 2026-08-02 SERICIA Shopify storefront

- Shopify Admin、独自ドメイン、`Tableware` / `Craft` / `Living` / `Gifts` collectionを設定済み。未公開テーマ `SERICIA WoodMart OS2 - Development`（ID `144315482160`）にOS2 storefrontを反映し、公開Riseテーマとpassword保護は変更していない。
- merchant app `SERICIA BASE Sync` は商品・在庫・locationの最小5 scopeでinstall済み。Shopify client credentialsをapproved referenceとCoolifyへ安全に反映し、24時間token exchange、5 scope、active locationをAdmin APIでread-backした。
- BASE OAuth、暗号化token保存、pagination、draft-only `productSet` upsert、在庫同期、dry-run/apply UI、履歴、エラー可視化、通知、service-role-only RLSを実装し、migration `20260802153000_shopify_base_sync.sql` を本番適用済み。自動公開と自動削除は無効。
- PR **#657**をmain `ad3e6d2b`へsquash mergeし、Coolify deployment `p4vhvcggml1qcnqt22u5wv3e` はfinished。post-deploy doctor、公開smoke、本番管理APIを通過し、Shopify configured、API `2026-07`、商品管理行12件をread-backした。BASE Developersは未ログインのためclient ID/secret未取得で、BASE OAuth・dry-run・実商品同期のみ保留する。重量、配送、対象国、税務が確定するまでJapan以外のMarkets等は変更しない。
- 実商品同期前のhardeningとして、BASE/Shopifyの429・一時5xx再試行、Shopify THROTTLED再試行、重複バリエーション名の正規化、DB advisory lockによる同時実行拒否、30分超の中断run回収、実行中/待機/失敗のUI表示を実装。PR **#675**のCI 4 jobs、ESLint警告0、Vitest 5ファイル18件、post-deploy doctorをpass。migration `20260802160000_shopify_base_sync_hardening.sql` を本番適用し、start RPCはSECURITY DEFINER/service-role限定、running 0件をread-backした。最新main `b0a9eca1`（`e9238314`を包含）/ deployment `q80cl9qe9wofsrkwoj440tf4` はfinished/healthy。本番管理APIはShopify configured、API `2026-07`、商品管理12件、BASE未接続・ready falseを返す。BASE Developersの本人ログイン後にclient ID/secretをapproved storeへ反映し、OAuth→dry-run→draft同期を行う。

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

## CURRENT STATUS — 2026-08-01 Video Factory主要OSSエンジン統合（本番release完了）

- Wan既存レーンは維持しつつ、FramePack、SkyReels V2/V3、NVIDIA Cosmos 3、Pyramid Flow、Open-Sora系、VideoCrafter/DynamiCrafterを含む主要な動画生成・人物アニメーション・音声・補正・3D/図解OSS計40プロファイルを、単一の監査可能な台帳へ統合する。モデル重量は常駐・一括取得せず、承認済みプロファイルだけをジョブ単位で遅延ロードする。
- 各プロファイルは公式source、immutable revision、code/model license、商用可否、最低/推奨VRAM、対応shot kind、実行runtime、workflow/model binding、審査者を保持する。未審査、非商用、24GB超過、workflow/model未承認はGUIで理由を表示し、本番実行はfail-closedで拒否する。
- DBはprofile snapshot・選択/実行eventをRLS付きで保存し、APIは認証・入力検証・DBベル+Slack通知を行う。Consoleはcatalogのloading/empty/error、カテゴリ、稼働可否、VRAM、ライセンス、選択結果を可視化する。
- Vast.ai GPUは既存のjob-scoped lifecycleだけを使い、preview・catalog閲覧・審査・設定変更では起動しない。新規GPU作成、常駐polling、暗黙fallback、未承認weight downloadは行わない。
- arm64ネイティブFFmpeg/ffprobeを用いたVideo Factory全71テスト、Ruff、mypy strict（50 source files）、TypeScript、対象Vitest 9件、ESLint、quality guard error 0、release-doctorの新規RLS/release wiring検査、Next.js production buildをpass。全体Vitestは今回変更外の既存`/work`系3 files / 13 testsのみ不一致（1344 pass）。
- 実ブラウザでdesktop/mobileの40 cards、10 shot-kind selector、loading/error、絞り込みを確認し、390px viewportで`scrollWidth == clientWidth == 390`、console error 0。検証中もGPUは起動していない。
- PR **#639**をmain **ca3e3bbe**へsquash mergeし、canonical deployment **wuobqot0ksrotfbckomjhtb1**を完走。新containerは同commit imageでhealthy、公開ready、DB migration、95/95 table、40 profile同期、DBベル+Slackをread-backした。GPU **46258780**は`exited / stopped`、active run/lease 0を維持した。
- 本番read-backで永続workspaceの旧8 workflow契約が、image内18契約より優先される更新漏れを検出した。既存のWan承認済みbindingを一切上書きせず、欠けているbundled契約だけを原子的・冪等に追加するstartup mergeをhotfixした。
- hotfix PR **#640**をmain **d693b28c**へsquash mergeし、canonical deployment **kag5gash9hwzj85mi2rr0yys**を完走。新containerは同commit imageでhealthy。本番registryは18件、追加10件は全てdisabled、既存`abstract-broll-t2v`だけがapproved_bound / enabledでSHA-256とreviewerを維持した。台帳40件を再同期し、event completed、DBベルopen、Slack `slack_ok: true`をread-backした。公開readyは`true`、GPU **46258780**は`exited / stopped`、active run/lease 0、errorなし。

## CURRENT STATUS — 2026-08-01 Video Factory GPUオンデマンド化（本番release完了）

- 管理対象GPUをVast.ai instance **46258780**の1台に固定し、ComfyUIが必要な本番runの開始時だけ自動起動、生成完了・失敗時にproduction runと全workerのGPU leaseが0件なら自動停止するevent-driven lifecycleを実装した。定期polling、予備GPUの自動作成、別instanceへの暗黙切替は行わない。
- dry-run、企画/validation失敗、ComfyUIを使わないroute、draft/final承認、local deliveryではGPUを起動しない。手動startと管理GPUのdestroy/重複createをAPI/UIの両方で拒否し、active runまたはprocess leaseがある間の手動stopも拒否する。
- 複数Prefect/API worker間は`flock` leaseで保護する。rolling deploy前の旧workerもleaseを保持でき、プロセス異常終了後のstale leaseだけを安全に回収する。API再起動時は永続queued/running jobを非冪等再実行せず明示failedへ復旧し、one-shotでidle GPUを停止する。
- lifecycle状態、Vast実状態、run/lease、時給、最終action/error、直近run履歴を管理consoleへ追加した。loading/empty/errorを可視化し、再確認は明示ボタン・接続・タブ選択時のみで、常駐pollingは使わない。
- `gpu_starting` / `gpu_ready` / `gpu_stopped` / `gpu_error`を権限600のevent journalへ永続化し、認証付き内部Next APIから既存`notifyBothChannels`へ渡してDBベル+Slackの両方へ通知する。片方でも失敗した場合は成功扱いにせずjournalへ残す。
- 新規/対象test 28件、Ruff、mypy strict、TypeScript、対象Vitest 5件、ESLint、品質guard error 0、Next.js production buildをpass。PR CIではffmpegを含むVideo Factory全test、production image build、埋め込みruntime/render、routing/storage gateをすべてpassした。
- 作業開始時点で停止していたVast.ai GPU **46258780**を、停止→実runによる自動起動→実生成→自動停止→2段階承認→納品まで本番で通した。納品後と最終release後はいずれも`exited`、active production run/lease 0件へ復帰している。
- 初回release **vnf5ibia5yw7bgj790uyyzju** / main **c1d98f32**はhealthy・公開readyまでpassしたが、旧bootstrap stateが本番workspaceに残っておらず、停止中Vast APIはproxy key/portも返さないため管理ID migrationがfail-closedになった。既存runtimeのComfyUI host＋template hashと、唯一のmanaged labelを照合して停止状態のままIDを移行するhotfixを追加し、任意GPU選択やGPU起動による回避は行わない。
- hotfix PR **#636**をmain **1798348f**へmergeし、deployment **fv3zslcnqli7vmsb02d1g3is**で本番反映。停止状態のまま管理ID **46258780**をschema v2 runtimeへ移行し、`stopped / already_stopped`、active run/lease 0、errorなしをread-backした。
- 実証run **f6136a7e-aa28-413a-946d-68116fd2abbb** / project **gpu-lifecycle-proof-1785565222**は、投入前`exited`→自動start→約30秒で認証済みComfyUI `ready`→Wan 2.2実生成→2分21秒後に`draft_review_required`となり即時自動stop→`exited`へ復帰した。draft承認、finalize、final承認、local納品中もGPUは停止を維持し、最終stateは`delivered`。
- 生成物はH.264 640×360/24fps＋AAC、8.000秒、230,838 bytes、SHA-256 `bd1d61447d7423a009f3ea6c98e07cedce37e3e8c592c5a93d3e9e0e97d0efbd`。technical QA全項目、2段階approval hash、delivery hashが一致。starting/ready/stoppedのevent journalはすべて`delivered`、DB operator queue 3件を直接read-backし、全行`slack_ok: true`。
- 実証中に検出した`ready`/`stopped` stateへ直前の接続待機detailが残る表示不整合も、各phaseで説明文を必ず上書きするPR **#637** / main **b9c596ec**で修正した。canonical deployment **d12xwzq945vjqdz1hpxba8d2**は`finished`、新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-063758291997`は同commit imageでhealthy。公開ready、認証gate、console assetを確認し、最終read-backは`stopped / already_stopped`、Vast実状態`exited`、active run/lease 0、errorなし、停止説明文更新済み。

## CURRENT STATUS — 2026-08-01 Video Factory本番復旧（実GPU生成・2段階承認・納品まで完了）

- 本番`/data/video-factory`にはVast.ai資格情報とテンプレートHashが永続保存済み。既存RTX 3090 24GBインスタンスは稼働中だが、ComfyUIプロセスの自己起動と本番ランタイムへの接続、承認済みWorkflow登録が完了していなかった。
- 既存GPUを追加作成せず回収する。Vast.aiの生レスポンスから`jupyter_token`、`extra_env`、プロキシ鍵などを管理画面へ返さない許可リスト境界と、秘密値をサーバー内だけで復元・検証・権限600のruntimeへ保存するadopt API/UIを実装した。
- GPU起動スクリプトは、既存モデルを再利用して専用ComfyUI APIを明示起動し、`system_stats`、必須ノード、TLSプロキシ自身の応答を確認できるまで待つ。ComfyUI本体に対する`git reset --hard`は廃止した。
- 現在の商用生成レーンは公式Wan 2.2 TI2V-5Bによる`abstract-broll-t2v`。未導入の7契約を本番必須扱いにせず、追加導入時に個別のモデル・ライセンス・Workflow審査を行う。
- Video Factoryは`pytest` 48件、Ruff、mypy、対象Vitest 3件、TypeScript、ESLint、Next.js production build、bash構文検査を通過。CLI dry-runは3形式を書き出して`draft_review_required`で停止した。全体Vitestは今回の変更外である既存`/work`系3ファイルの13件のみ不一致（1335件pass）のため、Video Factory CIと差分CIで判定する。
- 基盤復旧PR **#628**をmain **5d258362**へsquash mergeし、deployment **yz5h21ipqr566gt7dy9e2qa1**で本番反映した。公開`/api/video-factory/ready`は`ready: true`、アプリコンテナは同commitのimageでhealthy。本番APIのVast一覧は秘密値を返さない許可リスト出力を確認済み。
- 既存GPU **46258780**を追加作成せずstop/startし、公式APIで既存インスタンスへSSH公開鍵を付与して直接診断した。モデル3点は取得・checksum生成済みだったが、公式テンプレートのComfyUI配置が`/opt/workspace-internal/ComfyUI`、Pythonが`/venv/comfyui/bin/python`である差分と、`ENABLE_HTTPS`未指定による証明書未生成が起動を阻害していた。
- Vast公式TLS hookで同インスタンス用証明書を生成し、テンプレートと一致するComfyUI commitへ復旧後、専用API `18188`、認証付きHTTPS proxy `18189`、必須ノード検査を通過した。Python制御面はsystem CA bundleを明示的に使う必要があることも実接続で確認した。
- 互換hotfixは公式テンプレートの配置/venv検出、Vast署名TLS証明書の生成・検証、Python system CA bundle、Dockerfile品質guardのcurl検出を含む。対象Vitest 3件、bash構文検査、品質guard error 0、実GPU provisionを通過。残りはhotfixのPR/main反映後に本番doctor、実生成、ドラフト承認、最終承認、ローカル納品をread-backする。
- 互換hotfix PR **#629**をmain **22c72a73**へsquash mergeし、deployment **ekntc97otuk7dlcwiv3cz6lv**で本番反映した。本番doctorは`production_ready: true`、RTX 3090 VRAM 23.56GB、認証・到達性・16GB下限をpassし、承認済みモデル3点と`abstract-broll-t2v`のbindingを登録済み。
- 最初の実生成run **4441072b-7502-40d6-866c-41d2238ff249**は、GPU呼出し前にinstalled Python packageが`config/engine-routing.yaml`のservice rootを誤認してfailedになった。失敗を隠さず、`VIDEO_FACTORY_ROOT`を検証して使用するpackage-runtime修正と独立service imageの同環境変数、回帰testを追加した。Video Factory pytest 49件、Ruff、mypyはpass。再release後に新runで2段階承認と納品を通す。
- package-runtime修正PR **#630**をmain **b25b7cfc**へsquash mergeし、deployment **gccltdv7atri6f94i1hgmw6d**で本番反映した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-021549281532`は同commit imageでhealthy、release doctorと公開smokeを完走し、本番Video Factory doctorも`production_ready: true`、blocking reason 0を再確認した。
- 再実行run **7ccd26f5-8018-44b8-afac-a51f7fb351b7**はGPU生成後のHyperFrames text-motion検査で、生成HTMLにtimeline非使用宣言とstable clip idがなく安全停止した。テンプレートへ有限・seek可能なCSS motion、`data-no-timeline`、stable idを追加し、master videoの音声有無もprobe結果から明示する。全本番render前ゲートを`lint`からbrowser/runtime/layout/contrastを含む`check`へ強化し、HyperFramesを`0.7.77`から`0.7.87`へ全surfaceで統一した。
- 修正後はHyperFrames 0.7.87のtext-motion/master `check`がlint/runtime/layout/contrastすべて0 finding、text-motion snapshot 5枚を目視確認済み。Video Factory pytest 49件、Ruff、mypy strict、TypeScript、品質guard error 0、bash構文、差分検査をpass。ローカルにDocker CLIがないためcompose/container buildはPR CIで検証する。
- HyperFrames契約修正PR **#631**をmain **f08dc939**へsquash mergeし、deployment **qss4jbj0kgd32h6aolbykw1o**で本番反映した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-024628201239`は同commit imageでhealthy、HyperFrames 0.7.87、doctor `production_ready: true`、blocking 0を確認した。
- 3回目の実生成run **3323059b-e491-4264-ae20-066bfb2c6095**は、GPU生成後のbrowser checkでsystem ChromiumのCDP `Network.enable`がtimeoutして安全停止した。Node 22.12 Alpine imageのChromium 136とHyperFrames 0.7.87の固定ブラウザ152に世代差があり、公式chrome-headless-shellはglibc配布のためAlpineでは実行不可。Node全stageを公式`22.23.1-alpine3.24`へ固定して同世代Chromiumへ更新し、software GPUと900秒protocol timeoutを明示する。CI production image内で実HyperFrames check＋1秒MP4 render＋ffprobeを必須化する。
- PR #632の初回container CIでAlpine 3.24標準Python 3.14.5がVideo Factoryの安全な対応範囲`>=3.11,<3.14`を外れることを検出した。制約は緩めず、runnerを公式`python:3.13.14-alpine3.24`へ固定し、公式Node stageからNode 22.23.1 runtimeのみを移植して、Python 3.13・Node 22・新世代Chromiumを同居させる。
- Chromium runtime修正PR **#632**をmain **40ddab1e**へsquash mergeした。CI production imageでNode 22.23.1、Python 3.13.14、Chromium 150.0.7871.181をread-backし、HyperFrames 0.7.87 `check`と24/24 framesの1.000秒MP4 render、ffprobeをpass。Video Factory pytest 49件、Ruff、mypy strict、TypeScript、quality guard error 0もpassした。
- canonical `npm run release:prod`をdeployment **nahfyfola6j0gnqozcl7j7wa**で完走した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-033416492325`はmain **40ddab1e**のimageでhealthy、93/93 DB table、Traefik origin lock、公開smoke、post-deploy doctorをpass。本番Video Factory doctorは`production_ready: true`、blocking reason 0、HyperFrames 0.7.87、ComfyUI認証・到達性・23.56GB VRAM、必須workflow/model readyを確認した。
- 実GPU run **2c9248b4-7758-4002-b6e9-fecb5470686a** / project **production-readiness-1785555821**で、Wan 2.2 TI2V-5B生成を含む8秒動画を完走した。`draft_review_required`で停止→明示draft承認→finalize→`final_review_required`で停止→明示final承認→local deliverをread-backし、最終stateは`delivered`。`production-readiness-master.mp4`はH.264 640×360/24fps＋AAC、8.000秒、230,838 bytes、SHA-256 `bd1d61447d7423a009f3ea6c98e07cedce37e3e8c592c5a93d3e9e0e97d0efbd`で、4時点フレームも目視確認した。
- 公開`/api/video-factory/ready`は`ready: true`。`/video-factory-console#dashboard`はブラウザで管理者ログインへ正しくリダイレクトし、認証フォーム描画、error overlayなし、console error 0を確認した。既存Vast.ai GPU **46258780**のみを使用し、新規GPUは作成していない。同GPUはRTX 3090 / managed proxy有効 / `running`で、継続課金は`$0.1317222222/h`。
- 完了済みのCountry Partner one-shot workflow 2本と、V2へ置換済みの旧Vast bootstrap workflow 1本がmain pushごとにjob 0件の偽failure runを作っていたため削除した。現行の`direct-vast-production-bootstrap-v2.yml`と通常のproduction deployは維持する。
<!-- Historical merge-base block retained only to avoid losing prior handoff context.
## CURRENT STATUS — 2026-08-01 Video Factory主要OSS実行基盤（本番release完了）

- 既存Wanレーンは変更せず、主要OSS 40プロファイルのうち外部GPU実行型をcontrol planeの任意CLIから分離し、認証付き単一プロセスGPU workerへ強制する。CPU型はcontrol plane、ComfyUI型は既存workflow、外部GPU型はmanaged workerという実行境界を台帳・API・DB・GUIへ反映した。
- workerはprofile IDと固定40桁revision、商用承認、権利宣言、事前導入済みcommand/executableを検証する。1 GPU 1 job、shell不使用、timeout、MP4 probe、出力上限、SHA-256、temporary cleanupを実装し、未審査・非商用・revision不一致・未導入はfail-closedで拒否する。
- 非ComfyUIの外部GPU profileも本番runで既存managed GPU leaseを取得し、Vast起動後にComfyUI proxyと必要なworker profile revisionをpreflightする。成功・失敗のfinallyでidle判定後に停止し、dry-run、catalog表示、設定、CPU routeではGPUを起動しない。新GPU作成・常駐polling・job中downloadは行わない。
- runtime schema v3へOSS worker URL/API keyを追加し、mode 0600保存、secret非再表示、production HTTPS強制、Consoleの接続設定・worker状態badgeを実装した。DB migrationはexecution target/resolved adapter、RLS/role grantを追加し、release migration wiringも更新した。
- GPU worker用CUDA/FFmpeg container、Compose GPU profile、環境変数、operator runbookを追加した。モデル/worker artifactはread-only mount前提で、ネットワーク遮断可能な実行構成とする。
- Video Factory全76 pytest、Ruff、mypy strict 53 source files、ESLint、TypeScript、対象Vitest、Next.js production build、release-doctor、PR CIのtest/production-container/routing-storageをpass。desktop/mobile実ブラウザは40 card、worker設定、loading/error、横overflowなし、console error 0を確認した。
- PR **#642**をmain **b2163b0a**へsquash mergeし、canonical deployment **ofw2znwsajogrgadwsz0mkjp**を完走。新containerは同commit imageでhealthy、公開`/api/ready`は`ok: true / ready`、DB migrationと95/95 table検査、Traefik origin lock、公開smoke、post-deploy doctorをpassした。
- 本番runtimeをschema v3へ安全に移行し、secretを再表示せずmode 600を確認。40 profileを再同期し、ready 3 / blocked 37、managed GPU 31 / control plane 9、`catalog_synced` completed 100%、DBベルopen、Slack `slack_ok: true`をread-backした。未設定worker、未審査weight、非商用、24GB超過は理由付きで選択不能のまま維持する。
- RLSはprofile/event両tableで有効、anon/authenticated grant 0。共通migrationが再作成する重複service-role policyも最終hardeningで毎release削除し、明示した最小権限policyだけを残す。
- 管理GPU **46258780**はVast実状態`exited / stopped`、active run 0、GPU lease 0、errorなし。catalog閲覧・設定・DB同期・CPU routeでは起動せず、生成jobが必要とする場合だけ起動し、完了・失敗時にidleなら即停止する。

## CURRENT STATUS — 2026-08-01 Video Factory主要OSSエンジン統合（本番release完了）

- Wan既存レーンは維持しつつ、FramePack、SkyReels V2/V3、NVIDIA Cosmos 3、Pyramid Flow、Open-Sora系、VideoCrafter/DynamiCrafterを含む主要な動画生成・人物アニメーション・音声・補正・3D/図解OSS計40プロファイルを、単一の監査可能な台帳へ統合する。モデル重量は常駐・一括取得せず、承認済みプロファイルだけをジョブ単位で遅延ロードする。
- 各プロファイルは公式source、immutable revision、code/model license、商用可否、最低/推奨VRAM、対応shot kind、実行runtime、workflow/model binding、審査者を保持する。未審査、非商用、24GB超過、workflow/model未承認はGUIで理由を表示し、本番実行はfail-closedで拒否する。
- DBはprofile snapshot・選択/実行eventをRLS付きで保存し、APIは認証・入力検証・DBベル+Slack通知を行う。Consoleはcatalogのloading/empty/error、カテゴリ、稼働可否、VRAM、ライセンス、選択結果を可視化する。
- Vast.ai GPUは既存のjob-scoped lifecycleだけを使い、preview・catalog閲覧・審査・設定変更では起動しない。新規GPU作成、常駐polling、暗黙fallback、未承認weight downloadは行わない。
- arm64ネイティブFFmpeg/ffprobeを用いたVideo Factory全71テスト、Ruff、mypy strict（50 source files）、TypeScript、対象Vitest 9件、ESLint、quality guard error 0、release-doctorの新規RLS/release wiring検査、Next.js production buildをpass。全体Vitestは今回変更外の既存`/work`系3 files / 13 testsのみ不一致（1344 pass）。
- 実ブラウザでdesktop/mobileの40 cards、10 shot-kind selector、loading/error、絞り込みを確認し、390px viewportで`scrollWidth == clientWidth == 390`、console error 0。検証中もGPUは起動していない。
- PR **#639**をmain **ca3e3bbe**へsquash mergeし、canonical deployment **wuobqot0ksrotfbckomjhtb1**を完走。新containerは同commit imageでhealthy、公開ready、DB migration、95/95 table、40 profile同期、DBベル+Slackをread-backした。GPU **46258780**は`exited / stopped`、active run/lease 0を維持した。
- 本番read-backで永続workspaceの旧8 workflow契約が、image内18契約より優先される更新漏れを検出した。既存のWan承認済みbindingを一切上書きせず、欠けているbundled契約だけを原子的・冪等に追加するstartup mergeをhotfixした。
- hotfix PR **#640**をmain **d693b28c**へsquash mergeし、canonical deployment **kag5gash9hwzj85mi2rr0yys**を完走。新containerは同commit imageでhealthy。本番registryは18件、追加10件は全てdisabled、既存`abstract-broll-t2v`だけがapproved_bound / enabledでSHA-256とreviewerを維持した。台帳40件を再同期し、event completed、DBベルopen、Slack `slack_ok: true`をread-backした。公開readyは`true`、GPU **46258780**は`exited / stopped`、active run/lease 0、errorなし。

## CURRENT STATUS — 2026-08-01 Video Factory GPUオンデマンド化（本番release完了）

- 管理対象GPUをVast.ai instance **46258780**の1台に固定し、ComfyUIが必要な本番runの開始時だけ自動起動、生成完了・失敗時にproduction runと全workerのGPU leaseが0件なら自動停止するevent-driven lifecycleを実装した。定期polling、予備GPUの自動作成、別instanceへの暗黙切替は行わない。
- dry-run、企画/validation失敗、ComfyUIを使わないroute、draft/final承認、local deliveryではGPUを起動しない。手動startと管理GPUのdestroy/重複createをAPI/UIの両方で拒否し、active runまたはprocess leaseがある間の手動stopも拒否する。
- 複数Prefect/API worker間は`flock` leaseで保護する。rolling deploy前の旧workerもleaseを保持でき、プロセス異常終了後のstale leaseだけを安全に回収する。API再起動時は永続queued/running jobを非冪等再実行せず明示failedへ復旧し、one-shotでidle GPUを停止する。
- lifecycle状態、Vast実状態、run/lease、時給、最終action/error、直近run履歴を管理consoleへ追加した。loading/empty/errorを可視化し、再確認は明示ボタン・接続・タブ選択時のみで、常駐pollingは使わない。
- `gpu_starting` / `gpu_ready` / `gpu_stopped` / `gpu_error`を権限600のevent journalへ永続化し、認証付き内部Next APIから既存`notifyBothChannels`へ渡してDBベル+Slackの両方へ通知する。片方でも失敗した場合は成功扱いにせずjournalへ残す。
- 新規/対象test 28件、Ruff、mypy strict、TypeScript、対象Vitest 5件、ESLint、品質guard error 0、Next.js production buildをpass。PR CIではffmpegを含むVideo Factory全test、production image build、埋め込みruntime/render、routing/storage gateをすべてpassした。
- 作業開始時点で停止していたVast.ai GPU **46258780**を、停止→実runによる自動起動→実生成→自動停止→2段階承認→納品まで本番で通した。納品後と最終release後はいずれも`exited`、active production run/lease 0件へ復帰している。
- 初回release **vnf5ibia5yw7bgj790uyyzju** / main **c1d98f32**はhealthy・公開readyまでpassしたが、旧bootstrap stateが本番workspaceに残っておらず、停止中Vast APIはproxy key/portも返さないため管理ID migrationがfail-closedになった。既存runtimeのComfyUI host＋template hashと、唯一のmanaged labelを照合して停止状態のままIDを移行するhotfixを追加し、任意GPU選択やGPU起動による回避は行わない。
- hotfix PR **#636**をmain **1798348f**へmergeし、deployment **fv3zslcnqli7vmsb02d1g3is**で本番反映。停止状態のまま管理ID **46258780**をschema v2 runtimeへ移行し、`stopped / already_stopped`、active run/lease 0、errorなしをread-backした。
- 実証run **f6136a7e-aa28-413a-946d-68116fd2abbb** / project **gpu-lifecycle-proof-1785565222**は、投入前`exited`→自動start→約30秒で認証済みComfyUI `ready`→Wan 2.2実生成→2分21秒後に`draft_review_required`となり即時自動stop→`exited`へ復帰した。draft承認、finalize、final承認、local納品中もGPUは停止を維持し、最終stateは`delivered`。
- 生成物はH.264 640×360/24fps＋AAC、8.000秒、230,838 bytes、SHA-256 `bd1d61447d7423a009f3ea6c98e07cedce37e3e8c592c5a93d3e9e0e97d0efbd`。technical QA全項目、2段階approval hash、delivery hashが一致。starting/ready/stoppedのevent journalはすべて`delivered`、DB operator queue 3件を直接read-backし、全行`slack_ok: true`。
- 実証中に検出した`ready`/`stopped` stateへ直前の接続待機detailが残る表示不整合も、各phaseで説明文を必ず上書きするPR **#637** / main **b9c596ec**で修正した。canonical deployment **d12xwzq945vjqdz1hpxba8d2**は`finished`、新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-063758291997`は同commit imageでhealthy。公開ready、認証gate、console assetを確認し、最終read-backは`stopped / already_stopped`、Vast実状態`exited`、active run/lease 0、errorなし、停止説明文更新済み。

## CURRENT STATUS — 2026-08-01 Video Factory本番復旧（実GPU生成・2段階承認・納品まで完了）

- 本番`/data/video-factory`にはVast.ai資格情報とテンプレートHashが永続保存済み。既存RTX 3090 24GBインスタンスは稼働中だが、ComfyUIプロセスの自己起動と本番ランタイムへの接続、承認済みWorkflow登録が完了していなかった。
- 既存GPUを追加作成せず回収する。Vast.aiの生レスポンスから`jupyter_token`、`extra_env`、プロキシ鍵などを管理画面へ返さない許可リスト境界と、秘密値をサーバー内だけで復元・検証・権限600のruntimeへ保存するadopt API/UIを実装した。
- GPU起動スクリプトは、既存モデルを再利用して専用ComfyUI APIを明示起動し、`system_stats`、必須ノード、TLSプロキシ自身の応答を確認できるまで待つ。ComfyUI本体に対する`git reset --hard`は廃止した。
- 現在の商用生成レーンは公式Wan 2.2 TI2V-5Bによる`abstract-broll-t2v`。未導入の7契約を本番必須扱いにせず、追加導入時に個別のモデル・ライセンス・Workflow審査を行う。
- Video Factoryは`pytest` 48件、Ruff、mypy、対象Vitest 3件、TypeScript、ESLint、Next.js production build、bash構文検査を通過。CLI dry-runは3形式を書き出して`draft_review_required`で停止した。全体Vitestは今回の変更外である既存`/work`系3ファイルの13件のみ不一致（1335件pass）のため、Video Factory CIと差分CIで判定する。
- 基盤復旧PR **#628**をmain **5d258362**へsquash mergeし、deployment **yz5h21ipqr566gt7dy9e2qa1**で本番反映した。公開`/api/video-factory/ready`は`ready: true`、アプリコンテナは同commitのimageでhealthy。本番APIのVast一覧は秘密値を返さない許可リスト出力を確認済み。
- 既存GPU **46258780**を追加作成せずstop/startし、公式APIで既存インスタンスへSSH公開鍵を付与して直接診断した。モデル3点は取得・checksum生成済みだったが、公式テンプレートのComfyUI配置が`/opt/workspace-internal/ComfyUI`、Pythonが`/venv/comfyui/bin/python`である差分と、`ENABLE_HTTPS`未指定による証明書未生成が起動を阻害していた。
- Vast公式TLS hookで同インスタンス用証明書を生成し、テンプレートと一致するComfyUI commitへ復旧後、専用API `18188`、認証付きHTTPS proxy `18189`、必須ノード検査を通過した。Python制御面はsystem CA bundleを明示的に使う必要があることも実接続で確認した。
- 互換hotfixは公式テンプレートの配置/venv検出、Vast署名TLS証明書の生成・検証、Python system CA bundle、Dockerfile品質guardのcurl検出を含む。対象Vitest 3件、bash構文検査、品質guard error 0、実GPU provisionを通過。残りはhotfixのPR/main反映後に本番doctor、実生成、ドラフト承認、最終承認、ローカル納品をread-backする。
- 互換hotfix PR **#629**をmain **22c72a73**へsquash mergeし、deployment **ekntc97otuk7dlcwiv3cz6lv**で本番反映した。本番doctorは`production_ready: true`、RTX 3090 VRAM 23.56GB、認証・到達性・16GB下限をpassし、承認済みモデル3点と`abstract-broll-t2v`のbindingを登録済み。
- 最初の実生成run **4441072b-7502-40d6-866c-41d2238ff249**は、GPU呼出し前にinstalled Python packageが`config/engine-routing.yaml`のservice rootを誤認してfailedになった。失敗を隠さず、`VIDEO_FACTORY_ROOT`を検証して使用するpackage-runtime修正と独立service imageの同環境変数、回帰testを追加した。Video Factory pytest 49件、Ruff、mypyはpass。再release後に新runで2段階承認と納品を通す。
- package-runtime修正PR **#630**をmain **b25b7cfc**へsquash mergeし、deployment **gccltdv7atri6f94i1hgmw6d**で本番反映した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-021549281532`は同commit imageでhealthy、release doctorと公開smokeを完走し、本番Video Factory doctorも`production_ready: true`、blocking reason 0を再確認した。
- 再実行run **7ccd26f5-8018-44b8-afac-a51f7fb351b7**はGPU生成後のHyperFrames text-motion検査で、生成HTMLにtimeline非使用宣言とstable clip idがなく安全停止した。テンプレートへ有限・seek可能なCSS motion、`data-no-timeline`、stable idを追加し、master videoの音声有無もprobe結果から明示する。全本番render前ゲートを`lint`からbrowser/runtime/layout/contrastを含む`check`へ強化し、HyperFramesを`0.7.77`から`0.7.87`へ全surfaceで統一した。
- 修正後はHyperFrames 0.7.87のtext-motion/master `check`がlint/runtime/layout/contrastすべて0 finding、text-motion snapshot 5枚を目視確認済み。Video Factory pytest 49件、Ruff、mypy strict、TypeScript、品質guard error 0、bash構文、差分検査をpass。ローカルにDocker CLIがないためcompose/container buildはPR CIで検証する。
- HyperFrames契約修正PR **#631**をmain **f08dc939**へsquash mergeし、deployment **qss4jbj0kgd32h6aolbykw1o**で本番反映した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-024628201239`は同commit imageでhealthy、HyperFrames 0.7.87、doctor `production_ready: true`、blocking 0を確認した。
- 3回目の実生成run **3323059b-e491-4264-ae20-066bfb2c6095**は、GPU生成後のbrowser checkでsystem ChromiumのCDP `Network.enable`がtimeoutして安全停止した。Node 22.12 Alpine imageのChromium 136とHyperFrames 0.7.87の固定ブラウザ152に世代差があり、公式chrome-headless-shellはglibc配布のためAlpineでは実行不可。Node全stageを公式`22.23.1-alpine3.24`へ固定して同世代Chromiumへ更新し、software GPUと900秒protocol timeoutを明示する。CI production image内で実HyperFrames check＋1秒MP4 render＋ffprobeを必須化する。
- PR #632の初回container CIでAlpine 3.24標準Python 3.14.5がVideo Factoryの安全な対応範囲`>=3.11,<3.14`を外れることを検出した。制約は緩めず、runnerを公式`python:3.13.14-alpine3.24`へ固定し、公式Node stageからNode 22.23.1 runtimeのみを移植して、Python 3.13・Node 22・新世代Chromiumを同居させる。
- Chromium runtime修正PR **#632**をmain **40ddab1e**へsquash mergeした。CI production imageでNode 22.23.1、Python 3.13.14、Chromium 150.0.7871.181をread-backし、HyperFrames 0.7.87 `check`と24/24 framesの1.000秒MP4 render、ffprobeをpass。Video Factory pytest 49件、Ruff、mypy strict、TypeScript、quality guard error 0もpassした。
- canonical `npm run release:prod`をdeployment **nahfyfola6j0gnqozcl7j7wa**で完走した。新コンテナ`n8i2sjiqvr2d8hrzppop2m2i-033416492325`はmain **40ddab1e**のimageでhealthy、93/93 DB table、Traefik origin lock、公開smoke、post-deploy doctorをpass。本番Video Factory doctorは`production_ready: true`、blocking reason 0、HyperFrames 0.7.87、ComfyUI認証・到達性・23.56GB VRAM、必須workflow/model readyを確認した。
- 実GPU run **2c9248b4-7758-4002-b6e9-fecb5470686a** / project **production-readiness-1785555821**で、Wan 2.2 TI2V-5B生成を含む8秒動画を完走した。`draft_review_required`で停止→明示draft承認→finalize→`final_review_required`で停止→明示final承認→local deliverをread-backし、最終stateは`delivered`。`production-readiness-master.mp4`はH.264 640×360/24fps＋AAC、8.000秒、230,838 bytes、SHA-256 `bd1d61447d7423a009f3ea6c98e07cedce37e3e8c592c5a93d3e9e0e97d0efbd`で、4時点フレームも目視確認した。
- 公開`/api/video-factory/ready`は`ready: true`。`/video-factory-console#dashboard`はブラウザで管理者ログインへ正しくリダイレクトし、認証フォーム描画、error overlayなし、console error 0を確認した。既存Vast.ai GPU **46258780**のみを使用し、新規GPUは作成していない。同GPUはRTX 3090 / managed proxy有効 / `running`で、継続課金は`$0.1317222222/h`。
- 完了済みのCountry Partner one-shot workflow 2本と、V2へ置換済みの旧Vast bootstrap workflow 1本がmain pushごとにjob 0件の偽failure runを作っていたため削除した。現行の`direct-vast-production-bootstrap-v2.yml`と通常のproduction deployは維持する。
-->

## CURRENT STATUS — 2026-08-02 Pet Life Movie delight-quality UI/UX

- 返金処理と法規制文言は今回の対象外として維持し、それ以外の公開LP・無料制作・家族招待・鑑賞/進捗画面を感情設計から刷新した。DB/API/保存形式/Stripe契約は変更せず、既存プロジェクトとの互換性を維持する。
- 権利が明確な専用キービジュアルを生成・WebP最適化し、完成イメージが最初の画面で伝わるeditorial hero、作品体験を先に見せる情報順、3段階の制作ストーリー、価値訴求、価格/FAQ、OSS制作工程の視覚階層へ再構成した。
- 長い単一フォームを「あの子のこと→本当にあった思い出→写真」の3ステップへ分割した。入力別validation、戻る/進む、犬猫selector、写真追加/削除preview、安全なupload進捗、完成後の共有/家族招待/管理/注文導線、モバイルsticky preview、reduced-motionを実装した。
- 家族招待画面をprivate invitationとして再設計し、招待の意味・限定性・直接private storage送信を明示した。写真preview/削除、文字数、権利同意、進捗、完了後の更新preview導線を同じproduct languageへ統一した。
- 検証: full TypeScript、対象ESLint warning 0、Pet Vitest 19/19、Next.js production build 636/636、production-mode Playwright 10/10（4言語desktop/mobile、実iPhone、no-account preview）、WCAG 2.2 AA 4言語違反0、横overflow 0、`npm audit --omit=dev` 0 vulnerabilities。
- PR **#700** はvalidate CI通過後にmain **f98bd46f**へsquash merge済み。Coolify deployment **qdqjy137y6e3wsdgjodb3nhd** は後続main **999706ea**（f98bd46fを包含）を本番へ反映し、status `finished` を確認した。
- 本番 `ready`、専用WebP、日英西葡LP、新hero copy、実iPhone横overflow 0、アニメーション完了後のWCAG 2.2 AA違反0を確認した。DB project作成/認証read、R2署名、5画像PUT/検証、事実限定storyboard、private preview、DB/R2完全削除まで実データsmokeを完走し、検証データ残数0を確認した。
- ACTIVE HANDOFF: 返金処理・法規制文言を除くPet Life Movieのdelight-quality UI/UXと本番正常系は完了。canonical releaseのSSH依存preflightはhost port 22 timeoutのため利用できず、DB変更がないことを確認して公式Coolify deploy APIへ切替済み。公開アプリ/route/APIはhealthyで、SSH経路の復旧はproduct launchとは分離したinfra運用課題として扱う。

## CURRENT STATUS — 2026-08-02 Content API + Pet Life Movie

- Content APIは公開CORS catalog、全文JSON/Markdown、3つの有料decision packetを日英配信する。PR #659、fix #660-#662、deployment `lbxrxhx5vpcyvpolyzusi8qe`はhealthy。x402は財務承認までHTTP 503でfail-closed、無料APIは継続する。
- Pet Life Movieの商用品質引上げをPR **#689**、Checkout再試行/削除hardeningをPR **#691**でmainへmergeした。日英西葡LPへ注文前の価格・支払方法/時期・納期・保存期間・取消し/不具合/返金・サポート・FAQを表示し、商品固有の提供条件、sitemap、構造化データ、再開導線を追加した。
- 家族招待は写真だけでなく実在する思い出と明示的な権利同意を保存し、全員分をstoryboardへ反映する。owner/contributor uploadはR2のsize・Content-Type・magic bytesを確認し、偽装ファイルを削除する。期限切れ招待、20件超の招待、旧render callbackによる承認迂回を拒否する。
- Checkoutは提供条件version/同意時刻をDB保存し、再試行ごとに固有のStripe idempotency keyを使う。既存open sessionとDB保存失敗時の新sessionを失効し、顧客削除前にもpending sessionを閉じる。500系APIは内部例外を返さず相関IDだけを返す。専用rate-limit saltをCoolifyへ生成・設定・read-back済み。
- ローカル/CIはPet TypeScript、対象ESLint、Vitest **19/19**、Next.js production build **636/636**、PR #691 CI **3分59秒**、現行本番Pet Playwright **10/10**、日英西葡LP/規約WCAG 2.2 AA **8/8**、実iPhone profile、desktop/mobile overflow、`npm audit --omit=dev` 0 vulnerabilitiesを通過した。全体Vitestは今回変更外4 files / 17 testsのみ不一致で **1448 tests pass**。
- migration `20260802210000_pet_life_movie_commercial_quality.sql`を本番適用し、同意/家族memory列、check constraint、Pet全6 tableのRLS+FORCE RLS、anon/authenticated grant 0をread-backした。最新main **4f9917a2**（#691の **2653ca71** を包含）をdeployment **z8wcfljvb23ths9tryzn7e67**で反映し、container `n8i2sjiqvr2d8hrzppop2m2i-105318095593`はhealthy。
- 本番no-charge E2Eはowner 5枚→storyboard→preview→家族1枚+memory/権利同意→storyboard反映→live Mini $19 Checkoutを同一planで2回作成まで完走した。sessionは別ID、1件目expired/2件目open、双方livemode・USD 1900・unpaid。顧客削除後は双方expired、R2 object 0、project/assets/contributors DB row 0を確認し、金銭移動は発生していない。
- Coolify cloneを公開HTTPSへ変更してappの秘密鍵参照を解除し、旧GitHub deploy key・旧host authorized key・旧Coolify private keyを全失効した。新host専用鍵へ分離し、新deployment logのprivate-key候補0、一時検証token 0をread-backした。Docker未使用cache/imageを整理し、host diskは88%/空き19GBから68%/空き47GBへ回復した。
- ACTIVE HANDOFF: 課金以外の商用SaaS/LP/API/DB/R2/家族共同編集/削除/アクセシビリティ/本番運用は完了。残りは明示的な金融承認を伴う実購入→render→人間承認→納品→返金の一回限りの証跡作成。Cloudflare API token交換はtoken管理権限不足の既存control-plane blockerとして製品品質から分離する。

## ACTIVE HANDOFF

- Foreign Investor pSEO: PR #681・main `e051aad6`・本番deployment `b55som0oubhi93mqaohwd0f8`・12件のDB品質/RLS read-backまで完了。候補189,504件を一括index化せず、地域固有データと翻訳レビューが揃ったwaveだけを公開する。
- Direct Growth: 実装、main merge、本番deployment、migration、RLS/ACL、API/UI/readiness、post-deploy doctorまで完了。外部投稿・メール送信controlは持たず、本番データ0件を維持した。
- Direct Growth: 初回実運用は、最終承認済みの実在Studio案件を1件登録し、4媒体copyの人間レビュー、DBベル+Slack通知、将来日時、手動公開URL、成果指標を同一campaignで記録する。通知の本番mutation確認は架空データを作らず、この実案件で行う。
- SERICIA: Shopify接続、本番のBASE fail-closed表示、draft theme previewを確認済み。BASE API app取得後にOAuth・dry-run・draft同期・価格/在庫read-backを完了する。
- Japan operator: production releaseとDB/API/UI/送信guardのread-backは完了。実運用はCHEFCLEAN→HOLENの順に証跡・memo・人間承認を揃え、別担当者が完全一致の一回限り許可を承認する。中央guardを迂回せず、同じ案件IDへ全記録を保存する。
- x402: 財務承認後にsecretをapproved storeへ設定し、0.25 USDC実購入、settlement、paid delivery、hashed reference、DBベル、Slackを確認する。
- Pet Life Movie: Coolify API tokenは最小権限へ交換し、検証用一時root tokenとremote secret fileも削除・DB残数0を確認した。Cloudflare API tokenはactive・DNS read可能だがtoken管理権限がなく、交換だけが未完了。認証済みDashboard sessionを確保でき次第API tokenを交換する。
- Pet Life Movie: PR #689/#691、production migration、最新main deployment、owner+family no-charge E2E、再Checkout、削除時Session失効、R2/DB完全削除、鍵分離/失効まで完了。残りは明示的な金融承認を伴う実購入→render→承認→納品→返金の一回限りの証跡作成であり、通常checkout自体は本番有効。
- Video Factoryは既存の承認済みGPUだけを使用し、既定で追加GPUを作成しない。

## RELEASE REFERENCES

- Previous Country Partner implementation PR: #565
- Previous production verification run: `30311462742`
- `/work` fast-first PR: #586 / main `aa8af979` / validation `30394597067` / release `30394964339` / deployment `j3srqefjxcuopbvjgr5mmrcc`
- VaaS implementation PR: #573
- VaaS production deployment: pending
- Foreign Investor pSEO: PR **#681** / main `e051aad6` / deployment `b55som0oubhi93mqaohwd0f8` / follow-up release hardening branch `codex/foreign-investor-pseo-release`。

## ACTIVE HANDOFF - 2026-08-02 Vertical SaaS direction

- Direction: industry-specific Quote Recovery SaaS for Japanese machinery manufacturers/traders; no free pilot/trial. Starter is JPY 29,800/month including tax (3 seats, 2,000 rows/month), Team is JPY 49,800/month including tax (10 seats, 10,000 rows/month); the global PLG/OSS-wrapper track is out of scope.
- Commercial SaaS core is implemented: secure password/session auth, password reset flow, organization and role membership, tenant-isolated quote/import/activity/notification/usage/audit data, CSV import and export, explainable priority dashboard, quote status/owner/next-action updates, activity history, member invite/role/removal, plan limits, loading/empty/error states, and responsive Japanese UI.
- Stripe Billing is implemented with live-mode enforcement, hosted subscription Checkout, Customer Portal sessions, webhook signature verification, duplicate-event ledger, out-of-order event protection, payment-failure access control, billing audit records, and DB + Slack billing notifications.
- Stripe live products exist in the Paradigm LLC account: Quote Recovery Starter and Team with monthly JPY tax-inclusive prices. The dedicated production webhook endpoint is registered for Checkout, subscription lifecycle, and invoice paid/failed events.
- Production DB migration `20260802020738_quote_recovery_commercial_saas.sql` is applied. All commercial tables have RLS, anon/authenticated grants are revoked, service-role policies and service-only RPC permissions are verified, and a transactional account/usage/RLS smoke test passed.
- Verification passed: Next.js production build, TypeScript, Quote Recovery targeted ESLint with zero warnings, 11 unit tests, dependency audit with zero known vulnerabilities, and SQL functional/RLS verification.
- Production release: PR **#674** was squash-merged as main `09a4ad54`; Coolify deployments `jvaaog0t32bof529vr43ae3h` and `h58uru737wd0nn4hxhp3hhby` finished. The current healthy main container `7d2bf24f` contains Quote Recovery, and the latest post-deploy doctor passed.
- Live verification: public landing/login/reset pages returned 200; signup returned 201; unauthenticated Checkout was rejected; authenticated Starter Checkout created a `cs_live_` session; the open session was expired without payment. Signed webhook acceptance and duplicate-event handling returned 200, password-reset mail reached Gmail from verified `send.paradigmjp.com`, all 15 Quote Recovery tables had RLS enabled, and all smoke user/audit/webhook data was removed.
- Runtime secrets: live Stripe Price IDs, webhook signing secret, a validated live account Secret Key, Resend sending-only API key, and the verified sender domain are configured in Coolify. Stripe billing is launch-ready. Replacement with a newly named Quote Recovery-only Dashboard key remains pending only because Stripe presented an hCaptcha challenge in the fallback browser.
- Direct Growth: PR **#665** / main `f2339929` / feature deployment `ghen9whanscvtws0cqndwj5y` / latest live deployment `szv2lqpeybjf476rtqcu6djm`。
- SERICIA Shopify storefront and BASE sync: PR **#657**、hardening PR **#675** / main `e9238314`（latest live `b0a9eca1`に包含）/ deployment `q80cl9qe9wofsrkwoj440tf4`。
- Japan operator OS: PR **#666** / main `cf105607` / GitHub run `30731931603` / Coolify deployment `p4vhvcggml1qcnqt22u5wv3e`。
- Content API: PR **#659**、fixes **#660-#662**、deployment `lbxrxhx5vpcyvpolyzusi8qe`。
- Pet Life Movie: PR **#664** / **#669** / **#676** / **#689** / **#691**、commercial main **2653ca71**（latest **4f9917a2**に包含）、deployment **z8wcfljvb23ths9tryzn7e67**、container `n8i2sjiqvr2d8hrzppop2m2i-105318095593`。
- Previous detailed archive: `docs/handoff-archive/2026-08-02-pre-content-api-task.md`。
