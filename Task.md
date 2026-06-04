# Task.md

## CURRENT STATUS

- Revenue OS のサードメニューを、内部の代替ワークベンチではなく外部OSS正規GUI入口へ切り替え中。
- Directus: `https://directus.paradigmjp.com/admin`
- Keystatic: `https://keystatic.paradigmjp.com` -> `/keystatic` real Keystatic UI
- Supabase Studio: 本番 `NEXT_PUBLIC_SUPABASE_STUDIO_URL`
- OpenMontage: 公式OSSにWeb管理GUIがないため、Revenue OS内のStudio風UIと subdomain rewrite は廃止。入口は公式OSSへ退避。

## ACTIVE HANDOFF

- コード検証済み: `npx tsc --noEmit --pretty false`
- テスト済み: `npm test -- --run src/lib/sales/integration-registry.test.ts src/lib/sales/dify-cloud.test.ts`
- 本番ビルド済み: `npm run build`
- 差分チェック済み: `git diff --check`
- 次アクション: Keystatic追加分を commit -> push -> Coolify deploy -> production URL fingerprint/smoke check。

## LINKS

- 旧 Task 履歴: `docs/handoff-archive/2026-06-04-task-before-external-oss-gui.md`
- 旧 CLAUDE 詳細: `docs/handoff-archive/2026-06-04-claude-before-context-trim.md`
- コンテキスト運用: `docs/knowledge/context-budget-runbook.md`
