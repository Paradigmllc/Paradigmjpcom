# Task.md

## CODEX UPDATE - 2026-06-09 Astroデモ + HFパイプライン 実装中

### DiagnosticReport.tsx 分割 (DONE)
- 1539行 → 482行 (-68%)、16ファイルに分割
- 抽出: ReportHeader, ReportHeroSection, ReportDarkSurface, ReportFinalCta, ReportRequestModal
- 抽出ユーティリティ: report-utils, report-constants, report-tracking
- 抽出カード: ReportFindingCard, ReportPainCard, ReportSignalCard, ReportSourceRow, ReportCompetitorBenchmark, ReportRoiCalculator
- 全ファイル 500行未満 ✅, tsc --noEmit ✅

### Astro デモサイト 本物化 (DONE)
- `astro-demo/` プロジェクト作成 (Astro v5 + Tailwind v4 + Keystatic + Cloudflare)
- 5セクションコンポーネント: HeroSection, ProofBar, ServicePath, CasePreview, BookingCta
- Keystatic `demoSites` コレクション (15フィールド: title, industry, accent colors, services, metrics...)
- Glassmorphism + Dark テーマ (buildDemoHtml() から移植)
- `?slug=` パラメータで動的データ切替 + Cloudflare Pages デプロイ設定

### HyperFrames MP4 レンダリングパイプライン (DONE)
- `docker/Dockerfile.hf-renderer`: Chromium + FFmpeg + HyperFrames CLI
- `scripts/hf-render-entry.sh`: エントリーポイント（profile指定: draft/standard/high）
- `src/lib/sales/hf-docker-renderer.ts`: Node.js統合（HTML生成 → Docker → MP4 base64）
- `docker-compose.hf-renderer.yml`: 専用レンダラーサービス定義

### ファイル状態
| File | Lines | 制限 |
|------|-------|------|
| DiagnosticReport.tsx | 482 | OK |
| astro-demo/ (10 files) | ~450 | OK |
| hf-docker-renderer.ts | 178 | OK |
| Dockerfile.hf-renderer | 31 | OK |
| report-variant-sections.tsx | 461 | OK |

## ACTIVE HANDOFF
- DiagnosticReport分割 ✅ | Astroデモサイト ✅ | HFパイプライン ✅
- 動画 Bento Grid + Glassmorphism + データ可視化（デプロイ待ち）

## NEXT ACTIONS
- `npm install` + `npm run build` for astro-demo/
- Docker image build & test: `docker build -t paradigm-hf-renderer -f docker/Dockerfile.hf-renderer .`
- 動画品質のブラウザ実確認（Bento Grid表示 + カメラ移動 + データ可視化アニメーション）
- astro-demo を Pipeline to Demo Generator に配線（Dify → Astro → R2 自動化）

## RISKS
- Droplet OOM警戒（8GB, Next.jsビルドが3GB消費）
- 動画のブラウザ実確認が未実施
- astro-demo/ の build 未検証
