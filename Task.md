## CURRENT STATUS - 2026-07-15 Manual Japan Entry 文面・診断品質hardening（本番release・read-back完了 / 履歴0件 / 外部送信0）

- `/work`の初回文面を既存の`initial_interest`契約へ統一した。初回は100〜160語・4段落・公開ページ根拠のみで、価格、支払条件、Japan Entry Packageの売り込み、URL、添付、通話提案を禁止し、詳細分析を受け取る意思だけを確認する。生成時の`productContext`はDeepSeekが書き直した要約ではなく、企業公開ページから直接抽出した原文へ固定した。
- 会社profileの`productContext`と`observedFacts`も公開ページ原文で上書きし、モデル由来の未確認商品表現をTwenty・レポートへ流さない。日本企業除外、SMB/Japan Entry適合、文面92/100、実フォーム90/100の既存fail-closed条件は維持した。
- 診断レポートは既存のJapan Entry事実抽出、診断content-template選択、`DiagnosticReportData`/表示基盤を共通利用する。SaaSは言語・JPY、serviceは言語だけ、ecommerceのみ配送・ローカル決済・commerce disclosureを扱い、需要、traffic、sales、ROI、法令違反を推測しない。source coverageは実際に収集・検証できた5ソースだけで算出する。
- Crawl4AIは通常探索と並列実行し、返却URLを信用せずHTMLを再取得して実フォームを確認した候補だけを採用する。release doctorへ`initial_interest`、公開原文、業態別共通事実、content template、HTMLフォーム検証の静的回帰ゲートを追加した。
- TypeScript、対象ESLint、Quality Guard **0 errors**、最終全Vitest **176 files / 792 tests**、production build **408/408 pages**、Playwright PC/Pixel 7 **2/2**がpass。E2Eで方針文、複数URL、履歴、価格なしラベル、error overlay/console errorなし、mobile横overflowなしを確認した。
- PR **#272 / #273**、manual work main **8b562b8c**、seed fix main **885113be**、最終deployment **y103mdoqravdurq2cy420muu**。正式`npm run release:prod`でhomepage CMS publish、DB **89/89**、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / Sales health JSON `ok:true`を含む`release gate passed`を確認。本番containerは両commitを含む`7d11fa13`でhealthy。`/work`は未認証時`/admin/login`へredirect、`/api/work`は未認証401、実DBは`manual_japan_entry_work` RLS有効・履歴0件。実企業URL投入、Twenty company追加、フォーム・メール等の外部送信は0件。

## CURRENT STATUS - 2026-07-15 Twenty高品質4,000件の母集団・審査・非送信同期基盤（本番収集・事前検査中 / 外部送信0）

- 高品質合格4,000社には現行2%歩留まりで約200,000 websiteの検査が必要なため、公式・無料の母集団を追加した。Common Crawl `CC-MAIN-2026-25` URL Indexを欧米豪・シンガポール・中東の26市場×問い合わせ/EC/SaaS 3シグナル、各最大5,000ドメインで収集する。英国問い合わせシグナルのlive smokeは5,000/5,000ドメイン取得。URL文字列は合格根拠にせず、本文・個人情報も保存しない。
- SBA SBIR/STTR公式公開CSVをstream処理し、公式サイトあり・従業員2〜249名だけをドメイン重複排除して最大50,000社取得する。担当者名・メール・電話は取り込まない。live smokeは394行から条件合格200社を正常抽出。
- Common Crawl由来でSMB根拠だけが不足する候補は、企業本人性・国・商材適合・実フォーム確認を先に通し、その後DeepSeek V4 Pro公式APIで保守的に分類する。96%以上、2件以上の原文引用が元ページに完全一致、2〜249名帯、EC/SaaS/商品ブランド、risk 0の場合だけSMB合格へ昇格する。その他の不足理由はAIへ回さずfail-closed停止する。
- 公式Tier 3の従業員/SME根拠、または上記V4高確度根拠を再確認し、管理画面の明示操作から20件ずつTwentyへ連続同期するrunnerを追加した。Twenty同期だけで、初回文面、診断レポート、Opportunity、メール、SNS、電話、フォーム送信は起動しない。操作と個別結果は既存DB監査ログへ保存する。
- 初回release preflightで`lead-source-records.ts`が501行判定となったためCoolify deploy前に停止し、特殊source adapterを専用ファイルへ分離した。records本体は482行、Quality Guardは0 errors / 62 existing warningsへ復帰した。
- PR **#264 / #265**、main **b495a9c2**、deployment **ob204hcbu643j82cp8simkqz**。正式releaseは一時的なhomepage seed fetch失敗後にseedを完了し、`release-doctor --post-deploy`でSales health JSON `ok:true`、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / public smokeを含む`release gate passed`を確認した。
- 本番へCommon Crawl 78 pack＋SBIR 1 packの計79 source packをdraft登録。公式利用条件を確認したSBIRとGB contactだけpreview/承認/ingestし、SBIR公開CSV 219,503行から従業員2〜249名・公式サイトあり・ドメイン重複除外10,974社、GB contact 5,000社を保存した。残り75 packは未承認draftのまま。
- SBIRのwebsite preflightと非送信inventory runを本番で開始した。過剰並列が一時障害判定を増やしたため停止し、安全な並列度へ戻して`retryable`を再検査する。部分的に合格済みのrecordだけをpilotで使え、量産は全preflight完了後だけ可能とする二段階readinessへ修正し、1 sourceの事前検査上限を10,000件から50,000件へ拡張した。TypeScript、対象Vitest **2 files / 10 tests**、Quality Guard **0 errors / 62 existing warnings** pass。
- 上記release後のresumeで、既存inventory runnerが再ingestしてpreflight進捗をpendingへ戻す欠陥と、DB claimがpartial pilotを拒む二重条件を確認した。resume中のsourceはready在庫を再利用し、15分lease中の`checking`を完了まで待機する。pilot専用RPCはfresh `eligible`だけをclaimし、batch RPCは従来どおりsource全件preflight完了を必須とする。外部送信経路は追加しない。
- lead resume修正の正式release中、同時変更のhomepage seedが日本語Heroを画像なし`split-image`、英語HeroをCMS upload relationへローカルURL objectとして保存しようとして500停止した。英語visualは既存renderer fallbackを使い、CMS seedから無効relation値を除去、日本語Heroを`centered`へ戻した。同じdeploymentは再実行せず、seed再実行とpost-deploy gateで確認する。
- US pilotで最初の高確度候補`Metascape L.L.C.`をTwenty同期し、国名`米国`、確認済みフォーム`https://metascape.dev/contact-us`、未送信statusをread-backした。ただしhomepageのgeneric titleが会社名へ昇格していたため量産停止。source名とdomainが一致するだけで全site nameへdomain scoreを付けていた原因を修正し、候補site name自身もdomain/公式名と一致する場合だけcanonical nameに採用する。
- Twenty高品質4,000件は未達。高確度レビューとTwenty read-backが完了するまで完成扱いにしない。初回文面、診断レポート、Opportunity、メール、SNS、電話、フォーム送信は起動しておらず、外部送信0件を維持する。

## CURRENT STATUS - 2026-07-15 Manual Japan Entry Workbench（本番release完了 / 履歴0件 / 外部送信0）

- `paradigmjp.com/work`へ、完全新規の海外企業URLを1〜20件投入し、最大3件並列で処理できる管理者専用の簡易ダッシュボードを追加した。処理段階、個別失敗、フォーム、初回文面、診断レポート、Twenty状態を専用履歴として保持し、リロード後も消えない。
- 既存営業automationとは完全分離した`manual_japan_entry_work`専用テーブル/APIを使用する。`sales_companies`、候補factory、pipeline、enrichment、outreachには書き込まず、既存から再利用するのは公開ページ監査、Crawl4AIフォーム探索、DeepSeek V4 Proの初回文面品質ゲート、診断レポート表示、Twenty低レベルclientだけ。
- `.jp`、JP国判定、日本法人表記を決定論で除外。海外SMB、Japan Entry適合、国、90点以上の実フォーム、92/100の初回文面品質を満たす場合だけTwentyへ`Manual Japan Entry / 手動確認 / 未対応`として追加する。既存Twenty domainは上書きせずduplicate停止し、メール・フォーム・SNS等の外部送信はDB制約を含め常に0件。
- RLS + service_role最小権限migration、認可GET/POST API、非公開token形式の`/en/work-report/[token]`、DBベル+Slack通知を実装。TypeScript、対象ESLint、Vitest **5 files / 12 tests**＋release wiring **1 test**、production build、Playwright主要フロー **1/1**がpass。agent-browserでPC/390pxとも内容表示、error overlay/console errorなし、mobile横overflowなしを確認した。
- PR **#258 / #259**、最終main **aa5fa0a6**、deployment **iv3vflq6hdecmdiihgwjd1hh**。正式`npm run release:prod`とpost-deploy doctorがpassし、新container healthy、Coolify queue 0、`/work` HTTP 200、未認証API 401、認証付きAPI 200。実DBで専用table実在・RLS有効・履歴0件、Twentyで`manual_work` option実在を確認。企業URL投入、Twenty company作成、フォーム送信、外部送信は実行していない。

## CURRENT STATUS - 2026-07-15 Japan Entry候補の非送信スケール検証（447社実確認 / 9社Twenty追加 / 外部送信0）

- 成約20件の必要母数を再整理した。送信成功後の成約CVRを1%とする場合は2,000件の実送信、フォーム到達・送信成功率を50%と置く場合は4,000件の送信可能候補が必要。今回の実測は実フォーム合格23/447（5.1%）のためフォーム発見までで約80,000 website、最終offer fit合格9/447（2.0%）まで含む4,000件の送信可能候補には約200,000 websiteの検査が必要になる。
- 承認済み公式source inventoryは3,257件、website preflight合格2,342件、そのうちSME 2,330件。現sourceだけでは4,000件の送信可能候補を作れないため、source追加なしに「数千件完成」とは扱わない。
- 12市場300 websiteの初回pilotに加え、GB batch 21件、DE / ES / IT pilot 75件、NL / FR / SG pilot 51件を処理し、累計447 websiteを実確認。実フォーム合格23件を全件公式サイトで再審査し、9件を承認、14件をグループ傘下・コンサル中心・地域サービス・旧ドメイン・証拠不足として除外した。
- Twentyへ追加した9社はTAIPRO ENGINEERING / ELCON SOLUTIONS / RUSSELL IPM / CELOPLAS / FLUIDINOVA / TECHNOPHAGE / PHYTOWELT GREENTECHNOLOGIES / Trifolio-M / SOLEMS。全社で国名、確認済みフォーム、`フォーム確認済み / Twenty登録済み / 未送信`をlive read-backし、report URLは空を確認した。
- 量産承認ゲートは8市場中、単一runでフォーム候補5件以上を確認したGB / PTだけを承認。他6市場は基準未達のため停止した。GB非送信batchは21件を処理してフォーム合格3件を得たが全件offer fit不合格。PT batchは直前pilotの30分claim lease中で候補0件となりfailed停止、lease後の再実行が必要。
- Sales DBは新規9社とも`list_only=true` / `skip_enrichment=true`、send result / sent_at / report URLは空。list-only総数92、既存outreach runは2件・最終2026-05-10のままで、今回の文面生成・レポート生成・フォーム送信・外部送信は0件。

## CURRENT STATUS - 2026-07-15 エキテン中心DEMO実務運用の一括投入化（本番release完了 / 候補追加待ち / 外部送信0）

### 実務運用を止めていた1件ずつ投入を解消
- `/ja/admin/demo-assets`のポータル候補一覧へ「審査可能候補を一括DEMO生成へ投入」を追加した。現在選択中sourceの`ready_for_review`かつ独自HPなし・画像3件以上の候補を最大50件まとめてDEMO生成キューへ入れられる。
- 一括投入時も、事業者本人の公式プロフィールであること、先頭画像に人物・透かし・権利リスクがないことの明示チェックを必須にした。個別投入と同じ`portal-candidates` APIを使い、素材は`private_proposal`・`officialSource=true`で登録する。
- この操作はDEMO生成キューまでで、メール、SNS、電話、郵送、ポータルDM、フォーム送信、7日限定URL発行、Twenty同期は自動実行しない。URL発行＋Twenty同期は品質合格後の別操作のまま。

### Verification / current production state
- PR **#247** / main **9d877d79** / deployment **dpwtjq4rvn53wsnlbqpnbbqs**。`npx tsc --noEmit`、対象ESLint、対象Vitest **3 files / 13 tests pass**、production build **408/408 pages**、`git diff --check` pass。正式`npm run release:prod`はDB **88/88**、Quality Guard **0 errors / 61 existing warnings**、Twenty HTTP 200、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / public smoke / Sales health JSON `ok:true`までpass。
- 本番`/ja/admin/demo-assets`はHTTP 200。本番chunk `page-a1c5b38848d8f9e2.js`に`審査可能候補を一括DEMO生成へ投入`が含まれることを確認した。
- 本番API確認時点でエキテン候補は1件（`ノン美容室`、status `promoted`）、DEMO batchはtotal 3 / completed 3 / qualityPassed 1 / sendingEnabled false。次の実務作業は通常ブラウザで確認したエキテン一覧・詳細HTML/選択範囲を貼り付け、候補数を増やしてからこの一括投入を使うこと。

## CURRENT STATUS - 2026-07-15 Twenty上でDEMO候補が見えない問題の修正（本番release完了 / Twenty read-back済み / 外部送信0）

### 原因と修正
- `ノン美容室`のDEMO URL自体はTwenty companyへ同期されていたが、ユーザーが確認する一覧ビュー側で`paradigmDemoUrl`が後方列へ押し出され、`paradigmLeadStatus`も標準表示対象に入っていなかったため、Twenty画面上では「変わっていない」ように見えていた。
- CRM field configの標準順を`会社名 -> domain -> 候補ステータス -> デモURL -> Next Action -> 営業ステータス -> フォームURL`へ固定し、`lead_status`を標準fieldへ追加、`demo_url`を3列目へ移動した。
- Twenty company list viewの正規化対象に既存候補ビュー名を含め、release後のCRM metadata再適用で現在のTwenty一覧ビュー`営業リスト`へ列順を反映した。

### Production verification
- PR **#244** / main **d454c795** / deployment **xuyjfi0dsfox51xjhalstk34**。正式`npm run release:prod`はDB **88/88**、Quality Guard **0 errors / 61 existing warnings**、Twenty HTTP 200、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / public smoke / Sales health JSON `ok:true`までpass。
- 本番`/api/sales/crm-field-config`へCRM metadataを再適用し、`lead_status` position 2、`demo_url` position 3、`next_action` position 4、`sales_status` position 5、`form_url` position 6を確認した。
- 本番実データ`ノン美容室`のDEMO job `c40ccbc0-a39d-4c18-af9c-9f56b63e9448`を再度`syncTwenty:true`で実行し、Twenty company `54bba233-8f6d-44aa-b7ec-397c79b0683c`へ同期成功。Twenty REST read-backで`paradigmLeadStatus=DEMO生成済み / 要確認 / 未送信`、`paradigmDemoUrl=https://demo.paradigmjp.com/%E3%83%8E%E3%83%B3%E7%BE%8E%E5%AE%B9%E5%AE%A4`、`paradigmNextAction=DEMOを目視確認（未送信）`を確認した。
- Twenty DB上の一覧ビュー`営業リスト`は`name 0 true`、`domainName 1 true`、`paradigmLeadStatus 2 true`、`paradigmDemoUrl 3 true`、`paradigmNextAction 4 true`、`paradigmSalesStatus 5 true`、`paradigmFormUrl 6 true`。外部送信、Opportunity、レポート、初回文面、メール、SNS、電話、郵送、フォーム送信は実行していない。

## CURRENT STATUS - 2026-07-15 検証済み候補をTwentyで確認する非送信経路（本番release・実画面確認完了 / 外部送信0）

### 本番パイロットと個別レビュー
- 生の収集在庫はTwentyへ入れず、既存の`evidence_first_sources`候補ファクトリーでDE / IT / ESを各25件、合計75件実サイト検証した。実フォーム候補4件を個別確認し、microresist.deはニュース記事上のフォーム、multichannelsystems.comは独立SMB条件外としてreject。coronis.esとvinidea.itだけをapproveした。
- Twentyへ追加したのは承認済み2社のみ。`CORONIS COMPUTING SL`（Twenty ID `810ddf50-a875-466b-b04d-8944006fb6b8`）は国名`スペイン`、フォーム`https://coronis.es/es/contacto`。`VINIDEA SRL`（Twenty ID `a458846b-647f-4bc7-8dd3-d8a58a6029a5`）は国名`イタリア`、フォーム`https://vinidea.it/contact`。
- 両社とも候補ステータス`フォーム確認済み / Twenty登録済み / 未送信`、Next Action`候補レビュー待ち（未送信）`。診断レポート、営業資料、デモURLは空で、Sales DBも`list_only=true / skip_enrichment=true / pending`、`report_url / send_result / sent_at`は空を維持する。

### Twenty表示・送信副作用の最終確認
- `paradigmCountryName`をTEXTへ固定し、フォームURL read-backはscheme / host / default port / hash / path末尾スラッシュだけを正規化する。別パスは引き続き`form_url_mismatch`でfail-closed停止する。
- Twenty一覧のapplication overrideを物理DB列`overrides`へ保存するよう修正。CRM metadata再適用とTwenty server / worker再起動後、country view fieldは`isVisible=true / position=7 / universalOverrides={position:7,isVisible:true}`。ログイン済みChromeで`営業リスト`の`国名`列、CORONISの`スペイン`、VINIDEAの`イタリア`を確認し、ページ再読込後も表示が維持された。
- 対象2社に紐づく`sales_pipeline_runs / sales_enrichment_jobs / sales_diagnosis_events / sales_artifact_manifest / sales_initial_form_drafts / mvp_outreach_runs`はすべて0件。初回文面、Opportunity、レポート、enrichment、メール、SNS、電話、郵送、フォーム送信は起動していない。
- PR **#245 / #248 / #251**、最終main **f47c5926**、deployment **ghhpl9lkddfwn496akyeojhx**。対象Vitest、全Vitest **162 files / 746 tests**、TypeScript、対象ESLint、quality guard **0 errors / 61 existing warnings**、production build **408/408 pages**、DB **88/88**、Twenty worker restart 0、Sales health JSON `ok:true`、正式`release gate passed`を確認した。

## CURRENT STATUS - 2026-07-15 SMB DEMO合格候補のTwenty可視化（本番release完了 / Twenty確認入口稼働 / 外部送信0）

### Twentyで必ず確認できる未送信DEMO候補同期
- `/ja/admin/demo-assets`の生成waveで、品質合格済みDEMOの7日限定URLを発行する操作を「URL発行＋Twenty同期」へ変更した。発行済みDEMOはTwenty企業へ`DEMO生成済み / 要確認 / 未送信`、`7日限定DEMO URL`、品質スコア、失効日時、根拠数、次アクション`DEMOを目視確認（未送信）`として同期される。
- Twenty同期は合格済み`demo_generate` jobだけが対象。URL発行時に`syncTwenty: true`を明示し、read-backでdemo URL、lead status、next action、summary一致を確認する。不一致ならAPIは207で返し、成功扱いにしない。
- Twentyへの書き込みはCRM確認用のみ。Opportunity、レポート、初回文面、メール、SNS、電話、郵送、ポータルDM、フォーム送信は作成・実行しない。Sales DB側にも`demo_site.url`と`twenty.demoUrl`を保存し、後続監査で追跡できる。

### Verification
- TypeScript `npx tsc --noEmit` pass、対象ESLint pass、対象Vitest `src/app/api/sales/demo-site/batch/route.test.ts` **1 file / 6 tests pass**、production build **408/408 pages** pass、`git diff --check` pass。
- PR **#240** / main **0a0f8847** / deployment **vdeomj8uxwoyvhu2ue1tb7jt**。正式`npm run release:prod`はDB **88/88**、Quality Guard **0 errors / 61 existing warnings**、Twenty credential確認、Twenty HTTP 200、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / 公開smoke / Sales health JSON `ok:true`までpass。本番`https://paradigmjp.com/api/ready`はHTTP 200、`/api/sales/demo-site/batch`は未認証HTTP 401。本番admin chunk `page-5d9c90c2f94c2842.js`に`URL発行＋Twenty同期`、`syncTwenty`、Twenty同期完了toastが含まれることを確認した。
- 本番実データで`ノン美容室`の合格済みDEMO job `c40ccbc0-a39d-4c18-af9c-9f56b63e9448`を1件だけ`syncTwenty:true`で実行し、Twenty company `54bba233-8f6d-44aa-b7ec-397c79b0683c`へ同期成功。Twenty API直接read-backで会社名`ノン美容室`、`paradigmDemoUrl`=`https://demo.paradigmjp.com/%E3%83%8E%E3%83%B3%E7%BE%8E%E5%AE%B9%E5%AE%A4`、`paradigmLeadStatus`=`DEMO生成済み / 要確認 / 未送信`、`paradigmNextAction`=`DEMOを目視確認（未送信）`、summary内DEMO URLありを確認した。外部送信、Opportunity、レポート、初回文面は作成していない。

## CURRENT STATUS - 2026-07-15 エキテン中心SMB DEMO実務運用の高速化（本番release完了 / エキテン貼り付け量産入口稼働 / 外部送信0）

### 1件ずつ入力する運用を廃止する貼り付け抽出
- `/ja/admin/demo-assets`のポータル候補フォームへ、エキテン専用の「一覧・詳細ページ貼り付け抽出」を追加した。通常ブラウザで確認したエキテンの一覧ページまたは詳細ページHTML/選択範囲を貼ると、`/shop_...`リンク、事業者名、本文、住所候補、画像URLを抽出し、最大300件の一括保存JSONへ変換する。
- サーバー側からエキテンへアクセスしない。operatorがブラウザで見た公開情報を貼り付けるだけなので、Google検索・SNS・Google Map・ポータル巡回・proxy・有料APIを使わず、既存のoperator-confirmed snapshot経路にそのまま乗せる。
- 住宅リフォーム/外壁/屋根/防水、整体/鍼灸、行政書士/社労士/税理士、美容室などを貼り付け本文から簡易分類し、画像3件未満は候補JSON化しない。抽出後は既存の一括保存、候補審査、300社wave投入、失敗再試行、7日限定URL発行へ接続する。

### Verification
- `npm install`は1519 packages / audit 0 vulnerabilities。`src/components/admin/PortalSnapshotImportForm.tsx`は293行で500行未満。
- TypeScript `npx tsc --noEmit` pass、対象ESLint pass、対象Vitest **2 files / 13 tests pass**、production build **408/408 pages** pass、`git diff --check` pass。
- ローカル本番chunk `.next/static/chunks/app/[locale]/admin/demo-assets/page-dbd5ffe65bf328da.js` に `エキテン一覧・詳細ページ貼り付け抽出`、`候補JSONへ変換`、抽出ロジックが含まれることを確認した。ローカルdevの`/admin/login`ブラウザ確認は検証用`DATABASE_URI`未設定でPayload初期化500となったため、UIの実ブラウザ操作は正式release後の本番認証環境で確認する。
- PR **#236** / main **64c2123a** / deployment **nbl42lf1dyg57hnqk4d23rdt**。正式`npm run release:prod`はDB **88/88**、Quality Guard **0 errors / 60 existing warnings**、Sales health JSON `ok:true`、Twenty HTTP 200、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / 公開smokeまでpass。本番`https://paradigmjp.com/api/ready`はHTTP 200、`/api/sales/demo-site/portal-candidates?source=ekiten`は未認証HTTP 401。本番admin chunk `page-02f1b913afffd74c.js`に`エキテン一覧・詳細ページ貼り付け抽出`、`候補JSONへ変換`、`DOMParser`、`/shop_`抽出が含まれることを確認した。
- 外部送信、ポータルDM、メール、SNS、電話、郵送、フォーム送信、Twenty追加、実エキテンへのサーバー取得は実行していない。

## CURRENT STATUS - 2026-07-15 検証済み候補在庫の数千件自動量産（本番release完了 / source承認前 / 外部送信0）

### 公式SMEデータをCodex非依存で取込・再開する経路
- 欧州委員会CORDISのHorizon Europe / Horizon 2020月次公開ZIPを、欧州15市場・2世代の30 source packとして追加した。`SME=true`、`activityType=PRC`、企業名、公式サイト、組織ID、EC根拠URLが揃う行だけをstreaming CSV parserで抽出し、国別・domain別に重複排除する。既存Wikidata 10市場と合わせて40 pack。登録時は従来どおりdraft / inactive / terms未確認で、規約確認・preview・担当者承認を迂回しない。
- ZIP adapterはpublic HTTPS / DNS再検証、redirect上限5、圧縮80MB、展開120MB、50万行、dataset filter後2.5万行のfail-closed上限を持つ。 malformed quoteを許容する一方、必須列欠落・想定entry欠落・サイズ超過は保存前に停止する。公式Tier 3の`is_sme=true`だけをSMB客観根拠98点として使い、enterprise signalがあれば0点へ戻す。企業同一性・サイト国・EC/SaaS適合・実フォームは別ゲートのまま。
- `sales_lead_inventory_runs`へ収集元単位の進捗、取込数、サイト利用可、除外、一時障害、失敗とheartbeatを保存し、承認済みpackを順次ingest→全件website preflightするevent-driven runnerと認可API、管理GUIを追加した。途中停止したrunning runは同じDB位置から再開できる。run tableのCHECKで`send_count=0`かつ`twenty_sync_count=0`を強制し、文面・レポート・Twenty・フォーム送信を接続しない。

### Production verification / remaining operator gate
- 実CORDIS H2020 ZIPを新adapterで直接取得し、ドイツはfilter後1,045行・重複排除可能355 domain、公式EC根拠URL付きsampleを確認した。事前集計では優先15市場の2世代合算で約2,400 unique domain。これは候補母集団であり、実サイト・企業同一性・対象国・offer fit・フォーム合格後の件数を「数千件」とは未確認。
- 対象Vitest **8 files / 29 tests**、main統合後の全Vitest **161 files / 740 tests**、TypeScript、対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、release-doctorの新しい静的gate、`git diff --check`がpass。
- PR **#234** / main **1a638221** / deployment **xtpewz7x17jad1k9fl4rr4yr**。正式`npm run release:prod`は新migration、DB **88/88**、Sales health JSON `ok:true`、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / 公開smokeまでpass。本番`/ja/admin/lead-factory`はHTTP 200、新inventory / source pack APIは未認証HTTP 401。本番JS chunkで`数千件・検証済み在庫ラン`、`未登録packを一括draft登録`、`1国最大5,000候補・1,000社を実確認`を確認した。
- release直後の本番DBはsource pack 0、approved pack 0、inventory run 0、inventory send 0、inventory Twenty sync 0。コード配布だけで候補登録・取込・Twenty・文面・レポート・送信が起動していない。次は管理画面で必要なpackをdraft登録し、再利用条件の人間確認→preview→承認後に非送信inventory runを開始する。実サイト・企業同一性・対象国・offer fit・フォーム合格を実測するまで「高品質な数千件完成」とは判定しない。

## CURRENT STATUS - 2026-07-15 国別Lead Source Pack（実装・本番DB rollback検証完了 / release前 / 外部送信0）

### Codexなしで国別sourceを再現する入口
- 北米・欧州・豪州・シンガポール・中東の優先10市場を、版・ライセンス・最大件数・クエリSHA-256付きsource packとして管理画面からdraft登録できるようにした。登録時は必ず`terms_checked=false / active=false / approval_status=draft`でDB保存し、既存の規約確認、非保存preview、担当者承認、ingest、サイト事前検査を一切迂回しない。
- 初期packはWikidata CC0の企業名・公式サイト・国・従業員数・業種が揃う候補だけを、従業員2〜249名、EC/SaaS等の業種、解散登録なし、archive/SNS URLなし、1国最大250件のbounded queryで取得する。Wikidataを公的登記とは扱わずtrust tier 2の構造化根拠とし、Japan Entry適合・フォーム・本人性は後段で別検査する。
- source configにpack ID / version / license / query hashを保存するmigration、認証付き一覧・冪等draft登録API、loading / empty / error状態と外部ライセンスリンクを持つGUI、operator監査・DBベル/Slack通知を追加した。登録操作から候補取込、Twenty、文面、レポート、フォーム送信は起動しない。

### Verification / remaining gate
- 公式Wikidata endpointでUS packを実行し、企業名・website・従業員数・業種・HTTPS entity URLを持つ50件を取得、archive/SNS URL 0件を確認した。対象Vitest **3 files / 9 tests**、TypeScript、対象ESLint、release-doctorの新しいsource-pack静的gate、migrationの本番DB `BEGIN -> DDL -> ROLLBACK`がpass。
- 正式release、公開管理画面/API確認、sourceのdraft登録からpreview・承認・ingest・事前検査、5件以上の実フォームを含む非送信pilotは未実行。batch承認、Twenty追加、文面/レポート生成、外部送信は開始しない。

## CURRENT STATUS - 2026-07-15 SMB DEMO 300社wave量産（本番release完了 / 数百社wave運用準備完了 / 外部送信0）

### 数百社運用に耐えるwave単位の量産制御
- `/api/sales/demo-site/batch`の一括受付上限を100社から300社へ拡張し、1回の実務waveを`waveId`で追跡する。enqueueは最大8並列、実際のデモ生成drainは既存どおり品質優先の最大3並列に抑え、数百社を受けてもLLM/API/DBへ過剰負荷をかけない。
- 既存の`sales_enrichment_jobs`を単一の永続queueとして使い、`input_payload.wave_id`へwave情報を保存する。新規DB tableは追加しないため、既存migration/RLS面を増やさず、途中停止後も`GET ?waveId=`で進捗再取得、`PATCH retry_failed`で失敗分だけ再投入できる。
- 管理GUIに300社manifest投入、進捗バー、queued/running/completed/quality passed/failedの件数、15秒自動更新、停止時の再開、失敗分再試行、完了分URL発行を追加した。外部送信は引き続きfalseで固定し、URL発行も既存の7日限定previewだけを対象にする。

### Houzz / エキテン / ジモティー候補の人手確認を数百件化
- ポータル候補APIの表示上限を300件へ上げ、GUIは20件ずつページングして画像カードを一気に描画しない。リストが大きくなっても管理画面の初期描画を重くしない。
- ブラウザ確認済みプロフィールの一括保存は最大300件のJSONを受け付け、内部では50件chunkに分割して既存APIへ順次保存する。スクレイピングやGoogle/SNS自動取得は追加せず、operator-confirmed snapshotだけを量産入力にする。

### Verification
- `npm install`は1507 packages / audit 0 vulnerabilities。`git diff --check` pass。
- TypeScript `npx tsc --noEmit` pass。対象Vitest **4 files / 14 tests pass**（300件wave、301件拒否、wave別retry、drain回帰）。production build **408/408 pages** pass。
- agent-browserで`http://localhost:3100/ja/admin/demo-assets`を確認。管理ログイン後、HTTP 200、本文あり、Next error overlayなし、`最大300社`と`失敗分を再試行`のUI表示あり。mobile 390pxも横overflow 0。ローカルSupabase/Payload未設定に伴う候補取得エラー表示は想定どおりで、UIは落ちていない。
- PR **#232** / main **11dbfc85** / deployment **k10tim3y83ckq55n9qmg07xt**。正式`npm run release:prod`はDB **87/87**、Quality Guard **0 errors / 60 existing warnings**、Traefik / Cloudflare origin lock / Realtime / Twenty worker restart 0、公開smoke、Sales health HTTP 200 JSON `ok:true`までpass。
- 本番確認: `https://paradigmjp.com/api/ready` HTTP 200、`/api/sales/demo-site/batch`と`/api/sales/demo-site/portal-candidates?source=ekiten`は未認証HTTP 401。`/ja/admin/demo-assets`の本番chunk `page-71f47359ef9a3766.js`に`最大300社`、`失敗分を再試行`、`waveId`、`retry_failed`が含まれることを確認。
- 実300社生成は未実行。LLM/APIコストと外部候補副作用を避けるため、まず本番反映後に10件 -> 50件 -> 300件の非送信pilotで運用負荷と品質を確認する。メール、SNS、郵送、電話、ポータルDM、フォーム送信、Twenty追加は実行していない。

## CURRENT STATUS - 2026-07-15 Lead Source website preflight強化（本番release・再pilot完了 / batch未承認 / 外部送信0）

### 数千件を504なしで検査するfail-closed経路
- 前回pilotの失敗2件を本番DBで確認し、`starschema.com`は恒久的なDNS不達、`bluepathlabs.com`は現在DNS・HTTPS 200が回復した一時障害と特定した。従来は両方ともcandidate runの`failed`へ入って失敗率を押し上げていた。
- `sales_lead_source_records`へ`pending / checking / eligible / retryable / rejected`の事前検査状態、理由、時刻、試行回数、客観evidenceを追加。public DNS / private-reserved IP / HTTPS redirect / HTTP status / HTML content-typeを検査し、7日以内の`eligible`かつsource全件検査完了時だけclaimできるDB制約へ変更した。
- 1 API requestは50件・同時10件まで、DBの`FOR UPDATE SKIP LOCKED` claimと15分stale recoveryで処理する。管理GUIが最大10,000件までchunkを継続し、未検査だけ・一時障害だけ・全件再検査を選び分けるため、長時間単一requestによる504と同一候補の重複検査を避ける。件数と上位除外理由はDB集計をAPI / GUIへ即時表示する。
- 再ingestまたは再検査で候補集合が変わると既存のpilot量産承認を自動解除する。文面生成、Opportunity、レポート、Twenty同期、フォーム送信は事前検査から起動しない。

### Production verification / remaining gate
- 新migrationは本番DB上の単一transactionで`BEGIN -> 全DDL/RPC -> ROLLBACK`し、既存schema互換とSQL実行を副作用なしで確認した。対象Vitest **4 files / 18 tests**、全Vitest **155 files / 711 tests**、TypeScript、対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、`git diff --check`がpass。
- `lead-source-records.ts`は530行へ増えた時点で候補readiness / atomic selectionを`lead-source-selection.ts`へ分離し452行へ戻した。新規依存は追加していない。
- 初回の正式releaseはdeploy開始前に、release-doctorが分割前の`lead-source-records.ts`だけを検査していたため静的gateで停止した。同時に新migrationが正式releaseの明示適用リストへ未配線だった点も検出し、doctorを新selection / preflight実体の検査へ更新、migration適用関数と回帰テストを追加した。gateは迂回せず修復後に再実行した。
- deployment `xhf4odik8od4nqu6px6ymjc4`で新migrationを適用後、source 9件の本番事前検査は7 eligible / 2 rejected。この実測でWordPress.com公開IP`192.0.78.24/25`まで予約域扱いする既存`192.0/16`判定を発見し、SSRF防御対象を`192.0.0.0/24`とTEST-NET-1 `192.0.2.0/24`へ正確化した。最終deployment `keomk5hb9m7mk9t91j2n6teq` / image `85d6f3bd...`はDB 87/87、Sales health JSON `ok:true`、Twenty worker restart 0、Realtime / Traefik / 公開smokeを含むpost-deploy gateまでpass。再検査は**8 eligible / 0 retryable / 1 rejected（starschema.com NXDOMAIN）**。
- 非送信再pilot `23b4c654-954c-415b-98cb-715c5b8d1869`は新たにclaim可能になった`bluepathlabs.com` 1件だけを取得・検証し、failed 0 / review_required 1 / Twenty sync 0でcompleted。従業員30名、US根拠、identity 90は確認できたがJapan Entry offer fit 0のため`japan_entry_offer_fit_missing`で安全停止した。Sales Company追加0、outreach run総数2のまま、sourceの`pilot_approved_at`はnull。
- batch量産は未承認。再pilotは1件しか新規検証できずフォーム合格率を評価できないため、次の実務作業は同じ品質基準で対象国sourceを拡充し、5件以上のフォーム確認を含むpilotを成立させること。Twenty追加、文面生成、レポート生成、外部送信は自動で開始しない。

## CURRENT STATUS - 2026-07-14 Japan Entry Lead Factory実務稼働開始（非送信pilot稼働 / batch品質ゲート未承認 / 外部送信0）

### 本番実測
- 正式release deployment `l3hw5439vqkvmra1x1fuo1k7` / `l5a589jkmfvagztuubgcohpw` / `gm932wa6vnnz9iq82e5kijxd` / 最終`od772orb2c4asmj55evkyze9` はDB **87/87**、Sales health JSON `ok:true`、Twenty HTTP 200・worker restart 0、常駐runtime 0、公開smokeまでpassした。
- list-only候補79社を再監査し、実drift 3社（Bajoperfil36 / Jewelry On 5th / Weston Main）だけを再同期した。requested 3 / repaired 3 / failed 0、再preview drift 0、Twenty ID欠落 0、旧report URL 0、外部送信 0を確認した。
- CC0のWikidata公式structured dataを利用したUS EC/SaaS SMB限定sourceを登録し、preview 9/9、evidence URL 9/9、ingest 9、reject 0。広すぎた最初のsourceはsuspendedの監査履歴として隔離した。
- 非送信pilot `9982e0c1-e8d9-47ee-a4b0-b51ea0adc603` は9社取得・9社検証・3社採点・フォーム合格1・要レビュー2・品質除外2・取得失敗2で終了した。失敗率22.2%のためsourceのbatch量産承認はfail-closedのまま。WeLaunch 1社だけを40名SMB、AI/SaaS適合、米国根拠、実フォームconfidence 94の目視判断で承認し、approved 1 / failed 0 / invalid 0でTwenty同期した。

