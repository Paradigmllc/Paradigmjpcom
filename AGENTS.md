# AGENTS.md — Paradigm Projects

> OpenAI Codex agent instructions for Paradigm LLC projects.
> このファイルは `docs/ai-rules-coding.md` から自動生成されます。
> 直接編集せず、正本を編集して `bash sync.sh deploy-ai-rules` を実行してください。

## Agent Instructions

このリポジトリで作業する際は以下のルールに**例外なく**従うこと。

---

# Paradigm Coding Rules — All AI Agents

> すべての AI エージェント（Claude Code / Cursor / Cline / OpenAI Codex 等）はこのルールに従うこと。
> このファイルが正本。直接編集し `bash sync.sh deploy-ai-rules` で各ツールに展開する。

---

## 🚨 禁止事項 10 箇条（最優先・例外なし）

| # | 禁止行為 | 代わりにすること |
|---|---------|---------------|
| 1 | `catch {}` / `catch(e) {}` の握りつぶし | `toast.error(e.message)` + `console.error(e)` を必ず追加 |
| 2 | `alert()` / `confirm()` / `prompt()` 使用 | Sonner toast / shadcn Dialog を使用 |
| 3 | `git push --force` | 絶対禁止。ユーザーに確認を求める |
| 4 | `git reset --hard` | `git stash` などの安全な代替手段を提案 |
| 5 | `process.env.X \|\| ""` 空文字フォールバック | 未設定時は明示的エラーログを出力 |
| 6 | `as any` の多用（3箇所以上） | `unknown` + 型ガード、または明示型を使用 |
| 7 | 1 ファイル 500 行超え | 責務ごとにコンポーネント / フック / ユーティリティに分割 |
| 8 | API のみ / GUI のみの実装 | DB + API + GUI の 3 点セットで必ず実装 |
| 9 | コード変更後に確認なくタスク完了とする | commit → push → deploy → URL 確認まで完了とする |
| 10 | 外部 URL に `target="_blank"` なし | `target="_blank" rel="noopener noreferrer"` を必ず付与 |

---

## 🏗️ 実装品質（A〜I）

**A. DB・API・GUI の 3 点セット必須**
機能追加は DB スキーマ + API エンドポイント + UI を必ずセットで実装する。API のみ・GUI のみは禁止。

**B. 全機能の 5 点セット**
API + GUI + リアルタイム可視化 + エラー可視化 + 全データ DB 化。
進捗バー・成功 / エラー toast・ベル通知・ハードコード禁止を必ず実装。

**C. ページ間は動的データ連携**
単なるページ遷移ではなく URL パラメータ・共有 state・DB 経由の双方向同期で連携
（`?prompt=` / `?tab=` / `?mode=` / `?topic=` / `?media_url=`）。

**D. 実行結果をリアルタイム可視化**
機能追加時は成果・進捗をダッシュボード上に即時反映する。

**E. エラーハンドリング必須**
`catch {}` の握りつぶし禁止。エラーは必ず `toast.error()` + `console.error()` + 可能であれば DB 保存で可視化する。

**F. ファイル分割ルール**
1 ファイル 300 行超えで分割検討、500 行超えで分割必須。
責務ごとにコンポーネント・フック・ユーティリティに分離する（mega ファイル禁止）。

**G. TypeScript 型安全**
`any` / `as any` の多用禁止。`unknown` + 型ガード、または明示的な型定義を使用。
定数は `as const` でタプル型に固定する。

**H. 完了の定義**
ローディング状態・空状態（EmptyState）・エラー状態の 3 つを必ず実装してからタスク完了とする。

**I. 新ライブラリ追加前に既存確認**
`package.json` を確認して類似・重複ライブラリがないか先にチェック。
既存で実現できる場合は追加しない。

---

## 🎨 UI/UX（J〜M）

**J. モダン JS ライブラリ（Tier S 必須）**

| Tier | ライブラリ |
|------|-----------|
| S（全案件必須） | framer-motion / shadcn/ui+Radix / Magic UI / TanStack Query+Table / Zustand / Recharts+Tremor / React Hook Form+Zod / Sonner / dnd kit / Tailwind CSS |
| A（SaaS/LP 積極採用） | typewriter-effect / tsparticles / react-countup / embla-carousel / react-resizable-panels / vaul / @formkit/auto-animate |
| B（用途別） | react-confetti / lottie-react / react-colorful / react-activity-calendar |

shadcn 統合が必要なもの（直接 npm install 禁止）:
- `npx shadcn@latest add carousel` / `resizable` / `drawer`

