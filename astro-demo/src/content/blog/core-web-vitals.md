---
draft: false
title: "Core Web Vitals完全解説 — PageSpeedがビジネスに与える影響"
snippet: "Core Web Vitalsの3つの指標（LCP、INP、CLS）を徹底解説。PageSpeedスコアがコンバージョン率や売上に直結する理由と改善方法をまとめました。"
image:
  src: "https://images.unsplash.com/photo-1432888498265-8f2c3c5f6c4e?fit=crop&w=800&h=400"
  alt: "ウェブパフォーマンスのダッシュボード画面"
publishDate: "2025-06-10"
author: "Paradigm"
category: "SEO"
tags: ["Core Web Vitals", "PageSpeed", "LCP", "INP", "CLS", "パフォーマンス"]
---

## ページ速度がビジネスを左右する時代

「1秒遅くなるとコンバージョン率が7%下がる」——この数字はAmazonの調査による有名なデータですが、2025年現在、ページ速度の重要性はさらに高まっています。Googleは**Core Web Vitals**をランキングシグナルとして採用しており、遅いサイトは検索順位でも不利になります。

しかし、Core Web Vitalsの本当の重要性は検索順位だけではありません。**ユーザー体験**そのものを左右する要素であり、直帰率、滞在時間、コンバージョン率に直接影響を与えるのです。

## Core Web Vitalsの3つの指標

### 1. LCP（Largest Contentful Paint）— 読み込み速度

LCPは「メインコンテンツが表示されるまでの時間」を測定します。ビューポート内で最大の画像やテキストブロックがレンダリングされるまでの時間です。

- **良好**：2.5秒以下
- **要改善**：2.5〜4.0秒
- **不良**：4.0秒超

**改善のポイント：**
- 画像をWebPやAVIFなどの次世代フォーマットで配信する
- `<img>`タグに`loading="lazy"`を適切に設定する
- ファーストビューの画像には`fetchpriority="high"`を指定する
- サーバーのレスポンスタイム（TTFB）を800ms以下に抑える

```html
<!-- LCP最適化の例 -->
<img 
  src="hero-image.avif" 
  alt="メインビジュアル" 
  width="1200" 
  height="630"
  fetchpriority="high"
  decoding="async"
/>
```

### 2. INP（Interaction to Next Paint）— 応答性

2024年3月、FID（First Input Delay）に代わって**INP**が正式なCore Web Vitals指標となりました。INPはページ全体の操作応答性を評価する指標です。

- **良好**：200ms以下
- **要改善**：200〜500ms
- **不良**：500ms超

INPの改善は技術的に難しい領域ですが、以下の対策が効果的です：

- メインスレッドをブロックする長いJavaScriptタスクを分割する
- `setTimeout`や`requestAnimationFrame`で処理を適切にスケジューリングする
- サードパーティスクリプト（タグマネージャー、チャットボット等）の影響を監視する
- React等のフレームワークでは`useMemo`や`useCallback`で不要な再レンダリングを抑制する

```javascript
// 重い処理を分割する例
function processLargeArray(items) {
  const CHUNK_SIZE = 50;
  let index = 0;
  
  function processChunk() {
    const chunk = items.slice(index, index + CHUNK_SIZE);
    chunk.forEach(item => { /* 処理 */ });
    index += CHUNK_SIZE;
    if (index < items.length) {
      requestAnimationFrame(processChunk);
    }
  }
  
  requestAnimationFrame(processChunk);
}
```

### 3. CLS（Cumulative Layout Shift）— 視覚的安定性

CLSは「ページ読み込み中のレイアウトのずれ」を測定します。画像が後から読み込まれてテキストが動いたり、広告が突然表示されてボタンを押し間違えたりする——そんな体験は誰しも経験があるはずです。

- **良好**：0.1以下
- **要改善**：0.1〜0.25
- **不良**：0.25超

**改善のポイント：**
- 画像には必ず`width`と`height`属性を指定する
- 広告や埋め込み要素にプレースホルダー領域を確保する
- Webフォントに`font-display: swap`を設定する
- 動的に挿入されるコンテンツは既存コンテンツの下に追加する

```css
/* レイアウトシフトを防ぐCSS */
img {
  aspect-ratio: attr(width) / attr(height);
  width: 100%;
  height: auto;
}

@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
}
```

## 測定ツールの使い分け

Core Web Vitalsの測定には、以下のツールを使い分けることが重要です：

| ツール | 種類 | 用途 |
|--------|------|------|
| **PageSpeed Insights** | ラボデータ | URL単位の詳細分析 |
| **Google Search Console** | フィールドデータ | サイト全体の傾向把握 |
| **Chrome UX Report（CrUX）** | フィールドデータ | 実際のユーザー体験データ |
| **Lighthouse** | ラボデータ | 開発時のパフォーマンス改善 |
| **Web Vitalsライブラリ** | RUM | 自社サイトのリアルユーザーデータ収集 |

## ビジネスインパクトの実例

あるECサイトでは、LCPを4.2秒から2.1秒に改善した結果、以下の成果が得られました：

- コンバージョン率が**15%向上**
- 直帰率が**13%低下**
- 平均セッション時間が**22%増加**
- モバイルでの売上が**27%増加**

これらの数字は単なる偶然ではありません。Googleの調査でも、LCPが良好なサイトは不良なサイトと比較してコンバージョン率が最大で**3倍**になるというデータがあります。

## 継続的なモニタリングの重要性

パフォーマンス改善は一度きりの作業ではありません。新機能の追加やコンテンツの更新によって常に変動します。以下のフローを習慣化しましょう：

1. **週次**：Google Search ConsoleでCore Web Vitalsレポートをチェック
2. **月次**：PageSpeed Insightsで主要ページをスポットチェック
3. **四半期ごと**：パフォーマンスバジェットを見直し、改善施策を計画
4. **リリース前**：必ずLighthouse監査を実行

Paradigmでは、Core Web Vitalsの改善を専門とするエンジニアが、貴社のサイトを徹底分析し、具体的な改善施策をご提案します。まずは無料のパフォーマンス簡易診断をお試しください。
