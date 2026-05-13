# Task.md — paradigmjpcom (multi-agent edition)

> 永久ルール **TASK / TASK-CLEAN / ANTI-BLOAT / TEAM-DEV** 準拠 (Global CLAUDE.md).
> セッション開始時に必ず読む → 進行中/未着手 を把握してから動く.
>
> **🛡️ TEAM-DEV 協業プロトコル** (Claude Code/Codex/Cline/Cursor/Aider/human が並列開発):
> 1. 着手前に必ず `git pull --rebase` で最新化
> 2. 該当 task の **Owner** を自分の名前 + **Lock-since** に時刻 → 即 `commit + push` (atomic lock)
> 3. 4h+ 無 update の lock は **stale** 扱い → 他 agent override 可
> 4. 1 task = 1 feature branch (`agent/{owner}/{slug}`)
> 5. 完了 → Status=✅ DONE / Owner=- / Notes に commit hash → push (lock 解放)
> 詳細 → `~/.claude/knowledge/team-dev-protocol.md`

---

## 🔄 進行中 (multi-agent ロック付き)

| Status | Owner | Lock-since | Branch | Task | Notes |
|--------|-------|-----------|--------|------|-------|
| 🟢 ACTIVE | claude-code | 2026-05-13 | main | **Sprint 8: Notion × Supabase ハブ整備** | sales_* schema (5 table) + lib/notion.ts + n8n 3 workflow skeleton + .env.example |
| 🛑 DECISION | - | 2026-05-13 | - | **🗄️ 旧営業 OS 撤廃確定 (unarchive 計画なし)** | Sprint 5-7 で _archive_* 化済の旧 proposal/MVP/sales-automation/persona/authentik は **永久に再起動しない** ことを宣言。新営業 OS は sales_* schema を真のソースとし、旧 mvp_* や cms_content_blocks (B36 既存 report 永続データ) は **read だけはする** が write しない |

---

## 📋 未着手 (Multi-agent 取り合い可)

| Priority | Status | Owner | Task | 工数 | Branch (推奨) |
|----------|--------|-------|------|------|---------------|
| P1 | 🟡 BLOCKED | - | **診断レポート ゼロから再構築** — ユーザー壁打ち承認後着手 (旧 stack archive 済) | TBD | `agent/{X}/report-rebuild` |
| P2 | ⚪ AVAILABLE | - | PayloadCMS Pages collection Block 追加 (PricingBlock / LogoCloud / Video / SplitContent / Timeline) — 必要に応じて | 1 日 | `agent/{X}/cms-blocks-ext` |
| P3 | ⚪ AVAILABLE | - | legacy `locale` field の DB column drop migration (Pages/Services/Works/Pricing/FAQs) — admin が手動で availableLocales へ移行後 | 0.5 日 | `agent/{X}/legacy-locale-drop` |
| P3 | ⚪ AVAILABLE | - | legacy `analytics.umamiWebsiteId*` / `calendarUrl.ja/en` の DB drop migration — admin が手動で *byLocale array へ移行後 | 0.5 日 | `agent/{X}/legacy-settings-drop` |

---

## ✅ 完了 (直近 14 日)