**K. Stripe Dashboard UI スタイル**
クリーン白地・明確な情報階層・カード型・色使い控えめ・重要情報強調。

**L. レスポンシブ + モバイル戦略は実装と同時に完了**
コンポーネント作成時に `sm:` `md:` `lg:` を必ず設定。PWA 対応（manifest.json + service worker）推奨。

**M. UI デザインは既存ページに統一**
新実装前に既存ページを読み込んで確認し、共通コンポーネントを積極的に再利用する。
独自 UI を一から作る前に「既存で流用できるものがないか」を必ず確認する。

---

## 📣 通知（N）

**N. 通知は必ず DB ベル + Slack の両方**
片方だけは NG。`notifyBothChannels(s, {title, message, link, type})` を全 API で使用。
顧客向け SaaS は LINE 通知も追加必須（Slack は社内向け・LINE は顧客向け）。

---

## 🔒 品質・セキュリティ（Z, AA〜CC, LL, MM）

**Z. セキュリティ基本原則**
- ユーザー入力は必ずバリデーション・サニタイズ
- SQL はパラメータ化（文字列連結禁止）
- API エンドポイントに認可チェック必須
- 機密情報をログ・レスポンス・URL に含めない
- 依存関係は月 1 回 `npm audit` + `npm outdated` を実行

**AA. パフォーマンス基本原則**
- N+1 クエリ禁止（ループ内 DB アクセスは `.in()` / JOIN でバッチ化）
- 画像は `next/image` + WebP + 適切なサイズ
- リスト 100 件超は仮想スクロール or 無限スクロール
- 重い処理はバックグラウンド API

**BB. ログ・監視の基本**
- `console.log` の本番残留禁止（`console.error` / `console.warn` のみ可）
- 重要な処理は構造化ログで DB 保存
- エラーは必ずユーザーに可視化し、サイレント失敗を作らない
- `alert()` / `confirm()` / `prompt()` 禁止 → `toast.success()` / `toast.error()` / `toast.warning()`（Sonner）

**CC. アクセシビリティ最低限**
- `<img>` に `alt` 必須
- インタラクティブ要素に `aria-label` 付与
- キーボード操作対応（`tabIndex` / `onKeyDown`）
- カラーコントラスト 4.5:1 以上

**LL. テスト基本原則**
共通ユーティリティ・複雑なビジネスロジック・API ルートには最低限ユニットテスト（Vitest 推奨）。
主要ユーザーフローは Playwright で E2E カバー。「テストなしで完了」は禁止。

**MM. Supabase RLS 必須化**
テーブル追加時は RLS を有効化し最小権限ポリシーを設定すること。
`service_role` キー使用のサーバー側 API でも user_id 確認を実装。RLS なしのテーブル公開禁止。

---

## 🤝 開発フロー（DD, QQ）

**DD. ブランチ戦略**
`main` への直接 push は緊急修正のみ。
通常は `feat/xxx` / `fix/xxx` / `hotfix/xxx` ブランチを切って PR 経由でマージ。

**EE. Task.md 進捗同期ルール**
すべてのプロジェクトで、作業進捗・壁打ちの決定事項・引き継ぎは各リポジトリ直下の `Task.md` に集約する。
`AGENTS.md` / `.clinerules` / `.windsurfrules` / `.cursor/rules/global.mdc` は共通ルールの配布物なので、進捗や一時ログを書かない。
長い仕様・監査・設計メモは `docs/refactor/` または `docs/knowledge/` に分離し、`Task.md` からリンクする。
API key・トークン・認証情報の実値は `Task.md` / `docs/` / git 管理ファイルに書かず、必要な環境変数名と用途だけを記録する。
Claude / Codex / Cline / Cursor など複数 AI エージェントで作業する場合は、各エージェントが作業開始前に `Task.md` の CURRENT STATUS / Active Handoff を確認し、終了時に更新する。

**QQ. 実装前に要件すり合わせを必ず行う**
新機能・新ページ・大きな改修を始める前に以下を確認してから実装に入ること:
① フォルダ構成・ファイル配置 ② UI/UX デザイン方針 ③ 技術スタック選定 ④ DB 設計・API 設計の概要。

---

## 🧰 ツール活用（W〜Y）

**W. 車輪の再発明禁止・OSS 優先**
何か機能を実装する前に同等の OSS・MCP・ライブラリが存在しないか必ず調査してから実装に入ること。
「自分で作れる」ではなく「既存で賄えないか」を最初に考える。

**X. エラー発生時は自律調査してから質問**
エラーが発生したら質問する前に:
① エラーメッセージを GitHub Issues / Stack Overflow / 公式ドキュメントで調査
② 類似ケースを複数確認
③ 試せる修正を自分で試す
それでも解決できない場合のみ「試したこと」を添えて質問する。

