#!/usr/bin/env node
/**
 * scripts/seed-all-content.mjs — Paradigmjp.com 全コンテンツ一括投入
 *
 * 投入内容: カテゴリ4 + ブログ20 + サービス5 + 料金12 + 実績6 + FAQ15 + 声6 + チーム3 + CMSページ1
 * 実行: node scripts/seed-all-content.mjs
 * 冪等: slug/serviceId で upsert
 */

import { getPayload } from "payload"
import config from "../payload.config"

function textToLexical(text) {
  return {
    root: {
      type: "root", direction: "ltr", format: "", indent: 0, version: 1,
      children: text.split("\n\n").filter(Boolean).map((para) => ({
        type: "paragraph", direction: "ltr", format: "", indent: 0, version: 1,
        children: [{ type: "text", text: para, format: 0 }],
      })),
    },
  }
}

const CATEGORIES = [
  { slug: "seo-geo", nameJa: "SEO/GEO", nameEn: "SEO/GEO", descJa: "検索エンジン最適化とAI検索対策の最新情報", descEn: "Latest insights on search engine optimization and AI search", color: "indigo", sortOrder: 1 },
  { slug: "ai-automation", nameJa: "AI・自動化", nameEn: "AI & Automation", descJa: "AI活用・業務自動化・DX推進の実践ノウハウ", descEn: "Practical know-how for AI adoption, automation, and DX", color: "violet", sortOrder: 2 },
  { slug: "web-production", nameJa: "Web制作", nameEn: "Web Development", descJa: "Webサイト制作・リニューアルのノウハウと最新トレンド", descEn: "Best practices and trends in web development and redesign", color: "emerald", sortOrder: 3 },
  { slug: "digital-marketing", nameJa: "デジタルマーケティング", nameEn: "Digital Marketing", descJa: "集客・成約率改善・データ活用の総合マーケティング情報", descEn: "Comprehensive marketing insights for lead generation, CVR, and data utilization", color: "amber", sortOrder: 4 },
]

