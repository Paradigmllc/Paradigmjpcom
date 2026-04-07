# Paradigm HP — Claude Code プロジェクトコンテキスト

## 📊 進捗ダッシュボード（目次）

| 進捗 | # | セクション | 状態メモ |
|------|---|-----------|---------|
| ★★★☆☆ | 1 | 🎯 事業概要・市場機会 | コーポレートHP、概要固まった |
| ☆☆☆☆☆ | 2 | 🏆 競合・差別化 | N/A（競合比較ページなし） |
| ★★☆☆☆ | 3 | 💰 ビジネスモデル | 料金プランは実装済み、BizModel記述なし |
| ☆☆☆☆☆ | 4 | 📊 財務計画・KPI | N/A |
| ★★☆☆☆ | 5 | 📈 ロードマップ・PMF | 未実装リストあり |
| ★☆☆☆☆ | 6 | ⚖️ Exit・法的リスク | 特定商取引法ページのみ実装済み |
| ★★★★☆ | 7 | 🗺️ プロダクト設計 | ページ構成・フォルダ構成完備 |
| ★★★★☆ | 8 | ⚙️ 技術・データ設計 | スタック・DBテーブル・環境変数完備 |
| ★★★☆☆ | 9 | 📣 GTM・集客・エコシステム | Coolify/Cloudflare/GitHub連携完備 |
| ★★★★☆ | 10 | 🖥️ 運用・組織・実装ルール | ルール・管理ダッシュボード・実装済み機能 |
| ★★★☆☆ | 11 | 📚 リソース一覧 | 主要ツール×URL |

⚠️ **要強化セクション**: 2 競合 / 4 財務 / 6 Exit（将来SaaS化時 or LP強化時に記入）

---

## 1. 🎯 事業概要・市場機会

- **法人**: Paradigm合同会社
- **プロダクト**: paradigmjp.com — Paradigm公式コーポレートHP + リード獲得サイト
- **ドメイン管理**: ラッコドメイン → Cloudflare DNS
- **サーバー**: DigitalOcean（Coolifyセルフホスト）— appexx.meと同一サーバー（IP: 139.59.250.5）
- **Git**: `Paradigmllc/Paradigm-HP`（main ブランチ）

**解決しているジョブ**: Web制作 / MEO / SEO / AI導入の4サービスを訴求し、コンタクトフォーム経由でリード獲得 → Supabaseに保存 → Twenty CRMで管理するコーポレートHP

**4サービス**: Web制作 / MEO対策 / SEO・GEO対策 / AI導入支援

---

## 2. 🏆 競合・差別化

> N/A（コーポレートHPのため。将来LP強化・競合比較ページ追加時に記入）

---

## 3. 💰 ビジネスモデル

- **収益モデル**: 月額顧問 + プロジェクト型（Web制作・MEO・SEO・AI導入）
- **料金プラン**: 4サービス×3プラン（Supabase `cms_pricing` で管理）
- **リード獲得導線**: /contact フォーム → Slack通知 + Supabase保存 → Twenty CRM管理

> 詳細マネタイズ設計は将来SaaS化時に → SAAS-POSITIONルール参照

---

## 4. 📊 財務計画・KPI

> N/A（コーポレートHP。KPIはUmami analytics.appexx.meで計測）

---

## 5. 📈 ロードマップ・PMF

### 未実装（今後の予定）

- **Umami Website ID設定** — analytics.appexx.meで新サイト追加 + 環境変数設定
- **Ghost連携** — ブログをGhost API経由に切り替え（現在はSupabase DB + フォールバック）
- **メール自動返信** — フォーム送信時にResend/SMTP経由で確認メール送信
- **Authentik OIDC** — 管理画面(/admin)の認証強化
- **パフォーマンス計測** — Lighthouse CI / Web Vitals監視の自動化
- **ラッコドメインNS変更** — Cloudflareネームサーバーへ変更（手動操作が必要）
- **多言語対応** — 英語LP（海外クライアント向け）
- **提案ページ強化** — /p/[slug] の心理トリガー設計をappexx-dashboardと同期

---

## 6. ⚖️ Exit・法的リスク

- **特定商取引法**: `/legal` ページ実装済み（9条）
- **プライバシーポリシー**: `/privacy` ページ実装済み
- **お問い合わせフォーム**: 個人情報の取り扱い同意チェックボックスの追加が必要

> Exit戦略: N/A（コーポレートHP）

---

## 7. 🗺️ プロダクト設計

