# Paradigm HP - Agent Entry

This file is a lightweight project entrypoint. Keep detailed history out of this file.

## 「続きから開始して」と言われたら

確認も質問もせず、`Task.md` 冒頭の ACTIVE HANDOFF を読み、そこに書かれた「次のアクション」の先頭から着手する。ユーザーに操作を頼まないこと。

作業はこのローカルではなくサーバー上（`root@178.105.138.55:/opt/dev/paradigmjpcom`）で行う。詳細と注意点は ACTIVE HANDOFF にある。接続鍵は private リポジトリ `Gracecom1/paradigm-workstation` にあるので、手元に無ければ `gh repo clone Gracecom1/paradigm-workstation` で取得する（**このリポジトリは public なので鍵と .env は絶対に置かない**）。

## Start Here

1. Read `AGENTS.md` for repo rules.
2. Read `Task.md` for current status, active handoff, and next actions.
3. Put long specs, audits, and investigation notes under `docs/knowledge/`, `docs/refactor/`, or `docs/handoff-archive/`.
4. Never store API keys, tokens, passwords, or auth values in git-managed files.

## Current Focus

- Revenue OS external OSS GUI replacement and Coolify deployment recovery.
- Directus, Keystatic, Supabase Studio, and OpenMontage entries must not show faux internal Studio UI.

## Archive

- Previous oversized project context was archived to `docs/handoff-archive/2026-06-04-claude-before-context-trim.md`.