const POSTS = [
  { slug:"geo-2025-complete-guide", titleJa:"GEO完全ガイド 2025 — AI検索時代のSEO戦略", titleEn:"GEO 2025 Complete Guide — SEO Strategy for the AI Search Era", excerptJa:"ChatGPT、Perplexity、Google AI Overviews。AIが回答を生成する時代に、検索流入を獲得する新手法GEOの全貌を解説。従来SEOとの違い、具体的な最適化手法、12カ国語対応の実践戦略まで。", excerptEn:"ChatGPT, Perplexity, Google AI Overviews. A complete guide to GEO — the new discipline for winning traffic in the AI-generated answer era. Differences from traditional SEO, concrete optimization methods, and a 12-language practical strategy.", catJa:"SEO/GEO", catEn:"SEO/GEO", readJa:"12分", readEn:"12 min", tags:["GEO","AI検索","ChatGPT","Perplexity","SEO"], date:"2025-08-01", contentJa:`## GEOとは何か

GEO（Generative Engine Optimization）は、ChatGPT、Perplexity、Google AI Overviews、Claude、Geminiといった生成AIエンジンにおいて、自社コンテンツが引用・参照されるよう最適化する新しい分野です。従来のSEOが「Googleの青リンク10件」の中での上位表示を目指すのに対し、GEOは「AIが生成する回答」の中に自社情報を組み込ませることを目的とします。

## なぜ今GEOが必要なのか

2025年現在、検索行動は大きく変化しています。Google検索でもAI Overviewsが上部に表示され、ユーザーは青リンクをクリックする前にAIの回答を読んで満足してしまうケースが増えています。PerplexityやChatGPT Searchの利用率も急増しており、従来型SEOだけでは獲得できないトラフィックが拡大しています。

## GEOとSEOの決定的な違い

SEOが「クローラー向けの技術最適化＋被リンク獲得」であるのに対し、GEOは「AIが学習・引用したくなる情報価値」が核心です。具体的には一次データ・独自統計の保有、権威ある外部ソースからの被引用実績、構造化された明確な情報設計、質問に対する直接的で簡潔な回答が重要です。

## 具体的なGEO最適化手法

TL;DR要約を冒頭に配置する、独自統計・データを提示する、外部引用シグナルを強化する、構造化データ（JSON-LD）を完璧に実装する、多言語展開でグローバルAI検索をカバーする。Paradigmでは12カ国語対応のGEO最適化を提供しています。`, contentEn:`## What is GEO

GEO (Generative Engine Optimization) is a new discipline focused on optimizing content so that AI engines — ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini — cite and reference your brand in their generated answers. While traditional SEO targets ranking among Google's blue links, GEO aims to embed your information directly into AI-generated responses.

## Why GEO Matters Now

Search behavior has shifted dramatically. Google's own AI Overviews now dominate the top of search results, and users often find answers without ever clicking a link. Perplexity and ChatGPT Search adoption is accelerating, creating traffic channels that traditional SEO alone cannot capture.

## Key Differences

SEO focuses on technical crawler optimization and backlinks. GEO centers on the information value that makes AI want to cite you: original data, citation track record, clear information architecture, and direct concise answers.

## Practical GEO Optimization

Place TL;DR summaries at the top, present original statistics, strengthen external citation signals, implement complete structured data (JSON-LD), and cover global AI search through multilingual deployment. Paradigm provides GEO optimization across 12 languages.` },

  { slug:"seo-technical-checklist-2025", titleJa:"【2025年版】テクニカルSEO完全チェックリスト", titleEn:"2025 Technical SEO Complete Checklist", excerptJa:"Core Web Vitals、モバイルファースト、構造化データ、サイト速度。検索順位を左右するテクニカルSEOの全要素を50項目のチェックリストで網羅。INP対応やNext.js最適化も解説。", excerptEn:"Core Web Vitals, mobile-first indexing, structured data, site speed. A complete 50-item checklist covering every technical SEO factor that impacts rankings, including INP and Next.js optimization.", catJa:"SEO/GEO", catEn:"SEO/GEO", readJa:"15分", readEn:"15 min", tags:["テクニカルSEO","Core Web Vitals","チェックリスト","Next.js"], date:"2025-07-20", contentJa:`## テクニカルSEOの重要性

テクニカルSEOは、検索エンジンがサイトを正しくクロール・インデックスできるようにする基盤整備です。コンテンツが素晴らしくても、技術的な問題で検索順位が上がらないケースは非常に多くあります。

## 2025年の重要トピック

GoogleはINP（Interaction to Next Paint）をCore Web Vitalsの正式指標に採用しました。FIDに代わるこの指標は、ユーザー操作への応答速度を測定します。

## 主要チェック項目

クロール・インデックス: XML Sitemapの自動生成と送信、robots.txtの適切な設定、canonicalタグの正しい実装。構造化データ: Organizationスキーマ、BreadcrumbListスキーマ、FAQスキーマ、Articleスキーマ。Core Web Vitals: LCP 2.5秒以内、INP 200ms以内、CLS 0.1以内、画像のWebP/AVIF化、フォントの最適化。モバイル: レスポンシブデザイン、タップターゲットサイズ、コンテンツパリティ。

## Next.jsサイトの最適化

Next.jsは優れたフレームワークですが、next/image活用、動的メタデータのgenerateMetadata実装、ISRによるパフォーマンス最適化、適切なキャッシュ戦略の設定が重要です。`, contentEn:`## The Importance of Technical SEO

Technical SEO is the foundation that enables search engines to correctly crawl and index your site. Even with exceptional content, technical issues frequently prevent sites from ranking well.

## Key 2025 Topics

Google adopted INP (Interaction to Next Paint) as a Core Web Vitals metric. This replacement for FID measures responsiveness to user interactions.

## Major Checklist Items

Crawl & Index: Auto-generated XML Sitemap, proper robots.txt, correct canonical tags. Structured Data: Organization, BreadcrumbList, FAQ, Article schemas. Core Web Vitals: LCP under 2.5s, INP under 200ms, CLS under 0.1, WebP/AVIF images, font optimization. Mobile: Responsive design, tap target sizing, content parity.

## Next.js Optimization

Next.js is excellent, but pay attention to: next/image usage, dynamic metadata via generateMetadata, ISR performance optimization, and proper cache strategy configuration.` },

  { slug:"keyword-research-ai-era", titleJa:"AI時代のキーワード戦略 — 検索意図の深掘りとトピッククラスター設計", titleEn:"Keyword Strategy in the AI Era — Deep Search Intent Analysis and Topic Cluster Design", excerptJa:"従来のキーワード単位のSEOは限界を迎えています。AI検索時代に必要な「検索意図マッピング」「トピッククラスター」「エンティティ最適化」の3本柱を解説します。", excerptEn:"Keyword-level SEO is reaching its limits. Learn the three pillars needed in the AI search era: search intent mapping, topic clusters, and entity optimization.", catJa:"SEO/GEO", catEn:"SEO/GEO", readJa:"8分", readEn:"8 min", tags:["キーワード戦略","検索意図","トピッククラスター","SEO"], date:"2025-07-10", contentJa:`## キーワードSEOの限界

「ビッグキーワードで1位を取る」という従来型のSEO戦略は、もはや十分ではありません。AI検索の台頭により、ユーザーは単一キーワードではなく複雑な質問を投げかけるようになっています。

## 検索意図マッピング

キーワードの背後にあるユーザーの真の意図を4象限で分類します：情報型（知りたい）、ナビゲーション型（行きたい）、商標型（比べたい）、取引型（買いたい）。この分類に基づいてコンテンツを設計することで、検索意図とのミスマッチを防ぎます。

## トピッククラスター戦略

ピラーページを中心に、関連するクラスターページを放射状に配置する構造です。これによりサイト全体の専門性と権威性を高め、AIにも評価されやすい情報アーキテクチャを構築します。

## エンティティ最適化

GoogleのKnowledge GraphやAIのナレッジベースに、自社や商品を「エンティティ」として正しく認識させる手法です。Schema.orgの適切な実装、Wikipedia/Wikidataとの連携、外部メディアでの一貫した言及が重要です。`, contentEn:`## The Limits of Keyword SEO

The traditional strategy of "ranking #1 for a big keyword" is no longer sufficient. With the rise of AI search, users are asking complex questions rather than typing single keywords.

## Search Intent Mapping

Classify the true intent behind keywords into four quadrants: Informational, Navigational, Commercial, Transactional. Designing content around this classification prevents intent mismatches.

## Topic Cluster Strategy

A hub-and-spoke structure with pillar pages at the center and related cluster pages radiating outward. This elevates site-wide expertise and authority while building an AI-friendly information architecture.

## Entity Optimization

Techniques that ensure Google's Knowledge Graph and AI knowledge bases correctly recognize your brand as entities. Proper Schema.org implementation, Wikipedia/Wikidata integration, and consistent external mentions are critical.` },

  { slug:"meo-google-maps-ranking", titleJa:"MEO対策の全て — Googleマップで上位表示するための15の施策", titleEn:"Complete MEO Guide — 15 Tactics to Rank Higher on Google Maps", excerptJa:"Googleビジネスプロフィールの最適化から口コミ戦略、投稿運用、ローカルSEO連携まで。地域ビジネスがGoogleマップで上位表示されるための具体的施策を全公開します。", excerptEn:"From Google Business Profile optimization to review strategy, post management, and local SEO integration. Everything local businesses need to rank higher on Google Maps.", catJa:"SEO/GEO", catEn:"SEO/GEO", readJa:"10分", readEn:"10 min", tags:["MEO","Googleマップ","ローカルSEO","口コミ","集客"], date:"2025-06-25", contentJa:`## MEO対策とは

MEO（Map Engine Optimization）は、Googleマップ検索での上位表示を目指す施策です。特に実店舗を持つビジネスや地域密着型のサービスにとって、MEOは集客の生命線です。

## Googleビジネスプロフィール最適化のポイント

ビジネス名・住所・電話番号の正確な一致（NAP整合性）、営業時間・定休日の正確な設定と祝日反映、カテゴリの適切な選択、ビジネス説明文へのキーワード自然な組み込み、高品質な写真の定期投稿、サービス・商品メニューの完全登録、Q&Aセクションの整備。

## 口コミ戦略

口コミの数と質、返信率がMEO順位に大きく影響します。全口コミへの24時間以内の返信、ポジティブ口コミへの感謝＋サービスの再訴求、ネガティブ口コミへの誠実な対応が重要です。

## 投稿運用

Googleビジネスプロフィールの投稿機能を活用し最新情報・イベント・特典を定期的に発信します。投稿は14日間で期限切れになるため最低週1回の更新が推奨されます。`, contentEn:`## What is MEO

MEO (Map Engine Optimization) focuses on achieving top rankings in Google Maps search. For businesses with physical locations, MEO is a critical customer acquisition channel.

## GBP Optimization Essentials

Exact NAP consistency, accurate hours including holidays, proper category selection, natural keyword inclusion in description, regular high-quality photo uploads, complete service/product registration, and Q&A section setup.

## Review Strategy

Review quantity, quality, and response rate significantly impact MEO rankings. Respond to all reviews within 24 hours, thank positive reviewers while reinforcing services, and address negative reviews with genuine improvement plans.

## Post Management

Use Google Business Profile posts to regularly share updates and offers. Posts expire after 14 days, so aim for at least weekly updates.` },

  { slug:"structured-data-seo-guide", titleJa:"構造化データ完全入門 — JSON-LDで検索表示を劇的に改善する方法", titleEn:"Structured Data Complete Guide — Dramatically Improve Search Display with JSON-LD", excerptJa:"リッチリザルト、ナレッジパネル、サイトリンク検索ボックス。構造化データの正しい実装方法と、ビジネス成果に直結する7つのスキーマタイプを実例付きで解説します。", excerptEn:"Rich results, knowledge panels, sitelink search boxes. A practical guide to implementing structured data correctly, with examples of 7 schema types that directly impact business outcomes.", catJa:"SEO/GEO", catEn:"SEO/GEO", readJa:"9分", readEn:"9 min", tags:["構造化データ","JSON-LD","リッチリザルト","スキーマ"], date:"2025-06-15", contentJa:`## 構造化データとは

構造化データは、Webページの内容を検索エンジンが理解しやすい形式で記述するマークアップです。正しく実装することでリッチリザルト（星評価、価格、イベント日程など）として検索結果に表示され、CTRを大幅に向上させます。

## 必須スキーマタイプ7選

Organization（企業情報の基本）、WebSite（サイトリンク検索ボックス用）、BreadcrumbList（パンくずリスト表示）、Article/BlogPosting（記事の公開日・著者・見出し）、FAQ（よくある質問のアコーディオン表示）、LocalBusiness（地域ビジネスの地図・営業時間表示）、Product（EC商品の価格・在庫・レビュー表示）。

## Next.jsでの実装方法

Next.jsのApp Routerでは、generateMetadataと併せて構造化データをscriptタグで埋め込みます。dangerouslySetInnerHTMLでJSON-LDを出力し、型安全なTypeScriptでスキーマオブジェクトを構築すると安全かつ保守しやすい実装になります。`, contentEn:`## What is Structured Data

Structured data is markup that describes web page content in a format search engines can easily parse. When implemented correctly, it enables rich results in search results, dramatically improving CTR.

## 7 Essential Schema Types

Organization, WebSite, BreadcrumbList, Article/BlogPosting, FAQ, LocalBusiness, Product. Each serves a specific purpose in enhancing search visibility and user experience.

## Implementation in Next.js

In Next.js App Router, embed structured data via script tags alongside generateMetadata. Output JSON-LD with dangerouslySetInnerHTML, constructing schema objects with type-safe TypeScript for a maintainable, safe implementation.` },

  // ── AI・自動化 ──
  { slug:"ai-business-automation-2025", titleJa:"中小企業のAI業務自動化 — 2025年に導入すべき5つのツールと導入手順", titleEn:"AI Business Automation for SMBs — 5 Tools to Deploy in 2025", excerptJa:"Dify、n8n、DeepSeek、Make、Zapier。2025年、中小企業がコストを抑えてAI自動化を実現するためのツール選定と導入手順を、実際の業務フローに沿って解説します。", excerptEn:"Dify, n8n, DeepSeek, Make, Zapier. A practical guide to cost-effective AI automation tools for SMBs in 2025, with implementation steps mapped to real business workflows.", catJa:"AI・自動化", catEn:"AI & Automation", readJa:"10分", readEn:"10 min", tags:["AI","自動化","Dify","n8n","DX","業務改善"], date:"2025-08-05", contentJa:`## AI自動化の現実解

「AIで全部自動化」は幻想です。現実的なアプローチは、人間の判断が必要な部分と自動化できる部分を明確に分離し、徐々に自動化範囲を広げていくことです。

## 2025年おすすめツール5選

Dify: AIアプリ構築プラットフォーム。チャットボット、文章生成、データ分析などのAI機能をノーコードで実装可能。n8n: オープンソースのワークフロー自動化。1000以上のサービスと連携し複雑な業務フローを自動化。DeepSeek V4: 高精度・低コストのLLM。Context Cachingで入力コスト90%OFF。Make: 視覚的なシナリオビルダーで直感的な自動化設計。Zapier: 7000以上のアプリ連携。最も手軽に始められる自動化ツール。

## 導入ステップ

業務の棚卸しと自動化候補の洗い出し、優先度・効果試算によるロードマップ作成、PoCの小規模実施、本番展開とモニタリング、継続的な改善サイクルの確立。`, contentEn:`## The Reality of AI Automation

"AI will automate everything" is a fantasy. The realistic approach is to clearly separate human judgment tasks from automatable tasks, then gradually expand automation scope.

## Top 5 Tools for 2025

Dify: No-code AI app platform for chatbots, text generation, data analysis. n8n: Open-source workflow automation with 1000+ integrations. DeepSeek V4: High-accuracy, low-cost LLM with 90% input cost reduction via Context Caching. Make: Visual scenario builder. Zapier: 7000+ app integrations, the easiest entry point.

## Implementation Steps

Audit operations and identify automation candidates, build roadmap with ROI estimates, run small-scale PoC, production deployment and monitoring, establish continuous improvement cycles.` },

  { slug:"dify-ai-chatbot-build", titleJa:"DifyではじめるAIチャットボット構築 — ノーコードで自社専用AIを作る完全ガイド", titleEn:"Building AI Chatbots with Dify — A Complete No-Code Guide", excerptJa:"プログラミング不要で自社専用AIチャットボットを構築できるDifyの使い方を徹底解説。ナレッジベース設定、ワークフロー設計、Webサイト埋め込みまで。", excerptEn:"A comprehensive guide to Dify — the no-code platform for building custom AI chatbots. Covers knowledge base setup, workflow design, and website embedding.", catJa:"AI・自動化", catEn:"AI & Automation", readJa:"12分", readEn:"12 min", tags:["Dify","AIチャットボット","ノーコード","ナレッジベース","DeepSeek"], date:"2025-07-25", contentJa:`## Difyとは

Difyは、LLMを活用したAIアプリケーションをノーコードで構築できるプラットフォームです。カスタマーサポートチャットボット、社内向けナレッジQ&A、コンテンツ生成ツールなど幅広い用途に対応します。

## ナレッジベースの構築

AIに自社情報を学習させる核となるのがナレッジベースです。Webサイトの内容、製品マニュアル、FAQ、社内文書などをアップロードすることで、AIが自社専用の回答を生成できるようになります。

## ワークフロー設計のポイント

単純なQ&Aだけでなく、条件分岐や外部API連携を含む複雑なワークフローも設計できます。例えば問い合わせ内容に応じて適切な部署に振り分ける、在庫確認APIを呼び出して回答するといった高度な自動化が可能です。

## Webサイトへの埋め込み

Difyで構築したチャットボットは、数行のJavaScriptコードで既存のWebサイトに埋め込めます。カスタムCSSでブランドに合わせたデザイン変更も可能です。`, contentEn:`## What is Dify

Dify is a no-code platform for building AI applications powered by LLMs. It supports customer support chatbots, internal knowledge Q&A, content generation tools, and more.

## Building a Knowledge Base

The knowledge base is the core that teaches AI your business information. Upload website content, product manuals, FAQs, and internal documents so the AI can generate company-specific answers.

## Workflow Design Tips

Beyond simple Q&A, design complex workflows with conditional branching and external API integration. Route inquiries to the right department or call inventory APIs for real-time responses.

## Embedding in Your Website

Dify chatbots can be embedded in any website with a few lines of JavaScript. Custom CSS enables brand-aligned design customization.` },

  { slug:"deepseek-v4-business-use", titleJa:"DeepSeek V4のビジネス活用術 — 月額数千円ではじめるAI導入", titleEn:"DeepSeek V4 for Business — Start AI Adoption for Just a Few Dollars a Month", excerptJa:"Context Cachingで入力コスト90%OFF。大量の問い合わせ自動応答、多言語コンテンツ生成、営業資料の自動作成など、具体的なビジネス活用事例とコスト試算を公開します。", excerptEn:"DeepSeek V4 with Context Caching cuts input costs by 90%. Real business use cases and cost estimates for automated inquiry responses, multilingual content, and sales material creation.", catJa:"AI・自動化", catEn:"AI & Automation", readJa:"8分", readEn:"8 min", tags:["DeepSeek","LLM","コスト削減","AI活用"], date:"2025-07-15", contentJa:`## DeepSeek V4の特長

DeepSeek V4は高精度と低コストを両立するLLMです。Context Caching機能により同一プロンプトのキャッシュヒット時に入力コストが90%OFFになります。大量の定型処理を行うビジネスにとって極めて大きなコストメリットです。

## 具体的な活用事例

カスタマーサポートの自動応答: FAQと過去の問い合わせ履歴をキャッシュし高精度な一次回答を自動生成。多言語コンテンツ生成: 日本語の記事や商品説明を12カ国語に一括翻訳。営業資料の自動作成: 企業データから業界分析・課題抽出・提案書のたたき台を自動生成。データ構造化・分類: 非構造化データから必要な情報を抽出・構造化。

## 月額コスト試算

月間10,000件の問い合わせ自動応答を行う場合、キャッシュヒット率70%と仮定するとAPIコストは月額5〜10ドル程度です。人件費換算で月数十万円の削減効果が期待できます。`, contentEn:`## DeepSeek V4 Highlights

DeepSeek V4 balances high accuracy with low cost. Its Context Caching cuts input costs by 90% on cache hits — a massive advantage for businesses processing large volumes of standardized tasks.

## Real-World Use Cases

Automated customer support with cached FAQs and interaction history. Multilingual content generation translating Japanese into 12 languages at low cache-optimized cost. Automated sales materials from company data. Data structuring and extraction from unstructured sources.

## Monthly Cost Estimate

For 10,000 automated inquiry responses per month at 70% cache-hit rate, API costs run just $5-10/month — translating to thousands of dollars in monthly labor-cost savings.` },

  { slug:"dx-small-business-roadmap", titleJa:"中小企業DXの羅針盤 — 3ステップではじめるデジタル改革", titleEn:"SMB DX Roadmap — A 3-Step Guide to Digital Transformation", excerptJa:"DXは大企業だけのものではありません。中小企業が今日から始められるDXの3ステップ「デジタル化 → 自動化 → 高度化」を具体的な費用感とともに解説します。", excerptEn:"DX isn't just for enterprises. A practical 3-step framework for SMBs — Digitalize → Automate → Advance — with concrete cost estimates and actionable starting points.", catJa:"AI・自動化", catEn:"AI & Automation", readJa:"7分", readEn:"7 min", tags:["DX","デジタル化","中小企業","業務改善"], date:"2025-07-01", contentJa:`## DXは難しくない

DXという言葉に圧倒される中小企業経営者は少なくありません。しかし本質はシンプルです。「デジタル技術を使って、今の業務をより良くする」ことです。

## ステップ1：デジタル化

紙の書類をクラウドに移行し情報共有をスムーズにします。Google WorkspaceやMicrosoft 365の導入、クラウド会計ソフトへの移行、電子契約の導入などから始めましょう。

## ステップ2：自動化

繰り返し作業をツールで自動化します。n8nを使って「メール→Slack通知→スプレッドシート記録」のようなルーチンを自動化したり、AIチャットボットで一次問い合わせ対応を自動化します。

## ステップ3：高度化

蓄積したデータを分析し、AIを活用した予測や意思決定支援を行います。在庫予測、売上予測、顧客離反予測などの高度な分析を、クラウドAIツールで手軽に実現できます。`, contentEn:`## DX Isn't Hard

Many SMB leaders feel overwhelmed by "DX." But the essence is simple: use digital technology to make current operations better.

## Step 1: Digitalize

Move paper documents to the cloud for smooth information sharing. Start with Google Workspace or Microsoft 365, cloud accounting software, and electronic contracts.

## Step 2: Automate

Use tools to automate repetitive tasks. Build n8n workflows for routines like "email → Slack → spreadsheet" or automate first-response inquiries with AI chatbots.

## Step 3: Advance

Analyze accumulated data and leverage AI for prediction and decision support. Achieve advanced analytics like inventory forecasting, sales prediction, and churn prediction using accessible cloud AI tools.` },

  { slug:"ai-tool-comparison-2025", titleJa:"【2025年比較】ビジネスAIツール完全ガイド — ChatGPT vs Claude vs Gemini vs DeepSeek", titleEn:"2025 Business AI Tool Comparison — ChatGPT vs Claude vs Gemini vs DeepSeek", excerptJa:"ビジネス用途で最適なAIツールはどれか。4大LLMを精度・コスト・機能・日本語対応の4軸で徹底比較します。", excerptEn:"Which AI tool is best for business? A thorough 4-axis comparison of ChatGPT, Claude, Gemini, and DeepSeek — accuracy, cost, features, and Japanese language support.", catJa:"AI・自動化", catEn:"AI & Automation", readJa:"11分", readEn:"11 min", tags:["AI比較","ChatGPT","Claude","Gemini","DeepSeek"], date:"2025-06-20", contentJa:`## 4大LLMの比較軸

AIツール選定で重要なのは「どのタスクにどのモデルが最適か」です。日本語生成精度、APIコスト、機能（コード生成・データ分析・マルチモーダル対応）、エコシステム（プラグイン・API連携）の4軸で比較します。

## 各モデルの特徴

ChatGPT（OpenAI）: エコシステムが最も充実。プラグイン、GPTs、API連携が豊富。日本語精度は高いがAPIコストは最高。Claude（Anthropic）: 長文処理と安全性に強み。200Kトークンのコンテキストウィンドウ。Gemini（Google）: マルチモーダル最強。画像・動画・音声の理解力が高い。DeepSeek V4: コストパフォーマンス最強。Context Cachingで入力コスト90%OFF。コーディング・JSON出力・日本語精度が高い。

## 用途別おすすめ

カスタマーサポート自動化 → DeepSeek（低コスト・高精度）。長文レポート作成 → Claude（長文処理・構造化出力）。画像・動画解析 → Gemini（マルチモーダル）。社内AIアシスタント → ChatGPT（エコシステム充実）。`, contentEn:`## Comparison Framework

The key question: which model is best for which task? Compare across Japanese generation quality, API cost, features, and ecosystem.

## Model Highlights

ChatGPT (OpenAI): Richest ecosystem. Abundant plugins, GPTs, and API integrations. Strong Japanese but highest API cost. Claude (Anthropic): Excels at long-form processing and safety. 200K context window. Gemini (Google): Best multimodal. Superior image/video/audio understanding. DeepSeek V4: Best cost-performance. 90% input-cost reduction with Context Caching.

## Recommendations by Use Case

Customer support automation → DeepSeek (low cost, high accuracy). Long-form reports → Claude (long-context, structured output). Image/video analysis → Gemini (multimodal). Internal AI assistant → ChatGPT (rich ecosystem).` },
]


