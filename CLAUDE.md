# Paradigm HP — Claude Code プロジェクトコンテキスト

## 📊 進捗ダッシュボード（目次）

| 進捗 | # | セクション | 状態メモ |
|------|---|-----------|---------|
| ★★★★☆ | 1 | [事業概要・市場機会](#s1) | 2言語サイト設計確定（/ja日本向け・/en海外向け） |
| | | [s1-1 2言語サイト設計](#s1-1) | |
| | | [s1-2 サービス構成](#s1-2) | |
| ★★☆☆☆ | 2 | [競合・差別化](#s2) | Japan Entry Packageポジション記載あり |
| | | [s2-1 /en ポジショニング](#s2-1) | |
| | | [s2-2 /ja 競合分析](#s2-2) | |
| ★★★☆☆ | 3 | [ビジネスモデル](#s3) | /ja JPY・/en USD確定・Japan Entry Package設計確定 |
| | | [s3-1 /ja 料金体系](#s3-1) | |
| | | [s3-2 /en 料金体系](#s3-2) | |
| | | [s3-3 リード獲得導線](#s3-3) | |
| ☆☆☆☆☆ | 4 | [財務計画・KPI](#s4) | N/A |
| | | [s4-1 KPI計測](#s4-1) | |
| | | [s4-2 アナリティクス](#s4-2) | |
| ★★★☆☆ | 5 | [ロードマップ・PMF](#s5) | 全面リニューアル実装計画あり |
| | | [s5-1 全面リニューアル実装計画](#s5-1) | |
| | | [s5-2 middleware ロジック](#s5-2) | |
| ★☆☆☆☆ | 6 | [Exit・法的リスク](#s6) | 特定商取引法・プライバシーページのみ |
| | | [s6-1 法的ページ一覧](#s6-1) | |
| | | [s6-2 /en 法的対応](#s6-2) | |
| ★★★★☆ | 7 | [プロダクト設計](#s7) | /[locale]/構造・全ページ構成確定 |
| | | [s7-1 ルート構造](#s7-1) | |
| | | [s7-2 フォルダ構成](#s7-2) | |
| | | [s7-3 APIエンドポイント](#s7-3) | |
| ★★★★☆ | 8 | [技術・データ設計](#s8) | next-intl・新デザインシステム・DBスキーマ変更確定 |
| | | [s8-1 技術スタック](#s8-1) | |
| | | [s8-2 デザインシステム](#s8-2) | |
| | | [s8-3 Supabase CMSテーブル](#s8-3) | |
| | | [s8-4 環境変数](#s8-4) | |
| ★★★★☆ | 9 | [GTM・集客・エコシステム](#s9) | インフラ・SEO+コールドアウトリーチ設計追加 |
| | | [s9-1 Coolify設定](#s9-1) | |
| | | [s9-2 Cloudflare設定](#s9-2) | |
| | | [s9-3 appexxインフラ共有接続](#s9-3) | |
| | | [s9-4 SEO設定](#s9-4) | |
| | | [s9-5 コールドアウトリーチ戦略](#s9-5) | |
| ★★★★☆ | 10 | [運用・組織・実装ルール](#s10) | 2言語対応コーディング規約追加 |
| | | [s10-1 コーディング規約](#s10-1) | |
| | | [s10-2 管理ダッシュボード](#s10-2) | |
| | | [s10-3 実装済み機能](#s10-3) | |
| ★★☆☆☆ | 11 | [経費・収益シミュレーション](#s11) | HP診断→リニューアル提案の収益試算追加 |
| | | [s11-1 固定費表](#s11-1) | |
| | | [s11-2 収益シミュレーション](#s11-2) | |
| | | [s11-3 損益分岐シナリオ](#s11-3) | |
| ☆☆☆☆☆ | 12 | [ドメイン・アカウント・商標・ライセンス](#s12) | 未着手 |
| | | [s12-1 ドメイン一覧](#s12-1) | |
| | | [s12-2 アカウント一覧](#s12-2) | |
| | | [s12-3 商標・特許・ライセンス](#s12-3) | |
| ★★★☆☆ | 13 | [リソース一覧](#s13) | next-intl追加 |
| | | [s13-1 フロントエンド・フレームワーク](#s13-1) | |
| | | [s13-2 UI・コンポーネント](#s13-2) | |
| | | [s13-3 データベース・BaaS](#s13-3) | |
| | | [s13-4 インフラ・ホスティング](#s13-4) | |
| | | [s13-5 マーケティング・CRM・分析](#s13-5) | |
| | | [s13-6 SEO・GEO](#s13-6) | |
| | | [s13-7 法令・規制](#s13-7) | |
| | | [s13-8 参考リンク・ドキュメント](#s13-8) | |

⚠️ **要強化セクション**: 4 財務 / 6 Exit / 11 経費 / 12 ドメイン・アカウント

---

## <a id="s1"></a>1. 🎯 事業概要・市場機会

- **法人**: Paradigm合同会社
- **プロダクト**: paradigmjp.com — Paradigm公式コーポレートHP（2言語サイト・全面リニューアル）
- **ドメイン管理**: ラッコドメイン → Cloudflare DNS
- **サーバー**: DigitalOcean（Coolifyセルフホスト）— appexx.meと同一サーバー（IP: 139.59.250.5）
- **Git**: `Paradigmllc/Paradigm-HP`（main ブランチ）

<a id="s1-1"></a>

### 2言語サイト設計（確定）

| | `/ja` | `/en` |
|--|-------|-------|
| **ターゲット** | 全国の日本SMB・個人事業主（業種不問） | 日本進出を検討する海外SMB・個人事業主 |
| **大企業** | 含まない | 含まない |
| **コンセプト** | 全国展開・温かみ・数値実績・信頼 | "Your local digital partner in Japan" |
| **コンテンツ** | 完全独立（翻訳ではない別設計） | 完全独立（翻訳ではない別設計） |
| **ブログ** | 日本語・日本向け内容 | 英語・Japan business tips（完全別記事） |

<a id="s1-2"></a>

### サービス構成

**`/ja` サービス（8本+）** — 3カテゴリに分類

| カテゴリ | サービス | slug |
|---------|---------|------|
| **制作系** | Web制作（コーポレートサイト） | `web` |
| | LP制作 | `lp` |
| | EC（ECサイト構築） | `ec` |
| | 広告クリエイティブ制作 | `creative` |
| **集客・マーケ系** | MEO対策 | `meo` |
| | SEO・GEO対策 | `seo` |
| **AI・SaaS系** | AI導入支援 | `ai` |
| | 業界別バーティカルSaaS | `saas` |

> 「など」のため追加サービスは随時追加可能。CMSで動的管理。

**`/en` サービス**: Japan Entry Package（メイン）+ サブサービス複数
→ Japan Entry Packageは複数サービスをバンドルしたパッケージ商品

---

## <a id="s2"></a>2. 🏆 競合・差別化

<a id="s2-1"></a>

### `/en` ポジショニング

**Japan Entry Package** は「外国企業が日本でデジタルプレゼンスを構築する際に必要なものをすべてバンドルした唯一のパッケージ」として差別化。

競合が持たない優位性:
- 日本語・英語バイリンガル対応のプロジェクト進行
- 日本固有のデジタル環境（MEO・LINE・Yahoo! Japan）への精通
- 小規模〜中規模向けの現実的な価格帯（USD）

> `/ja` の競合分析: 将来LP強化時に記入

---

## <a id="s3"></a>3. 💰 ビジネスモデル

<a id="s3-1"></a>

<a id="s2-2"></a>

### `/ja` 料金体系

- **通貨**: JPY（日本円）
- **構造**: 月額顧問 + プロジェクト型
- **プラン**: 8本サービス×各3プラン（Supabase `cms_pricing` locale='ja' で管理）
- **サービスカテゴリ**: 制作系（web/lp/ec/creative）/ 集客・マーケ系（meo/seo）/ AI・SaaS系（ai/saas）

#### pPersonalize提案サービス（HP診断→リニューアル提案）

**市場データ（2025年調査）**:
- Web制作リニューアル平均¥131万・中央値¥81万（Web幹事）
- BtoB特化は¥151〜500万がボリュームゾーン（45.5%、ferret One）
- Paradigmのスイートスポット: **¥50〜300万**（市場中央値帯）

**3プラン構成**（各案件の規模に応じて提案）:

| プラン | 価格 | 内容 | 補助金適用 |
|--------|------|------|----------|
| Quick Fix | ¥50万 | 速度改善+モバイル最適化+SSL強化 | △（持続化補助金） |
| Standard Renewal ⭐ | ¥150万 | 全面刷新+Next.js+CMS+SEO再設計 | △ |
| AI搭載DXパッケージ | ¥200〜300万 | Standard+Dify AI機能+n8n自動化+多言語化 | ✅ AI機能部分に2/3補助（デジタル化・AI導入補助金） |

> 補助金適用詳細 → [knowhow-58 2026年補助金パッケージ再設計](~/.claude/knowledge/business-knowhow.md)

<a id="s3-2"></a>

### `/en` 料金体系（確定）

- **通貨**: USD固定（JPY併記なし）
- **メインプロダクト**: Japan Entry Package（3段構成）

| プラン | 想定価格帯 | 内容 |
|--------|----------|------|
| Starter | ~$499/mo | 基本的な日本向けデジタルプレゼンス構築 |
| Growth | ~$999/mo | フルパッケージ（Web+SEO+MEO管理） |
| Enterprise | ~$1,999/mo | Growth + AI自動化 + 専任サポート |

> 価格は実装時に確定・Supabase `cms_pricing` locale='en' currency='usd' で管理

<a id="s3-3"></a>

### リード獲得導線

- `/ja`: `/ja/contact` フォーム → Slack通知 + Supabase leads保存 → Twenty CRM
- `/en`: `/en/contact` フォーム + Cal.com「Book a free 30-min call in English」直結

---

## <a id="s4"></a>4. 📊 財務計画・KPI

<a id="s4-1"></a>

> KPIはUmami analytics.appexx.meで計測

<a id="s4-2"></a>

> N/A（コーポレートHP）

---

## <a id="s5"></a>5. 📈 ロードマップ・PMF

<a id="s5-1"></a>

### 全面リニューアル実装計画

<a id="s8-2"></a>

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

<a id="s5-2"></a>

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

<a id="s6-1"></a>

- **特定商取引法**: `/ja/legal` ページ実装済み（9条）
- **プライバシーポリシー**: `/ja/privacy` ページ実装済み

<a id="s6-2"></a>

- **`/en` 法的ページ**: `/en/legal` `/en/privacy` 英語版を新規作成必要
- **お問い合わせフォーム**: 個人情報取り扱い同意チェックボックス追加が必要

> Exit戦略: N/A（コーポレートHP）

---

## <a id="s7"></a>7. 🗺️ プロダクト設計

<a id="s7-1"></a>

### ルート構造（確定）

```
/                      → middleware で /ja or /en に振り分け
/ja/                   ← 日本語トップ（完全リニューアル）
/ja/about
/ja/services
/ja/services/web       ← 制作系
/ja/services/lp
/ja/services/ec
/ja/services/creative
/ja/services/meo       ← 集客・マーケ系
/ja/services/seo
/ja/services/ai        ← AI・SaaS系
/ja/services/saas
/ja/pricing
/ja/works
/ja/blog
/ja/blog/[slug]        ← 日本語専用記事
/ja/contact
/ja/faq
/ja/legal
/ja/privacy
/ja/lp/[slug]          ← 各サービスLP（動的・CMS管理）
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

<a id="s7-2"></a>

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

<a id="s7-3"></a>

### APIエンドポイント

- `POST /api/contact` — お問い合わせ（locale判定でSlack通知文言切替 + Supabase leads保存）
- `GET/POST/PATCH/DELETE /api/admin/*` — 管理CRUD（locale指定パラメータ追加）

---

## <a id="s8"></a>8. ⚙️ 技術・データ設計

<a id="s8-1"></a>

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

<a id="s8-3"></a>

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

<a id="s8-4"></a>

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

<a id="s9-1"></a>

### Coolify 設定

- **UUID**: `i12am4vvcbggefnqdizhnv9a`（Nixpacks/Next.js）
- **ドメイン**: `https://paradigmjp.com`, `https://www.paradigmjp.com`
- **ポート**: 3000
- **デプロイコマンド**: `curl -H "Authorization: Bearer {COOLIFY_TOKEN}" "https://coolify.appexx.me/api/v1/deploy?uuid=i12am4vvcbggefnqdizhnv9a&force=true"`

<a id="s9-2"></a>

### Cloudflare 設定

- **Zone ID**: `f191afabddabaf1658ebfe79a9a9b723`
- **Aレコード**: paradigmjp.com → 139.59.250.5（Proxied）

### GitHub 設定

- **レポ**: `Paradigmllc/Paradigm-HP`
- **ブランチ**: `main`
- **CI/CD**: GitHub Actions `deploy.yml`

<a id="s9-3"></a>

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

<a id="s9-4"></a>

### SEO設定

- **hreflang**: `<link rel="alternate" hreflang="ja" href="https://paradigmjp.com/ja/...">` + `hreflang="en"` 両方必須
- **サイトマップ**: locale別（`/sitemap.xml` でja/en両方を含む）
- **robots.txt**: `/api/` `/admin/` のみ Disallow
- **構造化データ**: Organization / Services / FAQ / BreadcrumbList / BlogPosting（JSON-LD、locale対応）
- **OGP**: locale別 `og:locale`（`ja_JP` / `en_US`）

<a id="s9-5"></a>

### コールドアウトリーチ戦略（需要創出フロー）

> フレームワーク詳細 → [knowhow-57 需要創出メカニズム](~/.claude/knowledge/business-knowhow.md) / フロー図: [`docs/artifacts/paradigm_demand_creation_flow.svg`](docs/artifacts/paradigm_demand_creation_flow.svg)

**4つの非対称性**で業界平均CVR（0.3〜1%）→ Paradigm方式（4〜8%）を実現:

| 非対称性 | 従来営業 | Paradigm方式 |
|---------|---------|------------|
| **時間** | 顧客が困った後に訪問 | 困る前に提案書が届いている |
| **情報** | 双方同じ情報量 | Paradigmだけが会社固有の機会損失額を保有 |
| **数字** | 「良くなります」（定性） | 「月¥280万損失」（定量・反論困難） |
| **姿勢** | 「契約してください」 | 「問題を発見しました」（医師の姿勢） |

**機会損失算出エンジン（技術設計）** — 公開情報のみ・完全合法:

| Layer | 主要ツール | 取得情報 |
|-------|-----------|---------|
| L1 パッシブ観測 | Wappalyzer / PageSpeed API / SSL Labs / Mozilla Observatory / crt.sh | 技術スタック/Core Web Vitals/TLS評価/セキュリティヘッダ/サブドメイン |
| L2 標準アクセス | Lighthouse CI / SimilarWeb API | パフォーマンス詳細/流入推定 |
| L3 金額変換 | DeepSeek V3 + Context Caching | 業種別CVR×客単価×損失量=機会損失額（90%OFFで大量処理） |

**金額変換ロジック**（Google公表データ+SimilarWeb推定値使用）:
- 表示速度: LCP 1秒遅延 → 離脱率+32% × 流入数 × 業種CVR × 平均客単価
- モバイル未対応: モバイル流入60〜70% × CVR 1/3低下 × 客単価
- SEO損失: 現在流入 vs 業種平均流入の差分 × CVR × 客単価

**HOT Lead Detection** — 閲覧タイミングを逃さない:
- トリガー: `/p/[slug]` 3回以上閲覧 / 特定セクション5分以上滞在 / CTAクリック
- アクション: Slack #all-paradigm 即時通知 → **5分以内に電話**
- 根拠: Harvard Business Review — 5分以内フォローアップで成約率10倍

**Step4: スコアリング＋レポート自動生成**（L1〜L3データを統合）:
- DeepSeek V3（Context Caching）でJSON→機会損失額・危険度スコアに変換
- Puppeteer or `@react-pdf/renderer` で「〇〇社様向け：Webシステム老朽化・機会損失診断レポート」を自動PDF出力
- 1ページ目: 機会損失額・危険度（信号色）・補助金後実質負担額・投資回収期間のエグゼクティブサマリー（経営者が3秒で決断できる設計）
- 2ページ目以降: Wappalyzer/Shodan/LighthouseのRAWエビデンス

**⚠️ 法的リスク（パッシブ vs アクティブスキャン）**:
- ✅ **合法（パッシブ）**: Lighthouse API（通常アクセスと同じ） / Wappalyzer CLI（ソースコード読取） / Shodan API（既収集データの検索）
- ❌ **危険（グレー〜ブラック）**: Nmap/Nucleiで相手サーバーに直接大量パケット送信 → 不正アクセス禁止法抵触リスク
- 推奨: Shodan過去データ + Lighthouse表示速度の組み合わせだけで十分な痛み可視化が可能

**コールドメール黄金構成（4ステップ）**:
1. **パーソナライズ挨拶**: 「御社のサービスを実際に使ってみたのですが〜」（テンプレ感を消す）
2. **権威データ+痛みの提示**: Google/経産省/Baymard等の第三者データを主語にしてリアクタンス回避（「御社が悪い」→「市場環境として〇〇が起きている」）
3. **当事者意識への変換**: 「外部ツールで御社を簡易計測したところ、月間約〇万円の機会損失が出ている可能性がございます」
4. **救世主の提案**: 具体的な改善ポイントをまとめた3分で読めるURL（`/p/[slug]`）を提示

**技術的負債→補助金コスト逆転クロージング**（部分改修→フルリニューアルへの誘導）:
- Step1「シロアリの家」比喩: 「表面の壁紙だけ張り替えても基礎のシロアリは消えない。継ぎ接ぎで毎年〇〇万円が消える」
- Step2 コストの逆転現象: 「部分改修100万円（自費）< フルリニューアル300万円の補助金後75万円（国が2/3負担）」→高額案件の方が安くなる逆転提示
- Step3 利得フレームは最後: 痛みを消してから初めてAI・MA等の新機能を語る（最初から語ると売り込みになる）
- **主治医ポジション確立**: このフロー全体を通じて「単なる業者」→「利益の漏れを止める主治医（パートナー）」へ昇格 = コンペ回避・特命受注の構造

**メールフォーマット鉄則**:
- テキスト中心（HTML・画像多用は「メルマガ感」→返信率低下）
- 添付ファイル初回NG（セキュリティフィルターで高確率ブロック・2通目以降OK）
- URLは独立行に配置（前後に空行）
- 余白（最大3行/段落）・箇条書き・太字1〜2箇所・記号（■▼【】）でテキストのままプロ感を演出

**技術データ→費用対効果変換ロジック（3計算式）**:
- **CVR損失（PageSpeed→売上損失）**: LCPが1秒遅い毎にCVR 7%低下（Google研究）→ `現在LCP値 × 月間セッション数 × 平均客単価 × 7%` = 年間機会損失〇〇万円。「表示速度3.2秒」→「年間推定損失83万円」のように技術スコアを金額に直訳
- **脆弱性リスク額（CVE→賠償リスク）**: Shodan検出のCVE CVSSスコア × 中小企業向けサイバーリスク賠償目安（経産省基準1,500〜2,400万円）= 「放置コスト」。Port 3389 open（CVSS 9.8）→「賠償2,400万円が顕在リスクとして存在」
- **工数削減額（技術スタック→開発コスト）**: Wappalyzer検出の旧技術スタック（PHP5/jQuery1.x/CodeIgniter2等）は最新比1.5〜2倍の開発工数→年間エンジニア工数ロス × 時給換算 = 「技術的負債〇〇万円/年」で経営者言語化

**キラーフレーズテンプレート**（DeepSeek V3で自動生成・件名〜本文で使用）:
- 件名: 「【無料診断結果】御社Webサイトで月間〇〇万円の機会損失が確認されました」
- 件名: 「【重要】御社のセキュリティ診断でCVSSスコア9.2の脆弱性を検知しました」
- 冒頭: 「業種・従業員規模が類似する〇〇社のWebリニューアル事例をまとめた3分レポートを作成しました」（第三者事例→リアクタンス回避）
- ROI提示: 「補助金適用後の実質負担は〇〇万円。現在の月間機会損失〇〇万円から算出すると〇ヶ月で完全回収が見込まれます」
- CTA: 「詳細はこちら（3分で読めます）→ https://paradigmjp.com/p/[company-slug]」

**予約システム別解剖ポイント（リプレイスターゲットマップ）**:

| ターゲットシステム | URLパターン検知 | 突きつける痛み |
|---|---|---|
| ホットペッパービューティー | `beauty.hotpepper.jp` | プラットフォーム税（高額掲載料）+ 顧客データが自社に残らない |
| AirReserve | `airreserve.net` | 汎用UIで高級感を毀損 + 予約導線のUX離脱 |
| Reservia | リンクスキャン | SNSからの導線が重い + Instagram予約連携の不整合 |
| STORES予約（Coubic） | `coubic.com` | 美容特有の「指名+メニュー組み合わせ」に不向き |
| EPARK | `epark.jp` / `mitsuraku.jp` | 予約画面が広告だらけで重い + ブランド毀損 |
| DentNet/アポデント | URLパターン特定 | 患者側UXが二の次 + キャンセル率高い |
| 自社開発・オンプレ | SSL未対応/スマホ崩れ | 技術的負債 + スマホ予約不可 + 補助金でゼロ円移行提案 |

**業種別3解剖ポイント＋ROIロジック**:
- **予約離脱（カゴ落ち）**: Lighthouse + スマホ実測。完了まで5ステップ + 表示3秒超→30〜40%が離脱。「月間〇件の新規予約取りこぼし × 客単価」で損失額を提示
- **電話対応・機会損失**: 夜間テストコール or 営業時間データで「24時間AIチャットボット未導入＝夜間予約ゼロ」を可視化。受付スタッフ1人分の人件費（月〇〇万円）削減効果と合算
- **リピート率・休眠顧客**: SNS更新頻度 + LINE連携有無で「溜めるだけの顧客名簿」を特定。AI自動追客で年間LTV〇〇万円底上げのシミュレーション提示

**ニッチ業界攻略（ペット葬儀/墓/造園/特殊清掃/旅館等）**:
- 攻略原則: 「ITの専門家が自分の業界に興味を持ってくれること自体が珍しい」→業界特化データ×個別診断のセットで返信率爆発
- テンプレ: 「ペット葬儀業界に特化した機会損失診断を行いました。〇〇様、夜間に亡くなった飼い主がスマホで検索した際、表示が〇秒遅いだけで競合に流れているデータが出ています…」
- 各業界の痛み: ペット葬儀（24時間即時性）/ 墓・石材（相続人（スマホ世代）リーチ失敗）/ 造園（施工実績の見せ方 + 概算見積もり即時化）/ 旅館（OTA手数料＝プラットフォーム税）

**APK解析詳細（アプリ診断の最強フック）**:
- **ハードコードAPIキー露出**: MobSFでAPK解析→FirebaseやAWSの管理キーがソースコードに直書きされているケースを特定→「外部から顧客データが抜き取られる致命的な欠陥」が最強キラーフレーズ。アプリ案件は1件数百万〜数千万円のため信頼獲得効果が絶大
- **過剰権限（Permissions）**: 業務に不要な権限要求を特定→「スパイウェア疑惑でインストール離脱率〇%増加」として提示
- **APK自動化フロー**: PlayストアURL入力→APK取得→MobSF静的解析→JSON抽出（脆弱性スコア/古いSDK/ハードコードキー）→ROIレポート自動生成。まずはストアメタデータ（最終更新日/レビューNLP）から始め、本格展開でMobSF Dockerコンテナを追加

**競合SaaSリプレイス（ホスタイル・リプレイス）フロー**:
- **フットプリント収集**: Wappalyzer/BuiltWith → サブドメインスキャン（`client.competitor-saas.com`）→ Google Dorking（`intext:"Powered by [競合名]"`）→ 競合事例ページスキャンで利用企業リスト自動生成
- **ワンクリック移行ゼロ宣言テンプレート**（レポート末尾自動挿入）: 「顧客データ・予約履歴100%自動変換 / スタッフ設定そのまま反映 / ダウンタイムほぼゼロ（夜間移行） / 並行運用3ヶ月無料 → 確認後に旧システム解約」。財務トドメ: 「(現状SaaS月額×12) > (弊社SaaS月額×12 + 補助金適用後初期費用)」の不等式を提示

**デジタルヘルスチェック提案パッケージ（診断→処方→手術）**:
1. **診断（無料・フロントエンド）**: Wappalyzer + Shodan + Lighthouse → 「総合スコア32点（レッドゾーン）」で痛みを見える化
2. **処方箋（提案）**: HP/EC/セキュリティのどこに致命的欠陥があるか解説 → 1枚エグゼクティブサマリー
3. **手術（受注・バックエンド）**: 補助金使って全て最新AI/SaaS環境へフルリプレイス

**ご近所デスマッチ自動化エンジン（Tavily × SerpApi × DeepSeek）**:
- **構成**: Tavily API（月1,000回無料・AI向け検索+コンテンツ抽出）+ SerpApi（月100回無料・Googleマップ Local Pack/検索順位）+ DeepSeek V3（Context Caching・JSON整理+レポート文生成）
- **処理フロー**: ①Tavily「地域×業種」検索→近隣ライバルURLをコンテンツ付きで一括取得（スクレイピング不要）②DeepSeek V3でJSON整理（数円）③Lighthouse/WhatWebで全社一括スキャン ④スコアランキング表+PDF自動生成
- **キラーフレーズ**: 「御社は横浜市内の同業10社のスマホ表示速度ランキングで**9位（ワースト2位）**です。1位のA社（○○院）が新患を毎月〇名刈り取っている間、御社のサイトは5秒の待機で患者が離脱しています」→近所の実名でプライドと恐怖を同時刺激
- **法的安全**: Lighthouseの客観スコア・SerpApiの実際の順位という「事実のみ」を使用。「遅い」は事実、「ダサい」はNG

**日本SMBリスト構築（Apollo代替・無料）**:
- BIZMAPS（月100件無料・170万社・タグ検索「SaaS導入積極的/代替わりしたばかり」）
- FUMA（160万社・無料・Pythonスクレイピング可）
- Apify Google Maps Scraper（月$5分無料・「横浜市 歯科」→店舗URL/電話/評価を一括CSV）
- Indeed/求人ボックス スクレイピング（求人中→予算あり×人手不足シグナル→「事務員採用より弊社AIが月5万で自動化」フック）
- お問い合わせフォームURL自動検知（Python: `contact`/`inquiry`/「お問い合わせ」リンクをURLリストからスキャン→フォーム一覧を生成）

**営業資料3点セット（DocSend / Notion / HP）**:
- **診断レポート（矛）**: 機会損失PDF自動生成 / Notion共有URL（Loom動画+FigmaプロトタイプDラフ埋め込み可）
- **商談資料（盾）**: DocSendでPDF配信→**ページ別滞在秒数/転送先追跡/後から差し替え**→料金ページ長時間閲覧を検知してエスパー追客（「料金プランでご不明点はありますか？」その日に電話）
- **自社HP（城）**: 診断後の必須身元調査をクリアする唯一の手段。paradigmjp.comが「地元の信頼できるパートナー」として認識されることで全アウトリーチ施策の成約率が底上げされる
- **注意**: Notionはリッチコンテンツに強いがPDF印刷レイアウト崩れあり→ITリテラシー低い地方SMBはPDF要求あり（DocSend推奨）

**Notion API自動提案ページ（一社一URL・10セクション構成）**:
- **自動化フロー**: Supabase/Google Sheetsのリードデータ → Make/n8n → Notion APIでマスターテンプレート複製 → 動的データ埋め込み → URL自動発行（メール/フォーム送付）→ DocSendまたはNotion共有リンクでトラッキング
- **10セクション構成**: ①ヘッダー（企業名・担当者名・診断スコア） ②HeyGen AIアバター動画（院長の画面操作解説1分） ③診断サマリー（Lighthouse/Wappalyzer/HaveIBeenPwned3指標） ④ご近所デスマッチ競合比較表（SerpApi近隣同業5社スコアランキング） ⑤財務シミュレーション（機会損失額・補助金後実質負担・投資回収期間） ⑥ソリューション提案（課題別処方箋+改善後モックアップ） ⑦同業種事例（実績・数字入り） ⑧サポート工程（14日ロードマップ） ⑨料金プラン（補助金適用で75万円〜・3プラン） ⑩CTA（Calendly直予約+フォーム+WhatsApp）
- **実装**: Python `notion-client` ライブラリ / Make Notionモジュール → テンプレートID複製 → ブロック毎にリードデータ差し込み → ページURLを自動メール送付

**IPトラッキング実装（DocSend開封＋HP訪問の瞬間を検知→即電話）**:
- **List Finder（リストファインダー）**: GA4連携で訪問企業のIPを法人名に逆引き→「どの会社が今日HPを見たか」をSlack通知→即電話。月額数万円〜。国内SMBトラッキングに特化
- **GA4＋逆引きIPカスタム実装**: `gtag` + `ipinfo.io API`（月50,000リクエスト無料）→ 企業名/業種/地域取得 → Supabaseに保存 → n8nでSlack通知（完全無料で構築可能）
- **発火タイミング**: DocSend料金ページ60秒以上閲覧 → 即Slack「🔥HOT: ○○株式会社が料金ページを90秒閲覧」→ 30分以内電話がアポ率最大化

**縦型PDF自動生成スタック（動的長文AIコンテンツ対応）**:
- **正解: HTML + Jinja2 + Playwright**（`page.pdf()`）— コンテンツ量変動に自動対応・`break-before: page`でページ分割制御・Tailwind CSS対応・日本語フォント対応・ChromiumレンダラーでCSS完全適用
- **Marpは不可**: スライド専用（横向き固定）→ 縦型長文診断書・提案資料には不向き（自動改ページ不可）
- **実装パイプライン**: DeepSeek V3でHTML生成（Jinja2テンプレ変数差し込み）→ Playwright Docker（serverless）→ `buffer`をSupabase Storageに保存 → DocSend/Notion埋め込みURL返却

**ヴァンパイア完全体6フェーズ（実装アーキテクチャ）**:

| フェーズ | 処理 | ツール | 出力 |
|---------|------|-------|------|
| ①抽出 | リスト収集 | FUMA/BIZMAPS/Apify Maps | 業種×地域CSV |
| ②診断 | 速度・技術・競合一括スキャン | Lighthouse CI / WhatWeb / DataForSEO / Tavily | スコアJSON |
| ③生成 | パーソナライズPDF/スライド生成 | DeepSeek V3（Context Caching）+ Slidev or HTML+Playwright | 提案資料URL |
| ④配信 | メール/フォーム一斉送信+開封追跡 | Instantly.ai / Gmail API + DocSend | 開封イベント |
| ⑤精査 | 料金ページ60秒閲覧→詳細資料自動生成 | SerpApi（競合順位）+ Shodan（脆弱性）+ HeyGen（AI動画） | 精密提案ページ |
| ⑥錬成 | 商談資料自動更新・Slack通知・電話 | DeepSeek + Notion MCP + Twilio / n8n | 確勝クロージング資料 |

**月総コスト目安**: 基本7,500〜18,000円 + メール配信5,000〜10,000円 + プロキシ2,000〜5,000円 = **総計15,000〜33,000円/月**（Apollo.io代替で完全自前構築の場合）

---

**Fake Loom全自動錬成パイプライン（Playwright + ComfyUI + FFmpeg）**:
- **音声主導アーキテクチャ**: TTS（ElevenLabsまたはXTTSv2）で音声ファイル生成→秒数取得→Playwrightに「〇秒かけてスクロール」を渡す（音声が先・画面が後）
- **Visual-Agnostic台本設計**: 「左にボタン」「上の青いバナー」などの画面指示語禁止。「ページが表示された後に〜」のように音声だけで成立する台本にする
- **3段合成フロー**:
  1. **Playwright**: ターゲットのHPを自動スクロール録画（`page.screenshot()` x n → FFmpegでmp4化）
  2. **ComfyUI（EchoMimic/LivePortrait）**: AI アバターに音声波形を食わせて口パク+瞬き自動生成（透過背景PNG連番）
  3. **FFmpeg PiP合成**: `ffmpeg -i screen.mp4 -i avatar.mp4 -filter_complex "[1]scale=240:240[av];[0][av]overlay=W-w-20:H-h-20" output.mp4`
- **ハイブリッド動画3分構成**: 冒頭15〜30秒（毎回生成・社名/URL読み上げ）→ 中盤1〜2分（テンプレ共通）→ 結び30秒（テンプレ共通）。`ffmpeg -i intro.mp4 -i middle.mp4 -i outro.mp4 -filter_complex concat=n=3:v=1:a=1 final.mp4`
- **「わざと不完全なAI」人間味ハック**: ElevenLabsでStability低下+[breath][chuckle]タグ追加→「完璧なCM」ではなく「手作り感のあるビデオレター」として処理される心理的効果

---

**DXパッケージ6種（Paradigm HP提供サービス・「月給5万円のAI社員派遣」として売る）**:

| # | パッケージ名 | 内容 | 価格目安 |
|---|------------|------|---------|
| ① | 営業DX | ヴァンパイアエンジン一式（リスト収集〜自動送信〜クロージング）| 初期50万+月10万 |
| ② | 顧客対応DX | Dify RAGチャットボット+LINE公式連携+Chatwoot | 初期30万+月5万 |
| ③ | 競合監視DX | 近隣ライバル毎朝LINE通知（Tavily+DeepSeek+LINE Bot）| 初期20万+月3万 |
| ④ | 採用DX | n8n求人票自動収集+Dify RAG面接シミュレータ | 初期30万+月5万 |
| ⑤ | 現場集客DX | LINE写真→DeepSeek Vision→WordPress自動公開 | 初期20万+月3万 |
| ⑥ | 教育継承DX | ベテラン職人AIクローン（Dify RAG+Whisper文字起こし）| 初期50万+月5万 |

**自作自演クロージング（最強デモ）**: ヴァンパイアエンジン自体でアプローチ→商談で「実はこのメールも提案資料もAIが自動生成しました」と種明かし→「このシステムを御社に導入します」がそのまま最強のデモになる

---

**脱SaaS MAスタック（Paradigm実装優先順）**:
- **Listmonk**（OSS Docker）: ステップメール配信基盤。1分数万通・開封率/クリック率をn8n Webhookで返却→Supabase自動更新。Airtable/ActiveCampaign不要
- **NocoDB**（Supabase上に重ねるGUI）: リード・提案書ステータスの管理画面。SQLを書かずにSupabaseを操作できるAirtable代替
- **LINE Messaging API直接接続**: Lステップ（月額¥2〜10万）不要→LINE Messaging API + n8n Webhook + Dify でステップ配信・シナリオ分岐・AI返信を月額ほぼゼロで実現
- **Meta Graph API直接接続**: ManyChat不要→Instagram DMの自動化をn8nから直接実行。コメントトリガー→パーソナライズFake LoomをDM送信
- **メール使い分け必須**: コールドメール=Smartlead（専用MTA・ドメイン評判分離）/ サンクス・通知メール=Resend（到達率高いがコールドで使用すると即BAN）

**ABテスト多次元同時化（n8n分岐設計）**:
- Supabase `ab_experiments` テーブル: `lead_id / variant_avatar / variant_tone / variant_channel / variant_price / opened_at / converted_at`
- n8n分岐ロジック: `Math.random() < 0.5 ? 'fear' : 'hope'` でトーンを自動振り分け→結果を即Supabaseに書き戻す
- 計測対象4変数: ①アバター（若女性/落ち着いた男性/本人） ②トーン（Fear vs Hope） ③媒体（LINE vs メール vs LinkedIn DM） ④価格（一括 vs サブスク）
- Notionダッシュボードまたはメタベース（OSS BI）でリアルタイム勝者バリアントを可視化

**LinkedIn架空アバター×HeyReach（海外SMB向け多垢運用）**:
- ComfyUIで生成した実写級プロ顔画像でSDRアバター垢を5〜10個作成（個人垢が攻めに有効・会社ページではない）
- HeyReach設定: 1垢=1専用レジデンシャルIP自動付与・ブラウザ指紋完全隔離・Unified Inbox。APIでn8nと接続し承認イベントをWebhookで受信
- **⚠️ 2026年3月 LinkedInがHeyReachを狙い撃ちBAN**: メイン垢は絶対繋がない。ステルス優先なら GoLogin+Smartproxy+n8n自作に切替
- ウォーミングアップ: 最初2週間はいいね/グループ参加のみ→その後つながり申請→承認後Fake Loom自動DM→返信が来たらFounder本人がクロージング

**Cloudflare R2（Fake Loom動画配信インフラ）**:
- S3互換API・転送コスト（Egress）完全無料→物量生成した動画の配信コストゼロ
- フロー: n8n → ComfyUI（動画生成）→ FFmpeg（PiP合成）→ R2 `PUT` → 署名付きURL → メール/LINE/LinkedIn DM に埋め込み
- バケット設計: `/fake-loom/{lead_id}/{version}.mp4` で1社1URL管理・DocSendと同様に「誰が開封したか」をサーバーログで追跡可能

---

**補助金ネット pPersonalizeページ実装設計**:

```typescript
// app/hojin/[hojin_id]/hojokin/page.tsx — pPersonalize補助金特化版
// ①ファーストビュー: 推定受給可能額を大字表示
// ②根拠ブロック: 業種×技術スタック×適合率
// ③社会的証明: 近隣同業種の平均採択額
// ④Claimボタン → 行政書士無料相談枠の確保 + 詳細マニュアルDL
// ⑤フッター: 「gBizINFO公開データ + jGrants公募情報を基に算出」
export async function generateStaticParams() {
  // Supabase から hojin_id 一覧取得 → ISR
  const { data } = await supabase.from('hojin_subsidies').select('hojin_id');
  return data.map(({ hojin_id }) => ({ hojin_id }));
}
```

- **「善意の通知」メール件名テンプレ**: `【重要】株式会社〇〇様：未請求補助金に関する診断結果のお知らせ`
- **キラーフレーズ**: `御社の法人番号(XXXXXXXXXX)での補助金受給履歴は現在確認できておりません` → gBizINFO採択DBと突合して「未受給企業のみ」に送付
- **マルチチャネル3層の発火順**: ①pSEOページ先行インデックス（D-3）→②フォーム営業自動送信（D-0）→③SNSメンション企業X垢あれば同日（D-0）→④フォロー（D+3）

---

**行政書士オークション取引所 — Stripe + n8n 実装**:

```typescript
// api/admin/lead-auction/route.ts
// エリア独占権モデル: 地域×業種スロットの月額サブスク管理
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 行政書士がエリア独占権を購入
export async function POST(req: Request) {
  const { scrivener_id, area_code, industry_code } = await req.json();
  // デポジット（先買いポイント）方式
  const subscription = await stripe.subscriptions.create({
    customer: scrivener_id,
    items: [{ price: process.env.AREA_MONOPOLY_PRICE_ID }], // 月額¥200,000
    metadata: { area_code, industry_code },
  });
  // Supabase に独占権スロット登録
  await supabase.from('area_slots').upsert({
    scrivener_id, area_code, industry_code,
    expires_at: new Date(subscription.current_period_end * 1000),
  });
  return Response.json({ subscription_id: subscription.id });
}
```

- **n8n リード通知フロー**: 補助金Claim発生 → Supabase Webhook → n8n → `area_slots` で担当行政書士を特定 → Telegram/Slack `「⚡ 早い者勝ち！Sランクリード（推定採択額800万円）が入りました。残り枠 1件」` → Stripe即引き落とし → リード情報開示
- **Stripe Webhook で失効管理**: `customer.subscription.deleted` → `area_slots` を `expired` に更新 → 次の入札者にスロット解放
- **ダブルマネタイズ判定**: n8n が `hojin.tech_stack` を確認 → IT導入補助金対象ツール未導入なら IT商材アップセルメッセージを自動付与

**非士業リードオークション実装（Vampire 2.0 — 解体工事/産廃/遺品整理）**:
```typescript
// Supabase: non_gyosha_leads テーブル（非士業業者向け）
// industry: 'demolition' | 'industrial_waste' | 'estate_clearance'
// lead_status: 'open' | 'sold_3' | 'fulfilled'  ← 同一リードを最大3社に並売
// unit_price: 50000 (1リード5万×3社=15万)  成果報酬は別途 deal_fee_pct: 0.15

// app/api/lead-auction/non-gyosha/route.ts
export async function POST(req: Request) {
  const { lead_id, buyer_id } = await req.json();
  const { data: lead } = await supabase.from('non_gyosha_leads')
    .select('sold_count').eq('id', lead_id).single();
  if ((lead?.sold_count ?? 0) >= 3) return Response.json({ error: 'sold_out' }, { status: 409 });
  await stripe.paymentIntents.create({ amount: 50000, currency: 'jpy',
    customer: buyer_id, confirm: true, metadata: { lead_id } });
  await supabase.from('non_gyosha_leads')
    .update({ sold_count: (lead?.sold_count ?? 0) + 1 }).eq('id', lead_id);
  return Response.json({ ok: true });
}
```

**シャドウ・リスティング通知ロジック（n8n）**:
```
[Supabase Trigger: area_slots INSERT] 
→ [Code Node] 同エリア×業種で未購入の業者を抽出
→ [Telegram/LINE Node] 「⚠️ {競合名}がこのエリアをアンロックしました。残り1枠」
→ [Wait: 6時間]
→ [Stripe Node] 未購入業者のデポジットから自動決済 (urgency_purchase)
→ [Supabase Update] area_slots に 2社目を追加
```

**中抜き防止n8nワークフロー（顧客自動フォロー + 密告ボタン）**:
```
[Trigger: deal_status = 'completed'] 
→ [Wait: 14日]
→ [LINE Bot: 顧客向け] 「工事は完了しましたか？満足度を教えてください [1-5] 」
→ [If: 評価 <= 2 OR 直接連絡あり]
  → [Dify] 密告判定（キーワード抽出: 直接払い/割引/紹介）
  → [If: バイパス判定 = true]
    → [Stripe] 業者デポジットから違約金自動引き落とし (penalty: 100000)
    → [LINE Bot: 密告者] 「5万円の密告ボーナスをお支払いします」→ 送金
    → [Supabase] vendor_blacklist に追加
```

**認定バッジ Stripe Subscription 実装**:
```typescript
// 認定バッジ = 月額課金 + スコア改善の双方向ロック
// Supabase: vendor_badges テーブル
// badge_tier: 'bronze'(¥9,800/月) | 'silver'(¥29,800/月) | 'gold'(¥89,800/月)

// app/api/badge/subscribe/route.ts
export async function POST(req: Request) {
  const { vendor_id, tier } = await req.json();
  const priceId = { bronze: process.env.BADGE_BRONZE_PRICE_ID,
    silver: process.env.BADGE_SILVER_PRICE_ID, gold: process.env.BADGE_GOLD_PRICE_ID }[tier];
  const sub = await stripe.subscriptions.create({
    customer: vendor_id, items: [{ price: priceId }],
    metadata: { vendor_id, tier },
  });
  // バッジ = pSEOページのスコア表示に即時反映（ISR revalidate: 60秒）
  await supabase.from('vendor_badges').upsert({ vendor_id, tier,
    valid_until: new Date(sub.current_period_end * 1000) });
  revalidatePath(`/vendor/${vendor_id}`);
  return Response.json({ subscription_id: sub.id });
}
```

**マネタイズ完全体アーキテクチャ（6レイヤー合算式）**:
```
Total = LeadFee(5万×3社) + DealFee(成約額×15%) + SaaS(月額9,800〜89,800) 
        + PaymentFee(Stripe手数料転嫁1.5%) + BadgeFee(月9,800〜89,800) + Affiliate(IT導入補助金紹介料)

// 1案件あたり期待値試算（解体工事・成約300万円の場合）
// LeadFee: 5万×3 = 15万
// DealFee: 300万×15% = 45万
// SaaS: 2.98万/月（silver）× 12 = 35.76万/年
// Total per vendor/year ≈ 95万円超
```

---

**n8n Jitter × ポアソン分布（等間隔送信禁止・クラスター検知回避）**:
- Wait nodeに `{{Math.round(-Math.log(Math.random())*300)}}` 秒を設定（平均5分・実際は1.5〜13分にランダム分散）
- 金額端数も散らす: `¥29,800` 固定値禁止 → `{{28400 + Math.floor(Math.random()*2800)}}` で都度変動
- 実行日も分散: 月曜に1,000件一斉送信ではなく月〜金に200件ずつ。スパイクでメールプロバイダーのスロットリングを回避

**iProxy.online（格安SIM = 自前レジデンシャルIPファーム）**:
- Androidスマホ1台 + 楽天/ワイモバイル格安SIM → iProxy.online経由でHTTP/SOCKSプロキシ化
- n8nから `GET /api/rotate` を叩くだけで機内モードON/OFF → キャリアIPが毎回変わる
- 日本IP専用なら楽天モバイル1枚で100垢を時分割利用可能（月$6〜10）
- HeyReachアバター垢の専用IPとして1垢=1SIM割り当て（BAN防止の最終防壁）

**SMSPool.net + TOTP防弾化フロー（LinkedIn/Xアバター垢の長期生存設計）**:
1. SMSPool.net で Non-VoIP 物理SIM番号を購入（$0.5〜2/回）→ 初回SMS認証突破
2. 認証直後に Google Authenticator 相当の TOTP をセットアップ
3. シークレットキーを Supabase `totp_secrets` テーブルに保存
4. 以降は `pyotp.TOTP(secret).now()` で自己生成 → SMSPool不要・コスト¼
```python
import pyotp, supabase
secret = sb.table("totp_secrets").select("secret").eq("account_id", aid).single().data["secret"]
token = pyotp.TOTP(secret).now()  # 6桁コードを自動生成
```

**Playwright通信量90%カット（物量スキャン・Life Simulatorに必須）**:
```javascript
// すべてのPlaywright自動化の冒頭に挿入
await page.route('**/*', route => {
  const type = route.request().resourceType();
  if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
    route.abort();
  } else {
    route.continue();
  }
});
```
- ヴァンパイアスキャン（1,000件/日）で転送量が10分の1に → Vast.ai/RunPodのコスト激減
- Life Simulator（LinkedIn垢ウォーミング）でも適用 → セッション数を増やせる

**ElizaOS × Playwright Life Simulator（LinkedIn垢のウォーミング自動化）**:
- 垢作成後3〜5日間: Google検索・ニュース閲覧・YouTube視聴（途中離脱）の生活足跡を自動生成
- ElizaOS Character.json で垢ごとに固有人格（職種/関心/投稿スタイル）を設定
- LLMをClaude/DeepSeek/Llamaで垢ごとに分散 → スタイル指紋によるクラスター検知を防ぐ

---

**海外EC 日本ローカライズ戦略（`/en` グローバルヴァンパイア）**:
- **ターゲット抽出**: [StoreLeads](https://storeleads.app/)（Shopify/BigCommerce/WooCommerce店舗DB）で「EC平均月商 $XX万以上 × 日本向け出荷なし × JP対応カート未使用」を絞り込み → 日本進出未参入の海外ECが確実な顕在ニーズ層
- **日本市場損失4指標**（英語アウトリーチの痛み可視化に使用）:
  - **TAM損失**: 「日本EC市場22兆円（経産省2023）のうち御社が取れていない市場規模 = $X.XM/年」
  - **UX摩擦**: 日本語未対応・YEN価格なし・コンビニ払い非対応 → カート離脱率85%超（国内EC平均比+40pt）
  - **SEOゴースト**: 日本語キーワードでGoogle.co.jpにほぼ未インデックス → 月間検索需要〇万件を取り逃がしている
  - **広告費ドブ捨て**: 日本IPからの流入があっても日本語LP未整備 → 広告費$XX/月が完全無駄
- **英語キラーフレーズテンプレート**（Subject → Body CTA の流れ）:
  - Subject: `[Company Name] is missing out on $X.XM in the Japanese market`
  - 冒頭: `I ran [Company Name]'s site through our Japan Market Readiness Scanner — you're currently invisible to 48M Japanese online shoppers.`
  - 痛みトリガー: `Your cart abandonment rate from Japanese visitors is likely 85%+ due to no JPY pricing, no Japanese payment methods (konbini/PayPay), and English-only checkout.`
  - 救済CTA: `We've helped [Competitor/Similar Brand] capture $XXK/month from Japan within 90 days. Here's a 3-min breakdown specific to [Company Name]: https://paradigmjp.com/en/p/[slug]`

---

## <a id="s10"></a>10. 🖥️ 運用・組織・実装ルール

<a id="s10-1"></a>

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

<a id="s10-2"></a>

### 管理ダッシュボード（/admin）

| 項目 | 内容 |
|-----|------|
| 認証方式 | 環境変数 `ADMIN_PASSWORD` + Cookie `paradigm_admin_token` |
| **locale切替** | **管理画面に「日本語 / English」タブを追加（locale別コンテンツ管理）** |
| ダッシュボード | 記事数/サービス数/問い合わせ数（locale別表示） |
| ブログ管理 | locale別記事CRUD（/ja と /en は完全別コンテンツ） |
| 料金管理 | locale別プラン管理（/en はUSD表示） |

<a id="s10-3"></a>

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

<a id="s11"></a>
## 11. 💸 経費・収益シミュレーション

> COST-SIMルール準拠。全収益試算をここに集約。

<a id="s11-1"></a>
#### s11-1 固定費表

| ツール/サービス | 用途 | 目安金額/月 |
|----------------|------|------------|
| Vercel Pro | ホスティング | $20 |
| Supabase (Free) | DB・Auth | $0 |
| Cloudflare | DNS・CDN | $0 |
| **合計** | | **$20/月（約3,000円）** |

<a id="s11-2"></a>
#### s11-2 収益シミュレーション

**HP診断→リニューアル提案ビジネス（保守的CVR 2%）**

| 時点 | 月アウトリーチ | 成約 | 平均単価 | 月売上 | 月粗利（73%） |
|------|------------|------|---------|------|------------|
| M3 | 300社 | 6件 | ¥150万 | ¥900万 | ¥657万 |
| M6 | 500社 | 10件 | ¥150万 | ¥1,500万 | ¥1,095万 |
| M12 | 800社 | 16件 | ¥150万 | ¥2,400万 | ¥1,752万 |

*CVR 3.5%（中立）時 M12: 28件×¥150万=¥4,200万/月*
*粗利73%根拠: 制作原価¥15万+外注¥20万+その他¥5万=¥40万 / ¥150万*

**追加LTV**: 保守月額¥3〜10万 + Dify運用月額¥3〜10万/社（解約抑止）

<a id="s11-3"></a>
#### s11-3 損益分岐シナリオ

> 固定費$20/月のため、受注1件で大幅黒字。

---

<a id="s12"></a>
## 12. 🏷️ ドメイン・アカウント・商標・ライセンス

> 事業に関連するドメイン・全アカウント（SNS・コミュニティ・PF・ストア等）・商標・特許・事業免許等を一元管理。

<a id="s12-1"></a>
#### s12-1 ドメイン一覧

| 種別 | ドメイン | 用途 | ステータス | 備考 |
|------|---------|------|----------|------|
| コーポレート | [paradigmjp.com](https://paradigmjp.com) | 会社HP | ✅ 取得済み | Cloudflare管理 |

<a id="s12-2"></a>
#### s12-2 アカウント一覧（SNS・コミュニティ・PF・ストア等）

| カテゴリ | PF | アカウント | 用途 | ステータス | 備考 |
|---------|-----|----------|------|----------|------|
| 開発者PF | GitHub | [Paradigmllc/Paradigm-HP](https://github.com/Paradigmllc/Paradigm-HP) | ソースコード | ✅ 取得済み | |

<a id="s12-3"></a>
#### s12-3 商標・特許・ライセンス

| 種別 | 名称/番号 | 管轄・URL | ステータス | 備考 |
|------|----------|----------|----------|------|
| IT導入支援事業者 | デジタル化・AI導入補助金 | [IT導入補助金公式](https://it-shien.smrj.go.jp/) | 📋 最優先・要申請 | 登録まで3〜6ヶ月。登録完了でAI搭載DXパッケージにAI機能分2/3補助適用可。参入障壁+国認定ブランド+逆引きリード流入の3重効果 |

> ステータス凡例: ✅取得済み / ❌未取得 / 🔄取得中 / 🔍要確認 / 📋要取得 / 💤検討中 / ⏸️保留

---

<a id="s13"></a>
## 13. 📚 リソース一覧

<a id="s13-1"></a>

#### フロントエンド・フレームワーク
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Next.js 15 (App Router) | フルスタックReactフレームワーク | https://nextjs.org |
| TypeScript | 型安全JavaScript | https://www.typescriptlang.org |
| Tailwind CSS v4 | ユーティリティCSSフレームワーク | https://tailwindcss.com |
| **next-intl** | **i18n・/[locale]/ルーティング** | **https://next-intl-docs.vercel.app** |
| Noto Sans JP | 日本語Webフォント（/ja） | https://fonts.google.com/noto/specimen/Noto+Sans+JP |
| Plus Jakarta Sans | 英語Webフォント（/en 候補） | https://fonts.google.com/specimen/Plus+Jakarta+Sans |

<a id="s13-2"></a>

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

<a id="s13-3"></a>

#### データベース・BaaS
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Supabase | PostgreSQL+Auth+Storage（appexxと同一プロジェクト） | https://supabase.com |

<a id="s13-4"></a>

#### インフラ・ホスティング
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| DigitalOcean | クラウドVPS（appexx.meと同一Droplet） | https://www.digitalocean.com |
| Coolify | セルフホストPaaS（UUID: i12am4vvcbggefnqdizhnv9a） | https://coolify.io |
| Cloudflare | DNS・CDN・SSL（Zone ID: f191afabddabaf1658ebfe79a9a9b723） | https://www.cloudflare.com |
| GitHub Actions | CI/CDパイプライン（Paradigmllc/Paradigm-HP） | https://github.com/features/actions |
| ラッコドメイン | ドメイン取得・NS委任 | https://rakko.tools |

<a id="s13-5"></a>

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

<a id="s13-6"></a>

#### SEO・GEO
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Google Search Console | 検索流入・インデックス管理 | https://search.google.com/search-console |
| Google Analytics 4 | トラフィック計測 | https://analytics.google.com |
| Bing Webmaster Tools | Bing/ChatGPT向けインデックス | https://www.bing.com/webmasters |

<a id="s13-7"></a>

#### 法令・規制（コンプライアンス参照）
| 機関/法令 | 内容 | URL |
|----------|------|-----|
| 消費者庁 特定商取引法 | 通販・メール営業の規制（/ja/legal 対応済み） | https://www.no-trouble.caa.go.jp |
| 個人情報保護委員会 | 個人情報保護法（/ja/privacy 対応済み） | https://www.ppc.go.jp |
| 総務省 特定電子メール法 | 営業メール・オプトアウト義務 | https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/anti_spam.html |

<a id="s13-8"></a>

#### 参考リンク・ドキュメント
| タイトル | 内容 | URL |
|---------|------|-----|
| Next.js Docs | App Router・Metadata・sitemap APIリファレンス | https://nextjs.org/docs |
| next-intl Docs | App Router i18nセットアップ | https://next-intl-docs.vercel.app/docs/getting-started/app-router |
| Supabase Docs | RLS・Auth・Storage APIリファレンス | https://supabase.com/docs |
| Coolify Docs | セルフホストデプロイ設定 | https://coolify.io/docs |
| Google JSON-LD | 構造化データリファレンス | https://developers.google.com/search/docs/appearance/structured-data |
| Tailwind v4 Docs | @themeブロック・CSS変数リファレンス | https://tailwindcss.com/docs |
