# Task.md

## CURRENT STATUS

- Revenue OS の司令塔に Supabase SSOT 統合フローを追加済み。
- リード取得、診断、送信、商談化、制作・納品を同一営業レコードで追う構成に整理済み。
- 動画制作タブは外部OpenMontageリンクではなく、`sales_video_jobs` を操作する内部制作アプリへ復帰済み。
- Directus / Keystatic / Supabase Studio は正規外部GUI入口として維持し、Revenue OS側では状態・成果物URL・同期ログをSSOTに集約する方針。

## ACTIVE HANDOFF

- 変更ファイル:
  - `src/components/sales-dashboard/SalesCommandCenter.tsx`
  - `src/components/sales-dashboard/SalesUnifiedOpsPanel.tsx`
- 検証済み:
  - `npx tsc --noEmit --pretty false`
  - `npm test -- --run src/lib/sales/integration-registry.test.ts src/lib/sales/dify-cloud.test.ts`
  - `git diff --check`
  - `npm run context:audit`
  - `npm run build`
- 残リスク:
  - 外部OSSの実GUI自体は各正規URLで開く。Revenue OSに埋め込むのではなく、SSOTへの書き戻しと接続監査で統合する。
  - Keystaticは実UIとして稼働するが、GitHub永続保存/OAuth連携は別途キー設定の完了が必要。

## LINKS

- 旧 Task 履歴: `docs/handoff-archive/2026-06-04-task-before-external-oss-gui.md`
- 旧 CLAUDE 詳細: `docs/handoff-archive/2026-06-04-claude-before-context-trim.md`
- コンテキスト運用: `docs/knowledge/context-budget-runbook.md`
