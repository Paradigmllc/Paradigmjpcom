/**
 * lib/blog.ts — DEPRECATED: legacy in-code blog seed (4 JP-only posts).
 *
 * 2026-05-01 (P18 P19 移行): 新しい consumer は必ず `lib/blog-cms.ts` の
 * `getAllBlogPosts(locale)` / `getBlogPostBySlug(slug, locale)` /
 * `getAllBlogSlugs()` を使うこと。BLOG_POSTS は Payload Posts collection が
 * 空の場合のフォールバック seed として残してある。
 *
 * 移行手順:
 *   1. /admin (PayloadCMS) を開く
 *   2. Posts collection で同じ slug の Post を作成
 *   3. content (richText) と availableLocales=["ja"] を設定
 *   4. 全 4 件移行完了後、このファイルから BLOG_POSTS を削除
 */

// ─── ブログ記事データ (legacy seed) ───
export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  category: string
  tags: string[]
  readTime: string
  heroImage?: {
    src: string
    alt: string
    caption: string
  }
}

/** @deprecated Use lib/blog-cms.ts. Remaining only as Payload-empty fallback. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-geo",
    title: "GEO対策とは？AI検索時代のSEO戦略を解説",
    excerpt: "ChatGPTやGeminiなどのAI検索で自社が推薦されるための「GEO（Generative Engine Optimization）」について、従来のSEOとの違いと具体的な対策方法を解説します。",
    content: `
## GEOとは？

GEO（Generative Engine Optimization）とは、ChatGPT・Gemini・Perplexityなどの**AI検索エンジンで自社が推薦・引用されるための最適化施策**です。

従来のSEOがGoogleの検索結果ページ（SERP）での上位表示を目指すのに対し、GEOはAIが生成する回答の中で自社や自社サービスが言及されることを目指します。

## SEOとGEOの違い

| 項目 | SEO | GEO |
|------|-----|-----|
| 対象 | Google/Yahoo検索 | ChatGPT/Gemini/Perplexity |
| 目標 | 検索結果上位表示 | AI回答での推薦・引用 |
| 重要指標 | キーワード順位 | 引用率・推薦率 |
| 技術 | テクニカルSEO + コンテンツ | エンティティSEO + 信頼性 |

## なぜ今GEOが重要なのか

2024年以降、AI検索の利用者は急増しています。特にBtoB領域では「○○ おすすめ」「○○ 比較」といった検索がAI検索に移行しつつあり、AIの回答で推薦されるかどうかがビジネスに直結します。

## GEO対策の5つのポイント

1. **構造化データの実装** — Schema.orgマークアップでAIが情報を理解しやすくする
2. **E-E-A-Tの強化** — 専門性・経験・権威性・信頼性を示すコンテンツ
3. **エンティティSEO** — Googleのナレッジグラフに自社情報を登録
4. **FAQ構造化** — よくある質問をJSON-LDで構造化
5. **被引用施策** — 権威あるサイトからの引用・言及を増やす

## まとめ

GEO対策は、今後のデジタルマーケティングにおいて避けて通れない施策です。SEOとGEOを組み合わせた**二刀流の検索対策**が、これからの集客の鍵になるでしょう。

Paradigmでは、SEO+GEOをJapan Entryの固定スコープに組み込みます。セットアップ費用と依存条件は適合審査で確認します。
    `.trim(),
    date: "2025-03-15",
    category: "SEO/GEO",
    tags: ["GEO", "AI検索", "SEO", "ChatGPT"],
    readTime: "5分",
  },
  {
    slug: "meo-basics-2025",
    title: "【2025年版】MEO対策の基本と成功のポイント",
    excerpt: "Googleマップで上位表示を実現するMEO対策の基本を解説。Googleビジネスプロフィールの最適化から口コミ施策まで、成功に必要な知識をまとめました。",
    content: `
## MEO対策とは？

MEO（Map Engine Optimization）とは、**Googleマップでの検索結果で上位表示を目指す施策**です。「近くのカフェ」「○○市 歯医者」といった地域検索で、自店舗がTOP3に表示されることを目標とします。

## なぜMEO対策が重要なのか

- Googleマップの検索結果TOP3は**クリック率が圧倒的に高い**
- 地域検索ユーザーの**76%が24時間以内に来店**するデータがある
- SEOよりも**競合が少なく、短期間で効果が出やすい**

## MEO対策の5つの基本ステップ

### 1. Googleビジネスプロフィール（GBP）の完全最適化
- 正確なNAP情報（名前・住所・電話番号）の統一
- カテゴリの適切な設定（メイン+サブ）
- 営業時間・サービス内容の詳細記載

### 2. 写真・動画の充実
- 店内・外観・メニュー・スタッフの写真を定期的にアップロード
- 月10枚以上が目安

### 3. 口コミの獲得と返信
- 来店客への口コミ依頼を仕組み化
- 全ての口コミに丁寧に返信（ネガティブも含む）

### 4. 投稿の定期更新
- 週1〜2回のGBP投稿でアクティブ状態を維持
- キャンペーン・新メニュー・イベント情報を発信

### 5. 順位トラッキングと改善
- 主要キーワードの順位を週次で確認
- データに基づく改善アクションを継続

## 効果が出るまでの期間

一般的に、MEO対策の効果が出始めるまでは**1〜3ヶ月**が目安です。業種や地域の競合状況により異なりますが、継続的な施策が成功の鍵です。

## まとめ

MEO対策は、来店型ビジネスにとって最もコストパフォーマンスの高い集客施策の一つです。まずはGBPの最適化から始めてみましょう。

日本市場向けのMEO導線が必要な企業は、Japan Entryの適合審査で対象範囲と運用条件をご確認ください。
    `.trim(),
    date: "2025-02-20",
    category: "MEO",
    tags: ["MEO", "Googleマップ", "GBP", "ローカルSEO"],
    readTime: "6分",
  },
  {
    slug: "ai-business-automation",
    title: "中小企業のためのAI業務自動化ガイド",
    excerpt: "ChatGPTやOpenClawを活用した業務自動化の実践ガイド。カスタマー対応、レポート作成、コンテンツ制作の自動化事例と導入ステップを紹介します。",
    content: `
## AI業務自動化とは

AI業務自動化とは、人工知能（AI）と自動化ツールを組み合わせて、**繰り返しの業務を自動で処理する仕組み**を構築することです。

## 中小企業でもAI自動化できる3つの業務

### 1. カスタマー対応（AIチャットボット）
- **導入効果**: 問い合わせの70〜80%を自動応答
- **ツール**: ChatGPT API + Dify
- **構築期間**: 約2週間
- **コスト**: 月額5,000〜20,000円

FAQをAIに学習させることで、24時間365日の自動応答が可能になります。人間は複雑な問い合わせだけに集中できます。

### 2. レポート作成の自動化
- **導入効果**: 月次レポート作成時間を1/5に短縮
- **ツール**: OpenClaw + Google Sheets + AI
- **構築期間**: 約1週間

データ収集→分析→グラフ作成→レポート生成までを自動化。人間は内容の確認と意思決定に集中できます。

### 3. コンテンツ制作支援
- **導入効果**: コンテンツ制作コストを60%削減
- **ツール**: ChatGPT/Gemini + 人間の監修
- **構築期間**: 即日〜

ブログ記事のドラフト、SNS投稿文、メルマガのたたき台をAIが作成。人間がブランドトーンに合わせて仕上げます。

## AI導入の3ステップ

1. **業務棚卸し**: 繰り返し作業をリストアップ
2. **優先順位付け**: 効果×難易度でマトリクス化
3. **スモールスタート**: 1つの業務から始めて成功体験を作る

## よくある失敗パターン

- ❌ いきなり全業務をAI化しようとする
- ❌ 人間の監修なしにAI出力をそのまま使う
- ❌ 導入後の運用体制を考えない

## まとめ

AI業務自動化は、中小企業こそ大きなメリットを得られる施策です。少ない人数で大きな成果を出すために、AIを「もう一人の社員」として活用しましょう。

Paradigm合同会社では、御社に最適なAI導入プランを無料でご提案しています。
    `.trim(),
    date: "2025-01-10",
    category: "AI",
    tags: ["AI", "業務自動化", "ChatGPT", "中小企業"],
    readTime: "7分",
  },
  {
    slug: "nextjs-vs-wordpress",
    title: "Next.js vs WordPress：企業サイトに最適なのはどっち？",
    excerpt: "企業サイトの構築でNext.jsとWordPressのどちらを選ぶべきか。表示速度、SEO、運用コスト、セキュリティの観点から徹底比較します。",
    content: `
## はじめに

企業サイトを新規制作・リニューアルする際、最もよく聞かれる質問が「Next.jsとWordPress、どちらがいいですか？」です。

結論から言うと、**どちらが優れているかではなく、御社の用途に合っているかで選ぶべき**です。

## 比較表

| 項目 | Next.js | WordPress |
|------|---------|-----------|
| 表示速度 | ◎ 非常に高速 | △ プラグイン次第 |
| SEO | ◎ SSG/ISRで最適化 | ○ プラグインで対応 |
| 更新の容易さ | △ 技術者が必要 | ◎ 非エンジニアでも可 |
| セキュリティ | ◎ 静的サイトで攻撃面少 | △ プラグイン脆弱性リスク |
| カスタマイズ性 | ◎ 自由自在 | ○ テーマ+プラグイン |
| 初期コスト | 高め | 低め |
| 運用コスト | 低い | 中程度 |

## Next.jsが向いているケース

- **表示速度が最重要**（ECサイト、LP）
- **セキュリティ要件が高い**（金融、医療）
- **独自のUI/UXを実現したい**
- **更新頻度が低い**コーポレートサイト

## WordPressが向いているケース

- **ブログ・ニュースを頻繁に更新**する
- **社内で更新作業を完結**させたい
- **予算を抑えたい**（初期費用重視）
- **既存のWordPressサイト**をリニューアル

## Paradigmのアプローチ

当社では、お客様の要件に応じて最適な技術を選定します。「速度とセキュリティ重視ならNext.js」「更新頻度重視ならWordPress」——Japan Entryの適合審査で、固定スコープと引き継ぎ条件に沿って判断します。

どちらの技術でも、SEO最適化・レスポンシブ対応・Core Web Vitals対策は標準で含まれます。
    `.trim(),
    date: "2024-12-05",
    category: "Web制作",
    tags: ["Next.js", "WordPress", "Web制作", "比較"],
    readTime: "5分",
  },
]

/** @deprecated Use lib/blog-cms.ts `getBlogPostBySlug(slug, locale)` instead. */
export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}