### サイト構成

```
paradigmjp.com/
├── /                  ← トップページ（ヒーロー+サービス概要+実績プレビュー+選ばれる理由+CTA）
├── /about             ← 会社概要（ミッション/価値観3つ/基本情報テーブル）
├── /services          ← サービス一覧（4サービス交互レイアウト）
│   ├── /services/web  ← Web制作（詳細+特徴+料金3プラン+CTA）
│   ├── /services/meo  ← MEO対策（詳細+対策の流れ4ステップ+料金+CTA）
│   ├── /services/seo  ← SEO/GEO対策（SEO vs GEO比較+料金+CTA）
│   └── /services/ai   ← AI導入支援（導入事例4件+料金+CTA）
├── /pricing           ← 料金一覧（4カテゴリ×3プラン+料金補足Q&A）
├── /faq               ← よくある質問（10問のアコーディオンUI）
├── /works             ← 制作実績（6件のケーススタディ+メトリクス+タグ）
├── /contact           ← お問い合わせ（フォーム+API送信+サイドバー+Cal.comリンク）
├── /blog              ← ブログ一覧（カテゴリ/タグ/読了時間表示）
│   └── /blog/[slug]   ← ブログ記事（Markdownレンダリング+BlogPosting JSON-LD）
├── /lp/web            ← Web制作LP（ペインポイント+ソリューション+料金+CTA）
├── /lp/meo            ← MEO対策LP（数値実績+対象業種+CTA）
├── /lp/seo            ← SEO/GEO対策LP（SEO vs GEO比較+CTA）
├── /lp/ai             ← AI導入支援LP（インパクト数値+FAQ+CTA）
├── /p/[slug]          ← 顧客向け提案ページ（心理トリガー設計・appexx-dashboardと同期）
├── /privacy           ← プライバシーポリシー（9条）
├── /legal             ← 特定商取引法に基づく表記
└── /admin             ← 管理ダッシュボード（認証付き）
    ├── /admin/posts   ← ブログ管理（CRUD+Markdownエディタ）
    ├── /admin/services ← サービス管理
    ├── /admin/pricing ← 料金管理
    ├── /admin/faqs    ← FAQ管理（D&D並替え）
    ├── /admin/works   ← 実績管理
    ├── /admin/leads   ← リード管理（問い合わせ一覧）
    └── /admin/settings ← サイト設定
```

### API エンドポイント

- `POST /api/contact` — お問い合わせ（Slack通知 + Supabase leads保存）
- `GET/POST/PATCH/DELETE /api/admin/*` — 管理CRUD API（ブログ/サービス/料金/FAQ/実績）

### フォルダ構成

```
paradigmjpcom/
├── CLAUDE.md
├── package.json / tsconfig.json / next.config.ts
├── src/
│   ├── app/
│   │   ├── globals.css          ← Tailwind v4 @themeブロック（primary/accent/surface色定義）
│   │   ├── layout.tsx           ← ルートレイアウト（Header/Footer/メタデータ/OGP）
│   │   ├── page.tsx             ← ホームページ
│   │   ├── about/ contact/ faq/ legal/ pricing/ privacy/ works/
│   │   ├── blog/
│   │   │   ├── page.tsx         ← ブログ一覧
│   │   │   └── [slug]/page.tsx  ← ブログ記事（SSG）
│   │   ├── lp/ web/ meo/ seo/ ai/
│   │   ├── services/ web/ meo/ seo/ ai/
│   │   ├── p/[slug]/            ← 提案ページ（AllInOneClient.tsx）
│   │   ├── admin/               ← 管理ダッシュボード（layout.tsx + 7ページ）
│   │   ├── api/contact/ admin/
│   │   ├── sitemap.ts / robots.ts / opengraph-image.tsx
│   ├── components/
│   │   ├── Header.tsx / Footer.tsx
│   │   └── ui/                  ← shadcn/ui互換
│   └── lib/
│       ├── data.ts              ← コンテンツデータ（フォールバック用、DB優先）
│       ├── blog.ts              ← ブログ記事データ（フォールバック用）
│       ├── jsonld.ts            ← JSON-LD構造化データ
│       └── supabase.ts          ← Supabase接続ヘルパー
└── public/
```

---

## 8. ⚙️ 技術・データ設計

### 技術スタック

