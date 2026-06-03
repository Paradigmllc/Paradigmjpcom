# コンテキスト予算運用ガイド

AI エージェントが毎回読むファイルは、詳細本文ではなく入口として管理する。

## 毎回読むファイルの役割

| ファイル | 役割 | 上限 |
|---|---|---:|
| `AGENTS.md` / `.clinerules` / `.windsurfrules` / `.cursor/rules/global.mdc` | 全エージェント共通の必須ルール | 240 行 |
| `CLAUDE.md` | プロジェクト概要、重要リンク、実行コマンドの軽量目次 | 120 行 |
| `GEMINI.md` / `.agents/rules/*.md` | Antigravity / Gemini 系の軽量入口 | 120 行 |
| `Task.md` | 現在状態、Active Handoff、次アクション、詳細リンク | 120 行 |
| `~/.claude/CLAUDE.md` | 全プロジェクト共通の軽量入口 | 120 行 |
| `~/.config/opencode/AGENTS.md` | OpenCode 全体の軽量入口 | 120 行 |
| `~/.gemini/GEMINI.md` / `~/.gemini/AGENTS.md` | Antigravity / Gemini 全体の軽量入口 | 120 行 |
| `~/AGENTS.md` / `~/.codex/AGENTS.md` / `~/.agents/AGENTS.md` | 汎用エージェント全体の軽量入口 | 120 行 |

## 書いてよいもの

- 現在のブロッカー、次に触るファイル、未完了タスク
- 詳細ドキュメントへのリンク
- 検証コマンドの最新結果だけ

## 書かないもの

- 長い実装履歴
- 過去セッションの全ログ
- 仕様本文、監査本文、調査メモ全文
- API キー、トークン、認証情報の実値

## 退避先

- 長い引き継ぎ履歴: `docs/handoff-archive/YYYY-MM-DD-*.md`
- 仕様、運用手順、調査結果: `docs/knowledge/`
- リファクタ計画、監査メモ: `docs/refactor/`

## 作業終了時の手順

1. `Task.md` は現在状態とリンクだけに更新する。
2. 長い履歴は `docs/handoff-archive/` に移す。
3. 共通ルールを変えた場合は `bash sync.sh deploy-ai-rules` を実行する。
4. `npm run context:audit` を実行して、入口ファイルが上限内であることを確認する。

`npm run context:audit` は repo 内の入口ファイルに加えて Claude / Codex / OpenCode / Antigravity / 汎用 AGENTS のグローバル入口も確認する。repo だけを見たい場合は `CONTEXT_AUDIT_SKIP_GLOBAL=1 npm run context:audit` を使う。

ローカル commit 前の強制には `npm run context:install-hooks` を一度実行する。これで `.githooks/pre-commit` が `npm run context:audit` を実行し、肥大化した状態の commit を止める。

全プロジェクト共通の保険として、グローバル Git hook も `C:/Users/apple/.agents/githooks/pre-commit` に設定済み。repo に `context:audit` があればそれを実行し、無ければ `C:/Users/apple/.agents/scripts/context-audit.ps1` を実行する。repo ローカルの `core.hooksPath` がある場合はローカル設定が優先される。
