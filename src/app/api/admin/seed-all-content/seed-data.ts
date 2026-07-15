// @ts-nocheck — seed data file, PayloadCMS collection types vary at runtime
import type { getPayload as getPayloadType } from "payload"
import { EN_JAPAN_ENTRY_COMPARISON_BLOCK, EN_JAPAN_ENTRY_PROCESS_BLOCK, EN_PROFESSIONAL_USE_CASE_SECTION } from "./homepage-en-blocks"
import {
  JAPAN_ENTRY_MONTH_ONE_TARGET,
  JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE,
  JAPAN_ENTRY_MONTH_ONE_TARGET_STAT,
} from "@/lib/japan-entry-public-copy"
function textToLexical(text: string) {
  return {
    root: { type: "root" as const, direction: "ltr" as const, format: "" as const, indent: 0, version: 1,
      children: text.split("\n\n").filter(Boolean).map((para) => ({
        type: "paragraph" as const, direction: "ltr" as const, format: "" as const, indent: 0, version: 1,
        children: [{ type: "text" as const, text: para, format: 0 }],
      })),
    },
  }
}
export const CATEGORIES = [
  { slug:"seo-geo", ja:{name:"SEO/GEO", desc:"検索エンジン最適化とAI検索対策の最新情報"}, en:{name:"SEO/GEO", desc:"Latest insights on search engine optimization and AI search"}, color:"indigo" as const, sort:1 },
  { slug:"ai-automation", ja:{name:"AI・自動化", desc:"AI活用・業務自動化・DX推進の実践ノウハウ"}, en:{name:"AI & Automation", desc:"Practical know-how for AI adoption, automation, and DX"}, color:"violet" as const, sort:2 },
  { slug:"web-production", ja:{name:"Web制作", desc:"Webサイト制作・リニューアルのノウハウと最新トレンド"}, en:{name:"Web Development", desc:"Best practices and trends in web development and redesign"}, color:"emerald" as const, sort:3 },
  { slug:"digital-marketing", ja:{name:"デジタルマーケティング", desc:"集客・成約率改善・データ活用の総合マーケティング情報"}, en:{name:"Digital Marketing", desc:"Comprehensive marketing insights for lead generation, CVR, and data utilization"}, color:"amber" as const, sort:4 },
]
interface SeedPost { slug: string; ja: { title: string; excerpt: string; cat: string; read: string; content: string }; en: { title: string; excerpt: string; cat: string; read: string; content: string }; tags: string[]; date: string }
const POSTS_PART1: SeedPost[] = [
  { slug:"geo-2025-complete-guide", ja:{title:"GEO完全ガイド 2025 — AI検索時代のSEO戦略", excerpt:"ChatGPT、Perplexity、Google AI Overviews。AIが回答を生成する時代に、検索流入を獲得する新手法GEOの全貌を解説。従来SEOとの違い、具体的な最適化手法、12カ国語対応の実践戦略まで。", cat:"SEO/GEO", read:"12分", content:`## GEOとは何か\n\nGEO（Generative Engine Optimization）は、ChatGPT、Perplexity、Google AI Overviews、Claude、Geminiといった生成AIエンジンにおいて、自社コンテンツが引用・参照されるよう最適化する新しい分野です。従来のSEOが「Googleの青リンク10件」の中での上位表示を目指すのに対し、GEOは「AIが生成する回答」の中に自社情報を組み込ませることを目的とします。\n\n## なぜ今GEOが必要なのか\n\n2025年現在、検索行動は大きく変化しています。Google検索でもAI Overviewsが上部に表示され、ユーザーは青リンクをクリックする前にAIの回答を読んで満足してしまうケースが増えています。PerplexityやChatGPT Searchの利用率も急増しており、従来型SEOだけでは獲得できないトラフィックが拡大しています。\n\n## GEOとSEOの決定的な違い\n\nSEOが「クローラー向けの技術最適化＋被リンク獲得」であるのに対し、GEOは「AIが学習・引用したくなる情報価値」が核心です。一次データ・独自統計の保有、権威ある外部ソースからの被引用実績、構造化された明確な情報設計、質問に対する直接的で簡潔な回答が重要です。\n\n## 具体的なGEO最適化手法\n\nTL;DR要約を冒頭に配置、独自統計・データを提示、外部引用シグナルを強化、構造化データ（JSON-LD）を完璧に実装、多言語展開でグローバルAI検索をカバー。Paradigmでは12カ国語対応のGEO最適化を提供しています。`}, en:{title:"GEO 2025 Complete Guide — SEO Strategy for the AI Search Era", excerpt:"ChatGPT, Perplexity, Google AI Overviews. A complete guide to GEO — the new discipline for winning traffic in the AI-generated answer era. Differences from traditional SEO, concrete optimization methods, and a 12-language practical strategy.", cat:"SEO/GEO", read:"12 min", content:`## What is GEO\n\nGEO (Generative Engine Optimization) is a new discipline focused on optimizing content so that AI engines — ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini — cite and reference your brand in their generated answers. While traditional SEO targets ranking among Google's blue links, GEO aims to embed your information directly into AI-generated responses.\n\n## Why GEO Matters Now\n\nSearch behavior has shifted dramatically. Google's own AI Overviews now dominate the top of search results, and users often find answers without ever clicking a link. Perplexity and ChatGPT Search adoption is accelerating, creating traffic channels that traditional SEO alone cannot capture.\n\n## Key Differences\n\nSEO focuses on technical crawler optimization and backlinks. GEO centers on the information value that makes AI want to cite you: original data, citation track record, clear information architecture, and direct concise answers.\n\n## Practical GEO Optimization\n\nPlace TL;DR summaries at the top, present original statistics, strengthen external citation signals, implement complete structured data (JSON-LD), and cover global AI search through multilingual deployment. Paradigm provides GEO optimization across 12 languages.`}, tags:["GEO","AI検索","ChatGPT","Perplexity","SEO"], date:"2025-08-01" },
  { slug:"seo-technical-checklist-2025", ja:{title:"【2025年版】テクニカルSEO完全チェックリスト", excerpt:"Core Web Vitals、モバイルファースト、構造化データ、サイト速度。検索順位を左右するテクニカルSEOの全要素を50項目で網羅。INP対応やNext.js最適化も解説。", cat:"SEO/GEO", read:"15分", content:`## テクニカルSEOの重要性\n\nテクニカルSEOは、検索エンジンがサイトを正しくクロール・インデックスできるようにする基盤整備です。コンテンツが素晴らしくても技術的な問題で検索順位が上がらないケースは非常に多くあります。\n\n## 2025年の重要トピック\n\nGoogleはINP（Interaction to Next Paint）をCore Web Vitalsの正式指標に採用しました。FIDに代わるこの指標はユーザー操作への応答速度を測定します。\n\n## 主要チェック項目\n\nクロール・インデックス: XML Sitemapの自動生成と送信、robots.txtの適切な設定、canonicalタグの正しい実装。構造化データ: Organizationスキーマ、BreadcrumbListスキーマ、FAQスキーマ、Articleスキーマ。Core Web Vitals: LCP 2.5秒以内、INP 200ms以内、CLS 0.1以内、画像のWebP/AVIF化。モバイル: レスポンシブデザイン、タップターゲットサイズ、コンテンツパリティ。\n\n## Next.jsサイトの最適化\n\nnext/image活用、動的メタデータのgenerateMetadata実装、ISRによるパフォーマンス最適化、適切なキャッシュ戦略の設定が重要です。`}, en:{title:"2025 Technical SEO Complete Checklist", excerpt:"Core Web Vitals, mobile-first indexing, structured data, site speed. A complete 50-item checklist covering every technical SEO factor that impacts rankings, including INP and Next.js optimization.", cat:"SEO/GEO", read:"15 min", content:`## The Importance of Technical SEO\n\nTechnical SEO is the foundation that enables search engines to correctly crawl and index your site. Even with exceptional content, technical issues frequently prevent sites from ranking well.\n\n## Key 2025 Topics\n\nGoogle adopted INP (Interaction to Next Paint) as a Core Web Vitals metric. This replacement for FID measures responsiveness to user interactions.\n\n## Major Checklist Items\n\nCrawl & Index: XML Sitemap, proper robots.txt, correct canonical tags. Structured Data: Organization, BreadcrumbList, FAQ, Article schemas. Core Web Vitals: LCP under 2.5s, INP under 200ms, CLS under 0.1, WebP/AVIF images. Mobile: Responsive design, tap target sizing, content parity.\n\n## Next.js Optimization\n\nPay attention to next/image usage, dynamic metadata via generateMetadata, ISR performance optimization, and proper cache strategy configuration.`}, tags:["テクニカルSEO","Core Web Vitals","チェックリスト","Next.js"], date:"2025-07-20" },
  { slug:"keyword-research-ai-era", ja:{title:"AI時代のキーワード戦略 — 検索意図の深掘りとトピッククラスター設計", excerpt:"従来のキーワード単位のSEOは限界を迎えています。AI検索時代に必要な「検索意図マッピング」「トピッククラスター」「エンティティ最適化」の3本柱を解説します。", cat:"SEO/GEO", read:"8分", content:`## キーワードSEOの限界\n\n「ビッグキーワードで1位を取る」という従来型SEO戦略はもはや十分ではありません。AI検索の台頭によりユーザーは単一キーワードではなく複雑な質問を投げかけるようになっています。\n\n## 検索意図マッピング\n\nキーワードの背後にあるユーザーの真の意図を情報型（知りたい）、ナビゲーション型（行きたい）、商標型（比べたい）、取引型（買いたい）の4象限で分類します。\n\n## トピッククラスター戦略\n\nピラーページを中心に関連するクラスターページを放射状に配置しサイト全体の専門性と権威性を高めます。\n\n## エンティティ最適化\n\nGoogleのKnowledge GraphやAIのナレッジベースに自社や商品を「エンティティ」として正しく認識させる手法です。Schema.orgの適切な実装、Wikipedia/Wikidataとの連携、外部メディアでの一貫した言及が重要です。`}, en:{title:"Keyword Strategy in the AI Era", excerpt:"Keyword-level SEO is reaching its limits. Learn the three pillars needed in the AI search era: search intent mapping, topic clusters, and entity optimization.", cat:"SEO/GEO", read:"8 min", content:`## The Limits of Keyword SEO\n\nThe traditional strategy of ranking #1 for a big keyword is no longer sufficient. AI search users ask complex questions rather than typing single keywords.\n\n## Search Intent Mapping\n\nClassify true user intent into four quadrants: Informational, Navigational, Commercial, Transactional.\n\n## Topic Cluster Strategy\n\nA hub-and-spoke structure with pillar pages at the center builds site-wide expertise and authority.\n\n## Entity Optimization\n\nEnsure AI knowledge bases correctly recognize your brand as an entity through proper Schema.org implementation, Wikipedia/Wikidata integration, and consistent external mentions.`}, tags:["キーワード戦略","検索意図","トピッククラスター","SEO"], date:"2025-07-10" },
  { slug:"meo-google-maps-ranking", ja:{title:"MEO対策の全て — Googleマップで上位表示するための15の施策", excerpt:"Googleビジネスプロフィールの最適化から口コミ戦略、投稿運用、ローカルSEO連携まで。地域ビジネスがGoogleマップで上位表示されるための具体的施策を全公開します。", cat:"SEO/GEO", read:"10分", content:`## MEO対策とは\n\nMEO（Map Engine Optimization）はGoogleマップ検索での上位表示を目指す施策です。特に実店舗を持つビジネスや地域密着型のサービスにとって集客の生命線です。\n\n## GBP最適化のポイント\n\nビジネス名・住所・電話番号の正確な一致（NAP整合性）、営業時間・定休日の正確な設定、カテゴリの適切な選択、ビジネス説明文へのキーワード自然な組み込み、高品質な写真の定期投稿、Q&Aセクションの整備。\n\n## 口コミ戦略\n\n口コミの数と質、返信率がMEO順位に大きく影響します。全口コミへの24時間以内の返信、ポジティブ口コミへの感謝＋サービスの再訴求、ネガティブ口コミへの誠実な対応が重要です。\n\n## 投稿運用\n\nGBPの投稿機能を活用し最新情報・イベント・特典を定期的に発信します。投稿は14日間で期限切れになるため最低週1回の更新が推奨されます。`}, en:{title:"Complete MEO Guide — 15 Tactics to Rank Higher on Google Maps", excerpt:"From Google Business Profile optimization to review strategy, post management, and local SEO integration. Everything local businesses need to rank higher on Google Maps.", cat:"SEO/GEO", read:"10 min", content:`## What is MEO\n\nMEO (Map Engine Optimization) focuses on achieving top rankings in Google Maps search. For businesses with physical locations, MEO is a critical customer acquisition channel.\n\n## GBP Optimization Essentials\n\nExact NAP consistency, accurate hours including holidays, proper category selection, natural keyword inclusion in description, regular high-quality photo uploads, Q&A section setup.\n\n## Review Strategy\n\nReview quantity, quality, and response rate significantly impact MEO rankings. Respond to all reviews within 24 hours, thank positive reviewers, address negative reviews with genuine plans.\n\n## Post Management\n\nUse GBP posts to regularly share updates and offers. Posts expire after 14 days, so aim for at least weekly updates.`}, tags:["MEO","Googleマップ","ローカルSEO","口コミ","集客"], date:"2025-06-25" },
  { slug:"structured-data-seo-guide", ja:{title:"構造化データ完全入門 — JSON-LDで検索表示を劇的に改善する方法", excerpt:"リッチリザルト、ナレッジパネル、サイトリンク検索ボックス。構造化データの正しい実装方法とビジネス成果に直結する7つのスキーマタイプを実例付きで解説します。", cat:"SEO/GEO", read:"9分", content:`## 構造化データとは\n\n構造化データはWebページの内容を検索エンジンが理解しやすい形式で記述するマークアップです。正しく実装することでリッチリザルト（星評価、価格、イベント日程など）として検索結果に表示されCTRを大幅に向上させます。\n\n## 必須スキーマタイプ7選\n\nOrganization（企業情報）、WebSite（サイトリンク検索ボックス）、BreadcrumbList（パンくず）、Article/BlogPosting（記事）、FAQ（アコーディオン表示）、LocalBusiness（地域ビジネス）、Product（EC商品）。\n\n## Next.jsでの実装方法\n\nApp RouterでgenerateMetadataと併せて構造化データをscriptタグで埋め込みます。dangerouslySetInnerHTMLでJSON-LDを出力し型安全なTypeScriptでスキーマオブジェクトを構築します。`}, en:{title:"Structured Data Complete Guide", excerpt:"Rich results, knowledge panels, sitelink search boxes. A practical guide to implementing structured data correctly, with examples of 7 schema types that directly impact business outcomes.", cat:"SEO/GEO", read:"9 min", content:`## What is Structured Data\n\nStructured data is markup that describes web page content in a format search engines can easily parse. When implemented correctly, it enables rich results in search results, dramatically improving CTR.\n\n## 7 Essential Schema Types\n\nOrganization, WebSite, BreadcrumbList, Article/BlogPosting, FAQ, LocalBusiness, Product.\n\n## Implementation in Next.js\n\nIn App Router, embed structured data via script tags alongside generateMetadata. Output JSON-LD with dangerouslySetInnerHTML, constructing schema objects with type-safe TypeScript.`}, tags:["構造化データ","JSON-LD","リッチリザルト","スキーマ"], date:"2025-06-15" },
  // AI・自動化
  { slug:"ai-business-automation-2025", ja:{title:"中小企業のAI業務自動化 — 2025年に導入すべき5つのツールと導入手順", excerpt:"Dify、event-driven workers、DeepSeek、Make、Zapier。2025年、中小企業がコストを抑えてAI自動化を実現するためのツール選定と導入手順を、実際の業務フローに沿って解説します。", cat:"AI・自動化", read:"10分", content:`## AI自動化の現実解\n\n「AIで全部自動化」は幻想です。現実的なアプローチは人間の判断が必要な部分と自動化できる部分を分離し徐々に自動化範囲を広げていくことです。\n\n## 2025年おすすめツール5選\n\nDify: AIアプリ構築プラットフォーム。チャットボット、文章生成、データ分析をノーコードで実装可能。event-driven workers: オープンソースのワークフロー自動化。1000以上のサービスと連携。DeepSeek V4: 高精度・低コストLLM。Context Cachingで入力コスト90%OFF。Make: 視覚的なシナリオビルダー。Zapier: 7000以上のアプリ連携。\n\n## 導入ステップ\n\n業務の棚卸しと自動化候補の洗い出し、優先度・効果試算によるロードマップ作成、PoCの小規模実施、本番展開とモニタリング、継続的な改善サイクルの確立。`}, en:{title:"AI Business Automation for SMBs — 5 Tools to Deploy in 2025", excerpt:"Dify, event-driven workers, DeepSeek, Make, Zapier. A practical guide to cost-effective AI automation tools for SMBs in 2025, with implementation steps mapped to real business workflows.", cat:"AI & Automation", read:"10 min", content:`## The Reality of AI Automation\n\nAI automating everything is a fantasy. The realistic approach is separating human judgment from automatable tasks and gradually expanding scope.\n\n## Top 5 Tools for 2025\n\nDify: No-code AI app platform. event-driven workers: Open-source workflow automation with 1000+ integrations. DeepSeek V4: High-accuracy, low-cost LLM with 90% input cost reduction. Make: Visual scenario builder. Zapier: 7000+ app integrations.\n\n## Implementation Steps\n\nAudit operations, build roadmap with ROI estimates, run small-scale PoC, production deployment and monitoring, establish continuous improvement cycles.`}, tags:["AI","自動化","Dify","event-driven workers","DX","業務改善"], date:"2025-08-05" },
  { slug:"dify-ai-chatbot-build", ja:{title:"DifyではじめるAIチャットボット構築 — ノーコードで自社専用AIを作る完全ガイド", excerpt:"プログラミング不要で自社専用AIチャットボットを構築できるDifyの使い方を徹底解説。ナレッジベース設定、ワークフロー設計、Webサイト埋め込みまで。", cat:"AI・自動化", read:"12分", content:`## Difyとは\n\nDifyはLLMを活用したAIアプリケーションをノーコードで構築できるプラットフォームです。カスタマーサポートチャットボット、社内向けナレッジQ&A、コンテンツ生成ツールなど幅広い用途に対応します。\n\n## ナレッジベースの構築\n\nAIに自社情報を学習させる核となるのがナレッジベースです。Webサイトの内容、製品マニュアル、FAQ、社内文書などをアップロードすることでAIが自社専用の回答を生成できるようになります。\n\n## ワークフロー設計のポイント\n\n条件分岐や外部API連携を含む複雑なワークフローも設計できます。問い合わせ内容に応じて適切な部署に振り分ける、在庫確認APIを呼び出して回答するといった高度な自動化が可能です。\n\n## Webサイトへの埋め込み\n\nDifyで構築したチャットボットは数行のJavaScriptコードで既存のWebサイトに埋め込めます。カスタムCSSでブランドに合わせたデザイン変更も可能です。`}, en:{title:"Building AI Chatbots with Dify — A Complete No-Code Guide", excerpt:"A comprehensive guide to Dify — the no-code platform for building custom AI chatbots. Covers knowledge base setup, workflow design, and website embedding.", cat:"AI & Automation", read:"12 min", content:`## What is Dify\n\nDify is a no-code platform for building AI applications powered by LLMs. It supports chatbots, internal knowledge Q&A, content generation, and more.\n\n## Building a Knowledge Base\n\nThe knowledge base teaches AI your business information. Upload website content, manuals, FAQs, and internal documents.\n\n## Workflow Design Tips\n\nDesign complex workflows with conditional branching and external API integration. Route inquiries or call inventory APIs for real-time responses.\n\n## Website Embedding\n\nDify chatbots embed into any website with a few lines of JavaScript. Custom CSS enables brand-aligned design.`}, tags:["Dify","AIチャットボット","ノーコード","ナレッジベース","DeepSeek"], date:"2025-07-25" },
  { slug:"deepseek-v4-business-use", ja:{title:"DeepSeek V4のビジネス活用術 — 月額数千円ではじめるAI導入", excerpt:"Context Cachingで入力コスト90%OFF。大量の問い合わせ自動応答、多言語コンテンツ生成、営業資料の自動作成など具体的なビジネス活用事例とコスト試算を公開します。", cat:"AI・自動化", read:"8分", content:`## DeepSeek V4の特長\n\nDeepSeek V4は高精度と低コストを両立するLLMです。Context Cachingにより同一プロンプトのキャッシュヒット時に入力コストが90%OFFになります。\n\n## 具体的な活用事例\n\nカスタマーサポート自動応答: FAQと問い合わせ履歴をキャッシュし高精度な一次回答を自動生成。多言語コンテンツ生成: 日本語の記事を12カ国語に一括翻訳。営業資料の自動作成: 企業データから業界分析・提案書のたたき台を自動生成。\n\n## 月額コスト試算\n\n月間10,000件の問い合わせ自動応答でキャッシュヒット率70%ならAPIコストは月額5〜10ドル程度。人件費換算で月数十万円の削減効果が期待できます。`}, en:{title:"DeepSeek V4 for Business — Start AI for Just a Few Dollars a Month", excerpt:"DeepSeek V4 with Context Caching cuts input costs by 90%. Real business use cases and cost estimates for automated responses, multilingual content, and sales material creation.", cat:"AI & Automation", read:"8 min", content:`## DeepSeek V4 Highlights\n\nDeepSeek V4 balances high accuracy with low cost. Context Caching cuts input costs by 90% on cache hits.\n\n## Real-World Use Cases\n\nAutomated customer support with cached FAQs. Multilingual content generation translating Japanese into 12 languages. Automated sales materials from company data.\n\n## Monthly Cost Estimate\n\nFor 10,000 automated responses at 70% cache-hit rate, API costs run just $5-10/month — thousands in labor-cost savings.`}, tags:["DeepSeek","LLM","コスト削減","AI活用"], date:"2025-07-15" },
  { slug:"dx-small-business-roadmap", ja:{title:"中小企業DXの羅針盤 — 3ステップではじめるデジタル改革", excerpt:"DXは大企業だけのものではありません。中小企業が今日から始められるDXの3ステップ「デジタル化 → 自動化 → 高度化」を具体的な費用感とともに解説します。", cat:"AI・自動化", read:"7分", content:`## DXは難しくない\n\nDXに圧倒される中小企業経営者は少なくありません。しかし本質はシンプルです。「デジタル技術を使って今の業務をより良くする」ことです。\n\n## ステップ1：デジタル化\n\n紙の書類をクラウドに移行し情報共有をスムーズに。Google WorkspaceやMicrosoft 365の導入、クラウド会計ソフトへの移行、電子契約の導入から始めましょう。\n\n## ステップ2：自動化\n\n繰り返し作業をツールで自動化。event-driven workersで「メール→Slack通知→スプレッドシート記録」のようなルーチンを自動化、AIチャットボットで一次問い合わせ対応を自動化します。\n\n## ステップ3：高度化\n\n蓄積したデータを分析しAIを活用した予測や意思決定支援を行います。在庫予測、売上予測、顧客離反予測などの高度な分析をクラウドAIツールで実現できます。`}, en:{title:"SMB DX Roadmap — A 3-Step Guide to Digital Transformation", excerpt:"DX isn't just for enterprises. A practical 3-step framework for SMBs — Digitalize → Automate → Advance — with concrete cost estimates and actionable starting points.", cat:"AI & Automation", read:"7 min", content:`## DX Isn't Hard\n\nMany SMB leaders feel overwhelmed by DX but the essence is simple: use digital technology to make current operations better.\n\n## Step 1: Digitalize\n\nMove paper to the cloud. Start with Google Workspace or Microsoft 365, cloud accounting, and electronic contracts.\n\n## Step 2: Automate\n\nAutomate repetitive tasks with event-driven workers workflows and AI chatbots for first-response inquiries.\n\n## Step 3: Advance\n\nAnalyze data and leverage AI for prediction and decision support — inventory forecasting, sales prediction, churn prediction with cloud AI tools.`}, tags:["DX","デジタル化","中小企業","業務改善"], date:"2025-07-01" },
  { slug:"ai-tool-comparison-2025", ja:{title:"【2025年比較】ビジネスAIツール完全ガイド — ChatGPT vs Claude vs Gemini vs DeepSeek", excerpt:"ビジネス用途で最適なAIツールはどれか。4大LLMを精度・コスト・機能・日本語対応の4軸で徹底比較します。", cat:"AI・自動化", read:"11分", content:`## 4大LLMの比較軸\n\nAIツール選定で重要なのは「どのタスクにどのモデルが最適か」です。日本語生成精度、APIコスト、機能、エコシステムの4軸で比較します。\n\n## 各モデルの特徴\n\nChatGPT（OpenAI）: エコシステムが最も充実。プラグイン、GPTs、API連携が豊富。日本語精度は高いがAPIコストは最高。Claude（Anthropic）: 長文処理と安全性に強み。200Kトークンのコンテキストウィンドウ。Gemini（Google）: マルチモーダル最強。画像・動画・音声の理解力が高い。DeepSeek V4: コストパフォーマンス最強。Context Cachingで入力コスト90%OFF。\n\n## 用途別おすすめ\n\nカスタマーサポート自動化 → DeepSeek（低コスト・高精度）。長文レポート作成 → Claude。画像・動画解析 → Gemini。社内AIアシスタント → ChatGPT。`}, en:{title:"2025 Business AI Tool Comparison — ChatGPT vs Claude vs Gemini vs DeepSeek", excerpt:"Which AI tool is best for business? A thorough 4-axis comparison of ChatGPT, Claude, Gemini, and DeepSeek — accuracy, cost, features, and Japanese support.", cat:"AI & Automation", read:"11 min", content:`## Comparison Framework\n\nThe key question: which model for which task? Compare Japanese quality, API cost, features, and ecosystem.\n\n## Model Highlights\n\nChatGPT: Richest ecosystem. Claude: Long-form processing, 200K context. Gemini: Best multimodal. DeepSeek V4: Best cost-performance, 90% input cost reduction.\n\n## Recommendations\n\nSupport automation → DeepSeek (low cost, high accuracy). Reports → Claude. Image/video → Gemini. Internal assistant → ChatGPT.`}, tags:["AI比較","ChatGPT","Claude","Gemini","DeepSeek"], date:"2025-06-20" },
]
const POSTS_PART2: SeedPost[] = [
  // Web制作
  { slug:"web-production-cost-2025", ja:{title:"Webサイト制作の費用相場 2025 — 発注前に知っておくべき予算のすべて", excerpt:"HP制作、LP制作、ECサイト構築。2025年のWeb制作費用相場を制作タイプ別・発注先別に徹底解説。見積もりの読み方、失敗しない発注のコツも紹介します。", cat:"Web制作", read:"11分", content:`## Web制作費用の全体像\n\nWebサイト制作の費用は「何を作るか」「誰に頼むか」で大きく変動します。\n\n## 制作タイプ別費用相場\n\nシンプルなコーポレートサイト（5ページ程度）: 30〜80万円。10ページ以上の本格サイト: 80〜200万円。LP1枚: 15〜50万円。ECサイト（Shopify等）: 100〜500万円。フルカスタムWebアプリ: 300万円〜。\n\n## 発注先別の特徴\n\n大手制作会社: 300万円〜。品質は高いが高額。中小制作会社: 50〜200万円。バランスが良い。フリーランス: 20〜100万円。コスパは良いが属人化リスクあり。\n\n## 見積もりの読み方\n\n見積書には制作費だけでなくサーバー代・ドメイン代・保守費用・追加修正費用が含まれているか確認しましょう。サブスク型の保守費用は要注意です。`}, en:{title:"Web Development Cost Guide 2025", excerpt:"A comprehensive 2025 web development cost guide by project type and vendor category. Learn to read quotes, spot hidden costs, and commission with confidence.", cat:"Web Development", read:"11 min", content:`## Web Development Cost Overview\n\nWeb development costs vary significantly based on what you're building and who you hire.\n\n## Cost Ranges by Project Type\n\nSimple corporate site: ¥300K-800K. Full site (10+ pages): ¥800K-2M. Single LP: ¥150K-500K. Ecommerce: ¥1M-5M. Custom web app: ¥3M+.\n\n## Vendor Categories\n\nLarge agencies: ¥3M+. Mid-size: ¥500K-2M. Freelancers: ¥200K-1M. Offshore: ¥100K-500K.\n\n## Reading Proposals\n\nCheck whether quotes include hosting, domains, maintenance, and revision costs beyond the base fee.`}, tags:["Web制作","費用","見積もり","発注","相場"], date:"2025-08-10" },
  { slug:"nextjs-vs-wordpress-2025", ja:{title:"Next.js vs WordPress — 2025年Web制作の技術選定で失敗しないための比較", excerpt:"Webサイト制作の2大選択肢をパフォーマンス、運用コスト、拡張性、SEO、セキュリティの5軸で徹底比較。", cat:"Web制作", read:"10分", content:`## 2大プラットフォームの現在地\n\n2025年、最もよく議論されるのがNext.js vs WordPressです。\n\n## パフォーマンス比較\n\nNext.jsはSSG/SSRによりLighthouseスコア95+が標準的。WordPressは適切なキャッシュと最適化で80+を達成できますがプラグイン依存度で変動します。\n\n## 運用コスト比較\n\nWordPressは非エンジニアでもコンテンツ更新が容易。Next.jsはヘッドレスCMSが必要ですがパフォーマンスとセキュリティで優位です。\n\n## どちらを選ぶべきか\n\nWordPress: 頻繁なコンテンツ更新が必要なブログ・メディア向け。Next.js: 高いパフォーマンスが求められるコーポレートサイト、多言語グローバルサイト、カスタムWebアプリ向け。`}, en:{title:"Next.js vs WordPress — How to Choose the Right Web Technology in 2025", excerpt:"The two major options for web development: Next.js vs WordPress. A thorough 5-axis comparison covering performance, costs, scalability, SEO, and security.", cat:"Web Development", read:"10 min", content:`## The Two Platforms Today\n\nIn 2025, the most common debate is Next.js vs WordPress.\n\n## Performance\n\nNext.js with SSG/SSR achieves Lighthouse 95+. WordPress can reach 80+ with proper caching but varies by plugin load.\n\n## Operating Costs\n\nWordPress offers easy content updates for non-engineers. Next.js needs a headless CMS but gains performance and security advantages.\n\n## Choosing\n\nWordPress: content-heavy blogs/media. Next.js: high-performance corporate sites, global multilingual sites, custom web apps.`}, tags:["Next.js","WordPress","技術選定","Web制作","比較"], date:"2025-07-30" },
  { slug:"web-design-trends-2025", ja:{title:"2025年Webデザイントレンド10選 — 集客につながる最新デザイン手法", excerpt:"Bentoグリッド、ダークモード対応、マイクロインタラクション、AIパーソナライゼーション。具体的な実装方法と集客効果の観点から解説。", cat:"Web制作", read:"8分", content:`## 2025年のWebデザイン方向性\n\n「情報設計の明瞭さ」と「ブランドの個性表現」の両立がテーマです。\n\n## 注目トレンド10選\n\nBentoグリッドレイアウト、可変フォント、スクロールドリブンアニメーション、グラスモーフィズム2.0、ダークモード完全対応、マイクロインタラクション、AIパーソナライゼーション、3D/WebGLの実用化、タイポグラフィ主導デザイン、カーボンアウェアデザイン。\n\n## 実装のポイント\n\nTailwindCSSやshadcn/uiを使えば多くのトレンドが標準機能として利用可能です。モダンなUIライブラリの活用でトレンド対応と保守性を両立できます。`}, en:{title:"10 Web Design Trends for 2025", excerpt:"Bento grids, dark mode, micro-interactions, AI personalization. 2025 web design trends explained with implementation methods and impact on lead generation.", cat:"Web Development", read:"8 min", content:`## 2025 Design Direction\n\nBalancing clear information architecture with distinctive brand expression.\n\n## 10 Notable Trends\n\nBento grids, variable fonts, scroll-driven animation, glassmorphism 2.0, full dark mode, micro-interactions, AI personalization, practical 3D/WebGL, typography-led design, carbon-aware design.\n\n## Implementation Tips\n\nModern UI libraries like TailwindCSS and shadcn/ui make many trends accessible as standard features.`}, tags:["Webデザイン","トレンド","UI/UX","デザイン"], date:"2025-07-05" },
  { slug:"cms-selection-guide", ja:{title:"CMSの選び方完全ガイド — WordPressからヘッドレスCMSまで徹底比較", excerpt:"WordPress、PayloadCMS、Strapi、Contentful、microCMS。多言語対応、運用コスト、拡張性、UI/UXの4軸で比較。", cat:"Web制作", read:"9分", content:`## CMS選定の重要性\n\nCMSはサイト運用の中心です。一度選ぶと移行に多大なコストがかかるため初期選定が極めて重要です。\n\n## 2025年のCMS選択肢\n\nWordPress: 世界シェア43%。プラグイン豊富だがセキュリティリスクあり。PayloadCMS: Next.jsネイティブのヘッドレスCMS。多言語対応と高い開発者体験が強み。Strapi: オープンソース。カスタマイズ性が高い。Contentful: SaaS型。信頼性高いが従量課金。microCMS: 国産。日本企業向けサポート充実。\n\n## 選定の4基準\n\n多言語対応: 海外展開予定なら多言語標準装備のCMSを。運用コスト: 月額費用だけでなく人件費も含めて試算。拡張性: 将来の機能追加を見据えた設計か。UI/UX: 実際に更新する担当者が使いやすいかが鍵。`}, en:{title:"Complete CMS Selection Guide", excerpt:"WordPress, PayloadCMS, Strapi, Contentful, microCMS. A 4-axis comparison covering multilingual support, costs, scalability, and UI/UX.", cat:"Web Development", read:"9 min", content:`## Why CMS Selection Matters\n\nYour CMS is the operational heart of your site. Migration is costly.\n\n## 2025 CMS Options\n\nWordPress: 43% share. PayloadCMS: Next.js-native. Strong multilingual. Strapi: Open-source, customizable. Contentful: SaaS, reliable. microCMS: Japanese, great local support.\n\n## 4 Selection Criteria\n\nMultilingual, operating costs (fees + staffing), scalability, UI/UX for content editors.`}, tags:["CMS","WordPress","ヘッドレスCMS","PayloadCMS","比較"], date:"2025-06-10" },
  { slug:"web-accessibility-basics", ja:{title:"Webアクセシビリティの基本 — 2025年に対応すべき最低限の5項目", excerpt:"2024年4月の法改正で民間企業のWebアクセシビリティ対応が努力義務化。対応すべき最低限の5項目と具体的な実装方法を解説。", cat:"Web制作", read:"7分", content:`## 法的背景\n\n2024年4月、障害者差別解消法の改正により民間事業者のWebアクセシビリティ対応が義務へと引き上げられました。\n\n## 最低限対応すべき5項目\n\n画像にalt属性を付与、キーボード操作に対応（Tab/Enterで全操作可能に）、十分なカラーコントラスト（WCAG 2.1 AA 4.5:1以上）、フォームに適切なラベルを付与、見出しの適切な階層構造（h1→h2→h3）。\n\n## 実装時のポイント\n\nTailwindCSSやshadcn/ui（Radix UIベース）を使えばアクセシビリティ対応が比較的容易です。WAI-ARIA対応が標準で組み込まれています。`}, en:{title:"Web Accessibility Basics — 5 Minimum Requirements for 2025", excerpt:"Japan's 2024 legal revision made web accessibility a duty of care. Learn the 5 minimum requirements and implementation methods.", cat:"Web Development", read:"7 min", content:`## Legal Background\n\nJapan's disability discrimination law was amended in April 2024 making accessibility mandatory.\n\n## 5 Minimum Requirements\n\nAlt attributes on images, keyboard navigation, sufficient color contrast (WCAG 2.1 AA 4.5:1+), proper form labels, correct heading hierarchy.\n\n## Implementation Tips\n\nTailwindCSS and shadcn/ui (Radix UI) include WAI-ARIA support by default, making accessibility significantly easier.`}, tags:["アクセシビリティ","Web制作","法改正","UI/UX"], date:"2025-06-05" },
  // デジタルマーケティング
  { slug:"digital-marketing-framework-2025", ja:{title:"デジタルマーケティング全体設計 — 集客から成約までの5ステップフレームワーク", excerpt:"バラバラになりがちな施策を集客→興味喚起→比較検討→成約→育成の5ステップで体系化。具体的なKPIとともに解説。", cat:"デジタルマーケティング", read:"10分", content:`## なぜ全体設計が必要か\n\n多くの企業ではSEO、SNS広告、メルマガ、展示会などの個別施策がバラバラに実施されています。1つのフレームワークに統合することで相乗効果が生まれ投資対効果が大きく改善します。\n\n## 5ステップフレームワーク\n\n集客: SEO/GEO、MEO、SNS、広告で認知獲得。興味喚起: LP、ホワイトペーパー、動画で関心を深める。比較検討: 事例、お客様の声、料金表で信頼構築。成約: フォーム、チャット、電話で受注。育成: メルマガ、SNS、セミナーでリピート・紹介促進。\n\n## 各ステップのKPI\n\n集客: 検索流入数、SNSインプレッション数。興味喚起: LPのCVR。比較検討: 事例ページ回遊率。成約: 問い合わせ数、成約率。育成: リピート率、紹介経由問い合わせ数。`}, en:{title:"Digital Marketing Architecture — A 5-Step Framework", excerpt:"Systematize scattered digital marketing with a 5-step framework: Acquisition → Interest → Consideration → Conversion → Nurture. Concrete KPIs included.", cat:"Digital Marketing", read:"10 min", content:`## Why Architecture Matters\n\nIntegrating scattered tactics into one framework creates synergy and dramatically improves ROI.\n\n## The 5-Step Framework\n\nAcquisition: SEO/GEO, MEO, social, ads. Interest: LPs, white papers, video. Consideration: case studies, testimonials, pricing. Conversion: forms, chat, phone. Nurture: email, social, seminars.\n\n## KPIs Per Stage\n\nAcquisition: search traffic, impressions. Interest: LP CVR. Consideration: case study depth. Conversion: inquiries, close rate. Nurture: repeat rate, referrals.`}, tags:["デジタルマーケティング","フレームワーク","集客","KPI"], date:"2025-08-15" },
  { slug:"landing-page-optimization", ja:{title:"成約率を2倍にするLP改善 — 心理トリガーを活用した10の施策", excerpt:"CVRが上がらないLPの多くは心理トリガーの使い方が不十分です。希少性、社会的証明、返報性、一貫性など行動経済学に基づいた10施策を紹介。", cat:"デジタルマーケティング", read:"9分", content:`## LP改善の考え方\n\nLP改善は勘や好みではなくデータと心理原則に基づいて行うべきです。\n\n## 10の心理トリガー施策\n\n希少性（「残り3席」）、社会的証明（導入実績・お客様の声）、返報性（無料資料で先に価値提供）、一貫性（小さな「はい」から始める）、権威（専門家推薦・資格）、好意（共感ストーリー）、損失回避（「導入しないリスク」の提示）、アンカリング（高額プランを先に）、バンドワゴン効果（「多くの企業が選んでいます」）、単純化（選択肢を絞る）。`}, en:{title:"Double Your Conversion Rate — 10 LP Optimization Tactics", excerpt:"Low-converting LPs often underuse psychological triggers. 10 tactics based on behavioral economics: scarcity, social proof, reciprocity, consistency, and more.", cat:"Digital Marketing", read:"9 min", content:`## LP Optimization Mindset\n\nOptimization should be driven by data and psychological principles, not intuition.\n\n## 10 Psychological Trigger Tactics\n\nScarcity, Social proof, Reciprocity, Consistency, Authority, Liking, Loss aversion, Anchoring, Bandwagon effect, Simplification.`}, tags:["LP","CVR","コンバージョン","心理トリガー","改善"], date:"2025-07-28" },
  { slug:"video-marketing-beginners", ja:{title:"動画マーケティング入門 — 予算50万円から始める動画集客のすべて", excerpt:"スマホ1台から始める動画制作、YouTube/Instagram/TikTokの使い分け、動画SEOの基本まで低予算で始める動画集客を解説。", cat:"デジタルマーケティング", read:"8分", content:`## 動画マーケティングの現在地\n\n2025年、インターネットトラフィックの82%が動画コンテンツと言われています。\n\n## プラットフォーム別戦略\n\nYouTube: 検索型。SEOの延長として課題解決動画が有効。Instagram Reels: 発見型。短尺で視覚的インパクト重視。TikTok: トレンド型。UGC的アプローチ。\n\n## 低予算で始める3ステップ\n\n1. スマホ撮影から始める（照明とマイクだけ投資）。2. 編集はCanvaやCapCutで。3. まずは10本作る（質より量。10本で勝ちパターンが見える）。`}, en:{title:"Video Marketing for Beginners", excerpt:"From smartphone production to platform strategy and video SEO basics — how to start video marketing on a budget.", cat:"Digital Marketing", read:"8 min", content:`## Video Marketing Today\n\n82% of internet traffic is video in 2025.\n\n## Platform Strategy\n\nYouTube: Search-driven, problem-solving videos. Instagram: Discovery-driven, short-form visual impact. TikTok: Trend-driven, UGC approach.\n\n## 3 Steps on a Budget\n\n1. Start with smartphone (invest only in lighting/mic). 2. Edit with Canva or CapCut. 3. Make 10 videos first — quantity over quality.`}, tags:["動画マーケティング","YouTube","動画制作","集客"], date:"2025-07-12" },
  { slug:"sns-marketing-strategy-2025", ja:{title:"2025年SNSマーケティング戦略 — プラットフォーム別・業種別の最適解", excerpt:"X、Instagram、LinkedIn、TikTok、Facebook。2025年に注力すべきSNSを業種別・目的別に整理し最新動向と運用のコツを解説。", cat:"デジタルマーケティング", read:"10分", content:`## SNSマーケティングの全体像\n\n2025年、SNSは「情報発信の場」から「購買の場」へと進化しました。\n\n## 業種別おすすめSNS\n\nBtoB（IT・コンサル）: LinkedInを軸にXで専門性発信。BtoC（小売・飲食）: Instagramを軸にTikTokで若年層リーチ。BtoBtoC（不動産・教育）: YouTubeを軸にInstagramで補完。\n\n## 運用のコツ\n\nコンテンツの再利用（1記事をスレッド、リール、ブログに展開）。投稿時間の最適化。コミュニティ運営（コメント返信・DM対応を徹底）。`}, en:{title:"2025 Social Media Marketing Strategy", excerpt:"X, Instagram, LinkedIn, TikTok, Facebook. A platform-by-platform, industry-by-industry breakdown with latest algorithm trends and operating tips.", cat:"Digital Marketing", read:"10 min", content:`## Social Media Landscape\n\nIn 2025, social media has evolved from broadcast channels to purchase channels.\n\n## Platform by Industry\n\nB2B: LinkedIn anchor + X expertise. B2C: Instagram anchor + TikTok for youth. B2B2C: YouTube anchor + Instagram complement.\n\n## Operating Tips\n\nContent repurposing, post timing optimization, community management (prioritize replies and DMs).`}, tags:["SNS","マーケティング","Instagram","LinkedIn"], date:"2025-06-28" },
  { slug:"marketing-automation-intro", ja:{title:"MA（マーケティングオートメーション）入門 — 最小構成ではじめる顧客育成の仕組み", excerpt:"MAツールは高額という先入観を捨てましょう。WebhookとMakeを使えば月額数千円からMAを構築できます。実際のワークフロー例とともに解説。", cat:"デジタルマーケティング", read:"8分", content:`## MAは高くない\n\nHubSpotやMarketoのような高額ツールを想像するかもしれませんがWebhookとMakeで必要な機能のほとんどを実現できます。\n\n## 最小構成MAの4要素\n\nリード獲得: LPやフォームからのデータを自動でDBに保存。スコアリング: 閲覧・開封・DLなどの行動を自動スコア化。セグメンテーション: スコアや属性で自動リスト分け。ステップメール: セグメントに応じた最適なメールを自動配信。\n\n## Webhook実装例\n\n問い合わせフォーム→Webhook→Google Sheets→Slack通知。メルマガ開封者→関連ホワイトペーパー自動送付。未接触リード→自動再アプローチメール。`}, en:{title:"Marketing Automation 101", excerpt:"Marketing automation does not have to be expensive. With webhooks and Make, you can build it starting at a few dollars a month. Real workflow examples included.", cat:"Digital Marketing", read:"8 min", content:`## MA Isn't Expensive\n\nWebhooks and Make can deliver most of what expensive tools do.\n\n## 4 Elements of Minimal MA\n\nLead capture: auto-save form data. Scoring: auto-score behaviors. Segmentation: auto-sort leads. Drip email: auto-send optimized emails per segment.\n\n## Webhook Examples\n\nContact form→Webhook→Sheets→Slack. Newsletter openers→auto-send white paper. Inactive leads→re-engagement email.`}, tags:["MA","マーケティングオートメーション","Webhook","Make"], date:"2025-06-18" },
]
// Combine posts
export const ALL_POSTS: SeedPost[] = [...POSTS_PART1, ...POSTS_PART2]
export const SERVICES = [
  { slug:"jaas", ja:{name:"Japan-as-a-Service (JaaS)", tagline:"海外企業の日本市場参入をフルスタックで支援", features:["市場調査・競合分析（公開データ + AI構造化）","現地法人設立支援（司法書士・税理士コーディネート）","日本語LP/EC構築（12カ国語対応 + GEO最適化）","MEO/SEO/SNS集客の現地運用代行","請求書発行・経理代行（Stripe + 国内決済）","日本人カスタマーサポート（チャット/メール/電話）"]}, en:{name:"Japan-as-a-Service (JaaS)", tagline:"Full-stack market entry support for global SMBs", features:["Market research & competitor analysis","Local entity setup","Japanese LP/EC build (12-language + GEO)","MEO/SEO/Social ops","Invoicing & accounting (Stripe + JP payments)","Japanese customer support"]}, icon:"Globe", sort:1 },
  { slug:"web", ja:{name:"Web制作", tagline:"集客に強いモダンなビジネスサイトを", features:["コーポレートサイト/LP/ECサイト制作","レスポンシブデザイン（スマホ・タブレット対応）","SEO内部対策 + 構造化データ実装","CMS管理画面（PayloadCMS / WordPress）","Next.js + Tailwind CSS + shadcn/ui 採用","12カ国語多言語対応"]}, en:{name:"Web Development", tagline:"Modern, conversion-focused business websites", features:["Corporate/LP/EC site development","Responsive design","On-page SEO + structured data","CMS admin","Next.js + Tailwind CSS + shadcn/ui","12-language i18n"]}, icon:"Globe", sort:2 },
  { slug:"meo", ja:{name:"MEO対策", tagline:"Googleマップで上位表示、地域集客を最大化", features:["Googleビジネスプロフィール最適化","口コミ獲得・返信代行","投稿運用（最新情報・特典の定期発信）","ローカルSEO（地域キーワード対策）","順位レポート・分析レポート（月次）","競合分析と改善提案"]}, en:{name:"MEO (Local SEO)", tagline:"Top Google Maps rankings for maximum local reach", features:["GBP optimization","Review acquisition & response","Post management","Local SEO","Ranking & analytics reports","Competitor analysis"]}, icon:"MapPin", sort:3 },
  { slug:"seo", ja:{name:"SEO / GEO対策", tagline:"検索エンジンとAI検索からの集客を最大化", features:["キーワード戦略立案・検索意図分析","コンテンツSEO（記事制作・リライト）","テクニカルSEO（サイト速度・構造改善）","GEO対策（ChatGPT/Perplexity最適化）","構造化データ（JSON-LD）実装","月次レポート・分析レポート"]}, en:{name:"SEO / GEO", tagline:"Maximize traffic from search engines and AI", features:["Keyword strategy & intent analysis","Content SEO","Technical SEO","GEO (AI search optimization)","Structured data implementation","Monthly reporting"]}, icon:"Search", sort:4 },
  { slug:"ai", ja:{name:"AI導入支援 / DX", tagline:"対象業務と確認工程からAI導入を設計", features:["業務分析・自動化設計コンサルティング","Dify構築（AIチャットボット・社内ナレッジQ&A）","OpenClaw / Difyによるイベント駆動ワークフロー","DeepSeek V4統合（低コストLLM活用）","社内研修・AIリテラシー向上支援","運用保守・継続改善"]}, en:{name:"AI Enablement / DX", tagline:"Design AI around scoped workflows and human review", features:["Process analysis & automation consulting","Dify setup","Event-driven OpenClaw / Dify workflows","DeepSeek V4 integration","Staff training & AI literacy","Ongoing operations"]}, icon:"Bot", sort:5 },
]
export const PRICING_PLANS = [
  { planJa:"スターター", planEn:"Starter", sid:"web", price:300000, cur:"jpy", bill:"one-time", descJa:"5ページのシンプルなコーポレートサイト。レスポンシブデザイン、問い合わせフォーム付き。", descEn:"Simple 5-page corporate site with responsive design and contact form.", featJa:["レスポンシブデザイン","問い合わせフォーム","SEO基本対策","CMS管理画面","1ヶ月無料保守"], featEn:["Responsive design","Contact form","Basic SEO","CMS admin","1 month free maintenance"], pop:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:1 },
  { planJa:"ビジネス", planEn:"Business", sid:"web", price:800000, cur:"jpy", bill:"one-time", descJa:"10ページ以上の本格コーポレートサイト。多言語対応、ブログ機能、アニメーション演出付き。", descEn:"Full corporate site (10+ pages) with multilingual support, blog, and animations.", featJa:["全ページレスポンシブ","CMS + ブログ機能","SEO内部対策 + 構造化データ","多言語対応（3言語まで）","アニメーション演出","3ヶ月無料保守"], featEn:["Fully responsive","CMS + blog","On-page SEO + structured data","3-language support","Animation design","3 months free maintenance"], pop:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:2 },
  { planJa:"エンタープライズ", planEn:"Enterprise", sid:"web", price:2000000, cur:"jpy", bill:"one-time", descJa:"フルカスタムWebサイト/アプリケーション。AI機能、外部API連携、12カ国語対応。", descEn:"Fully custom web/application. AI features, API integration, up to 12 languages.", featJa:["フルカスタム設計","AI機能統合","外部API/SaaS連携","12カ国語多言語対応","年間保守・運用付き","専任PM + デザイナー + エンジニア"], featEn:["Full custom design","AI integration","External API integration","12-language i18n","Annual maintenance","Dedicated PM + designer + engineer"], pop:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:3 },
  { planJa:"スターター", planEn:"Starter", sid:"meo", price:30000, cur:"jpy", bill:"monthly", descJa:"Googleビジネスプロフィールの基本最適化。プロフィール整備と月次レポート付き。", descEn:"Basic GBP optimization with profile setup and monthly reports.", featJa:["プロフィール最適化","写真投稿（月4回）","口コミ返信代行","月次順位レポート"], featEn:["Profile optimization","Photo posts (4/month)","Review response","Monthly ranking report"], pop:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:4 },
  { planJa:"ビジネス", planEn:"Business", sid:"meo", price:80000, cur:"jpy", bill:"monthly", descJa:"投稿運用 + 口コミ戦略 + 競合分析を含む本格MEO対策。", descEn:"Full MEO including post management, review strategy, and competitor analysis.", featJa:["プロフィール最適化 + 継続改善","投稿運用（週2回）","口コミ獲得戦略 + 返信代行","競合分析 + 改善提案","月次詳細レポート"], featEn:["Profile optimization + improvement","Post management (2/week)","Review strategy + response","Competitor analysis","Monthly detailed report"], pop:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:5 },
  { planJa:"プレミアム", planEn:"Premium", sid:"meo", price:150000, cur:"jpy", bill:"monthly", descJa:"複数拠点対応 + ローカルSEO + SNS連携を含むフルパッケージ。", descEn:"Multi-location support + local SEO + social media full package.", featJa:["全MEO機能（ビジネスプラン内容）","複数拠点対応","ローカルSEO対策","SNS連携運用","専任運用担当者"], featEn:["All Business plan features","Multi-location support","Local SEO","Social media integration","Dedicated account manager"], pop:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:6 },
  { planJa:"スターター", planEn:"Starter", sid:"seo", price:50000, cur:"jpy", bill:"monthly", descJa:"キーワード戦略 + コンテンツSEOの基本パッケージ。月2記事の制作代行付き。", descEn:"Basic keyword strategy + content SEO with 2 articles/month.", featJa:["キーワード戦略立案","コンテンツSEO（月2記事）","テクニカルSEO監査","月次レポート"], featEn:["Keyword strategy","Content SEO (2 articles/month)","Technical SEO audit","Monthly report"], pop:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:7 },
  { planJa:"ビジネス", planEn:"Business", sid:"seo", price:150000, cur:"jpy", bill:"monthly", descJa:"SEO + GEO統合対策。月4記事制作 + AI検索最適化を含む本格パッケージ。", descEn:"Integrated SEO + GEO. 4 articles/month + AI search optimization.", featJa:["キーワード戦略 + 検索意図分析","コンテンツSEO（月4記事）","テクニカルSEO（サイト改善）","GEO対策（AI検索最適化）","構造化データ実装","月次詳細レポート"], featEn:["Keyword strategy + intent analysis","Content SEO (4 articles/month)","Technical SEO","GEO optimization","Structured data","Monthly detailed report"], pop:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:8 },
  { planJa:"エンタープライズ", planEn:"Enterprise", sid:"seo", price:400000, cur:"jpy", bill:"monthly", descJa:"大規模サイト向けSEO + GEO + 被リンク獲得戦略のフルパッケージ。", descEn:"Full SEO + GEO + link-building for large-scale sites.", featJa:["全SEO/GEO機能","被リンク獲得戦略","多言語SEO（12カ国語）","コンテンツマーケティング戦略","専任SEOコンサルタント"], featEn:["All SEO/GEO features","Link-building strategy","Multilingual SEO","Content marketing strategy","Dedicated SEO consultant"], pop:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:9 },
  { planJa:"スターター", planEn:"Starter", sid:"ai", price:100000, cur:"jpy", bill:"monthly", descJa:"業務分析 + Difyチャットボット構築の入門パッケージ。", descEn:"Process analysis + Dify chatbot build starter package.", featJa:["業務分析（1業務）","Difyチャットボット構築","ナレッジベース設定","操作研修（1回）"], featEn:["Process analysis (1 workflow)","Dify chatbot build","Knowledge base setup","Training (1 session)"], pop:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:10 },
  { planJa:"ビジネス", planEn:"Business", sid:"ai", price:300000, cur:"jpy", bill:"monthly", descJa:"複数業務の自動化設計 + Dify/OpenClaw導入 + DeepSeek統合。", descEn:"Multi-workflow automation + Dify/OpenClaw + DeepSeek integration.", featJa:["業務分析（3業務）","Dify + OpenClaw導入","DeepSeek V4統合","社内研修（3回）","月次サポート"], featEn:["Process analysis (3 workflows)","Dify + OpenClaw deployment","DeepSeek V4 integration","Training (3 sessions)","Monthly support"], pop:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:11 },
  { planJa:"DXパートナー", planEn:"DX Partner", sid:"ai", price:800000, cur:"jpy", bill:"monthly", descJa:"全社DX推進パートナー。専任コンサルタントが伴走しAI化・自動化・データ活用を全面支援。", descEn:"Company-wide DX partner. Dedicated consultant for AI, automation, and data enablement.", featJa:["全社業務棚卸し + DXロードマップ","Dify/OpenClaw/DeepSeek導入","カスタムAIアプリ開発","データ分析基盤構築","役員向けAI戦略コンサル","専任DXコンサルタント（週次定例）"], featEn:["Company-wide audit + DX roadmap","Dify/OpenClaw/DeepSeek deployment","Custom AI app development","Data analytics foundation","Executive AI strategy consulting","Dedicated DX consultant (weekly)"], pop:false, ctaJa:"お問い合わせ", ctaEn:"Contact Us", sort:12 },
]
export const WORKS = [
  { slug:"sericia-d2c", ja:{title:"Sericia — 日本クラフト食品のグローバルD2Cサイト", industry:"食品・D2C", desc:"日本全国の訳ありクラフト食品を世界80カ国に届けるD2Cブランド", challenge:"海外向け販売のための多言語ECサイト構築と購入導線の最適化", solution:"PayloadCMS + Medusa v2を統合したヘッドレスECをNext.jsで構築。12カ国語対応、AIチャットボット、Push PWA。", metrics:"公開後3ヶ月で月間PV 5万達成、海外売上比率60%"}, en:{title:"Sericia — Global D2C Site", industry:"Food & D2C", desc:"D2C brand delivering Japanese craft food to 80+ countries.", challenge:"Building a multilingual ecommerce site for global sales.", solution:"Built headless ecommerce on Next.js + PayloadCMS + Medusa v2. 12-language, AI chatbot, Push PWA.", metrics:"50K monthly PV within 3 months, 60% overseas revenue."}, tags:["EC","D2C","多言語","Next.js","PayloadCMS"], color:"rose" as const, sort:1 },
  { slug:"appexxme-sales-os", ja:{title:"Appexxme — AI営業自動化プラットフォーム", industry:"SaaS・営業DX", desc:"公開データ×AIで営業リスト作成から診断レポート自動生成までを一貫自動化", challenge:"グローバル8言語×6デザインの営業診断レポートを人手を介さず自動生成する仕組みの構築", solution:"Dify + event-driven workers + DeepSeek V4 + Playwrightによる自律型営業OS。企業情報の自動収集→AI診断→レポート生成→フォーム送信までをイベント駆動で自動化。", metrics:"従来比98%工数削減、月間1,000件の自動診断を実現"}, en:{title:"Appexxme — AI Sales Automation Platform", industry:"SaaS & Sales DX", desc:"End-to-end automation from lead discovery to diagnostic report generation.", challenge:"Building a fully automated pipeline for diagnostic reports in 8 languages × 6 designs.", solution:"Autonomous sales OS with Dify + event-driven workers + DeepSeek V4 + Playwright. Event-driven automation.", metrics:"98% reduction in manual effort, 1,000 automated diagnoses/month."}, tags:["AI","営業自動化","Dify","event-driven workers","DeepSeek"], color:"violet" as const, sort:2 },
  { slug:"airtabi-travel-platform", ja:{title:"AirTabi — AI搭載 多言語トラベルプラットフォーム", industry:"旅行・OTA", desc:"AIが旅程を自動生成する8カ国語対応の旅行予約プラットフォーム", challenge:"8カ国語のSEOコンテンツとAIプランナーを統合した地方創生×インバウンドプラットフォームの構築", solution:"pSEO設計による多言語ページ自動生成、DeepSeek V4によるAI旅程プランナー、Stripe Connectによるパートナー決済基盤", metrics:"8カ国語×主要観光地100エリアのページを自動生成、検索流入の85%が多言語ページ経由"}, en:{title:"AirTabi — AI-Powered Multilingual Travel Platform", industry:"Travel & OTA", desc:"8-language travel booking platform with AI-generated itineraries.", challenge:"Building a regional revitalization × inbound platform with 8-language SEO and AI trip planner.", solution:"Auto-generated multilingual pages via pSEO, AI itinerary planner with DeepSeek V4, Stripe Connect partner payments.", metrics:"Auto-generated pages for 100 tourist areas × 8 languages. 85% of search traffic via multilingual pages."}, tags:["旅行","多言語","AI","pSEO","Stripe"], color:"teal" as const, sort:3 },
  { slug:"paradigm-corporate-site", ja:{title:"Paradigm — コーポレートサイト全面リニューアル", industry:"IT・Web制作", desc:"Next.js + PayloadCMS + 12カ国語対応の自社コーポレートサイト", challenge:"旧WordPressサイトからの完全移行。パフォーマンス改善、多言語対応、ブロックベースページ構築を同時実現。", solution:"Next.js App Router + PayloadCMSで再構築。10種ブロックタイプのビジュアルページビルダー、12カ国語自動翻訳、Lighthouse 95+。", metrics:"Lighthouseパフォーマンス98点、表示速度3.2倍改善、海外問い合わせ3倍増"}, en:{title:"Paradigm — Full Corporate Site Redesign", industry:"IT & Web Dev", desc:"In-house corporate site on Next.js + PayloadCMS with 12-language support.", challenge:"Full migration from legacy WordPress with simultaneous performance, multilingual, and block-based building.", solution:"Rebuilt with Next.js + PayloadCMS. Visual page builder (10 block types), 12-language auto-translation, Lighthouse 95+.", metrics:"Lighthouse 98, 3.2x speed improvement, 3x international inquiries."}, tags:["コーポレートサイト","Next.js","PayloadCMS","多言語","リニューアル"], color:"indigo" as const, sort:4 },
  { slug:"dxdoctor-platform", ja:{title:"DX Doctor — 中小企業DX診断プラットフォーム", industry:"DX・コンサルティング", desc:"Webサイト解析→AI診断→補助金診断までを自動化する中小企業DX診断サービス", challenge:"補助金・DX診断の専門家不足を補う、Webサイトの公開情報だけで高精度な診断を行うAIシステムの構築", solution:"Playwrightによる自動解析、DeepSeek V4による業界別診断、Dify+event-driven workersによるレポート自動生成。人間専門家が最終レビューのみ行うハイブリッドモデル。", metrics:"診断1件あたりの工数90%削減、月間500社の自動診断が可能に"}, en:{title:"DX Doctor — SMB DX Diagnostic Platform", industry:"DX & Consulting", desc:"Automated SMB DX diagnostic service from website analysis to subsidy assessment.", challenge:"Building an AI system for high-accuracy diagnostics from public website data.", solution:"Automated analysis via Playwright, industry diagnosis via DeepSeek V4, auto-reports via Dify+event-driven workers.", metrics:"90% reduction in per-diagnosis effort, capacity for 500 automated diagnoses/month."}, tags:["DX","AI診断","自動化","補助金","DeepSeek"], color:"amber" as const, sort:5 },
  { slug:"temploft-marketplace", ja:{title:"Temploft — Web制作×AI運用のマーケットプレイス", industry:"SaaS・マーケットプレイス", desc:"AIによるWordPressサイト自動運用とテンプレートマーケットプレイスの2軸プラットフォーム", challenge:"WordPressサイトのセキュリティ・更新・バックアップ運用をAIで自動化しつつ日本初の本格テンプレートMPを構築", solution:"AI運用SaaS（自動更新・セキュリティパッチ・パフォーマンス最適化）+ Stripe Connectによるクリエイター向け販売基盤", metrics:"設計フェーズ完了、MVP開発中。CTP（特許出願中）技術をコア差別化要因に。"}, en:{title:"Temploft — Web Dev × AI Operations Marketplace", industry:"SaaS & Marketplace", desc:"Dual-axis platform: AI-powered WordPress management + template marketplace.", challenge:"Building AI automation for WordPress ops alongside Japan's first full-scale template marketplace.", solution:"AI operations SaaS + Stripe Connect creator template sales infrastructure.", metrics:"Design phase complete, MVP in development. CTP (patent-pending) as differentiator."}, tags:["SaaS","WordPress","AI","マーケットプレイス","Stripe"], color:"emerald" as const, sort:6 },
]
export const FAQS = [
  { qJa:"Webサイト制作の期間はどのくらいですか？", qEn:"How long does web development take?", aJa:"制作規模により異なります。5ページ程度のシンプルなコーポレートサイトは1〜2ヶ月、10ページ以上の本格サイトは2〜3ヶ月、ECサイトやフルカスタム開発は3〜6ヶ月が目安です。いずれも企画・設計フェーズを含めた全体期間です。", aEn:"Depends on scope: 5-page corporate site 1-2 months, 10+ page site 2-3 months, ecommerce/custom 3-6 months. All timelines include planning and design.", catJa:"Web制作", catEn:"Web Development", sort:1 },
  { qJa:"MEO対策の効果が出るまでどのくらいかかりますか？", qEn:"How long until MEO shows results?", aJa:"最適化後、即日〜1週間で順位変動が始まります。安定した上位表示には1〜3ヶ月の継続運用が必要です。口コミ数や競合状況で変動します。", aEn:"Ranking changes begin within days to a week. Stable top rankings require 1-3 months of consistent effort.", catJa:"MEO対策", catEn:"MEO", sort:2 },
  { qJa:"Japan Entryの費用はいくらですか？", qEn:"What does Japan Entry cost?", aJa:"セットアップ費用は12,000ドル固定です。月額運用は最初の6か月無料で、7か月目以降は月額995ドルです。第三者費用や法務・税務費用は別途です。", aEn:"Setup is fixed at $12,000. Managed operation is $0/month for the first six months, then $995/month. Third-party, legal, and tax costs remain separate.", catJa:"Japan Entry", catEn:"Japan Entry", sort:3 },
  { qJa:"多言語対応はどの言語まで可能ですか？", qEn:"How many languages can you support?", aJa:"日本語、英語、韓国語、中国語、ドイツ語、フランス語、スペイン語、ポルトガル語、ロシア語、アラビア語、ベトナム語、インドネシア語の12カ国語です。DeepSeek V4翻訳＋ネイティブチェックで高品質を実現します。", aEn:"12 languages: Japanese, English, Korean, Chinese, German, French, Spanish, Portuguese, Russian, Arabic, Vietnamese, Indonesian. Hybrid of AI translation + native review.", catJa:"多言語対応", catEn:"Multilingual", sort:4 },
  { qJa:"AIチャットボットの導入にはどのくらいの期間が必要ですか？", qEn:"How long does AI chatbot deployment take?", aJa:"既存FAQやマニュアルが整っていれば1〜2週間で初期導入可能です。本格的なワークフロー自動化を含む場合は1〜2ヶ月を見込んでください。", aEn:"1-2 weeks with existing FAQs/manuals. Full workflow automation: 1-2 months.", catJa:"AI導入", catEn:"AI Implementation", sort:5 },
  { qJa:"保守・運用サポートはありますか？", qEn:"Do you provide maintenance and support?", aJa:"はい、全プランに初期無料保守期間（1〜12ヶ月）が含まれます。終了後は月額プランでサーバー管理、セキュリティ更新、コンテンツ更新代行を提供します。", aEn:"Yes, every plan includes free initial maintenance (1-12 months). After that, monthly plans cover server, security, and content updates.", catJa:"運用保守", catEn:"Maintenance", sort:6 },
  { qJa:"全国対応していますか？", qEn:"Do you serve clients nationwide?", aJa:"はい、日本全国対応です。打ち合わせはオンライン（Zoom/Google Meet）を基本とし、必要に応じて訪問も可能です。海外からのお問い合わせも歓迎します。", aEn:"Yes, nationwide. Online meetings primary, in-person available. International inquiries welcome.", catJa:"お取引", catEn:"Business", sort:7 },
  { qJa:"WordPressからNext.jsへの移行は可能ですか？", qEn:"Can you migrate from WordPress to Next.js?", aJa:"可能です。データ移行、URLリダイレクト設計、SEO値保持を含めた完全移行プランがあります。移行期間は既存サイト規模により2週間〜2ヶ月です。", aEn:"Yes. Complete migration covering data transfer, redirects, SEO preservation. 2 weeks to 2 months depending on site size.", catJa:"Web制作", catEn:"Web Development", sort:8 },
  { qJa:"デザインの修正は何回まで可能ですか？", qEn:"How many design revisions?", aJa:"通常2〜3回の大きめな修正と細かな調整は無制限に対応します。追加の大きな方向転換は別途お見積りします。", aEn:"Typically 2-3 major revisions with unlimited minor adjustments. Major directional changes quoted separately.", catJa:"Web制作", catEn:"Web Development", sort:9 },
  { qJa:"支払い方法は何がありますか？", qEn:"What payment methods?", aJa:"銀行振込とStripe経由のクレジットカード（Visa/Mastercard/AMEX）です。請求書払いも可能。月額プランは口座振替またはカード継続決済です。", aEn:"Bank transfer and credit card via Stripe (Visa/Mastercard/AMEX). Invoice payment available. Monthly plans via direct debit or recurring card.", catJa:"お取引", catEn:"Business", sort:10 },
  { qJa:"SEO対策でGoogle1位は保証されますか？", qEn:"Can you guarantee #1 Google ranking?", aJa:"特定キーワードでの1位保証はできません（アルゴリズムは常に変動します）。しかし適切な戦略で上位表示を達成した実績が多数あります。検索流入数と成約数のKPIで成果を評価します。", aEn:"We cannot guarantee #1 for specific keywords (algorithms evolve). However, we have a strong top-ranking track record. We measure by traffic and conversions, not rank guarantees.", catJa:"SEO対策", catEn:"SEO", sort:11 },
  { qJa:"名古屋以外でも打ち合わせは可能ですか？", qEn:"Can we meet outside Nagoya?", aJa:"はい、オンラインを基本としつつ国内主要都市への訪問も可能です。遠方は交通費実費をご請求します。", aEn:"Yes, online primary, major city visits available. Travel expenses billed at cost.", catJa:"お取引", catEn:"Business", sort:12 },
  { qJa:"AI導入にプログラミング知識は必要ですか？", qEn:"Do I need programming knowledge for AI?", aJa:"いいえ。Difyチャットボット構築はノーコード、event-driven workers自動化もドラッグ＆ドロップで完結します。導入研修も含めてサポートします。", aEn:"No. Dify is fully no-code, event-driven workers is drag-and-drop. Training included.", catJa:"AI導入", catEn:"AI Implementation", sort:13 },
  { qJa:"制作実績をもっと見ることはできますか？", qEn:"Can I see more case studies?", aJa:"はい、Worksページで主要プロジェクトを公開中です。個別相談時には業種や課題が近い事例を詳しくご紹介できます。", aEn:"Yes, see our Works page. During consultations, we share detailed matching case studies.", catJa:"その他", catEn:"Other", sort:14 },
  { qJa:"申込み前に何を確認しますか？", qEn:"What happens before I apply?", aJa:"意思決定者、提供範囲、必要なアカウント・素材、決済・規制上の前提を確認します。適合しない場合は無理に受注せず、お断りします。", aEn:"We confirm the decision-maker, fixed scope, required access and assets, and payment or regulatory dependencies. If the scope is not a fit, we decline rather than expand the price.", catJa:"お取引", catEn:"Business", sort:15 },
]
// Public testimonials and team profiles must be created from named, verified,
// consented records in Payload. The seed must never invent social proof.
export const TESTIMONIALS: Array<Record<string, never>> = []
export const TEAM_MEMBERS: Array<Record<string, never>> = []
export async function seedAllContent(
  scope: "all" | "homepage" | "homepage-en" = "all",
) {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ])
  const payload = await getPayload({ config })
  const summary: Record<string, { created: number; updated: number; errors: number }> = {}
  if (scope === "all") {
  // Categories
  summary.categories = { created: 0, updated: 0, errors: 0 }
  for (const c of CATEGORIES) {
    try {
      const { docs: existing } = await payload.find({ collection: "categories", where: { slug: { equals: c.slug } }, limit: 1 })
      const data = { name: c.ja.name, slug: c.slug, description: c.ja.desc, color: c.color, sortOrder: c.sort, availableLocales: ["ja","en"] }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "categories", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.categories.updated++
      } else {
        const cr = await payload.create({ collection: "categories", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.categories.created++
      }
      await payload.update({ collection: "categories", id: docId, data: { name: c.en.name, description: c.en.desc }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] category ${c.slug}:`, e); summary.categories.errors++ }
  }
  // Posts
  summary.posts = { created: 0, updated: 0, errors: 0 }
  for (const p of ALL_POSTS) {
    try {
      const { docs: existing } = await payload.find({ collection: "posts", where: { slug: { equals: p.slug } }, limit: 1 })
      const data = { title: p.ja.title, slug: p.slug, excerpt: p.ja.excerpt, content: textToLexical(p.ja.content), category: p.ja.cat, readTime: p.ja.read, tags: p.tags.map(t => ({ tag: t })), status: "published", publishedAt: new Date(p.date).toISOString(), availableLocales: ["ja","en"], _status: "published" }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "posts", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.posts.updated++
      } else {
        const cr = await payload.create({ collection: "posts", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.posts.created++
      }
      await payload.update({ collection: "posts", id: docId, data: { title: p.en.title, excerpt: p.en.excerpt, content: textToLexical(p.en.content), category: p.en.cat, readTime: p.en.read }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] post ${p.slug}:`, e); summary.posts.errors++ }
  }
  // Services
  summary.services = { created: 0, updated: 0, errors: 0 }
  for (const s of SERVICES) {
    try {
      const { docs: existing } = await payload.find({ collection: "services", where: { slug: { equals: s.slug } }, limit: 1 })
      const data = { name: s.ja.name, slug: s.slug, tagline: s.ja.tagline, icon: s.icon, features: s.ja.features.map(f => ({ feature: f })), sortOrder: s.sort, availableLocales: ["ja","en"], isActive: true }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "services", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.services.updated++
      } else {
        const cr = await payload.create({ collection: "services", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.services.created++
      }
      await payload.update({ collection: "services", id: docId, data: { name: s.en.name, tagline: s.en.tagline, features: s.en.features.map(f => ({ feature: f })) }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] service ${s.slug}:`, e); summary.services.errors++ }
  }
  // Pricing
  summary.pricing = { created: 0, updated: 0, errors: 0 }
  for (const p of PRICING_PLANS) {
    try {
      const { docs: existing } = await payload.find({ collection: "pricing", where: { serviceId: { equals: p.sid }, planName: { equals: p.planJa } }, limit: 1 })
      const data = { planName: p.planJa, serviceId: p.sid, price: p.price, currency: p.cur, billingCycle: p.bill, description: p.descJa, features: p.featJa.map(f => ({ feature: f, included: true })), isPopular: p.pop, ctaLabel: p.ctaJa, sortOrder: p.sort, availableLocales: ["ja","en"] }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "pricing", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.pricing.updated++
      } else {
        const cr = await payload.create({ collection: "pricing", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.pricing.created++
      }
      await payload.update({ collection: "pricing", id: docId, data: { planName: p.planEn, description: p.descEn, features: p.featEn.map(f => ({ feature: f, included: true })), ctaLabel: p.ctaEn }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] pricing ${p.sid}:`, e); summary.pricing.errors++ }
  }

  // Works
  summary.works = { created: 0, updated: 0, errors: 0 }
  for (const w of WORKS) {
    try {
      const { docs: existing } = await payload.find({ collection: "works", where: { slug: { equals: w.slug } }, limit: 1 })
      const data = { title: w.ja.title, slug: w.slug, industry: w.ja.industry, description: w.ja.desc, challenge: w.ja.challenge, solution: w.ja.solution, metrics: w.ja.metrics, tags: w.tags.map(t => ({ tag: t })), color: w.color, sortOrder: w.sort, availableLocales: ["ja","en"], isPublished: true }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "works", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.works.updated++
      } else {
        const cr = await payload.create({ collection: "works", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.works.created++
      }
      await payload.update({ collection: "works", id: docId, data: { title: w.en.title, industry: w.en.industry, description: w.en.desc, challenge: w.en.challenge, solution: w.en.solution, metrics: w.en.metrics }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] work ${w.slug}:`, e); summary.works.errors++ }
  }

  // FAQs
  summary.faqs = { created: 0, updated: 0, errors: 0 }
  for (const f of FAQS) {
    try {
      const { docs: existing } = await payload.find({ collection: "faqs", where: { question: { equals: f.qJa } }, limit: 1 })
      const data = { question: f.qJa, answer: textToLexical(f.aJa), category: f.catJa, sortOrder: f.sort, availableLocales: ["ja","en"] }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "faqs", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.faqs.updated++
      } else {
        const cr = await payload.create({ collection: "faqs", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.faqs.created++
      }
      await payload.update({ collection: "faqs", id: docId, data: { question: f.qEn, answer: textToLexical(f.aEn), category: f.catEn }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] faq:`, e); summary.faqs.errors++ }
  }

  // Testimonials
  summary.testimonials = { created: 0, updated: 0, errors: 0 }
  for (const t of TESTIMONIALS) {
    try {
      const { docs: existing } = await payload.find({ collection: "testimonials", where: { authorName: { equals: t.author }, company: { equals: t.company } }, limit: 1 })
      type TData = Record<string, unknown> & { isAnonymous?: boolean }
      const td = t as TData
      const data = { quote: t.quoteJa, authorName: t.author, authorTitle: t.titleJa, company: t.company, rating: t.rating, serviceTag: t.tag, consentGiven: t.consent, isAnonymous: td.isAnonymous || false, isPublished: t.pub, sortOrder: t.sort, availableLocales: ["ja","en"] }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "testimonials", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.testimonials.updated++
      } else {
        const cr = await payload.create({ collection: "testimonials", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.testimonials.created++
      }
      await payload.update({ collection: "testimonials", id: docId, data: { quote: t.quoteEn, authorTitle: t.titleEn }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] testimonial:`, e); summary.testimonials.errors++ }
  }

  // Team Members
  summary.team = { created: 0, updated: 0, errors: 0 }
  for (const m of TEAM_MEMBERS) {
    try {
      const { docs: existing } = await payload.find({ collection: "team-members", where: { name: { equals: m.nameJa } }, limit: 1 })
      const data = { name: m.nameJa, role: m.roleJa, bio: m.bioJa, sortOrder: m.sort, availableLocales: ["ja","en"], isActive: true }
      let docId: string | number
      if (existing.length > 0) {
        const u = await payload.update({ collection: "team-members", id: existing[0].id, data, locale: "ja" } as unknown as Parameters<typeof payload.update>[0]) as unknown as { id: string | number }
        docId = u.id; summary.team.updated++
      } else {
        const cr = await payload.create({ collection: "team-members", data, locale: "ja" } as unknown as Parameters<typeof payload.create>[0]) as unknown as { id: string | number }
        docId = cr.id; summary.team.created++
      }
      await payload.update({ collection: "team-members", id: docId, data: { name: m.nameEn, role: m.roleEn, bio: m.bioEn }, locale: "en" } as unknown as Parameters<typeof payload.update>[0])
    } catch (e: unknown) { console.error(`[seed] team:`, e); summary.team.errors++ }
  }
  }
  // CMS Homepage — locale-aware (JA: Web制作 / EN: JaaS Japan Entry)
  summary.pages = { created: 0, updated: 0, errors: 0 }
  try {
    const layoutJa = [
      {
        blockType: "hero", variant: "split-image",
        badge: "中小企業向け Web制作",
        title: "伝わるだけで終わらない。事業に使えるWebサイトを。",
        subtitle: "企業サイト、採用サイト、サービスサイト、LPを、情報設計から公開後の運用まで。初期費用30万円〜、要件と範囲を明記して進めます。",
        primaryCta: { label: "無料相談を申し込む", href: "/ja/contact" },
        secondaryCta: { label: "料金を見る", href: "/ja/pricing" },
        stats: [
          { value: "30万円〜", label: "Web制作" },
          { value: "4", label: "標準工程" },
          { value: "1", label: "担当窓口" },
          { value: "公開後", label: "運用も支援" },
        ],
      },
      {
        blockType: "marquee",
        items: [
          { text: "Web制作30万円〜" },
          { text: "企業サイト・採用サイト" },
          { text: "LP・キャンペーンページ" },
          { text: "WordPress / Next.js" },
          { text: "SEO・アクセシビリティ" },
          { text: "公開後の保守・改善" },
        ],
        direction: "left", speed: "slow",
      },
      {
        blockType: "section",
        kicker: "WEB PRODUCTION",
        title: "見た目だけでなく、問い合わせまで設計する。",
        subtitle: "目的、顧客、運用体制を先に整理し、情報設計・デザイン・実装・計測を一つの制作プロセスとして進めます。",
        alignment: "center", background: "default",
      },
      {
        blockType: "card-grid", variant: "bento", columns: "3",
        cards: [
          { icon: "Globe", title: "企業サイト・採用サイト", description: "会社の強み、提供価値、採用情報を整理し、初めて訪れた人が次の行動へ進める構成にします。", href: "/ja/services/web", highlighted: true },
          { icon: "PenTool", title: "LP・キャンペーンページ", description: "一つの商材や施策に集中したページを、訴求・証拠・CTAの順番から設計します。", href: "/ja/services/web", highlighted: false },
          { icon: "RefreshCw", title: "既存サイトのリニューアル", description: "現行URL、コンテンツ、検索導線、更新体制を確認し、残すものと作り直すものを分けます。", href: "/ja/services/web", highlighted: false },
          { icon: "Code2", title: "CMS・更新基盤", description: "更新担当者が迷わない入力項目と権限を設計し、公開後の更新手順まで残します。", href: "/ja/services/web", highlighted: false },
          { icon: "Search", title: "SEO・GEOの土台", description: "見出し、メタデータ、構造化データ、内部リンクを制作時から整え、計測できる状態で公開します。", href: "/ja/services/seo", highlighted: false },
          { icon: "ShieldCheck", title: "保守・改善", description: "SSL、バックアップ、軽微な更新、改善提案など、必要な範囲を月額契約に明記します。", href: "/ja/contact", highlighted: false },
        ],
      },
      {
        blockType: "stats",
        kicker: "WORKING MODEL", title: "制作前に、範囲と判断基準をそろえる。",
        subtitle: "ページ数だけで料金を決めず、目的・更新体制・外部連携・公開後の責任範囲を先に確認します。",
        stats: [
          { value: "30万円〜", label: "初期制作", sublabel: "要件・ページ数で確定" },
          { value: "4工程", label: "標準プロセス", sublabel: "要件から公開後まで" },
          { value: "1窓口", label: "進行担当", sublabel: "確認事項を集約" },
          { value: "明記", label: "納品条件", sublabel: "見積書・契約書で合意" },
        ],
        background: "surface",
      },
      {
        blockType: "process",
        kicker: "PROCESS", title: "相談から公開後の改善まで、4つの工程で進める。",
        subtitle: "制作側だけでなく、社内の確認・承認が止まらないように、各工程の成果物と次の判断を共有します。",
        steps: [
          { title: "ヒアリング・現状監査", description: "事業目標、顧客、既存サイト、素材、更新体制を確認し、制作範囲を整理します。", icon: "ClipboardCheck" },
          { title: "情報設計・ワイヤー", description: "ページ構成、導線、必要なコンテンツ、CTA、計測項目を合意します。", icon: "CheckCircle" },
          { title: "デザイン・実装", description: "デザインシステム、レスポンシブUI、CMS、フォーム、SEO基盤を実装します。", icon: "Code2" },
          { title: "公開・引き継ぎ・改善", description: "検収、公開、操作説明、初期計測、保守範囲を確認し、次の改善を決めます。", icon: "TrendingUp" },
        ],
      },
      {
        blockType: "pricing",
        title: "Web制作の料金目安", subtitle: "初期費用30万円〜。ページ数、機能、素材、CMS、移行、公開後サポートの範囲を確認して正式見積もりを作成します。",
        tiers: [
          { name: "ライト", price: "300,000", period: "〜", description: "小規模サイトやサービス紹介ページ向け。まず必要な情報を整理して公開します。", features: "トップページ＋下層4ページ前後\nレスポンシブ対応\nお問い合わせフォーム\nSEO基本設定\n公開後1か月の軽微な修正", ctaLabel: "このプランを相談", ctaHref: "/ja/contact", highlighted: false },
          { name: "スタンダード", price: "600,000", period: "〜", description: "企業サイト・採用サイトの標準構成。更新しやすいCMSと計測基盤を含めます。", features: "トップページ＋下層9ページ前後\n情報設計・ワイヤー・デザイン\nWordPressまたはNext.js CMS\nSEO内部対策・構造化データ\n公開後3か月の運用相談", ctaLabel: "おすすめを相談", ctaHref: "/ja/contact", highlighted: true },
          { name: "グロース", price: "1,000,000", period: "〜", description: "複数サービス、多言語、外部連携などを含む本格的なサイト基盤。", features: "ページ・機能を要件定義で確定\nカスタムUIとコンポーネント設計\n多言語・外部サービス連携\nアクセス解析・改善ダッシュボード\n公開後6か月の改善伴走", ctaLabel: "要件を相談", ctaHref: "/ja/contact", highlighted: false },
        ],
      },
      {
        blockType: "faq",
        title: "Web制作を依頼する前に",
        subtitle: "制作範囲、進め方、費用の考え方を先に公開しています。",
        items: [
          { question: "本当に30万円から制作できますか？", answer: textToLexical("はい。ライトプランは30万円からが目安です。ページ数、原稿・写真の準備状況、フォームや外部連携、CMSの有無によって変わるため、要件確認後に正式見積もりを提示します。") },
          { question: "制作期間はどのくらいですか？", answer: textToLexical("小規模サイトは要件と素材がそろってから3〜6週間程度、中規模以上は2〜3か月程度が目安です。承認回数、素材準備、外部サービスの審査などの依存条件を見積書に記載します。") },
          { question: "既存サイトのリニューアルにも対応しますか？", answer: textToLexical("対応します。既存URL、検索流入、コンテンツ、フォーム、CMS、ドメイン・サーバーを確認し、リダイレクトと切り替え手順を含めて計画します。") },
          { question: "公開後の保守は必須ですか？", answer: textToLexical("必須ではありません。更新代行、SSL・バックアップ、障害対応、改善提案など、必要な範囲だけを月額契約に分けて明記します。") },
          { question: "成果や検索順位は保証されますか？", answer: textToLexical("制作物の納品・検収条件は契約で明記しますが、売上、問い合わせ数、検索順位などの事業成果は保証しません。公開後に計測し、改善できる状態をつくります。") },
        ],
      },
      {
        blockType: "cta",
        title: "Webサイトを、事業の前進に使える状態へ。",
        subtitle: "現在のサイト、作りたいページ、公開時期、社内の運用体制をお聞かせください。必要な範囲と進め方を整理してご提案します。",
        primaryCta: { label: "無料相談を申し込む", href: "/ja/contact" },
        secondaryCta: { label: "サービスを見る", href: "/ja/services" },
        background: "gradient",
      },
    ]

    const layoutEn = [
      {
        blockType: "hero", variant: "centered",
        badge: "FOR FAST-DECISION GLOBAL SMBs",
        title: "Launch in Japan without hiring a local team",
        subtitle: "Paradigm LLC is a Japan-based market-entry and digital operations partner. We have supported overseas e-commerce, SaaS, and Web3.0 companies entering Japan or establishing a Japan-facing operating base. For fast-decision teams, we build the localized revenue path, launch it, and operate it in Japanese while your team stays focused on the core business.",
        primaryCta: { label: "Apply for Japan Entry — $12K", href: "/en/contact?intent=japan-entry" },
        secondaryCta: { label: "See the fixed offer", href: "#japan-entry-pricing" },
        image: {
          url: "/japan-entry/tokyo-sakura-panorama.svg",
          alt: "Tokyo skyline and cherry blossom atmosphere representing a Japan Entry launch path",
        },
        stats: [
          { value: "$12K", label: "fixed setup" },
          { value: "$0", label: "monthly for 6 months" },
          { value: "14", label: "business-day delivery guarantee" },
          JAPAN_ENTRY_MONTH_ONE_TARGET_STAT,
        ],
      },
      {
        blockType: "marquee",
        items: [
          { text: "North America" },
          { text: "United Kingdom" },
          { text: "Europe" },
          { text: "Australia & New Zealand" },
          { text: "Tokyo-based execution" },
          { text: "Fast executive decisions" },
          { text: "Fixed scope, fixed price" },
        ],
        direction: "left", speed: "slow",
      },
      EN_PROFESSIONAL_USE_CASE_SECTION,
      {
        blockType: "section",
        kicker: "THE OUTCOME",
        title: "A Japan-ready revenue path, not another strategy deck",
        subtitle: "As a Japan-based professional partner, Paradigm turns your existing offer into a market-ready Japanese operation with a clear scope, a 14-business-day delivery guarantee from the recorded Start Date, and one accountable Tokyo-based team.",
        alignment: "center", background: "default",
      },
      {
        blockType: "card-grid", variant: "equal", columns: "3",
        cards: [
          { icon: "Globe", title: "LP / HP localization", description: "Japanese positioning, trust signals, pricing, metadata, and conversion paths rebuilt for the market — not pasted through a translator.", href: "", highlighted: true },
          { icon: "MessageCircle", title: "Social Media channel setup", description: "Up to two priority social profiles, bios, links, CTAs, visual direction, and starter-content templates with clear ownership.", href: "", highlighted: false },
          { icon: "TrendingUp", title: "Japan market report", description: "A sourced comparison across priority markets with one deeper view, public evidence, observation dates, unknowns, and next actions.", href: "", highlighted: false },
          { icon: "ShieldCheck", title: "Trust & regulatory screening", description: "Commercial disclosure, privacy, Japan's Act on Specified Commercial Transactions, and relevant sector questions organized for qualified review — not presented as legal advice.", href: "", highlighted: false },
          { icon: "CreditCard", title: "Payment & inquiry readiness", description: "We connect the payment and inquiry routes your business is eligible to use, with constraints confirmed before kickoff.", href: "", highlighted: false },
          { icon: "MessageCircle", title: "Japanese operation & handover", description: "Japanese inquiry handling, measurement, launch checks, ownership mapping, and a six-month managed operating period.", href: "", highlighted: false },
        ],
      },
      EN_JAPAN_ENTRY_PROCESS_BLOCK,
      EN_JAPAN_ENTRY_COMPARISON_BLOCK,
      {
        blockType: "pricing",
        title: "One fixed Japan entry offer",
        subtitle: "No low-cost pilot, no three-tier maze, and no surprise agency retainer. We accept companies only after confirming the fixed scope can be delivered.",
        tiers: [
          { name: "Japan Entry Package", price: "$12,000", period: "one-time", description: "A fixed-scope setup covering localization, Social Media, market evidence, regulatory screening, launch operations, and handover, with six months of managed Japan operation included at no additional monthly charge.", features: "LP / HP localization and Japanese buyer path\nSocial Media setup for up to two priority channels\nPublic-signal market report across up to three markets\nTrust, commercial disclosure, and regulatory applicability screening\nWise, bank transfer, USDC, or credit card via Stripe invoice/payment link\nFull setup-fee refund if the agreed setup is not delivered within 14 business days from the Start Date\nJapanese support, launch operations, and handover\n$0/month for the first six months\nThen $995/month — cancellable for future billing under the signed terms", ctaLabel: "Apply for Japan Entry — $12K", ctaHref: "/en/contact?intent=japan-entry", highlighted: true },
        ],
      },
      {
        blockType: "section",
        kicker: "BUILT FOR FAST DECISIONS",
        title: "Company size does not matter. Decision speed does.",
        subtitle: "This package is for companies that can assign one decision-maker, approve the fixed setup this week, and provide the required assets within 48 hours.",
        alignment: "center", background: "surface",
      },
      {
        blockType: "card-grid", variant: "equal", columns: "4",
        cards: [
          { icon: "UserCheck", title: "Final authority", description: "The person applying can make or directly secure the final purchasing decision.", href: "", highlighted: false },
          { icon: "BadgeDollarSign", title: "$12K approval", description: "The fixed setup fee can be approved and paid within seven days without a long procurement cycle.", href: "", highlighted: true },
          { icon: "UserCog", title: "One launch owner", description: "One internal owner can supply decisions, access, brand assets, and product facts in English.", href: "", highlighted: false },
          { icon: "Timer", title: "Ready this month", description: "There is a real commercial reason to start now, not an exploratory project for a future quarter.", href: "", highlighted: false },
        ],
      },
      {
        blockType: "faq",
        title: "Before you apply",
        subtitle: "Paradigm LLC supports overseas e-commerce, SaaS, and Web3.0 companies with a professional, evidence-led Japan launch path. The terms are deliberately simple so qualified companies can decide quickly.",
        items: [
          { question: "Is the setup fee always $12,000?", answer: textToLexical("Yes. The setup fee is fixed at $12,000 and paid before kickoff. If your launch cannot fit the published scope, we will decline the application rather than expand the price after the fact.") },
          { question: "What does $0/month for six months mean?", answer: textToLexical("The standard managed operating service is included for the first six months at no additional monthly charge. Third-party usage, advertising, hosting, payment processing, legal, tax, and other external costs remain your responsibility.") },
          { question: "What happens after six months?", answer: textToLexical("Managed operation continues at $995 per month and may be cancelled for future billing under the signed service terms. Paradigm-operated monitoring, optimization, and support stop when the service ends.") },
          { question: "Do I need a Japanese entity or bank account?", answer: textToLexical("Not for every launch. Eligibility depends on your product, regulated category, payment methods, and provider account location. We confirm the viable route before accepting the fixed-scope engagement and do not promise unsupported payment methods.") },
          { question: "Do you guarantee Japanese sales?", answer: textToLexical("No. Product-market fit and purchasing decisions remain yours. We deliver the agreed market-ready environment and launch work, not a specific revenue outcome.") },
          { question: "Is this only for SaaS or e-commerce?", answer: textToLexical("No. We evaluate the launch path, decision speed, and commercial fit rather than filtering primarily by industry or employee count.") },
          { question: "What must our team provide?", answer: textToLexical("One final decision-maker, one implementation owner, accurate product and policy information, brand assets, and the required account access within 48 hours of kickoff.") },
          { question: "Does the setup include Social Media and market research?", answer: textToLexical("Yes. The setup includes profile and starter-content setup for up to two priority social channels, plus a sourced public-signal market report across up to three markets with one priority deep dive. Ongoing posting and private traffic or revenue data are separate.") },
          { question: "Does regulatory screening replace legal advice?", answer: textToLexical("No. We screen likely disclosure and regulatory applicability, including Japan's Act on Specified Commercial Transactions where relevant, and record questions for qualified professionals. Formal legal opinions, filings, and licences remain separate.") },
          { question: "What can change the 14-business-day delivery clock?", answer: textToLexical("The clock starts on the recorded Start Date after written scope, cleared payment, complete inputs, required access, and one empowered approver. Client-requested changes or holds pause the clock. If the agreed setup is not delivered within 14 business days, 100% of the $12,000 setup fee is refunded.") },
          { question: "Which payment methods can we use?", answer: textToLexical("Wise, bank transfer, USDC, and credit card via a Stripe invoice or payment link are available after fit review. The invoice confirms recipient, fees, and the USDC network and wallet. Never send funds from public-form fields.") },
        ],
      },
      {
        blockType: "cta",
        title: JAPAN_ENTRY_MONTH_ONE_TARGET,
        subtitle: `${JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE} If your company can approve the $12,000 setup this week and assign one launch owner, apply now. We reply with a fit decision and fixed deployment scope — not a low-cost pilot.`,
        primaryCta: { label: "Apply for Japan Entry — $12K", href: "/en/contact?intent=japan-entry" },
        secondaryCta: { label: "Review the fixed offer", href: "#japan-entry-pricing" },
        background: "gradient",
      },
    ]

    async function upsertHomePage(slug: string, pageTitle: string, pageDesc: string, layout: unknown[], locale: string) {
      const pageData = { title: pageTitle, slug, description: pageDesc, layout, availableLocales: ["ja","en"], isHomepage: true }
      const { docs: existing } = await payload.find({ collection: "pages", where: { slug: { equals: slug } }, limit: 1 })
      if (existing.length > 0) {
        // The legacy Japanese home document contains Payload's internal
        // localized block metadata (_locale/_parent_id). Recreating that one
        // reviewed homepage removes the invalid legacy keys and makes the
        // locale seed deterministic. English remains an in-place update.
        if (locale === "ja") {
          await payload.delete({ collection: "pages", id: existing[0].id } as unknown as Parameters<typeof payload.delete>[0])
          await payload.create({ collection: "pages", data: pageData, locale } as unknown as Parameters<typeof payload.create>[0])
          summary.pages.updated++
          return
        }
        await payload.update({ collection: "pages", id: existing[0].id, data: pageData, locale } as unknown as Parameters<typeof payload.update>[0])
        summary.pages.updated++
        return
      }
      await payload.create({ collection: "pages", data: pageData, locale } as unknown as Parameters<typeof payload.create>[0])
      summary.pages.created++
    }
    if (scope !== "homepage-en") {
      await upsertHomePage("home-ja",
        "Paradigm — Web制作30万円〜 | Paradigm合同会社",
        "企業サイト・採用サイト・LPを30万円〜。情報設計から公開後の運用まで、必要な範囲を明記して制作します。",
        layoutJa, "ja")
    }
    await upsertHomePage("home-en",
      "Paradigm — Fixed-Price Japan Entry for Fast-Decision Global SMBs",
      "$12,000 fixed Japan entry setup with six months of managed operation included. Launch a market-ready Japanese revenue path without hiring a local team.",
      layoutEn, "en")
  } catch (e: unknown) { console.error(`[seed] pages:`, e); summary.pages.errors++ }
  return summary
}