| レイヤー | 使用ツール |
|---|---|
| フレームワーク | Next.js 15（App Router）+ TypeScript + Tailwind CSS v4 |
| フォント | Noto Sans JP (300-800ウェイト、Google Fonts) |
| アニメーション | framer-motion |
| アイコン | lucide-react |
| UI | shadcn/ui互換 + Radix UI + Sonner (Toast) |
| フォーム | React Hook Form + Zod |
| 状態管理 | TanStack Query + Zustand |
| CMS | カスタム管理ダッシュボード（/admin） |
| データベース | Supabase（appexxと同一プロジェクト yihdmgtxiqfdgdueolub） |
| ホスト | Coolify（同一サーバー: 139.59.250.5） |
| DNS | Cloudflare |
| CI/CD | GitHub Actions → Coolify Webhook（private repo対応） |

### Supabase CMSテーブル（7テーブル）

| テーブル | 内容 |
|---------|------|
| `cms_posts` | ブログ記事（slug/title/excerpt/content/category/tags/status/published_at） |
| `cms_services` | サービス（service_id/icon/title/tagline/description/features/results/color/sort_order） |
| `cms_pricing` | 料金プラン（service_id/plan_name/price/period/description/features/is_popular/sort_order/monthly_note） |
| `cms_faqs` | FAQ（question/answer/sort_order/is_active） |
| `cms_works` | 実績（title/industry/description/metrics/tags/color/sort_order/is_active） |
| `cms_settings` | サイト設定（key/value(jsonb)） |
| `cms_media` | メディアライブラリ（filename/url/alt_text/mime_type/size_bytes） |

**共有テーブル（appexx-dashboardと同一プロジェクト）**: `leads`（問い合わせ保存先）

**フォールバック（src/lib/data.ts）**: SERVICES(4) / PRICING(4カテゴリ×3プラン) / FAQS(10) / WORKS(6)

### 環境変数（Coolify設定）

```bash
# Supabase（appexxと同一プロジェクト）
NEXT_PUBLIC_SUPABASE_URL=https://yihdmgtxiqfdgdueolub.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(Coolify appexx-dashboardから参照)
SUPABASE_SERVICE_ROLE_KEY=(Coolify appexx-dashboardから参照)

# サイト
NEXT_PUBLIC_SITE_URL=https://paradigmjp.com
NEXT_PUBLIC_COMPANY_NAME=Paradigm合同会社

# 管理画面認証
ADMIN_PASSWORD=paradigm-admin-2025

# アナリティクス（要設定）
NEXT_PUBLIC_UMAMI_WEBSITE_ID=(Umamiで新サイト追加後に設定)
```

### デザインシステム

