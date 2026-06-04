# 動画制作ガイド — Paradigm OSS 動画パイプライン

> 最終更新: 2026-06-03
> 対象: HyperFrames 解説系動画 / ComfyUI 素材生成 / OSS レンダラー / ショート動画

---

## 目次

1. [概要](#1-概要)
2. [方式A: HyperFrames（解説系動画）](#2-方式a-hyperframes解説系動画)
3. [ショート動画（TikTok / Reels / Shorts）](#3-ショート動画tiktok--reels--shorts)
4. [パイプライン自動化](#4-パイプライン自動化)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. 概要

Paradigm では以下の **OSS のみ** で動画を制作できます。

| 方式 | 用途 | 品質 | 所要時間 | コスト |
|------|------|------|---------|--------|
| **HyperFrames** | 解説・デモ・診断レポート動画 | プロ級（60fps H.264） | 1-5分（レンダリング） | 無料（自前GPU） |
| **ComfyUI + Vast.ai** | AI素材生成（背景・アバター・B-Roll） | プロ級（Flux/SDXL） | 30秒-3分/枚 | GPU従量課金 |
| **OSS レンダラー** | Remotion / FFCreator / Editly / MoviePy / OpenMontage | 高品質 | 1-10分 | 無料 |
| **ショート動画** | TikTok/Reels/Shorts 縦型 | 標準（30fps） | 1-3分 | 無料 |

---

## 2. 方式A: HyperFrames（解説系動画）

### 概要

HTML + GSAP アニメーションを MP4 にレンダリング。最も柔軟性が高く、完全なカスタマイズが可能。

### 前提条件

- HyperFrames CLI v0.6.69+（グローバルインストール済み）
- Chrome Headless Shell v131+（`~/.cache/hyperframes/chrome/`）
- FFmpeg 8.1.1+（システムインストール済み）

### クイックスタート

```bash
# 1. プロジェクトに移動
cd test-video

# 2. lint チェック
npx hyperframes lint

# 3. バリデーション
npx hyperframes validate

# 4. レンダリング（draft = 高速プレビュー）
npx hyperframes render --quality draft --fps 15

# 5. 標準品質
npx hyperframes render --quality standard --fps 30

# 6. 高品質納品用
npx hyperframes render --quality high --fps 60 --video-bitrate 20M
```

### スクリプト経由

```bash
# レンダリング
node scripts/render-video-hyperframes.mjs --profile standard

# R2 アップロード
node scripts/upload-video-to-r2.mjs test-video/renders/xxx.mp4 --public
```

### コンポジション構造

```
test-video/
├── index.html              # メインコンポジション（30秒プロモ）
├── compositions/
│   ├── short-portrait.html # 縦型ショート動画（16秒）
│   └── components/         # 共通コンポーネント
├── assets/                 # メディアファイル
├── hyperframes.json        # レンダリング設定
└── renders/                # MP4出力先
```

### 新規コンポジションの作成

```html
<div data-composition-id="my-video" data-start="0" data-duration="10" data-width="1920" data-height="1080">
  <!-- 各シーンは class="clip" 必須 -->
  <div id="scene-1" class="clip" data-start="0" data-duration="5" data-track-index="1">
    <h1>Hello World</h1>
  </div>
  <div id="scene-2" class="clip" data-start="5" data-duration="5" data-track-index="2">
    <h1>Next Scene</h1>
  </div>
</div>

<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  tl.from("#scene-1 h1", { y: 30, opacity: 0, duration: 0.5 }, 0.3);
  tl.to("#scene-1", { opacity: 0, duration: 0.3 }, 4.5);
  tl.from("#scene-2", { opacity: 0, duration: 0.3 }, 4.7);
  window.__timelines["my-video"] = tl;
</script>
```

### レンダリングプロファイル

| プロファイル | FPS | 品質 | ビットレート | 用途 |
|------------|-----|------|------------|------|
| draft | 15 | draft | 自動 | クイックプレビュー |
| standard | 30 | standard | 自動 | SNS・Web公開 |
| high | 60 | high | 20M | 顧客納品 |
| social-portrait | 30 | standard | 自動 | TikTok/Reels/Shorts |
| social-square | 30 | standard | 自動 | Instagram |

---

## 3. ショート動画（TikTok / Reels / Shorts）

### 概要

縦型（9:16）のショート動画を HyperFrames で生成。
`social-portrait` プロファイルを使用。

### テンプレート

`test-video/compositions/short-portrait.html` を参照。

4シーン構成（16秒）:
1. **Hook**（0-4s）: キャッチーな導入
2. **Problem**（4-8s）: 課題提起
3. **Solution**（8-12s）: 解決策提示
4. **CTA**（12-16s）: 行動喚起

### レンダリング

```bash
cd test-video
npx hyperframes render --quality standard --fps 30 --resolution portrait
```

またはプロファイル指定:

```bash
node scripts/render-video-hyperframes.mjs --profile social-portrait
```

### 新規ショート動画の作成手順

1. `compositions/` に新しい HTML ファイルを作成（`<template>` ラッパー使用）
2. `index.html` に `data-composition-src` で参照を追加
3. `npx hyperframes lint` でチェック
4. `npx hyperframes render` でレンダリング

---

## 4. パイプライン自動化

### 全体フロー

```
Dify (スクリプト生成)
  → DeepSeek (ナレーション生成)
  → buildHyperFramesHtml() (HTML生成)
  → test-video/index.html に保存
  → hyperframes render (MP4出力)
  → R2アップロード
  → Slack通知
```

### Trigger.dev タスク

動画量産ジョブはTrigger.devの `TRIGGER_VIDEO_PIPELINE_TASK_ID` に投入する。タスク側でVast.ai起動、ComfyUI API生成、OpenMontage組み立て、R2保存、Sales OSステータス更新を順番に行う。

### 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| HYPERFRAMES_API_URL | Cloud API利用時 | HyperFrames Cloud API |
| COMFYUI_API_URL | ComfyUI利用時 | ComfyUI API URL |
| VAST_API_KEY | GPU利用時 | Vast.ai API Key |
| TRIGGER_SECRET_KEY | プロ級動画投入時 | Trigger.dev Secret API Key |
| TRIGGER_VIDEO_PIPELINE_TASK_ID | プロ級動画投入時 | Trigger.dev task id |

---

## 5. トラブルシューティング

### HyperFrames

| 問題 | 原因 | 解決策 |
|------|------|--------|
| `class="clip"` がない | 要素が非表示 | 全 timed element に `class="clip"` を追加 |
| `data-track-index` 重複 | トラック競合 | 各シーンにユニークな index を設定 |
| レンダリングが遅い | draft品質でない | `--quality draft --fps 15` でプレビュー |
| Chrome が見つからない | キャッシュ不足 | `npx hyperframes doctor` で診断 |

---

## 付録: クイックリファレンス

### 全コマンド一覧

```bash
# HyperFrames
cd test-video && npx hyperframes lint
cd test-video && npx hyperframes validate
cd test-video && npx hyperframes render --quality draft --fps 15
cd test-video && npx hyperframes render --quality standard --fps 30
cd test-video && npx hyperframes render --quality high --fps 60 --video-bitrate 20M

# スクリプト
node scripts/render-video-hyperframes.mjs --profile standard
node scripts/render-video-hyperframes.mjs --profile high
node scripts/render-video-hyperframes.mjs --profile social-portrait
node scripts/upload-video-to-r2.mjs test-video/renders/xxx.mp4 --public

# 診断
npx hyperframes doctor
```

### 関連ファイル

| ファイル | 説明 |
|---------|------|
| `test-video/index.html` | メインコンポジション |
| `test-video/compositions/short-portrait.html` | 縦型ショート動画 |
| `test-video/hyperframes.json` | レンダリング設定 |
| `scripts/render-video-hyperframes.mjs` | レンダリングスクリプト |
| `scripts/upload-video-to-r2.mjs` | R2アップロードスクリプト |
| `src/lib/sales/video-generator.ts` | 動画生成コアロジック |
| `src/lib/sales/video-pipeline.ts` | パイプラインジョブ管理 |
| `src/lib/sales/video-production.ts` | 制作プロファイル定義 |
| `src/lib/sales/comfyui-client.ts` | ComfyUI クライアント |
| `src/lib/sales/oss-renderers.ts` | OSS レンダラー群 |
| `src/lib/sales/audio-pipeline.ts` | 音声・字幕パイプライン |
| `src/lib/sales/video-orchestrator.ts` | 統合オーケストレーター |
| `src/components/sales-dashboard/SalesReportVideoStudioPanel.tsx` | GPUなしレポート動画スタジオ |
| `src/components/sales-dashboard/SalesProVideoStudioPanel.tsx` | Vast.ai + ComfyUI APIヘッドレスのプロ級動画スタジオ |