### 最終ハードニング
- 開始APIが新runと無関係な過去候補全件を返していた経路を削除し、run summaryだけを返す。数千件蓄積後もレスポンスサイズと全件list queryが増えない。
- 候補1社の承認ごとにTwenty全field/viewを再設定していた同期処理を廃止する。CRM metadata変更は明示設定API / release経路だけで行い、個別承認は軽量auth preflight後にlive company patchを実行する。必須field不備やTwenty障害は`promotion_failed`と監査ログへ保存してfail-closedを維持する。
- Twenty更新直後にlive read-backを追加し、企業ID、国名、フォームURL、未送信status、next action、カルテ、旧report / material / demo URLの空状態を一致確認する。不一致なら同期成功にせず`promotion_failed`へ止める。
- WeLaunchの本番read-backは国名`米国`、フォーム`https://welaunch.ai/contact-us`、未送信カルテ、report / material / demo URL空、Sales DB `approved` / Twenty synced、Opportunity 0、文面未生成、外部送信0。list-only総数80、Twenty ID欠落0、report URL残存0、送信済み初回文面0、既存outreach run総数2のまま。batchはpilot失敗率が20%以下になるまで開始しない。

### 既存Twenty候補を破壊せず監査・修復する経路
- `list_only=true`かつ`skip_enrichment=true`の候補だけを対象に、Twenty ID、候補カルテ、旧営業ステータス、旧レポートURL、pipeline状態のdriftを検出する。管理画面でpreview後に不整合だけを最大3並列で再同期し、企業ごとのrequested / repaired / failedをoperator監査ログへ保存する。
- Twenty側はdomain検索を先に行うため重複企業を作らず、既存企業を現在のlist-onlyカルテへ更新する。ローカル側もTwenty IDとcanonical summaryを再保存し、旧report URLをnull、pipelineをpendingへ戻す。Opportunity、初回文面、診断レポート、外部送信は生成しない。
- 2026-07-14時点の本番事前監査ではlist-only候補79社、Twentyリンク78社、旧レポート文言2社、Twenty ID欠落1社を確認。停止していたpilot run `2b7b82b2-1fa5-4635-b100-fc19331061c5`は、既存の認証・監査付きcancel APIでcancelledへ変更済み。実データ修復は正式release後に新APIから実行する。
- 初回production previewは保存済みsummaryと現在再計算したsummaryの完全一致を要求し、過去同期後に`tech_stack`がnull化された76社までdriftと誤判定したため、修復せず停止した。current list-only構造と禁止済み旧レポートmarkerで判定する方式へ変更し、欠落`tech_stack`は候補scoreの検出slugから人間可読名へ復元する。実DBと同じ条件でdriftは3社だけに戻ることを確認した。

### 持続可能な収集元とrelease gate
- CSV / JSON / JSONL / HTMLごとに正しいAccept headerを送り、配信hostと企業詳細hostが異なる公式データは`source_page_allowed_hosts`で明示許可する。HTTPS、public DNS、同一または許可subdomain、25MB上限、preview、規約確認、operator承認、明示ingestの既存fail-closed条件は維持する。
- Lead Source GUIに承認済みsourceの一時停止・再有効化を追加。収集元候補はCC0のWikidata公式structured dataをUS SMB向け限定queryで登録し、preview合格後にのみingest・非送信pilotへ進める。B Corp directoryは商用・robot利用条件に合わないため採用しない。
- Cloudflare edgeの一時502/503/504/522だけをTwenty redirect検査で最大3回・短いbackoff付きで再確認する。その他URLは従来どおり1回、永続障害は最終attemptでrelease失敗を維持する。

### Final verification
- TypeScript、対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、全Vitest **153 files / 693 tests pass**、`git diff --check` pass。従来残っていた日本語代表文面の長さ不一致と、`core.autocrlf=true`でshellがCRLFになる4テストも、内容追記と`.gitattributes`の`*.sh eol=lf`固定で解消した。
- PR **#219 / #221 / #224 / #226**をmainへmerge。公式source登録、preview / ingest、非送信pilot、人手承認、Twenty read-back、DB監査まで完了したため、非送信pilot運用は開始済み。batch量産だけは品質ゲート未達のため未承認であり、自動開始しない。

## CURRENT STATUS - 2026-07-14 SMB DEMO V6本文品質回帰の修復（本番反映・PC/mobile実画面QA完了 / 外部送信0）

### 「品質100」でも本文が悪化した原因をrendererと品質ゲートで修正
- ノン美容室の実画面中段で、`登録公式URL`、404確認、取得日、電話番号、同一注意文が長文本文へ混入し、文字数だけが増えた状態を確認した。DeepSeek自体の限界ではなく、短文を補う決定論フォールバックがsource-health evidenceを顧客向けコピーへ流し込み、Premium V3編集が生成時と読込時に非冪等で重複付与していたことが原因。
- evidenceを文・連絡先・source metadataへ分解し、URL、電話番号、404、取得/更新日、source運用文を編集用factから除外。短い生成本文はHome / About / Services / Works固有の編集文で補い、Home / About / Servicesは重複のない3章、Worksは4章以上へ固定した。footer / FAQも同じcurationを通す。
- 品質ゲートを`2026-07-14.8`へ更新し、customer-facing本文のsource metadata漏洩と同一文反復をhard blocker化。Premium V3のWorks enrichmentは何度読んでも同じ結果になるよう冪等化し、既に保存された旧注意文も読込時に除去する。iframe待機中は白紙ではなく企業名付きloading surfaceを表示する。

### Release / real-company verification
- PR **#220 / #222 / #223**、最終main **592e06d813805e5c9d3d2d048adfbf89d776b062**。最終`npm run release:prod` deployment **gvztx157j47qir85yhozkefg**は、DB **87/87**、Cloudflare / Traefik / Realtime / Twenty、Sales health HTTP 200 JSON `ok:true`を含むpost-deploy gateまでpass。
- 関連最大 **8 files / 41 tests**、追加の冪等/legacy回帰 **2 files / 21 tests**、TypeScript、対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages** pass。
- 同じ実企業「ノン美容室」を本番で再生成し、**68.30秒 / quality 100 / blocker 0 / warning 0 / private_review**。URLは`https://demo.paradigmjp.com/ノン美容室`。PC実DOMはHome 2,096文字 / About 2,054 / Services 2,116 / Works 1,718 / Contact 841、全ページ横overflow 0。Worksは6 scene、source metadata 0、旧注意文 0、サービス要約は1回だけ。ContactはGoogle Maps 1、form 1、入力6項目。
- mobile 390pxはHome 2,057文字・9,259px、Contact 841文字・4,616px、いずれも横overflow 0。hero、drawer、地図、フォームの実表示を確認した。候補追加、Twenty同期、メール、電話、郵送、ポータルDM、フォーム送信などの外部送信は実行していない。

## CURRENT STATUS - 2026-07-14 Japan Entry候補factoryのoperator approval hardening（本番反映・公開QA完了 / 外部送信0）

### 収集元・候補・Twentyの境界を人間の明示承認へ変更
- lead sourceは登録時に必ずinactive/draftとし、候補を保存しないpreview、利用条件確認、担当者名付き承認、明示ingestの順に限定した。量産モードは成功したpilotを人間が評価して承認したsourceだけを使い、収集開始時のTwenty同期、文面生成、レポート生成、外部送信はDB制約とAPIの両方で常にfalseに固定する。
- 決定論ゲート合格候補も自動昇格せず`awaiting_review`へ隔離。根拠snapshotの不変性、sourceの現行承認、証拠の鮮度、対象国、SMB・機会スコア、HTTPS実フォームとDOM/provider証拠を再検査し、担当者が最大20件・3文字以上の判断理由付きで承認した企業だけをTwentyへ同期する。承認、除外、pilot量産承認、停止、停止した同期の復旧はすべてappend-only監査ログへ保存する。
- Twenty昇格時は既存のcountry metadata/国名field自己修復を通す。同期失敗は`promotion_failed`として候補単位で可視化し、15分以上停止した処理だけを手動で再レビュー可能へ戻す。自動再同期や外部送信への接続はしない。

### 数千件運用の持続性とfail-closed設計
- `sales_claim_lead_source_records` RPCで、承認済みsourceだけを`FOR UPDATE SKIP LOCKED`により原子的にclaimする。30分lease、同一run内domain dedupe、直近180日のterminal候補除外、selection countをDBで処理し、複数workerでも同じ候補を再取得しない。
- 実行は同時2 runまで、pilotは最大3か国・候補100件/国・実確認25件/国に制限。量産は`START VERIFIED BATCH`の明示確認を必須とし、開始前・取得後・各検証batchでcancelを再確認する。GET/Realtime閲覧では処理を進めず、cron・常駐polling worker・SearXNG・Tranco・検索Regexを復活させない。
- DeepSeek経路を公式API直叩きへ統一し、LiteLLM/OpenRouter fallbackを削除。初回フォーム文面は人間がTwenty昇格させた後の別操作でのみDeepSeek V4 Pro生成でき、URL・資料・価格を含めず、外部送信0件を維持する。

### Release / verification
- PR **#214** / main merge **fe82def6** / 正式deployment **axzl5p3h85y8h42dwdpoa8kz**。`npm run release:prod`はoperator approval migration、DB **87/87**、Sales health HTTP 200 JSON `ok:true`、Traefik / Cloudflare / Supabase Realtime、Twenty HTTP 200・worker restart 0、常駐runtime 0を含むpost-deploy gateまでpassした。
- 本番`/ja/admin/lead-factory`はHTTP 200、lead source APIとfactory APIは未認証HTTP 401。DB実体でsource **0件 / active 0件 / approved 0件**、operator event 0件、claim RPC 1件、主要fail-closed constraint 3件を確認したため、release時に収集・Twenty追加が副作用で起動していない。
- TypeScript、全体ESLint、変更対象Vitest **13 files / 55 tests**、本流統合後の相互作用 **6 files / 33 tests**、production build **408/408 pages**、PC/mobile Playwright **4/4**がpass。全体Vitestは **148/150 files・678/683 tests pass**で、変更外の既知5件（日本語代表メッセージ191文字に対する旧200文字期待1件、`core.autocrlf=true` checkoutでbackup shellのLFを期待する4件）のみ不一致。
- この作業ではsource登録・preview・ingest、候補収集、Twenty追加、文面/レポート生成、フォーム送信を実行していない。最初の実データ操作は、利用条件を人間確認したsourceの非送信pilotとし、自動量産や自動Twenty同期から開始しない。

## CURRENT STATUS - 2026-07-14 SMB DEMO Content / Art Direction V6（再設計実装・本番QA前 / 外部送信0）

### 薄い文章と反復テンプレを生成後の小修正ではなくschemaから廃止
- 旧DeepSeek schemaがHome 3 features / About 4 values / Services 3件だけを求め、WorksはLLM対象外、さらに業種別整形が生成後のWorks全文を4枚の画像captionへ上書きしていた原因を特定した。1社1回・3候補共通のDeepSeek呼び出しは維持しつつ、Home narrative 3章、About 3章、Services guidance 3章、Works 4〜6章を長文の構造化JSONで生成する。確認済み画像のalt/captionもgrounding factへ追加するが、権利不明素材は入力しない。
- DeepSeek完了条件を、Home features 3、About values 4、Services 3 / process 4、3種のnarrative各3章、Works 4章以上かつ本文最低長へ引き上げた。欠落・短文・JSON切れはrules-basedの薄い公開物へフォールバックせず生成失敗として停止する。Prompt cache用の共通prefixと1社1回呼び出しは維持し、出力上限だけ12,288 tokensへ拡張した。
- 品質ゲートを`2026-07-14.7`へ更新。Home 900 / About 1,050 / Services 1,000 / Works 800文字、各narrative本文120文字、Works 4章・各120文字をhard blocker化し、8ページのcomposition値が6種未満の反復サイトも停止する。旧スキーマ相当のデモは点数が高くても公開不可となる。

### 下層ページを同一heroの使い回しからページ固有の編集設計へ分離
- Homeはブランド導入、Aboutは章立ての読み物、Servicesはcatalogue＋利用前guide、Worksは非対称lookbook、Contactは画像heroを使わない情報起点のdark header＋Google Maps＋送信停止formへ分離した。美容室のmosaicもHome grid / About editorial / Services strip / Works lookbookの4構図を持ち、低解像度素材を全面拡大しない。
- 美容室でもDeepSeekの汎用`modern-grotesk`指定が法人用Outfitへ落ちる経路を修正し、業種内のbrand systemだけを候補にする。美容室はNoto Serif JPまたはShippori Minchoの見出しとZen Kaku Gothic New本文を組み合わせ、汎用法人書体へ逸脱しない。
- 初期`opacity:0`に近いReveal / text-lineを廃止し、SSR直後から内容を読める0.94〜0.96のprogressive enhancementへ変更。Framer Motionのscroll reveal / parallax / progress / kinetic railとEmbla carousel、自動再生停止、reduced-motionは維持する。

### Verification / remaining gate
- 変更対象ESLint、TypeScript、デモ関連 **6 files / 32 tests pass**、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、`git diff --check` pass。新規依存なし。
- この時点ではコード検査のみ。正式release、同じ実企業「ノン美容室」のV6再生成、PC / mobileのHome / About / Services / Works / Contact実ブラウザ比較、実DOM文字量と横overflow確認が終わるまで「品質合格」「量産開始」としない。候補追加、Twenty同期、ポータルDM、メール、電話、郵送、フォーム送信は実行していない。

## CURRENT STATUS - 2026-07-14 Japan Entry証拠付き候補factory（本番反映・公開QA完了 / 外部送信0）

### 旧Tranco母集団を廃止し、企業証拠から始める収集へ再構築
- 本番候補factoryの母集団を、Tranco順位・SearXNG・検索結果Regex・推測会社名から完全分離。対象国ごとに、運用者が利用規約を確認した公的企業名簿・輸出事業者・業界団体・展示会出展者・管理済み構造化feedだけを`lead source`として登録し、企業名・公式domain・source pageを同時保存する。収集元が未取込・失敗・停止中ならrunはHTTP 409でfail-closedとなり、Twentyへ何も追加しない。
- `sales_lead_source_configs` / `sales_lead_source_records`をRLS + service_role最小権限で追加し、DB・認可API・管理GUIを一体実装。JSON / JSONL / CSV / HTML CSS selectorに対応し、HTTPS・public DNS・redirect再検証・25MB上限・同時取込ロック・500件batch upsert・途中失敗時の旧データ保護を実装した。売上の`$1.5M`や従業員レンジ`11-50`も上限値へ正規化する。
- 候補ごとに企業名同一性、対象国の独立サイト根拠、営利性、除外業種、従業員2-249または売上$50M以下等のSMB根拠、EC/SaaS適合、DOM上のemail+message+submitを持つ実問い合わせフォームを順に検証。不明は定数スコアで通さず`review_required`へ隔離し、nonprofit・media・education・government・enterprise・商品/checkout/newsletter・無関係external formは除外する。
- フォーム抽出はCheerio DOM parserを主経路、Crawl4AIをSPA fallbackだけに限定。DeepSeekは候補収集で使わない。全ゲート合格企業だけが確認済み企業名・国・source page・form evidence付きでSalesCompany/Twentyへ同期され、Opportunity・文面・レポート・外部送信は収集runから起動しない。旧`multi_source_domains` runは実行関数・復旧API・watchdogの3層で再起動不可にした。

### Verification / handoff
- 変更範囲Vitest **13 files / 53 tests pass**、TypeScript、全体ESLint、quality guard 0 errors、release-doctor static/infra、production build **408/408 pages** pass。全体Vitestは今回変更外の既知5件（日本語代表メッセージ旧200文字期待1件、CRLF checkoutのbackup shell 4件）のみ失敗し、今回追加した管理画面の一時timeoutは単独再実行でpass。
- PR **#207 / #208** / final main commit **51df341d** / 最終deployment **b13n3eyc8rlis2w8rxomxcq5**。新規migration適用、DB **86/86**、Sales health HTTP 200 JSON `ok:true`、Traefik / Cloudflare / Supabase Realtime / Twenty worker restart 0、公開日本語・英語URL、Twenty HTTP 200を含むpost-deploy gateがpassした。管理画面`/ja/admin/lead-factory`はHTTP 200、lead source APIは未認証HTTP 401を確認。収集元登録、候補収集、Twenty追加、文面・レポート生成、外部送信は実行していない。
- release後も承認済み収集元0件の状態ではfail-closedを維持する。実際のsource URLと再利用条件を人間確認してから国別pilotを開始する。

## CURRENT STATUS - 2026-07-14 SMB DEMO Art Direction V5（Codex非依存化・本番QA前）

### DeepSeekをコピー生成器から実装可能なアートディレクターへ拡張
- 1社につきDeepSeek呼び出しは1回のまま、Home / About / Servicesの企業固有コピーに加え、3候補それぞれの視覚コンセプトを構造化JSONで生成する。候補ごとにタイポグラフィ、hero、サービス、実績、配色、モーションを選び、rendererがその6軸を実画面へ反映する。Codexによる企業別コード修正を量産フローの前提にしない。
- Premium V3へeditorial split / precision split / cinematic / mosaic hero、editorial list / catalogue / precision gridサービス、journal / lookbook / case grid実績、5種のneutral palette、4種の書体方針、3種のmotionを配線した。トップだけでなくAbout / Services / Works等の下層heroと構成も同じart directionに追従する。
- 既存の1件用AI builderも候補数可変の同じDeepSeek schemaへ統一し、3候補の量産経路は完全に同一prefixを使うためprompt cacheを維持する。

### 品質判定を「点数100」からfail-closedの実描画事前検査へ変更
- 管理画面の点数表記を「事前検査」と明記。構造、コピー、権利、素材を確認するpreflightであり、実ブラウザの最終品質保証ではないことを表示する。
- 同じtemplate IDかどうかではなく、実際に描画される6軸のvisual grammarをfingerprint化。3候補内の完全一致だけでなく80%以上の近似一致、過去のprivate review / approved / publishedデモとの近似一致もhard blockerにする。まだrendererに接続していないdensity / motifは差分の水増しに使わない。
- mosaic以外のheroへ寸法不明または幅1,200px / 高さ720px未満の審査済み画像を拡大する場合、画像URLと取得済み寸法からfail-closedにする。display / body fontの完全同一、画像反復、企業固有concept欠落も停止する。

### ローカル検証と残る公開条件
- デモ関連 **17 files / 59 tests pass**、TypeScript、変更対象ESLint、quality guard **0 errors / 59 existing warnings**、production build **408/408 pages**、`git diff --check` pass。新規依存なし。
- この段階では外部送信、候補追加、Twenty同期、ポータルDM、フォーム送信を行っていない。コード検査は合格したが、未知の複数実企業をDeepSeekだけで生成し、PC / mobileでHomeと下層を実ブラウザ比較するまでは「品質合格」「量産開始」と判定しない。
- 初回本番QAで既存「ノン美容室」の235×353px画像が約804×892pxへ拡大され、旧`salon-air`書体のまま表示される不合格を検出。cinematicだけを止めていた画像ゲートを修正し、mosaic以外のheroは寸法不明または1,200×720未満をすべてfail-closedにする。既存デモの表示を合格扱いせず、新パイプライン再生成と再QAを必須とする。
- V5本番再生成ではDeepSeekが別コンセプト3案を約18秒で返したが、3案ともmosaic以外を選んだため全件`hero_media_resolution_risk`・70点で正しく停止した。素材制約をLLM任せにせず、寸法不明または低解像度の画像では候補0を必ずmosaicへ安全補正する。コピー、書体、サービス、実績、配色、motionの企業固有directionは保持し、残り2案は停止理由を可視化する。
- media-safe補正後の本番再生成は約29秒で、候補0のmosaicだけが100点・`private_review`、残り2案は70点・`hero_media_resolution_risk`で停止した。PC実ブラウザQAでは美容サービス3件を2列表示した最終行の右側が大きな空白となる組版不良を検出したため、奇数件の最終カードを全幅表示へ補正し、構造点とは別に目視QAを継続する。

## CURRENT STATUS - 2026-07-14 Japan Entry候補収集のSearXNG廃止・パッシブコーパス量産化（本番反映 / 外部送信0）

### 2026-07-14 proxy不要の候補factory再構築
- proxyなしSearXNG／検索結果スクレイピングを数千件収集の主経路にしない方針へ確定。旧SearXNG API・UI・source、browser-search、検索orchestrator、Common Crawl CDXの一括候補取得、release時のSearXNG provisionを削除し、候補水源をローカル/CZDS zone、任意の受動feed、Tranco top-1M fallbackへ置換した。既知domainの検証はネイティブDNS CNAME、HTTP技術判定、国根拠、SMB、実問い合わせフォームの順でfail-closedにする。
- 本番hostから`paradigm-searxng` container、設定directory、cache volumeを削除。最終deployment後もSearXNG/search container 0、`/opt/paradigm-searxng`不存在を確認。旧`migration_032`由来の2テーブルは監査履歴として残すが、runtime producer/API/UIは存在しない。
- 実測はTrancoからUS/GB/AU/CA/DE/FR/NL各1,000候補を約0.1〜2.0秒、SG 871、AE 735を取得。ネイティブDNSは`.com` 1,000件約10.9秒、3,000件約27.7秒で、3,000件からShopify 146 / HubSpot 12 / Squarespace 3 / Wix 2 / Webflow 1を検出。Common Crawl archiveの逐次照合はpilotで詰まりを確認したためbulk pathから完全除外した。
- Twenty同期前にCRM field metadataを自己修復し、国名field `paradigmCountryName`（表示名`国名`）を候補viewへ追加。最終pilotのSnagtightsをTwenty APIで照合し、国名`米国`、実フォーム、`フォーム確認済み / Twenty登録済み / 未送信`、`候補レビュー待ち（未送信）`を確認した。

### 本番pilotと回帰修正
- 最終pilot run `ecced422-6320-45b3-b0d1-113c81851498` はUS / Shopifyで100候補取得、20社検証、技術一致3、フォーム合格8、厳格ゲート通過1、Twenty同期1、タイムアウト2。失敗domainは各attempt 1で`failed`へ固定され、同一社の即時再検証ループは再発していない。
- 途中pilotで発見した重複技術証拠によるDB conflict、failed行の再選択、Crawl4AI 404反復、失敗status更新の未確認を修正。技術slugを事前dedupeし、検証対象を`discovered`だけに限定、Crawl4AIをbulk pathで無効化、失敗保存はDBから`failed`行が返るまで最大3回確認し、保存不能ならrun全体をfail-closedにする。
- `policies/legal-notice`上の汎用newsletter formを問い合わせフォームと誤認する実例を検出。policy/legal/privacy/terms/refund/return/shipping/account/login/cart/checkout/password pathを非問い合わせURLとして除外した。再pilotで`thesoundofvinyl.us`は`form_missing`・Twenty同期falseとなり、旧pilotで作成した誤登録Twenty recordはDELETE後HTTP 404まで確認した。
- pilot対象runの`initial_form_drafts`は0、`sent=true`は0。DeepSeek文面生成、レポート生成、フォーム送信は実行していない。

### Release / verification
- main merge: PR **#194 / #196 / #198 / #199 / #200**。最終commit **1b20a89b0842eedde41bd571a60c4773065dd665**、正式deployment **hrszkt6kdtkzgrsop6m701i7**。
- 最終release gateはquality guard 0 errors、DB **84/84**、Traefik / Cloudflare / Supabase Realtime / Twenty worker restart 0、公開日本語・英語URL、Twenty、診断レポート、Sales health HTTP 200 JSON `ok:true`を含めてpass。
- 対象回帰は最大 **5 files / 22 tests pass**、TypeScript、対象ESLint、`git diff --check` pass。全体Vitestの既知変更外5件（日本語代表メッセージの旧200文字期待1件、CRLF依存backup shell 4件）は別課題として残る。

## CURRENT STATUS - 2026-07-14 SMB DEMO企業名URL 404修正（本番反映・CookieなしQA完了）

### 期限付き未公開URLをCookie不要のクリーンURLへ統一
- `https://demo.paradigmjp.com/{企業名}`を新しいブラウザで直接開くと、HTTP 200でも`Demo Not Found`を描画する不整合を確認。原因は、管理画面が初回だけtoken queryでCookieを発行するURLを返す一方、営業用にはqueryなしの企業名URLだけを使う設計だったこと。
- `temporary_unlisted` access modeを追加。企業名だけのURLをCookieなしで最大7日閲覧でき、`preview_expires_at`を過ぎると自動的に404へ戻る。`is_published=false`、`private_review`、noindex、審査済みasset manifest、送信停止は維持する。企業名slugは推測可能なため「完全非公開」とは表示せず、「検索非掲載・正式公開前・期限付き」と明記する。
- URL発行API、最大100件batch、管理画面、公開fetch、失効API、DB制約、正式release migrationを同じaccess modeへ統一。新規発行URLは`https://demo.paradigmjp.com/{企業名}`のみでtoken queryを含まない。
- PR #201 / merge commit `bc487280` / deployment `rfjqy05yxh1u88xuwcwf8lgk` で正式リリース完了。`SMB demo temporary unlisted access migration`、84/84 DB table verification、post-deploy release doctorがpass。
- 既存「ノン美容室」を`temporary_unlisted`で7日間再発行し、期限は`2026-07-21T07:36:11.903Z`。新規タブで`https://demo.paradigmjp.com/ノン美容室`を直接開き、タイトル、プレビューバー、端末切替、失効表示、実素材6件の描画を確認。root / about / services / works / faq / contactはCookieなしでHTTP 200、`Demo Not Found`なし、noindexを確認。
- ローカル検証: 関連Vitest **3 files / 12 tests pass**、TypeScript、変更対象ESLint、script syntax、`git diff --check`、production build pass。候補収集、Twenty同期、フォーム送信、外部送信は実行していない。

## CURRENT STATUS - 2026-07-14 SMB DEMO Art Direction V4（下層画像品質の最終追補・再リリース前）

### テンプレ感・タイポグラフィ・美容室下層ページの構造修正
- 「ノン美容室」の実ブラウザ指摘をrenderer起因として修正。美容室を飲食・法人と同じ全面写真＋巨大明朝＋英字labelの文法から分離し、Zen Kaku Gothic中心の専用brand system、editorial split hero、日本語microcopy、長文見出しの文字数連動scale上限を追加した。既存payloadの旧`salon-air`も読込時に`salon-editorial`へ移行するため、再生成なしで現行デモへ反映できる。
- 美容室Homeを専用構成へ置換。企業固有hero、所在地／予約導線、価値観、メニュー、スタイルcarousel、FAQ、CTAを別々の視覚文法で構成し、hero文とintro文が一致する場合は確認済みvalue情報へ自動差し替えする。Aboutはmissionの三重表示を解消し、全下層heroも業種別split/cinematicを固定した。
- Servicesは巨大写真の左右交互テンプレから画像付きcatalogueへ、Worksは交互sectionから不均等lookbook gridへ変更。ContactのGoogle Maps／送信停止form、Framer Motion、Embla carousel、reduced-motion対応は維持し、新規依存は追加していない。
- 品質ゲートを`2026-07-14.4`へ更新。hero titleとeditorial intro、intro bodyとAbout storyの完全重複を`repeated_home_narrative`でfail-closedにし、長い日本語heroは最大3.2rem・line-height 1.18へ抑える回帰testを追加した。
- ローカル検証: デモ関連 **3 files / 16 tests pass**、TypeScript、変更対象ESLint、quality guard **0 errors / 59 existing warnings**、production build **408/408 pages**、`git diff --check` pass。全Vitestは **132/134 files・605/610 tests pass**で、変更外の既知5件（日本語代表メッセージ191文字の旧期待1件、CRLF依存backup shell 4件）のみ不一致。外部送信、候補収集、Twenty同期、フォーム送信は実行していない。
- PR **#192**をmainへmergeし、正式deployment **ta2vq6vhnjly4lmb007tqzok**とpost-deploy gateを完走。直後の「ノン美容室」実ブラウザQAで、旧全面写真よりタイポグラフィは改善した一方、heroが67.968pxで語中改行し、審査済みエキテン画像の実体が159px角なのに764px幅へ拡大されていた問題を検出した。合格扱いせず、長文heroを最大3.2remへ縮小して句読点で意味単位改行し、hero／メニュー／lookbook／carouselを小画像mosaic・compact表示へ変更。追補後の関連 **3 files / 17 tests pass**、TypeScript、変更対象ESLint、production build **408/408 pages**。最終本番QAまでは候補追加と外部送信を停止する。
- 画像mosaicと見出し閾値の追補をPR **#193 / #195**でmainへmergeし、正式deployment **cocealoontjzxc2w7ptd4i4h**まで完走。公開HomeでH1 **44.588px**、句読点位置の2行改行、横overflow 0、6枚mosaicを確認した。その後の下層QAで、エキテンの`?1to1_m`付き縮小画像をsplit heroへ拡大する残課題を検出したため、再び合格を保留した。
- 最終追補は美容室の全下層heroを共通split写真から6枚のeditorial mosaicへ分岐し、`image.ekiten.jp`の既知サムネイル指定だけを除去して同一審査済み原本を利用する。他host・署名queryは保持する回帰testを追加。関連 **3 files / 10 tests pass**、TypeScript、変更対象ESLint、`git diff --check` pass。再リリースとPC / mobile実画面QAまでは、外部送信、候補収集、Twenty同期、フォーム送信を停止する。

## CURRENT STATUS - 2026-07-14 Premium V3モーションシステム強化（本番反映・実ブラウザQA完了）

### 2026-07-14 Apple-style interaction foundation
- Premium V3で`PremiumV3Reveal`が`initial=false`のまま実表示トリガーを持たず、全ページが静的に見えていた原因を修正。`restrained / editorial / expressive`ごとの表示領域進入モーション、見出しのマスク式行送り、stagger、スクロール連動parallax、ページ進捗、kinetic railをFramer Motionで共通部品化した。
- 旧Premium V2のカルーセルaliasを廃止し、EmblaベースのPremium V3専用カルーセルへ置換。自動再生、ドラッグ、active slideのscale/opacity、caption crossfade、線形progress、一時停止・再開、前後操作を実装。hover・keyboard focus・document非表示・`prefers-reduced-motion`時は自動再生を止める。
- Homeのfull/split hero、下層共通hero、story image、サービス一覧、全ページ共通nav/mobile drawerへ同じmotion languageを適用。モバイルではscroll-linked motionを描画しない分離componentとし、transform/opacity主体、動画preload metadata、reduced-motion静止表示を維持する。新規依存は追加せず既存Framer Motion / Emblaを深く利用した。
- ローカル検証: Premium V3 motion回帰 + demo quality gate **2 files / 15 tests pass**、TypeScript、全ESLint、quality guard **0 errors / 59 existing warnings**、production build **408/408 pages**、`git diff --check` pass。全Vitestは既知の変更外2 files / 5 testsのみ不一致（日本語代表メッセージ191文字とworktree CRLFのbackup shell test）で、今回のPremium V3テストを含む130 files / 600 testsはpass。
- PR **#189**をmainへmergeし、正式`npm run release:prod`のdeployment **tkzkslq3tas1wki6pl51ks5h**を完走。DB **84/84**、Sales health HTTP 200 JSON `ok:true`、Traefik / Cloudflare / Realtime / Twenty worker restart 0を含むpost-deploy gate pass。
- Cafe SOSOMUとGREYMAN一級建築士事務所の本番実ブラウザQAを実施。Home / Aboutの新hero、kinetic rail、mobile drawer、carousel自動進行を確認し、animation style nodeは各26〜29、carouselは実時間で01→02→03へ進行、PC 1256pxとmobile 390pxで`scrollWidth === clientWidth`、Next error overlay 0。GREYMAN既存タブで旧chunk由来のhydration log 1件を検出したが、fresh tabでは再現せずconsole error 0を確認した。
- 外部送信、候補収集、Twenty同期、フォーム送信は実行していない。

## CURRENT STATUS - 2026-07-14 エキテン実候補→Premium V3本番デモの実務pilot（生成・QA完了 / 外部送信0）

### 2026-07-14 ノン美容室の実素材デモ生成と量産ゲート修正
- Houzzを先行確認したが、画像・経営者直結・独立HPなしを同時に満たす候補は0。エキテンで横浜市港北区の「ノン美容室」を選定した。女性店長1人、地域営業42年、2席、公式プロフィール47写真、登録Business Siteは2026-07-14時点404をブラウザ確認し、大企業シグナル0、SMB適合100、`ready_for_review`で候補DBへ1件保存した。
- エキテン公式店舗の店内写真6点を目視し、人物・透かしなし、`private_proposal`、`collectionPolicy=no_automated_fetch`のreviewed manifestとして本番生成へ投入。初回は同一の素材審査メモを画像ごとに再利用したため`repeated_customer_copy`で70点・公開停止し、メモを本文と誤認しないよう品質判定を修正した。本文そのものを3回繰り返す回帰ケースは引き続きfail-closed。
- 再生成結果は3候補、選定`prism`、品質 **100/100**、4軸各25、hard blocker 0、warning 0。7日で失効する署名付き非公開URLを発行し、`is_published=false` / `private_proposal` / 画像6点 / 外部送信0を維持する。
- 本番実ブラウザQAはHome + About / Services / Works / FAQ / Contact / News / Recruit / Privacy / Terms / Commerceの **11/11ページ**。下層main DOMは1,112〜2,972文字相当、見出し3〜13、画像0〜10、ContactのGoogle Mapsと送信停止フォーム、PC / tablet / mobile切替、mobile header/menuボタン、2026-07-21失効表示を確認した。
- バッチ画面で`ttlDays: 7`を受けながら無期限クリーン公開を試みていた不整合を修正。完了ジョブはmanifestの審査済み素材から署名付き非公開URLを一括発行し、実際の失効日時を返す。UI文言も「7日限定URL」へ統一し、token実値はDBへ保存しない。
- ローカル検証: 対象Vitest **2 files / 13 tests pass**、TypeScript、変更対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、`git diff --check` pass。メール、電話、郵送、SNS、ポータルDM、フォーム営業、Twenty同期は実行していない。
- PR **#185**をmainへmergeし、正式`npm run release:prod`のdeployment **ifs4u5pwp2j1osuk3jwsltjz**を完走。DB **84/84**、Sales health HTTP 200 JSON `ok:true`、Traefik / Cloudflare / Realtime / Twenty worker restart 0を含むpost-deploy gate pass。本番batch APIから同じ完了jobへ`ttlDays=7`を指定し、`previewUrl`と実失効日時`2026-07-21T04:33:21.017Z`が返ること、入口から正規`/ノン美容室`へ遷移してtoolbar・失効日・11ページ導線・企業固有heroが表示されることを再確認した（token実値は記録しない）。

## CURRENT STATUS - 2026-07-14 ポータル候補のSMB意思決定ゲート・持続可能な一括収集（本番反映 / 外部送信0）

### 2026-07-14 Houzz・エキテン・ジモティーの経営者直結候補選定
- ポータルURLを本番サーバーから直接取得する経路を廃止。通常ブラウザで確認済みの公開プロフィールだけを構造化スナップショットとして1〜100件保存し、検索エンジン、Google Maps、SNS本文、proxy、ポータル巡回を呼び出さない運用へ変更した。
- 独自HPはHTTPSだけでなく古いHTTPも検知して除外。上場、全国展開、多拠点、企業グループ、FC、従業員100人以上、資本金1億円以上、ハウスメーカーを大企業シグナルとしてfail-closed除外する。
- 「専門家が在籍」だけでは通さず、代表者・店主・院長・所長・オーナー・創業者・本人・個人／家族経営の直接シグナルと、地域性・沿革・資格・専門性の両方を必須化。独自HPなし、掲載画像3点以上、説明／所在地を満たす候補だけを画像審査とDEMO生成へ進める。
- 管理画面は大企業除外数、意思決定者未確認数、審査可能数、生成投入数を分離表示。除外候補も監査証跡として候補DBに保存するが、営業対象リスト・DEMO生成・外部送信へは昇格させない。メール、電話、郵送、SNS、ポータルDM、フォーム送信は引き続き0。
- 検証: ポータルURL制約、HTTP独自HP、現行／旧スナップショット再判定、SMB／大企業／意思決定者ゲート、素材manifest、API認証・自動drainを含む関連Vitest **4 files / 22 tests pass**、TypeScript、変更対象ESLint、quality guard **0 errors / 60 existing warnings**、production build **408/408 pages**、`git diff --check` pass。全体Vitestは既存の日本語代表メッセージ191文字に対する200文字超テスト1件だけが今回変更外で不一致（バックアップscript 5件はworktreeのCRLFを一時正規化して5/5 pass）。
- PR **#179**をmainへmergeし、正式`npm run release:prod`のdeployment **gzd6hoibki3yl1x47wqeqbgk**を完走。DB **83/83**、Sales health HTTP 200 JSON `ok:true`、Traefik / Cloudflare / Realtime / Twenty worker restart 0を含むpost-deploy gate pass。本番管理画面のJS chunkで`ブラウザ確認済みプロフィールを保存` fingerprintを確認し、ポータルAPIは未認証HTTP 401。候補DB投入、DEMO生成、外部送信は実行していない。

## CURRENT STATUS - 2026-07-14 Japan Entry候補リスト実運用開始・旧Twenty自動Pipeline削除

- 本番Wave 1/2としてShopify候補をUS/GB/AU/CA/SG/AEの6市場で各100件、合計600件取得。各市場40件、合計240件を実検証し、US 7 / GB 9 / AU 10 / CA 4 / SG 5 / AE 9の合計44件を品質ゲート通過後にTwentyへ同期。全6runで失敗0、外部outreach run 0。
- 運用後監査で、候補factoryとは別の旧経路`sales-pipeline-watchdog -> runTwentySyncTick -> pullTwentyCompaniesToSupabase(autoRunPipeline=true)`が、旧Our Placeレコードに対して約1分ごとに失敗Pipelineを生成していることを検出。step生成時点で制約違反停止し、文面・レポート・送信には到達していなかった。
- Twenty pullをデータ同期専用へ縮小。Pipeline自動生成オプション、旧`twenty-pipeline-intake.ts`、毎分同期からのPipeline起動、旧レポート再生成tick、Twenty新規取込時のレポートURL先行生成を削除。明示選択会社向け`/api/sales/pipeline-runs`は維持し、Twenty同期だけではPipeline・レポートを作れない。
- ローカル検証: 関連Vitest 2 files / 8 tests、TypeScript、対象ESLint、quality guard 0 errors / 59既存warnings、production build 408/408、`git diff --check` pass。
- PR **#180**をmainへmergeし、正式`npm run release:prod`のdeployment **shzc92ojvjtlxvndlkuyfx12**を完走。DB 83/83、Sales health JSON `ok:true`、Twenty HTTP 200 / worker restart 0、公開smokeを含む全ゲートpass。
- 本番で旧障害と同じ`include_twenty_sync=true` tickを明示実行し、Twenty 48社を同期しても新規Pipeline run 0。続く130秒・14回の監視でも新規run 0を確認し、以前約1分ごとに増えていたOur Place failed runの停止を実証した。

