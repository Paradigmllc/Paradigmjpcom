# Paradigm HP — Claude Code プロジェクトコンテキスト

## 📊 進捗ダッシュボード（目次）

| 進捗 | # | セクション | 状態メモ |
|------|---|-----------|---------|
| ★★★★☆ | 1 | [事業概要・市場機会](#s1) | 2言語サイト設計確定（/ja日本向け・/en海外向け） |
| | | [s1-1 2言語サイト設計](#s1-1) | |
| | | [s1-2 サービス構成](#s1-2) | |
| ★★★★☆ | 2 | [競合・差別化](#s2) | 国ティア3段・Japan-Ready AI Suite概念・保険+ブースターポジション確定 |
| | | [s2-1 /en ポジショニング](#s2-1) | Kickstarter/ShopifyD2C/SaaS 3段ターゲット・Productized Service優位性・国ティア確定 |
| | | [s2-2 /ja 競合分析](#s2-2) | |
| ★★★★★ | 3 | [ビジネスモデル](#s3) | バリューベース3ティア価格表確定・PPP 補正 12-locale 価格表追加（P17）|
| | | [s3-1 /ja 料金体系](#s3-1) | |
| | | [s3-2 /en 料金体系](#s3-2) | バリューベース3ティア($3,500/$8,500/$18,000+)確定・アンカリング設計・コミッション設計 |
| | | [s3-3 リード獲得導線](#s3-3) | |
| | | [s3-4 12-locale PPP 価格表](#s3-4) | 🆕 P17 2026-04-27・en基準×PPP係数で全12locale計算 |
| ☆☆☆☆☆ | 4 | [財務計画・KPI](#s4) | N/A |
| | | [s4-1 KPI計測](#s4-1) | |
| | | [s4-2 アナリティクス](#s4-2) | |
| ★★★☆☆ | 5 | [ロードマップ・PMF](#s5) | 全面リニューアル実装計画あり |
| | | [s5-1 全面リニューアル実装計画](#s5-1) | |
| | | [s5-2 middleware ロジック](#s5-2) | |
| ★☆☆☆☆ | 6 | [Exit・法的リスク](#s6) | 特定商取引法・プライバシーページのみ |
| | | [s6-1 法的ページ一覧](#s6-1) | |
| | | [s6-2 /en 法的対応](#s6-2) | |
| ★★★★★ | 7 | [プロダクト設計](#s7) | 🆕 P17 12-locale 拡張・/[locale]/構造（12言語）・全ページ構成確定 |
| | | [s7-1 ルート構造](#s7-1) | 🆕 12-locale 化 |
| | | [s7-2 フォルダ構成](#s7-2) | |
| | | [s7-3 APIエンドポイント](#s7-3) | |
| ★★★★★ | 8 | [技術・データ設計](#s8) | next-intl 12-locale + PayloadCMS 12言語 localization + DeepSeek V3 翻訳 |
| | | [s8-1 技術スタック](#s8-1) | 🆕 DEEPSEEK_API_KEY 追記 |
| | | [s8-2 デザインシステム](#s8-2) | |
| | | [s8-3 Supabase CMSテーブル](#s8-3) | |
| | | [s8-4 環境変数](#s8-4) | |
| ★★★★☆ | 9 | [GTM・集客・エコシステム](#s9) | インフラ・SEO+/ja/enコールドアウトリーチ戦略確定 |
| | | [s9-1 Coolify設定](#s9-1) | |
| | | [s9-2 Cloudflare設定](#s9-2) | |
| | | [s9-3 appexxインフラ共有接続](#s9-3) | |
| | | [s9-4 SEO設定](#s9-4) | |
| | | [s9-5 コールドアウトリーチ戦略](#s9-5) | /ja 日本SMB向け（補助金・ヴァンパイアエンジン） |
| | | [s9-6 /en 海外SMBアウトリーチ戦略](#s9-6) | Japan Entry Package /en向け・Productized Service販売設計確定・コンタクト取得Tier表追加・SMBポータル現実解+Apollo Exporter+D7+フォームURL2ステップ+Kompass+Wappalyzer3択+テクノグラフィクスDS |
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
| ★★★★☆ | 13 | [リソース一覧](#s13) | next-intl・StoreLeads・/en営業ツール・PandaDoc・Clay・Instantly追加・公的DB/OSSスクレイピング12ソース・SMBポータル・Kompass・Wappalyzer3択・テクノグラフィクスDS |
| | | [s13-1 フロントエンド・フレームワーク](#s13-1) | |
| | | [s13-2 UI・コンポーネント](#s13-2) | |
| | | [s13-3 データベース・BaaS](#s13-3) | |
| | | [s13-4 インフラ・ホスティング](#s13-4) | |
| | | [s13-5 マーケティング・CRM・分析](#s13-5) | |
| | | [s13-6 SEO・GEO](#s13-6) | |
| | | [s13-7 法令・規制](#s13-7) | |
| | | [s13-8 参考リンク・ドキュメント](#s13-8) | |
| | | [s13-9 /en 営業・英語対応ツール](#s13-9) | ElevenLabs/Deeptrue/Fathom/ELSA/PandaDoc/Clay/Instantly追加+コンタクトDB19ツール+公的DB/OSSスクレイピング+SMBポータル+Kompass+Wappalyzer3択+テクノグラフィクスDS |

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

### サービス構成（2026-05-20 壁打ち確定・旧8本羅列を廃止）

> **確定商材ラインナップ**（ユーザー確認済）。8サービス羅列は「何屋か不明」で CVR を下げるため廃止。JP=4本 / 非JP=2本に集約（Hick's law）。

| 面 | 商材 | slug | 備考 |
|----|------|------|------|
| **/ja 国内SMB** | MEO対策 | `meo` | |
| | AI導入支援 | `ai` | |
| | Web制作 | `web` | |
| | 動画サブスク | `video` | ¥30万〜100万。DesignJoy 型 productized subscription の動画版 |
| **/en・非JP** | JaaS（日本導入支援）| `japan-entry` | **/en トップ＝主役**。海外SMBの日本進出を巻き取る |
| | 動画サブスク | `video` | DesignJoy 型・グローバル対象。`/en/video` 独立ページ |

**コンテンツ設計の背骨（2026-05-20 確定）**:
- **感情アーク**: 痛み・機会損失の可視化（絶望）→ 警告 → 希望（商材が黒箱/課題を消す）→ 低リスク入口
- **/en JaaS 主CTA** = $1,500 Japan Market Fit Report（個社の損失を可視化・本契約初月に全額充当）
- **証拠は honest**: 実顧客 数件（匿名）の before→after を具体掲載。捏造数字(200社+/98%/3倍/15分)・匿名テンプレ証言は全廃
- **動画サブスク = DesignJoy 型**: 月額固定・依頼無制限(1本ずつ)・非同期・いつでも停止。anti-positioning(採用は高い遅い/代理店割高/フリーランス離脱)
- **実装**: `/en`(JaaS) と `/ja`(4本) は構造が別 → page.tsx で locale 分岐。10 非ja/en locale は /en(JaaS) 構造を翻訳（Plan B）

---

## <a id="s2"></a>2. 🏆 競合・差別化

<a id="s2-1"></a>

### `/en` ポジショニング

**Japan Entry Package** は「外国企業が日本でデジタルプレゼンスを構築する際に必要なものをすべてバンドルした唯一のパッケージ」として差別化。

#### ターゲットセグメント（3層・優先順）

| 層 | ターゲット | 特徴 | リーチ方法 |
|----|----------|------|----------|
| **Tier 1** | Kickstarter/Indiegogo成功済みブランド（日本バッカー多数） | 日本人支持者がいる証明済み・次の一手として日本ローンチを検討中 | バッカーコメントから日本人比率が高いプロジェクトを特定→Product Hunt Launch直後にアプローチ |
| **Tier 2** | Shopify D2C（月商$5K〜$50K・Amazon.co.jp未出店） | 日本語ページなし・円決済なし・国際送料設定のまま放置 → 日本TAM取り逃がし | StoreLeads等でShopify店舗DB×Amazon.co.jp未出店フィルタ |
| **Tier 3** | SaaS/デジタルプロダクト（海外に英語ランディングページがある・日本語版なし） | 限界費用ゼロで日本市場に展開できるのに放置 → ローカライズのみで市場獲得可能 | Product Hunt past launches / G2/Capterra/AppSumo出品リストからスクレイプ |

#### 競合が持たない優位性

- **バイリンガル非同期コミュニケーション**: 英語で受けて日本側をすべて日本語で処理→クライアントに日本語負担ゼロ
- **日本固有デジタル環境への精通**: MEO（Googleマップ）・LINE公式アカウント・Yahoo! Japan SEO・コンビニ決済（GMO/PAY.JP）
- **Productized Service（スコープ固定）**: "What exactly do I get?"に即答できる明確なスコープ → 高額でも買いやすい
- **低リスクエントリー**: フロントエンドオファー（$1,500 Research Report）で信頼構築してから本命パッケージを提案

#### ポジショニングフレーミング（「保険+ブースター」設計）

- **保険サイド**: 「日本語サイトなし = 法人登記なし企業と同等の信頼性。日本BtoB商談で真剣に扱われないリスク」
- **ブースターサイド**: 「EC市場22兆円（経産省2023）・インバウンド消費5.8兆円（2023）のうち御社が取れていない分」
- → 損失回避（守り）と利益獲得（攻め）の両方を同時に訴求することで「やらない理由がない」状態を作る

#### ターゲット国ティア（アウトリーチ優先順）

| Tier | 国 | 理由 |
|------|---|------|
| **S（最優先）** | 🇺🇸 US / 🇬🇧 UK / 🇦🇺 AU | D2C・Shopifyブランドの集積地。Kickstarter成功案件も最多。英語で直接交渉可能 |
| **A** | 🇸🇬 Singapore / 🇦🇪 UAE | キャッシュリッチ・意思決定が速い（決裁まで平均1〜2週間）。アジア進出拠点として日本を狙う企業が多い |
| **B** | 🇸🇪 Sweden / 🇳🇴 Norway / 🇩🇰 Denmark | 日本文化への親和性が高い（デザイン/アニメ/ゲーム/フード）。高品質志向でParadigmのプレミアム価格に抵抗が少ない |

#### "Japan-Ready AI & Compliance Suite" — プロダクトコンセプト

**タグライン**: "Turn your website into a legally compliant, fully localized Japanese storefront in 14 days, powered by AI and local experts"

**3つのコア機能**:
1. **AI日本語カスタマーサポート**: 日本語訪問者にのみ表示するチャットボット（条件分岐JS埋め込み）→ Tokushoho FAQ・返品規則・配送対応を24時間自動応答
2. **特定商取引法コンプライアンス**: 必要記載事項を自動チェック＋整備（日本で販売するための法的最低要件をワンストップで充足）
3. **カルチャーローカライゼーション**: 単なる翻訳ではなく、日本の消費者心理・UI慣習・決済手段（コンビニ払い・PayPay）に合わせた全面最適化

> 技術実装詳細 → [→ s9-6 AIエージェント実装仕様](#s9-6)

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

### `/en` 料金体系（Productized Service型・確定）

- **通貨**: USD固定（JPY併記なし）
- **モデル**: Productized Service（スコープ固定 + 初期費用 + 月額リテイナー）— SaaSではない
- **設計思想**: 月額サブスクより「初期で大きな価値提供 → 小額リテイナーで維持」の方がクライアントに買いやすく、かつARPUが高い

#### フロントエンドオファー（エントリー商品・信頼構築用）

| 商品 | 価格 | 内容 | 目的 |
|------|------|------|------|
| Japan Market Fit Research | **$1,500〜$2,500** (one-time) | 日本市場参入可能性レポート（競合分析・消費者ペルソナ・推奨チャネル・リスク一覧・ROI試算）| 「まず小さく試したい」層に購入してもらい、信頼構築 → 本命パッケージへのアップセル導線 |

> リサーチ料金は本命プラン初月費用に全額充当（"First step credit"として提示）→ 購入ハードルを下げつつ実質的なデポジットとして機能

#### メインパッケージ（3段構成）

| プラン | 初期費用 | 月額リテイナー | スコープ |
|--------|---------|------------|---------|
| **Standard Launch** ⭐ | **$4,000〜$7,000** | $300〜500/mo | 日本語LP（5ページ）+ MEO設定 + Google Merchant Center + SNS初期設定 + 月次レポート |
| **Premium Growth** | **$6,000〜$10,000** | $1,000〜2,000/mo | Standard + EC日本語化（Shopify多言語）+ LINE公式 + AI自動翻訳カスタマーサポート + 週次PDCAレポート |
| **Enterprise** | 要見積り | 要見積り | Premium + 日本法人設立サポート連携 + 専任PM + SLA保証 |

> スコープ確定後は追加作業を原則受けない（スコープクリープ防止）。追加は別途SOW発行

#### バリューベース3ティア価格表（確定・アンカリング設計）

| Tier | 名称 | 初期費用 | 月額リテイナー | 推奨対象 |
|------|-----|---------|------------|---------|
| **Tier 1** | **Essential** | **$3,500** (one-time) | $200/mo | 月商$5K〜$15K・シンプルLPのみ必要・初回テスト購入層 |
| **Tier 2** ⭐ | **Growth** | **$8,500** | $500/mo | 月商$15K〜$50K・EC+AI CS+MEO+LINE公式が必要な本命層 |
| **Tier 3** | **Enterprise** | **$18,000+** | $2,000+/mo | 月商$50K+・専任PM+法人設立サポート+SLA+カスタム開発 |

**アンカリング設計の意図**:
- Tier 3（$18,000）がデコイ: 実際の成約ターゲットはTier 2（$8,500）。Tier 3と並べることでTier 2が「お値打ち」に見える
- Tier 1（$3,500）はエントリー: 「試しに」で購入してもらいTier 2へのアップセル導線として機能
- **月額リテイナーの積み上げ**: 月$500×12ヶ月=年$6,000。初期費用+リテイナーのLTVはTier 2で$14,500/年

> 旧プラン（Standard Launch/Premium Growth）はこの3ティアに統合。Supabase `cms_pricing` locale='en' currency='usd' で管理

#### 価格設計の根拠

- **バリューベース**: コスト積み上げではなく「日本市場TAM×CVR改善×12ヶ月」のROIから価格を逆算
- **初期費用を大きく**: 制作・設定作業コストの回収 + 「真剣なクライアント」のフィルタリング機能
- **月額を小さく**: 解約率低下・"no-brainer renewal"設計。月$500は日本市場の維持コストとして正当化しやすい
- **Growth（Tier 2）を推奨（⭐）**: EC日本語化+AI CS+MEO+LINEの組み合わせは「最大ROIが出る完結パッケージ」として説明しやすい

#### コミッション設計（Closer採用時）

- Closer手数料: **初期費用の30〜50%**（月額は含まない）
- 例: Standard Launch $5,000成約 → Closer $1,500〜$2,500
- 採用方法: Upwork/LinkedIn「commission-only sales」投稿・日本市場経験者のexpat SalesとJapan Desk系フリーランサーを優先

> Supabase `cms_pricing` locale='en' currency='usd' で管理

<a id="s3-4"></a>

### 12-locale PPP 補正価格表（P17 2026-04-27 拡張・Plan B）

> 🗂️ **12-locale 完全 PPP 補正表 (28 行) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#ppp-pricing`](docs/knowledge/poss-paradigmjpcom-implementation.md#ppp-pricing)

**主要 PPP 概観**: P17 2026-04-27 拡張・Plan B 採用。SalesRegion 12 値 × Productized Service 3 plans (Starter/Growth/Premium) = 36 価格点を生成。canonical 通貨 = USD・PPP 補正は per-region IMF index 適用。例: ja=¥1.0x / en=$1.0x / sea=$0.55x / africa=$0.40x。
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
- [x] next-intl導入（`/[locale]/` ルーティング）— P10-10 完了
- [x] middleware.ts（locale自動振り分けロジック）— P10-10 完了
- [x] **P17 12-locale 拡張完了**（ja/en/ko/zh/de/fr/es/pt/ru/ar/vi/id・PPP価格補正・RTL対応）— 2026-04-27
- [x] globals.css 新デザイントークン適用（Warm Modern Tech）
- [x] フォント設定（/ja: Noto Sans JP / ar: Noto Sans Arabic 動的ロード / 他: system font）
- [ ] CMSテーブルに `locale` カラム追加（Supabase migration）— PayloadCMS localization で代替実装済み（payload.config.ts）

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
- [x] hreflang タグ（全12 locale 自動生成・layout.tsx generateMetadata）— P17 完了 2026-04-27
- [x] locale別サイトマップ（12 locale × static 16 + blog × 12 locale・alternates.languages hreflang 完備）— 2026-05-12 確認済 (sitemap.ts)
- [x] JSON-LD inLanguage 12-locale 完全対応 (vi/id 追加)・LOCALE_ORG_NAME map で 12 locale 構造的データ生成 — 2026-05-12
- [ ] Umami Website ID設定 (12-locale array 形式は実装済・admin で実値投入のみ残)
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

### ルート構造（P17 2026-04-27 12-locale 拡張）

```
/                      → middleware で locale 自動検出（Accept-Language → /ja または /en へ）
/{locale}/             ← 12 locale: ja / en / ko / zh / de / fr / es / pt / ru / ar / vi / id

/ja/*                  ← 日本SMB向け独自設計（Plan B = 翻訳ではない別設計）
  /ja/about, /services, /services/{web,lp,ec,creative,meo,seo,ai,saas},
  /pricing, /works, /blog, /blog/[slug], /contact, /faq, /legal, /privacy,
  /lp/[slug], /p/[slug]

/en/*                  ← 海外SMB向け Japan Entry Package 母版（独自設計）
  /en/about, /services, /services/japan-entry-package, /services/{web,seo,ai},
  /pricing (USD), /works, /blog, /blog/[slug], /contact (Cal.com EN), /faq, /legal, /privacy

/{ko,zh,de,fr,es,pt,ru,ar,vi,id}/*    ← Plan B 残10ロケール（Japan Entry Package 翻訳のみ）
  - messages/{locale}.json は DeepSeek V3 で en.json から自動翻訳済み
  - 価格は PPP 係数で en 基準価格を補正表示（s3-4 参照）
  - ar は RTL（dir="rtl" + Noto Sans Arabic）
  - 新規ページ追加時は ja/en のみ翻訳責務・他10ロケールは t() 経由で messages から取得

/admin/                ← locale非依存（PayloadCMS / 12言語admin UI対応）
/api/                  ← locale非依存
/p/[slug]              ← 提案ページ（locale非依存・Sales OS と連携）
```

<a id="s7-2"></a>

### フォルダ構成（リニューアル後）

> 🗂️ **完全なフォルダ tree (56 行) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#folder-structure`](docs/knowledge/poss-paradigmjpcom-implementation.md#folder-structure)

**主要ディレクトリ概観 (詳細 → knowledge):**
- `src/app/[locale]/`: ja/en 2 言語ルーティング (next-intl) — landing / about / services / pricing / blog / report / p / admin
- `src/components/`: 共通 UI + sales-os v2 互換 (paradigm-blocks 経由) + GlobalProfile + DifyAssistant
- `src/lib/`: cms / supabase / blocks / proposal / region-helpers
- `src/payload/`: PayloadCMS collections (Pages / Posts / Categories / Leads / etc)
- `messages/{ja,en}.json`: next-intl 翻訳ファイル
- `docker-compose/` / `n8n-workflows/` / `dify-workflows/` / `supabase/migrations/` / `public/manifest.json`
### APIエンドポイント

> 🗂️ **完全な API list は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#api-endpoints`](docs/knowledge/poss-paradigmjpcom-implementation.md#api-endpoints)

**主要 endpoint 概観**: /api/leads (POST: お問い合わせ受付) / /api/cms/[table] (PayloadCMS proxy) / /api/report/[token] (公開診断レポート) / /api/cta-click (CTA トラッキング) / /api/webhook/dify-reply (Dify 返信自動化)
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
| **AIエージェントウィジェット** | **Chatbase（ノーコード）または Dify self-hosted（フル制御）** — 日本語訪問者にのみ条件分岐で表示（`navigator.language.startsWith('ja')` または IP判定） |
| Shopifyアクセス | Collaborator権限（パスワード共有不要・安全）でクライアントストア設定にアクセス |

> AIエージェント実装詳細（JS条件分岐コード・RAGビルダー比較）→ [→ s9-6 AIエージェント実装仕様](#s9-6)

### デザインシステム（新・確定）

> 🗂️ **完全なデザイン token (83 行・色 / typography / spacing / shadows / animation) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#design-system`](docs/knowledge/poss-paradigmjpcom-implementation.md#design-system)

**主要 design token 概観**: 主色 = 墨 (#1A1824) + 朱 (#C1272D) + 金 (#C89650) / Surface 5 段階 / Shadow 7 段階 / Radius 6 段階 / Transition 4 段階 / アニメーション 18 種 / ダークモード `.dark` クラス対応 / Stripe Dashboard UI スタイル準拠
### Supabase CMSテーブル（localeカラム追加）

> 🗂️ **完全な CMS テーブル定義 (47 行) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#db-schema`](docs/knowledge/poss-paradigmjpcom-implementation.md#db-schema)

**主要テーブル概観**: PayloadCMS collections = Pages / Posts / Categories / Leads / Tags / Users / Media / Translations。全 collection に locale (ja|en) フィールドを追加して 2 言語切替。RLS = anon SELECT (is_published=true) + service_role 全権。
### 環境変数（Coolify設定）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yihdmgtxiqfdgdueolub.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(Coolify appexx-dashboardから参照)
SUPABASE_SERVICE_ROLE_KEY=(Coolify appexx-dashboardから参照)
NEXT_PUBLIC_SITE_URL=https://paradigmjp.com
NEXT_PUBLIC_COMPANY_NAME=Paradigm合同会社
ADMIN_PASSWORD=paradigm-admin-2025
NEXT_PUBLIC_UMAMI_WEBSITE_ID=(Umamiで新サイト追加後に設定)
DATABASE_URI=(Supabase PostgreSQL 接続文字列・PayloadCMS 用)
PAYLOAD_SECRET=(PayloadCMS セッション署名鍵)
PAYLOAD_PUBLIC_SERVER_URL=https://paradigmjp.com
DIFY_API_KEY=(Dify チャットボット API キー)
DEEPSEEK_API_KEY=(P17 2026-04-27 追加・i18n 翻訳・Context Cache 90%OFF)
DATAFORSEO_LOGIN=(Sprint 14 Phase A 追加・SEO scan 用・https://dataforseo.com アカウント email)
DATAFORSEO_PASSWORD=(Sprint 14 Phase A 追加・dataforseo dashboard で発行)
```

**P17 注意**: `DEEPSEEK_API_KEY` は **scripts/i18n-translate.mjs 実行時のみ必要**（buildtime/runtime には不要）。新ページ追加で messages key を増やした際にローカルで `DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-translate.mjs` を走らせて 10 言語 messages を再生成する用途。

**Sprint 14 注意**: `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` は `scanDomainSeo()` 呼出時のみ必要（buildtime/runtime 全体には不要）。未設定時は明示エラー (V ルール: 空文字 fallback 禁止)。新規アカウント $1 無料クレジット。1 scan (mobile+desktop) 約 $0.01。`lib/sales/enrich.ts` の自動 enrich からは呼ばないこと（コスト保護）— 診断 CTA / report 生成時のみ明示呼出。

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

> 🗂️ **完全な戦略 (657 行・需要創出 / 営業フロー / コピーライティング / KPI 等) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#cold-outreach-jp`](docs/knowledge/poss-paradigmjpcom-implementation.md#cold-outreach-jp)

**主要戦略概観 (詳細は knowledge):**
- **絶望→希望 5 段階フレーム**: 絶望 → 警告 → 注意 → 通知 → 希望 (urgency_label 5 値)
- **主治医ポジション継続診断**: 月次ヘルスチェックモデルで chunk 防止
- **DB ドリブンパーソナライズ**: leads.industry/region/urgency_label を text replace で文面に流し込む
- **Stage 分離**: Stage 1 (フォーム送信・全リード対象・教えてあげる体裁) + Stage 2 (反応者のみメール送信・主治医継続診断)
- **テンプレ多次元軸**: language × country × industry × design × A/B variant ≈ 19,440 マトリクス・winner 自動判定
### `/en` 海外SMB向けアウトリーチ戦略（Japan Entry Package販売）

> 🗂️ **完全な海外 SMB 戦略 (401 行・JaaS / Cross-border / SaaS 海外 D2C 向け) は外出し** → [`docs/knowledge/poss-paradigmjpcom-implementation.md#cold-outreach-en`](docs/knowledge/poss-paradigmjpcom-implementation.md#cold-outreach-en)

**主要戦略概観 (詳細は knowledge):**
- **JaaS = Japan Entry Package**: 海外事業者の日本進出を一括代行 (法人設立/銀行口座/税務/オフィス/採用/マーケ/CS) — Stage 2 premium ($33,500 / ¥5,000,000)
- **対象セグメント**: 海外 D2C ブランド (US/UK/AU/SG/UAE/Nordic) で日本市場参入を検討中の SMB
- **訴求軸**: ① Cross-border tax compliance ② 日本文化マッチングの marketing ③ Customer support 24/7 (JST 対応) ④ 法人設立から initial launch まで 90 日
- **アウトリーチ動線**: LinkedIn → Cold email (英語) → Cal.com 30 分 discovery call → 提案資料 (Slidev PDF) → Stage 2 動画 (HyperFrames + Kokoro TTS 多言語)
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
- ✅ 提案ページ `/p/[slug]`（**2026-04-26 AllInOneClient.tsx 大幅強化**）
  - `ProspectData` 型拡張: `ai_analysis` に `executive_summary/overall_score/total_annual_loss_jpy/estimated_recovery_jpy/copy.*` 追加
  - `page.tsx` で `prescriptions` と `reciprocity_package` を `demo_data` から正しくマッピング
  - 新レンダリングセクション: HookアラートバナーAI・診断KPI行（スコア/損失/回収）・処方箋リスト・年間損失カード・往復見出し・パッケージカード・信頼ポイント一覧
  - Appexxme worktree の `/p/[slug]/AllInOneClient.tsx` にも同等変更を同期済み（commit `a0c0e29`）
- ✅ **[2026-04-30] /report/[slug] canonical 統一**: 顧客向けページの正規 URL を `paradigmjp.com/report/[slug]` に固定 / 旧 `/p/[slug]` は redirect shim 化 (3 ヶ月後 404 化予定) / Magic UI + Section-per-file + i18n + Manifest 駆動 4 鉄則完全準拠
- ✅ **[2026-05-12] i18n + CMS管理画面 完璧化 (Sprint 1-4)**: ① 6 collection (Pages/Services/Posts/Works/Pricing/FAQs) の `availableLocales` を **12 locale 完全網羅** + 共有 const (`src/collections/_localeOptions.ts`) で DRY 化 / ② Settings global の `umamiByLocale` `calendarByLocale` を **12-locale array 形式**に拡張 (旧 2-locale 形式は [legacy] として後方互換維持・`lib/settings.ts` で 3 段 fallback chain) / ③ JSON-LD `inLanguage` に vi/id 追加 → 12 locale 完全対応 / ④ 8 ファイルの hardcoded `locale === "ja"` を **`LOCALE_ORG_NAME` / `LOCALE_ORG_ALTERNATE_NAMES` / `LOCALE_COUNTRY` / `LOCALE_OG_LOCALE` / `LOCALE_BREADCRUMB_HOME` / `LOCALE_HREFLANG` / `localeContentVariant`** マップ経由に置換 / ⑤ 5 collection の legacy `locale` field を `[DEPRECATED 2026-05-12]` 表示 + `disabled: true` で soft removal / ⑥ `lib/locale-map.ts` を routing.ts から独立化 (Vitest next-intl 解決問題回避 + 責務分離) / **tests 41/41 ✅ + TS clean ✅**
- 🗄️ **[2026-05-12] MVP セクション archived (削除せず使わない)**: `src/app/sales/[region]/mvp/*` → `src/app/_archive_sales/*` (Next.js `_` prefix で build 除外) / `src/app/api/mvp/*` → `src/app/api/_archive_mvp/*` / `src/app/[locale]/optout` → `_archive_optout` / `src/app/[locale]/docs/admin/mvp-operations` → `_archive_mvp-operations` / middleware `/sales/*` Basic Auth gate 撤去 / DB tables (mvp_outreach_runs / mvp_optout_tokens / paradigm_personas) は触らずデータ保護 / 復活は rename 戻し 1 発・詳細 → Task.md「🗄️ アーカイブ済み」
- 🗄️ **[2026-05-12] 診断レポート全系統 archived (ゼロから作り直し前段)**: `src/app/[locale]/report/*` → `_archive_report` / `src/app/report/*` → `_archive_report_shim` / `src/app/api/report/*` → `_archive_report` / `src/components/proposal/*` (Renderer + 13 sections) → `_archive_proposal` / `src/lib/proposal/*` (manifest/i18n/theme/prospect-data/default-translations) → `_archive_proposal` / `src/lib/proposal-templates*.ts` → `_archive_proposal-templates*.ts` / middleware の `/report /p` redirect ロジック撤去 (noindex header だけ残置・古い indexed URL 防御) / tsconfig.json で `_archive_*` を tsc exclude / `cms_content_blocks` (B36 既存 report 永続データ) は触らずデータ保護 / 復活は rename 戻し 1 発・詳細 → Task.md「🗄️ アーカイブ済み」 / **次フェーズ: ゼロから設計の壁打ち**
- ✅ **[2026-05-13] 全面 i18n + CMS audit + 4 bug 修正**: 5 layer 監査で page-specific canonical/hreflang 欠落 (18 ページ・致命的 SEO bug) + loading.tsx JP hardcode + themes-showcase noindex 不在 + HeroSection cosmetic を検出・修正。`src/lib/page-metadata.ts` helper 新設で `pageAlternates(locale, path)` 1 行で各 page の正しい canonical + 12 locale hreflang を出力。audit script 4 本 (`scripts/audit-*.mjs`) を整備して regression 防止。詳細 → Task.md / messages 12 locale × 671 keys 完全同期確認済
- ⚠️ **[2026-05-13→2026-05-20 改訂] DeepSeek モデル方針 (旧「V4 PRO 永久指定」撤回)**: 本番 dryRun 監査で `deepseek-v4-pro` が実 API で 200/空応答=文面生成不可と判明 → ユーザー承認のもと `DEFAULT_MODEL = "deepseek-chat"` に変更 (commit 759cdbd). **LiteLLM 対応**: `lib/deepseek.ts` の base URL を `DEEPSEEK_API_BASE` (OpenAI 互換 endpoint)・モデルを `DEEPSEEK_MODEL` で env 化 → LiteLLM proxy を向ければ env 1 個で切替 (サーバー増設不要). 旧 V4 PRO 永久ルールは Global CLAUDE.md NN でも撤回済
- 🆕 **[2026-05-13] Sprint 10 (A+B+C+D) ノンストップ実装**: **A** DeepSeek V4 PRO wrapper (`src/lib/deepseek.ts` Context Cache 最大化 system prompt 固定設計) + form-message generator (`src/lib/sales/form-message.ts`・1痛み×1数字×1アクション 200-300 字制約) + `/api/sales/generate-form-message` / **B** HyperFrames 動画パイプライン (`src/lib/sales/video-generator.ts` narration script JSON 生成→5 scene HTML build→/render API) + `/api/sales/generate-diagnostic-video` / **C** Stripe Checkout (`src/lib/stripe.ts` fetch-based wrapper + HMAC-SHA256 Webhook 署名検証 WebCrypto API) + `/api/stripe/create-checkout-session` (5 plan) + `/api/stripe/webhook` (subscription 状態 sales_customers 同期) / **D** sales LP 12-locale messages namespace 追加 (videoPage/agencyPage/diagnosticReport・ja=完全翻訳・他 11=ja fill で後で DeepSeek 自動翻訳) / TS clean + 41/41 tests ✅
- 🆕 **[2026-05-13] Sprint 9 (A+D+B+C): 営業 OS LP × API × 診断レポート LP**: ① **9-A API routes** `/api/sales/{sync-to-notion, sync-from-notion, upsert-template}` (3 endpoint + `lib/sales/auth.ts` shared secret 認証・constant-time 比較) ② **9-D 診断レポート LP** `/[locale]/diagnostic/[slug]` + `DiagnosticReport.tsx` (3-Act 構造 pain/fear/hope・count-up・in-view animation) + `lib/sales/diagnostic.ts` (sales_companies + sales_templates → DiagnosticReportData builder) + middleware noindex pattern を `/diagnostic/*` まで拡張 ③ **9-B 動画サブスク LP** `/[locale]/video` (3 plan ¥30/50/80万 + 制作会社比較表 + 4 step Process) ④ **9-C 代理店 WL LP** `/[locale]/agency` + `RoiCalculator.tsx` (損失訴求 Aha モーメント・年間損失 vs Paradigm 年間費 = 回収可能粗利) / TS clean + 41/41 tests ✅
- 🆕 **[2026-05-13] Sprint 8: Notion × Supabase ハブ整備**: `supabase/migration_003_sales_hub.sql` (sales_companies / sales_customers / sales_deliveries / sales_templates / sales_sync_logs の 5 テーブル・enum 日本語表記・WL 戦略 is_white_label 対応・RLS 有効化) + `src/lib/notion.ts` (Notion API wrapper・3req/秒 rate limit) + `src/lib/sales/*` (types/companies/customers/templates/sync の 5 ファイル) + `n8n-workflows/{01-supabase-to-notion-sync,02-notion-to-supabase-reverse,03-notion-template-sync}.json` (3 workflow skeleton) + `.env.example` 新規 (Notion / n8n / Stripe-Wise の env 整備) / 旧 archive (Sprint 5-7) は **撤廃確定** (unarchive 計画なし) / tests 41/41 ✅ + TS clean ✅
- 🆕 **[2026-05-13] Sprint 10 (V4 PRO + form-msg + video + Stripe + i18n)**: 🚨 DeepSeek **V4 PRO 永久指定** (`lib/deepseek.ts` DEFAULT_MODEL = "deepseek-v4-pro") + Global CLAUDE.md NN ルール更新 + form-msg generator + HyperFrames 動画 pipeline + Stripe Checkout 5 plan + Webhook 署名検証 (WebCrypto HMAC-SHA256) + sales_customers 状態同期 + 12-locale messages namespace 拡張 (commit 9c079b0)
- 🆕 **[2026-05-13] Sprint 11 (実運用 ready — 8 機能 P0)**: ① `/api/sales/scan/[domain]` PSI + HTML inspect + IssueCode 推定 ② `/api/sales/track-view` 1x1 pixel + report_views++ + HOT 自動判定 (3+ views) ③ `/[locale]/diagnostic/[slug]/opengraph-image` 1200×630 動的 OG (next/og) ④ `lib/notify.ts` Slack Bot API + notifyHotLead Block Kit ⑤ `lib/sales/sources/gbizinfo.ts` 経産省 API enrichment ⑥ `/[locale]/admin/sales` 管理画面 (Cookie auth + KPI 5 + リード一覧 20 + テンプレ覧) ⑦ `scripts/generate-templates-bulk.mjs` (DeepSeek V4 PRO bg 生成) ⑧ DiagnosticReport tracking pixel 埋込 + middleware NOINDEX `/diagnostic/*` 拡張 (commit 2ec123b)
- 🆕 **[2026-05-13] Sprint 13 (URL リネーム + 営業 OS Notion 集約)**: ユーザー指示「URL おかしい. paradigmjp.com/[]/report/事業者名・余計な文字なし. 営業ダッシュボードは Notion ⇔ Supabase MCP 集約・PayloadCMS はコンテンツ管理特化」: ① `sales_companies.slug` カラム追加 + 6 seed slug 付与 (izakaya-en/kansai-construction/hairsalon-lufre/minato-dental/chuo-accounting/select-shop-roppongi) ② `findCompanyBySlug()` + `fetchDiagnosticReport({ slug })` ③ `/[locale]/report/[slug]/page.tsx` + `opengraph-image.tsx` 新規 ④ `/[locale]/diagnostic/* → _archive_diagnostic/*` + `admin/sales → admin/_archive_sales` (Next.js `_` prefix build 除外) ⑤ middleware NOINDEX `/report` 継続カバー ⑥ Slack 通知 URL 一斉置換 (`/report/[slug]`) + admin ボタン → Notion DB 直リンク ⑦ track-view: slug 優先 lookup (uuid/domain backward compat) ⑧ audit script `TEST_SLUG=izakaya-en` / **本番動作確認 11/11 pass** (commit f28655c + 7edbbda) / TS clean ✅
- 🆕 **[2026-05-13] Sprint 12 (実運用カバレッジ完成 — P1 全消化)**: ① 56 templates (8業種×7課題マトリクス) `scripts/seed-sales-templates.mjs` 一括 seed (絶望→希望 5 段階フレーム自動 encode・headline/pain/fear/loss/cta_text) ② `lib/sales/sources/scanner.ts` 共通スキャナ抽出 (scan API と enrich pipeline で共用) ③ `lib/sales/enrich.ts` contact form → corporate domain 検出 → scanDomain + gBizInfo 並列 → sales_companies UPSERT + Slack Block Kit 新規リード通知 (28 自由メール blacklist) ④ `/api/sales/weekly-digest` Slack 週次ダイジェスト (HOT top 5 + ステージ別 + 課題別 + 都道府県別) ⑤ `/api/contact` 拡張 fire-and-forget 非同期 enrich ⑥ `scripts/audit-sales-os.mjs` Layer 1-4 E2E 監査 (LP/公開API/Webhook認証/Admin) ⑦ 6 demo companies seeded (多業種/ステージ) ⑧ `docs/sales-os-setup-runbook.md` (NOTION_API_KEY / Stripe / PSI / GBIZ 設定手順) ⑨ Coolify env DEEPSEEK_API_KEY 投入 (commit 94a76b4 + 8393fa0 + 11ebee7) / TS clean ✅
- 🗄️ **[2026-05-13] appexx.me 連携一時断絶 (fail-soft archive)**: `src/app/api/sales-automation/*` → `_archive_*` / `src/app/api/persona/*` → `_archive_*` / `src/lib/authentik-oidc.ts` → `_archive_*` / Slack 通知 `appexx.me/api/studio/notify` hardcode → `env SLACK_WEBHOOK_URL` + 未設定 no-op (api/contact + lib/error-monitor) / Dify fallback URL `dify.appexx.me` → `api.dify.ai` (DIFY-CLOUD-ONLY 準拠) / Cal.com URL default `cal.appexx.me` → 空文字 + contact page で空時 skip render / Supabase 共有 (PayloadCMS schema `payload`) は維持・データ保護 / 復活は rename 戻し + env 設定で 1 発・詳細 → Task.md「🗄️ アーカイブ済み」
- 🆕 **[2026-05-19] Sprint 14 Phase A: DataForSEO lib 移植 (8 つ目のソース)**: `src/lib/sales/sources/dataforseo/` 新設 (cost.ts / client.ts / lighthouse.ts / index.ts orchestrator) — every-app/open-seo MIT を **リファレンスとして参照しつつ Paradigm-native コードを書く** 戦略採用 (Cloudflare Workers / Autumn 課金 / PostHog 依存を全排除し scanner.ts/ssllabs.ts スタイルに完全統一) / `scanDomainSeo(domain)` で mobile + desktop Lighthouse 並列取得 → Core Web Vitals (LCP/CLS/INP) + 4 scores 抽出 / 1 scan 約 $0.01 (mobile+desktop) / Vitest 15 tests + 全体 56/56 + TS clean / **重要**: 従量課金のため `enrich.ts` 自動 enrich からは呼ばない・診断 CTA や report 生成時のみ明示呼出 (s8-4 env 詳細) / Phase B (on-page audit / backlinks / GEO LLM mentions) は report 設計後

<a id="s10-4"></a>

### 🆕 提案ページ アーキテクチャ 4 鉄則 (2026-04-30 ユーザー指示・全 PJ 共通永久ルール・Appexxme s10-4 同期)

> **背景**: `/p/[slug]/AllInOneClient.tsx` が 2117 行モノリシック + ハードコード JP 文字列で `/en` でも全部日本語が出る・業種で見せ方を変えられない・訴求角度でセクション順序を変えられない問題を構造的に再発不可能にする。

#### 4 鉄則 (CI / PR レビューで強制)

1. **Section-per-file (≤ 200 行)**: `/[locale]/report/[slug]/`・`/[locale]/p/[slug]/` 配下のページは `src/components/proposal/sections/{Hero,KpiCards,Pain,Demo,...}.tsx` に分割。**1 ファイル 200 行を超える section component は分割必須**。orchestrator (`ProposalRenderer.tsx`) は 200 行以下の薄い renderer に保つ
2. **Zero hardcoded strings**: 提案ページの全 UI 文字列は `src/messages/proposal/{locale}.json` 経由 (`useProposalT(locale)` で参照)。**JSX 内に生の日本語/英語/中国語/韓国語/etc. の UI 文字列を書くのは禁止**。会社名・人名・データ値などプロップス由来の文字列は OK
3. **Manifest-driven composition**: section の順序・variant・theme は `ProposalLayoutManifest` (`src/lib/proposal/manifest.ts`) で宣言。**JSX レベルでの `if (industry === "...")` 業種分岐禁止**。業種追加 = manifest 行追加・既存コード触らず
4. **Pure section components**: 各 section は `(data, locale, theme, t, variant) => JSX` の純関数。**業種知識・region 知識を持たず**、与えられたデータをその見せ方で render する役割に専念

#### 訴求角度 (pitch_angle) — 6 種カノニカル

`loss / opportunity / trust / urgency / competitive / compliance` の 6 種。`pitch_angle × industry × region = 720 通り` を Appexxme `proposal_page_patterns` テーブルで DB 管理 (paradigm-HP 側は read-only で参照のみ)。

#### Magic UI 必須採用

提案ページの**視覚的感動 (= 高 CVR)** のため Magic UI コンポーネントを必須採用:
- Hero: `AnimatedGradientText` + `Sparkles` + `BorderBeam`
- KPI: `NumberTicker` + `BorderBeam`
- Cases / WhyUs: `BentoGrid` + `BentoCard`
- MarketTrend: `Meteors`
- CTA: `ShimmerButton` + `Sparkles`
- Video: Remotion 60s パーソナライズ動画 (Pipeline 3 連携・appexx.me/api/sales-automation get_diagnostic_video で取得)

<a id="s10-5"></a>

### 🆕 顧客向けページのドメイン・URL canonical 永久ルール (2026-04-30 ユーザ指示)

| 用途 | canonical URL | 旧 URL (shim 化) |
|------|--------------|----------------|
| **提案/診断レポート公開ページ (顧客向け)** | `https://paradigmjp.com/{locale}/report/[slug]` | `paradigmjp.com/{locale}/p/[slug]` (3ヶ月後 404・redirect shim) |
| **root locale-less URL** | (308 redirect) | `paradigmjp.com/report/[slug]` → `/ja/report/[slug]` |
| **PDF レポート (Slidev → Gotenberg)** | Supabase Storage 直リンク (domain-agnostic) | — |
| **動画レポート (Remotion)** | Supabase Storage 直リンク (domain-agnostic) | — |

#### 鉄則

1. **顧客向け公開 URL は paradigmjp.com 配下のみ**: appexx.me 配下は社内ツール扱い (検索 noindex 対象)
2. **DB/コード/通知/メール本文に書く URL も paradigmjp.com/{locale}/report**: 新規生成での `/p/` 形式禁止
3. **Paradigm-HP に Appexxme と同じ proposal stack を sync 配置**: `src/components/proposal/{ProposalRenderer.tsx, sections/*}` + `src/lib/proposal/{manifest,theme,i18n}.ts` + `src/messages/proposal/{ja,en}.json` + `src/components/magicui/*` (10 components) + `src/lib/stores/sales-region.ts` を Appexxme から同期
4. **shim 廃止スケジュール**: `paradigmjp.com/{locale}/p/[slug]` shim は **2026-07-30 で 404 化**予定

<a id="s10-6"></a>

### 🆕 Anti-Entropy 防止ルール — paradigmjp.com 版 (2026-04-30 ユーザー指示「appexxme 同様厳格ルールを適用」)

> **背景**: paradigm-HP も Appexxme と同様に **モノリシック化 / ハードコード / 黒箱化** を構造的に防ぐ必要がある。Appexxme の Anti-Entropy 13 ルールから paradigm-HP に適用すべき項目を抜粋・新設。

#### AE-PHP-1: ファイル分割の鉄則 (≤ 500 行・section ≤ 200 行)

`src/components/` 配下の各 React component は **500 行を超えたら分割必須**。提案ページの section component は 200 行が上限 (s10-4 鉄則 1 と一致)。違反検知時は即分割 PR を切る。

#### AE-PHP-2: i18n strict (next-intl 既導入のため強制)

paradigm-HP は既に `next-intl` v4 を導入済 → **JSX 内の生の日本語/英語/etc UI 文字列は禁止**。`useTranslations()` 経由で必ず `messages/{locale}.json` から取得する。例外: 会社名・データ値・URL・コードブロック内の例示文字列。

#### AE-PHP-3: SEO/GEO metadata の必須化

すべての page.tsx は `generateMetadata` を export し、以下を最低限含めること:
- `title` / `description` (locale 別)
- `openGraph` (image / type / locale)
- `twitter` (card / title / description)
- `alternates.canonical` (canonical URL)
- `alternates.languages` (hreflang・全 locale 分)
- ページ種別に応じた JSON-LD 構造化データ (LocalBusiness / Service / Article / FAQPage / BreadcrumbList のいずれか以上)

詳細は s5 SEO・GEO 戦略セクション参照。

#### AE-PHP-4: ブラックボックス化禁止 (各ページに目的明示)

新規 page.tsx 追加時は冒頭コメントに **役割 (このページの存在意義) / 受け取る入力 / 出力する効果** を明記。CMS 連動ページは「どの collection から何を引くか」を明示。違反検知時は即追記する。

#### AE-PHP-5: 提案ページ 4 鉄則の強制 (s10-4 と同期)

`/[locale]/report/[slug]/`・`/[locale]/p/[slug]/` 配下は s10-4 4 鉄則完全準拠。違反は build pre-check で検出 (200 行制限・hardcoded JSX 文字列検出)。

#### AE-PHP-6: Payload CMS フル活用 (Block-based composition)

サイトのデザイン・コンテンツの主要部分は **Payload Pages collection の Block 配列で構成** する (Hero / Section / CardGrid / CTA / FAQ / RichText 等の Block を組み合わせる方式)。**ハードコード Page を増やすのは禁止** (例外: middleware が必要な認証ページ等)。Block の追加 = `src/blocks/{NewBlock}.ts` + Pages collection への登録 のみで完結すること。

#### 違反検知時の自動アクション

私 (Claude Code) は以下を発見したら**指示待ちなく**修正する:
- 500 行超えの component / 200 行超えの section
- JSX 内の生の日本語/英語 UI 文字列 (会社名等プロップスは除く)
- canonical metadata 欠如・hreflang 欠如・JSON-LD 欠如の page.tsx
- 役割コメント欠如の新規 page.tsx
- ProposalLayoutManifest を使わず手動で section を組み立てる新規ページ
- 「同じ機能を持つ component の重複」(必ず 1 箇所に統合する・AE-2 single-route-owner と同じ)

#### AE-PHP-7: 全コンテンツ DB 化 + PayloadCMS 編集可能化（2026-04-30 ユーザ指示・永久ルール）

> **3 大原則**: ① 全 visible content は **ハードコード NG** ② **DB (Supabase) 化** ③ **PayloadCMS で編集可能** にする。
>
> 違反: hero タイトル / section heading / card title / desc / FAQ / testimonials / process steps / 規約 等を JSX 内で literal string として書くこと。
> 例外: ブランド固有名詞（PARADIGM 等）、code 例示、a11y aria-label の最低限のみ。
>
> 推奨実装パターン:
> 1. **Pages collection (Payload) の `layout` Block 配列で組む** — 新セクションは Block 拡張で対応。
>    既存 Block: Hero / Section / CardGrid / CTA / FAQ / RichText
>    新規追加時は `src/blocks/{NewBlock}.ts` (config) + `BlockRenderer.tsx` に 1 行 dispatcher 追加で完結。
> 2. **専用 collection** (Services / Pricing / FAQs / Works / Posts) は既に DB 化済み — page.tsx は payload.find で取得して描画するだけ。
> 3. **HomeClient + 8 sections** は P19 で Pages collection の layout に移行予定 (現在は次善策として messages 経由で i18n 対応済 / hardcoded JP/EN は削減進行中)。
>
> 本ルール違反時のアクション:
> - 私（Claude Code）は新ページ作成・既存ページ編集時に**生 string を JSX に書きそうになったら即座に Block 化または既存 collection 取得に切り替える**（指示待ち禁止）。
> - admin UI から編集できないテキストを発見したら即「→ PayloadCMS Block 化提案」を出す。

<a id="s10-7"></a>

### 🆕 営業 OS スキーマ所有境界（2026-05-20 監査確定・永久ルール）

> **背景**: paradigmjpcom と Appexxme は Supabase `yihdmgtxiqfdgdueolub` を共有し、両者とも `public` スキーマに `sales_*` テーブルを持つ（名前衝突）。誤って相手の本番データを触る事故を構造的に防ぐための所有境界。詳細監査 → memory `project-sales-os-duplication.md`。

| 所有 | 背骨 | テーブル | 本リポジトリの扱い |
|------|------|---------|------------------|
| **paradigm-HP（自己完結）** | `sales_companies` | sales_companies / sales_customers / sales_deliveries / sales_templates / sales_sync_logs / sales_activity_log / sales_calendar_events / sales_contracts / sales_kpi | **read + write 可**（lib/sales/* + migration_003/004） |
| **Appexxme（別 PJ）** | `leads` | leads / proposal_pages / sales_activities / sales_materials / sales_flows / sales_sequences / sequence_executions / sales_knowledge / sales_documents | **触らない**（read も原則しない・archive/legacy 除く） |

**鉄則**:
1. paradigm-HP の営業 OS は `sales_companies` を背骨に**自己完結**（Appexxme `leads` 系に依存しない）
2. Appexxme 所有テーブルへの write 禁止・名前が紛らわしくても**別物**（例: `sales_activity_log`=自社 ⇄ `sales_activities`=Appexxme）
3. 名前衝突は **rename で解消しない**（両 PJ のコード破壊リスク大）。境界はこの表とコメントで管理
4. スキーマ変更は必ず `supabase/migration_*.sql` に記録（MCP 直 DDL の正史化漏れ＝ドリフトを再発させない）

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
| StoreLeads | Shopify/BigCommerce/WooCommerce店舗DB（/en アウトリーチリスト用） | https://storeleads.app |

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

<a id="s13-9"></a>

#### /en 営業・英語対応ツール
| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| ElevenLabs | 音声合成・英語スクリプト読み上げ→シャドーイング練習（1週間英語集中ブートキャンプ） | https://elevenlabs.io |
| Gemini Live | 英語会話AIロールプレイ（商談シミュレーション・発音練習） | https://gemini.google.com |
| ELSA Speak | 英語発音スコアリングアプリ（頻出フレーズ仕上げ・当日前確認） | https://elsaspeak.com |
| Deeptrue | 日本語↔英語リアルタイム通訳（AIアバター型・Zoom接続・ネイティブ品質） | https://deeptrue.ai |
| VoicePing | リアルタイム字幕通訳（Zoom/Teams対応・聞き取り補助） | https://voiceping.io |
| JotMe | 多言語リアルタイム文字起こし・翻訳（会議中の字幕表示） | https://jot.me |
| Fathom | Zoom録画→AIサマリー→CRM自動連携（商談記録・Twenty CRM連携） | https://fathom.video |
| tl;dv | 会議録画・AI要約・CRM連携（Fathom代替） | https://tldv.io |
| PandaDoc | 提案書作成・電子署名・ページ別閲覧トラッキング（料金ページ滞在時間で即架電判定） | https://www.pandadoc.com |
| Clay | アウトリーチリストの自動パーソナライズ（100件→5件デモ用メール文生成自動化） | https://www.clay.com |
| Instantly | コールドメール大量配信・ドメイン評判分離（Smartlead代替・$37〜97/月） | https://instantly.ai |
| StoreLeads | Shopify/BigCommerce/WooCommerce店舗DB（/en アウトリーチリスト用・[→ s9-5](#s9-5)詳細） | https://storeleads.app |

**コンタクトDB・リード取得**（メールアドレス・電話番号取得フェーズ・[→ s9-6 コンタクト情報取得ツール](#s9-6)詳細）

| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Hunter.io | ドメイン→メアド一覧取得・Verify内蔵（無料25件/月・$34〜） | https://hunter.io |
| Apollo.io | メール+電話+LinkedIn+シーケンス一体型・最強コスパ（無料10,000メール/月・$49〜） | https://apollo.io |
| Snov.io | ドメイン検索+メール確認+ドリップキャンペーン（無料50クレジット/月・$30〜） | https://snov.io |
| RocketReach | LinkedIn/会社HP→メール・電話直接取得・精度高い（無料5件/月・$39〜） | https://rocketreach.co |
| Cognism | GDPR準拠データベース・EU/UK向け最強・電話番号精度◎（要見積り） | https://cognism.com |
| Kaspr | LinkedIn拡張・リアルタイム電話番号取得・Cognism傘下（無料15メール+5電話/月・$49〜） | https://kaspr.io |
| Lusha | Chrome拡張でLinkedIn上に直接表示・簡単操作（無料40クレジット/月・$29〜） | https://lusha.com |
| Skrapp.io | LinkedIn Sales Navigator連携・バルクエクスポート（月50件無料・$39〜） | https://skrapp.io |
| Prospeo | LinkedInプロフィールURL→メール取得API・n8n連携容易（75件/月無料・$49〜） | https://prospeo.io |
| Crunchbase | スタートアップ・資金調達企業DB・投資家/創業者特定（7日トライアル・$49〜） | https://crunchbase.com |
| PhantomBuster | LinkedIn/Instagram/Twitter等SNS自動スクレイプBot（2時間/日無料・$56〜） | https://phantombuster.com |
| Wiza | LinkedIn Sales Navigator→CSV一括エクスポート特化（20メール+5電話/月無料・$83〜） | https://wiza.co |
| FindThatLead | ドメイン→メール取得・スペイン語圏EU中小企業に強い（50件/月無料・$49〜） | https://findthatlead.com |
| Dealfront/Echobot | DACH地域（独・墺・瑞）特化・GDPR準拠（デモのみ・€165〜） | https://dealfront.com |
| Ampliz | アジア太平洋・中東・アフリカ地域特化（月10件無料・$50〜） | https://ampliz.com |
| ContactOut | GitHub/LinkedIn→個人メール取得・エンジニア/開発者特定（Gmail拡張無料・$29〜） | https://contactout.com |
| IGLeads | Instagram投稿・フォロワーからメール収集・D2C/EC特化（トライアルあり・$49〜） | https://igleads.io |
| LinkedIn + Crawl4AI | OSINTスクレイプ・プロフィール→コンタクト情報自動取得（完全無料） | https://crawl4ai.com |
| CommonCrawl CDX API | ドメインのサブページ・コンタクトページURL取得（完全無料） | https://commoncrawl.org |
| Google Maps Places API | 電話番号・住所・WebサイトURL取得（月$200無料枠） | https://developers.google.com/maps/documentation/places |

**Wappalyzer OSS テクノグラフィクス（技術スタック判定・無料）**

| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| webanalyze | Go製CLIツール・並列20ワーカー・CSV出力・バルクスキャン（1万件〜）向け第1段階 | https://github.com/rverton/webanalyze |
| wappalyzer-next | Python製・精度確認フェーズ向け・webanalyzeフラグサイトの詳細判定 | https://github.com/wappalyzer/wappalyzer |
| MassWappalyzer | Node.js製・Windows環境向け・GUI操作可 | https://github.com/AliasIO/wappalyzer |

**テクノグラフィクスデータセット（無料公開・ゼロコスト5万件）**

| データセット | 規模 | ライセンス | URL |
|------------|------|-----------|-----|
| leadita/tech-stack-datasets | GitHub MIT・技術別500件サンプル | MIT | https://github.com/leadita/tech-stack-datasets |
| PDL Free Technographics | 5,100万社×403技術・技術別500件無料 | MIT | https://www.peopledatalabs.com/technographics |
| Kaggle "shopify domains" | 46.5万件ドメインリスト | Public | https://www.kaggle.com/datasets |
| CommonCrawl WAT files | 無制限・Content-Typeヘッダー抽出 | Public Domain | https://commoncrawl.org/the-data/get-started |

**公的DB / オープンデータ（大量リスト無料取得）**

| DB / ソース | 規模 | 無料範囲 | URL |
|------------|------|---------|-----|
| GLEIF | 215万社（LEI全件CSV） | 全件無料 | https://www.gleif.org/en/lei-data/gleif-golden-copy |
| Companies House UK | 500万社（全件CSV週次更新） | 全件無料 | https://www.gov.uk/get-information-about-a-company |
| OpenCorporates API | 1.6億社 | 100件/日無料 | https://api.opencorporates.com |
| EU Open Data Portal | EU企業公開データ | 全件無料 | https://data.europa.eu |
| Swiss Zefix | スイス全企業 | 全件無料 | https://www.zefix.admin.ch |

**グローバルBtoB補完ポータル（EU製造業・卸売向け）**

| ツール/サービス | 用途 | URL |
|----------------|------|-----|
| Kompass | 1944年スイス創業・70+カ国・6,000万社DB。EU製造業・卸売・Apollo非カバー領域の補完用（閲覧は無料・CSV出力は有料）。Apollo補完ポジション。D7 Lead Finder（SMBポータル・1検索1,200件・CSV出力$25〜50/月）も参照 | https://www.kompass.com |
