# Task.md

## CURRENT STATUS

- Revenue OS のサードメニューを、内部の代替ワークベンチではなく外部OSS正規GUI入口へ切り替え済み。
- Directus: `https://directus.paradigmjp.com/admin`
- Keystatic: `https://keystatic.paradigmjp.com` -> `/keystatic` real Keystatic UI
- Supabase Studio: 本番 `NEXT_PUBLIC_SUPABASE_STUDIO_URL`
- OpenMontage: 公式OSSにWeb管理GUIがないため、Revenue OS内のStudio風UIと subdomain rewrite は廃止。入口は公式OSSへ退避。

## ACTIVE HANDOFF

- コード検証済み: `npx tsc --noEmit --pretty false`
- テスト済み: `npm test -- --run src/lib/sales/integration-registry.test.ts src/lib/sales/dify-cloud.test.ts`
- 本番ビルド済み: `npm run build`
- 差分チェック済み: `git diff --check`
- 本番デプロイ済み: Coolify deployment `mwnb68yy211u6kfpb3ce4bw1`, commit `e2a14b76116df2555516719c22c755f8bd6ced6f`, status `finished`。
- Production smoke: `https://keystatic.paradigmjp.com`, `https://directus.paradigmjp.com/admin`, `https://supabase.paradigmjp.com`, `https://paradigmjp.com/ja/admin/sales?tab=keystatic` all returned HTTP 200.
- 残リスク: Keystatic は実UIとして稼働。GitHub永続保存/OAuth連携は別途キー設定が必要になるまでローカルストレージモード。

## LINKS

- 旧 Task 履歴: `docs/handoff-archive/2026-06-04-task-before-external-oss-gui.md`
- 旧 CLAUDE 詳細: `docs/handoff-archive/2026-06-04-claude-before-context-trim.md`
- コンテキスト運用: `docs/knowledge/context-budget-runbook.md`