## CURRENT STATUS - 2026-07-14 Houzz・エキテン・ジモティー候補→SMB DEMO量産レーン（本番反映・実ブラウザQA完了 / 外部送信0）

### 2026-07-14 Portal sourced SMB demo factory
- 管理者画面 `/ja/admin/demo-assets` に、Houzz → エキテン → ジモティーの3系統を切り替える候補収集コンソールを追加。検索エンジンを巡回せず、operatorが指定した各ポータルの公開HTTPS URLだけを最大100件ずつ、同時5件で取得する。
- 取得した事業者名、業種、説明、住所、電話、SNS、掲載画像、独自HP候補を既存 `sales_lead_candidate_*` DBへ保存。`source_slug`を `houzz` / `ekiten` / `jmty` のまま保持し、独自HPあり、画像3点未満、説明・住所不足はDEMO生成対象からfail-closedで除外する。
- 画像はoperatorが元ページを確認し、人物・透かしを除外して3点以上選択した場合だけ `reviewed_manifest` 化。スナップショット外URLを拒否し、`private_proposal` として登録するため、権利確認前のクリーン公開URLと外部送信は既存ゲートで停止する。
- 承認済み候補は既存の最大3件並列one-shot drainへ自動接続し、同一企業・同一manifestは既存結果を再利用。11ページPremium V3、品質94点、hard blocker 0の既存基準を緩めず、メール・電話・郵便・SNS・ポータルDM・フォーム送信・Twenty同期は接続していない。
- ローカル検証: ポータル抽出・HP判定・素材審査・API認証・自動drain・再利用を含む全Vitest **125 files / 571 tests pass**、TypeScript、全ESLint、quality guard **0 errors / 60 warnings**、production build **408/408 pages**、`git diff --check` pass。
- PR **#170**をmainへmergeし、正式`npm run release:prod`のdeployment **lvckkb5hj4ybr5m30abkcaie**を完走。DB **83/83**、Traefik / Cloudflare / Realtime / Twenty worker restart 0、Sales health HTTP 200 JSON `ok:true`、post-deploy smokeを含む全ゲートpass。本番ポータルAPIは未認証HTTP 401で存在と認証境界を確認し、候補投入・DEMO生成・外部送信は実行していない。
- 全DEMOページ最上部へPreview Toolbarを追加。PC 100% / tablet 820px / mobile 390pxを同一オリジンiframeで切り替え、実際のレスポンシブbreakpointを検品できる。注意事項だけを閉じるInfo、全画面表示、toolbar全体を閉じるXを実装。非公開URLは「削除」と誤認させず、一般公開・検索登録なし＋実際の失効日を表示する。
- signed private URLの有効期間をUI・private access API・batch API・serviceの4層で最大7日に統一し、8日以上はDB書き込み前にfail-closed。公開showcaseは期限を偽装せず「検索登録なし・正式公開前」と表示する。
- Preview Toolbar検証: interaction / notice / 7日上限を含む **3 files / 11 tests pass**、TypeScript、変更対象ESLint、quality guard **0 errors / 60 warnings**、production build **408/408 pages** pass。実務判定は、候補URL投入→審査→品質gate付きDEMO生成→7日期限URL発行までpilot運用可能。ポータル自動送信と無審査の数千件投入は未接続のため、full-scale送信運用はまだ開始不可。
- Preview ToolbarはPR **#175**でmainへmergeし、正式`npm run release:prod`のdeployment **wdrpbatfxpoono4swjxrs7ra**を完走。DB **83/83**、Sales health HTTP 200 JSON `ok:true`、post-deploy gate pass。本番`https://demo.paradigmjp.com/cafe-sosomu`でPC / tablet / mobile切替、mobile実幅390px、注意事項close、toolbar close、iframe内の下層ページ遷移後もtoolbar維持を実ブラウザ確認した。

## CURRENT STATUS - 2026-07-14 Japan Entry文面20社一括生成→Twenty保存の本番試験（完了 / 外部送信0 / QAデータ削除済み）

### 2026-07-14 Opportunity Brief factory production batch verification
- 本番に合成QA企業20社を隔離投入し、`sending_enabled=false`のまま最大3社並列のone-shot drainで文面生成→投影保存→Twenty企業カルテ同期を実行。キューは手動tickなしで20社の末尾まで到達し、外部フォーム・メール・電話・郵送・outreach jobは0件、`sent_at`更新0件、既存`mvp_outreach_runs`総数2件にも増加なし。
- 初回試験で、Twentyの選択型へ`SaaS` / `ecommerce` / `service`や未知の取得元を直接渡す不整合を検出。既存taxonomyへ安全に正規化し、未登録の国・取得元は誤分類せずnullにする修正をPR **#153**でmainへmerge。続く実試験で`paradigmSourceCoverage`の実体がTEXT型なのに数値を送る不整合を検出し、文字列化をPR **#156**でmainへmergeした。
- 最終結果は **18/20社（90%）completed + Twenty同期成功**、2/20社は決定論的品質ゲートでfail-closed。停止理由は、①商品文脈にない主張＋140語未満、②入力にない性能／添付資料主張。閾値を緩めず、不適格文面は投影・Twentyへ保存しない。
- 合格18社の実測: quality **min 94 / avg 98.67 / max 100**、safety **18/18で100**、語数 **197–214（平均206.11）**、4段落 **18/18**、初回文面URL **0**、未置換プレースホルダー **0**。入力87,054 / 出力27,717 tokens、prefix cache **44,288 hit / 42,766 miss（50.87%）**。
- Twenty実体で18社全件を照合し、カルテ本文 **3,724–3,870文字**、Opportunity Brief URL、国・業種分類、`Japan Entry初回フォーム文面を確認（未送信）`を確認。試験後はTwentyのQA企業 **18/18削除**、SupabaseのQA企業20社・job20件・投影・sync log 147件も削除し、両環境のQA企業残存数 **0**。
- 検証: 関連Vitest **2 files / 9 tests pass**、TypeScript、対象ESLint、quality guard **0 errors / 59 warnings**、production build **396/396 pages**。正式`npm run release:prod`はdeployment **mpatatvqofx42r53mhflz6u5**と最終 **ux3080ahlo3wwkhh7fi82smo**を完走し、DB **83/83**、Traefik / Cloudflare / Realtime / Twenty worker restart 0、Sales health HTTP 200 JSON `ok:true`までpost-deploy gate pass。

## CURRENT STATUS - 2026-07-14 SMB Premium V3全ページ品質・業種別ブランドDNA（本番反映・飲食/建築の実ブラウザQA完了 / 送信停止）

### 2026-07-14 SMB Premium V3フルサイト品質強化
- Cafe SOSOMUのHomeだけでなく、About / Services / Works / News / FAQ / Recruit / Privacy / Terms / Commerce / Contactの全11ページをPremium V3 rendererへ接続。ページ固有のstory、service index、visual journal、information desk、culture/recruit、document、Google Maps、送信停止フォームを実装した。
- restaurant / beauty / dental / construction / retail / corporateへ業種別Brand DNAを追加し、書体、余白、色、角、画像処理、hero toneを企業IDとdesign recipeから決定する。建設・B2B等は飲食店の全面写真heroを流用せず、精密なsplit corporate heroへ切り替える。
- 品質ゲートを`2026-07-14.3`、合格94点へ更新。全11ページごとの最低文字量、Premium V3 Brand DNA、8ページ以上のpage compositionをhard blocker化し、トップだけ綺麗・固定ページが薄いデモは公開停止する。SNSのない法人案件は、公的レジストリ・事業者提供・operator verified等のreviewed manifestがあれば通し、出典も公式導線もない案件はfail-closedを維持する。
- Cafe SOSOMU本番実ブラウザQA: `https://demo.paradigmjp.com/cafe-sosomu` の全11ページを確認。Home 5,267px / About 4,175px / Services 5,880px / Works 4,163px / News 3,279px / Recruit 3,028px / FAQ 2,166px / 法務各2,000px超 / Contact 3,102px。Google Maps iframe 1、送信停止フォーム1、PC hero 66.56px、mobile 390px hero 43.2px、横溢れ0、drawer開閉を確認した。
- 非飲食の実務投入として、那須塩原市の公開リストで事業者名・所在地・一級建築士事務所を確認した`GREYMAN一級建築士事務所`を選定。自動スクレイピングせず`collectionPolicy=no_automated_fetch`、公的レジストリ＋ライセンス済み提案画像3点で生成した。初回はSNS必須・出典伝播不足・CTA三重コピーを品質ゲートが54点で停止。基盤修正後は3候補すべて**quality 100 / blocker 0 / warning 0**、private reviewとして30日期限の署名URLを発行した（tokenはTask.mdへ保存しない）。
- GREYMAN本番実ブラウザQA: 日本語の正規`/{企業名}` URLで発生した二重encode/Cookie path 404をPR #160/#161で修正。最終的に全11ページ表示、Home 5,517px / About 4,317px / Services 5,952px / Works 4,192px / News 3,279px / Recruit 3,320px / FAQ 2,190px / 法務各2,000px超 / Contact 3,215px、broken image 0、Google Maps iframe 1、送信停止フォーム1、mobile 390px横溢れ0、drawer開閉を確認した。飲食語彙・存在しないSNS導線は0。
- PR #155 / #157 / #159 / #160 / #161をマージ。最終`npm run release:prod`はdeployment `dg2gnlfzvog70e04voc94qdj`、quality guard 0 errors、DB 83/83、post-deploy smoke / Revenue OS infra / Traefik / Sales healthを含む全ゲートpass。関連Vitest最大**5 files / 17 tests**およびURL修正を含む**4 files / 24 tests**、TypeScript、ESLint、production build **396/396 pages**、`git diff --check`を確認。メール、電話、郵送、フォーム送信、Twenty同期、営業通知は実行していない。

## CURRENT STATUS - 2026-07-14 共通機会損失セクションの背景面再設計（本番反映・公開QA済み）

### 2026-07-14 International urgency section surface refresh
- `JapanMarketUrgencyBar` の共通セクションを、本文直後の暗い背景と混ざらない `paper-deep` 面へ変更。境界線を上下に追加し、青のラベル／ハイライトと濃色CTAで情報階層と可読性を揃えた。
- 検査: `npm exec -- tsc --noEmit`、対象ESLint、`npm run quality:guard`（0 errors / 59 warnings）、`npm run build`（396ページ）、`git diff --check` pass。
- `npm run release:prod` の公開ゲートを完走（deployment queue `q8ez6s08qjb5lrqk49ysstxz`）。DB `83/83`、公開スモーク、Realtime、Twenty worker、Traefik route driftを含む全チェック pass。
- 公開QA: `https://paradigmjp.com/en` を実ブラウザでリロードし、淡い背景面・青アクセント・濃色CTAが本文のダーク面と明確に分離されることを確認。

## CURRENT STATUS - 2026-07-14 Packageヘッダーナビ追加（本番反映・公開QA済み）

### 2026-07-14 Japan Entry Packageのヘッダー導線追加
- 国際ロケールの共通ヘッダー（デスクトップとモバイルメニュー）へ `Package` → `/package` を追加。`/en/package` の詳細ページを価格・実績・FAQと同じ一次導線から開けるようにした。
- `en` だけでなく、国際化対象の全ロケールにナビラベルを追加。`/ja` は国内向けナビ構成を維持し、Japan Entry導線を混在させない。
- 検査: 全ロケールJSON parse、`npm exec -- tsc --noEmit`、対象ESLint、`npm run quality:guard`（0 errors / 59 warnings）、`git diff --check` pass。
- PR #149 をマージし、`npm run release:prod`（deployment `brwc8244p6mbtn395itz6a56`）を完走。DB `83/83`、公開スモーク、Realtime、Twenty worker、Traefik route driftを含むrelease gate pass。
- 公開QA: `https://paradigmjp.com/en` の実DOMで `Package` → `/en/package` を確認。デスクトップとモバイルが同じ共通ナビ配列を使用し、`/ja` の国内向けメニューは変更なし。

## CURRENT STATUS - 2026-07-12 本番公開・実運用ゲート完了

### 2026-07-14 SMBデモ品質ゲートV2・業種別編集（本番反映・実ブラウザQA済み / 送信停止）
- Cafe SOSOMU実ブラウザ監査で確認した1024px帯のheader横切れ、飲食店に不適切な「会社概要 / サービス / 実績」ナビ、下層ページの仮置き文言、重複コピー、空見出し、`料金は要確認`、公開デモの`Official website`誤表示を修正した。
- 1社1回のDeepSeek本文生成とprefix cacheは維持し、その後段へ決定論的な業種別編集レイヤーを追加。restaurant / beauty / dental / construction / retail / defaultでナビ、セクション見出し、Works、News、CTA、フッターを変え、3候補はdesign recipeのcomposition / hero / motionを実レンダリングへ反映する。
- 品質ゲートを`2026-07-14.1`へ更新。specificity / contentDepth / trustSafety / visualReadinessの4軸各25点、合格92点とし、顧客向け仮置き文言、長文重複、業種不一致ナビ、空process見出し、提案表示不足をhard blocker化。hard blockerありは最大70点に制限する。
- batchジョブ結果へ品質レポートと3候補を保存し、管理画面で4軸・停止理由を表示。品質レポート欠落または92点未満のジョブはGUI / batch API /公開切替関数の3層でクリーンURL発行を拒否する。送信、Twenty同期、メール、電話、郵送、フォーム送信は接続していない。
- ローカル検証: 関連Vitest **3 files / 10 tests pass**、TypeScript pass、全ESLint pass、quality guard **0 errors / 59 existing warnings**、production build **396/396 pages**、`git diff --check` pass。
- PR **#146 / #147 / #148**をmainへmerge。業種別編集・fail-closed品質ゲートに加え、Worksの汎用`Scene 01`表記を飲食店固有の「店内とメニュー / 一杯を淹れる時間 / 店の佇まい / 季節の一皿」へ変更し、Contactを「店舗情報・アクセス」へ統一した。
- 正式`npm run release:prod`の最終deployment **ahudjbd1hgfjmw8eho5kzi8h**はfinished。DB **83/83**、Cloudflare origin、Traefik、Realtime、Twenty worker restart 0、常駐timer/workerなし、Sales health JSON `ok:true`までpost-deploy release gateを通過した。
- 本番`https://demo.paradigmjp.com/cafe-sosomu`はHome / About / Services / Works / News / FAQ / Recruit / Privacy / Terms / Commerce / Contactの **11/11 HTTP 200**。mobile 390pxで横溢れ0、空見出し0、仮置き文言0、broken image 0。アプリ内実ブラウザでもContactのGoogle Maps、6入力フォーム、「店舗情報・アクセス」、横溢れ0を確認した。候補収集、Twenty同期、メール、電話、郵送、フォーム送信は実行していない。

### 2026-07-13 Japan市場機会損失バナーの固定ヘッダー重なり修正（本番反映・実ブラウザQA済み）
- 国際向け共通の`THE OPPORTUNITY COST OF WAITING`バナーが固定ヘッダーの下へ潜り、ヘッダー用`pt-16`が二重に効いて空白帯を作るレイアウト崩れを修正。ヘッダー分の明示スペーサーをバナー前へ置き、バナー有効時だけ`SiteWrapper`の追加トップ余白を無効化した。
- 告知バー有効時は告知バー込みのスペーサー高さへ切り替え、`/ja`と法務ページは従来どおりバナーなし・既定のヘッダー余白を維持する。先頭要素のmargin collapseを使わず、PC/モバイルで同じ構造にした。
- 検証: pre-push TypeScript clean、対象ESLint pass、関連Vitest **2/2 pass**、quality guard **0 errors / 59 warnings**、`git diff --check` pass。実ブラウザで`/en`・`/en/services`・`/en/pricing`・`/en/package`は`scrollY=0`時にheader **0–81px**、spacer **0–80px**、urgency **80px開始**、main **458px開始**、横溢れなし。`/ja`はurgencyなし・`main.pt-16`を確認した。
- PR **#143**をmainへmerge。正式`npm run release:prod`のdeployment **jdgsrj4fpvbs5yq7kwd8er5a**はfinished、DB **83/83**、Traefik/Cloudflare/Realtime/Twenty、Sales health HTTP 200 JSON ok、post-deploy release gateを通過した。

### 2026-07-13 Opportunity Briefパッケージ・限定オファー・CTA強化（本番反映・実企業QA済み / 送信停止）
- Opportunity Brief末尾の契約条件を独立パネルへ分離し、`$12,000 paid upfront`、最初の6か月は追加月額なし、7か月目以降は署名済み契約に基づき月額$995という条件の直下へ、Japan Entry Packageの正式な7ワークストリームを表示する。
- 6か月の月額無料を、期間限定かつ審査を通過した数組だけの導入オファーとして強調。架空の残枠数・締切は表示せず、適用可否は15分面談と契約書面で確定し、フォーム送信だけでは枠確保にならない境界を明記した。
- 意思決定要約と最終オファーのCTAを、企業名付きCal.comの `Book the 15-minute review` と、Japan Entry意図・企業名を引き継ぐ `Apply via the form` の2種類へ統一。Our Placeでは予約先が `https://cal.com/paradigm-jp/15min?name=Our%20Place`、申込先が `/en/contact?intent=japan-entry&company=Our%20Place` になる。
- 検証: 関連Vitest **2 files / 6 tests pass**、TypeScript pass、対象ESLint pass、quality guard **0 errors / 59 existing warnings**、production build **396/396 pages**、`git diff --check` pass。React確認ではサーバーコンポーネントのまま、named export、semantic link、外部URLの安全属性、安定keyを確認した。
- PR **#142**をmainへmerge。正式deployment `n5t3jiz0o5j9gbaur0a4v1wd` はcommit `adf39ceead787a47fcdf6dbffd0eeb91194fda65`でfinishedし、DB **83/83**、Traefik / Cloudflare / Realtime / Twenty worker restart 0、Sales health HTTP 200 JSON ok、post-deploy release gateを通過した。
- 本番Our Place Opportunity BriefはHTTP **200**。PC 1440px / mobile 390pxで、料金、限定条件、7項目、CTA 2つ、企業名付きリンクを実ブラウザ確認し、横溢れ0、error overlay 0、console error 0。DB書き込み、Twenty同期、候補収集、フォーム送信、営業送信は一切実行していない。

### 2026-07-13 SMBデモ正規URL・自動量産（本番反映・実事業者QA済み / 送信停止）
- デモの正規URLを `https://demo.paradigmjp.com/{企業名slug}` に統一。locale、`demo`、ランダム文字列を公開URLへ含めず、Cafe SOSOMUは `https://demo.paradigmjp.com/cafe-sosomu` とした。旧 `/ja/cafe-sosomu` と内部 `/ja/demo/cafe-sosomu` は正規URLへ308転送する。企業名slugが既存の別企業と衝突した場合はランダム文字を足さずfail-closedで停止する。
- Homeを含む全11ページのheader、footer、CTA、パンくず相当導線を `/{企業名slug}/...` へ統一。公開デモは `noindex, nofollow, noarchive` を維持し、検索面へ混入させない。
- 最大100社を一括投入し、最大3社並列のone-shot drainがキュー末尾まで自動継続する量産経路を実装。DB singleton leaseでdrainを1系列に制限し、同じ企業・同じ審査済みmanifestは `generation_key` で完成済み結果を再利用してLLM再実行を避ける。品質90点未満、hard blocker、権利不明素材、公開根拠不足は公開せず停止する。
- Cafe SOSOMUを本番batch APIへ実投入し、job `8eff6351-9bb8-45d8-8d36-fbe86880b8c7` は手動追加操作なしで2回目確認時にcompleted、quality **100**、slug `cafe-sosomu`、publication `published`、`sending_enabled=false`。drain leaseは解放済み、queued/running jobは0、同社outreach jobは0。
- 本番QA: Home / About / Services / Works / News / FAQ / Recruit / Privacy / Terms / Commerce / Contactの **11/11 URL HTTP 200**、旧URLは308、正規URLheaderはnoindex。実ブラウザPCで全内部リンクが `/cafe-sosomu/...`、写真hero、Embla carousel、Instagramを確認。mobile 390x844でdrawer、Google Maps iframe、6項目フォーム、送信停止表示を確認した。
- 実装はPR **#136 / #137**をmainへmerge。正式deployment `yzuvgk8vugt63lejyxvnpzzk` はfinishedし、DB **83/83**、Traefik / Cloudflare / Realtime / Twenty、Sales health HTTP 200 JSON ok、post-deploy release gateを通過した。メール、電話、郵送、フォーム送信、Twenty同期、営業通知は一切実行していない。

### 2026-07-13 Japan Entry 競合・需要パーソナライズ／両面危機訴求（本番反映・公開QA済み / 送信停止）
- DeepSeek V4 Pro初回フォーム文面へ、HTTPS公開根拠付きの実名競合、日本の商品固有需要シグナル、公式市場データ、条件付き規制リスクを追加。商品固有需要がある場合は一般市場規模だけで逃げる候補を品質ゲートで拒否し、競合名・需要・監査ギャップ・推定アクセス・推定機会損失・規制の適用未確定表現を最大6 factで必須化した。
- 規制訴求は、消費者庁が説明する適用対象違反時の業務改善指示・業務停止命令・罰則と、個人情報保護委員会の2026年APPI見直し方針を根拠化。「当該企業が違反している」とは断定せず、公開ページ診断では適用可能性や違反を確定しない文言を必須にした。「世界3位」は現時点の一次根拠を確認できないため不使用。
- 国際向けホーム、Services、Pricing、Packageへ共通の強い危機訴求を追加。人口123.05M、2024年B2C EC ¥26.1T（前年比+5.1%）、日銀2026年7月基準相場¥158/$1を出典・基準日付きで表示し、為替は削減保証にしない。JA国内向けページには混在させない。
- Opportunity Briefへ競合・需要・規制を同時に比較する意思決定セクションを追加。商品固有の需要根拠がなければ人気を推測せず、一般市場文脈と「商品固有人気は未検証」を表示する。
- 検証: 関連Vitest **4 files / 37 tests pass**、TypeScript pass、対象ESLint pass、quality guard **0 errors / 59 warnings**、production build **396/396 pages**、`git diff --check` pass。実Chromeで `/en` `/en/services` `/en/pricing` `/en/package` はHTTP 200、危機訴求・市場数値表示、PC/mobile横溢れ0、overlay/console error 0。`/ja`への混入0。
- PR **#133**をmainへmergeし、正式deployment `olryn34mx0zkbd46e4qkjl9k` はfinished。DB **83/83**、Traefik / Cloudflare / Realtime / Twenty、Sales health HTTP 200 JSON ok、post-deploy release gateを通過。本番 `/en` `/en/services` `/en/pricing` `/en/package` とOur Place Opportunity BriefはHTTP 200で競合・需要・規制・市場根拠を表示し、`/ja`への混入なし。DB保存、Twenty同期、フォーム送信、候補収集は一切実行していない。

### 2026-07-13 Japan Entry文面量産・DeepSeek Prompt Caching最適化（本番反映・実API実測済み / 送信停止）
- 企業名・商品説明・監査・競合・推定値・補修指示をすべてuser JSONへ移し、生成／補修用system promptを企業・業種・モードをまたいでbyte-identicalな固定prefixへ変更。批評system promptも固定し、DeepSeek公式APIのautomatic prompt cachingを量産案件間で再利用できる構造にした。
- 通常時の品質設計は3候補生成＋独立critic＋決定論ゲート（品質92点以上、各軸22点以上、安全性100）を維持。失敗時だけ最良の1候補を補修し、従来の3候補丸ごと再生成を廃止した。補修には必須fact id、失敗理由、検出した禁止語句を明示し、品質基準を緩めず再処理率を下げる。
- コピー生成ではDeepSeek V4 Pro直叩き、thinking disabledを固定。出力上限を3候補4,000／1候補補修2,400／critic 1,200 tokensへ分離し、品質に不要な推論・暴走出力だけを制限。既存の投影冪等キーにより、同じ会社・同じ根拠のjob retryは保存済み結果を再利用してLLMを再実行しない。
- generation／repair／criticとJSON再試行を含む全usageを合算し、input/output、cache hit/miss、cache hit ratioを投影JSONと会社metaへ保存。Twentyカルテにも `LLMトークン効率` として同期し、案件別の実コストを監視できる。フォーム送信や候補収集には接続しない。
- 最終の架空企業・非送信DeepSeek実API smokeは、品質 **95/100**、安全性 **100/100**、197語、4段落、企業名・推定アクセス・推定機会損失・実名競合・商品固有需要・条件付き規制・未置換ゼロをすべて合格。入力 **5,036 tokens**のうち **3,584 hit / 1,452 miss / cache hit ratio 71.17%**。直前の同一prefix実測でも **5,120 / 6,635 hit（77.17%）**を確認した。
- 検証: 関連Vitest **7 files / 55 tests pass**、全体Vitest **112/113 files・522/526 tests pass**（変更外の既知CRLF backup shell 4件のみ失敗）、TypeScript pass、全ESLint pass、quality guard **0 errors / 59 existing warnings**、production build **396/396 pages**、`git diff --check` pass。実API smokeはDB保存、Twenty同期、フォーム送信、候補収集を一切行っていない。
- PR **#138**をmainへmerge。正式deployment `bxlnuw2kjvfuyu2py05airhn` はcommit `ec935053`でfinishedし、DB **83/83**、Traefik / Cloudflare / Realtime / Twenty worker restart 0、Sales health HTTP 200 JSON ok、英日公開面と診断レポートを含むpost-deploy release gateを通過した。

### 2026-07-13 SMBデモ量産・DeepSeek Prompt Caching最適化（本番反映・実測済み / 送信停止）
- DeepSeek V4 Proへ渡す共通の品質規則・JSON schema・禁止事項をcompany固有データより前へ固定し、企業ごとに変わる名称・所在地・事実・design recipeを末尾へ分離した。DeepSeekのprefix cacheが企業をまたいで再利用できる構造に変更し、公式usageの `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` を正規化して生成payloadへ保存する。
- LLMはHome / About / Servicesの創造性が必要な中核コピーだけを担当する。FAQ / Contact、法務、アクセス、営業時間、SNS、フォーム、Google Mapsは審査済みmanifestから決定論的に構築し、LLM出力対象から外した。品質ゲート、事実grounding、3デザイン候補、private review、外部送信停止は維持する。
- Cafe SOSOMUの本番連続生成で、1回目は入力 **1,484 tokens / hit 0 / miss 1,484 / 18.0秒**、2回目は **hit 1,408 / miss 76 / cache hit ratio 94.88% / 14.4秒**。両方とも品質score **100**、`private_review`、同じ11ページ構成で合格した。
- 再生成後の実ブラウザQAは、PCで禁止コピー0・横溢れ0、ContactにGoogle Maps 1・フォーム6項目・Instagram 1・送信停止表示あり。mobile 390x844も横溢れ0、console error / warning 0。デモは `https://demo.paradigmjp.com/ja/demo-only-7f72cffa1689994f-demo` の非公開レビュー状態を維持する。
- 品質強化はPR **#109 / #111 / #112 / #114 / #116 / #118 / #122 / #123 / #125 / #129**、Prompt Caching最適化はPR **#131**としてmainへmerge。関連Vitest **5 files / 22 tests pass**、TypeScript・対象ESLint pass、quality guard **0 errors / 59 existing warnings**。正式deployment `gkfkis74g004x0mx2wf82lg3` はfinishedし、DB **83/83**、Traefik / Cloudflare / Realtime / Twenty、Sales health HTTP 200 JSON ok、post-deploy release gateを通過した。
- メール、電話、郵送、フォーム送信、Twenty同期、営業通知、候補自動収集は一切実行していない。量産は審査済みmanifest投入、最大3社のbounded drain、品質fail-closed、private reviewの順で行い、情報不足企業は薄いページを公開せずレビュー待ちに止める。

### 2026-07-13 Japan Entry Package詳細ページ（本番反映・公開QA済み）
- `/[locale]/package` を追加。国際ロケールでは英語の正本コピーを表示し、JAは国内向け`/ja/services`へリダイレクトしてJapan Entryを混在させない。
- $12,000セットアップの内訳を7ワークストリーム（市場・提案整理、LP/HPローカライズ、SNS初期設定、市場・競合レポート、信頼・法規制適用可能性、問い合わせ・決済、公開運用・引き継ぎ）へ分解。各項目に具体的な納品物を記載した。
- 14営業日の時系列、開始条件、月1〜6の運用、Notion/Trello共有ワークスペース、48営業時間以内着手SLA、月7以降、支払方法、返金条件、除外事項、成果保証をしない境界を同じページに集約。
- `/en/services`と`/en/pricing`から詳細ページへ導線を追加し、国際ロケールのsitemapにも`/package`を追加。JAの国内サービス導線は変更しない。
- 検証: TypeScript pass、対象ESLint pass、関連Vitest **16 tests pass**、quality guard **0 errors**、production build **384/384 pages**、`git diff --check` pass。PR **#120**をmainへmergeし、国内URLのHTTP挙動をPR **#128**で追加修正。正式 `npm run release:prod` の最終deployment **q15xfh54oq5496tukgehc8mx** はfinished。DB **83/83**、Traefik/Cloudflare、Realtime、Twenty、Sales health、post-deploy release gateを通過した。本番の`/en/package`と`/ko/package`はHTTP **200**で内訳・48営業時間以内着手・除外事項・導線を確認。`/ja/package`はHTTP **308**で`/ja/services`へ移動し、Japan Entry本文を返さない。sitemapには国際ロケールの`/package`だけが掲載され、`/ja/package`は含まれない。`/en/services`と`/en/pricing`からの詳細ページ導線も公開確認済み。

### 2026-07-13 Japan Entry Opportunity Brief量産・意思決定資料強化（本番反映・公開QA済み / 送信停止）
- `japan_entry_report` を既存のevent-driven enrichment queueへ追加。最大100社の一括投入、最大3社の並列drain、進捗Realtime、失敗理由、同一ジョブ再試行、100社表示の管理画面 `/{locale}/admin/opportunity-briefs` を実装した。cron・常駐polling・フォーム送信には接続しない。
- 量産監査で残っていた手動3社drainを廃止。POST投入後に認証済みone-shot PUTを開始し、各3社バッチの完了イベントから次バッチを自己dispatchしてキュー末尾まで自動処理する。DB singleton leaseを同一drain IDで延長し、複数の投入・再開操作が重なってもdrain workerは1系列だけに制限する。失敗ジョブは時間待ちqueueへ埋没させず即時failedとして可視化し、operator retryが同じjob・投影冪等キーを再利用する。
- 投影行へjob単位の `idempotency_key` を追加。同じ失敗ジョブは保存済み投影を再利用してTwenty同期だけを再試行し、重複URL・重複文面を生成しない。公開シグナル、根拠付き商品情報、Japan readiness監査、既定ではHTTPS根拠付き競合分析が揃わない企業は品質ゲートで停止する。
- Opportunity Briefを独立chromeへ修正し、公開サイト証拠付き表紙、observed/assumed分離、根拠数・監査ページ数・モデル内確度、既存の市場別アクセスと6/12/24か月ROI、単価・CVR・粗利率を自社数値へ置換できる感度分析、監査ギャップから逆算した21営業日プランを追加した。
- Twenty実スキーマに存在しない `xLink` / `linkedinLink` / `employees` / `annualRecurringRevenue` を企業home payloadから除去。APIが未知フィールドを返した場合は最大8回まで該当項目だけを除去し、新規会社作成後に同期失敗した場合は部分会社をDELETEしてCRM汚染を防ぐ。
- migration `20260713203000_japan_entry_report_factory.sql` を正式release経路・release doctor・手動migration台帳へ配線。queue job type、投影冪等キー、Realtime publication、RLS有効の `sales_report_factory_state` とservice_role限定claim/release RPCを冪等適用する。
- 検証: TypeScript pass、対象ESLint pass、quality guard **0 errors / 59 warnings**、自動drainのlease・認証header・secret非露出・fail-closedを含む関連Vitest **6 files / 18 tests pass**、100社を2 DB queryで投入するunit test pass、production build **396/396 pages**。全Vitestは **106/107 files・504/508 tests pass**で、変更外の既知CRLF backup shell 4件のみ失敗。
- PR **#117**をmainへmergeし、正式deployment `lfzatodzhzxzypztvdp9exdl` はfinished。DB **82/82**、Traefik/Cloudflare、Realtime、Twenty worker restart 0、Sales health HTTP 200 / JSON ok、post-deploy release gateを通過した。Cloudflare Analytics beaconの既存CSP errorもPR **#119**で許可originを限定追加し、正式deployment `xejy710ungy95vjjllxz6ng3` とpost-deploy gateを通過した。
- 自動drain強化はPR **#124**をmainへmergeし、正式deployment `l1icd98j3jxllz8go0c0326w` がfinished。DB **83/83**、Traefik/Cloudflare、Realtime、Twenty worker restart 0、Sales health HTTP 200 / JSON ok、post-deploy release gateを通過した。singleton leaseはRLS有効、anon/authenticatedのRPC実行不可、service_roleのみ実行可。transaction内のclaim→state→release→rollback実検査も全てtrue。
- 本番のOur Place実レポートで、HTTP 200、`noindex, nofollow, nocache`、header 1個、Evidence quality、6/12/24か月、感度分析slider 3本と値変更時の再計算、desktop/mobile横溢れ0、console error 0をChrome実ブラウザ確認。最新コンテナはmerge commit `a88bf994`。本番DBは `idempotency_key` 1列、`sales_enrichment_jobs` Realtime publication 1、report jobs 0、送信有効jobs 0、既存QA投影1件のみ。収集・見込み客へのフォーム送信は未実行。

### 2026-07-13 人物・明るいストック素材の運用イメージスライダー（本番反映・公開QA済み）
- 文字と図解だけで無機質に見える問題に対し、EN/JAホーム、About、Pricingへ、人物・チーム・会議室の明るいPexels素材を使った手動スライダーを追加。担当者、時差を越えた共同作業、公開後の引き継ぎを「運用の雰囲気」として可視化する。
- スライドは自動再生せず、前後ボタン・ドット・キーボード操作・モバイルスワイプに対応。画像は`public/visuals/`からローカル配信し、外部CDN依存と不安定なリモート画像URLを避ける。各画像にはalt、Pexels出典表示、ストック素材であり実績・顧客・Paradigmスタッフではないことの開示を付けた。
- `docs/knowledge/stock-imagery.md`に素材ページ、クリエイター、用途、ライセンス確認を記録。素材を実績写真や成果証明として扱わない方針を固定した。
- 検証: TypeScript pass、対象ESLint pass、関連Vitest **13 tests pass**、quality guard **0 errors / 54 warnings**、production build **372/372 pages**、`git diff --check` pass。正式 `npm run release:prod` のdeployment `n12dtnpkdqtvjqtd1hs7lp7m` はfinished、DB **82/82**、Traefik/Cloudflare、Twenty、Sales health、post-deploy release gateを通過した。公開HTMLで`/en` `/en/about` `/en/pricing` `/ja` `/ja/about` `/ja/pricing`のスライダー本文・開示文・操作ラベルを確認し、3画像assetはすべてHTTP **200**。seed時の一時Cloudflare 502はrelease scriptの限定retryで回復し、CMS publishと全公開smokeは合格した。

### 2026-07-13 共有ワークスペースと48営業時間以内着手SLA（本番反映・公開QA済み）
- ENのJapan Entry共通進行フローに、契約範囲確定後の顧客専用共有ワークスペースを追加。Notionを基本とし、顧客希望時はTrelloを選択できる運用として、範囲・担当・ステータス・ブロッカー・承認・成果物・次の作業を1か所で可視化する。
- 「48時間で完了」と誤認させず、含まれる月額運用の通常依頼を48営業時間以内に受付・スコープ化・着手するSLAとして明記。緊急、規制、第三者依存、範囲外作業は書面承認へ分離した。
- EN FAQ、JA FAQ、AIチャットRAG知識にも同じ説明を追加。署名済み範囲の代替ではなく、共有の進行記録であることを明記した。
- 検証: TypeScript pass、対象ESLint pass、関連Vitest **2 files / 15 tests pass**、quality guard **0 errors / 53 warnings**、JSON parse、diff check pass。正式 `npm run release:prod` のdeployment `mk5w9a184pyshc5vg1jk2iow` はfinished、DB **82/82**、Traefik/Cloudflare、EN/JA主要公開URL、Twenty、Sales health、post-deploy release gateを通過。公開HTMLで共有ワークスペース、Notion/Trello、48 business hoursの文面を確認した。ローカルproduction buildは別プロジェクトのNextビルド競合で1115秒時点に中断したが、正式リモートbuildと公開smokeは合格した。

### 2026-07-13 Japan Entry Opportunity Brief URL（本番反映済み / 送信停止）
- 興味返信後の企業へ共有する専用URL `/{locale}/opportunity/{slug}` を追加。既存診断レポートの会社データ取得、日本市場監査、公開シグナル投影を再利用しつつ、意思決定要約、推定市場別アクセス、6/12/24か月ROI、準備状況、競合環境、21営業日の推奨手順、$12,000一括前払い・最初の6か月込みを一つの非公開noindex資料へ再構成した。
- 投影は `public-opportunity-v1` の完全な3シナリオと6/12/24か月データが揃う場合だけ公開し、不完全データは共通not-found本文へfail-closed。数値は公開シグナルに基づくモデル値として表示し、実測アクセス・確定売上・成果保証とは扱わない。現行locale共通shellはnot-found本文でもHTTP 200を返すsoft-404仕様だが、会社情報・投影・監査内容は返さない。
- 競合名は `japan_entry_competitor_analysis` にHTTPS公開根拠URLがあるものだけ表示する。未検証時は類似カテゴリから推測せず「競合セット未検証」と明示し、15分面談後に対象顧客・価格帯・代替手段を確定する。
- 投影生成時にOpportunity Brief URLを企業metaへ保存し、Twenty企業ホームの主リンクとカルテ要約へ同期する。既存投影もslugがあればカルテ生成時にURLを復元する。初回フォーム文面は従来どおりURL・資料なし、未送信・要レビューを維持し、候補収集やフォーム送信には接続しない。
- 検証: 対象Vitest **6 files / 25 tests pass**、TypeScript pass、対象ESLint pass、quality guard **0 errors**、production build **372/372 pages**、新route `/[locale]/opportunity/[slug]` のbundle収載、`git diff --check` pass。PR **#107**をmainへmergeし、正式deployment `mnqugthcsj0n2cy2ucczylka` はcommit `1425c83a`（Opportunity実装commit `c5a72a68`を包含）でfinished。DB **82/82**、Traefik/Cloudflare、Realtime、Twenty HTTP 200・worker restart 0、Sales health HTTP 200 / JSON ok、post-deploy release gateを通過した。本番の未存在slugと投影未生成slugは共通not-found本文のみで、候補収集・フォーム送信・本番テスト企業作成は未実行。

