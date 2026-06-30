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
- 営業OS outreachパイプライン堅牢化：6箇所修正で数千件連続処理の耐障害性を確保
  - `orchestrator.ts`: processOne try/catch分離 + 1件120sタイムアウト
  - `worker/browser.ts`: context 90sタイムアウト + 50context毎ブラウザ再起動(OOM防止)
  - `activity.ts`: recentlyContacted がDBエラー時 true を返す（二重送信防止）
  - `side-effects.ts`: logActivity→applyOutcome の順序修正（状態不整合防止）
  - 全修正ゼロコスト（新規有料API/プロキシ/サーバー増強なし）
  - 起動トリガー不変（API/webhookイベント駆動・cron/polling不使用）

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