const POSTS_PART2 = [
  // ── Web制作 ──
  { slug:"web-production-cost-2025", titleJa:"Webサイト制作の費用相場 2025 — 発注前に知っておくべき予算のすべて", titleEn:"Web Development Cost Guide 2025", excerptJa:"HP制作、LP制作、ECサイト構築。2025年のWeb制作費用相場を制作タイプ別・発注先別に徹底解説。見積もりの読み方、失敗しない発注のコツも紹介します。", excerptEn:"A comprehensive 2025 web development cost guide by project type and vendor category. Learn to read quotes, spot hidden costs, and commission with confidence.", catJa:"Web制作", catEn:"Web Development", readJa:"11分", readEn:"11 min", tags:["Web制作","費用","見積もり","発注","相場"], date:"2025-08-10", contentJa:`## Web制作費用の全体像

Webサイト制作の費用は「何を作るか」「誰に頼むか」で大きく変動します。2025年の相場感を掴んでおくことで適正価格での発注が可能になります。

## 制作タイプ別 費用相場

シンプルなコーポレートサイト（5ページ程度）: 30〜80万円。10ページ以上の本格コーポレートサイト: 80〜200万円。ランディングページ（LP）1枚: 15〜50万円。ECサイト構築（Shopify等）: 100〜500万円。フルカスタムWebアプリケーション: 300万円〜。

## 発注先別の特徴

大手制作会社: 300万円〜。品質は高いが高額。小回りが利かない。中小制作会社: 50〜200万円。バランスが良い。フリーランス: 20〜100万円。コスパは良いが属人化リスクあり。海外オフショア: 10〜50万円。コミュニケーションコストに注意。

## 見積もりの読み方

見積書には「制作費」だけでなく「サーバー代」「ドメイン代」「保守費用」「追加修正費用」などが含まれているか確認しましょう。特にサブスク型の保守費用は要注意です。`, contentEn:`## Web Development Cost Overview

Web development costs vary significantly based on what you're building and who you hire. Understanding 2025 market rates helps you commission at fair prices.

## Cost Ranges by Project Type

Simple corporate site: ¥300K-800K. Full corporate site (10+ pages): ¥800K-2M. Single landing page: ¥150K-500K. Ecommerce (Shopify etc.): ¥1M-5M. Custom web application: ¥3M+.

## Vendor Categories

Large agencies: ¥3M+. High quality but expensive and rigid. Mid-size agencies: ¥500K-2M. Good balance. Freelancers: ¥200K-1M. Great value but key-person risk. Offshore: ¥100K-500K. Watch communication overhead.

## Reading Proposals

Check whether quotes include hosting, domains, maintenance, and revision costs beyond the base development fee. Watch for subscription-style maintenance.` },

  { slug:"nextjs-vs-wordpress-2025", titleJa:"Next.js vs WordPress — 2025年Web制作の技術選定で失敗しないための比較", titleEn:"Next.js vs WordPress — How to Choose the Right Web Technology in 2025", excerptJa:"Webサイト制作の2大選択肢をパフォーマンス、運用コスト、拡張性、SEO、セキュリティの5軸で徹底比較。", excerptEn:"The two major options for web development: Next.js vs WordPress. A thorough 5-axis comparison covering performance, operating costs, scalability, SEO, and security.", catJa:"Web制作", catEn:"Web Development", readJa:"10分", readEn:"10 min", tags:["Next.js","WordPress","技術選定","Web制作","比較"], date:"2025-07-30", contentJa:`## 2大プラットフォームの現在地

2025年、Web制作の技術選定で最もよく議論されるのが「Next.js vs WordPress」です。それぞれ異なる設計思想を持ち、適した用途も異なります。

## パフォーマンス比較

Next.jsは静的生成（SSG）とサーバーサイドレンダリング（SSR）によりLighthouseスコア95+が標準的です。一方WordPressは適切なキャッシュと最適化でスコア80+を達成できますが、プラグイン依存度によって大きく変動します。

## 運用コスト比較

WordPressは管理画面が充実しており非エンジニアでもコンテンツ更新が容易です。Next.jsの場合コンテンツ管理には別途ヘッドレスCMSが必要ですが、その分パフォーマンスとセキュリティ面で優位です。

## どちらを選ぶべきか

WordPress: 頻繁なコンテンツ更新が必要なブログ・メディアサイト、非エンジニアが日常運用するサイト向け。Next.js: 高いパフォーマンスが求められるコーポレートサイト、多言語対応が必要なグローバルサイト、カスタム機能を多く実装するWebアプリケーション向け。`, contentEn:`## The Two Platforms Today

In 2025, the most common technology debate is Next.js vs WordPress. Each has distinct design philosophies and ideal use cases.

## Performance

Next.js with SSG/SSR typically achieves Lighthouse scores of 95+. WordPress can reach 80+ with proper caching and optimization but varies significantly based on plugin load.

## Operating Costs

WordPress offers a rich admin panel for non-engineer content updates. Next.js requires a headless CMS for content management but gains significant performance and security advantages.

## Choosing the Right Platform

WordPress: Best for content-heavy blogs/media sites with frequent updates. Next.js: Best for high-performance corporate sites, global multilingual sites, and custom web applications.` },

  { slug:"web-design-trends-2025", titleJa:"2025年Webデザイントレンド10選 — 集客につながる最新デザイン手法", titleEn:"10 Web Design Trends for 2025 — Latest Design Techniques That Drive Conversions", excerptJa:"Bentoグリッド、ダークモード対応、マイクロインタラクション、AIパーソナライゼーション。具体的な実装方法と集客効果の観点から解説。", excerptEn:"Bento grids, dark mode, micro-interactions, AI personalization. 2025 web design trends explained with implementation methods and impact on lead generation.", catJa:"Web制作", catEn:"Web Development", readJa:"8分", readEn:"8 min", tags:["Webデザイン","トレンド","UI/UX","デザイン"], date:"2025-07-05", contentJa:`## 2025年のWebデザイン方向性

2025年のWebデザインは「情報設計の明瞭さ」と「ブランドの個性表現」の両立がテーマです。AppleやStripeに代表されるクリーンな情報階層と独自のビジュアルアイデンティティの融合が進んでいます。

## 注目トレンド10選

Bentoグリッドレイアウト、可変フォント（1ファイルで全ウェイトをカバー）、スクロールドリブンアニメーション、グラスモーフィズム2.0、ダークモード完全対応、マイクロインタラクション、AIパーソナライゼーション、3D/WebGLの実用化、タイポグラフィ主導デザイン、カーボンアウェアデザイン。

## 実装のポイント

TailwindCSSやshadcn/uiを使った実装では、これらのトレンドの多くが標準機能として利用可能です。新規サイト構築時にはモダンなUIライブラリを活用することで、トレンド対応と保守性を両立できます。`, contentEn:`## 2025 Design Direction

The 2025 theme is balancing clear information architecture with distinctive brand expression. Clean hierarchy inspired by Apple and Stripe merges with unique visual identity.

## 10 Notable Trends

Bento grid layouts, variable fonts, scroll-driven animation, glassmorphism 2.0, full dark mode support, micro-interactions, AI personalization, practical 3D/WebGL, typography-led design, carbon-aware design.

## Implementation Tips

Modern UI libraries like TailwindCSS and shadcn/ui make many of these trends accessible as standard features. Leverage them for new builds to balance trend adoption with maintainability.` },

  { slug:"cms-selection-guide", titleJa:"CMSの選び方完全ガイド — WordPressからヘッドレスCMSまで徹底比較", titleEn:"Complete CMS Selection Guide — From WordPress to Headless CMS Compared", excerptJa:"WordPress、PayloadCMS、Strapi、Contentful、microCMS。多言語対応、運用コスト、拡張性、UI/UXの4軸で比較。失敗しないCMS選定をサポートします。", excerptEn:"WordPress, PayloadCMS, Strapi, Contentful, microCMS. A 4-axis comparison of 2025 CMS options covering multilingual support, operating costs, scalability, and UI/UX.", catJa:"Web制作", catEn:"Web Development", readJa:"9分", readEn:"9 min", tags:["CMS","WordPress","ヘッドレスCMS","PayloadCMS","比較"], date:"2025-06-10", contentJa:`## CMS選定の重要性

CMSはサイト運用の中心です。一度選ぶと移行に多大なコストがかかるため初期選定が極めて重要です。

## 2025年のCMS選択肢

WordPress: 世界シェア43%。プラグイン豊富だがセキュリティリスクあり。PayloadCMS: Next.jsネイティブのヘッドレスCMS。多言語対応と高い開発者体験が強み。Strapi: オープンソース。カスタマイズ性が高くエンタープライズ向け。Contentful: SaaS型。信頼性が高いが従量課金。microCMS: 国産。日本企業向けサポートが充実。

## 選定の4基準

多言語対応: 海外展開予定があるなら多言語が標準装備されたCMSを選ぶ。運用コスト: 月額費用だけでなく運用に必要な人件費も含めて試算。拡張性: 将来の機能追加やAPI連携を見据えた設計か。UI/UX: 実際にコンテンツを更新する担当者が使いやすいかが運用継続の鍵。`, contentEn:`## Why CMS Selection Matters

Your CMS is the operational heart of your site. Migration is costly, so initial selection is critical.

## 2025 CMS Options

WordPress: 43% global share. Rich plugins but security challenges. PayloadCMS: Next.js-native headless CMS. Strong multilingual support. Strapi: Open-source, highly customizable. Contentful: SaaS, reliable but metered pricing. microCMS: Japanese, excellent local support.

## 4 Selection Criteria

Multilingual: Choose native multilingual support if global expansion is planned. Operating costs: Estimate both fees and staffing. Scalability: Confirm architecture supports future features. UI/UX: The people updating content must find it usable.` },

  { slug:"web-accessibility-basics", titleJa:"Webアクセシビリティの基本 — 2025年に対応すべき最低限の5項目", titleEn:"Web Accessibility Basics — 5 Minimum Requirements for 2025", excerptJa:"2024年4月の法改正で民間企業のWebアクセシビリティ対応が努力義務化。対応すべき最低限の5項目と具体的な実装方法を解説します。", excerptEn:"Japan's 2024 legal revision made web accessibility a duty of care. Learn the 5 minimum requirements and implementation methods.", catJa:"Web制作", catEn:"Web Development", readJa:"7分", readEn:"7 min", tags:["アクセシビリティ","Web制作","法改正","UI/UX"], date:"2025-06-05", contentJa:`## 法的背景

2024年4月、障害者差別解消法の改正により民間事業者のWebアクセシビリティ対応が努力義務から義務へと引き上げられました。Web制作においてアクセシビリティはもはや「オプション」ではなく「必須」です。

## 最低限対応すべき5項目

画像にalt属性を付与する。キーボード操作に対応する（Tab/Enterキーですべての操作を行えるように）。十分なカラーコントラストを確保する（WCAG 2.1 AA基準4.5:1以上）。フォームに適切なラベルを付与する。見出しの適切な階層構造を維持する（h1→h2→h3の順序を守る）。

## 実装時のポイント

TailwindCSSやshadcn/uiを使った実装ではアクセシビリティ対応が比較的容易です。特にshadcn/uiはRadix UIをベースにしておりWAI-ARIA対応が標準で組み込まれています。`, contentEn:`## Legal Background

In April 2024, Japan's disability discrimination law was amended, upgrading web accessibility to a duty of care. Accessibility is no longer optional.

## 5 Minimum Requirements

Alt attributes on all images. Keyboard navigation (all interactions via Tab/Enter). Sufficient color contrast (WCAG 2.1 AA 4.5:1+). Proper form labels with readable error messages. Correct heading hierarchy (h1→h2→h3).

## Implementation Tips

Modern UI libraries like TailwindCSS and shadcn/ui (built on Radix UI) make accessibility significantly easier — Radix includes WAI-ARIA support by default.` },

  // ── デジタルマーケティング ──
  { slug:"digital-marketing-framework-2025", titleJa:"デジタルマーケティング全体設計 — 集客から成約までの5ステップフレームワーク", titleEn:"Digital Marketing Architecture — A 5-Step Framework", excerptJa:"バラバラになりがちなデジタルマーケティング施策を集客→興味喚起→比較検討→成約→育成の5ステップで体系化。具体的なKPIとともに解説。", excerptEn:"Systematize scattered digital marketing with a 5-step framework: Acquisition → Interest → Consideration → Conversion → Nurture. Concrete KPIs included.", catJa:"デジタルマーケティング", catEn:"Digital Marketing", readJa:"10分", readEn:"10 min", tags:["デジタルマーケティング","フレームワーク","集客","KPI"], date:"2025-08-15", contentJa:`## なぜ全体設計が必要か

多くの企業ではSEO、SNS広告、メルマガ、展示会などの個別施策がバラバラに実施されています。これらを1つのフレームワークに統合することで施策間の相乗効果が生まれ投資対効果が大きく改善します。

## 5ステップフレームワーク

集客（Acquisition）: SEO/GEO、MEO、SNS、広告で認知を獲得。興味喚起（Interest）: LP、ホワイトペーパー、動画で関心を深める。比較検討（Consideration）: 事例、お客様の声、料金表で信頼を構築。成約（Conversion）: 問い合わせフォーム、チャット、電話での受注。育成（Nurture）: メルマガ、SNS、セミナーでリピート・紹介を促進。

## 各ステップのKPI

集客: 検索流入数、SNSインプレッション数。興味喚起: LPのCVR、ホワイトペーパーダウンロード数。比較検討: 事例ページの回遊率。成約: 問い合わせ数、成約率。育成: リピート率、紹介経由の新規問い合わせ数。`, contentEn:`## Why You Need Architecture

Most businesses run scattered tactics in isolation. Integrating them into one framework creates synergy and dramatically improves ROI.

## The 5-Step Framework

Acquisition: SEO/GEO, MEO, social, ads for awareness. Interest: LPs, white papers, video to deepen engagement. Consideration: Case studies, testimonials, pricing to build trust. Conversion: Contact forms, chat, phone for closing. Nurture: Email, social, seminars for repeat and referral business.

## KPI Setting

Acquisition: Search traffic, social impressions. Interest: LP CVR, downloads. Consideration: Case study page depth. Conversion: Inquiry count, close rate. Nurture: Repeat rate, referral-sourced inquiries.` },

  { slug:"landing-page-optimization", titleJa:"成約率を2倍にするLP改善 — 心理トリガーを活用した10の施策", titleEn:"Double Your Conversion Rate — 10 LP Optimization Tactics", excerptJa:"CVRが上がらないLPの多くは心理トリガーの使い方が不十分です。希少性、社会的証明、返報性、一貫性など行動経済学に基づいた10施策を紹介。", excerptEn:"Low-converting LPs often underuse psychological triggers. 10 tactics based on behavioral economics: scarcity, social proof, reciprocity, consistency, and more.", catJa:"デジタルマーケティング", catEn:"Digital Marketing", readJa:"9分", readEn:"9 min", tags:["LP","CVR","コンバージョン","心理トリガー","改善"], date:"2025-07-28", contentJa:`## LP改善の考え方

LPの改善は勘や好みではなくデータと心理原則に基づいて行うべきです。A/Bテストの前にまず心理トリガーが正しく機能しているかを確認しましょう。

## 10の心理トリガー施策

希少性（「残り3席」「期間限定」）、社会的証明（導入実績数・お客様の声）、返報性（無料の資料ダウンロードで先に価値を提供）、一貫性（小さな「はい」から始める）、権威（専門家の推薦・資格・受賞歴）、好意（共感ストーリー・企業理念）、損失回避（「導入しないリスク」の提示）、アンカリング（高額プランを先に見せる）、バンドワゴン効果（「多くの企業が選んでいます」）、単純化（選択肢を絞り意思決定の負荷を下げる）。`, contentEn:`## LP Optimization Mindset

LP optimization should be driven by data and psychological principles, not intuition. Before A/B testing, verify that psychological triggers are correctly deployed.

## 10 Psychological Trigger Tactics

Scarcity ("only 3 slots left"), Social proof (deployments, testimonials), Reciprocity (give value first), Consistency (start with small "yes" moments), Authority (endorsements, awards), Liking (relatable stories), Loss aversion (risk of not adopting), Anchoring (show premium first), Bandwagon ("trusted by many"), Simplification (reduce options to lower decision burden).` },

  { slug:"video-marketing-beginners", titleJa:"動画マーケティング入門 — 予算50万円から始める動画集客のすべて", titleEn:"Video Marketing for Beginners — Everything You Need Starting from $3,500", excerptJa:"スマホ1台から始める動画制作、YouTube/Instagram/TikTokの使い分け、動画SEOの基本まで低予算で始める動画集客を解説します。", excerptEn:"From smartphone production to platform strategy and video SEO basics — how to start video marketing on a budget.", catJa:"デジタルマーケティング", catEn:"Digital Marketing", readJa:"8分", readEn:"8 min", tags:["動画マーケティング","YouTube","動画制作","集客"], date:"2025-07-12", contentJa:`## 動画マーケティングの現在地

2025年、インターネットトラフィックの82%が動画コンテンツと言われています。テキストと画像だけのマーケティングでは消費者の注意を十分に獲得できません。

## プラットフォーム別戦略

YouTube: 検索型。SEOの延長として「課題解決」動画が有効。長尺（5〜15分）の教育コンテンツが主力。Instagram（Reels）: 発見型。短尺（15〜90秒）で視覚的インパクトを重視。TikTok: トレンド型。UGC的アプローチで親近感を醸成。

## 低予算で始める3ステップ

スマホ撮影から始める（最新のスマホは4K撮影可能。照明とマイクだけ投資）。編集はCanvaやCapCutで（無料ツールで十分な品質が可能）。まずは10本作る（質より量。10本作って初めて勝ちパターンが見える）。`, contentEn:`## Video Marketing Today

In 2025, 82% of internet traffic is video. Text-and-image-only marketing can no longer capture sufficient consumer attention.

## Platform Strategy

YouTube: Search-driven. Problem-solving videos as an extension of SEO. Long-form educational content. Instagram (Reels): Discovery-driven. Short-form visual impact. TikTok: Trend-driven. UGC-style builds relatability.

## 3 Steps to Start on a Budget

Start with smartphone (today's phones shoot 4K. Invest only in lighting and a mic). Edit with Canva or CapCut (free tools deliver sufficient quality). Make 10 videos first (quantity over quality. Winning patterns only emerge after 10 attempts).` },

  { slug:"sns-marketing-strategy-2025", titleJa:"2025年SNSマーケティング戦略 — プラットフォーム別・業種別の最適解", titleEn:"2025 Social Media Marketing Strategy", excerptJa:"X、Instagram、LinkedIn、TikTok、Facebook。2025年に注力すべきSNSを業種別・目的別に整理し最新アルゴリズム動向と運用のコツを解説します。", excerptEn:"X, Instagram, LinkedIn, TikTok, Facebook. A platform-by-platform, industry-by-industry breakdown with latest algorithm trends and operating tips.", catJa:"デジタルマーケティング", catEn:"Digital Marketing", readJa:"10分", readEn:"10 min", tags:["SNS","マーケティング","Instagram","LinkedIn"], date:"2025-06-28", contentJa:`## SNSマーケティングの全体像

2025年、SNSは単なる「情報発信の場」から「購買の場」へと完全に進化しました。各プラットフォームが購買機能を標準装備しています。

## 業種別おすすめSNS

BtoB（IT・コンサル）: LinkedInを軸に、Xで専門性を発信。週2回の専門記事投稿と業界ネットワーキングが効果的。BtoC（小売・飲食）: Instagramを軸に、TikTokで若年層リーチ。ビジュアル重視の投稿とUGCキャンペーンが鍵。BtoBtoC（不動産・教育）: YouTubeを軸に、Instagramで補完。物件紹介や授業サンプルの動画が信頼構築に有効。

## 運用のコツ

コンテンツの再利用（1つの記事をスレッド、リール、ブログ記事に展開）。投稿時間の最適化（プラットフォームごとに最もエンゲージメントが高い時間帯を狙う）。コミュニティ運営（一方的な発信ではなくコメント返信・DM対応を徹底する）。`, contentEn:`## Social Media Landscape

In 2025, social media has fully evolved from broadcast channels to purchase channels with native purchasing on every platform.

## Platform by Industry

B2B (IT/Consulting): LinkedIn as anchor, X for expertise. Twice-weekly expert posts. B2C (Retail/Food): Instagram as anchor, TikTok for younger reach. Visual-first posts and UGC campaigns. B2B2C (Real Estate/Education): YouTube as anchor, Instagram as complement.

## Operating Tips

Content repurposing (one article into threads, Reels, blog posts). Post timing optimization (target each platform's peak engagement windows). Community management (prioritize replies and DMs over broadcasting).` },

  { slug:"marketing-automation-intro", titleJa:"MA（マーケティングオートメーション）入門 — 最小構成ではじめる顧客育成の仕組み", titleEn:"Marketing Automation 101 — Building a Customer Nurture System with Minimal Setup", excerptJa:"MAツールは高額という先入観を捨てましょう。n8nやMakeを使えば月額数千円からMAを構築できます。実際のワークフロー例とともに解説します。", excerptEn:"Forget the notion that MA tools are expensive. With n8n and Make, you can build marketing automation starting at a few dollars a month. Real workflow examples included.", catJa:"デジタルマーケティング", catEn:"Digital Marketing", readJa:"8分", readEn:"8 min", tags:["MA","マーケティングオートメーション","n8n","Make"], date:"2025-06-18", contentJa:`## MAは高くない

MAと聞くとHubSpotやMarketoのような高額ツールを想像するかもしれません。しかし2025年現在、n8nやMakeのようなオープン/低価格ツールで必要な機能のほとんどを実現できます。

## 最小構成MAの4要素

リード獲得: LPやフォームからのデータを自動でDBに保存。スコアリング: ページ閲覧・メール開封・資料DLなどの行動を自動スコア化。セグメンテーション: スコアや属性に応じて自動でリスト分け。ステップメール: セグメントに応じた最適なメールを自動配信。

## n8nで実装するMAの具体例

Webサイトの問い合わせフォーム送信 → n8n Webhook → Google Sheetsに保存 → Slackに通知。メルマガ開封者 → 開封イベントをトリガーに → 関連するホワイトペーパーを自動送付。一定期間未接触のリード → 自動で再アプローチメールを配信。`, contentEn:`## MA Isn't Expensive

Marketing automation might conjure images of expensive tools. But in 2025, open-source and low-cost tools like n8n and Make can deliver most of what you need.

## 4 Elements of Minimal MA

Lead capture: Auto-save form data to DB. Scoring: Auto-score behaviors like page views, email opens, downloads. Segmentation: Auto-sort leads by score and attributes. Drip email: Auto-send optimized emails per segment.

## Concrete n8n MA Examples

Website contact form → n8n Webhook → Google Sheets → Slack notification. Newsletter openers → auto-send related white paper. Inactive leads → auto-send re-engagement email.` },
]