### 2026-07-13 SMB実素材デモ Premium V3 全ページ品質強化（本番反映・公開QA済み / 送信停止）
- Premium V2がトップ専用で、About / Services / Contact / Works等は旧汎用レンダラーのままだった分断を解消。店紹介、商品、アクセス、汎用コンテンツ／FAQ／法務を専用のeditorial rendererへ切り替え、全11ページを同じ色・書体・余白・写真表現へ統一した。
- トップhero見出しを最大8.4rem・8.3vwから最大7rem・6.6vwへ縮小し、最小高さも820pxから720pxへ調整。提案制作側の説明文を顧客向けの店舗・商品コピーへ置換した。
- `demo.paradigmjp.com/{locale}/{slug}` の短縮URLを内部リンクの正本にし、demo hostnameをserver/client双方で検出してParadigm本体header/footer/chatbotが重ならない独立サイト表示へ変更した。
- APIキー不要のGoogle Maps iframe、住所／SNS／営業案内、6項目のバリデーション付き問い合わせフォーム、Embla carousel、FAQ accordion、モバイルdrawerを実装。非公開デモのフォームは入力・検証・完了表示まで動くが、`formEnabled=false`ではfetchせず外部送信しない。
- 検証: TypeScript pass、対象ESLint pass、問い合わせschema／Google Maps URL Vitest **2/2 pass**、quality guard **0 errors / 54 existing warnings**、`git diff --check` pass、production build完走。全Vitestは **219/223 suites・475/480 tests pass**で、今回未変更の既知CRLF backupテスト4件と、最新mainのLiteLLM優先実装に対して旧DeepSeek直API期待が残る1件のみ失敗。
- PR **#104**をmainへmergeし、正式deployment `ebegbtxp3g4kannlcrdw2c9i` はfinished。DB／Traefik／Cloudflare／Realtime／Twenty／Revenue OS／公開smokeを含むpost-deploy release gateを通過した。本番PC 1280pxではhero見出し84.48px、mobile 390pxでは48px・横溢れ0。全11ページでParadigm本体chrome非表示、実画像、各ページの十分な本文、carousel、FAQ accordion、Google Maps、問い合わせフォームを実ブラウザ確認。フォームは入力完了UIまでで外部送信なし。demoページのmetadataはPR **#105**で親サイトtitle templateから分離し、正式deployment `rltfap9yf3pmykh32b6v8h1r` とpost-deploy gate通過後、11/11ページの店舗名だけの独立タイトルを公開ブラウザで再確認した。

### 2026-07-13 Japan Entry生成文面のTwenty自動同期（本番反映済み / 送信停止）
- Japan Entry投影とDeepSeek V4 Pro文面を保存した直後、同じ企業のTwentyカルテを自動同期する。同期対象は既存の企業カルテ要約・次アクションで、推定日本月間アクセス、推定月間機会損失、6/12/24か月ROI、文面品質・安全性、URLなしの初回フォーム文面全文を表示する。
- Twenty上では必ず `未送信・要レビュー` と表示し、フォーム送信処理には接続しない。Japan Entry生成時の同期は企業ホーム更新だけに限定し、商談レコードや商材推薦を自動作成しない。既存の通常Twenty同期は従来どおり商談同期を維持する。
- 同期結果を `sales_companies.meta.japan_entry_twenty_sync` に原子的保存する。成功は `synced`、資格情報未設定は `not_configured`、Twenty API障害は `failed` とし、Twenty側の既存 `sales_sync_logs` にも `karte_home_sync` の成功・失敗を残す。生成済み文面は同期障害で削除せず、同じ投影APIの `PUT` から最新保存済み文面だけを安全に再同期できる。
- 投影生成APIは文面保存とTwenty同期が両方成功した場合のみHTTP 201を返し、文面保存済みでもTwenty同期または同期状態保存に問題があればHTTP 207で詳細を返す。黙って完全成功扱いにしない。
- 検証: 対象Vitest **5 files / 21 tests pass**、変更ファイルと依存グラフのTypeScript検査pass、変更対象ESLint pass、`npm run quality:guard` **0 errors / 54 warnings**、`git diff --check` pass。PR **#101**をmainへmergeし、正式deployment `pkf4kuu8ds7da6fp5fhic12c` はfinished。DB **82/82**、Traefik/Cloudflare、公開smoke、Twenty HTTP 200・worker restart 0、Sales health HTTP 200 / JSON ok、post-deploy release gateを通過した。フォーム送信、候補収集、本番Twentyへのテスト企業作成は未実行。

### 2026-07-13 全ページの視覚証拠・アニメーション強化（本番反映・公開QA済み）
- 共通 `PageHero` に、公開実績を捏造しないCSSベースの運用パスビジュアル（Signal → Scope → Launch）を追加。20ページのヒーローで同じ視覚言語を再利用し、`prefers-reduced-motion` では静止表示へ切り替える。
- 国際向けホームのCMSフォールバックHeroを、`/public/japan-entry/package-scope.svg` を使うsplit-image構成へ変更。CMSに画像がない場合でも、固定スコープの実装図がファーストビューに表示される。
- ブログ一覧・記事詳細に、承認済みHero画像がない記事向けの決定論的なEditorial Coverを追加。Worksの公開確認済みカードにも既存のJapan Entry図解を重ね、文字だけのカードを残さない。
- Services / Pricing に既存のpackage-scope・signal-check・application-handover図解を再利用。画像はクライアント実績として扱わず、納品物・運用境界の説明資料として表示する。
- 検証: `npm exec -- tsc --noEmit --pretty false` pass、変更対象ESLint pass、関連Vitest **4 files / 23 tests pass**、`npm run quality:guard` **0 errors / 53 warnings**、production build **372/372 pages**。正式 `npm run release:prod` のdeployment `dq8ilhordm3lhh3jojpdv3zl` はfinished、DB **82/82**、Traefik/Cloudflare、EN/JA主要公開URL、Terms/Refund、Twenty、Sales health、post-deploy release gateを通過。公開HTMLで`page-hero-visual`、`package-scope.svg`、Editorial Coverのマーカーを確認した。

### 2026-07-13 Japan Entryフォーム文面・未置換/推測fail-closed強化（本番反映済み / 送信停止）
- `[]` / 全角括弧 / `{{}}` / `${}` / `<>` / `__TOKEN__` / `%TOKEN%` / `TBD` 等の未置換プレースホルダーを決定論的品質ゲートで全面拒否。修正前は `[monthly visits]` と `[opportunity gap]` が残っても安全性100点で通った再現ケースを、修正後は0点・保存不可へ変更した。
- 数値型文面では、Japan推定月間アクセスと月次機会ギャップの元factに含まれる正確な数値を第3段落へ必須化し、機会ギャップはUSD記号を含む完全値を要求。企業名も第2段落への完全一致を必須化した。
- 実DeepSeek V4 Pro初回smokeで見つかった、入力にない「日本の小売店のニーズに応え得る」という推測を回帰ケース化。第2段落の`could/may/might/likely`、入力にないJapan/Japanese、needs/challenges/demandを拒否し、プロンプトとV4 Pro批評規則も同じ境界へ統一した。
- `npm run smoke:japan-entry-form-copy` を追加。合成企業のみを使い、DB保存・Twenty登録・フォーム送信なしで実V4 Pro生成を再現できる。最終実測は **95/100**、安全性 **100**、151語、4段落、企業名・`1,950` Japan visits・`$10,296` opportunity gapの完全一致、未置換0件で合格。
- 検証: 対象Vitest **28/28 pass**、最新main統合後の関連4 files **42 tests pass**、TypeScript、対象ESLint、quality guard **0 errors / 53 warnings**、production build **372/372 pages**、`git diff --check` pass。全体Vitestは **94/95 files・458/462 tests pass**で、今回未変更の`backup-oss-supabase.sh`がworktree上でCRLF展開されたことによる既存4件のみ失敗。PR **#93**をmainへmergeし、正式deployment `t6231ixgn9g3kioa3qr4kzqv` はfinished。初回CMS seedの一時502は限定retryで回復し、DB **82/82**、Traefik/Cloudflare、公開URL、Twenty、Sales health **HTTP 200 / JSON ok**、post-deploy release gateを通過した。フォーム送信、Twenty登録、実企業DB保存は未実行。

### 2026-07-13 SMBデモ大量生成の持続可能化（本番反映・公開QA済み / 送信停止）
- デモ本文生成はOpenAIではなくDeepSeekを正規経路とする。LiteLLMが設定済みなら `deepseek-v4-pro` を優先し、未設定時はDeepSeek公式APIの設定モデルを使用する。モデル名、input/output/cache token実績をデモmetaへ保存し、OpenAIやFlashへ黙って降格しない。
- 同一企業に対してdesign spec、Astro code、3候補copyを重複生成していた経路を廃止。企業別copyは **1社1 LLM call**、3デザインは同じ確認済みcopyを決定論的なlayout recipeへ適用して品質比較する。最大7 call相当から1 callへ削減し、90点未満・根拠不足・権利不明は保存停止を維持する。
- `reviewed_manifest` を追加。最大100社/回の確認済み事実、公式プロフィール参照URL、R2/ライセンス/許諾済み/非公開提案素材だけを受け付け、すべて `fetchPolicy=never` とする。Google検索、Google Maps UI、SNS本文・画像、proxy/browser searchの自動取得はこの経路から呼び出さない。HP非保有企業は予約済み `.invalid` 内部domainで重複排除し、通常enrichmentを起動しない。
- Supabase `sales_enrichment_jobs`へ `demo_generate` を追加し、常駐polling/cronなしのoperator起動・3社ずつbounded drainで処理する。完了後は最大100件の期限付きURLを一括発行できるが、token実値はDBへ保存しない。送信、Twenty同期、メール、電話、郵送、フォーム営業、外部通知は接続しない。
- デモ正規URLを `https://demo.paradigmjp.com/{locale}/{企業slug}` へ短縮。旧 `/{locale}/demo/{slug}` は308で短縮URLへ寄せ、署名入口もdemo hostへcanonicalizeしてslug限定HttpOnly Cookieを設定する。main siteと既存期限付きURLの互換を維持する。
- 管理画面 `/ja/admin/demo-assets` に一括manifest投入、次の3社生成、状態更新、完了分URL発行を追加。TypeScript pass、対象ESLint pass、Vitest **5 files / 20 tests pass**、quality guard **0 errors**、production build **372/372 pages pass**。
- PR **#90 / #91 / #92 / #94 / #97**をmainへmerge。初回deployment `zxctlfc8a1wlkub9302nauds` の公開QAで、旧 `astrodemo-svc` とDocker labelの `paradigm-demos` nginxがdemo hostを横取りする競合、およびdemo DNSのCloudflare proxy無効を検出した。正式releaseのatomic route refreshでdemo hostを現行 `paradigmhp-svc` へ固定し、旧router/serviceと旧container 2種を停止、post-deploy gateで再起動・origin-lock欠落を不合格にした。Cloudflare proxyを有効化し、route修正deployment `q12blc3hr4hu2jsxkj4hp6d5` とDeepSeek V4 Pro固定deployment `zh6sutnbodq7j5guxa1tymqp` はfinished、DB **82/82**、5 app hostの直origin 403、Sales health、post-deploy release doctorをpass。稼働containerの `DEMO_LLM_MODEL=deepseek-v4-pro` も実値確認した。旧署名URLから `https://demo.paradigmjp.com/ja/oikawa-yogashiten-premium-v2-review` へ307 + 307、Home / About / Services / Contact / Works / News / FAQ / Recruit / Privacy / Terms / Commerceは **11/11 HTTP 200**。未署名は実デモ本文なし・private no-store・noindex、無効token 401、旧長形式URL 308、batch API未認証401、管理画面はログイン本文のみを確認した。

### 2026-07-13 Japan Entry意思決定フローの時系列可視化（本番反映済み）
- 国際向けホーム、料金、サービスページへ `Contact → Materials & fit call → Application & scope → Setup & launch → Operate & scale` の5段階タイムラインを追加。問い合わせ、資料・打ち合わせ、申込、固定スコープのセットアップ、公開後の拡張を一つの視線で追えるようにした。
- `JapanEntryJourney` は共通コンポーネント化し、デスクトップは横方向の接続線、モバイルは縦積みカードへレスポンシブに切り替える。料金ページの固定スコープ・問い合わせCTAへ直接リンクし、14営業日の開始条件と「申込だけでは契約成立しない」境界も同じカード下部で明示する。
- `/ja` の国内向け一般サービスにはJapan Entryの時系列を表示しない。国際ロケールは既存方針どおり英語商用文面を正本として利用する。
- 検証: journeyテスト **12/12 pass**、全Vitest **95 files / 448 tests pass**、`npm exec -- tsc --noEmit --pretty false` pass、production build **372/372 pages pass**、quality guard **0 errors / 52 warnings**、`git diff --check` pass。正式 `npm run release:prod` は deployment **a122htnhq21f9p7hi1kmvf68** でfinished、DB **82/82**、Traefik/Cloudflare、Sales health、post-deploy release doctorを通過。公開URLのEN/KOホーム・料金・サービスはjourney markerを確認し、JAホーム・料金・サービスにはJapan Entry journeyが混入していないことを確認済み。

### 2026-07-13 Japan Entryフォーム文面・実務品質ゲート（本番反映済み / 送信停止）
- 検証済みの日本アクセス推定と月次機会ギャップが揃う企業は、全候補を数値型へ固定。両方の数値、公開シグナルによる計画推定であること、実測analyticsではないこと、業種に適合するJapan固有の監査ギャップ1件を必須化した。数値ペアがない場合だけ監査型へ切り替え、未確認のtraffic / revenue / ROIを生成しない。
- SaaSへPayPay・コンビニ決済・配送・特商法表示を機械的に当てる誤診断を除外。Ecommerce / SaaS / serviceごとに利用可能な監査事実を分離した。
- DeepSeek V4 Proの編集合格基準を合計92/100かつ4軸各22/25以上へ引き上げ、未達時は編集理由を反映して1回だけ再生成する。2回目も不合格、JSON不正、timeout、根拠不足の場合は保存せずfail-closedを維持する。
- 評価LLMが95点を付けた実出力でも、未観測の`early exit`推測と入力にない`buyer support`を決定論的ゲートで拒否。因果推測・未承認deliverable・URL・資料・法務断定・未承認数値をモデル評価より先に遮断する。
- 架空SaaS企業を使ったDeepSeek公式API直叩きの再検証は **97/100**（具体性24・自然さ24・信頼性25・経営判断適合24）、安全性100、4段落134語、risk 0で合格。DB保存、Twenty登録、候補収集、フォーム送信は未実行。
- 検証済み: 対象Vitest **14/14 pass**、TypeScript、対象ESLint、quality guard 0 error、diff check、production build **336/336 pages**。PR **#85**をmainへmergeし、正式deployment `bfzoe7yd8o4aywfs9jwniu2o` はfinished。初回CMS seedの一時504は限定retryで回復し、post-deploy gate、公開URL、Sales health HTTP 200 / JSON ok、DB **82/82**をpassした。直後の後続mainコンテナ `2e57c16d` もPR #85 mergeを祖先に含みhealthy。`sales_japan_entry_projections` は **0件**で、DB保存、Twenty登録、候補収集、フォーム送信は未実行。

### 2026-07-13 法務公開面の整備（本番反映済み）
- `/[locale]/terms` と `/[locale]/refund` を追加。JAは国内向け一般サービスの利用規約・返金／キャンセル方針、ENはJapan Entryの固定USD 12,000、開始日、14営業日納品保証、6か月月額込み、7か月目以降USD 995、支払経路、将来期間解約、第三者費用境界を明示する別文面にした。
- `LegalDocumentPage`で法務文書のレイアウトとアクセシビリティ構造を共有し、各localeのmessagesで本文・メタデータを管理。フッターへPrivacy / Specified Commercial Transactions / Terms / Refund & Cancellationの4導線を追加し、CMSの既存legalLinksがあっても新規2ページを欠落させない。
- 法定情報の既定値を、個人名なし・英語住所 `2-2-15 Minami-Aoyama, Minato City, Tokyo, Japan`・法人番号 `5010403026363` に統一。代表者名は従来どおり公開せず、請求時の事前開示経路を維持。
- sitemap、hreflang/canonical、release-doctor、production smokeへterms/refundを配線。Vitestのserver-only境界をテスト専用mockで安定化。
- 検証: `npm exec -- tsc --noEmit --pretty false` pass、全Vitest **95 files / 445 tests pass**、production build **372/372 pages pass**、quality guard **0 errors / 52 warnings**、`git diff --check` pass。正式 `npm run release:prod` は deployment **rwyld93iuw6nzv5qc71b1mi2** でfinished、DB **82/82**、Traefik/Cloudflare、Sales health、日英主要smoke、post-deploy release doctorを通過。本番のJA/EN/KO法務ページ12経路はHTTP 200、JA/ENの本文marker、sitemapのterms/refund、canonical/hreflangを確認済み。公開法務文書では個人名を出さず、英語住所と法人番号を表示する。

### 2026-07-13 SMB実素材・期限付き非公開デモ Premium V2（本番反映・実事業者QA済み / 送信停止）
- `theme_demo_pages`へ `signed_private` access mode、SHA-256 preview token hash、最大30日の有効期限、素材審査status/manifestを追加するmigrationを実装。非公開デモは `is_published=false` のままservice-role経路だけで取得し、匿名RLS公開を行わない。
- 署名URLは初回アクセス時にサーバー検証し、HttpOnly / Secure / SameSite=Lax / slug限定pathのCookieへ移す。期限切れ・改ざん・再発行前の旧tokenはHTTP 401となり、HomeからAbout / Services / Contact / Works / News / FAQ / Recruit / Privacy / Terms / Commerceへ移動してもCookie認証を維持する。
- Payload管理者限定の `/ja/admin/demo-assets` を追加。ロゴ・画像・動画ごとに公式出所、所有者、取得元、利用根拠、人物、透かし、altを記録し、HTTPSでないURL、非公式出所、許諾なしの人物/透かし、blocked素材をfail-closedで拒否する。発行・コピー・確認・即時失効をGUIから操作できる。
- 審査済み実素材をhero/gallery/logoへ反映する `premium-v2` rendererを追加。フルブリード実写hero、editorial split、ブランド別特徴、非対称gallery、実ロゴnav/footer、Framer Motion、モバイル最適化を備え、既存craft/editorial rendererは互換維持する。
- 送信、Twenty同期、営業通知、メール、電話、郵送、フォーム送信は接続していない。非公開URL発行APIも通知を発生させない。
- 検証済み: TypeScript pass、素材安全規則Vitest **3/3 pass**、変更対象ESLint pass、quality guard **0 error**、production build pass。PR **#83 / #84 / #86 / #87**をmainへmergeし、migrationとrelease wiringを本番適用。及川洋菓子店の公式note画像4点（ロゴ、ダックワーズ、ビスコッティ、パステルバスコ）で `oikawa-yogashiten-premium-v2-review` を `signed_private` / `is_published=false` のまま発行した。
- 本番QA: 期限付き入口から正規URLへHTTP 307、Home / About / Services / Contact / Works / News / FAQ / Recruit / Privacy / Terms / Commerceの **11/11経路 HTTP 200**。PCとmobile 390x844で実ロゴ・実商品画像の表示、横溢れ0、Next error overlayなし、Cookie継続を実ブラウザ確認。未認証直接アクセスは404本文だけを返し、実デモ本文なし、無効tokenはHTTP 401、`private, no-store`、Cloudflare `DYNAMIC`、`noindex` を確認。最終 `release-doctor --post-deploy` はDB/Traefik/Cloudflare/Realtime/Revenue OS/公開smokeを含め **release gate passed**。
- 初回本番発行で、Next.js内部origin `0.0.0.0:3000` が返るproxy差異を検出。productionでは検証済み `NEXT_PUBLIC_SITE_URL`（未設定時はParadigm正規URL）を使い、ローカルだけrequest originを使うよう即時修正した。
- 正規URL再発行後のブラウザ検証で、token検証後のredirectも内部originを使っていることを検出。入口routeにも同じproduction canonical origin規則を適用し、初回アクセスを正規demo URLへ遷移させる。
- 実素材Premium V2の目視で、生成画像用の「実際の商品ではない」注記が残る矛盾を検出。素材審査statusがある場合は、`consented`なら権利確認済み、`private_proposal`なら公式公開元・非公開提案限定・正式公開前許諾確認の注記へ自動差し替える。

### 2026-07-13 i18n公開面の再設計（本番反映済み）
- `/ja` を国内向け一般サイトへ分離。ホーム、サービス、料金、FAQ、About、Works、Blog、Contact、フッター、JSON-LD、チャット導線からJapan Entryの固定オファーを除去し、Web制作・MEO・SEO/GEO・AI導入支援の内容へ整理した。
- `/en` 以外の国際ロケール（ko/zh/de/fr/es/pt/ru/ar/vi/id）はURL・canonical・hreflangを維持したまま、`messages/en.json` のJapan Entry商業内容を正本として利用。旧$1,500/$2,500オファーを再マージしないよう、i18n requestで国際shellキーのみローカル翻訳を上書きする構成へ変更した。
- 国際ロケールのmarketing redirectを撤去し、`/ko`等を`/en`へ308しない。国際サービス詳細は同一ロケールの`/services#package-modules`へ整理。JAの旧agency/LP/videoのみ`/ja/services`へ移動し、JAのJapan Entry Signal Checkは公開対象外とした。
- ブログはJAを一般記事seed、国際ロケールを英語Japan Entry記事seedへ統一。サイトマップ、OG、JSON-LD、ヘッダー/フッターCTA、チャットlocaleも同じ分離ルールへ揃えた。
- 検証済み: JSON parse、`npm exec -- tsc --noEmit`、対象Vitest 4 files / 38 tests、production build **336/336 pages**、quality guard 0 errors。ローカルHTTPは日英・ko/de主要ページ200、JA表示本文にJapan Entry/$12,000/Wise/USDC/14営業日なし、国際ページに固定$12,000/支払方法/14営業日あり、ko canonicalは`/ko/pricing`。
- 正式 `npm run release:prod` を完走。deployment `i3fgzgb9pu7br5ir59mxfm5k`、DB **82/82**、Traefik/Cloudflare、Sales health、日英主要smokeを通過。本番12ロケールのpricingをHTTP 200、JA主要8ページを本文marker clean、国際pricingをJapan Entry/$12,000 markerで再確認した。`/ja/tools/japan-entry-score` はJA公開対象外のnot-found表示。

### 2026-07-13 支払方法・14営業日納品保証の実務運用監査（本番反映済み）
- Japan Entry申込フォームに希望支払方法（Wise、銀行振込、USDC、クレジットカード）とセットアップ費用確認を追加。選択値はlead metaへ保存し、DBベル／Slack通知の双方へ引き渡す。公開フォームでは口座・カード・ウォレット情報を収集しない。
- 料金、申込、FAQ、法務、プライバシー、ホーム、Works、ブログ、診断デモ、AIチャットの公開コピーを、記録したStart Date、14営業日以内の固定セットアップ納品、未納品時の12,000ドル全額返金、顧客側変更・保留による時計停止、成果保証なしへ統一。
- 運用runbookへ、請求書を正本とする支払手段、Stripe請求書／決済リンク、USDCネットワーク確認、検収・引き継ぎ・返金証跡を追記。release smokeにWise、14営業日、全額返金、支払方法項目を追加。
- 検証済み: JSON parse、関連Vitest 8 files / 67 tests、全Vitest 94 files / 440 tests、TypeScript、quality guard（0 errors）、production build 336/336、diff check。正式 `npm run release:prod` は最新 deployment `s5us1sfkciqmy9oqo4z7tk3f` で完走し、DB 82/82、日英主要ページ、Stripe legacy endpoint 410、日英チャットRAGの支払方法・返金回答を本番URLで確認済み。

### 2026-07-13 Japan Entry CTA・根拠資料・RAGアシスタント強化（本番反映済み）
- ヘッダー右上の導線を日英とも `Contact` / `お問い合わせ` に変更。価格・固定オファーの明示は料金、申込、本文CTAへ残し、初見で「問い合わせ先」と認識できる導線へ整理した。
- Worksに公開提供資料の3 dossier（購入者導線 / 公開シグナル / 申込みから引き継ぎ）を追加。確認できる実装・検収・運用境界と、許諾なしには主張しない順位・訪問・成約・売上を明示し、架空の過去事例を作らない。
- FAQを英語13→17件、日本語8→13件へ拡張。保証の定義、Works資料と顧客事例の違い、AI参照範囲、外部審査遅延、公開後サポートを追加。ブログは英語12本・日本語7本、最短本文2,000文字超、hero画像・表・タグ・目次・サイドバーを維持。
- 右下チャットを承認済みサイト/ブログのlocale別RAGへ接続。Gemini（設定時）/日本語Dify（設定時）へ根拠コンテキストを渡し、回答に参照リンクを表示、根拠なしは人確認へフォールバック。料金・保証・成果の幻覚を安全ゲートで抑止。
- 検証: 関連Vitest **19/19 pass**、チャットRAG追加テスト **3/3 pass**、TypeScript pass。公式 `npm run release:prod` 後に日英のContact、Works dossier、FAQ、Blog、チャットAPIを本番URLで再確認済み。

### 2026-07-13 SMBフルサイト・デモ品質ゲート（本番反映済み / 収集・送信停止）
- 2026-07-13 実在事業者での再現性確認として、公式Instagramと公式noteを運用する「及川洋菓子店」の非送信・非公式デモを追加。Cafe版の色替えではなく、`premium.style=craft` 専用のsplit hero、番号付き商品導線、letterpress調、無限marquee、非対称galleryを持つ別レンダラーを実装した。公開事実は週末営業、欧州焼菓子、2020年3月開店、公式住所・SNSに限定し、画像3点は提案用生成素材として実物ではない旨を表示。11ページ、送信停止、noindex、rights manifest、品質97点を維持する。本番11経路HTTP 200、PC 1440px / mobile 390x844で横溢れ0、全固定ページの他社コピー混入0、フォーム0、console error 0を実ブラウザ確認済み。
- 2026-07-13 TCD有料テーマ級への品質改修: 企業別の権利確認済み `demo_media` を使うpremium experience schemaを追加。3点未満のhero/gallery、SNS公式導線なし、画像rights manifestなし、特商法ページなしは品質ゲートで公開停止する。
- Cafe SOSOMU確認用DEMOへ、提案用生成ビジュアル3点、フルスクリーンheroスライダー、Ken Burns風トランジション、Framer Motion reveal、Emblaギャラリー、画像付きメニュー、About/Menu画像hero、SNSブランドアイコン、モバイル固定CTAを追加。正式制作時は承認済み実写へ差し替える。
- 固定ページは Home / About / Menu / Contact / Works / News / FAQ / Recruit / Privacy / Terms / Commerce Disclosure の11ページへ拡張。`/{locale}/demo/{slug}/commerce`を追加し、特定商取引法表記を生成品質の必須条件にした。
- UI依存は既存Framer Motionに加え、shadcn carousel経由のEmblaとSNSブランド表示用react-iconsを追加。production build 336/336 pages、関連Vitest 5/5、TypeScript、対象ESLintを通過。
- 2026-07-13 品質目視確認用として、送信・企業同期を行わない `Cafe SOSOMU` 11ページ提案デモを追加。公開根拠は公式Instagram、所在地・メニュー概要の公開ディレクトリ、Google Maps導線に限定し、第三者写真・ロゴ・口コミ・売上数値は不使用。フォームは `formEnabled:false` で誤送信を防止する。PC 1440px / mobile 390x844 の実ブラウザ検品で横溢れ0、公開11経路HTTP 200、console error 0を確認し、メニューの汎用制作会社コピーと特商法metadataも公開上で修正済み。
- 対象企業がそのまま使える見え方にするため、デモ共通UIへ企業別CTA、ナビ文言、フッター所有者・説明、公式SNS、Google Maps、送信停止表示、ページ別見出しを追加。従来のParadigm営業CTAはデータ指定がない既存デモのみ互換維持する。
- 生成品質の欠陥を修正し、`meta.public_facts` のスカラー値をDeepSeek V4 Proプロンプトへ明示的に渡す。未確認情報を創作しない指示も追加。企業追加時のDBトリガーが使用する `db_trigger` をpipeline provider制約へ追加するmigrationを作成した。
- 現在の確認用デモ本文は、LiteLLM V4 Pro未設定のため `human-reviewed-showcase` と明記した品質上限サンプル。自動V4出力と偽装しない。送信・Twenty同期・営業通知は実行しない。
- 本番初回目視で、`/{locale}/demo/*` にParadigm本体のheader/footerが重なる問題を確認。`ConditionalSiteChrome` の独立表示対象へdemo routeを追加し、release scriptへ `db_trigger` migrationを明示配線して再発防止する。
- 独立表示後のモバイル目視で、予約URL未設定でも空の予約カードが出ることと、送信停止デモにParadigm用FAQが残ることを確認。該当セクションをデータ条件で非表示にして対象企業サイトとしての一貫性を保つ。
- HP未保有でGoogle Maps/SNSに公開情報があるSMB向けに、3つの異なるデザイン候補を生成し、品質スコア最高案だけを採用するトーナメント方式へ変更。会社名ハッシュによる単純テンプレ差し替えを廃止し、構成順・密度・モーション・レイアウトを含むdesign recipeと衝突fingerprintを保存する。
- Home / About / Services / Contactに、Works / News / FAQ / Recruit / Privacy / Termsを加えた10ページ構成を実装。問い合わせフォーム、管理者向け品質表示、認証済みquality API、保存済みfull payloadの再現表示を接続した。
- `theme_demo_pages`にfull payload、design recipe、候補3案、quality report、権利manifest、公開状態を追加。90点未満、hard blockerあり、Google Maps/SNS根拠なし、画像権利不明、構造衝突、架空の推薦・顧客ロゴ・売上/回復試算がある場合はDB制約と生成処理の両方で公開停止する。旧公開デモも再生成まで非公開へ移す。
- 既存の架空testimonial/trusted-by生成、AI推薦文、推定損失表示、架空沿革を公開経路から除外。AI promptも未確認の実績・数値・沿革・人物・顧客・料金を創作しないfail-closedへ変更した。実ロゴ/写真は利用許諾が確認できるまで使わず、提案段階はテキストmonogramと権利確認済みUI資産のみ使用する。
- release script / run-migrations / release-doctorへ `20260712233619_demo_quality_gate.sql` を配線。PR #69をmainへmergeし、deployment `g3ytc5lxtfq5dkxlb6iby9jh` はcommit `7a98c47c`（PR #69 merge commit `aafd6585` を含む）でfinished。新コンテナhealthy、Traefik origin-lockを検証済みhelperで新IPへ原子的更新し、post-deploy release doctorは全項目pass。
- 本番DBは品質列3点を含むmigration適用済み、quality publish constraint実在、`is_published` default=false。既存3デモは再生成まで全件非公開（published 0）、anonは公開表示に必要な8列だけSELECT可能。品質APIの未認証応答はHTTP 401、`/api/ready`・日英公開サイトはHTTP 200。
- Twenty営業リストは空のまま。候補収集、SNS送信、メール、電話、郵送、フォーム送信は一切実行していない。送信再開は別途オペレーター承認が必要。

### 2026-07-13 ブログ編集セット刷新・実装漏れ修正（本番反映前）
- 英語Japan Entry編集シードを9本から12本へ拡張。新規記事は、必要素材・承認、問い合わせ/決済導線、公開シグナルと一次データを扱い、固定$12,000・6か月月額込み・7か月目以降$995・14営業日目標・法務境界を一貫して記載。
- 日本語の公開レビュー済み編集シードを4本から7本へ拡張。申込み後の適合確認、問い合わせ/決済、公開後の引き継ぎを追加し、各記事に2,000文字以上、表、タグ、ヒーロー画像、目次/サイドバー、固定CTAが揃う状態を維持。
- `seed-japan-entry-blog` は本番DBの接続上限を踏まえ、英語12本を冪等CMS seedする正式経路へ整理。日本語7本は承認済みコードseedをCMS空時fallbackとして公開し、release smokeで表示を検査する。管理画面への日本語投入はDB負荷を分けて実施できる。
- 既存の安定スラッグ `japan-entry-21-business-day-readiness` は維持しつつ、本文の工程をDays 1–5 / 6–10 / 11–14へ修正。FAQ、チャット、診断、fallback homepageの旧21営業日表記も14営業日へ統一。
- 追加監査で、英日ブログ一覧/記事の画像、表、タグ、目次、モバイル目次、右固定サイドバー、価格CTA、CMS空時の安全な編集seedを確認。次は `npm run release:prod` でCMS seed・公開URL・主要記事を本番再確認する。

### 2026-07-13 HP全体 Japan Entry コンテンツ刷新（本番反映済み）
- 英日ホーム、料金、サービス、FAQ、実績/公開根拠、会社概要、申込、ブログメタデータ、構造化データを Japan Market Engine / Japan Entry の固定オファーへ統一。
- 公開条件を統一：セットアップ **$12,000固定**、最初の6か月は標準月額運用込み、7か月目以降 **$995/月**、必要条件受領後 **14営業日公開目標**、通常依頼は **48営業時間以内着手**。
- セットアップ範囲を明示：LP/HPローカライズ、SNS最大2チャネル初期設定、最大3市場の公開シグナル比較＋1市場深掘り、法規制適用可能性整理、日本語サポート導線、公開運用・引き継ぎ。
- 日本語ホームは旧Payload文書の内部ローカライズキーを除去して再生成するrelease seedを追加。`release:prod`で日英ホームCMS publish成功、全主要URL・DB 81/81・Revenue/Cloudflareゲートを確認。
- 公開個人名をフッター・会社概要・特商法から抑止。住所は `2-2-15 Minami-Aoyama, Minato-ku, Tokyo, Japan`、法人番号 `5010403026363` を表示。

### 2026-07-13 Twenty営業リスト全削除・再収集保留（本番反映済み）
- 本番TwentyのCompanyを全件削除。削除前はactive **126,111件** / deleted **317件**、最終確認はREST `totalCount: 0` / DB `companies: 0`。
- 削除前にTwenty DB全体の復元用スナップショットを `/var/backups/paradigm/twenty-reset/twenty-before-company-reset-20260712T214836Z.dump` へ作成（13MB、権限600）。
- People **5件**・Opportunity **6件**は保持し、Companyとのリンクのみ解除。Twenty公開URLはHTTP 200を維持。
- 再収集はユーザー指示で保留。途中検証で登録された候補も全削除し、ローカル・本番コンテナ双方で収集プロセスが残っていないことを確認。収集方法の壁打ちが完了するまで候補取得・Twenty登録・自動送信を実行しない。

