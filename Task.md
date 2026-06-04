# Task.md

## CURRENT STATUS

- Revenue OS の動画制作タブを旧フォームUIから削除し、Supabase `sales_video_jobs` をSSOTにした「OSS Video Studio」へ全面差し替え済み。
- 新スタジオは HyperFrames / OpenMontage / ComfyUI API / Vast.ai / LiveKit / Cloudflare R2 / n8n を同じ制作ジョブ上で見られる構成に変更済み。
- `/api/sales/video-pipeline/orchestrate` を追加し、既存 `runVideoOrchestrator` から Vast -> ComfyUI -> TTS -> 字幕 -> OSSレンダー -> R2 -> n8n の統合実行を呼べるようにした。
- Keystatic は App Router の正規 catch-all page 構成へ修正し、`keystatic.paradigmjp.com` のサブドメインrewriteも next-intl に飲まれないよう修正済み。
- 診断レポートとデモサイトは外部PostgREST/壊れたCMSリンクへ飛ばさず、Revenue OS内部の Supabase SSOT ワークベンチで編集・プレビューする形へ変更済み。
- Chatwoot webhook は受信後に Supabase 活動ログへ保存し、会社IDが取れた場合は Twenty へ即時同期するよう変更済み。

## ACTIVE HANDOFF

- 変更ファイル:
  - `src/components/sales-dashboard/SalesVideoPipelinePanel.tsx`
  - `src/components/sales-dashboard/SalesVideoStudioKit.tsx`
  - `src/app/api/sales/video-pipeline/orchestrate/route.ts`
  - `src/components/sales-dashboard/SalesCommandCenter.tsx`
  - `src/app/keystatic/[[...params]]/page.tsx`
  - `src/app/keystatic/layout.tsx`
  - `keystatic.config.ts`
  - `src/middleware.ts`
  - `src/app/api/sales/chatwoot/webhook/route.ts`
  - `content/keystatic/demo-sites/example-domain.mdoc`
  - `content/keystatic/sales-pages/japan-entry-lp.mdoc`
- 検証済み:
  - `npx tsc --noEmit --pretty false`
  - `npm test -- --run src/lib/sales/video-pipeline.test.ts src/lib/sales/video-production.test.ts src/lib/sales/integration-registry.test.ts src/lib/sales/r2-storage.test.ts`
  - `git diff --check`
  - `npm run context:audit`
  - `npm run build`
- 次アクション:
  - commit / push / Coolify deploy
  - 本番URLで `/ja/admin/sales?tab=videoPipeline`, `?tab=keystatic`, `?tab=supabaseStudio`, `https://keystatic.paradigmjp.com` を確認

## RISKS

- OpenMontage/ComfyUI/Vast/LiveKit の実行成否は本番環境変数と外部サービス疎通に依存する。UIとAPIは本番ビルド済みだが、実レンダーは本番デプロイ後のAPI実行で再確認する。
- Keystaticはlocal storage構成のため、Git連携や編集権限運用は別途キー設定が必要。