// Combine all posts
const ALL_POSTS = [...POSTS, ...POSTS_PART2]

const SERVICES = [
  { slug:"jaas", nameJa:"Japan-as-a-Service (JaaS)", nameEn:"Japan-as-a-Service (JaaS)", taglineJa:"海外企業の日本市場参入をフルスタックで支援", taglineEn:"Full-stack market entry support for global SMBs", icon:"Globe", featuresJa:["市場調査・競合分析（公開データ + AI構造化）","現地法人設立支援（司法書士・税理士コーディネート）","日本語LP/EC構築（12カ国語対応 + GEO最適化）","MEO/SEO/SNS集客の現地運用代行","請求書発行・経理代行（Stripe + 国内決済）","日本人カスタマーサポート（チャット/メール/電話）"], featuresEn:["Market research & competitor analysis","Local entity setup (legal & tax coordinator network)","Japanese LP/EC build (12-language + GEO-optimized)","MEO/SEO/Social ops as managed service","Invoicing & accounting (Stripe + JP payments)","Japanese customer support (chat/email/phone)"], sortOrder:1 },
  { slug:"web", nameJa:"Web制作", nameEn:"Web Development", taglineJa:"集客に強いモダンなビジネスサイトを", taglineEn:"Modern, conversion-focused business websites", icon:"Globe", featuresJa:["コーポレートサイト/LP/ECサイト制作","レスポンシブデザイン（スマホ・タブレット対応）","SEO内部対策 + 構造化データ実装","CMS管理画面（PayloadCMS / WordPress）","Next.js + Tailwind CSS + shadcn/ui 採用","12カ国語多言語対応"], featuresEn:["Corporate/LP/EC site development","Responsive design (mobile + tablet)","On-page SEO + structured data","CMS admin (PayloadCMS / WordPress)","Next.js + Tailwind CSS + shadcn/ui stack","12-language i18n"], sortOrder:2 },
  { slug:"meo", nameJa:"MEO対策", nameEn:"MEO (Local SEO)", taglineJa:"Googleマップで上位表示、地域集客を最大化", taglineEn:"Top Google Maps rankings for maximum local reach", icon:"MapPin", featuresJa:["Googleビジネスプロフィール最適化","口コミ獲得・返信代行","投稿運用（最新情報・特典の定期発信）","ローカルSEO（地域キーワード対策）","順位レポート・分析レポート（月次）","競合分析と改善提案"], featuresEn:["Google Business Profile optimization","Review acquisition & response management","Post management (updates, offers)","Local SEO (geo-keyword targeting)","Ranking & analytics reports (monthly)","Competitor analysis & improvement plans"], sortOrder:3 },
  { slug:"seo", nameJa:"SEO / GEO対策", nameEn:"SEO / GEO", taglineJa:"検索エンジンとAI検索からの集客を最大化", taglineEn:"Maximize traffic from search engines and AI", icon:"Search", featuresJa:["キーワード戦略立案・検索意図分析","コンテンツSEO（記事制作・リライト）","テクニカルSEO（サイト速度・構造改善）","GEO対策（ChatGPT/Perplexity最適化）","構造化データ（JSON-LD）実装","月次レポート・分析レポート"], featuresEn:["Keyword strategy & search intent analysis","Content SEO (article creation, rewriting)","Technical SEO (speed, structure)","GEO (ChatGPT/Perplexity optimization)","Structured data (JSON-LD) implementation","Monthly reporting & analytics"], sortOrder:4 },
  { slug:"ai", nameJa:"AI導入支援 / DX", nameEn:"AI Enablement / DX", taglineJa:"AIと自動化で業務を革新する", taglineEn:"Transform operations with AI and automation", icon:"Bot", featuresJa:["業務分析・自動化設計コンサルティング","Dify構築（AIチャットボット・社内ナレッジQ&A）","n8nワークフロー自動化（1000+サービス連携）","DeepSeek V4統合（低コストLLM活用）","社内研修・AIリテラシー向上支援","運用保守・継続改善"], featuresEn:["Process analysis & automation consulting","Dify setup (AI chatbot, internal knowledge Q&A)","n8n workflow automation (1000+ integrations)","DeepSeek V4 integration (low-cost LLM)","Staff training & AI literacy programs","Ongoing operations & continuous improvement"], sortOrder:5 },
]