| 完了日 | Owner | Task | Commit |
|--------|-------|------|--------|
| 2026-05-13 | claude-code | **Sprint 13: URL リネーム /diagnostic→/report/[事業者名] + admin 撤廃 (Notion 集約)** ユーザー指示「URL おかしい. paradigmjp.com/[]/report/事業者名・余計な文字なし. 営業ダッシュボードは Notion ⇔ Supabase MCP 集約・PayloadCMS はコンテンツ管理特化」: ① sales_companies.slug カラム追加 + 6 seed slug 付与 (izakaya-en/kansai-construction/hairsalon-lufre/minato-dental/chuo-accounting/select-shop-roppongi) ② findCompanyBySlug + fetchDiagnosticReport({ slug }) ③ /[locale]/report/[slug]/page.tsx + opengraph-image.tsx 新規 ④ /[locale]/_archive_diagnostic + admin/_archive_sales 化 ⑤ middleware NOINDEX /report continued ⑥ Slack 通知 URL 一斉置換 + admin ボタン → Notion ボタン ⑦ track-view: slug 優先 lookup (uuid/domain backward compat) ⑧ audit script TEST_SLUG=izakaya-en / TS clean ✅ | f28655c + 7edbbda |
| 2026-05-13 | claude-code | **Sprint 12: 実運用カバレッジ完成 (P1 全消化)** ① 56 templates (8×7 業種×課題マトリクス) 一括 seed (`scripts/seed-sales-templates.mjs` 5-stage 絶望→希望フレーム自動生成) ② `lib/sales/sources/scanner.ts` 共通スキャナ抽出 (PSI + HTML inspect + IssueCode 推定) ③ `lib/sales/enrich.ts` contact form → corporate domain 検出 → scan + gBizInfo 並列 → sales_companies UPSERT + Slack Block Kit 通知 (自由メール skip 28 ドメイン blacklist) ④ `/api/sales/weekly-digest` Slack 週次ダイジェスト (HOT top 5 + ステージ別 + 課題別 + 都道府県別) ⑤ /api/contact 拡張 (fire-and-forget 非同期 enrich) ⑥ TS clean | 94a76b4 |
| 2026-05-13 | claude-code | **Sprint 11: 実運用穴埋め 8 件 (P0+P1)** scan API (`/api/sales/scan/[domain]` PSI + HTML inspect + IssueCode 推定) / track-view (1x1 pixel + report_views++ + HOT 自動判定 3+ views) / opengraph-image 動的生成 (1200×630 next/og) / lib/notify.ts Slack Bot API (chat.postMessage + Block Kit notifyHotLead) / lib/sales/sources/gbizinfo.ts 経産省 API enrichment / /[locale]/admin/sales 管理画面 (8 KPI + リード一覧 + Cookie auth) / scripts/generate-templates-bulk.mjs (bg 用 DeepSeek V4 PRO 56 templates 生成) / DiagnosticReport tracking pixel 埋込 + middleware NOINDEX_PATTERN /diagnostic/ 追加 | 2ec123b |
| 2026-05-13 | claude-code | **🚨 V4 PRO 永久指定**: 全 LLM 呼び出しを deepseek-v4-pro default に強制 (ユーザー指示「v3 ではなく V4 PRO・間違えないで・永久保存」). グローバル CLAUDE.md NN ルール更新 + メモリ feedback_important_rules.md に詳細永久保存. lib/deepseek.ts DEFAULT_MODEL = "deepseek-v4-pro" | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 10 (A+B+C+D) ノンストップ実装**: A (DeepSeek V4 PRO wrapper + form-message generator + /api/sales/generate-form-message) / B (HyperFrames 動画パイプライン: narration script 生成→HTML build→/api/sales/generate-diagnostic-video) / C (Stripe Checkout + Webhook 署名検証 + sales_customers 状態同期) / D (LP 12-locale messages namespace 追加 ja=完全翻訳・他=ja fill 後で DeepSeek 翻訳) / TS clean + 41/41 tests ✅ | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 9 (A+D+B+C): 営業 OS LP × API × 診断レポート LP 一気通貫実装** (A: 3 API route /api/sales/{sync-to-notion,sync-from-notion,upsert-template} + lib/sales/auth.ts shared secret / D: /[locale]/diagnostic/[slug] LP + DiagnosticReport component + lib/sales/diagnostic.ts (3-Act builder) + middleware noindex pattern 拡張 / B: /[locale]/video 動画サブスク LP (3 plan + 比較表 + Process) / C: /[locale]/agency 代理店 WL LP + RoiCalculator (損失訴求 Aha モーメント) / TS clean + 41/41 tests ✅) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 8 着手: Notion × Supabase ハブ整備 (営業 OS 新基盤)** (sales_* schema 5 table 設計・lib/notion.ts API wrapper・n8n 3 workflow JSON skeleton・.env.example 新規・旧 archive 撤廃確定宣言) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 7: appexx.me 連携一時断絶 (fail-soft archive)** (`api/sales-automation` + `api/persona` + `lib/authentik-oidc.ts` → `_archive_*` / Slack `appexx.me/api/studio/notify` hardcode → env `SLACK_WEBHOOK_URL` + 未設定 no-op / Dify fallback `dify.appexx.me` → `api.dify.ai` (DIFY-CLOUD-ONLY 準拠) / Cal URL default `cal.appexx.me` → 空文字 + contact page で空時 skip render / tests 41/41 ✅ + TS clean ✅) | (本コミット) |
| 2026-05-13 | claude-code | **Sprint 6: 全面 i18n + CMS audit + 4 件 bug 修正** (Layer 1-5 監査 / loading.tsx i18n-ify + 12 locale messages 追加 / 18 page で page-specific canonical+hreflang override・`lib/page-metadata.ts` helper 新設 / themes-showcase noindex / HeroSection cosmetic fallback / audit script 4 本追加 (regression 防止) / tests 41/41 ✅ + TS clean ✅) | b216286 |
| 2026-05-12 | claude-code | **Sprint 5: 診断レポート archive (ゼロから作り直し前段)** (`/[locale]/report/*` + `/report/*` + `/api/report/*` + `components/proposal/*` + `lib/proposal/*` + `lib/proposal-templates*.ts` → `_archive_*` prefix + middleware `/report /p` redirect ロジック撤去 (noindex header だけ残置) + tsconfig.json `_archive_*` exclude 追加 + tests 41/41 ✅ + TS clean ✅) | 2a26343 |
| 2026-05-12 | claude-code | **Sprint 0–4: MVP archived + i18n/CMS 完璧化** (sales/api/mvp/optout/docs-admin _archive_ prefix 化 + middleware sales gate 撤去 + 6 collection availableLocales 12-locale 化 + Settings global umami/calendar 12-locale array 形式 + 8 ファイル hardcoded locale 分岐 sweep + 5 collection legacy locale field [DEPRECATED] 表示化・disabled 化 + tests 41/41 ✅ + TS clean ✅) | cd98be2 |
| 2026-05-08 | claude-code | **P18-A-FIX-1 V1 token 再統合** (UUID-36 検出 → /api/report fallback で旧 token URL 互換確保) | 32299a4 |
| 2026-05-08 | claude-code | **paradigmjpcom lockfile 修正** (git+ssh→git+https・Coolify build 連続失敗根治) | 3fc42bf |
| 2026-05-08 | claude-code | **P18-D i18n sweep 13 ページ完遂** (services + about + faq + contact + pricing + privacy + legal + works + blog + service-detail/web + service-detail/meo + service-detail/seo + service-detail/ai・全 12 locale namespace 化・isJa hardcode 全廃) | 1a9f8b8, 25b2336, eba169d, a7d89d3, f9d5575, 64d077a, d16b36b, 521e38c, 0b93d12, 6c13f80, 382311e |
| 2026-05-08 | claude-code | **CEP 永久ルール準拠 CLAUDE.md 圧縮 143KB → 58KB** (60% 削減・docs/knowledge/poss-paradigmjpcom-implementation.md 外出し) | 9aef560 |
| 2026-05-08 | claude-code | **TEAM-DEV 協業プロトコル適用** (Task.md 構造化) | (本コミット) |
| 2026-05-07 | claude-code | **B33 Phase 2 middleware locale-aware redirect** (`/report/[slug]` (locale-less) → `cms_content_blocks.region` lookup → 308 redirect・next-intl 全 /ja/ 丸まり致命バグ根治) | ec4a1eb |
| 2026-05-07 | claude-code | **B33 /[locale]/themes-showcase QA ページ** (24-cell grid + ?theme= 全画面・paradigm-blocks 6 design theme 視覚比較) | 8c0aead, c937433 |
| 2026-05-07 | claude-code | **/[locale]/report/[slug] page.tsx region lookup shim** (middleware 昇格前の中間実装・safety net 維持) | 2e5beea |
| 2026-04-30 | claude-code | **P18 Aesop ラグジュアリー全面リニューアル** (P18-A Design Token + P18-B Core Layout + P18-C Motion & Polish + P18-D-1/2/3 全ページ Aesop 化・10 ページ 全 14 routes 200 OK・dark mode 対応) | 9716ea7 ほか |
| 2026-04-27 → 2026-05 | claude-code | **P17 i18n 12-locale 拡張 P17-1〜10** (routing/locale-map/LocaleSwitcher/PayloadCMS拡張/messages.json 全 12 言語/HomeClient messages 化) | a090d66 ほか |

