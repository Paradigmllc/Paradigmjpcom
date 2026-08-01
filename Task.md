# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-02 Japan market operator Wave 1

- Read the two shared strategy chats and converted the core model into an executable external Japan market operator offer.
- Standardized the public package: $5,000 Paid Market Validation (credited), $20,000 total Japan Launch, then $2,500/month + 10% of Net Collected Japan Sales.
- Revalidated the historic candidate lists against current public sources; rejected brands with existing Japan distribution/export evidence.
- Added five evidence-backed Wave 1 prospects to production RevenueOS: CHEFCLEAN, Little Archive / DONGJIN BEDDING, B.FTER / Another Day, HOLEN and QURV / F.R.P. Industry.
- Updated the permission-first outbound draft to ask to send a three-page Japan Opportunity Memo; no external messages have been sent.
- Added `docs/knowledge/japan-market-operator-playbook.md` with ICP, package, outreach sequence, first-wave list and MSA/SOW/KPI-conditional exclusivity structure.
- PR **#644** merged as main **9ad77fa5**. Production deploy **30721053939** and fast probe **30721053901** passed; the EN/JA hub, Source desk, sitemap fingerprint and invalid inquiry API gate were verified live, with production Chromium E2E **3/3** passing.
- Active handoff: run human review on the five memos, approve the first two sends, then route positive replies to the Paid Market Validation SOW in Docuseal.

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

## CURRENT STATUS — 2026-07-29 公開HPの生成Visual重複を解消（実装・ローカル検証完了 / release準備中）

- 全ページ末尾へ機械的に挿入していた共通画像カルーセル、工程表、ショーリールを撤去する。同じ生成画像を複数ページで反復せず、ページ本文と既存の専用コンポーネントを主役に戻す。
- 共通`PageHero`は生成画像ではなく、実績を装わない抽象的なUI図解へ戻す。`/ja/works`では既存の実績カード、制作工程、確認基準を表示し、無関係な生成素材を実績画像として見せない。
- 追加済みの生成画像4点、ショーリール、専用HyperFrames compositionは公開物とリポジトリから削除する。新しいフリー素材への置換は行わない。
- TypeScript、変更ファイルESLint、production build、Playwrightのdesktop/mobile計4ケースを通過。`/ja/works`の実画面キャプチャでも、生成画像レールが消え、PageHeroから既存実績カードへ直接つながることを確認した。

## CURRENT STATUS — 2026-07-29 `/work`高速一次判定＋選抜詳細解析（本番release完了 / 外部送信0）

- 完全新規URLの標準処理を、従来の全社フル解析から**ホームページ1回取得だけの高速一次判定**へ変更した。URL正規化、企業名・商品/サービス・業態、日本語/JPY/日本配送の公開有無、0〜100点と`promote / review / low`を決定論で保存する。
- Raw候補ではDeepSeek、Crawl4AI、複数ページ探索、問い合わせフォーム探索、PV/ROI試算、初回文面、10章レポート、Twenty同期を実行しない。DeepSeek残高がなくても500 URLバッチを開始できる。
- 営業候補として残す企業だけ、履歴の**「詳細解析へ昇格」**から既存の厳格なフル解析へ進める。昇格後は公開根拠収集、フォーム検証、企業別文面、品質・類似度・安全性gate、顧客向けレポート、Twenty read-backを従来どおり実行する。
- 永続キュー、最大500 URL、最大20バッチ、3件ずつのDB claim、再開、重複統合、RLS、外部自動送信0件の境界は維持した。新しいDB migrationは追加せず、既存スキーマで実装した。
- PR **#586**をmain **aa8af979**へsquash mergeした。PR validation **30394597067**で対象Vitest、TypeScript、変更実装ESLint warning 0、production buildがpassした。
- Production release **30394964339**はrouting validation、Coolify deploy、公開URL検証を完走した。deployment **j3srqefjxcuopbvjgr5mmrcc**はcommit **aa8af979**を`finished`で反映し、`/ja`、`/en`、VaaS日英ページ・規約・申込導線、`/api/ready`はHTTP 200 / missing 0。`/work`は管理者専用、外部自動送信0件を維持する。

## ACTIVE HANDOFF

- Video Factory主要OSS実行基盤はPR **#642** / main **b2163b0a** / deployment **ofw2znwsajogrgadwsz0mkjp**で本番反映済み。40 profileは実行境界・固定revision・license・model/workflow・reviewer gateを保持し、未承認profileを利用可能扱いにしない。
- 本番OSS worker URL/keyは未設定。これは接続先・事前導入worker artifact・exact weight hash・人間の商用審査がないprofileを暗黙実行しない安全境界であり、Consoleの「worker未設定」と各profileのblocking reasonを解消せずにreadyへ変更してはならない。
- Video Factoryのevent-driven GPU自動start/stopはPR **#635–#637**、main **b9c596ec**、deployment **d12xwzq945vjqdz1hpxba8d2**で本番反映・実生成proof・最終read-backまで完了。
- 管理対象のVast.ai GPUは既存instance **46258780**のみ。追加GPUは作成しておらず、最終実状態は`exited`、active production run/lease 0件。ComfyUIを必要とする本番生成中だけ起動する。
- Vast.aiインスタンスAPIの出力に秘密値を含めない。プロキシ鍵はadopt処理と永続runtimeの内部だけで扱う。
- `/work` fast-firstは本番反映済み。新規Raw URLは高速一次判定、選抜候補のみ「詳細解析へ昇格」でフル解析する。
- VaaS Branch: `feat/video-as-a-service-commercial-launch`
- VaaS PR: #573 `feat: launch Video as a Service commercial operations`
- VaaS本番公開後、次の運用準備を完了する。
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
- `/work` fast-first PR: #586 / main `aa8af979` / validation `30394597067` / release `30394964339` / deployment `j3srqefjxcuopbvjgr5mmrcc`
- VaaS implementation PR: #573
- VaaS production deployment: pending