### 2026-07-13 Japan Entry 市場別アクセス・ROIモデル（実装中 / 送信停止）
- Japan Entry Package専用の公開シグナル投影モデルを追加。Tranco / Cloudflare Radar / Common Crawl等で構成済みの `public-signals-v1` を起点に、市場別推定アクセスと保守・基準・上振れの6/12/24か月試算を生成する。実アクセス・確定売上としては扱わず、観測・指数・推定・仮定を区別する。
- 商条件は初期費用 **$12,000一括前払い**、最初の6か月は追加月額なし、7か月目以降は署名済み条件に基づき **$995/月**。ROIは増分売上ではなく増分粗利から費用を控除して算出する。
- 専用DB `sales_japan_entry_projections`（RLS、service_role限定）、認証済みGET/POST API、レポートの市場別アクセスグラフ・累積純便益グラフ・ROI表、URLなし初回文面を実装。生成物は常に `needs_review` で、既存の `report_ready` / 送信処理 / Twenty送信導線には接続しない。
- 収集・見込み客への送信は未実施。公開ランク根拠がない企業は推定を生成せず停止する。
- 検証: 投影ロジックVitest **4/4 pass**、対象ESLint pass、`npx tsc --noEmit` pass、`npm run build` **336/336 pages**。新API routeが本番bundleへ含まれることを確認。
- PR #63をmainへmergeし、正式release deployment `g8zgsqcxw6auu336p3uvmq4l` はfinished、公開smoke・Sales healthはpass。初回release後の監査で、既存の手動migration列挙とDB検証リストが新テーブルを自動検出しないことを確認したため、専用migration適用と `sales_japan_entry_projections` 実在検査をrelease gateへ追補する。
- PR #64でrelease wiringを追補し、正式release deployment `sy7j1xyl3qo342mh2ggfql0d` はfinished、DB **82/82**・公開smoke・Sales healthをpass。本番の専用テーブルは `RLS=true`、anon/authenticated SELECT=false、service_role SELECT=true、行数 **0**。新APIの未認証応答はHTTP 401で、候補収集・投影生成・Twenty登録・見込み客送信は未実行。
- 初回フォーム文面の固定テンプレートを廃止し、DeepSeek V4 Pro（`deepseek-v4-pro`固定、DeepSeek公式API直叩き）による企業別生成へ変更。別モデル・定型文へフォールバックせず、会社名・公開根拠・$12,000一括前払い・最初の6か月込み・Yes/No質問を品質ゲートで検査する。URL、資料、ROI、売上、未承認数値、entity/legal/tax/compliance範囲の幻覚は拒否し、同一V4 Proで最大4回修正後も不合格なら保存しない。
- 管理者のレポート編集パネルに、生成文面・モデル・品質点・語数・試行回数を送信停止状態で表示。問い合わせフォーム送信処理には未接続。
- 検証: 関連Vitest **22/22 pass**、TypeScript pass、対象ESLint pass、production build **336/336 pages**。本番設定のDeepSeek V4 Proを架空企業に対して実呼び出しし、1回目の空応答後、2回目に60語・品質100点・公開Tranco根拠付き文面を生成。DB保存・Twenty登録・フォーム送信は実行していない。
- PR #66をmainへmergeし、正式deployment `jq6w353slb0kfgcq7fyip831` はfinished、現行コンテナhealthy。既存ブログseedの一時504後にpost-deploy release-doctorを単独再実行し、全公開smoke・Sales health・DB **82/82**をpass。本番APIは未認証HTTP 401、`sales_japan_entry_projections` は **0件**で、本番の文面生成・保存・フォーム送信は未実行。
- 文面品質の再監査で、旧「品質100」は禁止事項チェックの満点にすぎず、Tranco順位の機械的差し込み・汎用的な推論を営業品質として誤評価していたと判定。順位だけを個別化根拠にする生成を廃止し、日本語導線・JPY価格・日本配送・日本ローカル決済という公開ページ上のJapan固有ギャップを監査データへ追加した。
- DeepSeek V4 Proは、Japan固有の高シグナル事実がある場合だけ異なる切り口を3案生成し、決定論的安全ゲート通過後に別のV4 Pro批評工程で具体性・自然さ・信頼性・経営判断適合を各25点で採点する。合計88点未満、1軸20点未満、risk flagありは保存しない。管理画面に4軸点・編集者所見・risk flagを表示する。
- 品質是正の検証: 関連Vitest **20/20 pass**、TypeScript pass、対象ESLint pass、production build **336/336 pages**。本番設定の実APIでは候補生成まで成功したが、批評工程が3回タイムアウトしたためfail-closedで文面・DB行・送信を生成しなかった。本番は `DEEPSEEK_API_KEY` によるDeepSeek公式API直叩きを正規経路とし、LiteLLMは使用しない。V4 Proが空応答・タイムアウトの場合は品質優先で保存停止を維持する。
- PR #68をmainへmergeし、正式deployment `sj7vp7jg0q9dmc3fy250dvdd` はfinished。新コンテナ、公開URL、Sales health HTTP 200 / JSON ok、DB **82/82**を確認した。post-deployでlegacy `agency_reports` のanon SELECT grant再付与を検出したため即時revokeし、release gateを再実行してpass。旧parity migrationからanon policy/grantも削除し、再発を防止した。`sales_japan_entry_projections`への保存、Twenty登録、フォーム送信は未実行。
- 文面の情報密度を再設計。100–160語で、Sato / Paradigm LLCの自然な自己紹介、公開説明に基づく相手の商品理解、Japan固有の購入導線/表示ギャップ、公開シグナルモデルによる推定日本アクセスと推定月次機会ギャップ、$12,000一括・最初の6か月込み、詳細分析または15分面談のCTAまでを1通に含める。推定値はmodel/estimate/assumption表記を必須とし、実測・違法・規制違反とは断定しない。公開の商品説明が取れない企業はLLMを呼ばず停止する。検証はVitest **10/10**、TypeScript、対象ESLint、production build **336/336** pass。
- 実V4 Pro出力に基づきプロンプトを再調整。本文は空行で区切る4段落（承認済み自己紹介 / 公開商品理解 / Japan診断 / Japan Entry Packageと単一CTA）を必須化し、未提供の役職・都市・会社種別、商品効果、顧客心理、離脱/コンバージョン因果を禁止。推論枠を8,000 tokens・120秒へ拡張し、批評JSONの`risk_flags`表記差もfail-safeに正規化した。架空企業を使ったDeepSeek公式API直叩きでは **94/100**（具体性23・自然さ24・信頼性23・経営判断適合24）、安全性100、4段落134語、risk 0で合格。DB保存・Twenty登録・フォーム送信は未実行。

### 2026-07-13 Blog long-form / visual editorial pass (実装済み・正式release待ち)
- `/en/blog` と `/ja/blog` の公開記事を、英語9本・日本語4本すべて2,000文字以上へ拡張。各記事に判断表、実務チェックリスト、公開根拠と不確実性の境界を追加し、文字だけの短文記事を廃止した。
- 既存のJapan Entry図版（`application-handover.svg` / `package-scope.svg` / `signal-check.svg`）を記事ごとのhero imageとして設定。記事一覧カードにも画像と可視タグを表示し、公開承認用の内部タグは画面から隠した。
- 記事ページのデスクトップ右サイドバーは既存の目次・メタ情報・固定`$12K` CTAを維持し、モバイルにも目次とCTAを追加。記事本文・一覧カード双方で`next/image`とalt/captionを使用する。
- Payloadに古い短文が残っている場合も、同slugの長文・表付きseedへフォールバックする品質ゲートを追加。CMS未投入時の英語・日本語seedも同じ要件を満たす。
- 検証: 対象Vitest **8/8 pass**、`npx tsc --noEmit` pass、`npm run build` **336/336 pages**、`git diff --check` pass。正式`npm run release:prod`（Coolify deployment `ddh21yorl63y6sm97ogpqf12`）でCMS英語9記事を9/9更新し、release gateを完走した。
- 本番実測: `/en/blog`・`/ja/blog`・英日個別記事はHTTP 200、記事HTMLに`figure`/`table`/画像asset/デスクトップ`hidden lg:block`サイドバー/モバイル`lg:hidden`目次が存在、画像3種はHTTP 200。`/en/blog/`は正規URLへ追従する。

### 2026-07-13 Blog locale-switch 404 fix (本番反映済み)
- Chromeの実際の404 URLは`/ja/blog/what-a-japan-entry-package-should-deliver`で、英語slugを日本語localeへそのまま切り替えたことが原因だった。正規英語URLは`/en/blog/what-a-japan-entry-package-should-deliver`。
- `src/proxy.ts` / `src/lib/marketing-routing.ts` に英語9slug・日本語4slugのlocale補正を追加。未翻訳localeへ遷移した場合は、記事が存在するlocaleへHTTP 308で戻す。記事ページ側にもサーバーフォールバックを残した。
- 対象テスト **20/20 pass**、TypeScript pass。正式`npm run release:prod`（Coolify deployment `w10yiriodxhiqxrvnoid1n5m`）完走後、`/ja/blog/what-a-japan-entry-package-should-deliver`→`/en/blog/what-a-japan-entry-package-should-deliver`の308と、Chrome表示後の英語記事titleを確認した。

### 2026-07-13 Public legal identity display update (本番反映済み)
- フッター、About、Legal、公開layoutへ個人名を出さない方針を適用。CMSや環境変数に個人名が残っていても、公開表示は空欄または運営チーム表記へフォールバックする。
- 本番の公開住所を`2-2-15 Minami-Aoyama, Minato-ku, Tokyo, Japan`へ統一し、古いCMSローカライズ住所より検証済み環境値を優先するよう変更した。
- 関連テスト **17/17 pass**、TypeScript pass。正式`npm run release:prod`（Coolify deployment `idoxxwhkm9dwrrxedjuvg81p`）完走後、`/en` `/en/about` `/en/legal` `/ja` `/ja/about` `/ja/legal`で英語住所表示・個人名0件・日本語住所0件を確認した。

### 2026-07-12 $12,000 setup scope content expansion (本番反映済み)
- 固定セットアップの内訳を英語ホーム、料金ページ、FAQ、申込導線へ統一表示: LP/HPローカライズ、SNS最大2チャンネルの初期セットアップ、最大3市場のpublic-signal market report（1市場deep dive）、Japan's Act on Specified Commercial Transactionsを含む規制適用可能性スクリーニング、buyer path、launch operations、handover。
- 除外範囲も明記: 継続SNS投稿・広告費、非公開トラフィック/売上データ、正式な法務意見・申請、第三者費用、無制限ページ/翻訳/追加機能。
- CMS homepage seedを更新し、`/en` と `/en/pricing` で4項目の実本文を確認。`/en/faq` にSNS、market report、regulatory screeningのQ&Aを追加。FAQ JSON-LDも同期。
- `npm run build` **336/336 pages**、関連Vitest **22/22 pass**、TypeScript pass。正式 `release:prod` deployment `e6ixm9o90yjfro745jdgq09j`、Sales health JSON ok、全対象URL HTTP 200を確認。

### 2026-07-12 Final production release (完了)
- `main` の本番コミット `2beaf1e` を正式な `npm run release:prod` でデプロイ。Coolify deployment `l3vuskyiaj8pigdxsdpz56n1` は `finished`、現行コンテナ `n8i2sjiqvr2d8hrzppop2m2i-120124223176` は `healthy`。
- pre-deploy / migration / Coolify / Traefik origin refresh / post-deploy release-doctor を全て通過。DB table verification **81/81**、公開schema RLS/anon ACL・integration slug制約、Supabase Realtime、Twenty worker、常駐timer/禁止worker停止、Cloudflare直origin遮断を確認。
- CMS publishはEnglish homepageとJapan Entry blog **9記事**を冪等publish。切替直後のCloudflare 502/504を限定リトライで自動回復し、post-deploy smokeは全対象URL **HTTP 200**、Sales healthは **HTTP 200 / JSON ok**。
- 本番URL実測: `/api/ready` `ok:true`、`/en`（visual proof + Signal Check CTA）、`/en/about`（代表者・法務情報）、`/en/works`、`/en/tools/japan-entry-score`（Signal Check）、`/en/blog`、`/ja/blog`（日本語キックオフ記事）、`/en/contact`、`/en/pricing`、`/en/faq`、`/en/legal` は全てHTTP 200。
- 運用env: Slack operator DM通知、法務identity、暗号化R2 backup、Turnstile、Twenty、Dify、public-signals evidence modeをrelease gateで検証済み。実電話番号を捏造せず、申込前の電子メール開示文言を維持。
- 残るquality guardの **50 warnings** は300〜499行の分割候補で、error 0・release blockerなし。次回の保守タスクとして責務分割を行う。

### 2026-07-12 Release hardening fixes
- `scripts/release-doctor.mjs`: public schema匿名権限チェックをrelation OIDで評価し、動的relation解決による誤失敗を解消。
- `src/app/api/sales/health/route.ts`: Twentyをhealth内で単一probe化、停止ポリシー対象の内部Stagehand/Steel/Crawlee/Outreachは未設定扱い、内部Payload TCP probeはSupabase Event Store検証と併記して警告付きokに整理。
- `src/lib/db/pool-monitor.ts`: DB TCP probeを短い2回再試行へ変更。
- `scripts/sales-os-no-login-deploy.mjs`: CMS seedの一時502/503/504・接続エラーを4回まで限定リトライ。

※ 以下の過去セクションは実装履歴。現在の本番状態・URL・release gateの判定は本セクションを正本とする。

## CURRENT STATUS - 2026-07-11 P0公開面・実運用ハードニング（実装済み / 正式releaseは外部設定待ち）

### 2026-07-12 Visual proof + utility placement（実装中）
- 文字だけの営業ページを解消するため、`public/japan-entry/` にBuyer path、Signal Check、Handoverの3つのプロダクトビジュアルを追加。架空の人物写真・匿名実績画像は使用していない。
- `JapanEntryVisualProof` をホーム、About、Worksへ配置し、`next/image`・alt text・公開根拠の説明・Signal CheckへのCTAを実装。ローカルproduction serverで各ページに3枚の画像と`/en/tools/japan-entry-score`へのリンクを確認。
- Utilityは既存のAPI/DB/RLS実装を活かし、ホームのvisual proof・既存promo・ヘッダーナビから実際に遷移できる状態へ統合。ローカルでは `/en/tools/japan-entry-score` HTTP 200、フォームUI表示を確認。
- 本番は現行コンテナが旧ビルドのため、これらの画像・utilityはまだ未反映。正式release gate（Slack、暗号化off-host backup、法務identity）を満たした後に`npm run release:prod`で公開し、ブラウザで再確認する。

### 2026-07-12 公開運用runbook + release contract（実装済み・外部設定待ち）
- `docs/ops/public-release-runbook.md` を追加。固定商条件、必須Coolify env、release順序、CMS seed、バックアップ復元訓練、502時のTraefik origin-lock復旧、incident/rollback、公開完了判定を一つの手順に統合した。
- `.env.example` にSlack・off-host backup・法務identityのrelease blocker条件を明記し、秘密値をrepoへ入れない運用を固定した。
- `release-doctor` にvisual proof 3 assets / `next/image` / Signal Check CTAの静的検査と、本番home/utilityのvisual・utility marker smokeを追加。画像やutilityが欠けた旧ビルドをHTTP 200だけで合格扱いにしない。
- コード・runbook・監査は完了。productionは現在も旧ビルドで、法務4項目、Slack credential、暗号化off-host backupの実値が揃うまで正式releaseを意図的に停止する。値を推測して公開状態にすることはしない。
- 直近の公開URL実測（2026-07-12）: `/en` `/en/about` `/en/works` はHTTP 200だが新visual markerなし、`/en/tools/japan-entry-score` は404、`/api/ready` は200。これはコード不備ではなく、`50a4f18`を本番へ流すrelease gateが外部設定3件で停止している証跡。

### 2026-07-12 暗号化off-host backupの本番有効化（実装・実機検証済み）
- Coolifyに既存のCloudflare R2 bucket/account/access credentialsがあることを確認し、SSH同一ホスト転送ではなくR2をoff-host transportとして採用。`scripts/lib/r2-put.py` を標準ライブラリのみで追加し、AWS SigV4 PUTを実装した。
- `backup-oss-supabase.sh` を暗号化必須 + SSH/R2選択式へ更新。`--validate-config` がDB password、GPG passphrase、off-host transport、R2 helperまで検証するようにした。release-doctorもR2 transportを正式に合格判定する。
- 生成した強度64文字のGPG passphraseをCoolifyとroot-only `/etc/paradigm/oss-supabase-backup.env`へ登録。R2 helperとbackup scriptをproduction hostへmode 700で配置し、既存の`oss-supabase-backup.timer`を維持した。
- 実機検証: host `--validate-config` pass、手動backup service exit 0、最新archive `20260712T052926Z.tar.gz.gpg` checksum OK / mode 600 / 527MB、R2にarchive + `.sha256`の両方をHeadObject確認。release gateのbackup failureは解消した。
- 現在の正式release blockerはSlack通知credentialと法務identityの2件のみ。これらは既存の正規設定・公開一次情報から確定できず、推測で埋めていない。

### 2026-07-12 Production 502 recovery（復旧済み）
- 03:06 JST頃、`https://paradigmjp.com/`、`/en`、`/api/ready` がCloudflare HTTP 502。アプリコンテナ自体の `127.0.0.1:3000/api/ready` と現行コンテナIP `10.0.1.13:3000/api/ready` はHTTP 200で、アプリ障害ではなかった。
- Traefikの `/data/coolify/proxy/dynamic/paradigmjp.yml` にある `paradigmhp-svc` upstream が旧IP `10.0.1.33:3000`を指していた（現行コンテナ `n8i2sjiqvr2d8hrzppop2m2i-030052041249` は `10.0.1.13`）。
- 既存の `scripts/lib/refresh-traefik-origin-lock.py` を使用し、Cloudflare公式CIDR 22件を再検証してorigin-lock cacheをprepare、その後Traefikルートを原子的に現行コンテナへapply。手動コード変更・再デプロイ・DB変更は行っていない。
- 復旧後の公開smoke: `/en`、`/ja`、`/en/about`、`/en/pricing`、`/en/faq`、`/en/works`、`/en/blog`、`/en/contact`、`/api/ready` はすべてHTTP 200。`release-doctor --pre-deploy`でもTraefik drift解消を確認。
- 再発防止として、Coolifyコンテナ更新後は `release:prod` のpost-deploy route refreshと、`release-doctor`の現行コンテナIP照合を必ず通す。現在も正式releaseを止めている外部設定3件（Slack、暗号化off-host backup、法務identity）は別途未解決。

### 2026-07-12 全公開ページのコンテンツ密度・運用導線拡充（実装済み・正式release待ち）
- 英語主要ページを「価格を読むだけ」から運用判断できる情報面へ拡張。`/en/services` を旧リダイレクト先ではなく5モジュールの正式概要ページとして公開し、各モジュールの責務、deliverables、接続順、承認・引き継ぎまで表示する。
- `/en/about` に、決裁者・一次情報・依存条件・引き継ぎを含む「engagement feels like」4段階を追加。`/en/works` にも、公開根拠と自己申告の分離、売上・訪問数を捏造しない方針、運用完了条件を追加した。
- `/en/faq` は13問へ拡張、`/en/contact` はfit review→scope confirmation→start decisionの申込後3段階を表示。`/en/blog` はCMS未投入時も9本の公開承認済み英語シードを表示し、空ページにならないようにした。
- `/ja/blog` もCMS未投入時に4本の公開レビュー済み日本語編集シードを表示。旧レガシー記事や根拠のない実績・順位・売上コピーは公開しない。
- 代表者の実在写真は素材未受領のため捏造せず、代表メッセージ横には「Buyer→Scope→Build→Handover」の抽象運用マップSVGを追加。実写真は本人確認済み素材の受領後に差し替える。
- `/en/video`、`/en/agency`、`/en/lp/*` と旧英語サービス詳細は、ホームの価格アンカーではなく `/en/services#package-modules` へ308統一。現行のJapan Entry導線以外で古いプランを見せない。
- 検証: `npm test -- --run` **87 files / 405 tests pass**、`npx eslint . --max-warnings=0` pass、`npm exec -- tsc --noEmit` pass、`npm run build` **336/336 pages**、`npm run quality:guard` **0 error / 50 warning**、ローカル本番serverでEN/JA主要ページ・ブログ・旧導線のHTTP/marker smoke pass。

### 2026-07-12 Trust surface / representative message expansion（実装済み・正式release待ち）
- `/en` と `/ja` のホームに、購入者導線・固定スコープ・handover・適合条件を4枚のvisual evidence panelとして追加。抽象的な実績数値や架空のcase studyではなく、実際に確認できる運用面を見せる構成にした。
- `/en/about` と `/ja/about` に運営責任者メッセージを追加。`PARADIGM_LEGAL_REPRESENTATIVE_NAME`が設定されていれば実名を表示し、未設定時は架空の個人名を作らず運営チーム署名へfallbackする。
- 顔写真・代表者画像はリポジトリに実在素材がないため生成・捏造していない。実画像を受領した場合に追加できる状態を保ち、現時点ではLogo/visual evidence/CSSカードで空虚さを埋めた。
- 検証: TypeScript pass、全Vitest 87 files / 404 tests pass、ESLint 0 error、production build 336/336 pages、quality guard 0 error。既存の行数warningのみ。

### 2026-07-12 Japan Entry package content expansion（実装済み・正式release待ち）
- `/en/pricing` に、固定パッケージの5モジュール（Japanese buyer path / Trust and compliance coordination / Japan discovery foundation / Bilingual support route / Launch operations）を追加。各モジュールのdeliverables、scope boundary、handover前提を明示した。
- 同ページに、意思決定の速いSMB向けの導入メリット4項目と、DIY・local hire・multiple specialistsとの比較表を追加。比較は価格断定や競合名ではなく、責任範囲・初回launch path・統合コスト・適合条件の差として記載した。
- 英語Japan Entryブログを6本から9本へ拡張。「パッケージの納品物」「DIY/採用/代理店比較」「公開後30日で測るもの」を追加。全記事に`japan-entry-public`タグ、900文字超の本文、固定価格・法務境界・不確実性の明示を維持した。
- `release:prod`の正式deploy後に`/api/admin/seed-japan-entry-blog`を冪等実行し、ブログ9本をCMSへpublishしてから`/en/blog`で新記事タイトルをsmokeする経路を追加。release-doctorの静的検査にもseed/smoke配線を追加した。
- 検証: `messages/en.json` parse、TypeScript、全Vitest 87 files / 403 tests、ESLint 0 error、production build 336/336 pages、quality guard 0 error / 50 warning。既存の行数warningのみで、500行超ファイルは発生していない。

### 2026-07-12 Japan Entry Signal Check utility（実装済み・正式release待ち）
- `/en/tools/japan-entry-score` と `/ja/tools/japan-entry-score` を追加。Webサイト、対象市場、5つの自己申告項目を入力すると、公開シグナルと自己申告を分離した `japan-entry-score-v1` を表示する。
- スコアはPublic visibility / Target-market alignment / Japan localization and trust / Commerce footprint / Execution readinessの5軸。未知データを0点扱いせず、`coverage`を別表示する。
- 実訪問数・国別実訪問比率・売上は常にunknown/null。根拠URL・観測日時・公開シグナル・未確認項目・優先アクションを結果画面に表示し、固定 `$12K`申込CTAへ接続する。
- APIは`POST /api/tools/japan-entry-score`。Turnstile、Cloudflare trusted-proxy rate limit（3回/10分）、honeypot、公開ドメイン検証、SSRF対策、source timeoutを実装。結果はraw IP/emailを保存せず、domain hashと30日期限の結果JSONを`public_japan_entry_checks`へ保存する。
- `migration_072_public_japan_entry_checks.sql`、release migration path、DB table verification、JA/EN nav・sitemap・homepage promoを追加。Twenty/Stagehandや既存Sales OS経路は変更していない。
- 検証: utility/API tests 6/6 pass、全体Vitest 87 files / 403 tests pass、TypeScript pass、全体ESLint 0 error、production build 336/336 pages pass、quality guard 0 error / 48 warning。`release-doctor --local-only --allow-dirty`はmigration/RLS/wiringを含めpass。正式releaseは下記の外部設定3件が揃うまで実行しない。

### 2026-07-12 無料OSS Market Visibility Index（実装済み・正式release待ち）
- Similarwebのような私有アクセス数・売上を無料ソースから推測して表示することは止め、`public-signals-v1`契約を追加。Tranco / Cloudflare Radar / Common Crawl / 公開sitemap / schema.org / 国別NIC-RDAPの観測値だけを保存する。
- `MarketVisibilityIndex` は公開順位・クロールフットプリント・更新鮮度を0–100の可視性指標に正規化するが、`actualMonthlyVisits` / `actualRevenue` / 国別実訪問比率は常に `null`。各証拠にsource URL・観測日時・confidence・制約を保存する。
- 公開レポートの「推定トラフィック」「モデル売上損失」は撤去し、「Public visibility」「Market alignment signals」「Revenue not publicly disclosed」へ統一。公開財務情報をsource_typeとURL付きで登録した場合だけ年次売上を表示し、月次化やconversion loss計算は行わない。
- 営業文面は `OUTREACH_EVIDENCE_MODE=public-signals` を既定値にし、根拠URLのない数値をDify/DeepSeekの出力検証で拒否する。`paid-traffic`を明示した場合だけDataForSEO/Similarwebの検証済みメトリクスを要求する。PageSpeedは市場アクセス根拠から除外した。
- `release-doctor` は無料モードでは有料traffic credentialをブロッカーにせず、paid-traffic時だけ要求する。無料モードでもSlack、Twenty、Dify、法務表示、暗号化off-host backupなど他の運用ゲートは維持する。
- 検証: 対象Vitest 23/23 pass、全体Vitest 85 files / 397 tests pass、全体ESLint 0 error、`tsc --noEmit` pass、production build 324/324 pages pass、quality guard 0 error / 47 warning、`release-doctor --local-only --allow-dirty` pass。

### 2026-07-11 Dify制御面固定 + Twenty選択リスト運用（実装済み・正式release待ち）
- 実務運用の本番経路はDifyに固定。Difyのworkflow / prompt / 実行IDを監査情報として保存し、Dify停止・出力の数値根拠違反時は失敗扱いにしてDeepSeekへ黙って切り替えない。
- DeepSeek直呼び出しは `allowDirectFallback: true` を明示した開発・緊急時だけ許可。本番の `/api/sales/generate-form-message`、enrichment、フォームアウトバウンドはfail-closedでDifyのみを使用する。
- `POST /api/sales/outreach/run` が `companyIds`（最大50件）を受け取り、Twentyの選択行を入力順にdry-runできるようにした。`report_ready` 以外・存在しないIDは `selection.notReadyCompanyIds` / `selection.missingCompanyIds` で明示する。
- dry-run / live sendの両方で、生成済み文面と根拠を `syncCompanyKarteToTwenty` 経由でTwentyへ先に同期する。Twenty同期失敗時は送信せず手動キュー相当で停止する。
- オペレーター承認は送信を暗黙実行せず、`form_send` キューを `report_ready` に戻すだけ。Twentyで承認後、dry-run確認を経て `dryRun:false` の明示送信を行う。
- 実務操作: (1) Twentyで選択→companyIds付きdry-run、(2) 文面・根拠URL・未知項目を確認、(3) キュー承認、(4) 同じcompanyIdsで再dry-run、(5) operatorが明示的にlive send。CAPTCHA/robots/重複/ドメインrate-limitは既存の手動キュー・遮断を維持する。
- 検証: `npx tsc --noEmit` pass、`npm run lint` pass、`npm run quality:guard` 0 error / 47 warning、`npm test` 84 files / 394 tests pass、`npm run build` 324/324 pages pass。

### 今回実装した内容
- 日本語を含む旧 `services` / `video` / `agency` / `lp` / `pricing` 導線を `/ja#japan-entry-pricing` へ308統一。公開価格・CTAの旧表現が残るページを現行Japan Entry導線から切り離した。
- 公開 `demo-pages` / `content-blocks` APIを再帰的な公開サニタイズへ変更し、診断・CRM・生成内部メタデータを返さない。`demo-designs` は `private, no-store`、障害レスポンスは内部エラー詳細を返さない。
- 管理APIの平文パスワードCookieとGETクエリログインを廃止。HMAC署名・7日有効期限の管理セッション、5回/分のログインレート制限、署名改ざん・期限切れテストを追加した。
- 旧Stripe checkout / sales video proxyはHTTP 410で固定Japan Entry申込へ誘導。Twenty CRMとStagehand workerは削除せず維持した。
- Slack webhook fallback、法定表示の環境変数SSOT、暗号化＋off-hostバックアップ必須化を実装。release-doctorでSlack、検証済み外部metric provider、Twenty、LLM、法定表示、off-host backupを本番release必須にした。
- CMS field auditはLeads/Usersのidentity nameをローカライズ欠落として誤検出しないよう修正。ESLint flat configと既存React 19/Payloadルールを整理し、全体lintをゼロエラーにした。

### 検証証跡（このブランチの実測）
- `npm exec -- tsc --noEmit --pretty false`: **0 error**
- `npm run build`: **exit 0**、Next全ルート生成完了
- `npx eslint . --max-warnings=0`: **exit 0 / 0 error / 0 warning**
- `npm test`: **84 files / 394 tests pass**
- `npm run quality:guard`: **0 errors / 47 warnings**（全て300〜499行の分割候補）
- `npm audit --audit-level=high`: **0 vulnerabilities**（workerはlowのみ）
- `node scripts/release-doctor.mjs --local-only --allow-dirty`: **pass**
- `npm run release:prod`相当のpre-deploy: host / Coolify / Traefik / Cloudflare origin lock / Realtime / Twenty workerはpass。`OUTREACH_EVIDENCE_MODE=public-signals`により有料metric providerは不要になり、公開envの残りはSlack、暗号化off-host backup、法定表示の3件。gateが停止したためdeployは実行されていない。
- release未実行のため、現本番は旧コンテナのまま（実測: `/api/infra` HTTP 200、`/api/infra/status` HTTP 200、`/ja/services` HTTP 200）。新コードの401/308/410挙動は正式release後に再検証する。
- Twentyは稼働確認済み。Stagehand/CrawleeのworkerコードとAPIは保持しているが、`STAGEHAND_ENABLED=false` のオンデマンド設計のため外部healthは現在503（営業フローを再開する別タスクでworker/CDP/APIキーを用意してから有効化する）。

### 正式release前に必要な外部設定（値を推測してはならない）
- `PARADIGM_LEGAL_REPRESENTATIVE_NAME`、`PARADIGM_LEGAL_POSTAL_CODE`、`PARADIGM_LEGAL_ADDRESS`、`PARADIGM_LEGAL_PHONE` の法務確認済み実値。
- `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID` または `SLACK_WEBHOOK_URL`。
- `OUTREACH_EVIDENCE_MODE=paid-traffic` を選ぶ場合のみ `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` または `SIMILARWEB_API_KEY`。通常の無料 `public-signals` モードでは不要。`TWENTY_API_KEY`、Dify form-message credentialは引き続き必須。
- `OSS_SUPABASE_BACKUP_GPG_PASSPHRASE` と `OSS_SUPABASE_BACKUP_SSH_TARGET`（暗号化off-host保全）。

上記をCoolify production envへ登録した後、`npm run release:prod`のみを正式入口としてDB/migration、Coolify deploy、Traefik refresh、post-deploy doctor、公開URL smokeまで実施する。外部設定なしにrelease gateを迂回しない。

## CURRENT STATUS - 2026-07-11 全ページ Japan Entry 公開サイト仕上げ（本番公開・運用基盤検証完了）

### 2026-07-11 API根拠付きフォーム文面下書き（実装済み・送信は未変更）
- 参考Gemini会話をレビューし、候補収集→根拠付きLLM下書き→Twenty同期→人間レビューの順に限定。自動フォーム送信は変更していない。
- `src/lib/sales/outreach/verified-metrics.ts`を追加。paid-traffic modeでのみDataForSEO / Similarwebの月間訪問数・日本比率・導出日本訪問数を、出典URL・測定日時・confidence・計算式付きで正規化する。未ラベルのtraffic metaとPageSpeedは市場アクセス根拠として扱わない。
- `/api/sales/generate-form-message` は既定で `require_verified_metrics` を有効化。検証済みメトリクスがない場合、またはLLM出力に許可されていない数値が含まれる場合は文面を保存せずエラーにする。
- lead-candidate由来のenrichment完了時だけ、送信を行わずに根拠付き文面下書きを生成してからTwenty karteを同期する。下書き失敗はenrichment全体を落とさず、診断イベントと `needs_review` 相当の結果へ記録する。
- 文面保存時に `sales_atomic_meta_merge` で `form_message_evidence`（metrics / unknowns / saved_at）を原子的に保存。Twenty同期のkarte summaryに、文面に使った数値と未知項目を表示する。
- 検証: `tsc --noEmit` pass、`npm run lint` pass、Sales tests 45 files / 178 tests pass、quality guard 0 error（既存warningのみ）。
- 追加監査修正: 全体Lintの既存117エラー（Payload内部リンク、React effect/ref purity、デモ引用符等）を解消し、`npm run lint` は **0 error / 0 warning**。`scripts/audit-sales-data-acquisition.mjs` はDocker内部Supabase URLを検出した場合にSSH経由のPostgres snapshotへ切り替え、DB 0件と接続不能を混同しないようにした。
- 2026-07-11 live evidence（過去記録）: production PageSpeed keyless APIはHTTP 429（quota=0）だった。現在はPageSpeedを市場アクセス根拠から外し、paid-trafficを選んだ場合だけDataForSEO / Similarweb credentialをrelease-doctorで検査する。
- この作業ブランチでは本番release・pushは未実施。公開サイトの大規模な未確定差分と分離してから正式releaseする。

### 2026-07-11 公開サイト依存の全面スリムダウン（実装中）
- ユーザー決定: 公開HPに不要なSales dashboard、Notion同期、n8n/video orchestration、旧MVP/提案・レポートアーカイブは撤去する。ただし **Twenty CRM と Stagehand worker は現行営業実務で使うため削除しない**。
- 撤去済み: Notion API/Webhook/syncライブラリ・スクリプト、n8n workflow JSON、旧Sales dashboard UI/専用pipelineコンテナ、旧MVP API、旧提案/レポート/optout archive、旧video orchestration routes/lib、未参照のaudio/pipeline helper。
- 維持: `/api/sales/twenty/**`、`twenty-sync`、Twenty CRM metadata/sync、`worker/**` Stagehand、Twenty向けpipeline intake/data collection、公開report/video template（レポート埋め込み互換）。
- Twenty pipelineの旧`video_generate` stepは、既存DB行との互換性を保ったまま明示的にskipする（n8n/video runtimeへの依存を再導入しない）。
- 顧客ポータル表示名をNotion依存から汎用の「顧客ポータルURL」へ統一。旧DBカラム名 `paradigmCustomerPortalUrl` はTwenty互換のため保持する。
- 検証状況: `tsc --noEmit` pass、quality guardは旧チェックを削除後に再実行予定。production releaseはこのブランチのbuild/test/release gate完了後に実施する。

### 2026-07-11 運用監査 remediation（実装済み・次回release待ち）
- 公開管理API（infra / analytics / demo-designs）をoperator認証＋`no-store`へ変更。`/api/infra`の内部origin情報は未認証公開しない。
- `content-blocks`の診断run公開フォールバックを廃止し、診断ID prefixから会社名・損失額等を返さない。demo pagesは公開フィールドのみ返す。
- 公開trackingはtrusted proxy IP＋rate limit＋イベントallowlistへ統一。公開pixelからhot-lead昇格・Slack通知を実行しない。旧`/api/cta-click`は410 retired。
- demo contactはTurnstile/honeypot/rate limit、DB保存失敗時の成功返却禁止、DB bell通知へ更新。`migration_070_demo_contact_hardening.sql`をrelease pathへ追加。
- `sales_integration_status` / `sales_tool_connections`のslug制約、public schema全体のdefault-deny RLS/anon ACLを`migration_071_public_surface_rls_and_constraints.sql`で適用するrelease pathを追加。DB verificationとpost-deploy doctorでRLS/制約を検査する。
- 問い合わせ後のエンリッチメントをHTTP fire-and-forgetから、企業stub＋`sales_enrichment_jobs` durable queueへの同期enqueueへ変更。
- `paradigm-runtime-guard.timer`、`paradigm-outreach-worker`、`services-steel-browser-1`を本番hostから停止・撤去。release-doctorでも常駐timer/containerをfailにする。
- lintをNext 16互換のESLint flat configへ移行し、Playwrightの実Chrome自動選択と`e2e:install`を追加。i18n verifierはJA/EN=200、他locale=308 redirectを正しく検証する。
- backup scriptにAES-256 GPG暗号化とSSH off-host転送を追加。復元手順は`docs/ops/backup-restore.md`に記録。
- 実装検証: TypeScript / ESLint / Vitest / build / quality guard / i18n integrity pass。公開migration適用と本番再deployは、法定表示の代表者・住所・電話、Slack、off-host backup credential登録後に実施。

※下記の過去セクションに残る件数・コミット・「migration待ち」記述は履歴であり、上記remediation記録とrelease doctorの実測を正本とする。

### 2026-07-11 Japan Entryコンテンツ拡張（本番反映完了）
- EN商流表現を全主要導線で統一: **$12,000 one-time setup**、標準月額運用はセットアップに含めて最初の6ヶ月は追加月額なし、7ヶ月目以降 **$995/month**。単なる値引きの「無料」ではなく、included serviceとして説明する。
- Blogを汎用Web制作記事からJapan Entry意思決定者向けへ再編。`src/lib/japan-entry-blog.ts`に英語基幹記事6本（市場参入、21営業日準備、翻訳とローカライズ、法人・銀行、費用比較、買い手信頼）を追加した。
- `/api/admin/seed-japan-entry-blog`を追加。`japan-entry-public`タグ、本文、英語localeを含む冪等seed。公開英語記事は本文空欄を`blog-cms`側でも拒否する。
- 未検証の`industry first`、ChatGPT等での推薦保証、Google Maps上位保証、`instant replies`表現を公開英語コピーから除去・弱めた。
- ローカル検証: `messages/en.json` parse OK、対象Vitest **12/12 pass**、`tsc --noEmit` 0 error、`quality:guard` 0 error、production build **337 pages / exit 0**。新seed routeもbuild route一覧に含まれる。既存backup scriptのCRLFをLFへ正規化し、backup validation testsも復旧した。
- Payloadの既存import schemaに`posts` / `posts_locales`等のunique arbiterが欠落しており、`ON CONFLICT` seedが失敗する状態を検出。`migration_069_payload_posts_constraints.sql`を追加し、正式release pathへ組み込んだ（PR #58）。既存26件の重複なしを確認後、production DBへ適用した。
- 本番seed: 認証済み`/api/admin/seed-japan-entry-blog`で**6/6 updated、errors 0**。`/en/blog`一覧と6記事URLで期待するH1・本文表示を確認。`/en/pricing`で`$12,000`、6ヶ月included、7ヶ月目以降`$995/month`を確認。
- 正式`npm run release:prod`: DB **79/79**、Cloudflare origin lock 4 host、主要英語route、Sales health JSON `ok:true`、direct origin / forged header **403**を全てpass。月額の対応件数・時間・SLAは契約で確定していないため、公開コピーには推測値を書かない。

### 固定条件・公開方針
- ENの主対象は欧米豪の「意思決定が早いSMB」。業種・従業員数ではなく、短期間で最終承認できるかを適格条件にする。
- 商条件はセットアップ **$12,000固定**、最初の6か月 **$0/month**、7か月目以降 **$995/month**。解約条件は「署名済み契約条件に従う」に統一し、「いつでも解約可」は使用しない。
- 初月 **20 qualified launches** は変更不可の社内運用目標として表示し、成果保証ではないことを明示する。
- 保守対象はJA/ENの公開ページ。旧ENサービス／LP／video／agency導線はJapan Entryへ集約し、JA/EN以外の公開localeはENへredirectする。内部・アーカイブページは`noindex`とする。
- 営業フローの設計・運用自動化は別途壁打ちへ延期し、この作業ではHPの公開品質、問い合わせ受付、SEO、法務表示、セキュリティ、配信インフラだけを完了対象にする。