const PRICING_PLANS = [
  { planJa:"スターター", planEn:"Starter", serviceId:"web", price:300000, currency:"jpy", billingCycle:"one-time", descJa:"5ページのシンプルなコーポレートサイト。レスポンシブデザイン、問い合わせフォーム付き。", descEn:"Simple 5-page corporate site with responsive design and contact form.", featJa:["レスポンシブデザイン","問い合わせフォーム","SEO基本対策","CMS管理画面","1ヶ月無料保守"], featEn:["Responsive design","Contact form","Basic SEO","CMS admin","1 month free maintenance"], popular:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:1 },
  { planJa:"ビジネス", planEn:"Business", serviceId:"web", price:800000, currency:"jpy", billingCycle:"one-time", descJa:"10ページ以上の本格コーポレートサイト。多言語対応、ブログ機能、アニメーション演出付き。", descEn:"Full corporate site (10+ pages) with multilingual support, blog, and animations.", featJa:["全ページレスポンシブ","CMS + ブログ機能","SEO内部対策 + 構造化データ","多言語対応（3言語まで）","アニメーション演出","3ヶ月無料保守"], featEn:["Fully responsive","CMS + blog","On-page SEO + structured data","3-language support","Animation design","3 months free maintenance"], popular:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:2 },
  { planJa:"エンタープライズ", planEn:"Enterprise", serviceId:"web", price:2000000, currency:"jpy", billingCycle:"one-time", descJa:"フルカスタムWebサイト/アプリケーション。AI機能、外部API連携、12カ国語対応までフル対応。", descEn:"Fully custom web/application. AI features, external API integration, up to 12 languages.", featJa:["フルカスタム設計","AI機能統合","外部API/SaaS連携","12カ国語多言語対応","年間保守・運用付き","専任PM + デザイナー + エンジニア"], featEn:["Full custom design","AI integration","External API/SaaS integration","12-language i18n","Annual maintenance included","Dedicated PM + designer + engineer"], popular:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:3 },
  { planJa:"スターター", planEn:"Starter", serviceId:"meo", price:30000, currency:"jpy", billingCycle:"monthly", descJa:"Googleビジネスプロフィールの基本最適化。プロフィール整備と月次レポート付き。", descEn:"Basic GBP optimization with profile setup and monthly reports.", featJa:["プロフィール最適化","写真投稿（月4回）","口コミ返信代行","月次順位レポート"], featEn:["Profile optimization","Photo posts (4/month)","Review response management","Monthly ranking report"], popular:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:4 },
  { planJa:"ビジネス", planEn:"Business", serviceId:"meo", price:80000, currency:"jpy", billingCycle:"monthly", descJa:"投稿運用 + 口コミ戦略 + 競合分析を含む本格MEO対策。", descEn:"Full MEO including post management, review strategy, and competitor analysis.", featJa:["プロフィール最適化 + 継続改善","投稿運用（週2回）","口コミ獲得戦略 + 返信代行","競合分析 + 改善提案","月次詳細レポート"], featEn:["Profile optimization + continuous improvement","Post management (2/week)","Review strategy + response","Competitor analysis + plans","Monthly detailed report"], popular:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:5 },
  { planJa:"プレミアム", planEn:"Premium", serviceId:"meo", price:150000, currency:"jpy", billingCycle:"monthly", descJa:"複数拠点対応 + ローカルSEO + SNS連携を含むフルパッケージ。", descEn:"Multi-location support + local SEO + social media integration full package.", featJa:["全MEO機能（ビジネスプラン内容）","複数拠点対応","ローカルSEO対策","SNS連携運用","専任運用担当者"], featEn:["All Business plan features","Multi-location support","Local SEO","Social media integration","Dedicated account manager"], popular:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:6 },
  { planJa:"スターター", planEn:"Starter", serviceId:"seo", price:50000, currency:"jpy", billingCycle:"monthly", descJa:"キーワード戦略 + コンテンツSEOの基本パッケージ。月2記事の制作代行付き。", descEn:"Basic keyword strategy + content SEO with 2 articles/month.", featJa:["キーワード戦略立案","コンテンツSEO（月2記事）","テクニカルSEO監査","月次レポート"], featEn:["Keyword strategy","Content SEO (2 articles/month)","Technical SEO audit","Monthly report"], popular:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:7 },
  { planJa:"ビジネス", planEn:"Business", serviceId:"seo", price:150000, currency:"jpy", billingCycle:"monthly", descJa:"SEO + GEO統合対策。月4記事制作 + AI検索最適化を含む本格パッケージ。", descEn:"Integrated SEO + GEO. 4 articles/month + AI search optimization.", featJa:["キーワード戦略 + 検索意図分析","コンテンツSEO（月4記事）","テクニカルSEO（サイト改善）","GEO対策（AI検索最適化）","構造化データ実装","月次詳細レポート"], featEn:["Keyword strategy + intent analysis","Content SEO (4 articles/month)","Technical SEO (site improvements)","GEO (AI search optimization)","Structured data implementation","Monthly detailed report"], popular:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:8 },
  { planJa:"エンタープライズ", planEn:"Enterprise", serviceId:"seo", price:400000, currency:"jpy", billingCycle:"monthly", descJa:"大規模サイト向けSEO + GEO + 被リンク獲得戦略のフルパッケージ。", descEn:"Full SEO + GEO + link-building for large-scale sites.", featJa:["全SEO/GEO機能","被リンク獲得戦略","多言語SEO（12カ国語）","コンテンツマーケティング戦略","専任SEOコンサルタント"], featEn:["All SEO/GEO features","Link-building strategy","Multilingual SEO (12 languages)","Content marketing strategy","Dedicated SEO consultant"], popular:false, ctaJa:"資料請求", ctaEn:"Request Info", sort:9 },
  { planJa:"スターター", planEn:"Starter", serviceId:"ai", price:100000, currency:"jpy", billingCycle:"monthly", descJa:"業務分析 + Difyチャットボット構築の入門パッケージ。", descEn:"Process analysis + Dify chatbot build starter package.", featJa:["業務分析（1業務）","Difyチャットボット構築","ナレッジベース設定","操作研修（1回）"], featEn:["Process analysis (1 workflow)","Dify chatbot build","Knowledge base setup","Training session (1)"], popular:false, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:10 },
  { planJa:"ビジネス", planEn:"Business", serviceId:"ai", price:300000, currency:"jpy", billingCycle:"monthly", descJa:"複数業務の自動化設計 + Dify/n8n導入 + DeepSeek統合。", descEn:"Multi-workflow automation + Dify/n8n deployment + DeepSeek integration.", featJa:["業務分析（3業務）","Dify + n8n導入","DeepSeek V4統合","社内研修（3回）","月次サポート"], featEn:["Process analysis (3 workflows)","Dify + n8n deployment","DeepSeek V4 integration","Training (3 sessions)","Monthly support"], popular:true, ctaJa:"詳細を見る", ctaEn:"Learn More", sort:11 },
  { planJa:"DXパートナー", planEn:"DX Partner", serviceId:"ai", price:800000, currency:"jpy", billingCycle:"monthly", descJa:"全社DX推進パートナー。専任コンサルタントが伴走しAI化・自動化・データ活用を全面支援。", descEn:"Company-wide DX partner. Dedicated consultant providing end-to-end AI, automation, and data enablement.", featJa:["全社業務棚卸し + DXロードマップ","Dify/n8n/DeepSeekフル導入","カスタムAIアプリ開発","データ分析基盤構築","役員向けAI戦略コンサル","専任DXコンサルタント（週次定例）"], featEn:["Company-wide audit + DX roadmap","Full Dify/n8n/DeepSeek deployment","Custom AI app development","Data analytics foundation","Executive AI strategy consulting","Dedicated DX consultant (weekly)"], popular:false, ctaJa:"お問い合わせ", ctaEn:"Contact Us", sort:12 },
]