**Y. 実装前にコードベースを先読み**
新機能を実装する前に `grep` / `glob` / ファイル読み込みで類似コンポーネント・関数・命名パターンを必ず検索する。
既存実装の再発明・スタイル不統一・命名の不整合を防ぐ。

---

## 💰 AI モデル選定（PP）

**DeepSeek V4 一択。DeepSeek公式APIを直接呼び出し、Pro / Flashを使い分ける。**
APIキーはグローバルメモリ管理（環境変数 `DEEPSEEK_API_KEY`）。

| 用途 | モデル | 経路 |
|------|--------|------|
| コーディング・JSON出力・大量生成 | DeepSeek V4 Pro | DeepSeek API直叩き |
| 軽量タスク・高速応答 | DeepSeek V4 Flash | DeepSeek API直叩き |
| 画像・PDF・マルチモーダル | DeepSeek V4 Pro | DeepSeek API直叩き |
| 複雑な推論・長文生成・アーキテクチャ設計 | DeepSeek V4 Pro | DeepSeek API直叩き |

---

## 🚀 デプロイ安全規約（SAFE-DEPLOY）

**commit 前の必須チェック（この順番で実行）**:
1. `git status --short` — untracked ファイルゼロを確認（module-not-found の温床）
2. `npm install <pkg>` 経由で deps 追加（`package.json` 直接編集禁止）
3. TypeScript pre-check: `tsc --noEmit` でエラーゼロを確認
4. PowerShell で JSON/JS ファイルを編集した場合は BOM チェック: `head -c 3 <file> | xxd -p | grep -q efbbbf`

**deploy 完了の定義**:
- deploy webhook の HTTP 200 は「キュー成功」であって「build 成功」ではない
- 本番 URL で新コードの fingerprint を確認するまで完了とみなさない
- Paradigmjpcom は `npm run release:prod` のみを正式入口にする。互換の `npm run deploy:prod` も release gate へ入るが、`node scripts/sales-os-no-login-deploy.mjs` / Coolify webhook / UI 直叩きで完了扱いにしてはいけない。
- release gate は `release-doctor --pre-deploy` → DB/migration/seed → Coolify deploy → Traefik route refresh → `release-doctor --post-deploy` の順に完走して初めて完了。
- `NEXT_PUBLIC_SUPABASE_URL` / `SALES_SUPABASE_URL` が `http://supabase-rest-1:3000` の場合、それは Docker 内部専用 URL。ローカル AI agent から REST fetch してはいけない。DB 検証・migration・seed は既存スクリプトの Postgres/DB SSH channel に任せる。
- Coolify `finished` 後に `paradigmjp.com` が 502 の場合、同じ deploy を再試行しない。まず Traefik file-provider の `paradigmhp-svc` upstream が最新 app container の coolify network IP を向いているかを確認する。正式 release script は自動修復する。
- Revenue OS の release gate は HTTP 200 だけで合格にしない。`/api/sales/health` は Coolify env の shared secret を使って JSON `ok:true` まで検査し、`ok:false` なら deploy 失敗。
- WW-EVENT の実体条件: 本番で `services-n8n-1` / cron / `pg_cron` / systemd timer / 常駐 polling worker が稼働していたら release 失敗。n8n は成果物 JSON の archive のみ許可し、runtime container は停止状態を維持する。
- Supabase Realtime はコード前提ではなくインフラ前提も必須。`supabase-db-1` は `wal_level=logical`、`supabase-realtime` は healthy、`public.sales_pipeline_runs` は `supabase_realtime` publication に含める。`/api/sales/pipeline/events` は `SALES_SUPABASE_REALTIME_URL` を使い、PostgREST (`supabase-rest-1`) に WebSocket 接続しない。
- Twenty は server が 200 でも worker 再起動ループなら不合格。`opt-twenty-worker-1` は restart count が低く、1GiB mem limit / `NODE_OPTIONS=--max-old-space-size=768` / worker 側 migrations disabled を維持する。

**ディスクを埋める2つの増加源（2026-08-10 対処済み・再発防止）**:
- **ビルドキャッシュ**: prune を年齢基準 (`until=168h`) からサイズ基準
  (`--keep-storage`) に変更した。1日に何度もビルドする運用では、溜まるのは常に
  新しいキャッシュなので7日保持では何も消えず、数時間で 12.48GB まで膨らんで
  ディスクが 97% に達した。サイズ上限なら積み上がる速さが変わっても頭打ちになる。
  既定は通常時 4GB / 逼迫時 2GB。`PARADIGM_BUILD_CACHE_KEEP_GB` で調整。
