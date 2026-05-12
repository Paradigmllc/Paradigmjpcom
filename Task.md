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
| ⚪ AVAILABLE | - | - | - | **B36 audit Open Items (#6 #7 #8 #9 H1)** | docs/audit/2026-05-10-holistic-e2e-audit.md・MVP archived 後の整理として残課題 |

---

## 📋 未着手 (Multi-agent 取り合い可)

| Priority | Status | Owner | Task | 工数 | Branch (推奨) |
|----------|--------|-------|------|------|---------------|
| P1 | ⚪ AVAILABLE | - | **診断レポート (`/[locale]/report/[slug]`) 刷新** — ユーザ指示で別途壁打ち | TBD | `agent/{X}/report-redesign` |
| P2 | ⚪ AVAILABLE | - | PayloadCMS Pages collection Block 追加 (PricingBlock / LogoCloud / Video / SplitContent / Timeline) — 必要に応じて | 1 日 | `agent/{X}/cms-blocks-ext` |
| P3 | ⚪ AVAILABLE | - | legacy `locale` field の DB column drop migration (Pages/Services/Works/Pricing/FAQs) — admin が手動で availableLocales へ移行後 | 0.5 日 | `agent/{X}/legacy-locale-drop` |
| P3 | ⚪ AVAILABLE | - | legacy `analytics.umamiWebsiteId*` / `calendarUrl.ja/en` の DB drop migration — admin が手動で *byLocale array へ移行後 | 0.5 日 | `agent/{X}/legacy-settings-drop` |

---

## ✅ 完了 (直近 14 日)

| 完了日 | Owner | Task | Commit |
|--------|-------|------|--------|
| 2026-05-12 | claude-code | **Sprint 0–4: MVP archived + i18n/CMS 完璧化** (sales/api/mvp/optout/docs-admin _archive_ prefix 化 + middleware sales gate 撤去 + 6 collection availableLocales 12-locale 化 + Settings global umami/calendar 12-locale array 形式 + 8 ファイル hardcoded locale 分岐 sweep + 5 collection legacy locale field [DEPRECATED] 表示化・disabled 化 + tests 41/41 ✅ + TS clean ✅) | (本コミット) |
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

| 範囲 | 元パス | 新パス (_archive_ prefix で Next.js build 除外) | 復活方法 |
|------|--------|--------------------------------------------|---------|
| MVP frontend UI | `src/app/sales/[region]/mvp/*` | `src/app/_archive_sales/[region]/mvp/*` | rename 戻し 1 発 |
| MVP API endpoints (14) | `src/app/api/mvp/*` | `src/app/api/_archive_mvp/*` | rename 戻し 1 発 |
| MVP optout 着地ページ | `src/app/[locale]/optout` | `src/app/[locale]/_archive_optout` | rename 戻し 1 発 |
| MVP 管理 quick ref | `src/app/[locale]/docs/admin/mvp-operations` | `src/app/[locale]/docs/admin/_archive_mvp-operations` | rename 戻し 1 発 |
| middleware `/sales/*` gate | `src/middleware.ts` の SALES_PATH_PATTERN | 撤去済 (route 自体が 404 になるため不要) | B36 #19 Basic Auth ブロックを復活 |

**残置物 (アーカイブしていないが現在 unused)**:
- `src/lib/mvp/*` (auth/tracking 等) — archived route だけが import していたため orphan・harmless
- DB tables `mvp_outreach_runs` / `mvp_optout_tokens` / `paradigm_personas` / `form_message_templates` — データ保護のため触らない
- Coolify cron jobs (cron-pickup / ab-winner-judge) — 404 で no-op になる (副作用なし)
- `/api/persona/*` / `/api/sales-automation/*` — MVP と共有していたが汎用 API なので残置

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