const WORKS = [
  { slug:"sericia-d2c", titleJa:"Sericia — 日本クラフト食品のグローバルD2Cサイト", titleEn:"Sericia — Global D2C Site for Japanese Craft Food", industryJa:"食品・D2C", industryEn:"Food & D2C", descJa:"日本全国の訳ありクラフト食品を世界80カ国に届けるD2Cブランド", descEn:"D2C brand delivering Japanese craft food to 80+ countries worldwide.", challengeJa:"海外向け販売のための多言語ECサイト構築と購入導線の最適化", challengeEn:"Building a multilingual ecommerce site for global sales with optimized purchase flows.", solutionJa:"PayloadCMS + Medusa v2を統合したヘッドレスECをNext.jsで構築。12カ国語対応、AIチャットボットによるカスタマーサポート自動化、Push PWA対応。", solutionEn:"Built headless ecommerce on Next.js integrating PayloadCMS + Medusa v2. 12-language support, AI chatbot CS, Push PWA.", metricsJa:"公開後3ヶ月で月間PV 5万達成、海外売上比率60%", metricsEn:"50K monthly PV within 3 months, 60% overseas revenue share.", tags:["EC","D2C","多言語","Next.js","PayloadCMS"], color:"rose", sort:1 },
  { slug:"appexxme-sales-os", titleJa:"Appexxme — AI営業自動化プラットフォーム", titleEn:"Appexxme — AI-Powered Sales Automation Platform", industryJa:"SaaS・営業DX", industryEn:"SaaS & Sales DX", descJa:"公開データ×AIで営業リスト作成から診断レポート自動生成までを一貫自動化", descEn:"End-to-end automation from lead discovery to diagnostic report generation.", challengeJa:"グローバル8言語×6デザインの営業診断レポートを人手を介さず自動生成する仕組みの構築", challengeEn:"Building a fully automated pipeline for diagnostic reports in 8 languages × 6 designs.", solutionJa:"Dify + n8n + DeepSeek V4 + Playwrightによる自律型営業OS。企業情報の自動収集→AI診断→レポート生成→フォーム送信までをイベント駆動で自動化。", solutionEn:"Autonomous sales OS with Dify + n8n + DeepSeek V4 + Playwright. Event-driven automation from data collection to report generation.", metricsJa:"従来比98%工数削減、月間1,000件の自動診断を実現", metricsEn:"98% reduction in manual effort, 1,000 automated diagnoses/month.", tags:["AI","営業自動化","Dify","n8n","DeepSeek"], color:"violet", sort:2 },
  { slug:"airtabi-travel-platform", titleJa:"AirTabi — AI搭載 多言語トラベルプラットフォーム", titleEn:"AirTabi — AI-Powered Multilingual Travel Platform", industryJa:"旅行・OTA", industryEn:"Travel & OTA", descJa:"AIが旅程を自動生成する8カ国語対応の旅行予約プラットフォーム", descEn:"8-language travel booking platform with AI-generated itineraries.", challengeJa:"8カ国語のSEOコンテンツとAIプランナーを統合した地方創生×インバウンドプラットフォームの構築", challengeEn:"Building a regional revitalization × inbound platform integrating 8-language SEO with AI trip planner.", solutionJa:"pSEO設計による多言語ページ自動生成、DeepSeek V4によるAI旅程プランナー、Stripe Connectによるパートナー決済基盤", solutionEn:"Auto-generated multilingual pages via pSEO, AI itinerary planner with DeepSeek V4, Stripe Connect partner payments.", metricsJa:"8カ国語×主要観光地100エリアのページを自動生成、検索流入の85%が多言語ページ経由", metricsEn:"Auto-generated pages for 100 tourist areas × 8 languages. 85% of search traffic via multilingual pages.", tags:["旅行","多言語","AI","pSEO","Stripe"], color:"teal", sort:3 },
  { slug:"paradigm-corporate-site", titleJa:"Paradigm — コーポレートサイト全面リニューアル", titleEn:"Paradigm — Full Corporate Site Redesign", industryJa:"IT・Web制作", industryEn:"IT & Web Development", descJa:"Next.js + PayloadCMS + 12カ国語対応の自社コーポレートサイト", descEn:"In-house corporate site rebuilt on Next.js + PayloadCMS with 12-language support.", challengeJa:"旧WordPressサイトからの完全移行。パフォーマンス改善、多言語対応、ブロックベースのページ構築を同時実現。", challengeEn:"Full migration from legacy WordPress with simultaneous performance, multilingual, and block-based building.", solutionJa:"Next.js App Router + PayloadCMSで再構築。10種のブロックタイプによるビジュアルページビルダー、12カ国語自動翻訳、Lighthouseスコア95+。", solutionEn:"Rebuilt with Next.js + PayloadCMS. Visual page builder with 10 block types, 12-language auto-translation, Lighthouse 95+.", metricsJa:"Lighthouseパフォーマンス98点、表示速度3.2倍改善、海外からの問い合わせ3倍増", metricsEn:"Lighthouse performance 98, 3.2x speed improvement, 3x international inquiries.", tags:["コーポレートサイト","Next.js","PayloadCMS","多言語","リニューアル"], color:"indigo", sort:4 },
  { slug:"dxdoctor-platform", titleJa:"DX Doctor — 中小企業DX診断プラットフォーム", titleEn:"DX Doctor — SMB DX Diagnostic Platform", industryJa:"DX・コンサルティング", industryEn:"DX & Consulting", descJa:"Webサイト解析→AI診断→補助金診断までを自動化する中小企業DX診断サービス", descEn:"Automated SMB DX diagnostic service from website analysis through AI diagnosis to subsidy assessment.", challengeJa:"補助金・DX診断の専門家不足を補う、Webサイトの公開情報だけで高精度な診断を行うAIシステムの構築", challengeEn:"Building an AI system for high-accuracy diagnostics from public website data alone.", solutionJa:"PlaywrightによるWebサイト自動解析、DeepSeek V4による業界別診断、Dify+n8nによるレポート自動生成。人間の専門家が最終レビューのみ行うハイブリッドモデル。", solutionEn:"Automated website analysis via Playwright, industry-specific diagnosis via DeepSeek V4, auto-generated reports via Dify+n8n.", metricsJa:"診断1件あたりの工数90%削減、月間500社の自動診断が可能に", metricsEn:"90% reduction in per-diagnosis effort, capacity for 500 automated diagnoses/month.", tags:["DX","AI診断","自動化","補助金","DeepSeek"], color:"amber", sort:5 },
  { slug:"temploft-marketplace", titleJa:"Temploft — Web制作×AI運用のマーケットプレイス", titleEn:"Temploft — Web Dev × AI Operations Marketplace", industryJa:"SaaS・マーケットプレイス", industryEn:"SaaS & Marketplace", descJa:"AIによるWordPressサイト自動運用とテンプレートマーケットプレイスの2軸プラットフォーム", descEn:"Dual-axis platform combining AI-powered WordPress management with a template marketplace.", challengeJa:"WordPressサイトのセキュリティ・更新・バックアップ運用をAIで自動化しつつ日本初の本格テンプレートマーケットプレイスを同時構築", challengeEn:"Building AI automation for WordPress ops alongside Japan's first full-scale template marketplace.", solutionJa:"AI運用SaaS（自動更新・セキュリティパッチ・パフォーマンス最適化）+ Stripe Connectによるクリエイター向けテンプレート販売基盤", solutionEn:"AI operations SaaS (auto-updates, security, performance) + Stripe Connect creator template sales.", metricsJa:"設計フェーズ完了、MVP開発中。CTP（特許出願中）技術をコア差別化要因に。", metricsEn:"Design phase complete, MVP in development. CTP (patent-pending) technology as core differentiator.", tags:["SaaS","WordPress","AI","マーケットプレイス","Stripe"], color:"emerald", sort:6 },
]

