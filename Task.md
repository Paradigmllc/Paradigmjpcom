## CURRENT STATUS - 2026-06-18 デモHP制作フロー v2 実装完了 (Astroテーマ魔改造)

### デモHP v2 アーキテクチャ
旧: Tailwind CDN HTML生成 → CF Pages → 会社別pages.dev
新: **Dify JSON設計図 → Supabase → Astro SSR (Hetzner) → テーマWidget動的マウント**

### 3テーマ統合 (Phase 1 完了)
| テーマ | Widget数 | 用途 |
|--------|---------|------|
| AstroWind | 15 core (22 total) | デジタルエージェンシー/SaaS/コンサル |
| ScrewFast | 4 simplified | 建設/物流/B2Bローカル |
| Astroship | 4 simplified | EC/クリエイター/ローカル店舗 |

### 魔改造の中核
- `astro-demo/src/pages/[slug].astro` — JSON設計図からWidget動的マウント
- `astro-demo/src/themes/registry.astro` — 3テーマWidget統合レジストリ
- `src/app/api/demo-pages/[slug]/route.ts` — Dify用CRUD API
- `supabase/migrations/migration_058_theme_demo_pages.sql` — デモページJSON永続化
- `src/lib/sales/demo-generator.ts` — HTML文字列生成 → JSONブループリント生成に刷新
- Adapter: `@astrojs/cloudflare` → `@astrojs/node` (standalone mode)
- Redirect: `/d/[slug]` → `ASTRO_DEMO_BASE_URL/demo/[slug]` (env制御)

### デプロイ先
- Astro SSR: Coolify新サービス (demo.paradigmjp.com or astro-demo.paradigmjp.com)
- Next.js: paradigmjp.com (変更なし)

### Astro build: ✅ 成功 (2026-06-18)

### 残タスク
- [ ] Coolifyにastro-demoサービス登録 + デプロイ
- [ ] Difyワークフロー: 業種×訴求→テーマ選択→Widget JSON生成→API POST
- [ ] index.astro テンプレートギャラリー刷新 (テーマベース)
- [ ] Supabase migration_058 本番適用
- [ ] Cloud Supabase 解約

### サーバー情報
- Hetzner IP: 178.105.138.55
- Coolify: coolify.paradigmjp.com (contact@paradigmjp.com / Paramore416)
- OSS Supabase: localhost:5433 (postgres/supabase2026pass)
- Coolify API Token: `3|coolify_ed9cc16a71a2d9f1c91bb8436c3d355a191994a6553493760397f95e1fb2c959`
- Coolify App UUID: `n8i2sjiqvr2d8hrzppop2m2i` (paradigm-hp)

### RevenueOS SSOT 設定
- `SALES_SUPABASE_URL`: http://supabase-studio-1:3000
- `ASTRO_DEMO_BASE_URL`: https://demo.paradigmjp.com (env追加予定)

### 重要操作手順
- paradigm-hp 再起動後: `docker network connect supabase_supabase-net <container>` 必須
- PostgREST 再起動でスキーマキャッシュリロード
- astro-demo deploy: `npm run build && npm start` (standalone Node.js)
- astro-demo dev: `npm run dev` (localhost:4321)
- 新規デモ生成: Sales OS enrichment pipeline → `generateReplacementDemo()` → Supabase自動保存
- Difyからの直接生成: `POST /api/demo-pages/{slug}` + `x-admin-secret` ヘッダー
## CURRENT STATUS - 2026-06-18 RevenueOS outreach quality gate

- Implemented shared outreach readiness gate for RevenueOS/Twenty/outreach worker.
- No diagnostic report URL now blocks outreach instead of falling back to `https://paradigmjp.com`.
- RevenueOS CRM tab now shows an operational queue: send-ready / review-required / blocked.
- Twenty company karte summary now includes `Outreach quality gate` and `Next action`.
- Verification: `npm test -- src/lib/sales/outreach/readiness.test.ts src/lib/sales/form-message.test.ts` and `npx tsc --noEmit --pretty false --skipLibCheck --types node -p tsconfig.json`.
