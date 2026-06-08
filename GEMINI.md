# GEMINI.md — Paradigm Antigravity Rules

> Antigravity / Gemini-specific lightweight entrypoint.
> Shared rules live in `AGENTS.md`; do not duplicate long rules here.

## Always On

- Read `AGENTS.md` for the shared cross-agent rules.
- Keep `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, and `Task.md` lightweight.
- Do not write progress logs or long history into startup files.
- Archive long handoffs in `docs/handoff-archive/` and long specs in `docs/knowledge/` or `docs/refactor/`.
- Before finishing any task that edits agent/context files, run `npm run context:audit`.
- If `npm run context:audit` fails, fix the context bloat before continuing.
- 【永久保存ルール】ブラウザでの検証や確認を行う際は、シークレット（`browser_subagent`）ではなく、拡張機能インストール済みのユーザーの既存のログイン済みブラウザを開くため、PowerShell コマンド `Start-Process "https://..."` を実行して直接開くこと。