---

## 🗄️ アーカイブ済み (削除はしないけど使わない・2026-05-12)

| 範囲 | 元パス | 新パス (_archive_ prefix で Next.js build & tsc 除外) | 復活方法 |
|------|--------|----------------------------------------------------|---------|
| MVP frontend UI | `src/app/sales/[region]/mvp/*` | `src/app/_archive_sales/[region]/mvp/*` | rename 戻し 1 発 |
| MVP API endpoints (14) | `src/app/api/mvp/*` | `src/app/api/_archive_mvp/*` | rename 戻し 1 発 |
| MVP optout 着地ページ | `src/app/[locale]/optout` | `src/app/[locale]/_archive_optout` | rename 戻し 1 発 |
| MVP 管理 quick ref | `src/app/[locale]/docs/admin/mvp-operations` | `src/app/[locale]/docs/admin/_archive_mvp-operations` | rename 戻し 1 発 |
| middleware `/sales/*` gate | `src/middleware.ts` の SALES_PATH_PATTERN | 撤去済 (route 自体が 404 になるため不要) | B36 #19 Basic Auth ブロックを復活 |
| **🆕 診断レポートページ** (locale ルート) | `src/app/[locale]/report/*` | `src/app/[locale]/_archive_report/*` | rename 戻し 1 発 |
| **🆕 診断レポート shim** (locale-less) | `src/app/report/*` | `src/app/_archive_report_shim/*` | rename 戻し 1 発 |
| **🆕 診断レポート API** | `src/app/api/report/*` | `src/app/api/_archive_report/*` | rename 戻し 1 発 |
| **🆕 Proposal components (13 sections + Renderer)** | `src/components/proposal/*` | `src/components/_archive_proposal/*` | rename 戻し 1 発 |
| **🆕 Proposal lib** (manifest/i18n/theme/prospect-data/default-translations) | `src/lib/proposal/*` | `src/lib/_archive_proposal/*` | rename 戻し 1 発 |
| **🆕 Proposal templates** (業種×訴求軸マッチング) | `src/lib/proposal-templates*.ts` | `src/lib/_archive_proposal-templates*.ts` | rename 戻し 1 発 |
| **🆕 middleware /report /p redirect** | `src/middleware.ts` の resolveLocaleFromSlug + redirect | 撤去済 (X-Robots-Tag noindex header だけ残置・古い indexed URL 防御) | git history から復元 |
| **🆕 tsconfig** | `tsconfig.json` exclude | `_archive_*` パターン追加 | 同 exclude を消すだけ |
| **🆕 appexx.me 連携 (2026-05-13 一時断絶)** | `api/sales-automation/*` | `api/_archive_sales-automation/*` | rename 戻し 1 発 |
| **🆕 Persona API (MVP infra)** | `api/persona/[slug]/*` | `api/_archive_persona/[slug]/*` | rename 戻し 1 発 |
| **🆕 Authentik OIDC stub** (未使用) | `lib/authentik-oidc.ts` | `lib/_archive_authentik-oidc.ts` | rename 戻し 1 発 |
| **🆕 Slack 通知 hardcode** (appexx.me/api/studio/notify) | `api/contact/route.ts` + `lib/error-monitor.ts` | env `SLACK_WEBHOOK_URL` + fail-soft (未設定 = no-op) | env 設定で再有効化 |
| **🆕 Dify base URL fallback** (dify.appexx.me) | `api/chat/route.ts` | Dify Cloud `api.dify.ai` を default に (DIFY-CLOUD-ONLY 永久ルール準拠) | env DIFY_BASE_URL 設定 |
| **🆕 Cal.com URL default** (cal.appexx.me) | `lib/settings.ts` DEFAULTS / `globals/Settings.ts` admin description | 空文字 default + contact page で空時 skip render | admin が `calendarByLocale` 設定 |