- **カラー**: primary(#1a1a2e) / accent(#4f46e5) / accent-light(#818cf8) / surface(#fff) / text(#1e293b) / text-muted(#64748b)
- **フォント**: Noto Sans JP（Google Fonts、300-800ウェイト）
- **角丸**: rounded-xl(カード) / rounded-2xl(大カード) / rounded-xl(ボタン)
- **影**: shadow-lg shadow-accent/25（CTAボタン）
- **グラデーション**: ヒーロー from-primary to-slate-900 / CTA from-accent to-indigo-600
- **サービス別カラー**: indigo(Web) / emerald(MEO) / amber(SEO) / purple(AI)

---

## 9. 📣 GTM・集客・エコシステム

### Coolify 設定

- **UUID**: `i12am4vvcbggefnqdizhnv9a`（Nixpacks/Next.js）
- **ドメイン**: `https://paradigmjp.com`, `https://www.paradigmjp.com`
- **ポート**: 3000
- **デプロイコマンド**: `curl -H "Authorization: Bearer {COOLIFY_TOKEN}" "https://coolify.appexx.me/api/v1/deploy?uuid=i12am4vvcbggefnqdizhnv9a&force=true"`

### Cloudflare 設定

- **Zone ID**: `f191afabddabaf1658ebfe79a9a9b723`
- **Aレコード**: paradigmjp.com → 139.59.250.5（Proxied）
- **管理**: ラッコドメイン → Cloudflare NSで委任済み

### GitHub 設定

- **レポ**: `Paradigmllc/Paradigm-HP`
- **ブランチ**: `main`
- **CI/CD**: GitHub Actions `deploy.yml`（ポーリングループ削除済み — Coolifyは`running:unknown`のみ返すため）

### appexx.meインフラとの共有接続

| リソース | 接続方法 |
|---|---|
| Supabase | 同一プロジェクト（yihdmgtxiqfdgdueolub）— cms_* テーブルで分離 |
| 認証 | Authentik（authentik.appexx.me）— 将来OIDC連携予定 |
| LLM | https://appexx.me/api/studio/llm 経由 |
| Slack通知 | https://appexx.me/api/studio/notify 経由 |
| CRM | Twenty CRM（crm.appexx.me） |
| フォーム | Formbricks（forms.appexx.me） |
| アナリティクス | Umami（analytics.appexx.me） |
| Ghost | ghost.appexx.me（ブログ記事共有可能） |
| Cal.com | cal.appexx.me（商談予約リンク） |

### SEO設定（実装済み）

- **構造化データ**: Organization / Services / FAQ / BreadcrumbList / BlogPosting（JSON-LD）— `src/lib/jsonld.ts`
- **サイトマップ**: `sitemap.ts`（22 URL、優先度/更新頻度付き）
- **robots.txt**: `robots.ts`（/api/ のみ除外）
- **OGP画像**: `opengraph-image.tsx`（Edge Runtime動的生成）
- **Umami**: `layout.tsx` にスクリプト埋め込み済み

---

## 10. 🖥️ 運用・組織・実装ルール

### コーディング規約

> 📌 **全プロジェクト共通ルール（A〜TT等）はグローバル設定 `~/.claude/CLAUDE.md` に定義済み。**
> ルール変更時の同期先: ① `~/.claude/CLAUDE.md`（主） ② `memory/feedback_important_rules.md` ③ `Paradigmllc/dotfiles/claude/CLAUDE.md`

1. UIテキストは日本語で統一
2. デザインはモダンで洗練されたコーポレートサイト（framer-motionは上品に、過度な演出NG）
3. レスポンシブ必須（モバイルファースト、`sm:` `md:` `lg:` 必ず設定）
4. Core Web Vitals / Lighthouse 90+ を目標
5. SEO最適化（構造化データ/OGP/サイトマップ/robots.txt — 全ページ必須）
6. 画像は `next/image` + WebP + 適切なサイズ指定
7. appexxインフラへのAPI呼び出しはサーバーサイド（Route Handler）から実行
8. コンテンツはDB優先（cms_*テーブル）、`src/lib/data.ts` はフォールバック
9. git push → GitHub Actions → Coolify Webhook で自動デプロイ
10. コード変更後は: ① CLAUDE.md更新 → ② git commit+push → ③ URL確認

### 管理ダッシュボード（/admin）

| 項目 | 内容 |
|-----|------|
| 認証方式 | 環境変数 `ADMIN_PASSWORD` + Cookie `paradigm_admin_token` |
| 将来予定 | Authentik OIDC統合 |
| ダッシュボード | 記事数/サービス数/問い合わせ数/今月のアクセス |
| ブログ管理 | 記事CRUD・Markdownエディタ・プレビュー・下書き/公開切替 |
| サービス管理 | 4サービスの説明・特徴・実績テキスト編集 |
| 料金管理 | プラン名/価格/特徴の編集 |
| FAQ管理 | Q&A追加/編集/削除/並べ替え（D&D） |
| 実績管理 | ケーススタディ追加/編集/削除 |
| リード管理 | 問い合わせ一覧+ステータス管理 |
| サイト設定 | 会社情報・メール設定・OGP設定 |

### 実装済み機能

- ✅ トップページ — ヒーロー+サービス概要+実績プレビュー+選ばれる理由+CTA
- ✅ 全サービスページ — `/services/web` `/services/meo` `/services/seo` `/services/ai`
- ✅ LP 4ページ — `/lp/web` `/lp/meo` `/lp/seo` `/lp/ai`
- ✅ ブログ — Markdown→HTMLレンダリング、BlogPosting JSON-LD
- ✅ お問い合わせフォーム — `POST /api/contact`（Slack通知 + Supabase leads保存）
- ✅ OGP画像 — `opengraph-image.tsx`（Edge Runtime動的生成）
- ✅ 構造化データ — Organization/Services/FAQ/BreadcrumbList/BlogPosting
- ✅ サイトマップ — `sitemap.ts`（22 URL、優先度/更新頻度付き）
- ✅ robots.txt — `robots.ts`（/api/ のみ除外）
- ✅ Umami — layout.tsxにスクリプト埋め込み済み
- ✅ 管理ダッシュボード — `/admin`（認証+7セクション+CRUD API）
- ✅ Difyチャットボット — デフォルト展開（`useState(true)`）
- ✅ 提案ページ — `/p/[slug]`（AllInOneClient.tsx、appexx-dashboardと同期）
- ✅ GitHub Actions deploy.yml — ポーリングループ削除済み（Coolify対応）
- ✅ framer-motion型修正 — `EASE as const` タプル型（nixpacksビルド対応）

---

## 11. 📚 リソース一覧

> プロジェクトで使用・参照するすべてのツール・サービス・法令のURL一覧。新サービス追加時は随時更新。

#### フロントエンド・フレームワーク
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Next.js 15 (App Router) | フルスタックReactフレームワーク | https://nextjs.org |
| TypeScript | 型安全JavaScript | https://www.typescriptlang.org |
| Tailwind CSS v4 | ユーティリティCSSフレームワーク | https://tailwindcss.com |
| Noto Sans JP | 日本語Webフォント | https://fonts.google.com/noto/specimen/Noto+Sans+JP |

#### UI・コンポーネント
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| shadcn/ui | コピーベースUIコンポーネント集 | https://ui.shadcn.com |
| Radix UI | アクセシブルUIプリミティブ | https://www.radix-ui.com |
| Lucide React | アイコンライブラリ | https://lucide.dev |
| framer-motion | アニメーションライブラリ | https://www.framer.com/motion |
| Sonner | トースト通知 | https://sonner.emilkowal.ski |
| React Hook Form | フォーム管理 | https://react-hook-form.com |
| Zod | スキーマバリデーション | https://zod.dev |
| TanStack Query | サーバーステート管理 | https://tanstack.com/query |
| Zustand | クライアントステート管理 | https://zustand-demo.pmnd.rs |

#### データベース・BaaS
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Supabase | PostgreSQL+Auth+Storage（appexxと同一プロジェクト） | https://supabase.com |

#### インフラ・ホスティング
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| DigitalOcean | クラウドVPS（appexx.meと同一Droplet） | https://www.digitalocean.com |
| Coolify | セルフホストPaaS（UUID: i12am4vvcbggefnqdizhnv9a） | https://coolify.io |
| Cloudflare | DNS・CDN・SSL（Zone ID: f191afabddabaf1658ebfe79a9a9b723） | https://www.cloudflare.com |
| GitHub Actions | CI/CDパイプライン（Paradigmllc/Paradigm-HP） | https://github.com/features/actions |
| ラッコドメイン | ドメイン取得・NS委任 | https://rakko.tools |

#### マーケティング・CRM・分析
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Twenty CRM | セルフホストCRM（crm.appexx.me） | https://twenty.com |
| Umami | アクセス解析（analytics.appexx.me） | https://umami.is |
| Cal.com | 商談予約（cal.appexx.me） | https://cal.com |
| Formbricks | フォーム・アンケート（forms.appexx.me） | https://formbricks.com |
| Ghost | ブログCMS（ghost.appexx.me） | https://ghost.org |
| Resend | トランザクションメール送信（未設定） | https://resend.com |
| Dify | AIチャットボット（dify.appexx.me） | https://dify.ai |

#### SEO・GEO
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Google Search Console | 検索流入・インデックス管理 | https://search.google.com/search-console |
| Google Analytics 4 | トラフィック計測 | https://analytics.google.com |
| Bing Webmaster Tools | Bing/ChatGPT向けインデックス | https://www.bing.com/webmasters |

#### 法令・規制（コンプライアンス参照）
| 機関/法令 | 内容 | URL |
|----------|------|-----|
| 消費者庁 特定商取引法 | 通販・メール営業の規制（/legal ページ対応済み） | https://www.no-trouble.caa.go.jp |
| 個人情報保護委員会 | 個人情報保護法（/privacy ページ対応済み） | https://www.ppc.go.jp |
| 総務省 特定電子メール法 | 営業メール・オプトアウト義務 | https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/anti_spam.html |

#### 参考リンク・ドキュメント
| タイトル | 内容 | URL |
|---------|------|-----|
| Next.js Docs | App Router・Metadata・sitemap APIリファレンス | https://nextjs.org/docs |
| Supabase Docs | RLS・Auth・Storage APIリファレンス | https://supabase.com/docs |
| Coolify Docs | セルフホストデプロイ設定 | https://coolify.io/docs |
| Google JSON-LD | 構造化データリファレンス | https://developers.google.com/search/docs/appearance/structured-data |
| Tailwind v4 Docs | @themeブロック・CSS変数リファレンス | https://tailwindcss.com/docs |
