# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-01 Video Factory本番復旧（HyperFrames契約hotfix検証済み / 再release待ち）

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

## CURRENT STATUS — 2026-07-28 Video制作パイプライン標準化（HyperFrames＋ComfyUI）

- 公開価格は変更しない（Essential `$1,500/月`、Unlimited `$3,500/月`、Priority `$5,500/月`）。価格はAI実行時間ではなく、企画・ブランド設計・修正・派生・ローカライズ・最終QAを含む承認可能な完成動画に対するものとする。
- `generateProfessionalVideo`を実運用オーケストレーターへ変更した。会社／診断レポートを入力に、ComfyUIの背景・Bロール・サムネイル（必要時のみアバター・動画）を並列生成し、HyperFramesの決定的な最終合成を独立レーンとして実行する。
- ComfyUI各レーンとHyperFramesレーンは個別に成功／失敗を返す。未設定・一部失敗でも成功レーンを破棄せず、エラーをQAで確認できる。最終採用は人間が行い、権利・ブランド・事実・字幕・音量・テンポを確認する。
- ブランドごとのMotion System（色、フォント、ロゴ、CTA、トランジション、字幕、音量、アスペクト比、テンプレート、ワークフロー）を初回に定義し、以後はブリーフ差し替えで量産する。`docs/knowledge/video-as-a-service-operating-system.md`に運用境界と権利方針を追記した。
- エンリッチメント自動処理からの複合レーン切り替えは`PROFESSIONAL_VIDEO_PIPELINE_ENABLED=true`の明示オプトインとし、認証済みComfyUIがない環境では従来のHyperFrames診断動画へフォールバックする。

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

- Video Factory Chromium runtime hotfix branch: `fix/video-factory-chromium-runtime-20260801`
- 既存Vast.ai GPU **46258780**はComfyUI API / TLS proxy readyで稼働中。追加GPUは作成しない。GPU課金は約`$0.132/h`で継続中のため、実生成と2段階承認のread-back後に稼働状態を明記する。
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