**残置物 (アーカイブしていないが現在 unused)**:
- `src/lib/mvp/*` (auth/tracking 等) — archived route だけが import していたため orphan・harmless
- DB tables `mvp_outreach_runs` / `mvp_optout_tokens` / `paradigm_personas` / `form_message_templates` / `cms_content_blocks` (B36 既存 report 永続データ) — データ保護のため触らない
- Coolify cron jobs (cron-pickup / ab-winner-judge) — 404 で no-op になる (副作用なし)
- `/api/persona/*` / `/api/sales-automation/*` — MVP と共有していたが汎用 API なので残置
- `src/components/magicui/*` — proposal で使われていたが、他 page でも使う可能性あり残置

---

## 📝 確定済み方針 (2026-04-27 ユーザ承認)

### P17 / P18 Plan B 確定 (永久参照)

**P17 i18n**: `/ja` `/en` は独自設計維持 / 残 10 ロケールは Japan Entry Package 翻訳のみ + PPP 補正価格 + ハードコード文字列の漸進 messages 移行

**P18 Aesop**: 4 PR 段階リリース A→B→C→D / Modern Tech × Aesop ハイブリッド (warm beige NOT・cooler neutral cream `#f8f8f6` + ink `#121419` + indigo refined accent) / dark mode `[data-theme="dark"]` + `next-themes` / EC 系 components スキップ (Cart/Checkout/Crossmint 等) / `/report/[slug]` は対象外 (s10-4 提案ページ 4 鉄則維持)