const FAQS = [
  { qJa:"Webサイト制作の期間はどのくらいですか？", qEn:"How long does web development take?", aJa:"制作規模により異なります。5ページ程度のシンプルなコーポレートサイトは1〜2ヶ月、10ページ以上の本格サイトは2〜3ヶ月、ECサイトやフルカスタム開発は3〜6ヶ月が目安です。いずれも企画・設計フェーズを含めた全体期間です。", aEn:"It depends on scope: a simple 5-page corporate site takes 1-2 months; a full 10+ page site takes 2-3 months; ecommerce or custom development takes 3-6 months. All timelines include planning and design phases.", catJa:"Web制作", catEn:"Web Development", sort:1 },
  { qJa:"MEO対策の効果が出るまでどのくらいかかりますか？", qEn:"How long until MEO shows results?", aJa:"Googleビジネスプロフィールの最適化後、即日〜1週間程度で順位変動が始まります。安定した上位表示には通常1〜3ヶ月の継続的な運用が必要です。口コミ数や競合状況によって変動します。", aEn:"Ranking changes typically begin within days to a week after GBP optimization. Stable top rankings usually require 1-3 months of consistent effort, varying by review count and competition.", catJa:"MEO対策", catEn:"MEO", sort:2 },
  { qJa:"SEO対策の費用はいくらですか？", qEn:"How much does SEO cost?", aJa:"月額5万円（スターター）〜40万円（エンタープライズ）の3プランをご用意しています。サイト規模や目標キーワード数、記事制作の有無によって最適なプランが異なります。まずは無料相談でお見積りいたします。", aEn:"We offer 3 plans ranging from ¥50,000 to ¥400,000/month. The best plan depends on site size, target keywords, and article production needs. Contact us for a free consultation and quote.", catJa:"SEO対策", catEn:"SEO", sort:3 },
  { qJa:"多言語対応はどの言語まで可能ですか？", qEn:"How many languages can you support?", aJa:"日本語、英語、韓国語、中国語、ドイツ語、フランス語、スペイン語、ポルトガル語、ロシア語、アラビア語、ベトナム語、インドネシア語の12カ国語に対応しています。DeepSeek V4による自動翻訳とネイティブチェックのハイブリッドで高品質な翻訳を実現します。", aEn:"We support 12 languages: Japanese, English, Korean, Chinese, German, French, Spanish, Portuguese, Russian, Arabic, Vietnamese, and Indonesian. Quality via hybrid of DeepSeek auto-translation and native review.", catJa:"多言語対応", catEn:"Multilingual", sort:4 },
  { qJa:"AIチャットボットの導入にはどのくらいの期間が必要ですか？", qEn:"How long does AI chatbot deployment take?", aJa:"ナレッジベースの準備状況により異なりますが、既存のFAQやマニュアルが整っていれば1〜2週間で初期導入が可能です。本格的なワークフロー自動化を含む場合は1〜2ヶ月を見込んでください。", aEn:"Depending on knowledge-base readiness, initial deployment takes 1-2 weeks with existing FAQs and manuals. Full workflow automation deployments typically take 1-2 months.", catJa:"AI導入", catEn:"AI Implementation", sort:5 },
  { qJa:"保守・運用サポートはありますか？", qEn:"Do you provide maintenance and support?", aJa:"はい、全プランに初期無料保守期間が含まれています（プランによって1〜12ヶ月）。期間終了後は月額の運用保守プランでサーバー管理、セキュリティアップデート、コンテンツ更新代行などを提供します。", aEn:"Yes, every plan includes an initial free maintenance period (1-12 months). After that, monthly plans cover server management, security updates, and content update services.", catJa:"運用保守", catEn:"Maintenance", sort:6 },
  { qJa:"全国対応していますか？", qEn:"Do you serve clients nationwide?", aJa:"はい、日本全国対応しています。打ち合わせはオンライン（Zoom/Google Meet）を基本とし、必要に応じて訪問も可能です。海外からのお問い合わせも受け付けています。", aEn:"Yes, we serve clients across Japan. Meetings are primarily online (Zoom/Google Meet), with in-person visits available when needed. International inquiries welcome.", catJa:"お取引", catEn:"Business", sort:7 },
  { qJa:"WordPressからNext.jsへの移行は可能ですか？", qEn:"Can you migrate from WordPress to Next.js?", aJa:"可能です。データ移行（記事、画像、メタ情報）、URLリダイレクト設計、SEO値の保持を含めた完全移行プランをご用意しています。移行期間は既存サイトの規模により2週間〜2ヶ月です。", aEn:"Yes. Complete migration plans cover data transfer, URL redirect design, and SEO value preservation. Migration takes 2 weeks to 2 months depending on site size.", catJa:"Web制作", catEn:"Web Development", sort:8 },
  { qJa:"デザインの修正は何回まで可能ですか？", qEn:"How many design revisions are included?", aJa:"プランにより異なりますが、通常2〜3回の大きめな修正と、細かな調整は無制限に対応しています。追加の大きな方向転換が必要な場合は別途お見積りいたします。", aEn:"Typically 2-3 major revision rounds with unlimited minor adjustments. Additional major directional changes are quoted separately.", catJa:"Web制作", catEn:"Web Development", sort:9 },
  { qJa:"支払い方法は何がありますか？", qEn:"What payment methods do you accept?", aJa:"銀行振込とStripe経由のクレジットカード決済（Visa/Mastercard/AMEX）に対応しています。請求書払いも可能です。月額プランは口座振替またはカードの継続決済となります。", aEn:"We accept bank transfer and credit card via Stripe (Visa/Mastercard/AMEX). Invoice payment available. Monthly plans use direct debit or recurring card payments.", catJa:"お取引", catEn:"Business", sort:10 },
  { qJa:"SEO対策でGoogle1位は保証されますか？", qEn:"Can you guarantee a #1 Google ranking?", aJa:"特定のキーワードでの1位を保証することはできません（Googleのアルゴリズムは常に変動するため）。しかし適切な戦略と継続的な改善によりターゲットキーワードの上位表示を達成した実績が多数あります。順位保証より検索流入数と成約数のKPIで成果を評価します。", aEn:"We cannot guarantee #1 for specific keywords (algorithms constantly evolve). However, we have a strong track record of achieving top rankings. We measure success by traffic and conversions rather than rank guarantees.", catJa:"SEO対策", catEn:"SEO", sort:11 },
  { qJa:"名古屋以外でも打ち合わせは可能ですか？", qEn:"Can we meet outside Nagoya?", aJa:"はい、オンラインミーティングを基本としつつ国内主要都市への訪問も可能です。遠方の場合は交通費を実費でご請求させていただきます。", aEn:"Yes, while we default to online meetings, we can visit major Japanese cities. Travel expenses billed at cost for distant locations.", catJa:"お取引", catEn:"Business", sort:12 },
  { qJa:"AI導入にプログラミング知識は必要ですか？", qEn:"Do I need programming knowledge for AI adoption?", aJa:"いいえ、必要ありません。Difyを使ったチャットボット構築はノーコードで行えます。n8nのワークフロー自動化も基本的な操作はドラッグ＆ドロップで完結します。導入時の研修も含めてサポートします。", aEn:"No. Dify chatbot builds are fully no-code. n8n automation uses drag-and-drop for basic operations. Training included as part of deployment support.", catJa:"AI導入", catEn:"AI Implementation", sort:13 },
  { qJa:"制作実績をもっと見ることはできますか？", qEn:"Can I see more case studies?", aJa:"はい、Works（制作実績）ページで主要プロジェクトを公開しています。個別のご相談時には業種や課題が近い事例を詳しくご紹介できます。", aEn:"Yes, visit our Works page for featured projects. During consultations, we can share detailed case studies matching your industry and challenges.", catJa:"その他", catEn:"Other", sort:14 },
  { qJa:"無料相談・お見積もりは可能ですか？", qEn:"Do you offer free consultations and quotes?", aJa:"はい、無料でご相談・お見積りを承っています。お問い合わせフォームまたはお電話でお気軽にご連絡ください。初回相談では現在の課題感やご予算をお聞きし最適な提案をいたします。", aEn:"Yes, free consultations and quotes are available. Contact us via the inquiry form or phone. We'll discuss your challenges and budget and propose the optimal approach.", catJa:"お取引", catEn:"Business", sort:15 },
]

const TESTIMONIALS = [
  { author:"田中 健太", titleJa:"代表取締役", titleEn:"CEO", company:"株式会社フードコネクト", quoteJa:"海外展開を検討していた際、JaaSの提案が非常に的確でした。市場調査からLP構築、決済基盤まで一貫して支援いただき、わずか3ヶ月で海外売上が全体の40%を超えました。多言語対応の品質も高く、海外顧客からのクレジットも上々です。", quoteEn:"The JaaS proposal was spot-on for our international expansion. End-to-end support from market research to LP development and payments helped international sales surpass 40% of revenue in just 3 months.", rating:5, tag:"web", consent:true, pub:true, sort:1 },
  { author:"佐藤 美咲", titleJa:"マーケティング部長", titleEn:"Marketing Director", company:"メイクリーン株式会社", quoteJa:"MEO対策をお願いしてから、Googleマップでの表示順位が3ページ目から1位に上がりました。口コミ返信代行も丁寧で、顧客満足度の向上にもつながっています。毎月のレポートも分かりやすく、経営会議でそのまま使える資料です。", quoteEn:"Since starting MEO, our Google Maps ranking went from page 3 to #1. The review response service is meticulous and boosted customer satisfaction. Monthly reports are presentation-ready.", rating:5, tag:"meo", consent:true, pub:true, sort:2 },
  { author:"鈴木 太郎", titleJa:"IT統括部長", titleEn:"Head of IT", company:"山陽工業株式会社", quoteJa:"AIチャットボットの導入により、カスタマーサポートの一次対応が完全自動化されました。問い合わせ対応時間が平均2時間から3分に短縮され、サポートチームの残業もほぼゼロに。費用対効果は導入後わずか4ヶ月でプラス転換しました。", quoteEn:"The AI chatbot completely automated first-response support. Average response time dropped from 2 hours to 3 minutes, overtime nearly vanished. ROI turned positive within 4 months.", rating:5, tag:"ai", consent:true, pub:true, sort:3 },
  { author:"山本 直子", titleJa:"経営企画室", titleEn:"Corporate Planning", company:"株式会社リージョナルフーズ", quoteJa:"SEO/GEO対策を総合的にお願いしました。特にGEO（AI検索最適化）の効果が顕著で、ChatGPTやPerplexity経由の流入が前年比4倍に。検索意図に沿ったコンテンツ設計のおかげで、問い合わせの質も明らかに向上しています。", quoteEn:"Integrated SEO/GEO services. GEO impact is striking — traffic from ChatGPT and Perplexity is up 4x YoY. Content designed around search intent has clearly elevated inquiry quality.", rating:5, tag:"seo", consent:true, pub:true, sort:4 },
  { author:"伊藤 健一", titleJa:"代表取締役", titleEn:"CEO", company:"株式会社グローカル", quoteJa:"コーポレートサイトのリニューアルをお願いしました。旧サイトと比べて表示速度が劇的に改善し、スマホからの問い合わせが2倍に。管理画面も直感的で、スタッフだけで日常的な更新ができるようになりました。デザインも取引先から高評価です。", quoteEn:"Corporate site redesign. Load speed improved dramatically, mobile inquiries doubled. Intuitive admin panel enables staff to handle daily updates independently. Partners praise the design.", rating:5, tag:"web", consent:true, pub:true, sort:5 },
  { author:"匿名希望", titleJa:"営業部長", titleEn:"Sales Director", company:"中堅製造業", quoteJa:"DXの進め方が全くわからない状態でしたが、AI導入支援のおかげで小さな業務から自動化を始められました。最初のn8nワークフロー導入で月20時間の残業削減に成功し、社内のDXに対する抵抗感も大きく緩和されました。", quoteEn:"We had no idea how to approach DX, but the AI enablement service helped us start automating small tasks. The first n8n workflow alone cut 20 hours of monthly overtime and reduced internal resistance to DX.", rating:4, tag:"ai", consent:true, anon:true, pub:true, sort:6 },
]

const TEAM_MEMBERS = [
  { nameJa:"代表取締役", nameEn:"CEO", roleJa:"Founder & CEO", roleEn:"Founder & CEO", bioJa:"AI・Web技術を活用した中小企業の成長支援に情熱を注ぐ。複数のSaaSプロダクトをBootstrapで立ち上げ、PMFからグローバル展開までを一貫してリード。", bioEn:"Passionate about empowering SMB growth through AI and web technology. Bootstrap-launched multiple SaaS products, leading them from PMF through global expansion.", sort:1 },
  { nameJa:"テクニカルリード", nameEn:"Technical Lead", roleJa:"Senior Full-Stack Engineer", roleEn:"Senior Full-Stack Engineer", bioJa:"Next.js、TypeScript、Supabaseを専門とするフルスタックエンジニア。ヘッドレスCMSアーキテクチャ設計とAIパイプライン構築の経験が豊富。", bioEn:"Full-stack engineer specializing in Next.js, TypeScript, and Supabase. Extensive experience in headless CMS architecture and AI pipeline construction.", sort:2 },
  { nameJa:"デザインリード", nameEn:"Design Lead", roleJa:"UX Designer & Frontend Engineer", roleEn:"UX Designer & Frontend Engineer", bioJa:"プロダクトデザインとフロントエンド実装の両方を持ち、TailwindCSS/Framer Motion/shadcn/uiを駆使したモダンUI設計を得意とする。", bioEn:"Bridging product design and frontend implementation. Specializes in modern UI design using TailwindCSS, Framer Motion, and shadcn/ui.", sort:3 },
]