### 実装・本番反映済み
- ホームだけでなく、about / services / pricing / FAQ / works / blog / contact / legal / privacy / report系を含むJA/EN公開導線、header/footer、metadata、sitemap、robots、OG、404/error/loading、cookie consent、Dify UIを横断整備した。
- Japan Entryの価格・CTA・適格条件を共通SSOTへ統一。未承認CMS実績、架空fallback、根拠のない診断数値・改善スコア・補助金適格性を公開面から除外し、証拠がない値は`Not measured`または明示的なestimate/targetとして扱う。
- 問い合わせを署名付きワンタイムchallenge + production Turnstile fail-closed + atomic RPC（lead/outbox）+ idempotency/CAS claimへ更新。Slack通知をescapeし、IP/個人メール等のPIIをログへ残さない。DB変更は`migration_068_contact_submission_atomicity.sql`で用意済みだが、本番適用はrelease待ち。
- Cloudflare公式CIDRの事前取得・checksum検証・atomic適用、全app aliasの直origin拒否実測を正式release gateへ組み込んだ。既存本番origin lockはCloudflare経由200、直origin／偽装CF header 403、内部upstream 200を実測済み。
- Next.jsの`middleware.ts`を`src/proxy.ts`へ移行し、Playwrightは専用headless Chromiumのdesktop / Pixel 7相当mobileを検証できる構成にした。旧deploy入口はrelease gateを迂回できないblock-onlyへ変更した。

### 現時点の検証証跡
- `npm exec -- tsc --noEmit --pretty false`: **0 error**。
- `npm run build`: **337 pages / exit 0**。
- 全Vitest: **86 files / 412 tests pass**。
- `npm run quality:guard`: **0 error / 59 warnings**（hard gate違反なし）。
- `npm audit --audit-level=high`: **0 vulnerabilities**。
- origin-lock Python test: **4/4 pass**。`git diff --check`、messages JSON parse、release script syntax checkもpass。
- Japan Entry主要フローPlaywright: desktop + Pixel 7相当mobile **14/14 pass**。JA/EN全公開route、旧URL redirect、固定価格、申込導線、診断デモのclaim safetyを確認。
- axe WCAG 2.2 AA監査: JA/EN主要30 route **30/30 pass**（critical / serious 0）。代表5画面×desktop/mobileの横overflow **0**、visual screenshot確認済み。
- `node scripts/release-doctor.mjs --local-only --allow-dirty`: **pass**。
- PR #48 / #49 / #50をmergeし、公開コードcommit `6a04d4f`を正式`npm run release:prod`経由で本番反映した。

### 2026-07-11 公開インフラ設定
- コンテンツ拡張releaseのpost-deploy doctorで、Coolify生成の`keystatic.paradigmjp.com` routeが手動origin-lockより優先され直origin 200になるドリフトを検知。`refresh-traefik-origin-lock.py`のapp / keystatic手動routerにpriority=1000を固定し、Python + Vitestで再発条件をテスト化した。修正commitは次回正式releaseへ含める。
- Cloudflare Turnstile widget `Paradigm Japan Entry Contact` をManaged mode・pre-clearance無効で作成し、`paradigmjp.com` / `www.paradigmjp.com`の2 hostを許可した。site key / secretはTask.md・git・chatへ記録せず、Coolify production envの`NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`へ直接登録した。
- Cloudflare SSL/TLS modeを`Full (strict)`、Minimum TLS Versionを`TLS 1.2`へ更新した。apex / wwwのA recordはCloudflare proxiedを確認した。
- `keystatic.paradigmjp.com`はSales OSの既存Keystatic連携・release gateで参照されるため、HP公開作業では削除しない。DNS-only + origin lockで外部403の現状を維持し、営業基盤の壁打ち時に認証付き公開または廃止を判断する。
- Coolify `paradigm-hp`でapplication health checkを有効化した。path=`/api/ready`、GET / HTTP 200、interval=30s、timeout=5s、retries=3、start period=30s。設定後も`running:healthy`を確認した。
- Coolify resource limitsをCPU 2、memory 4GB、swap 4GB、reservation 1GB、swappiness 0へ設定した。
- Slack即時通知credential（`SLACK_BOT_TOKEN` / `SLACK_WEBHOOK_URL` / `SLACK_CHANNEL_ID`）は未登録。問い合わせはDB lead/outboxへ原子的に保存されるため受付を失わないが、Slack即時通知はcredential登録までdegraded扱いとする。

### 2026-07-11 正式release / live運用証跡
- migration 068を含むrelease migrationをDB SSH channelで適用し、DB table verification **79/79 OK**。`sales_contact_submissions`、atomic create/complete RPC、service-role限定EXECUTE、lease CASをpost-deploy doctorで実測した。
- Coolify deployment完了後、app containerはcommit `6a04d4f`、`running:healthy`。health check `/api/ready`、CPU 2、memory 4GB、reservation 1GB、swap 4GB、swappiness 0を維持した。
- `paradigmjp.com` / `www` / `status`をCloudflare経由で配信。`status.paradigmjp.com`の旧internal dashboard依存を除去し、origin lock配下から`/api/ready`へ308、follow後200を確認した。
- TLS 1.0 / 1.1はprotocol-version alertで拒否、TLS 1.2 / 1.3のみhandshake成功。Full (strict)、security headers、robots、sitemap、apex / www proxied、直origin / forged Cloudflare header 403を確認した。
- 本番問い合わせ画面でCloudflare Turnstile script・response field・有効token（値は非表示）を確認し、GET `/api/contact`の署名challengeはHTTP 200 / 30分expiry。問い合わせDB/outboxは原子的に永続化される。
- root / worker / astro-demoの`npm audit`はhigh / moderate / critical **0**。Dependabotはmerge後、low 2件のみ（上流に修正版なし）。workerはオンデマンド実行・共有Droplet常駐なしを維持する。
- Astro demoをAstro 6 Content Layerへ移行し、production build成功。固定dynamic routeはprerenderされ、旧build warningを解消した。
- 日次OSS Supabase backupは追跡済み安全版へ置換。secretをroot-only systemd EnvironmentFileへ分離し、手動実行成功、最新archive checksum、`pg_restore --list`、SQL/global gzip streamを検証した。14日retention・直近連続backupを確認した。
- release途中の一時502は新container起動直後のseedで発生。deploy再試行ではなく、container health / Traefik upstream / ready 200を確認後にseedのみ再実行し、最終post-deploy doctorを全項目passさせた。

### Active Handoff / 完了条件
- HP公開と無停止運用に必要なcode / environment / Cloudflare / Coolify / DB / backup / live smokeは完了。営業フローの壁打ち・自動化は別タスクのまま維持する。
- **ユーザーまたは契約情報が必要な残件**: (1) Slack app webhook/token/channelの発行、(2) 代表者・住所・電話の正式値と法務レビュー、(3) 災害復旧用オフホスト保全の選択、(4) PageSpeed quota付きAPI key / DataForSEO / Similarweb APIのいずれか。現行backupは同一hostのため、Cloudflare R2等の保存先credentialを用意するか、有償Hetzner Backupを承認後に有効化する。
- 会社代表者・住所・電話の設定値は現状未登録のため、法定表示は申込前のメール開示fallbackを使用する。実値を取得できた時点でsettingsへ登録し、最終的な法務レビューを行う。
- `node scripts/release-doctor.mjs --pre-deploy --allow-dirty` 実測: infra / Cloudflare / Twenty / Turnstile / Dify は pass。残るfailは Slack credential、verified metric provider、暗号化off-host backup、法定表示4項目、未追跡新規ファイル（commit前のため）の5系統。
- 変更は `5dacdde`（`feat: harden public surface and evidence-backed outreach`）としてcommit/push済み。clean worktreeでの`--pre-deploy`再実測は、Slack、verified metric provider、暗号化off-host backup、法定表示の4 failureのみ。コード不備や未追跡ファイルによるblockは解消済み。
- 最終commit `2e85036` 後に `npm run build` を再実行し、Next.js production build **324/324 pages** 生成・standalone content copyまで完了。`npm run lint`、`tsc --noEmit`、対象Vitest 4/4、quality guard 0 errorも再確認済み。

## CURRENT STATUS - 2026-07-10 Japan Entry固定オファー型ホームページ改修（本番反映完了）

### 決定事項
- 対象: 欧米豪の意思決定が早いSMB。業種・従業員数ではなく、7日以内の最終承認可否で選別する。
- 商条件: セットアップ **$12,000固定**、最初の6か月は **$0/month**、7か月目以降 **$995/month**（いつでも解約可）。
- 提供目標: 必要素材受領後 **21 business days**、初月 **20 launch slots**。安価なパイロット、$1,500レポート、無料相談は販売導線から除外する。

### 実装済み
- ENホームのCMS seedをJapan Entry単一オファーへ全面改稿（Hero / outcomes / 21日プロセス / 比較 / 固定価格 / 適格条件 / FAQ / CTA）。
- 既存の`home-ja` / `home-en`別ドキュメント方式を維持し、欠落していたPricing / Comparison block登録を修復。`layout.localized`は未移行DB構造を要求するため使用しない。
- seed APIに`scope: "homepage"`を追加し、他CMSコレクションに触れず2つのホームページだけを投入可能にした。部分失敗をHTTP 200にしないようerror集計も追加。
- 本番Payload Pages schemaのupsert制約欠落とPricing block未作成を`migration_066_payload_pages_pricing_blocks.sql`で冪等修復。
- Payload draft/version読取用のPricing block 4テーブルを`migration_067_payload_pages_pricing_versions.sql`で追補。
- `/en/contact?intent=japan-entry` に専用申込フォームを追加。会社URL、本社国、最終決裁権、$12,000承認時期、希望開始時期、固定価格同意を必須化。
- `/api/contact` は入力を型付きで検証・sanitizeし、Supabase lead metadataへ全項目を保存。DBベル + Slack通知を `notifyBothChannels` へ統一。
- ENホーム／申込ページのヘッダーCTAを `Apply — $12K` と専用申込URLへ統一。
- Release gateの分割SSH接続が本番hostの6接続目制限に当たる問題を再現し、ControlMaster socket共有へ修正。ゲート迂回なしで全remote infra check通過を確認。

### 検証
- `npm exec -- tsc --noEmit`: 0 error ✅
- `contact-payload.test.ts`: 5/5 pass ✅
- `npm run build`: 337 pages、exit 0 ✅
- Chrome実表示: 新Hero・固定価格・選別項目・`Apply — $12K`を確認。旧`Free Consult`導線なし ✅
- Release Doctor remote preflight: Traefik / Realtime / n8n停止 / Twenty worker / publicationを全項目pass ✅
- `quality:guard`: 今回の新規error 0。既存2件のみ（`apple-final.ts` silent catch / `website-extract.ts` 500行超）。
- 全体テスト: 257/263 pass。既存の非関連6件は未変更（agent-team links / content templates / dify timeout / routing / sales pipeline / browser search）。
- Production release: DB 78/78、Traefik、Realtime、Twenty、Sales health JSON `ok:true`を正式gateでpass ✅
- Production CMS seed: `scope=homepage`で2ページupdated、errors 0 ✅
- Production Chrome: `/en`の新Hero・$12,000・6か月$0・$995/month・20 slots・旧$1,500/Free Consult非表示を確認 ✅
- Production Chrome: `/en/contact?intent=japan-entry`の決裁権・承認時期・開始時期・固定価格同意・送信CTAを確認 ✅
- Playwright CLIはローカルChromium executable未導入で起動不可。テスト内容はChrome拡張の実ブラウザ検証で代替（アプリ不具合ではない）。

### Active Handoff（このタスク）
- 完了: 実装・型検査・対象unit test・production build・PR merge・production release・CMS seed・実ブラウザ確認。
- 残: 今回のJapan Entryホームページ改修に必須の作業なし。既存quality baseline 2件は別タスク。

### 2026-07-10 Cloudflare origin lock hardening
- 同一ホストに稼働中のDNS-onlyサービスがあるため、Hetzner Firewall / UFWの80・443全体制限は適用せず維持。`paradigmjp.com` のTraefikルーター単位でCloudflare公式CIDRだけを許可し、他サービスとSSH管理経路を保護した。
- main / www / Keystatic / Coolify生成aliasの全app Hostを`paradigm-cloudflare-only` middlewareで保護。公式CIDR再取得、Docker alias再列挙、600権限backup、atomic更新を`scripts/lib/refresh-traefik-origin-lock.py`へ実装し、正式release後のroute refreshから毎回再適用する。
- release-doctor pre/postはenv自己申告だけでなく、Cloudflare通常経路200、直origin HTTP/HTTPS、偽装`CF-Connecting-IP`、未知Host、全app aliasを外部runnerから実測する。
- 本番確認: Cloudflare ready / ENページは200、直originと偽装headerは全保護Hostで403、未知Hostはapp非到達、内部upstreamは200、SSH接続維持、Traefik設定error 0。demo / crawl4 / Supabase / Twenty / Coolify / Appexxの既存statusに変化なし。
- Coolifyはorigin実測成功後に指定された2つのproxy/origin-attestation envだけを更新して再読込一致を確認。contact challenge secretは別担当のため未変更。
- 復旧: host上の最新`paradigmjp.yml.bak-*-origin-lock`を元のroute fileへ戻してTraefik再読込を確認し、Coolifyの上記2 envを変更前状態へ戻す。Hetzner/UFW/DNSは今回未変更のため復旧対象外。

## CURRENT STATUS - 2026-07-09 トップページCMS化 + JA/EN出し分け 本番反映完了

### 本番確認
- `/ja` → CMS homepage (home-ja): ✅ シネマティック品質 (dark Hero+Meteors+Sparkles+gradients)
- `/en` → CMS homepage (home-en): ✅ シネマティック品質 (dark Hero+Meteors+Sparkles+gradients)
- 全BlockRenderer: framer-motion + Magic UI (Sparkles/Meteors/BorderBeam/AnimatedBeam/NumberTicker) + gradient 注入済み

- **決定事項**:
  - JAロケール: Web制作メイン（国内SMB向け）
  - ENロケール(他10ロケール含む): Japan Entry Package (JaaS) メイン（海外企業向け）
  - 動画サブスク: 全ロケール共通のDesignJoy式
  - 全コンテンツをCMS駆動に移行（A-CONTENT永久ルール準拠）

### 実装内容

**Pagesコレクション拡張** (`src/collections/Pages.ts`):
- JA/ENは`home-ja` / `home-en`の別ドキュメントで異なるブロック構成を管理（`layout.localized`はDB非互換のため2026-07-10に撤回）
- ComparisonBlock を layout blocks に追加

**新規ブロック: ComparisonBlock**:
- `src/blocks/Comparison.ts` — 比較テーブル用CMSブロック
- `ComparisonRender` (`BlockRendererCards.tsx`) — Aesop-styleテーブルレンダラー
- `BlockRenderer.tsx` に `comparison` dispatcher 登録

**page.tsx をCMS駆動に書き換え** (`src/app/[locale]/page.tsx`):
- `isHomepage: true` のPagesドキュメントを取得 → BlockRendererでレンダリング
- CMS未設定時は旧HomeClientにフォールバック

**シードデータ** (`src/app/api/admin/seed-all-content/seed-data.ts`):

| ロケール | ブロック構成 | 内容 |
|---------|------------|------|
| JA | Hero → Marquee → Section → CardGrid(5サービス) → Stats → Process(4step) → Testimonials(3件) → Pricing(3tier) → CTA | Web制作メイン |
| EN | Hero → Stats(損失) → Section(JaaS) → CardGrid(4機能) → Comparison(6行) → Stats(実績) → Pricing(3tier) → FAQ(8問) → CTA | JaaSメイン |

### 変更ファイル一覧
| ファイル | 変更 |
|----------|------|
| `src/collections/Pages.ts` | layout localized化 + ComparisonBlock追加 |
| `src/blocks/Comparison.ts` | 新規作成 (比較テーブルブロック) |
| `src/blocks/BlockRenderer.tsx` | comparison dispatcher追加 |
| `src/blocks/BlockRendererCards.tsx` | ComparisonRender追加 (54行) |
| `src/app/[locale]/page.tsx` | CMS駆動に書き換え (48行) |
| `src/app/api/admin/seed-all-content/seed-data.ts` | JA/EN homepage layout差替 |

### 検証
- `tsc --noEmit`: 0 error ✅
- `quality:guard`: 0 new error (既存2件: apple-final.ts silent catch / website-extract.ts 500行超) ✅
- `npm run build`: OK ✅

### 本番反映手順
```bash
# 1. commit + push
# 2. npm run release:prod
# 3. POST /api/admin/seed-all-content { confirm: true }
#     → JA/EN両ロケールのhomepage layoutをDB投入
# 4. /ja と /en で新CMSページが表示されることを確認
```

### Active Handoff (2026-07-09 OpenCode)
- 完了: トップページCMS化 + JA/EN出し分け + ComparisonBlock追加
- 残:
  - 本番seed投入後にCMS homepageを確認
  - Videoサブスク共通セクションのPages collection化（既存のvideoページをCMS化）
  - 旧HomeClient/HomeEnClientの段階的削除（CMS安定稼働確認後）
  - 多言語(ko/zh/de/fr/es/pt/ru/ar/vi/id)向けHomeClientフォールバック→全locale ENフォールバックの確認

### アーキテクチャ変更
```
旧: page.tsx → HomeClient (8-band hardcoded)
新: page.tsx → PayloadCMS Pages(isHomepage:true) → BlockRenderer
    ├─ JA: layout_ja (hero/section/card-grid/stats/process/testimonials/pricing/cta)
    └─ EN: layout_en (hero/stats/section/card-grid/comparison/stats/pricing/faq/cta)
    └─ fallback: HomeClient (CMS未設定時)
```

### 旧実装 (保守)
- `src/components/aesop/home/*` (9ファイル) — フォールバック用に保持。CMS安定後に削除予定。
- `HomeClient.tsx` / `HomeEnClient.tsx` — 同上。

### 本番稼働状態
- **Deploy**: 2026-07-07 00:54 UTC, container healthy
- **E2Eテスト**: discovery pipeline全段階が正常実行 (JP/1件→Tranco→filter→scan)
- **Health API**: healthy, OpenClaw Pipeline = ok

### パイプライン復旧手順
```bash
# 1. OpenClawがダウンした場合 → SSHで直接実行
ssh paradigm-hetzner "docker exec \$(docker ps --filter name=n8i2sjiqvr2d8hrzppop2m2i --format '{{.ID}}' | head -1) node /app/openclaw-pipeline/lead-discovery/scripts/health-check.js"

# 2. ヘルスチェック失敗時 → 5項目を順に確認
#    Twenty API: curl https://twenty.paradigmjp.com/rest/companies?limit=1
#    DeepSeek: env | grep DEEPSEEK_API_KEY
#    Tranco: curl -I https://tranco-list.eu/top-1m.csv.zip
#    CommonCrawl: curl -I https://index.commoncrawl.org/collinfo.json
#    Pipeline scripts: ls /app/openclaw-pipeline/lead-discovery/scripts/

# 3. Traefik upstream drift (502) → IPを確認して修正
ssh paradigm-hetzner "docker inspect \$(docker ps --filter name=n8i2sjiqvr2d8hrzppop2m2i --format '{{.ID}}' | head -1) --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'"
# → coolify-proxy内の /traefik/dynamic/paradigmjp.yml の paradigmhp-svc のurlを更新
# → docker kill -s HUP coolify-proxy (再起動禁止)

# 4. 全サービスがダウン → Hetzner power cycle
# → Coolify API: POST /api/v1/deploy?uuid=n8i2sjiqvr2d8hrzppop2m2i&force=true

# 5. crt.shブロック → FlareSolverrが迂回。FlareSolverrもダウン時は以下:
ssh paradigm-hetzner "docker restart services-flaresolverr-1"
```

### 完了した移行
- **Trigger.dev 完全削除**: コード/env/docker-compose/scriptsから全除去
  - `trigger/sales-os.ts` + `trigger.config.ts` 削除
  - `@trigger.dev/sdk` + `trigger.dev` npmパッケージ削除
  - 7コアファイルのdispatchコード → ローカル実行に統一
  - 13呼び出し元ファイルの`trigger_dev` → `openclaw` に書換
  - `docker-compose.trigger-oss.yml` 削除
  - `.env.example` のTrigger.dev変数22個削除、OpenClaw変数追加
- **n8n 残滓除去**: `scripts/n8n/deploy-studio-workflow.ts` 削除
  - DB migration_064: n8nカラム deprecate + trigger_providerに`openclaw`追加
  - integration-defs/Chatwoot/LiveKitのn8n/Trigger.dev参照をOpenClawに更新
- **OpenClaw パイプラインをリポジトリに統合**:
  - `services/openclaw-pipeline/` に4スキル + 16スクリプト + libを配置
  - DockerfileにOpenClaw pipeline COPY追加
  - docker-compose.dev.yml + deployスクリプト作成
  - デプロイ検証: 全チェックPASS ✅

### アーキテクチャ
```
OpenClaw CLI (Mac/Hetzner) → SSH → docker exec → /app/openclaw-pipeline/scripts/
  ├─ lead-discovery/orchestrator.js    (発見→診断→同期 全自動)
  ├─ diagnosis-output/diagnose-batch.js (DeepSeek V4診断)
  ├─ crm-sync/sync-status.js           (Twenty同期)
  └─ outreach-exec/outreach-batch.js    (フォームアウトリーチ)

Next.js App内のパイプラインロジック:
  sales-pipeline.ts       → ローカル実行 (Trigger.dev dispatch削除)
  enrichment-jobs.ts      → runEnrichmentRunner() (常にローカル)
  video-pipeline.ts       → dispatchVideoJobViaOpenClaw()
  trigger_provider        → 'openclaw' (DB migration_064)
```

### OpenClaw 4スキル（リポジトリ管理）
| スキル | パス | 状態 |
|--------|------|------|
| `lead-discovery` | services/openclaw-pipeline/lead-discovery/ (5 scripts) | ✅ |
| `diagnosis-output` | services/openclaw-pipeline/diagnosis-output/ (4 scripts) | ✅ |
| `crm-sync` | services/openclaw-pipeline/crm-sync/ (2 scripts) | ✅ |
| `outreach-exec` | services/openclaw-pipeline/outreach-exec/ (5 scripts) | ✅ |

### ソース状況
| ソース | 状態 |
|--------|------|
| CommonCrawl CDX | ✅ 稼働中 |
| crt.sh | 🔧 Hetzner IPブロック — FlareSolverr待ち |
| Tranco Top-1M | 🔧 .com パターン0件 |
| Crawl4AI | 🔧 endpoint 404 |

### Active Handoff (2026-07-06)
- 完了: Trigger.dev/n8n/cron → OpenClaw 一本化の全コード移行
- 残: crt.sh / Tranco / Crawl4AI のブロッカー解消
- 次の一手: 品質改善 (21件空catch/60件console.error欠落/80件AbortSignal欠落)
- **Twenty単一データハブ** → OpenClawは全データ操作をTwenty API経由で実行
- **4ステップに圧縮** → ①lead-discovery ②diagnosis-output ③crm-sync ④outreach-exec
- **Mac + Hetzner冗長実行** → 両方でパイプライン実行、負荷分散
- **自社営業自動化のみ** → SaaS外販は将来検討。まず自社パイプライン完動
- **Webサイトはそのまま** → paradigmjp.comの公開ページは変更しない

### 新アーキテクチャ
```
OpenClaw (オーケストレータ) ──(Twenty API)──► Twenty (単一Hub: 企業DB+状態管理+成功事例)
    │                                            │
    ├── ① lead-discovery (Crawlee + 外部ソース)   │ (成果物メタデータ)
    ├── ② diagnosis-output (DeepSeek + Astro)     ▼
    ├── ③ crm-sync (Twenty更新 + Slack/Telegram) Supabase ──► paradigmjp.com (表示)
    └── ④ outreach-exec (Stagehand/Playwright)
```

### 4ステップ詳細
| # | スキル | 処理内容 | 出力先 |
|---|--------|---------|--------|
| ① | `lead-discovery` | Crawleeでリード発見 + Crawl4AIで企業データ収集 → Twentyに企業登録 | Twenty |
| ② | `diagnosis-output` | DeepSeekで診断 → Astro Demo生成 → Cloudflareデプロイ | Twenty + Supabase |
| ③ | `crm-sync` | Twenty企業ステータス更新 + Slack/Telegram通知 + 成果物メタデータ保存 | Twenty + Supabase + Slack |
| ④ | `outreach-exec` | Stagehandでフォーム発見 → メッセージ送信 → 結果記録 → 返信監視 | Twenty |

### 削除/アーカイブ対象
- `trigger/sales-os.ts` 全Task定義（Trigger.dev課金停止）
- `src/lib/sales/sales-pipeline*.ts`（6ファイル、4ステップに圧縮）
- `src/lib/sales/enrichment-jobs*.ts`（OpenClaw内で完結）
- `src/app/api/sales/pipeline/*` 全API（Twenty API直叩きに変更）
- `src/lib/sales/outreach/*`（Stagehand + OpenClawスキルに移動）

### 残すもの
- Supabase sales_*テーブル（成果物メタデータ + レポート/Demo表示用）
- `/api/sales/health`（リリースドクター）
- `/api/sales/artifact-edits/*`（管理者編集パネル用）
- `src/app/[locale]/report/[slug]/`, `src/app/[locale]/demo/[slug]/`（表示ページ）
- Twenty CRM（営業GUIのSSOT）
- Supabase Realtime（イベント通知）

### 実装計画
1. OpenClawにTwenty APIツール登録
2. 4スキルのOpenClawスキル開発
3. Stagehand連携・DeepSeekプロンプト整備
4. OpenClawをHetznerに常駐デプロイ
5. 既存Trigger.devパイプラインを段階停止
6. 旧コード削除・アーカイブ
7. 検証→commit→push→deploy

## CURRENT STATUS - 2026-06-30 リスト収集パイプライン全面拡張 — 実装・デプロイ完了

- 新規ソース5件 + 3段階フィルタパイプライン実装完了。本番デプロイ済み。

- 新規ソース5件 + 3段階フィルタパイプライン実装完了。
- 実装ファイル: `whoxy.ts`(75行) / `country-nic.ts`(90行) / `manta.ts`(95行) / `bbb.ts`(90行) / `hello-work.ts`(110行) / `smb-purification-pipeline.ts`(277行)
- source-registry-core: 6件登録 / source-coverage: 6件検出 / enrich.ts: 2件taskDefs配線
- 検証: tsc clean、quality 0 error/58 warning、vitest 6 pass、build OK

### 新ソース
| ソース | 取得データ | コスト | 対象 |
|--------|-----------|--------|------|
| Whoxy API | WHOIS会社名・国・登録者メール・レジストラ | 無料枠 | 全世界 |
| Country NIC | .uk/.au/.jp/.de/.ca/.us RDAP | 無料 | 6カ国 |
| Manta.com | 米国SMB（従業員<10人） | 無料 | 米国 |
| BBB.org | 米加地域SMB（BBB認定） | 無料 | 米国/カナダ |
| ハローワーク | 日本求人企業（採用予算あり） | 無料 | 日本 |

### 3段階フィルタ (smb-purification-pipeline)
```
CZDS全TLD (2億件) → Stage1: 大企業除外 (90%) → 2000万件
  → Stage2: Crawl4AI高速スキャン (WP/viewport/footer) → 200-300万件
  → Stage3: Wappalyzer深堀り分析 → スコアリング済み候補
```

## CURRENT STATUS - 2026-06-30 リスト収集パイプライン全面拡張 — 壁打ち合意済み・実装中

- Gemini壁打ち合意: 全てもれなく実装する方針決定。
- 新規ソース5件: Whoxy API(WHOIS) / 各国NIC直叩き / Manta.com(米SMB) / BBB.org(米加地域SMB) / ハローワーク求人(日本)
- 3段階フィルタパイプライン: CZDS全TLD→大企業除外(90%)→Crawl4AI高速スキャン→Wappalyzer深堀り
- 既存部品: passive_inventory(CZDS)、wappalyzer、crawl4ai、crawlee、massdns/httpx定義あり。統合パイプラインがないのが課題。

### 実装計画
1. 新ソース5件のソースファイル作成
2. source-registry-core.ts に登録
3. source-coverage.ts に検出関数追加
4. enrich.ts taskDefs に配線
5. 3段階フィルタパイプライン統合
6. 検証→commit→push→deploy

## CURRENT STATUS - 2026-06-30 Twenty CRM 列整理 — 運用監視列4つ削除・全営業GUI Twenty一元化完了

- Twenty 列から削除: `paradigmSourceCoverage` / `paradigmDataSources` / `paradigmDataBreakdown` / `paradigmSourceDetailsUrl` — 内部運用監視用、営業実務に不要
- 残存15列: Name / Domain / 国名 / 取得ステータス / Next Action / 最終エラー / 営業ステータス / フォームURL / 診断レポートURL / 地域名 / 業種名 / ソース元 / 営業資料URL / デモURL / 顧客用Notion URL
- 修正ファイル: `crm-field-config.ts` (OPERATIONAL_CRM_VIEW_FIELDS + CRM_FIELD_OVERRIDESの4行削除)、`twenty-crm-metadata-db-apply.ts` (TWENTY_HOME_EXTRA_FIELDSの4行削除)
- データパイプライン（source-coverage/twenty writeback）は全維持。列だけ非表示化
- Twenty メタデータ適用 → Twenty サーバー再起動 → Traefik HUP で反映
- DEPLOY: 本番deploy済み、Twenty稼働確認済み

## CURRENT STATUS - 2026-06-30 Sales OS ダッシュボード全廃棄 — Twenty を営業GUIの唯一のSSOTに

- 決定: 営業GUI操作は Twenty (twenty.paradigmjp.com) に一元化。全Sales OSダッシュボードパネルをアーカイブ。今後非Twentyの営業GUIは作成禁止。
- アーカイブ: `src/components/sales-dashboard/` (38ファイル) → `src/components/_archive_sales-dashboard/`
- アーカイブ: `src/app/[locale]/admin/sales` → Twentyリダイレクトに差替
- アーカイブ: `src/app/api/sales/dashboard/`、`src/lib/sales/dashboard*.ts` (6ファイル) → アーカイブ
- 保持: 全バックエンドAPI・ライブラリ（実際のデータ処理は維持）
- リンク修正: BeforeDashboard、/admin、report/demo、通知、Telegram → すべてTwenty URL
- 検証: tsc clean、quality 0 error/58 warning、build OK

## CURRENT STATUS - 2026-06-30 全サイトコンテンツ実装・本番確認 — ブログ20・実績6・サービス5・料金12・FAQ15・声6・チーム3

- 壁打ち合意→設計→実装→DB投入→本番公開まで一貫完了。
- DB実績: paradigm.posts 20件、categories 4件、services 5件、pricing 12件、works 6件、faqs 15件、testimonials 6件、team_members 3件。
- インフラ修正: `PAYLOAD_PUBLIC_READS_ENABLED=1` をCoolify envに追加（全公開ページでPayloadCMS読み込み有効化）。`ADMIN_SCRIPT_SECRET` を追加（seed API認証用）。
- 本番確認:
  - ✅ ブログ記事詳細ページ (`/ja/blog/{slug}`) → HTTP 200、本文表示確認
  - ✅ サービス一覧 (`/ja/services`) → CMSデータ表示（JaaS含む5サービス）
  - ✅ 料金プラン (`/ja/pricing`) → CMSデータ表示（DXパートナープラン含む）
  - ⚠️ ブログ一覧 (`/ja/blog`) → 空表示（filterByLocaleのAND/OR結合問題）。詳細ページは正常。
  - ⚠️ 制作実績一覧 (`/ja/works`) → ハードコードフォールバック表示
  - ⚠️ FAQ (`/ja/faq`) → ハードコードフォールバック表示
- 未完了:
  - CMSトップページ: ブロックビルダー用レイアウトは定義済みだがCTA blockのフィールド名不一致で保存失敗。要payload admin UIで作成。
  - ブログ一覧のfilterByLocale不具合: PayloadCMS v3の内部`or`クエリが`availableLocales` join tableに正しくマッチしない。blog/page.tsxを直接filterに変更するか、PayloadCMSバージョン確認要。
  - ENロケールデータ: JAは全件保存済み。ENはseed時にautoTranslate hookがDB制約エラーで失敗。`_posts_v_locales` にJAデータのみ存在。手動でEN翻訳投入要。
  - CMSトップページ（7ブロック: hero/section/card-grid/cta/stats/process/cta）
- 投入方法: デプロイ後に `POST /api/admin/seed-all-content { confirm: true }` + `x-admin-secret`
- 検証: tsc clean / quality:guard 0 error / build OK

### Active Handoff (2026-06-30 OpenCode)
- 営業OS outreachパイプライン全面堅牢化 計14修正・10ファイル・テスト29件全pass
  - **堅牢性(6)**: プロセス分離 + 120sタイムアウト + Worker 90sコンテキストタイムアウト + 50context毎ブラウザ再起動 + DBエラー時二重送信防止 + 状態整合性
  - **効率性(3)**: heuristicパス24並列化 + CMSテンプレート(CF7/WPForms/Gravity) + フォーム構造24hキャッシュ
  - **品質(3)**: CSRF hidden field補完 + submit_uncertain 3回自動再試行 + URL変化サクセス検証
  - **保護(2)**: ドメイン単位サーキットブレイカー + Playwrightネイティブstealth化
  - 全修正ゼロコスト（新規有料API/プロキシ/サーバー増強なし・イベント駆動不変）

### 現状

- 根本シフト: design.json → BlockRenderer（テンプレ選択の自動化）から、DeepSeek V4 が**完全な .astro ソースコードをゼロから生成**する方式に転換。
- 8種のパイプラインコンポーネントライブラリ（HeroSection/ProofStrip/ServiceCards/TestimonialCards/PricingTable/FAQAccordion/CTABanner/PageLayout）を DeepSeek が import して自由に構成。
- コスト: ~5K output tokens/社 ≈ $0.01（DeepSeek V4 直叩き）。LiteLLM 廃止済み。
- Astro Docs MCP + Figma MCP を全 AI エージェント（Claude/Codex/OpenCode/Cursor）に登録済み（dotfiles SSOT 管理）。

### 新パイプライン
```
企業データ + 診断
  → DeepSeek V4（generateAstroCode）→ 完全な index.astro
  → astro build → dist/
  → R2 / Cloudflare Pages → 即納品URL
```

### 実装ファイル
| ファイル | 役割 |
|----------|------|
| `astro-code-generator.ts`(135行) | DeepSeek V4 → 完全な Astro コード生成プロンプト+呼出 |
| `astro-demo/src/components/pipeline/HeroSection.astro` | ヒーロー（4 variant） |
| `astro-demo/src/components/pipeline/ProofStrip.astro` | 数値実績ストリップ |
| `astro-demo/src/components/pipeline/ServiceCards.astro` | サービスカード（2/3-col） |
| `astro-demo/src/components/pipeline/TestimonialCards.astro` | お客様の声 |
| `astro-demo/src/components/pipeline/PricingTable.astro` | 料金プラン |
| `astro-demo/src/components/pipeline/FAQAccordion.astro` | よくある質問 |
| `astro-demo/src/components/pipeline/CTABanner.astro` | 行動喚起バナー |
| `astro-demo/src/components/pipeline/PageLayout.astro` | サイト外枠（nav+footer） |
| `cf-pages-deploy.ts`(139行) | CF Pages Direct Upload + R2 フォールバック |
| `demo-design-generator.ts`(472行) | 正規化レイヤー+design spec生成（旧方式、フォールバック用） |

### 残タスク
- [ ] astro-demo コンテナに新コンポーネントライブラリをデプロイ
- [ ] 実企業データで generateAstroCode() → astro build → R2 deploy の E2E 検証
- [ ] Cloudflare Pages プロジェクト作成 + Direct Upload 本番稼働
- [ ] Figma MCP からデザイントークン抽出 → プロンプト注入

### デモ確認URL
- 旧 BlockRenderer デモ: https://demo.paradigmjp.com/demo/sample-restaurant
- 新コード生成デモ（astro-demo再デプロイ後）: 同上URLが新コンポーネントで表示される

### MCP 統合
- Astro Docs MCP: `https://mcp.docs.astro.build/mcp` — SSOT registry → 全エージェントに展開済み
- Figma MCP: `@hapins/figma-mcp` — 登録済み、FigmaファイルURL指定で即抽出可能

## ACTIVE PLAN - 2026-06-20 営業OS全面強化（Phase 0-9・壁打ち合意済み）

不変前提: WW-EVENT 厳守＝cron/n8n/pg_cron 不使用・Trigger.dev イベント駆動 one-shot のみ。
決定: オーケストレータ維持＋完了イベント再開 / デモ=フルサイト一本化 / Dify=queue隔離かつ本文正本 / Twenty=category集約＋deep link / Telegram=webhook修復＋OSS deep link＋Realtime push / インフラ=重ワーカー分離＋Upstash＋ISR/CDN。