### Locale 確定 12 個 + PPP 価格基準

詳細表 → `CLAUDE.md` s3-4 (圧縮済セクション) または `docs/knowledge/poss-paradigmjpcom-implementation.md`

主要マッピング:
- `ja → ja` (1.0) / `en → en` (1.0) / `ko → ko` (0.85) / `zh → zh` (0.55)
- `europe → de/fr` (0.95) / `es → es` (0.75) / `pt → pt` (0.45) / `ru → ru` (0.40)
- `ar → ar` (0.65・**RTL 適用**) / `sea → vi/id` (0.40) / `africa → fr` (0.95) / `others → en`

### 翻訳戦略
- DeepSeek V3 + Context Caching (system prompt 固定で 90%OFF・実効 $0.014/1M)
- 1 messages.json (~75 keys) × 10 言語 = 750 翻訳 ≈ $0.5 USD

---

## 📦 詳細外出し (このファイルから参照)

| 種別 | 参照先 |
|------|--------|
| **TEAM-DEV 協業プロトコル詳細** | `~/.claude/knowledge/team-dev-protocol.md` |
| **CEP / Anti-Bloat / 永久ルール** | `~/.claude/CLAUDE.md` + `~/.claude/knowledge/cep-content-externalization.md` |
| **paradigmjpcom 実装ディテール (API/folder/cold outreach 等)** | `docs/knowledge/poss-paradigmjpcom-implementation.md` |
| **業界知識・ノウハウ** | `~/.claude/knowledge/{topic}.md` |
| **B33 Phase 2 設計原則** | appexxme `CLAUDE.md` s10-5 #17 + appexxme `Task.md` § B33 |
| **i18n audit (P17 起点)** | `docs/research/p17-i18n-audit.md` |

---

## 🔧 環境情報 (毎セッション参照価値あり)

- **Coolify UUID**: `i12am4vvcbggefnqdizhnv9a` (paradigm-hp / Nixpacks Next.js)
- **DigitalOcean Droplet**: `555590454` (4vCPU/8GB SGP1・appexxme と共有)
- **Cloudflare Zone ID**: `f191afabddabaf1658ebfe79a9a9b723`
- **Supabase**: `appexx-studio` (yihdmgtxiqfdgdueolub・appexxme と共有)
- **Domains**: paradigmjp.com / 提案ページ canonical = `paradigmjp.com/{locale}/report/[slug]` (308 redirect 経由)
- **Dify**: 🚨 **Cloud 版 api.dify.ai のみ** (DIFY-CLOUD-ONLY 永久ルール) / OSS dify.appexx.me 削除済
- **デプロイ**: trigger ≠ 完了 (DEPLOY-VERIFY 永久ルール) / Background poll + auto-retry max 3
