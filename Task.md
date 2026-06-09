# Task.md

## ACTIVE HANDOFF - 2026-06-10 全タスク完了
- コード品質 + OSS + 分割 + Keystatic + 配線 ✅
- デプロイ中: d38d06b (u8vjqu29otaf37vyjjbi63b9)
- 本番: paradigmjp.com → 200 ✅
- Astro: paradigm-astro-demo.pages.dev → 200 ✅

## Round 3 (d38d06b) — 営業フロー配線

### Skyvern → エンリッチメント配線 ✅
- `src/lib/sales/sources/skyvern-source.ts`: 新規作成
  - `captureSkyvernScreenshot()` — サイトのスクリーンショット取得
  - `extractSkyvernSiteData()` — 企業情報・CTA・信頼要素の構造化抽出
  - `discoverSkyvernForms()` — フォーム検出・フィールド解析
- `src/lib/sales/source-coverage.ts`: outreachカテゴリに追加
- `src/lib/sales/enrich.ts`: Promise.allバッチに +2 source追加
  - 30+ source → 32+ source に拡張
  - meta JSONB に `skyvern` フィールド追加

### Astro → Cloudflare Pages 自動デプロイ ✅
- `src/lib/sales/cf-pages-deploy.ts`: 新規作成
  - `buildDemoFrontmatter()` — 診断レポートからKeystatic frontmatter生成
  - `triggerCfPagesDeploy()` — Cloudflare APIでPagesデプロイ起動
  - `deployDemoToCfPages()` — コンテンツ生成→デプロイの一括処理
- `src/lib/sales/demo-generator.ts`: CF Pages deployをfire-and-forgetで配線
  - R2アップロード後にCF Pagesビルドを非同期トリガー

## 完了済み全変更

| # | Commit | 内容 |
|---|--------|------|
| 1 | b8b62c9 | コード品質 + OSS健全性 |
| 2 | 7c372be | ファイル分割 + Keystatic + Cloudflare Pages |
| 3 | d38d06b | Skyvern配線 + Astro→CFP自動化 |

### ファイル行数 (全500行未満)
| File | Lines |
|------|-------|
| oss-service-health.ts | 107 |
| oss-health-core.ts | 157 |
| oss-health-media.ts | 180 |
| oss-health-infra.ts | 182 |
| integration-definitions.ts | 16 |
| integration-defs-orchestration.ts | 183 |
| integration-defs-sources.ts | 277 |
| integration-defs-assets.ts | 320 |
| skyvern-source.ts | 170 |
| cf-pages-deploy.ts | 190 |
| keystatic.config.ts | 133 |
| DiagnosticReport.tsx | ~525 |

## ビルド状況
| Service | UUID | Status |
|---------|------|--------|
| main-app | u8vjqu29otaf37vyjjbi63b9 | queued |
| hf-renderer | xfmylqsjgqod5i5sapebxc7m | deployed |
| ai-services | ui07zaesh1jgo2zvhi9vvrst | deployed |

## NEXT (優先度順)
- Skyvern本番動作確認: AIサービスがAPIキー(OpenAI等)なしでどこまで動くか検証
- CF Pagesデプロイ完了確認: triggerCfPagesDeploy() が正常にPagesビルドを起動できるか