CURRENT STATUS - 2026-06-25 Inline artifact admin editor for Twenty Sales OS
- 壁打ち決定: RevenueOS は archive 扱い。Twenty を営業OS/SSOTにし、診断レポートとWeb制作デモは今まで通り自動生成。ただし管理者ログイン時だけ公開成果物ページ上にWP風の薄い編集パネルを出し、手動補正差分を保存できるようにする。
- 実装: `/ja/report/[slug]` は Payload admin cookie / `paradigm_admin_token` 認可済み管理者だけ右下に「診断レポート編集」パネルを表示。保存先は既存 `sales_companies.meta.personalized_copy`。冒頭フック、診断本文3本、最終CTAを上書き可能。リセットで自動生成文へ戻せる。
- 実装: `/ja/demo/[slug]` 配下のホーム/会社概要/サービス/問い合わせ全ページ共通で「デモサイト編集」パネルを表示。保存先は `theme_demo_pages.meta.artifact_admin.demo_overrides`。SEO、ホームFV、CTA、会社概要、サービス見出し、問い合わせ情報を補正可能。`fetchDemoMultiPageData` が表示直前に override をマージする。
- 実装: 管理者保存API `PATCH /api/sales/artifact-edits/report/[slug]` / `PATCH /api/sales/artifact-edits/demo/[slug]` を追加。両方とも Payload admin / legacy cookie 認可、入力sanitize、DB保存、`notifyBothChannels` によるDBベル+Slack通知を通す。公開ユーザーは 401。
- 検証: `npm exec -- tsc --noEmit` OK、`npm exec -- vitest run src/lib/sales/artifact-admin-overrides.test.ts` OK（3 tests）、`npm run quality:guard` OK（0 error / 57 warnings）、`npm run build` OK。ローカル Chrome channel で未認可 `PATCH /api/sales/artifact-edits/report/ccbc-xynd21` = 401、公開 `/ja/report/ccbc-xynd21` と `/ja/demo/ccbc-xynd21-demo` は編集ボタン0件を確認。
- 次の操作: 管理者は `/admin` または `/ja/admin/sales` にログイン後、対象の `/ja/report/...` / `/ja/demo/...` を開き、右下「編集」から保存。Twenty でリード追加・同期後も成果物は自動生成が基本で、商談前の文言補正だけこの inline editor で行う。
- 追補対応: 管理者保存E2E用に `dryRun` を artifact edit API へ追加し、`scripts/smoke-artifact-admin.mjs` で本番 secret を出力せず cookie / webhook dry-run として使い、report/demo dry-run PATCH を検証できるようにした。`DifyChatbot` は `/d/` と `/demo/` で非表示にし、demoページ除外 warning を解消。`npm audit --audit-level=high` は 0 件。Playwright browser install は CDN download 後のcache生成が止まったため中断し、既存 Chrome channel 検証を継続利用。

CURRENT STATUS - 2026-06-24 Twenty Sales OS SSOT pivot
- 壁打ち決定: RevenueOS を営業OS/SSOTとして継続改善しない。Twenty を営業OS/SSOTに昇格し、RevenueOS側は Twenty API に接続する外部OSS/worker監視・ログ・legacy engine surfaceへ降格する。
- 実装: `/[locale]/admin/sales` と `/[locale]/sales` の営業画面に `TWENTY_BASE_URL` 由来の Twenty CTA を渡し、サイドバー/ヘッダー/外部ツール導線を `Twenty Sales OS` / `Twenty SSOT` へ変更。既存タブは外部OSS連携・旧RevenueOSジョブ監視として残す。
- 実装: 統合定義と監査表示の `Supabase SSOT` 表現を `Supabase Event Store` へ変更。Supabase は営業マスターではなくジョブ履歴・Realtime・監査ログ・重い成果物メタデータの補助DBとして扱う。
- 実装: `sync-knowledge-from-notion` API の top-level Supabase client 作成を廃止し、実行時 `getServiceSalesSupabase()` へ遅延。env未設定のbuildでも落ちず、API実行時は明示 503 を返す。
- 実務運用追補: `/api/sales/import-csv` は既存/新規リードを保存後、既定で Twenty へ即時writebackする。`SALES_CSV_TWENTY_SYNC_LIMIT`（既定50 / 最大100）を超えるCSVは静かに staging 残しせず `twenty_deferred` と failure を返す。`sync_twenty=false` の明示時だけスキップ可能。
- 実務運用追補: `/api/sales/health` は `TWENTY_BASE_URL` / `TWENTY_API_KEY` と Twenty `/rest/companies` 到達性を必須チェックに昇格。Twenty API が死んでいる場合は営業SSOT不成立として health `ok:false`。
- 実務運用追補: Telegramメニュー、日次レポート、AI prompt説明、CRM field説明、source registry、diagnostic fallback の運用文言を Twenty Sales OS / Supabase Event Store 前提へ修正。
- 検証: `npm run test -- src/app/api/sales/import-csv/route.test.ts` OK（2 tests）。`npm exec -- tsc --noEmit --pretty false` OK。`npm run quality:guard` OK（0 error / 57 warnings）。`npm run build` OK。
- DEPLOY: commit `4777f2e` を main push 後、`npm run release:prod` 完走。DB table verification 78/78 OK、Coolify deployment `v14ep97l2x6hovdg5zi2xvce` finished、Traefik route refresh は app container `n8i2sjiqvr2d8hrzppop2m2i-133124772585` / `10.0.1.32`。post-deploy smoke は `/api/ready`、`/ja`、`/ja/admin/sales`、`/en/report/ccbc-xynd21`、Twenty、Sales health JSON `ok:true` まで合格。infra drift gate は Supabase Realtime healthy、wal_level logical、n8n stopped、Twenty worker restart=0、`sales_pipeline_runs` publication OK。

CURRENT STATUS - 2026-06-24 Global SMB / DNS freshness lane foundation
- 壁打ち決定: Google Maps UI スクレイピングやWHOIS連絡先依存ではなく、DNS/RDAP/CZDS/公開ディレクトリを「鮮度シグナル」として扱い、公開サイト/フォーム/明示連絡先が取れた候補だけをRevenue OSでレビューする。
- 実装: `dns_freshness` lane を候補基盤に追加。既存 `sales_lead_candidate_*` テーブルを使い、新テーブルは作らない。DB制約migration `migration_062_sales_dns_freshness_lane.sql` を追加。
- 実装: 国別market config (`US/GB/AU/CA/DE/JP`) と fresh-domain scoring を追加。既存Revenue OSの国コードに合わせて `UK` 入力は `GB` へ正規化。parked/under_construction/default_server/dead/legacy/modern の website state、鮮度、地域、ローカルサービス適合、大企業キーワードをスコア化。
- 実装: 認証付き `POST /api/sales/lead-candidates/fresh-domains` を追加。最大500件の fresh domain 候補を投入し、`promote` 指定時のみ上位候補を企業化・enrichment queue へ進める。
- 実装: Source registry に `DNS freshness candidates` を live bulk lane として追加。`GET /api/sales/lead-candidates?lane=dns_freshness` でレビュー可能。
- 実務監査修正: `migration_062_sales_dns_freshness_lane.sql` を正式 `release:prod` 経路の migration 適用順に追加。未適用DBで `dns_freshness` lane insert がcheck制約で落ちる事故を防止。
- 実務監査修正: 公開メールは `contact_email_present` の真偽値だけを保存し、国判定の証跡本文には混ぜない。WHOIS/RDAP は連絡先DBではなくタイミングシグナルとして扱う。
- 実務監査修正: `scripts/sales-os-no-login-deploy.mjs` から git 管理された webhook secret 実値を除去。`TRIGGER_WEBHOOK_SECRET` はCoolify envに存在しない場合リリース停止。
- 残タスク実装: Sales管理画面に `Fresh Domains` 専用タブを追加。国/取得上限/RDAP確認数/HP状態/企業化のGUI操作、候補レビュー、取得元ログ、ローディング/空/エラー状態を実装。
- 残タスク実装: `POST /api/sales/lead-candidates/fresh-domains/discover` を追加。CZDS/zone + crt.sh + RDAP one-shot でfresh domain候補を取得し、既存 `dns_freshness` ingestionへ投入。通知は `notifyBothChannels` 経由でDBベル+Slackへ送る。
- ガード: SNS・Apollo等有料B2B DB・Google Maps UI scrape・n8n runtime は使わない。
- 検証: `npm run test -- src/lib/sales/lead-candidates.test.ts src/lib/sales/source-registry.test.ts src/lib/sales/source-acquisition.test.ts` OK（3 files / 13 tests）。`npm exec -- tsc --noEmit --pretty false` OK。`npm run quality:guard` OK（0 error / 59 warnings）。`npm run build` OK。`node scripts/audit-sales-os.mjs` OK（13 pass / 0 warn / 0 fail）。`npm run release:prod -- --dry-run` は未コミット/未追跡ファイルを検出して停止（release gate正常動作）。
- DEPLOY: PR #40 → main `0b09300` → `npm run release:prod` 完走。`migration_062_sales_dns_freshness_lane.sql` はDB SSH channelで本番適用済み。DB table verification 78/78 OK。Coolify deployment `p14cjlg1d9q5adw0jsohwq4e` finished、Traefik route refresh は app container `n8i2sjiqvr2d8hrzppop2m2i-004623646867` / `10.0.1.32`。post-deploy smoke は `/api/ready`、`/ja`、`/ja/admin/sales`、`/en/report/ccbc-xynd21`、Twenty、Sales health JSON `ok:true` まで合格。追加確認: `/ja/admin/sales?tab=freshDomains` HTTP 200、`/api/sales/lead-candidates/fresh-domains/discover` は未認証POSTで 401。

CURRENT STATUS - 2026-06-23 Twenty 50+ API/OSS取得結果のUI可視化修復
- 事象: Twenty company 詳細で `Digitalhumanity` を開いても Fields には `ドメイン名` しか前面表示されず、50+ API/OSS の取得率・取得ソース数・カテゴリ別内訳・詳細リンクが確認できない。
- 原因: `twentyCompanyHomePayload` は `paradigmDataBreakdown` を送っていたが、CRM view field / Twenty record view の正式フィールドとして前面固定されておらず、`paradigmSourceDetailsUrl` も独立リンクフィールド化されていなかった。さらに `/api/sales/twenty-sync` は企業同期前に Twenty メタデータ自己修復を実行していなかったため、設定適用漏れでもUIが空のまま成功扱いになり得た。
- 修正: `crm-field-config` に `50+ API/OSS取得率` / `取得ソース数` / `50+ API/OSS内訳` / `50+ API/OSS詳細URL` / `取得ステータス` を operational field として追加・上位表示。`twenty-crm-metadata` の record Home fields も同順で前面固定。
- 修正: Twenty writeback payload に `paradigmSourceDetailsUrl` link field を追加し、`paradigmDataBreakdown` / `paradigmSourceDetailsUrl` を required field 化。欠けた場合は `Apply CRM metadata before writeback` で失敗させる。
- 追補修正: 本番再同期で `paradigmCountryName` select のTwenty側不整合が 50+ API/OSS 書き戻しまで巻き止めることを確認したため、writeback required はソース可視化フィールドに限定。国名・営業ステータス等の補助CRMフィールドは欠けても削って再試行し、50+ API/OSS結果の可視化を優先する。
- 追補修正: Twenty server 再起動で metadata cache を再読込後、`paradigmSourceCoverage` の既存 workspace column が numeric であることを実エラー確認。writeback は `"33%"` 文字列ではなく `33` の数値で送るよう修正。
- 修正: `/api/sales/twenty-sync` は同期前に `getSalesCrmFieldConfig` → `applyTwentyCrmMetadata` を実行し、Twenty field/view metadata を自己修復してから company writeback する。
- 検証: `npm run test -- src/lib/sales/twenty-source-breakdown.test.ts` OK（5 tests）、`npm exec -- tsc --noEmit --pretty false` OK、`npm run quality:guard` OK（0 error / 59 warning）、`npm run build` OK。
- DEPLOY: commits `d6b51ae` / `4acb549` / `3871672` を main push 後、`npm run release:prod` を3回通過。最終 Coolify deployment `z135w5dkbh96ol1eka50fwlp` finished、Traefik route refresh は app container `n8i2sjiqvr2d8hrzppop2m2i-120331318600` / `10.0.1.31`。post-deploy smoke は `/api/ready`、`/ja`、`/ja/admin/sales`、`/en/report/ccbc-xynd21`、Twenty、Sales health JSON `ok:true` まで合格。
- 本番補修: Twenty DB metadata は `paradigmSourceCoverage` / `paradigmDataSources` / `paradigmDataBreakdown` / `paradigmSourceDetailsUrl` / `paradigmDataStatus` が active、visible viewField 10件を確認。Twenty server を再起動して metadata cache を再読込し、外部 `https://twenty.paradigmjp.com` HTTP 200 復帰を確認。
- 本番補修: workspace company table の `paradigmSourceCoverage` column を metadata と揃えて TEXT 化。`Digitalhumanity` (`7168eb9b-62f9-40ed-b541-1610963c0024`) に `sourceCoverage=32`、`dataSources=12+ API/OSS catalog: collected 4/12 / configured 0 / missing 8 / error 0; evidence: diagnostic_report, form_discovery, twenty, wappalyzer`、カテゴリ内訳、詳細URLを反映。
- 本番確認: Twenty REST `/rest/companies?filter=domainName.primaryLinkUrl[ilike]:%25digitalhumanity.co.za%25` は `Digitalhumanity` に `paradigmSourceCoverage: "32"`、`paradigmDataSources`、`paradigmDataBreakdown`、`paradigmSourceDetailsUrl.primaryLinkUrl=https://paradigmjp.com/ja/admin/sales?q=Digitalhumanity` を返す。

CURRENT STATUS - 2026-06-23 Demo route recovery / Astro full-site surface
- `https://demo.paradigmjp.com/` が Next 側 `/en/demo` の粗い Web Improvement Demos 一覧（Shopify/Notion/Stripe/Figma/Airbnb 等）を露出し、`/demo/sample-restaurant` が `/en/demo/sample-restaurant` へ寄って 404 になる状態を確認。
- 修正: `src/middleware.ts` で `demo.` host を `ASTRO_DEMO_INTERNAL_ORIGIN`（既定 `http://astro-demo:4321`）へ rewrite。`/` は Astro `/demo` へ、legacy `/ja|en/demo/*` は canonical `/demo/*` へ redirect。`api` matcher 除外を外し、demo host の Astro `/api/inquiries` も Next 側で潰さない。
- 修正: `astro-demo/src/pages/index.astro` は旧テンプレートギャラリーを出さず `/demo` へ redirect。Next fallback の `src/app/[locale]/demo/page.tsx` も外部ブランド一覧/DB依存一覧をやめ、業種別フルサイトデモ一覧へ差し替え。`src/app/demo/page.tsx` の既定 locale は `/ja/demo`。
- 検証: `npm exec -- tsc --noEmit --pretty false` OK、`npm run build` OK、`cd astro-demo && npm run build` OK。ローカル Astro server 実HTTPで `/`→`/demo` 200、`/demo` 200、`/demo/sample-restaurant` 200、`/ja/restaurant/sales`→`/demo/sample-restaurant` 200。
- Next middleware 実証: `ASTRO_DEMO_INTERNAL_ORIGIN=http://127.0.0.1:4321 npm run start` + `Host: demo.paradigmjp.com` で `/` は `x-middleware-rewrite=http://127.0.0.1:4321/demo` かつ 200、`/en/demo` は `/demo` へ 307、`/demo/sample-restaurant` は `x-middleware-rewrite=http://127.0.0.1:4321/demo/sample-restaurant` かつ 200。
- 画面検証: Chrome/Playwright で `/demo` desktop、`/demo/sample-restaurant` desktop/mobile を撮影。desktop/mobile とも `bodyWidth === viewportWidth` で横はみ出しなし。
- DEPLOY: commit `b21ee31` を main push 後、`npm run release:prod` 実行。Coolify deployment `x135yhzebpxkrr6jrcfxfs5o` finished、Traefik route refresh は app container `n8i2sjiqvr2d8hrzppop2m2i-085048237977` / `10.0.1.30`。post-deploy smoke は `/api/ready`、`/ja`、`/ja/admin/sales`、`/en/report/ccbc-xynd21`、Twenty、Sales health JSON `ok:true` まで合格。
- 追加復旧: 本番 `astro-demo` container が不在で Next middleware から `http://astro-demo:4321` が timeout していたため、`astro-demo` source を `/root/astro-demo` へ rsync、host Docker build、`coolify` network 上に `astro-demo` container を再起動。Traefik label は追加せず、Next middleware の内部 rewrite 先として復旧。
- 本番確認: `https://demo.paradigmjp.com/` 200（`Paradigm 業種別デモサイト一覧`）、`/demo` 200、legacy `/en/demo`→`/demo` 200、`/demo/sample-restaurant` 200、legacy `/ja/restaurant/sales`→`/demo/sample-restaurant` 200。旧 `Shopify/Notion/Stripe/Figma/Airbnb/Web Improvement Demos/Page not found` シグネチャは未検出。Chrome/Playwright 本番 desktop/mobile screenshot でも横はみ出しなし。
- 未解消の既存ガード: `npm run quality:guard` は今回未変更の既存 500行超ファイル `src/lib/sales/demo-deepseek-enhancer.ts`、`src/lib/sales/demo-multi-page-builder.ts`、`src/lib/sales/demo-page-service.ts` で失敗。今回差分由来の `min-h-screen` 警告は `min-h-dvh` へ修正済み。

CURRENT STATUS - 2026-06-23 Demo generator quality guard cleanup
- 残タスクの 500行超エラー3件を実装分割。`demo-deepseek-enhancer.ts` は型・DeepSeek API/sanitize・prompt を `demo-deepseek-types.ts` / `demo-deepseek-client.ts` / `demo-deepseek-prompts.ts` へ分離し、既存 import 互換のため元モジュールから型を再export。
- `demo-multi-page-builder.ts` は issue detection / metrics / FAQ / services / about story helper を `demo-multi-page-content.ts` へ分離。`demo-page-service.ts` は fetch 系を `demo-page-fetch.ts`、DeepSeek merge を `demo-deepseek-merge.ts` へ分離し、既存の `fetchDemoPageData` / `fetchDemoMultiPageData` export を維持。
- 行数実測: `demo-deepseek-enhancer.ts` 182、`demo-deepseek-client.ts` 268、`demo-deepseek-prompts.ts` 225、`demo-multi-page-builder.ts` 327、`demo-multi-page-content.ts` 387、`demo-page-service.ts` 164、`demo-page-fetch.ts` 354、`demo-deepseek-merge.ts` 104。
- 検証: `npm exec -- tsc --noEmit --pretty false` OK、`npm run quality:guard` OK（0 error / warningのみ）、`npm run build` OK。
- DEPLOY: commit `8e1aba5` を main push 後、`npm run release:prod` 実行。preflight の `quality:guard` も 0 error。DB table verification は 78/78 OK、Missing 0、Errors 0。Coolify deployment `bszegtyffiy0klk5fsbz3aui` finished、Traefik route refresh は app container `n8i2sjiqvr2d8hrzppop2m2i-103524222824` / `10.0.1.32`。post-deploy smoke は `/api/ready`、`/ja`、`/ja/admin/sales`、`/en/report/ccbc-xynd21`、Twenty、Sales health JSON `ok:true` まで合格。

CURRENT STATUS - 2026-06-23 Release Doctor 恒久化（ビルド/デプロイ時間浪費の再発防止）
- 2026-06-23 追加恒久化: 監査で「HTTP 200 だが Sales health JSON `ok:false`」「Supabase Realtime 実体なし」「n8n runtime 残存」「Twenty worker OOM restart 2829回」を検出。コード/インフラ/共通ルールの 3 面で修復中。
- `release-doctor` は Coolify env から shared secret を取得して `/api/sales/health` の JSON `ok:true` まで検査する。HTTP 200 だけでは合格しない。
- `release-doctor` pre/post に Revenue OS infra drift gate を追加: `supabase-db-1 wal_level=logical`、`supabase-realtime healthy`、`services-n8n-1` 非稼働、`opt-twenty-worker-1` restart count 低値、`public.sales_pipeline_runs` の `supabase_realtime` publication 参加を必須化。
- 本番インフラ修復: n8n runtime container は停止・削除済み（legacy JSON archive のみ保持）。Supabase DB は同一 volume `supabase_supabase-db-data` を保持して Compose 管理へ戻し、`wal_level=logical` で再作成。`supabase-realtime` を追加し healthy。`pg_cron` は `cron.job` table missing。`sales_pipeline_runs` は `supabase_realtime` publication 済み。
- Twenty worker 修復: 正しい管理元 `/opt/twenty-compose.yml` を更新し、worker 側 migration disabled、`NODE_OPTIONS=--max-old-space-size=768`、mem limit 1GiB へ変更。実測: restart=0 / running。
- Payload DB 修復: Coolify app env `DATABASE_URI` を外向き `178.105.138.55:5433` から Docker 内部 `supabase-db-1:5432` へ更新。`SALES_SUPABASE_REALTIME_URL=http://supabase-realtime:4000/realtime/v1` も追加。
- `/api/sales/pipeline/events` は PostgREST 用 Supabase client と Realtime client を分離。`SALES_SUPABASE_REALTIME_URL` を使い、`supabase-rest-1:3000` へ WebSocket 接続しない。
- DEPLOY 2026-06-23: commit `5b348f9` → Coolify deployment `fw5wt5yqdrz6c2h020b45ua5` finished → Traefik route `10.0.1.31`。独立 `release-doctor --post-deploy` 合格: `/api/ready` / `/ja` / `/ja/admin/sales` / `/en/report/ccbc-xynd21` / Twenty = HTTP 200、Sales health = HTTP 200 JSON `ok:true`。infra drift gate: `supabase-realtime healthy`、`wal_level=logical`、`cron.job=missing`、n8n runtime stopped、Twenty worker restart=0、`sales_pipeline_runs` publication OK。
- 本番 deploy の正規入口を `npm run release:prod` に固定。`release-doctor --pre-deploy` → `sales-os-no-login-deploy.mjs` → `release-doctor --post-deploy` の順に通し、今後 OpenCode/Codex/Claude/Cursor 等は単独の deploy script 直叩きを避ける。
- `scripts/release-doctor.mjs` を追加。pre-deploy で worktree/untracked、deploy script の破壊的 timeout cancel、build wrapper の DB 非依存/heartbeat、主要 script 構文、host disk/Coolify queue guard を検査する。
- post-deploy で `/api/ready`、`/ja`、`/ja/admin/sales`、既知の診断レポートURL（既定 `/en/report/ccbc-xynd21`、必要時 `RELEASE_REPORT_SMOKE_PATH` で差替）、`twenty.paradigmjp.com` を実HTTP検証し、Server Components digest/レポートエラー画面を検出したら release 失敗にする。
- `scripts/sales-os-no-login-deploy.mjs` の monitor timeout は既定で deployment を cancel しない。破壊的 cancel は明示 `--cancel-on-timeout` のみ。Coolify status 取得の一時的 5xx/timeout は origin busy として継続監視し、失敗シグネチャを分類する。
- 追加恒久化: production env の `NEXT_PUBLIC_SUPABASE_URL/SALES_SUPABASE_URL=http://supabase-rest-1:3000` は Docker 内部専用のため、ローカル release runner から Supabase REST を直接叩かない。`verify-db-tables.mjs` は内部 URL を検知して SSH/psql 一括検査へ切替、`sales-os-no-login-deploy.mjs` は migration/product seed/content template seed を Postgres/DB SSH channel へ切替し、一度 direct Postgres が失敗したら同一実行内は SSH を優先する。
- 追加恒久化: Coolify `finished` 直後に `paradigmjp.com` が 502 になった原因はアプリではなく Traefik file-provider `paradigmhp-svc` が古い `10.0.1.x` を向く route drift。`sales-os-no-login-deploy.mjs` / `deploy.mjs` は deploy 後に最新 app container の coolify network IP を `/data/coolify/proxy/dynamic/paradigmjp.yml` へ反映する。
- 他エージェント対策: `npm run deploy:prod` を `npm run release:prod` の互換エイリアスへ変更。`release-doctor` は timeout cancel opt-in、内部 Supabase REST 回避、Traefik route refresh 実装、route drift を静的/リモートで検査する。`docs/ai-rules-coding.md` に同ルールを追記し、`bash sync.sh deploy-ai-rules` で AGENTS/Cline/Cursor/Windsurf/Gemini へ展開する。
- DB parity 補修: `supabase/migrations/migration_061_release_table_parity.sql` を追加し、legacy proposal tables (`prospects`, `prospect_patterns`) と agency SSOT tables (`agency_*`) を RLS/service_role 最小権限つきで冪等作成。実適用済み。
- 実測: `node scripts/sales-os-no-login-deploy.mjs --skip-deploy` で migrations + `sales_products` 4件 + `sales_content_templates` 576件 seed 完了、既存本番 smoke `/api/ready`・`/ja/admin/sales`・`/ja`・`/en/report/ccbc-xynd21`・`twenty.paradigmjp.com` はすべて HTTP 200。`verify-db-tables.mjs` は 78/78 OK、Missing 0、Errors 0。
- 目的: 外部障害をゼロにするのではなく、同じ build/deploy 失敗を何十回も再試行しない。危険な状態なら deploy 前に止め、deploy 後は Revenue OS の成果物URLまで通らない限り完了扱いしない。

DEPLOY 2026-06-20: PR #30 → main(677a37c)→Coolify deploy(voqjuu09fu99qcyayil4hahm) status=finished→本番 /api/ready=200・/ja=200・demo/demo=200・app running:healthy（直後502はコンテナ起動窓で即回復）。0-1/1-2a/1-3/1-4/2-1/2-2/2-4/3-1/3-2/3-4/6-1/7-1/7-2/8-2/9-10(file) 本番反映済み。追補: Phase7 unit test + 6-3 doc(diagnostic-report-generation-pipeline.md)。

DEMO-DEPLOY 2026-06-20: astro-demo は Coolify アプリでなく host `/root/astro-demo` の standalone Docker(Traefik file-provider `astro-demo:4321`)。Phase 3 変更が未反映だったため、ローカル source を rsync→host で docker build→コンテナをロールバック付きで再作成。検証: `demo.paradigmjp.com/demo`=「業種別デモサイト一覧」・`/demo/sample-restaurant`=200・`/ja/restaurant/sales`→301→/demo/sample-restaurant。
INCIDENT 2026-06-20: E2E enrichment 検証(airbnb/figma 85ソース crawl・admission gate OFF)が CPU を 174→796% 暴走させ本番一時ダウン(521/000)。Hetzner API soft reboot 無効→hard reset で復旧(521→200)。**教訓**: 1 enrichment job の 85ソース並列 fan-out が真のリスク。9-9 admission gate は job dispatch 数のみ制御し per-job fan-out は未制御。要対策=per-source 並列上限(9-4)＋本番での実 enrichment 実行は慎重に。