- **ローカルのバックアップ**: `OSS_SUPABASE_BACKUP_RETENTION_DAYS` の既定 14 日は
  1.2GB/日 × 14 = 約17GB になり、150GB のディスクでは deploy を止める側に効く。
  systemd drop-in で **3 日**に短縮した。全世代は Cloudflare R2 に残るので、
  ローカルは復旧の初動に足りる分だけ持つ。
- **消す前に必ず退避先そのものを確認する**。journald の保持は約5日しかないため、
  「ログに R2 アップロード記録が無い＝未退避」ではない。実際、記録の無かった
  5世代はすべて R2 に存在した。R2 の一覧は
  `/etc/paradigm/oss-supabase-backup.env` の認証情報で ListObjectsV2 を叩いて確認する。
- **スワップは削らない**。8GB×2 あるが両方使用中で、メモリは 15GB 中 9.1GB が
  スワップに出ている。消すと OOM で本番が落ちる。

**古い worktree から release を実行しない（2026-08-10 実害あり）**:
- `scripts/lib/refresh-traefik-origin-lock.py` の `PROTECTED_ROUTER_PRIORITY` が
  古い版では `1000` にハードコードされている。Coolify がコンテナラベルから生成する
  ルータは `100000` なので、古い版で release を実行すると **Traefik がラベル側を
  採用し、Cloudflare 限定ミドルウェアが一切効かなくなる**。
- 実際に `paradigmjp.com` / `www` / `keystatic` / `status` の4ホストが
  オリジンIPへ直接到達可能になり、偽装 CF ヘッダでも 200 を返す状態が発生した。
  WAF・レート制限・Bot 対策がすべて迂回されていた。
- release 前に必ず確認する:
  `grep -c "PROTECTED_ROUTER_PRIORITY = 200000" scripts/lib/refresh-traefik-origin-lock.py`
  が `1` であること。`0` ならその worktree から release してはいけない。
- 検証は `python3 scripts/lib/refresh-traefik-origin-lock_test.py`
  （優先度がラベル側を上回ることを検査する回帰テストを含む）。

**deploy 失敗時の即診断**:
- `module-not-found` → untracked ファイルの push 忘れ
- `EUSAGE: Missing from lock file` → `package.json` 手編集後に `npm install` 忘れ
- `ENOSPC` → `docker builder prune -af && docker image prune -af` を実行
- `fetch failed` / `ETIMEDOUT` が Supabase REST 検証で連発 → `supabase-rest-1` 内部 URL をローカルから叩いている。再試行せず `scripts/verify-db-tables.mjs` / `release:prod` の SSH/psql fallback を使う。
- `The operation was aborted due to timeout` → 例外だけで判断しない。直前の URL 名・Coolify deployment UUID・`deploy-status`・post-deploy smoke を確認し、同じ操作を無限再試行しない。
- `paradigmjp.com` だけ 502 で container 内 `127.0.0.1:3000/api/ready` が OK → アプリではなく Traefik upstream drift。`release:prod` の route refresh を通す。
- `Coolify deployment monitor timed out` → deploy は cancel しない。`node scripts/deploy-status.mjs <deployment_uuid>` で状態確認し、finished 後は post-deploy smoke を実行する。
- `/api/sales/health` が HTTP 200 でも JSON `ok:false` → 成功扱い禁止。Payload DB / Supabase / Trigger / worker などの failing check を直してから再 deploy。
- Realtime SSE が snapshot だけで更新されない → `supabase-realtime` container、`wal_level=logical`、publication、`SALES_SUPABASE_REALTIME_URL` を順に確認。cron/polling で代替しない。

---

## 📝 共通コーディング規約

1. コードは省略なし・完成形で提示する
2. UI テキストはプロジェクトの言語設定に従う（Paradigm 系プロジェクトは日本語統一）
3. コミットメッセージは `feat:` `fix:` `docs:` `refactor:` `chore:` プレフィックスで統一
4. 環境変数は `.env.example` として記録（実値は書かない）
5. 外部 URL は必ず新規タブで開く — `target="_blank" rel="noopener noreferrer"` 必須
6. `<img>` に `alt` 必須・インタラクティブ要素に `aria-label` 付与
7. TypeScript `any` 多用禁止（3 箇所以上で即リファクタ）
8. 1 ファイル 500 行超え禁止
9. エラーのサイレント握りつぶし禁止（`catch {}` は存在してはならない）
10. `alert()` / `confirm()` / `prompt()` 禁止 — Sonner toast / shadcn Dialog で代替