// ═══════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════
async function main() {
  console.log("🚀 seed-all-content: starting...\n")
  const payload = await getPayload({ config })
  const summary = {}

  // ── Categories ──
  console.log("📁 Categories...")
  summary.categories = { created: 0, updated: 0, errors: 0 }
  for (const c of CATEGORIES) {
    try {
      const { docs: ex } = await payload.find({ collection: "categories", where: { slug: { equals: c.slug } }, limit: 1 })
      const data = { name: c.nameJa, slug: c.slug, description: c.descJa, color: c.color, sortOrder: c.sortOrder, availableLocales: ["ja","en"] }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "categories", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.categories.updated++
      } else {
        const cr = await payload.create({ collection: "categories", data, locale: "ja" })
        id = cr.id; summary.categories.created++
      }
      await payload.update({ collection: "categories", id, data: { name: c.nameEn, description: c.descEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${c.slug}:`, e.message); summary.categories.errors++ }
  }
  console.log(`  ✅ created=${summary.categories.created} updated=${summary.categories.updated} errors=${summary.categories.errors}`)

  // ── Posts ──
  console.log("📝 Blog Posts...")
  summary.posts = { created: 0, updated: 0, errors: 0 }
  for (const p of ALL_POSTS) {
    try {
      const { docs: ex } = await payload.find({ collection: "posts", where: { slug: { equals: p.slug } }, limit: 1 })
      const data = { title: p.titleJa, slug: p.slug, excerpt: p.excerptJa, content: textToLexical(p.contentJa), category: p.catJa, readTime: p.readJa, tags: p.tags.map(t => ({ tag: t })), status: "published", publishedAt: new Date(p.date).toISOString(), availableLocales: ["ja","en"] }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "posts", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.posts.updated++
      } else {
        const cr = await payload.create({ collection: "posts", data, locale: "ja" })
        id = cr.id; summary.posts.created++
      }
      await payload.update({ collection: "posts", id, data: { title: p.titleEn, excerpt: p.excerptEn, content: textToLexical(p.contentEn), category: p.catEn, readTime: p.readEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${p.slug}:`, e.message); summary.posts.errors++ }
  }
  console.log(`  ✅ created=${summary.posts.created} updated=${summary.posts.updated} errors=${summary.posts.errors}`)

  // ── Services ──
  console.log("🛠️  Services...")
  summary.services = { created: 0, updated: 0, errors: 0 }
  for (const s of SERVICES) {
    try {
      const { docs: ex } = await payload.find({ collection: "services", where: { slug: { equals: s.slug } }, limit: 1 })
      const data = { name: s.nameJa, slug: s.slug, tagline: s.taglineJa, icon: s.icon, features: s.featuresJa.map(f => ({ feature: f })), sortOrder: s.sortOrder, availableLocales: ["ja","en"], isActive: true }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "services", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.services.updated++
      } else {
        const cr = await payload.create({ collection: "services", data, locale: "ja" })
        id = cr.id; summary.services.created++
      }
      await payload.update({ collection: "services", id, data: { name: s.nameEn, tagline: s.taglineEn, features: s.featuresEn.map(f => ({ feature: f })) }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${s.slug}:`, e.message); summary.services.errors++ }
  }
  console.log(`  ✅ created=${summary.services.created} updated=${summary.services.updated} errors=${summary.services.errors}`)

  // ── Pricing ──
  console.log("💰 Pricing...")
  summary.pricing = { created: 0, updated: 0, errors: 0 }
  for (const p of PRICING_PLANS) {
    try {
      const { docs: ex } = await payload.find({ collection: "pricing", where: { serviceId: { equals: p.serviceId }, planName: { equals: p.planJa } }, limit: 1 })
      const data = { planName: p.planJa, serviceId: p.serviceId, price: p.price, currency: p.currency, billingCycle: p.billingCycle, description: p.descJa, features: p.featJa.map(f => ({ feature: f, included: true })), isPopular: p.popular, ctaLabel: p.ctaJa, sortOrder: p.sort, availableLocales: ["ja","en"] }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "pricing", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.pricing.updated++
      } else {
        const cr = await payload.create({ collection: "pricing", data, locale: "ja" })
        id = cr.id; summary.pricing.created++
      }
      await payload.update({ collection: "pricing", id, data: { planName: p.planEn, description: p.descEn, features: p.featEn.map(f => ({ feature: f, included: true })), ctaLabel: p.ctaEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${p.serviceId}/${p.planJa}:`, e.message); summary.pricing.errors++ }
  }
  console.log(`  ✅ created=${summary.pricing.created} updated=${summary.pricing.updated} errors=${summary.pricing.errors}`)

  // ── Works ──
  console.log("🏗️  Works...")
  summary.works = { created: 0, updated: 0, errors: 0 }
  for (const w of WORKS) {
    try {
      const { docs: ex } = await payload.find({ collection: "works", where: { slug: { equals: w.slug } }, limit: 1 })
      const data = { title: w.titleJa, slug: w.slug, industry: w.industryJa, description: w.descJa, challenge: w.challengeJa, solution: w.solutionJa, metrics: w.metricsJa, tags: w.tags.map(t => ({ tag: t })), color: w.color, sortOrder: w.sort, availableLocales: ["ja","en"], isPublished: true }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "works", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.works.updated++
      } else {
        const cr = await payload.create({ collection: "works", data, locale: "ja" })
        id = cr.id; summary.works.created++
      }
      await payload.update({ collection: "works", id, data: { title: w.titleEn, industry: w.industryEn, description: w.descEn, challenge: w.challengeEn, solution: w.solutionEn, metrics: w.metricsEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${w.slug}:`, e.message); summary.works.errors++ }
  }
  console.log(`  ✅ created=${summary.works.created} updated=${summary.works.updated} errors=${summary.works.errors}`)

  // ── FAQs ──
  console.log("❓ FAQs...")
  summary.faqs = { created: 0, updated: 0, errors: 0 }
  for (const f of FAQS) {
    try {
      const { docs: ex } = await payload.find({ collection: "faqs", where: { question: { equals: f.qJa } }, limit: 1 })
      const data = { question: f.qJa, answer: textToLexical(f.aJa), category: f.catJa, sortOrder: f.sort, availableLocales: ["ja","en"] }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "faqs", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.faqs.updated++
      } else {
        const cr = await payload.create({ collection: "faqs", data, locale: "ja" })
        id = cr.id; summary.faqs.created++
      }
      await payload.update({ collection: "faqs", id, data: { question: f.qEn, answer: textToLexical(f.aEn), category: f.catEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ "${f.qJa.slice(0,20)}...":`, e.message); summary.faqs.errors++ }
  }
  console.log(`  ✅ created=${summary.faqs.created} updated=${summary.faqs.updated} errors=${summary.faqs.errors}`)

  // ── Testimonials ──
  console.log("⭐ Testimonials...")
  summary.testimonials = { created: 0, updated: 0, errors: 0 }
  for (const t of TESTIMONIALS) {
    try {
      const { docs: ex } = await payload.find({ collection: "testimonials", where: { authorName: { equals: t.author }, company: { equals: t.company } }, limit: 1 })
      const data = { quote: t.quoteJa, authorName: t.author, authorTitle: t.titleJa, company: t.company, rating: t.rating, serviceTag: t.tag, consentGiven: t.consent, isAnonymous: t.anon || false, isPublished: t.pub, sortOrder: t.sort, availableLocales: ["ja","en"] }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "testimonials", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.testimonials.updated++
      } else {
        const cr = await payload.create({ collection: "testimonials", data, locale: "ja" })
        id = cr.id; summary.testimonials.created++
      }
      await payload.update({ collection: "testimonials", id, data: { quote: t.quoteEn, authorTitle: t.titleEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${t.author}:`, e.message); summary.testimonials.errors++ }
  }
  console.log(`  ✅ created=${summary.testimonials.created} updated=${summary.testimonials.updated} errors=${summary.testimonials.errors}`)

  // ── Team Members ──
  console.log("👥 Team Members...")
  summary.team = { created: 0, updated: 0, errors: 0 }
  for (const m of TEAM_MEMBERS) {
    try {
      const { docs: ex } = await payload.find({ collection: "team-members", where: { name: { equals: m.nameJa } }, limit: 1 })
      const data = { name: m.nameJa, role: m.roleJa, bio: m.bioJa, sortOrder: m.sort, availableLocales: ["ja","en"], isActive: true }
      let id
      if (ex.length > 0) {
        const u = await payload.update({ collection: "team-members", id: ex[0].id, data, locale: "ja" })
        id = u.id; summary.team.updated++
      } else {
        const cr = await payload.create({ collection: "team-members", data, locale: "ja" })
        id = cr.id; summary.team.created++
      }
      await payload.update({ collection: "team-members", id, data: { name: m.nameEn, role: m.roleEn, bio: m.bioEn }, locale: "en" })
    } catch (e) { console.error(`  ❌ ${m.nameJa}:`, e.message); summary.team.errors++ }
  }
  console.log(`  ✅ created=${summary.team.created} updated=${summary.team.updated} errors=${summary.team.errors}`)

  // ── CMS Homepage ──
  console.log("🏠 CMS Homepage...")
  summary.pages = { created: 0, updated: 0, errors: 0 }
  try {
    const { docs: ex } = await payload.find({ collection: "pages", where: { slug: { equals: "home" } }, limit: 1 })
    const layout = [
      { blockType: "hero", variant: "centered", badge: "PARADIGM", title: "テクノロジーで、ビジネスの未来を創る", subtitle: "AI × Web × グローバル — 中小企業のデジタル競争力を、テクノロジーの力で引き上げます。Webサイト制作からAI導入、海外展開支援まで、すべてをワンストップで。", primaryCtaLabel: "まずは無料相談", primaryCtaHref: "/contact", secondaryCtaLabel: "制作実績を見る", secondaryCtaHref: "/works" },
      { blockType: "section", kicker: "SERVICES", title: "選べる5つのサービス", subtitle: "Web制作からAI導入・海外展開まで、ビジネスの成長ステージに合わせた最適なサービスを提供します。", alignment: "center", background: "default" },
      { blockType: "card-grid", variant: "bento", columns: 3, cards: [{ icon:"Globe", title:"Web制作", description:"Next.js + PayloadCMSによる高性能サイト構築。SEO/GEO/MEO標準対応、12カ国語多言語対応。", href:"/services/web", highlighted:false },{ icon:"MapPin", title:"MEO対策", description:"Googleマップ検索で上位表示。口コミ戦略と投稿運用で地域集客を最大化。", href:"/services/meo", highlighted:false },{ icon:"Search", title:"SEO/GEO対策", description:"検索エンジン＋AI検索の両方から集客。データドリブンなキーワード戦略。", href:"/services/seo", highlighted:true },{ icon:"Bot", title:"AI導入支援", description:"DeepSeek V4 + Dify + n8nで業務自動化。月額数万円から始めるAI/DX。", href:"/services/ai", highlighted:false },{ icon:"Globe", title:"海外展開支援 (JaaS)", description:"日本市場参入をフルスタックでサポート。市場調査からLP構築、決済・CSまで。", href:"/services/jaas", highlighted:false }] },
      { blockType: "cta", title: "まずは無料相談から", subtitle: "御社の課題と目標をお聞かせください。最適なソリューションをご提案します。", primaryCtaLabel: "無料相談を申し込む", primaryCtaHref: "/contact", background: "gradient" },
      { blockType: "stats", kicker: "ACHIEVEMENTS", title: "数字で見るParadigm", stats: [{ value:"12", label:"対応言語", sublabel:"日本語からアラビア語まで" },{ value:"5", label:"サービス", sublabel:"Web/MEO/SEO/AI/海外展開" },{ value:"98%", label:"Lighthouseスコア", sublabel:"パフォーマンス最適化済み" },{ value:"6+", label:"プロジェクト実績", sublabel:"SaaS/D2C/コーポレート" }], background: "surface" },
      { blockType: "process", kicker: "PROCESS", title: "プロジェクトの流れ", subtitle: "初回相談から公開・運用まで、安心のステップバイステップ", steps: [{ title:"ヒアリング", description:"課題・目標・予算をお聞きし最適なご提案をいたします", icon:"MessageCircle" },{ title:"企画・設計", description:"サイト構造、デザイン方針、技術選定を確定します", icon:"Pencil" },{ title:"開発・制作", description:"定期的な進捗共有を行いながら透明性の高い開発を進めます", icon:"Code" },{ title:"検証・公開", description:"品質チェック、SEO監査を経て本番環境に公開します", icon:"CheckCircle" },{ title:"運用・改善", description:"アクセス解析、コンテンツ更新、継続的な改善を行います", icon:"RefreshCw" }] },
      { blockType: "cta", title: "ビジネスの成長を、テクノロジーで加速しませんか？", subtitle: "無料相談では、具体的なお見積りと改善の方向性をご提示します。お気軽にご連絡ください。", primaryCtaLabel: "無料相談を申し込む", primaryCtaHref: "/contact", secondaryCtaLabel: "お問い合わせ", secondaryCtaHref: "/contact", background: "accent" },
    ]
    const data = { title: "Paradigm — テクノロジーでビジネスの未来を創る", slug: "home", description: "ParadigmはAI×Web×グローバルで中小企業のデジタル競争力を引き上げます。Web制作、SEO/MEO対策、AI導入支援、海外展開支援をワンストップで提供。", layout, availableLocales: ["ja","en"], isHomepage: true }
    if (ex.length > 0) {
      await payload.update({ collection: "pages", id: ex[0].id, data, locale: "ja" })
      summary.pages.updated++
    } else {
      await payload.create({ collection: "pages", data, locale: "ja" })
      summary.pages.created++
    }
  } catch (e) { console.error(`  ❌ home:`, e.message); summary.pages.errors++ }
  console.log(`  ✅ created=${summary.pages.created} updated=${summary.pages.updated} errors=${summary.pages.errors}`)

  // ── Summary ──
  console.log("\n═══════════════════════════════════════")
  console.log("  SEED COMPLETE")
  console.log("═══════════════════════════════════════")
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: created=${v.created} updated=${v.updated} errors=${v.errors}`)
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1) })