ROOT-CAUSE 2026-06-20: 本番 255社で診断0/レポート0/personalized_copy 0 を DB 実測 → E2E(airbnb/figma)実行で原因特定=**`Dify HTTP 400` が processDiagnosisPhase で job 全体を fail させ report 生成前に早期 return**（→ レポート永久未生成・job retry ループ）。修正: Dify 失敗を job 失敗にせず fallback 要約で report 生成へ継続（retry分離の核心・最高インパクト）。**実証(PR#37 deploy後 E2E再実行)**: jobs running→completed（ループ解消）・airbnb/figma とも report_generated_at=SET（レポート生成成功）。personalized_copy は industry=null のため autoPersonalize が正しくスキップ（業種ありリードで生成）。

Phase 0 — Dify doc の n8n残滓除去
- [x] 0-1 dify-cloud-runtime.md を Trigger.dev `sales-video-pipeline` 経由へ書換え／video-pipeline の n8n_* は legacy DB列と明示（runtime n8n=0）

Phase 1 — Dify を queue job 化（retry分離）
- [ ] 1-1 ※監査結果: `EnrichmentJobType` に `dify_diagnosis`/`report_personalize` が既存。新規列は不要、`enqueueCompanyEnrichment` を jobType 受け取りに拡張する方針へ変更
- [ ] 1-2 enrichment-jobs.ts に Dify subtype handler（confidence≥0.7・直接INSERT禁止）※Phase2/3 として runner 内に既存。retry を job 単位に分離するのが残作業
  - [x] 1-2a enqueueCompanyEnrichment を jobType 受け取りに拡張（隔離 job enqueue 基盤・後方互換・tsc clean）
- [x] 1-3 karte_generate の inline runEnrichmentJobs(1) 撤去→triggerEnrichmentRunner dispatch + waiting_external（HTTP長時間占有=524主因を解消・tsc clean）
- [x] 1-4 report_generate の karte→report 文面生成を配線（autoPersonalize を processReportPhase へ・meta.personalized_copy 永続化・tsc clean）※Phase 6-1 と同時解決

Phase 2 — 完了イベント再開（オーケストレータ維持）
- [x] 2-1 completeJob の自動再開を dispatchSalesPipelineRun（Trigger.dev dispatch・fallback内蔵）へ変更（既存 inline runSalesPipelineLocally から昇格・tsc clean）
- [x] 2-2 enrichment 完了で該当 run を Trigger.dev 経由再開（runner プロセスから隔離）
- [ ] 2-3 video / reply / demo 完了でも再開発火 ※reply=post-outreach router 既存・video=sales-video-pipeline 既存・demo=report phase 経由で再開。Dify 単独 job の再開のみ残
- [x] 2-4 watchdog restartStaleSalesPipelineRuns は stale 保険として既存（startSalesPipelineWatchdog は no-op 化済み・tick の recoverStaleRuns gating 済み）

Phase 3 — デモHp フルサイト一本化＋一級ステップ化
- [x] 3-1 LP系統撤去: demo.astro を index 化（PremiumDemoPage を public から退役）・matrix を redirect 化（premium-demo.ts は full-site が共有のため保持・astro build OK）
- [x] 3-2 旧 LP URL（/{lang}/{industry}/{appeal}）→ /demo/sample-{industry} フルサイトへ 301（astro build OK）
- [ ] 3-3 demo_site_generate step を report 後・twenty_writeback 前に新設 ※enrichment Phase4 で generateReplacementDemo 既存。明示 step 化は任意
- [x] 3-4 8業種サンプル slug フルサイト index（/demo・inferDemoArchetype が slug 推論で業種別描画・DB seed不要・astro build OK）
- [ ] 3-5 getFullSiteProfile/demo-generator の archetype依存を減らし診断+lead注入
- [ ] 3-6 demo_site.url が twenty_writeback・outreach readiness で使われるか回帰 ※既存配線確認済（twenty-pull/outreach readiness/diagnostic）

Phase 4 — GUI/可視化
- [ ] 4-1 dashboard+Twenty karte に demo_url・Dify job status・continuation 状態表示
- [ ] 4-2 エラー可視化（toast + notifyBothChannels）

Phase 5 — テスト/デプロイ（LL/SAFE-DEPLOY/T-PLUS）
- [ ] 5-1 Vitest（Dify subtype/continuation/demo step/twenty writeback/redirect）
- [ ] 5-2 tsc --noEmit / quality:guard / astro-demo build / Next build
- [ ] 5-3 doc更新→commit+push→Coolify finished→本番URL確認

Phase 6 — レポート品質・Dify本文正本化・トレース可視化
- [x] 6-1 Dify karte→report を5幕本文の正本・meta.personalized_copy 永続化・DeepSeek=fallback（autoPersonalize を enrichment report phase へ配線・tsc clean。Dify正本化は DIFY_KARTE_TO_REPORT_API_KEY 設定時に昇格）
- [x] 6-2 generatedBy＋テンプレ選定トレースを report meta 保存・GUI/Twenty表示（karte snapshot に reportEngine/diagnosisEngine 追加・karteHomeSummary に「生成エンジン」行・tsc clean・14 tests pass）
- [ ] 6-3 Dify/DeepSeek 用途マップ文書化
- [x] 6-4 hallucination-guard 全文面適用・捏造禁止回帰（sanitizeBlocks 回帰テスト 3件 pass）

Phase 7 — Twenty 50+ ソース可視化
- [x] 7-1 Twenty writeback に category別内訳（sourceCategoryBreakdown）を追加＋karte summary に表示（paradigmDataBreakdown・tsc clean）
- [x] 7-2 per-source 詳細は source-coverage パネルへの deep link（sourceCoveragePanelLink）を karte summary に表示
- [x] 7-3 enrichment writeback が meta にソースキーを残し detect 成立を保証（computeSourceCoverage 回帰テスト 2件 pass・collected 0/85 症状を防止）

Phase 8 — Telegram bot 修復・OSS管理・Realtime
- [ ] 8-1 webhook状態確認・TELEGRAM_BOT_TOKEN/SECRET 設定・再登録
- [ ] 8-2 enrich/outreach のインライン撤去→Trigger.dev dispatch（Phase1/2統一）
- [x] 8-3 OSS deep link（Metabase動向/Chatwoot/Keystatic/Directus/RevenueOS への URL ボタン・`oss_links` intent・/oss コマンド・tsc clean・test pass）
- [ ] 8-4 Supabase Realtime→Telegram event駆動 push（HOT lead/返信/承認要求）
- [x] 8-5 inline keyboard拡充（メインメニューに OSS管理ボタン＋URL ボタン対応に TelegramKeyboard 型拡張）※返信構造化は継続
- [ ] 8-6 dashboard に bot履歴・webhook health・OSS接続状態
- [x] 8-7 Vitest（OSS deep link/intent分類）pass ※realtime payload/secret検証は 8-4/8-1 と併せて継続

Phase 9 — インフラ堅牢化（数千〜数万件対応）
- [x] 9-1 outreach worker プロセス堅牢化（2026-06-30）: コンテキスト90秒タイムアウト + 50コンテキストごとブラウザ再起動(OOM防止) + 死活判定(`isConnected`)
- [ ] 9-1 重ワーカー（Browserless/Steel/Stagehand/ComfyUI/HyperFrames/OpenMontage/video/crawl）を別box/serverless へ offload
- [ ] 9-2 Trigger.dev supervisor/enrichment 実処理を heavy box へ・paradigm-prod-01 軽量化
- [ ] 9-3 Upstash Redis 導入・rate-limit.ts を @upstash/ratelimit 分散版へ
- [ ] 9-4 グローバル token bucket＋per-source 並列上限
- [x] 9-5 outreach orchestrator 耐障害性（2026-06-30）: 1件あたり try/catch 孤立 + 120秒 Promise.race タイムアウト + recentlyContacted の DB エラー時 safe-default(true) + persistOutcome 順序修正(log→apply) ※idempotency/dead-letter は未着手
- [ ] 9-5 dead-letter queue＋指数backoff＋idempotency 統一（outreach 以外の全パイプライン）
- [ ] 9-6 marketing を ISR/静的化し公開 DB read を origin から排除
- [ ] 9-7 Cloudflare tiered cache＋cache-control・readiness 分離維持
- [ ] 9-8 Transaction pooler 強制・poolMax 適正化・circuit breaker ※監査: twenty-crm-metadata の生Client は全て try/finally で client.end() 済み・リークなし（撤去不要）。真の対象は Payload poolMax:4＋pooler Transaction強制で本番 pooler-mode 検証が前提（risky-config・要 prod 確認）
- [x] 9-9 ランタイム admission gate（host-admission.ts・ADMISSION_MAX_RUNNING_JOBS opt-in・fail-open・triggerEnrichmentRunner 冒頭で saturated 時 defer・テスト 4件 pass）
- [x] 9-10 scale index 追加（migration_045）**本番適用完了 2026-06-20**: run_sql RPC は不在のため、DATABASE_URI(`178.105.138.55:5433`・外部到達可)へ直接 pg 接続して 9 index を適用（9 ok/0 fail・pg_indexes 確認済・テーブル極小でロック無視）。
- [ ] 9-11 pool/queue メトリクス＋per-source circuit breaker 可視化・Sentry/Uptime・degraded mode

### INFRA監査 2026-06-20（read-only・full-autonomy 権限下）
- Coolify `paradigm-hp` = `running:healthy`（paradigmjp.com/www/keystatic）。env 96件。
- 設定済: DIFY_API_KEY/BASE/URL・SUPABASE系・TRIGGER_*・TWENTY_*・CLOUDFLARE_R2_*・DATABASE_URI・PAYLOAD_PUBLIC_SERVER_URL。
- 未設定（要対応）: TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET / UPSTASH_* / SENTRY_* / DIFY_DIAGNOSIS_API_KEY / DIFY_KARTE_TO_REPORT_* / PAYLOAD_PUBLIC_READS_ENABLED。
- 自律実行可能 MCP: supabase(migration) / cloudflare(CDN) / hetzner+coolify+docker(box/Redis) / sentry / vercel。→ 9-3 は Upstash 不在のため Coolify 自前 Redis で代替実装する方針。
- **唯一の真のブロッカー**: TELEGRAM_BOT_TOKEN は memory/mcp/Coolify いずれにも無く @BotFather でのみ発行可能（第三者secret）。8-1 の webhook 登録は token 取得後に自動実行。それ以外の 8-2〜8-7 は token 非依存で先行実装可。

---

## CURRENT STATUS - 2026-06-20 WW-EVENT: cron/定期実行を全廃しイベント駆動化（永久ルール）

- 永久ルール (WW-EVENT): サーバー負荷対策のため、サイト全体で cron / 定期実行 / 常駐 polling / `setInterval` worker / pg_cron / Coolify Scheduled Task / systemd timer を新設しない。同期・監視・ジョブ起動は webhook / DB event・realtime / queue enqueue / GitHub push / ユーザー操作などのイベント駆動にする。UI animation や単発 timeout/retry は対象外。
- 主因: Next.js コンテナが起動時から常駐 setInterval ループ（enrichment 10s + watchdog 60s で Twenty pull・report 再生成・DB スキャン）を回しオリジン過負荷(521/522/524)。→ 常駐ループ全廃（instrumentation no-op / enrichment-worker・watchdog は one-shot drain / `/api/sales/pipeline/tick`・`/api/sales/pipeline/recover` 起点 / rate-limit は遅延 sweep / SSE は Supabase Realtime）。上流コミット 913175a と統合済み。
- 本セッションの net-new（上流が未対応の分）:
  - `trigger/sales-os.ts`【本命】: Trigger.dev が現役オーケストレータ（`migration_040`/`053`: `replaces n8n` / `primary_orchestrator`）。その `schedules.task`（`* * * * *` / `*/5`）= 唯一の現役 cron を非スケジュール `task`（イベント起動）へ変換。旧 `twenty-sync-cron` / `sales-report-regenerator` は no-op tombstone 化し、実処理は `twenty-sync-event` / `sales-report-regenerator-event` へ分離。
  - `src/app/api/sales/pipeline/tick/route.ts`: webhook/手動用の軽量 one-shot tick を新設。既定では enrichment/recovery のみ実行し、Twenty pull / report regeneration は body opt-in（誤爆時の負荷防止）。
  - `src/app/api/sales/admin/abolish-periodic-jobs/route.ts`: 本番アプリ内から固定SQLだけを実行する認証付き one-shot 管理APIを追加。外部DB/SSH到達性に依存せず、`cron.job` の残存を 0 件まで掃除して残数を返す。
  - `n8n-workflows/02,03`【レガシー】: n8n は Trigger.dev に置換済み・src から呼び出し無しの非稼働成果物。整合のため `scheduleTrigger`→`webhook` 化したが live runtime ではない（再 import 不要）。
  - `supabase/migration_044_abolish_pg_cron_event_driven.sql`: pg_cron 全ジョブを unschedule（冪等・pg_cron 不在でも安全）。`scripts/run-migrations.sh` にも追加済み。`migration_013` の cron 再作成は no-op 化（上流と統合）。
- 運用確認:
  1. デプロイ後に `/api/sales/admin/abolish-periodic-jobs` を shared-secret 付きで one-shot 実行し、`remaining: 0` を確認する。
  2. Trigger.dev cloud の `/api/v1/schedules` は `count: 0` 確認済み。旧 `twenty-sync-cron` / `sales-report-regenerator` は schedule が残ってもコード側 no-op tombstone、実処理は `twenty-sync-event` / `sales-report-regenerator-event` を明示イベントで起動。
  3. Notion 同期は Notion webhook → `/api/sales/sync-*-from-notion`、パイプライン維持は `/api/sales/pipeline/tick` / `/api/sales/pipeline/recover` で event 駆動。
  4. n8n は decommission 済み前提。成果物 JSON 01-04 に `scheduleTrigger` は 0 件。
- 検証: `tsc --noEmit` クリーン / `npm run quality:guard` OK / 変更スクリプト `node --check` OK / n8n schedule audit OK / `npm run build` OK。



- 2026-06-20 追加監査: OpenCode が古い `coolify.appexx.me` を参照する原因は、OpenCode 本体の共通ルール未読込ではなく、dotfiles SSOT 配下の MCP/API registry・運用 runbook・同期対象漏れに古い Coolify/DigitalOcean 情報が残っていたこと。正本は `https://coolify.paradigmjp.com`、Hetzner は `paradigm-prod-01` / server id `142222420` / `178.105.138.55`。
- dotfiles 側で `sync.sh pull` に OpenCode global config 配布を追加し、macOS LaunchAgent `com.paradigm.agent-context-sync` を導入。dotfiles SSOT の AGENTS/CLAUDE/MCP/OpenCode/AI rules 変更はローカル Claude/Codex/OpenCode/Cline/Cursor/Windsurf/Antigravity へ自動反映される。
- Coolify API key / Hetzner API key は Keychain と reference memory に保存済み。API 実値は Task.md に書かない。デプロイコードは `scripts/lib/coolify-env.mjs` で env → reference memory → `~/.claude/mcp.json` → macOS Keychain の順に解決し、default URL は `https://coolify.paradigmjp.com`。
- 524 頻発時の実測: Hetzner metrics で CPU が約 795%・read IOPS 約 26k まで張り付き、SSH banner timeout / Cloudflare 524 / Coolify timeout が同時発生。Hetzner API reset 後、Coolify API・本番 `/api/ready`・`/ja` は HTTP 200 に復旧。
- 恒久対策追加: deploy 前フックが Hetzner CPU を Keychain 経由で確認し、過負荷時は deploy を止める。サイト全体で cron / 定期実行 / 常駐 polling は廃止し、同期・監視・ジョブ起動は webhook / queue / DB event / systemd.path / launchd WatchPaths / ユーザー操作のイベント駆動へ統一。ホストガード script は deploy/recovery event から one-shot 実行する方式に変更し、legacy cron/timer を削除する。大量リストの batch 作成はインライン解析・即時 Twenty 逐次同期を外し、既存 enrichment queue に寄せて HTTP リクエストを長時間占有しない。
- 2026-06-20 追加の cron 廃止実装: Next `instrumentation.ts` から常駐 sales watchdog 起動を削除。`sales-pipeline-watchdog` / `enrichment-worker` は timer loop ではなく webhook/API 起点の one-shot drain に変更。`/api/sales/pipeline/events` は DB polling をやめ Supabase Realtime channel に変更。host disk guard / Twenty sync installer は systemd timer を作らず legacy timer を削除する one-shot service/script へ変更。`pg_cron` 復元 migration は cron 再作成ではなく legacy job disable に変更。
- Verification: `bash -n sync.sh scripts/audit-api-keys.sh opencode-telegram/scripts/entrypoint.sh scripts/agent-context-sync/agent-context-sync.sh`、`node -c claude/hooks/pre-coolify-deploy-load-check.js`、`bash sync.sh pull`、`npm test -- src/lib/sales/enrich.test.ts src/lib/sales/twenty-sync.test.ts`、`npm exec -- tsc --noEmit --pretty false`、`git diff --check` が通過。PR #24 merge 後、Coolify deployment `h1405vdaebfuklh1arm6m59q` は `finished`。本番 `https://paradigmjp.com/api/ready` / `/ja` / `https://coolify.paradigmjp.com/login` は 200。
- Root-cause方向: Cloudflare 524 は Cloudflare が origin に接続できた後、origin が読み取りタイムアウト内に応答できない状態。公開ページが Payload/CMS 読み込みや `/` healthcheck に巻き込まれると、DB/Pooler遅延時に origin 全体が詰まりやすい。
- 公開サイトの恒久対策として、`withPayloadReadFallback` を `PAYLOAD_PUBLIC_READS_ENABLED=1` の明示 opt-in に変更。デフォルトでは Settings/Header/Footer/Home/Services/Pricing/Works/FAQ/Blog の公開 Payload 読み込みを開始せず、静的/ローカル fallback を即返す。
- `/ja` `/services` `/works` `/blog` `/faq` のトップレベル `getPayload` / `@payload-config` import を遅延 import に変更し、CMS opt-in 時以外は Payload 初期化を起動しない。`/pricing` は国判定 headers を使うため dynamic のまま、Payload import だけ遅延化。
- Docker healthcheck を DB/CMS 非依存の `/api/ready` に切り替え。公開トップページや Payload が重くてもコンテナ readiness が巻き添えにならないようにした。
- 検証: `npm test -- src/lib/payload-availability.test.ts src/lib/settings.test.ts`、`npm exec -- tsc --noEmit --pretty false`、`npm run quality:guard`、`npm audit --audit-level=high`、`npm run build` が通過。ローカル production server で `/api/ready` `/ja` `/ja/services` `/ja/pricing` が HTTP 200 / 0.3s 未満で応答。

## CURRENT STATUS - 2026-06-20 RevenueOS/Twenty list collection deep audit hardening

- Audited the Twenty blank-column issue beyond the visible screenshot symptoms: missing/optional CRM metadata was being silently removed during writeback, normalized enrichment columns were not consistently read by karte/coverage/report generation, report-phase coverage used stale company data, Twenty pull was capped to a single page, and the manual sync API only processed three records by default.
- Added a shared company data view so `pain_diagnosis`, `dify_result`, `tech_stack`, `japan_market_audit`, `demo_site`, `visual_evidence`, and form URL discovery are read from normalized columns and legacy `meta` consistently.
- Mirrored diagnosis/report enrichment back into `meta`, refreshed company rows before final source coverage persistence, and marked reports generated so Twenty receives fresh report/form/data-source state.
- Hardened Twenty CRM metadata/writeback: required operational fields now fail loudly if missing instead of being dropped; URL fields are created as LINKS, select/text fields are typed correctly, ZA/GB/CA/AU/IN/SG country options are seeded, and Source Coverage/Data Sources/Data Status/Next Action/Last Error are pinned near the front of the CRM view.
- Scaled Twenty intake/sync for large lists: pull now pages up to 10,000 records with cursor duplicate detection to avoid infinite loops, and `/api/sales/twenty-sync` now supports 60-record batches with `next_cursor_created_at` continuation for thousands of writebacks.
- 整理: the existing public-site/load-timeout workspace changes are kept separate from the Twenty hardening changes where possible; local-only `opencode.json` is ignored because it contains machine-specific absolute paths.
- Verification so far: targeted Vitest for Twenty pull, source coverage, and company karte passed; `npm exec -- tsc --noEmit --pretty false` passed.

## CURRENT STATUS - 2026-06-20 RevenueOS/Twenty load timeout mitigation

- Fixed RevenueOS initial load so `/[locale]/admin/sales` no longer waits for every secondary dashboard dataset before rendering. `getSalesDashboardData()` now wraps expensive Supabase/dashboard reads with a soft fallback timeout (`SALES_DASHBOARD_QUERY_TIMEOUT_MS`, default 2200ms) and returns a degraded dashboard with visible warnings instead of hanging into a 1-minute timeout.
- Reduced initial dashboard payload pressure by lowering non-critical list limits for enrichment jobs, source runs, batches, browser-search runs, Japan-readiness insights, pipeline runs, and video jobs.
- Stopped the client dashboard shell from immediately re-fetching the same heavy dashboard after receiving server `initialData`; the query key now includes locale and passes `report_locale` to `/api/sales/dashboard`.
- Added network timeouts to Sales Supabase fetches (`SALES_SUPABASE_FETCH_TIMEOUT_MS`, default 12000ms) including the direct PostgREST rewrite path.
- Added a Twenty API request timeout (`TWENTY_FETCH_TIMEOUT_MS`, default 8000ms) so Twenty pull/sync fails fast when Twenty is unreachable instead of tying up the request.
- Local degraded-path verification: with unreachable Supabase and `SALES_DASHBOARD_QUERY_TIMEOUT_MS=700`, `/api/sales/dashboard?report_locale=ja` returned HTTP 200 in 1.46s with `status=degraded` and fallback warnings. With unreachable Twenty and `TWENTY_FETCH_TIMEOUT_MS=1000`, `/api/sales/twenty/pull` returned HTTP 502 in 1.05s instead of hanging.
- Verification: `npm exec -- tsc --noEmit --pretty false` and `npm run build` passed.

## CURRENT STATUS - 2026-06-19 Site-wide dynamic delivery quality reset

- Reworked the public site from a static-looking animated shell into a dynamic, CMS-first business site: `/[locale]`, about, services, service details, pricing, works, contact, legal/privacy, LP, agency, and video routes are now dynamic-rendered where applicable.
- Replaced the over-animated shared inner-page hero and MagicUI-heavy CTA with restrained editorial components inspired by premium Japanese theme-site information architecture, without copying external assets/design.
- Toned down global Aurora/glass/glow styling so legacy `paradigm-glass` pages render as solid 8px business cards with low-motion shadows and no negative display letter spacing.
- Added CMS-empty fallback content for services, pricing, and works from existing `src/lib/data.ts`, so a fresh/empty DB still shows delivery-ready content while live Payload data remains the priority.
- Hid Dify chatbot across public marketing pages and kept conversion focused on contact/consultation CTAs.
- Fixed the dynamic-site Timeout risk by bounding public Payload/CMS reads with a short fail-soft fallback (`PAYLOAD_PUBLIC_READ_TIMEOUT_MS`, default 1200ms) plus a lightweight DB TCP probe before Payload initialization. Settings/Header/Footer, homepage, services, pricing, works, FAQ, blog list, and blog detail no longer hold the whole page open when Payload DB is slow or unavailable.
- DB-down verification: with `DATABASE_URI=postgresql://payload:payload@127.0.0.1:1/payload`, `/ja` returned 200 in 245ms and `/ja/services`, `/ja/pricing`, `/ja/works`, `/ja/blog` returned 200 in 16-25ms. Server logs no longer emit Payload connection stack traces or notification noise for public fallback reads; Playwright confirmed `/ja/services` and `/ja/pricing` render visible fallback content with `overflowX=0`.
- Verification: `tsc --noEmit`, `git diff --check`, `npm audit --audit-level=high`, `npm run quality:guard` (0 errors), targeted Vitest suite (29/29), `npm run build`, and Chrome screenshots for `/ja/services`, `/ja/pricing`, `/ja/works`, `/ja/contact` desktop/mobile all passed with `overflowX=0`, `chatbotButtons=0`, `consoleErrors=[]`, and no empty CMS text.

## CURRENT STATUS - 2026-06-19 RevenueOS audit hardening

- Fixed mojibake in RevenueOS outreach DB bell / Slack notification copy for CAPTCHA handling, first-5 approval, and form submission completion.
- Split Twenty sync helper responsibilities so RevenueOS quality guard no longer blocks on 500+ line Twenty files.
- Root TypeScript pre-check now excludes the separate `astro-demo` app from the Next.js tsconfig boundary.
- Pinned vulnerable transitive `hono` and `undici` versions through npm overrides and regenerated `package-lock.json`.
- Added a build-time-only Payload placeholder secret in `scripts/build-next.mjs` so disabled Payload reads do not fail page-data collection when local envs are absent.
- Repaired the mojibake handoff entry below so future agents can read the latest RevenueOS data collection status.

## CURRENT STATUS - 2026-06-19 Site quality reset

- Replaced the over-animated Aurora/MagicUI homepage with a restrained Revenue OS homepage for Japanese and English routes.
- Reduced global glow/mesh intensity and removed negative display letter spacing from the shared typography primitive.
- Hid the Dify chatbot on locale home routes and changed cookie consent from a full-width bottom bar to a smaller floating notice.
- Verification in progress: TypeScript, targeted tests, quality guard, build, and Chrome screenshots for `/ja` and `/en`.

## CURRENT STATUS - 2026-06-19 Astro demo full-stack HP delivery quality

- Replaced the generated demo renderer for `/{slug}` and `/demo/{slug}/{section}` with a delivery-quality full-site renderer instead of redirecting to broken static-looking lower pages.
- Added full-site data generation for home, services, pricing, cases, FAQ, about, blog, contact, privacy, terms, and tokushoho pages.
- Added industry-specific service/case/pricing copy for restaurant, construction, clinic, beauty, retail, advisory, and local-service archetypes.
- Added an Astro server API endpoint at `/api/inquiries` so contact forms POST through the demo app and emit tracking to `paradigmjp.com/api/track`.
- Repaired premium demo Japanese copy and kept industry-specific visual assets/colors.
- Local verification: `npm run build` in `astro-demo` passed; Playwright checked home/services/contact/pricing/FAQ for HTTP rendering, no mojibake, no horizontal overflow; contact form returned success.
- Production deploy: pushed `4786628` and `b73d835`, rebuilt `astro-demo:latest` on `paradigm-prod-01`, and restarted the `astro-demo` container.
- Public verification: `/demo/sample-restaurant`, `/services`, `/contact`, `/pricing`, `/faq`, and `/sample-restaurant` all returned clean Japanese, no mojibake, no desktop overflow; contact form returned success; mobile services page has no horizontal overflow.
- Screenshot evidence: `%TEMP%\\astro-demo-fullsite-contact.png`, `%TEMP%\\astro-demo-prod-fullsite-contact-final.png`, `%TEMP%\\astro-demo-prod-fullsite-mobile-final.png`.

## CURRENT STATUS - 2026-06-19 RevenueOS Twenty country/template routing repair

- Fixed Twenty -> Supabase intake so foreign ccTLDs such as `.co.za` infer the correct target country instead of falling back to `JP/ja`.
- Fixed `salesScopeFromCountry` so English-locale countries keep their own ISO target country (`ZA`, `CA`, etc.) instead of becoming `US`.
- Fixed company upsert to persist `report_locale`, `target_country`, and `template_variant` columns, not only `meta.routing`.
- Fixed Twenty writeback to send country/region/industry/source/status plus visible `Source Coverage` and `Data Sources` counts.
- CRM metadata normalization now pins important Twenty columns near the front: Name, Domain, country, Source Coverage, Data Sources, Data Status.
- Repair-routing now corrects already-bad foreign records that were saved as `JP/ja/website_diagnostic`.
- Verification: `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `npm test -- src/lib/sales/routing.test.ts src/lib/sales/locale-scope.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/source-coverage.test.ts`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 RevenueOS outreach quality gate

- Implemented shared outreach readiness gate for RevenueOS/Twenty/outreach worker.
- No diagnostic report URL now blocks outreach instead of falling back to `https://paradigmjp.com`.
- RevenueOS CRM tab now shows an operational queue: send-ready / review-required / blocked.
- Twenty company karte summary now includes `Outreach quality gate` and `Next action`.
- Verification: `npm test -- src/lib/sales/outreach/readiness.test.ts src/lib/sales/form-message.test.ts` and `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`.
## CURRENT STATUS - 2026-06-18 RevenueOS Twenty data collection GUI/retry

- Twenty Companies上でRevenueOS取得データを確認できるよう、`Data Status` / `Data Sources` / `Next Action` / `Last Error` をCRM表示順とTwenty metadata DB反映対象に追加。
- enrichment結果のsource名を統一し、Wappalyzer / SSL Labs / form discovery / Cloudflare Radar / Mozilla Observatory / Stagehandなどの取得結果と失敗理由がmetaへ正しく残るよう修正。
- source_qualityの失敗・timeoutをSource Coverageの`error`として可視化し、Twenty同期時にも最終エラーを反映。
- Twentyからのpullは不正なreport/form URLを信用せず、低カバレッジ・古いデータ・source error・未生成artifactを検出した場合は再取得/診断レポート生成キューへ戻す。
- Verification: `npm test -- src/lib/sales/source-coverage.test.ts src/lib/sales/twenty-sync.test.ts src/lib/sales/enrich.test.ts src/lib/sales/external-studio-sync.test.ts`; `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`; `git diff --check`.

## CURRENT STATUS - 2026-06-18 RevenueOS production recovery

- Production RevenueOS deployed at `5fba242` and `/ja/admin/sales` returns HTTP 200.
- `/api/sales/health` is healthy for Supabase OSS, Payload DB pool, FlareSolverr, Dify, Trigger.dev, Crawl4AI, Stagehand, Steel, Crawlee worker, and Outreach worker.
- Coolify env routing repaired: Sales Supabase uses direct PostgREST compatibility, Crawl4AI/Steel use the live Docker service names.
- Twenty writeback verified on production: `synced=3`, `failed=0`, `rateLimited=false`, enforced limit `3`.
- Visual screenshot evidence verified on production: Figma screenshot saved to R2 through `outreach_worker`, and `sales_companies.meta.visual_evidence.screenshots.desktop` plus `visual_evidence` column were updated.
- Applied/repaired `sales_atomic_screenshot_append` on OSS Supabase and fixed the migration SQL so future restores keep the same behavior.
- Remaining non-blocking health note: optional envs for some paid/manual sources are still missing (`DIFY_DIAGNOSIS_API_KEY`, `DIFY_FORM_MESSAGE_API_KEY`, `NOTION_API_KEY`, `GBIZ_API_TOKEN`, `GOOGLE_PSI_API_KEY`, `HUNTER_API_KEY`). Core pipeline is green; those sources remain optional until keys are supplied.

## CURRENT STATUS - 2026-06-19 Astro demo production recovery

- `https://demo.paradigmjp.com/` restored through Traefik and returns HTTP 200.
- Fixed Astro compatibility routes for generated links:
  - `/demo/{slug}` and `/demo/{slug}/{section}` now redirect to the existing canonical demo/company section pages.
  - `/{lang}/{industry}/{appeal}` now redirects to `/demo?lang=...&industry=...&appeal=...`.
- Rebuilt and restarted the `astro-demo` production container with the new routes.
- Fixed the persistent Traefik file-provider service target for `astrodemo-svc` from `http://172.17.0.1:4321` to `http://astro-demo:4321`; backup saved on host as `/data/coolify/proxy/dynamic/paradigmjp.yml.bak-20260618T221703Z-astrodemo`.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - Container routing: 64/64 industry demo URLs returned 200 after redirects.
  - Public routing: 64/64 `https://demo.paradigmjp.com/{ja,en}/{industry}/{appeal}` URLs returned 200 after redirects.
  - Public sample routes passed: `/`, `/ja/accounting/brand`, `/en/restaurant/sales`, `/demo/astrowind-demo/services`.

## CURRENT STATUS - 2026-06-19 Astro demo visual CSS recovery

- Fixed `/demo` visual breakage caused by React-style `className` attributes in an Astro page. The public HTML now emits `class=` and `className=0`.
- Fixed `DemoLayout` theme variables so `--brand`, `--brand-dark`, and `--brand-light` render actual color values instead of `{accentColor}` literals.
- Added the missing dark page base (`bg-[#050510] text-white`) so white text and glass panels render correctly.
- Rebuilt and restarted the production `astro-demo` container.
- Verification:
  - `npm run build` in `astro-demo`: passed.
  - `https://demo.paradigmjp.com/demo`: HTTP 200.
  - Public HTML checks: `className=0`, `accentLiteral=0`, `--brand: #7c3aed`.
  - Chrome headless screenshot saved at `C:\Users\apple\AppData\Local\Temp\demo-paradigmjp-demo-fixed.png` and visually checked.
## CURRENT STATUS - 2026-07-14 フォーム適格リスト量産→Twenty同期（本番稼働 / 品質強化中 / 送信0）

### 2026-07-14 Form-qualified lead factory
- 候補取得後すぐに`SalesCompany`へ昇格して重い診断・レポート・文面生成を起動していた順序を変更。生候補は候補倉庫に保持し、技術・国・機会スコア・SMBスコア・実フォームを確認した企業だけを`SalesCompany`へ昇格し、TwentyのCompany homeのみ同期する。Opportunity作成、診断、Opportunity Brief、初回文面、フォーム送信は起動しない。
- フォーム判定へ`verification=form|page|fallback|none`を追加。連絡先ページの存在だけでは合格せず、HTMLの`<form>`または既知フォームプロバイダ署名を確認し、既定信頼度80以上だけを合格にする。最初のcontact pageにフォームがなくても、sitemap / Crawl4AI / common path / SPA経路を最後まで探索する。量産ゲートではDeepSeek判定を無効化し、トークン消費0。
- SMB専用ゲートとして`min_smb_score`を独立保存し、Adobe Experience Manager / Sitecore / SAP Commerce / Salesforce Commerce Cloud / Oracle Commerce / Hybris / Workday等の明白なenterprise stack、または15種以上の過大stackをSMBレーンから除外する。総合機会スコアだけでは昇格しない。
- DB migration `20260714143000_form_qualified_lead_factory.sql`で、run/itemへフォーム確認、合否理由、Twenty同期、SMB閾値、集計カウンタを追加。RLS済み既存2テーブルを拡張し、制約・索引・service_role運用を維持。正式release scriptと`run-migrations.sh`へ接続した。
- 認可済みAPI `/api/sales/lead-candidates/factory`で最大20か国を一括投入可能。国別ラン最大2本、ラン内確認最大8並列のone-shot/event-driven処理で、常駐polling/cronは追加しない。Realtime SSEでrun更新を管理画面へ反映する。
- 管理画面 `/ja/admin/lead-factory` を追加。主要対象国初期値US/GB/CA/AU/DE/FR/NL/SG/AE、候補数・確認数・最低機会スコア・最低SMBスコア・フォーム信頼度・技術を指定でき、フォーム確認/合格/昇格/Twenty同期/エラー、直近100件の個別判定を表示する。loading/empty/error/degraded realtime状態を実装。
- ローカル検証: 関連Vitest **4 files / 15 tests pass**、TypeScript pass、対象ESLint pass、quality guard **0 errors / 59既存warnings + 今回warning 0**、production build **408/408 pages**、`git diff --check` pass。実ブラウザで未認証時の`/admin/login`保護遷移、ローカル検証用署名session後の管理画面表示、主要入力10要素、error overlay 0、PC 1280px / mobile 390px横溢れ0を確認。ローカルは本番DBを接続せず一覧APIの実データ表示は本番反映後に確認する。外部送信、候補収集、Twenty本番同期、DeepSeek実行は行っていない。
- 初回本番非送信パイロットで、実DBの候補テーブルが旧版から先に存在したため、`CREATE TABLE IF NOT EXISTS`ではdomain/run item/tech detection/scoreの一意arbitrerが追加されず、upsertがfail-closed停止することを検出。run表の`error_message`不足も同時に検出した。候補0・重複0・Twenty追加0・送信0を確認してから、schema reconcile migrationで4つの一意indexと失敗理由列を追加し、PostgREST schema reloadを接続した。
- PR #164 / main `90b2cebc`を正式releaseし、Coolify deployment `qppmquk6dmvwxszkh7rvxhrg`が完走。DB 83/83、Sales health JSON `ok:true`、Realtime、Twenty worker restart 0、常駐polling/cron 0、公開smokeを通過。本番DBで`error_message`列と4 unique indexの存在を直接確認した。
- schema修正後の本番非送信run `3500fd9e-01cb-420a-b3e1-dc1a81ea04e5`は、US/Shopify・候補20・確認5で`completed`。候補20、確認5、スコア保存5、失敗0、フォーム合格0、昇格0、Twenty同期0、enrichment job 0。contact pageのみの候補を`contact_page_only`として不合格にし、誤ってCRMへ入れないfail-closed動作を確認した。
- 同runで、HTTP Archive BigQuery credential未設定時にTranco `.us`へ偏り、Shopify一致0になる母集団品質課題を実測。既存の自己ホストFlareSolverr/ブラウザ検索を候補倉庫の前段へ追加し、Shopify store subdomain検索等の技術フットプリント×対象国主要都市で最大6検索・2並列取得する。検索結果は直接`SalesCompany`へ入れず、従来どおり技術・SMB・実フォームの全ゲート通過後だけTwentyへ同期する。CA/NL/AEの都市辞書も対象市場へ追加。DeepSeekトークンと有料データAPIは使用しない。
- 品質強化後の関連Vitestは **6 files / 21 tests pass**、TypeScript / 対象ESLint pass。正式再releaseと技術フットプリント経路の本番再パイロットを続行する。
- browser footprint初回run `a61afeca-e353-40f3-826c-240e7b7d154c`は候補20・確認10・実フォーム4・失敗0まで改善したが、検索語`cdn.shopify.com`が技術解説/監視サイトを拾いShopify一致0。全件をゲートで遮断しTwenty追加0・送信0を維持した。実検索でstore subdomainが返る`site:myshopify.com`へ置換し、候補配列は技術特化sourceの挿入順を維持してgeneric TLD fallbackより先に確認するよう修正した。
- store subdomain版run `68d6a109-591b-428b-95c1-fdad3ed722dc`は技術特化候補8件を先行取得し、候補20・確認10・実フォーム6・失敗0。既存HTML検出だけでは`*.myshopify.com`をShopify確定証拠として扱わず、本文の住所/通貨/電話も国判定へ渡していなかったため、Shopify一致0・Twenty追加0でfail-closed停止した。既存CNAME/hosted-platform規則をdomain hostnameにも適用し、ページ本文からscript/styleを除いた最大50KBだけを国の客観証拠へ使用する。US主要都市を拡張し、対象市場NL/SG/AEのTLD・電話・通貨・住所規則も追加した。
- hosted Shopify + US住所/通貨 + 実フォーム条件が既定68点以上になる回帰テストを追加。関連 **9 files / 37 tests pass**、TypeScript / 対象ESLint / production build 408/408 pass。
## CURRENT STATUS - 2026-07-14 /ja国内Web制作サイト刷新（本番反映・公開QA済み）

### 2026-07-14 /ja Web production repositioning
- `/ja` のCMSホームシードと安全なフォールバックを、Japan Entryではなく国内向けWeb制作へ刷新。企業サイト・採用サイト・LP・既存サイトリニューアル、CMS、SEO/GEO基盤、保守・改善を30万円〜の料金目安とともに掲載し、4工程（ヒアリング、情報設計、デザイン・実装、公開・引き継ぎ）を可視化した。
- `/ja` のトップ、料金、サービス、FAQ、会社概要、問い合わせ、チャットボット、運用イメージの文面を国内Web制作に統一。`/ja/contact?intent=japan-entry` の旧クエリでも国際Japan Entryへ戻らないようにし、英語版の固定オファーは変更していない。
- 検証済み: 全locale JSON parse、`npm exec -- tsc --noEmit`、対象ESLint、関連Vitest **1 file / 13 tests pass**、`npm run quality:guard`（0 errors / 60 warnings）、`git diff --check`。
- PR #172をmainへmergeし、正式`npm run release:prod`を完走。deployment queue `hh3rwblu17iqkze2sb2ljwvt`、DB **83/83**、Japanese/English homepage CMS publish、English blog 12件、Traefik / Cloudflare / Realtime / Twenty worker restart 0、Sales health HTTP 200 JSON `ok:true`、公開smokeまで全gate pass。
- 実Chrome公開QA: `/ja`（国内Web制作ヒーロー、30万円〜、画像3点、横溢れ0、Package導線なし）、`/ja/pricing`（¥300,000 / ¥600,000 / ¥1,000,000）、`/ja/services`、`/ja/faq`、`/ja/blog`、`/ja/contact?intent=japan-entry`（旧クエリでも国内フォーム）を確認。JAページ内に`Japan Entry` / `$12,000` / `$0/month`の混入なし。
- 最終US/Shopify pilot run `993f3fbb-c464-4655-b72a-03de7da5fef8`は、候補20・確認10・Shopify一致10・実フォーム8・適格/昇格7・Twenty同期7・失敗0。7社すべてでTwenty company IDを保存し、フォームURLと機会スコア75を保持した。enrichment job 0、outreach run 0、artifact 0、diagnosis 0を確認した。
- ただし`SalesCompany` insert後、既存DB triggerがlist-only企業にも空のevent-driven pipelineを6本（48 queued steps）作成したため、即時に全run/stepを`cancelled`へ変更。送信・文面・レポート生成前であり外部送信0を維持した。promotion metaへ`skip_enrichment=true` / `list_only=true`を固定し、DB trigger側も`source=multi_source_domains`を二重に除外する。Twenty company同期だけを許可する。

## CURRENT STATUS - 2026-07-14 Japan Entry候補リスト量産（旧レポート経路分離・本番完了）

- list-only企業の二重ガードを本番反映。DB insert triggerは`source=multi_source_domains`または`meta.skip_enrichment=true`を除外し、Twenty pullも`list_only/skip_enrichment`企業のpipeline生成を拒否する。PR #168 / #171 / #173 / #176をmainへmergeし、最終deployment `uwgurtnm1vxqqmlokdh8e828`の正式`release:prod`がDB 83/83、quality guard 0 errors、Sales health JSON `ok:true`、Twenty HTTP 200、Twenty worker restart 0、公開smokeを含め全gate pass。
- スクリーンショット監査で、旧`upsertCompanyByDomain`が未生成レポートURLを先に作り、`syncCompanyKarteToTwenty`がlist-only追加にも「診断レポートURL」「カルテ生成中 / 未対応」「取得ステータス」を流用していたことを確認。list-only専用`syncListLeadToTwenty`へ分離し、promotionでは`generate_report_url=false` / `pipeline_status=pending`を固定。Twenty pullから旧report/statusが戻る経路も遮断した。
- Twenty 2.14現行schemaへCRM metadata SQLを更新し、廃止済み`fieldMetadata.isCustom`依存を削除。Companies table viewを`Japan Entry 候補`へ変更し、表示列をName / Domain / 国 / 候補ステータス / 技術 / 機会スコア / SMBスコア / 収集経路 / 確認済みフォームに限定。旧レポート・商談・取得・資料・デモ列は候補一覧から非表示。
- TwentyのSELECT optionはapplication manifestが起動時に復元するため、新規`oss_form_factory`値を使わず既存互換値`codex_verification`を採用し、候補根拠本文で`OSSフォーム適格収集`を明示。最初のUS/CA cleanup runは不正enumを7件fail-closed停止し、Opportunity / report / message / send 0を維持してから修正した。
- 旧値を持っていた既存候補と再試行で確認された候補を含む13社を本番クリーンアップ。Supabaseは13/13で`report_url=null`、`pipeline_status=pending`、`list_only=true`、`skip_enrichment=true`。Twentyも13/13で確認済みフォーム、国、Shopify、機会スコア75、SMBスコア58、`フォーム確認済み / Twenty登録済み / 未送信`を保持し、旧report URL 0、旧sales status 0。
- 最終非送信pilot run `b02dbf4d-5a3e-4565-a224-e70cfb69e84f`（US/Shopify）は候補20・確認10・実フォーム合格7・昇格7・Twenty同期7・失敗0。開始後のpipeline run 0、pipeline step 0、enrichment job 0、artifact 0、diagnosis 0、outreach run 0、report URL 0をDBで確認した。
- ローカル回帰検証はlist-only/Twenty関連Vitest 5 files / 16 testsと最終互換修正3 files / 12 tests、TypeScript、対象ESLint、`git diff --check`がpass。レポート/Opportunity Brief生成と動画機能は削除せず、興味返信後の価値提供フェーズ専用として初回候補リスト経路から切り離す。
- 実務Wave 1をUS/GB/AU/CA/SG/AE × Shopifyで実行。無料passive corpusから5,744候補を取得し、720件を実確認、実フォーム合格267件、適格昇格28件、Twenty同期28件、外部送信0件、文面生成0件。Twenty REST再照合は28/28 HTTP 200、国28/28、確認済みフォーム28/28、`未送信`ステータス28/28。国別同期はAE 3 / AU 7 / CA 6 / GB 5 / SG 7 / US 0。
- Wave 1のUS/AEで、in-memory fallback runnerがheartbeat停止後も`alreadyRunning`を保持する停滞を実測。既存の認可済み同期process APIで残件を補完し、全6 runをactive 0まで完了させた。恒久対応として一覧API/Realtimeへ`heartbeat_at`を追加し、共通5分停滞判定、管理画面の`停滞runを再開`/`復旧を続行`操作、24件×最大10バッチの有界同期復旧を実装。復旧は残り候補だけを処理し、文面・レポート・フォーム送信を起動しない。
- 停滞復旧のローカル検証はVitest 4 files / 9 tests、TypeScript、対象ESLint、`git diff --check`がpass。正式releaseと本番管理画面の公開確認を続行する。
## CURRENT STATUS - 2026-07-15 検証済み候補在庫の本番収集開始（33 source / 外部送信0）

### 本番運用
- 40件の国別source packを本番DBへdraft登録し、WikidataはCC0、European Commission CORDISはCC BY 4.0再利用条件を確認した。非保存previewはCORDIS 30/30とWikidata 3/10が合格し、この33件だけを承認・有効化した。Wikidata 7件は公開query endpointの502/timeoutで未承認のまま隔離した。
- 非送信inventory run `15849730-69c7-47f4-81ab-200cce4d94a2`は33/33 sourceを処理して`partial`完了。3,248件取込、2,319件サイト事前検査合格、648件retryable、281件rejected。唯一のsource失敗はWikidata英国packの公開endpoint timeoutで、CORDIS 30 packは完走した。DB制約どおりsend_count 0 / twenty_sync_count 0。
- source横断の重複排除では初回eligibleは1,700 unique domain。品質基準を緩めずretryable 648件を1回だけ再検査し、29/29 source・API失敗0で完了した。最終は2,334 eligible record / 1,711 unique domain、632 retryable record / 496 unique domain。source世代間の重複を除いたため「高品質な2,000 unique企業完成」とは扱わない。
- 起動時、`sales_lead_operator_events.run_id`が旧candidate run専用FKであるのにinventory run IDを渡して監査保存が500になる不整合を検出した。runnerはresume処理の先頭で開始できたため同じrun IDで実収集を継続し、送信系には接続していない。

### 修正・検証
- inventoryのstart / resume / completion監査はcandidate-run FK列を使わず、汎用の`entity_type=run / entity_id=inventory run ID`だけで保存するよう修正した。startとresumeの回帰テストは監査payloadに`runId`が存在しないことを検証する。
- 対象Vitest 2 files / 7 tests、全Vitest 161 files / 741 tests、TypeScript、対象ESLint、quality guard 0 errors / 60 existing warnings、production build 408/408 pages、`git diff --check`がpass。
- PR **#237** / main **7fc9bf22** / deployment **qwe4md5606d5h3qlzeh2vasd**。正式releaseでDB 88/88とdeployment finishedを確認。直後の複数公開fetchが一時失敗したため同じdeployを再実行せず個別診断し、Ready / Twenty / 診断レポートHTTP 200を確認後にpost-deploy gateだけを再実行してSales health JSON `ok:true`を含む全項目pass。修正版resume APIはHTTP 202を返し、同じrun IDを新コンテナで再開・完走した。
- 本番監査DBに`verified_inventory_resumed`と`verified_inventory_partial`が各1件保存され、candidate-run FKを使わない修正が実データで成立した。最終run行も33/33、send_count 0、twenty_sync_count 0を維持する。
## CURRENT STATUS - 2026-07-15 ポータル候補をTwentyへ先行登録する実務導線（本番反映・公開確認済み / 外部送信0）

### 実装内容
- Houzz・エキテン・ジモティーの候補を、DEMO生成前にTwentyへ「リスト-only / 要確認 / 未送信」として登録するAPIと管理UIを追加。DEMO、文面生成、フォーム送信、メール送信はこの操作から起動しない。
- 一括登録は明示選択した最大50件、Twenty API同時4件に固定。企業ごとにSupabaseの`portal_twenty_sync`へ同期状態・Twenty ID・最終エラーを保存し、再実行は既存成功を再利用、失敗企業だけ再試行する。
- Twentyへupsert後にlive read-backを行い、企業名・ソース・掲載ページ・未送信ステータス・カルテ・旧DEMO/レポート/営業資料URL空状態が一致しない場合は成功扱いにしない。既存のDEMO投入済み候補はTwentyリスト同期対象から除外する。
- 一覧APIは50件ページングとoffsetに対応し、数千件を単一レスポンス・単一リクエストへ詰め込まない。候補IDを明示したAPIでsource混在・不明IDを拒否する。

### Verification / remaining gate
- 対象Vitest **3 files / 7 tests**、TypeScript、対象ESLint、production buildがpass。PR **#250**をmainへマージし、deployment **z3eh9qes2pgz5cg3ifa7e8e3**はfinished。正式`npm run release:prod`はDB **88/88**、Quality Guard **0 errors / 61 existing warnings**、Twenty HTTP 200、Twenty worker restart 0、Realtime / Traefik / Cloudflare origin lock / public smoke / Sales health JSON `ok:true`までpass。
- 本番`/ja/admin/demo-assets`のchunkにTwenty登録UIと`portal-candidates/twenty-sync`を確認。Ekiten APIはHTTP 200、50件ページング、`sendingEnabled=false`。現時点の候補は1件（`ノン美容室`、既に`promoted`）のみで、既存DEMOを上書きしないため新規Twentyリスト同期は未実行。次の実務入力は通常ブラウザで確認した候補スナップショットの追加。
