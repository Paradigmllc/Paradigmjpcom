# Task.md

## ACTIVE HANDOFF - 2026-06-10
- コード品質監査 + バグ修正 + OSS健全性 ✅
- Morphic / Perplexica / Skyvern OSS統合 ✅
- Coolify デプロイ完了 ✅ (deploy: elkv5nwbcaqf2qc2bna0i8e7, status: finished)
- 本番URL検証: https://paradigmjp.com → 200 ✅
- 動画デモ: https://paradigmjp.com/ja/report/demo/website_diagnostic → 200 ✅
- Cloudflare Pagesデプロイ: トークン権限不足で未完了

## 今回の全変更サマリ (commit b8b62c9)

### 孤児ファイル (4削除 + 1配線)
- 削除: AuditConversionSections.tsx, ReportExecutiveBrief.tsx, VideoModal.tsx, VideoPlayer.tsx
- 配線: ReportScoreCard → DiagnosticReport.tsx (スコア概要セクション追加)

### コード品質 (69件修正)
- サイレントcatch 41件 → console.error/warn 追加
- `process.env.X || ""` 5件 → 警告ログ付き修正
- `as any` 23件 → 適切な型に置換

### OSS健全性 (7件修正)
- SpiderFoot/Katana/Maigret/FlareSolverr → INTEGRATION_REGISTRY 定義追加
- Cal.com: `balance: "calcom_health"` バグ修正
- mubeng: ヘルスチェックを oss-service-health.ts に抽出

### 新規OSS統合 (3件)
- Morphic: AI検索エンジン (miurla/morphic)
- Perplexica: AI検索エンジン (Perplexica)
- Skyvern: ブラウザ自動化AIエージェント
- docker-compose.oss-ai-services.yml: 全3サービスのDocker Compose定義

### デプロイ検証
- tsc --noEmit: ✅
- git push: ✅ (main → origin/main)
- Coolify deploy: ✅ (status: finished)
- 本番 200: https://paradigmjp.com ✅
- 動画 200: https://paradigmjp.com/ja/report/demo/website_diagnostic ✅

## NEXT ACTIONS (未完了)
- Cloudflare Pages: トークンにPages:Edit権限追加 → `npx wrangler pages deploy dist --project-name=paradigm-astro-demo`
- Docker image build: `docker build -t paradigm-hf-renderer -f docker/Dockerfile.hf-renderer .`
- GSAP CSP修正 + bento3 id 本番動作確認
- Skyvern Docker image 本番投入

## RISKS
- Droplet OOM警戒（8GB, Next.jsビルドが3GB消費）
- Cloudflare API token に Pages 権限がない（cfut_OyJD... はDNS/R2のみ）
- DiagnosticReport.tsx 525行付近（500行ギリギリ超過）
- oss-service-health.ts 680行付近（分割検討要）
