# Task.md

## CODEX UPDATE - 2026-06-10 HyperFrames report video player/quality
- 診断レポート埋め込みを素の iframe から公式 `@hyperframes/player` に切替。`controls` / `autoplay` / `muted` / seek API を使う構成に変更。
- HyperFrames composition に `data-duration` / `data-start` / `data-track-index` / Catalog互換 `data-hf-frameworks` を追加。公式Catalog系 (`data-chart`, `shimmer-sweep`, `caption-highlight`, `flash-through-white`, `transitions-blur`) に差し替え可能な境界を明示。
- MP4生成の既定品質を `draft` から `standard` に変更。レンダーAPIも既定 `standard`。
- `@hyperframes/player` と `pino` を明示依存化。TurbopackのPayload/pino外部化不具合を避けるため `npm run build` は既存wrapperのWebpack経路へ戻した。
- Verification: `npx tsc --noEmit --pretty false` OK, `git diff --check` OK, `npm run context:audit` OK, static HyperFrames player preview OK (ready/autoplay/controls/seek/duration/clip metadata verified).
- Build note: `D:\dev\paradigmjpcom` 実体パスの Webpack build は compile/static generation まで通過。最終standalone copyで Windows file lock `EBUSY asset_Geist-Regular...ttf` が発生する場合あり。Linux/Coolify deploy側で再確認する。

## ACTIVE HANDOFF - 2026-06-10 自律実行完了
- 全コード修正 + OSS統合 + 分割 ✅
- Coolify メインアプリ デプロイ中 (hug6qensyzqj7gkzti154x8q)
- Dockerサービス作成+起動 (hf-renderer, ai-services) ✅
- Astro-demo Cloudflare Pages ✅
- tsc --noEmit ✅ (全ラウンド)
- 本番 https://paradigmjp.com → 200 ✅
- Astro https://paradigm-astro-demo.pages.dev → 200 ✅

## 完了済み

### Round 1 — コード品質 + OSS健全性 (b8b62c9)
- 孤児ファイル4削除 + ScoreCard配線
- サイレントcatch 41件修正
- env fallback 5件 + as any 23件修正
- SpiderFoot/Katana/Maigret/FlareSolverr INTEGRATION_REGISTRY登録
- Cal.com balance修正 + mubeng抽出
- Morphic/Perplexica/Skyvern 定義 + ヘルスチェック + Docker Compose

### Round 2 — ファイル分割 + Keystatic + Docker Deploy (7c372be)
- oss-service-health.ts (680L) → oss-health-core/media/infra (3ファイル, 各<200L)
- integration-definitions.ts (1000L) → integration-defs-orchestration/sources/assets (3ファイル, 各<320L)
- keystatic.config.ts: demoSites スキーマ18フィールド化
- Astro-demo ビルドパイプライン (scripts/build-demo-data.mjs)
- Cloudflare Pages: paradigm-astro-demo 作成 + デプロイ
- Coolify API経由でDockerサービス作成・起動:
  - hf-renderer (xfmylqsjgqod5i5sapebxc7m) — HyperFrames MP4 Renderer
  - ai-services (ui07zaesh1jgo2zvhi9vvrst) — Morphic + Perplexica + Skyvern

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
| keystatic.config.ts | 133 |
| DiagnosticReport.tsx | ~525 |

## ビルド/デプロイ状況
| Service | Coolify UUID | Status |
|---------|-------------|--------|
| main-app | i12am4vvcbggefnqdizhnv9a | in_progress (Next.jsビルド) |
| hf-renderer | xfmylqsjgqod5i5sapebxc7m | deploying (Dockerビルド) |
| ai-services | ui07zaesh1jgo2zvhi9vvrst | deploying (イメージpull) |

## RISKS
- Droplet OOM警戒 (Dockerビルド×2 + Next.jsビルド同時実行)
- ai-services (Morphic/Perplexica/Skyvern) はAPIキー未設定のため起動後要設定
- DiagnosticReport.tsx 525行 (微超過)
