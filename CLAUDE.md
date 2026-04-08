# Paradigm HP — Claude Code プロジェクトコンテキスト

## 📊 進捗ダッシュボード（目次）

| 進捗 | # | セクション | 状態メモ |
|------|---|-----------|---------|
| ★★★★☆ | 1 | [🎯 事業概要・市場機会](#s1) | 2言語サイト設計確定（/ja日本向け・/en海外向け） |
| ★★☆☆☆ | 2 | [🏆 競合・差別化](#s2) | Japan Entry Packageポジション記載あり |
| ★★★☆☆ | 3 | [💰 ビジネスモデル](#s3) | /ja JPY・/en USD確定・Japan Entry Package設計確定 |
| ☆☆☆☆☆ | 4 | [📊 財務計画・KPI](#s4) | N/A |
| ★★★☆☆ | 5 | [📈 ロードマップ・PMF](#s5) | 全面リニューアル実装計画あり |
| ★☆☆☆☆ | 6 | [⚖️ Exit・法的リスク](#s6) | 特定商取引法・プライバシーページのみ |
| ★★★★☆ | 7 | [🗺️ プロダクト設計](#s7) | /[locale]/構造・全ページ構成確定 |
| ★★★★☆ | 8 | [⚙️ 技術・データ設計](#s8) | next-intl・新デザインシステム・DBスキーマ変更確定 |
| ★★★☆☆ | 9 | [📣 GTM・集客・エコシステム](#s9) | インフラ・SEO設定完備 |
| ★★★★☆ | 10 | [🖥️ 運用・組織・実装ルール](#s10) | 2言語対応コーディング規約追加 |
| ★★★☆☆ | 11 | [📚 リソース一覧](#s11) | next-intl追加 |

⚠️ **要強化セクション**: 4 財務 / 6 Exit

---

## <a id="s1"></a>1. 🎯 事業概要・市場機会

- **法人**: Paradigm合同会社
- **プロダクト**: paradigmjp.com — Paradigm公式コーポレートHP（2言語サイト・全面リニューアル）
- **ドメイン管理**: ラッコドメイン → Cloudflare DNS
- **サーバー**: DigitalOcean（Coolifyセルフホスト）— appexx.meと同一サーバー（IP: 139.59.250.5）
- **Git**: `Paradigmllc/Paradigm-HP`（main ブランチ）

### 2言語サイト設計（確定）

| | `/ja` | `/en` |
|--|-------|-------|
| **ターゲット** | 全国の日本SMB・個人事業主（業種不問） | 日本進出を検討する海外SMB・個人事業主 |
| **大企業** | 含まない | 含まない |
| **コンセプト** | 全国展開・温かみ・数値実績・信頼 | "Your local digital partner in Japan" |
| **コンテンツ** | 完全独立（翻訳ではない別設計） | 完全独立（翻訳ではない別設計） |
| **ブログ** | 日本語・日本向け内容 | 英語・Japan business tips（完全別記事） |

### サービス構成

**`/ja` サービス（4本）**: Web制作 / MEO対策 / SEO・GEO対策 / AI導入支援

**`/en` サービス**: Japan Entry Package（メイン）+ サブサービス複数
→ Japan Entry Packageは複数サービスをバンドルしたパッケージ商品

---

## <a id="s2"></a>2. 🏆 競合・差別化

### `/en` ポジショニング

**Japan Entry Package** は「外国企業が日本でデジタルプレゼンスを構築する際に必要なものをすべてバンドルした唯一のパッケージ」として差別化。

競合が持たない優位性:
- 日本語・英語バイリンガル対応のプロジェクト進行
- 日本固有のデジタル環境（MEO・LINE・Yahoo! Japan）への精通
- 小規模〜中規模向けの現実的な価格帯（USD）

> `/ja` の競合分析: 将来LP強化時に記入

---

## <a id="s3"></a>3. 💰 ビジネスモデル

### `/ja` 料金体系

- **通貨**: JPY（日本円）
- **構造**: 月額顧問 + プロジェクト型（Web制作・MEO・SEO・AI導入）
- **プラン**: 4サービス×3プラン（Supabase `cms_pricing` locale='ja' で管理）

### `/en` 料金体系（確定）

- **通貨**: USD固定（JPY併記なし）
- **メインプロダクト**: Japan Entry Package（3段構成）

| プラン | 想定価格帯 | 内容 |
|--------|----------|------|
| Starter | ~$499/mo | 基本的な日本向けデジタルプレゼンス構築 |
| Growth | ~$999/mo | フルパッケージ（Web+SEO+MEO管理） |
| Enterprise | ~$1,999/mo | Growth + AI自動化 + 専任サポート |

> 価格は実装時に確定・Supabase `cms_pricing` locale='en' currency='usd' で管理

### リード獲得導線

- `/ja`: `/ja/contact` フォーム → Slack通知 + Supabase leads保存 → Twenty CRM
- `/en`: `/en/contact` フォーム + Cal.com「Book a free 30-min call in English」直結

---

## <a id="s4"></a>4. 📊 財務計画・KPI

> N/A（コーポレートHP。KPIはUmami analytics.appexx.meで計測）

---

## <a id="s5"></a>5. 📈 ロードマップ・PMF

### 全面リニューアル実装計画

#### Phase 1: 基盤（i18n + デザインシステム）
- [ ] next-intl導入（`/[locale]/` ルーティング）
- [ ] middleware.ts（locale自動振り分けロジック — **Q5未確定、下記参照**）
- [ ] globals.css 新デザイントークン適用（Warm Modern Tech）
- [ ] フォント設定（/ja: Noto Sans JP、/en: Plus Jakarta Sans or Inter）
- [ ] CMSテーブルに `locale` カラム追加（Supabase migration）

#### Phase 2: `/ja` 全面リニューアル
- [ ] トップページ（Warm Modern Tech デザイン）
- [ ] 全サービスページリニューアル
- [ ] Aboutページ（チーム写真セクション追加）
- [ ] 実績ページ（before/after + クライアント顔写真）
- [ ] ブログ（日本語専用コンテンツ）

#### Phase 3: `/en` 新規構築
- [ ] トップページ（"Your local digital partner in Japan"）
- [ ] Japan Entry Package ページ
- [ ] サブサービスページ群
- [ ] 英語ブログ（完全別コンテンツ）
- [ ] `/en/contact`（Cal.com連携 English booking）
- [ ] `/en/faq`（外国人向けQ&A）

#### Phase 4: SEO・インフラ整備
- [ ] hreflang タグ（/ja ↔ /en）
- [ ] locale別サイトマップ
- [ ] Umami Website ID設定
- [ ] Lighthouse CI自動化

### middleware ロジック（確定）

```
/ アクセス時の振り分けフロー:
  1. Cookie に locale_preference があればそれを優先
  2. なければ accept-language ヘッダーで自動判定（ja → /ja、その他 → /en）
  3. フッターの言語スイッチャー押下 → Cookie 保存 + リダイレクト
  ※ ヘッダーには言語スイッチャーなし（フッターのみ）
  ※ URL /ja /en はユーザーには基本的に意識させない設計
```

---

## <a id="s6"></a>6. ⚖️ Exit・法的リスク

- **特定商取引法**: `/ja/legal` ページ実装済み（9条）
- **プライバシーポリシー**: `/ja/privacy` ページ実装済み
- **`/en` 法的ページ**: `/en/legal` `/en/privacy` 英語版を新規作成必要
- **お問い合わせフォーム**: 個人情報取り扱い同意チェックボックス追加が必要

> Exit戦略: N/A（コーポレートHP）

---

## <a id="s7"></a>7. 🗺️ プロダクト設計

### ルート構造（確定）

```
/                      → middleware で /ja or /en に振り分け
/ja/                   ← 日本語トップ（完全リニューアル）
/ja/about
/ja/services
/ja/services/web
/ja/services/meo
/ja/services/seo
/ja/services/ai
/ja/pricing
/ja/works
/ja/blog
/ja/blog/[slug]        ← 日本語専用記事
/ja/contact
/ja/faq
/ja/legal
/ja/privacy
/ja/lp/web             ← LP群
/ja/lp/meo
/ja/lp/seo
/ja/lp/ai
/ja/p/[slug]           ← 顧客向け提案ページ

/en/                   ← 英語トップ（完全別設計）
/en/about
/en/services
/en/services/japan-entry-package  ← メイン
/en/services/web
/en/services/seo
/en/services/ai
/en/pricing            ← USD表示
/en/works              ← 英語対応可の事例のみ
/en/blog
/en/blog/[slug]        ← 英語専用記事（/jaとは別コンテンツ）
/en/contact            ← Cal.com English booking
/en/faq                ← 外国人向けQ&A
/en/legal              ← English legal page
/en/privacy            ← English privacy policy

/admin/                ← locale非依存（日英両方を管理）
/api/                  ← locale非依存
/p/[slug]              ← 提案ページ（locale非依存）
```

### フォルダ構成（リニューアル後）

```
paradigmjpcom/
├── CLAUDE.md
├── middleware.ts              ← locale振り分け（next-intl）
├── i18n/
│   └── routing.ts             ← locales: ['ja', 'en'], defaultLocale: 'ja'
├── messages/
│   ├── ja.json                ← /ja 共通UI文言（ナビ・フッター等）
│   └── en.json                ← /en 共通UI文言
├── package.json / tsconfig.json / next.config.ts
├── src/
│   ├── app/
│   │   ├── globals.css        ← 新デザイントークン（Warm Modern Tech）
│   │   ├── [locale]/          ← locale動的ルート（next-intl）
│   │   │   ├── layout.tsx     ← locale別レイアウト（lang属性・フォント切替）
│   │   │   ├── page.tsx       ← トップページ（locale別コンポーネント呼び出し）
│   │   │   ├── about/
│   │   │   ├── services/
│   │   │   │   └── [slug]/
│   │   │   ├── pricing/
│   │   │   ├── works/
│   │   │   ├── blog/
│   │   │   │   └── [slug]/
│   │   │   ├── contact/
│   │   │   ├── faq/
│   │   │   ├── legal/
│   │   │   ├── privacy/
│   │   │   └── lp/            ← /ja のみ
│   │   ├── admin/             ← locale非依存
│   │   ├── api/               ← locale非依存
│   │   ├── p/[slug]/          ← 提案ページ（locale非依存）
│   │   ├── sitemap.ts         ← locale別サイトマップ
│   │   └── robots.ts
│   ├── components/
│   │   ├── Header.tsx         ← locale対応（言語切替ボタン含む）
│   │   ├── Footer.tsx         ← locale対応
│   │   ├── PageHero.tsx
│   │   ├── DifyChatbot.tsx
│   │   ├── SiteWrapper.tsx
│   │   ├── ja/                ← /ja 専用コンポーネント
│   │   └── en/                ← /en 専用コンポーネント
│   └── lib/
│       ├── data.ts            ← /ja フォールバックデータ
│       ├── data-en.ts         ← /en フォールバックデータ（新規）
│       ├── blog.ts
│       ├── jsonld.ts          ← locale対応JSON-LD
│       └── supabase.ts
└── public/
    ├── images/
    │   ├── team/              ← チーム写真
    │   └── clients/           ← クライアント写真
```

### APIエンドポイント

- `POST /api/contact` — お問い合わせ（locale判定でSlack通知文言切替 + Supabase leads保存）
- `GET/POST/PATCH/DELETE /api/admin/*` — 管理CRUD（locale指定パラメータ追加）

---

## <a id="s8"></a>8. ⚙️ 技術・データ設計

### 技術スタック

| レイヤー | 使用ツール |
|---|---|
| フレームワーク | Next.js 15（App Router）+ TypeScript + Tailwind CSS v4 |
| **i18n** | **next-intl**（`/[locale]/` App Router対応） |
| フォント `/ja` | Noto Sans JP (300-800ウェイト、Google Fonts) |
| フォント `/en` | Plus Jakarta Sans or Inter（Google Fonts）|
| アニメーション | framer-motion |
| アイコン | lucide-react |
| UI | shadcn/ui互換 + Radix UI + Sonner (Toast) |
| フォーム | React Hook Form + Zod |
| 状態管理 | TanStack Query + Zustand |
| CMS | カスタム管理ダッシュボード（/admin）— locale別タブ切替 |
| データベース | Supabase（appexxと同一プロジェクト yihdmgtxiqfdgdueolub） |
| ホスト | Coolify（同一サーバー: 139.59.250.5） |
| DNS | Cloudflare |
| CI/CD | GitHub Actions → Coolify Webhook（private repo対応） |

### デザインシステム（新・確定）

**コンセプト**: Warm Modern Tech — カラフル・実在人物写真・温かみのあるモダンテック

参照ブランド: Loom / Notion / Figma / Intercom

#### カラーパレット

```css
@theme {
  /* ── Backgrounds ──────────────────── */
  --color-bg-base:     #FAFAF7;   /* ウォームオフホワイト */
  --color-bg-card:     #FFFFFF;
  --color-bg-ink:      #0D1117;   /* ダークセクション */

  /* ── Brand ────────────────────────── */
  --color-primary:     #1C1C2E;
  --color-accent:      #6366F1;   /* インディゴ */
  --color-accent-light:#818CF8;

  /* ── Warm Accents（新規）─────────── */
  --color-amber:       #F59E0B;   /* 温かみ・エネルギー */
  --color-coral:       #F97316;   /* 親しみ・CTAサブ */
  --color-teal:        #14B8A6;   /* AI・テック領域 */
  --color-rose:        #F43F5E;   /* 差し色 */

  /* ── Text ─────────────────────────── */
  --color-text:        #111827;
  --color-text-muted:  #6B7280;

  /* ── Surface（旧 #ffffff 純白から変更）*/
  --color-surface:     #FAFAF7;
}
```

#### フォント

| locale | フォント | 用途 |
|--------|---------|------|
| `/ja` | Noto Sans JP (300-800) | 本文・見出し全般 |
| `/en` | Plus Jakarta Sans (400-800) | 本文・見出し全般 |

#### セクション構成パターン（両locale共通ガイドライン）

```
Hero:         Meshグラデ（紫↔ティール↔アンバー）+ 実在人物写真
Social Proof: ウォームオフホワイト地 + クライアントロゴ
Services:     インク地（ダーク） + カラフルカード
Works:        ウォームオフホワイト地 + before/after + 顔写真
Team:         アンバー/コーラル系グラデ地 + 顔写真 + ひとこと
Blog:         ウォームオフホワイト地
CTA:          インディゴ↔ティールメッシュグラデ
```

#### 写真方針（確定）

- **フリー素材を使用**（Unsplash / Pexels / Pixabay 等）
- **⚠️ アニメ・漫画・イラスト素材は一切使用禁止。必ず実在人物の写真・動画のみ使用**
- スタイル: 典型的なストックフォトポーズを避け、自然・candid・作業感のあるものを厳選
- `/ja` 用: 日本人・アジア系・オフィス・対話・作業シーン
- `/en` 用: 多国籍・英語ビジネス・ラップトップ・カジュアルミーティングシーン
- ブログ著者写真: フリー素材の人物写真を使用
- 動画素材（ヒーロー背景等）: Pexels Videos 等のフリー動画も活用可

#### Difyチャットボット（locale別・確定）

| | `/ja` Bot | `/en` Bot |
|--|----------|----------|
| **言語** | 日本語 | 英語 |
| **学習内容** | 日本語版HP全ページ・サービス仕様・Docs・Supabase CMSデータ | 英語版HP全ページ・Japan Entry Package詳細・英語Docs |
| **共通学習** | Supabase テーブル構造・FAQ・料金・実績データ（最新を常時反映） | ← 同左 |
| **更新方法** | コンテンツ更新時にDifyナレッジベースを再インデックス（n8n自動化推奨） | ← 同左 |
| **配置** | 右下固定、デフォルト展開 | 右下固定、デフォルト展開 |

#### locale別トーン差分

| | `/ja` | `/en` |
|--|-------|-------|
| 第一印象 | 温かい・信頼・地に足がついた | グローバル・スタートアップ感・爽快 |
| アクセント主役 | アンバー＋インディゴ | ティール＋コーラル |
| 写真 | 日本的丁寧さ・対話感 | 多様な国籍・英語コミュニケーション |

### Supabase CMSテーブル（localeカラム追加）

| テーブル | 変更内容 |
|---------|---------|
| `cms_posts` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_services` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_pricing` | `locale TEXT DEFAULT 'ja'`, `currency TEXT DEFAULT 'jpy'` カラム追加 |
| `cms_faqs` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_works` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_settings` | `locale TEXT DEFAULT 'ja'` カラム追加 |

**マイグレーションSQL**:
```sql
ALTER TABLE cms_posts    ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_services ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_pricing  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja',
                         ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'jpy';
ALTER TABLE cms_faqs     ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_works    ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
```

**共有テーブル（appexx-dashboardと同一プロジェクト）**: `leads`（locale='ja'/'en' カラムで区別）

### 環境変数（Coolify設定）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yihdmgtxiqfdgdueolub.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(Coolify appexx-dashboardから参照)
SUPABASE_SERVICE_ROLE_KEY=(Coolify appexx-dashboardから参照)
NEXT_PUBLIC_SITE_URL=https://paradigmjp.com
NEXT_PUBLIC_COMPANY_NAME=Paradigm合同会社
ADMIN_PASSWORD=paradigm-admin-2025
NEXT_PUBLIC_UMAMI_WEBSITE_ID=(Umamiで新サイト追加後に設定)
```

---

## <a id="s9"></a>9. 📣 GTM・集客・エコシステム

### Coolify 設定

- **UUID**: `i12am4vvcbggefnqdizhnv9a`（Nixpacks/Next.js）
- **ドメイン**: `https://paradigmjp.com`, `https://www.paradigmjp.com`
- **ポート**: 3000
- **デプロイコマンド**: `curl -H "Authorization: Bearer {COOLIFY_TOKEN}" "https://coolify.appexx.me/api/v1/deploy?uuid=i12am4vvcbggefnqdizhnv9a&force=true"`

### Cloudflare 設定

- **Zone ID**: `f191afabddabaf1658ebfe79a9a9b723`
- **Aレコード**: paradigmjp.com → 139.59.250.5（Proxied）

### GitHub 設定

- **レポ**: `Paradigmllc/Paradigm-HP`
- **ブランチ**: `main`
- **CI/CD**: GitHub Actions `deploy.yml`

### appexx.meインフラとの共有接続

| リソース | 接続方法 |
|---|---|
| Supabase | 同一プロジェクト（yihdmgtxiqfdgdueolub）— cms_* テーブル locale列で分離 |
| 認証 | Authentik（authentik.appexx.me）— 将来OIDC連携予定 |
| LLM | https://appexx.me/api/studio/llm 経由 |
| Slack通知 | https://appexx.me/api/studio/notify 経由 |
| CRM | Twenty CRM（crm.appexx.me） |
| Cal.com | cal.appexx.me（/ja: 商談予約 / /en: English booking） |
| アナリティクス | Umami（analytics.appexx.me）— locale別Website ID推奨 |
| Ghost | ghost.appexx.me（ブログ記事 locale別管理） |
| Dify | dify.appexx.me（/ja: 日本語Bot / /en: English Bot 別設定推奨） |

### SEO設定

- **hreflang**: `<link rel="alternate" hreflang="ja" href="https://paradigmjp.com/ja/...">` + `hreflang="en"` 両方必須
- **サイトマップ**: locale別（`/sitemap.xml` でja/en両方を含む）
- **robots.txt**: `/api/` `/admin/` のみ Disallow
- **構造化データ**: Organization / Services / FAQ / BreadcrumbList / BlogPosting（JSON-LD、locale対応）
- **OGP**: locale別 `og:locale`（`ja_JP` / `en_US`）

---

## <a id="s10"></a>10. 🖥️ 運用・組織・実装ルール

### コーディング規約

> 📌 **全プロジェクト共通ルール（A〜TT等）はグローバル設定 `~/.claude/CLAUDE.md` に定義済み。**

1. **`/ja` UIテキスト**: 日本語で統一
2. **`/en` UIテキスト**: 英語で統一（日本語混在禁止）
3. **コンポーネント分離**: `/ja` 専用は `components/ja/`、`/en` 専用は `components/en/`、共通は `components/`
4. **デザイン**: Warm Modern Tech（カラフル・実在人物写真・温かみのあるモダンテック）
5. **写真**: ストックフォト禁止。Paradigm実際のメンバー・クライアントのみ
6. **アニメーション**: framer-motion を品よく使用（過度な演出NG）
7. **レスポンシブ**: モバイルファースト、`sm:` `md:` `lg:` 必ず設定
8. **Core Web Vitals**: Lighthouse 90+ を目標
9. **SEO**: hreflang・構造化データ・OGP・サイトマップ — 全ページ必須
10. **画像**: `next/image` + WebP + 適切なサイズ指定
11. **appexxインフラAPI**: サーバーサイド（Route Handler）から実行
12. **コンテンツ**: DB優先（cms_* locale指定クエリ）、`src/lib/data.ts` / `data-en.ts` はフォールバック
13. **デプロイ**: git push → GitHub Actions → Coolify Webhook 自動デプロイ
14. **変更後**: ① CLAUDE.md更新 → ② git commit+push → ③ URL確認

### 管理ダッシュボード（/admin）

| 項目 | 内容 |
|-----|------|
| 認証方式 | 環境変数 `ADMIN_PASSWORD` + Cookie `paradigm_admin_token` |
| **locale切替** | **管理画面に「日本語 / English」タブを追加（locale別コンテンツ管理）** |
| ダッシュボード | 記事数/サービス数/問い合わせ数（locale別表示） |
| ブログ管理 | locale別記事CRUD（/ja と /en は完全別コンテンツ） |
| 料金管理 | locale別プラン管理（/en はUSD表示） |

### 実装済み機能（リニューアル前の現状）

- ✅ トップページ（リニューアル対象）
- ✅ 全サービスページ（リニューアル対象）
- ✅ LP 4ページ（`/ja/lp/*` に移動）
- ✅ ブログ（locale対応リニューアル対象）
- ✅ お問い合わせフォーム
- ✅ OGP画像
- ✅ 構造化データ（hreflang追加必要）
- ✅ サイトマップ（locale別対応必要）
- ✅ 管理ダッシュボード（locale切替タブ追加必要）
- ✅ Difyチャットボット
- ✅ 提案ページ `/p/[slug]`

---

## <a id="s11"></a>11. 📚 リソース一覧

#### フロントエンド・フレームワーク
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Next.js 15 (App Router) | フルスタックReactフレームワーク | https://nextjs.org |
| TypeScript | 型安全JavaScript | https://www.typescriptlang.org |
| Tailwind CSS v4 | ユーティリティCSSフレームワーク | https://tailwindcss.com |
| **next-intl** | **i18n・/[locale]/ルーティング** | **https://next-intl-docs.vercel.app** |
| Noto Sans JP | 日本語Webフォント（/ja） | https://fonts.google.com/noto/specimen/Noto+Sans+JP |
| Plus Jakarta Sans | 英語Webフォント（/en 候補） | https://fonts.google.com/specimen/Plus+Jakarta+Sans |

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
| Cal.com | 商談予約（cal.appexx.me、/en English booking兼用） | https://cal.com |
| Formbricks | フォーム・アンケート（forms.appexx.me） | https://formbricks.com |
| Ghost | ブログCMS（ghost.appexx.me、locale別管理） | https://ghost.org |
| Resend | トランザクションメール送信（未設定） | https://resend.com |
| Dify | AIチャットボット（dify.appexx.me、locale別Bot・HP/Docs/Supabase学習） | https://dify.ai |
| Unsplash | フリー人物写真素材（/ja・/en ビジュアル用） | https://unsplash.com |
| Pexels | フリー写真・動画素材（ヒーロー動画背景等） | https://www.pexels.com |

#### SEO・GEO
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Google Search Console | 検索流入・インデックス管理 | https://search.google.com/search-console |
| Google Analytics 4 | トラフィック計測 | https://analytics.google.com |
| Bing Webmaster Tools | Bing/ChatGPT向けインデックス | https://www.bing.com/webmasters |

#### 法令・規制（コンプライアンス参照）
| 機関/法令 | 内容 | URL |
|----------|------|-----|
| 消費者庁 特定商取引法 | 通販・メール営業の規制（/ja/legal 対応済み） | https://www.no-trouble.caa.go.jp |
| 個人情報保護委員会 | 個人情報保護法（/ja/privacy 対応済み） | https://www.ppc.go.jp |
| 総務省 特定電子メール法 | 営業メール・オプトアウト義務 | https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/anti_spam.html |

#### 参考リンク・ドキュメント
| タイトル | 内容 | URL |
|---------|------|-----|
| Next.js Docs | App Router・Metadata・sitemap APIリファレンス | https://nextjs.org/docs |
| next-intl Docs | App Router i18nセットアップ | https://next-intl-docs.vercel.app/docs/getting-started/app-router |
| Supabase Docs | RLS・Auth・Storage APIリファレンス | https://supabase.com/docs |
| Coolify Docs | セルフホストデプロイ設定 | https://coolify.io/docs |
| Google JSON-LD | 構造化データリファレンス | https://developers.google.com/search/docs/appearance/structured-data |
| Tailwind v4 Docs | @themeブロック・CSS変数リファレンス | https://tailwindcss.com/docs |
