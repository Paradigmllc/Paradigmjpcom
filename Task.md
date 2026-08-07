## ACTIVE HANDOFF - 2026-08-07 開発環境をサーバー側へ移設 / YouTube パイプライン継続

### まずこれを読む
作業場所は**ローカルではなくサーバー上**に移った。`paradigm-prod-01` の `/opt/dev/paradigmjpcom`（ブランチ `codex/quote-recovery-vertical-saas`）。
入り方は private リポジトリ `Gracecom1/paradigm-workstation` を clone して `CONNECT.ps1`（Win）/ `connect.sh`（Mac・Linux）を実行するだけ。接続情報と鍵はそのリポジトリにある（**public 化厳禁**）。

移設理由: 操作対象（Coolify / Hetzner / Vast.ai / Supabase / Twenty）が全てリモートで、ローカルに置く意味がない。テストはローカル 114 秒に対しサーバー 2 秒。動画レンダリングは CPU を数分占有するのでサーバー向き。

- Claude Code のプロジェクトキーは `-opt-dev-paradigmjpcom`。**作業ディレクトリのパスを変えると会話履歴が別プロジェクト扱いになる**ので変えないこと。
- 過去の会話ログと memory は `/root/.claude/projects/-opt-dev-paradigmjpcom/` にある。続きは `/resume` で選ぶ。

### 未コミットだったものの退避先（2026-08-07 に完了）
ローカルの作業ツリーにしか無かったファイルは、全て git に入れるか適切なリポジトリへ退避した。**ローカルPCを捨てても失われるものは無い。**

| 対象 | 退避先 |
|---|---|
| `scripts/revenueos-readiness-gate.mjs` / `scripts/lib/sales-supabase-client.mjs` / `scripts/unlock-payload-users.sh` | このリポジトリに追跡追加（`c4f8e346`） |
| creator スライス 15ファイル | `Gracecom1/hana-private` ブランチ `import/paradigmjpcom-slice-20260807` の `imports/paradigmjpcom-2026-08-07/` |
| `scratch/`（WordPress テーマ改修 24ファイル） | `Gracecom1/AI-Tool-Navi` ブランチ `import/paradigmjpcom-scratch-20260807` の `imports/paradigmjpcom-scratch-2026-08-07/` |
| `users.json` / `wp-source.html` | 0バイトのため削除 |
| `.env.local` / `.env.supabase` | **git には入れない**。実体はサーバー上。値の正典は `reference_api_keys.md`、必要な変数名は `.env.example` |

- creator スライスは `hana-private` が正規リポジトリで、**あちらの main の方が先に進んでいる**（attribution / metrics / social-posts などがある）。退避したのは checkout と content-jobs だけの初期版なのでマージしないこと。法人リポジトリへのコミット禁止は従来通り。
- **要対応**: `scratch/wp-ai-tools-ui/*.mjs` に Coolify の実APIトークンが平文で直書きされていた。退避時に `process.env.COOLIFY_API_TOKEN` へ書き換えたが、露出期間があったのでトークンのローテーションを検討すること。

### 次のアクション（優先順）
1. **Supabase 起動** — 最も詰まっている。Coolify にサービス定義済み（service `kw7m6sd5otbouk4h0ydpniwn`、5コンテナに削減、既存の anon/service キーがそのまま通るよう JWT シークレットを引き継ぎ済み）。起動操作のみ残。`.env.local` の URL は `supabase.paradigmjp.com` に修正済み（`supabase.appexx.me` ではない）。
2. **視覚素材の実装** — 現状の動画はテキスト主体で視覚的訴求が不足。Openverse と Wikimedia が API キー不要で使えることは確認済み。SVG 図表と ComfyUI 経路は未着手。
3. **投稿層** — YouTube Data API OAuth + private アップロード + Telegram 承認通知。

### 踏んだら壊れる箇所
- **本番サイト paradigmjp.com と Twenty CRM が同じサーバーに同居**している。重い処理の前に必ず `free -h`。このサーバーで `limits_memory`（設定値）を空き容量と読み違えて本番を 2 回落としている。実使用量を見ること。
- `paradigm-workstation` の `.gitattributes` にある `id_ed25519 -text` を消すと、clone 時に git が秘密鍵を CRLF に変換して壊す。Windows では鍵のパーミッションを絞らないと OpenSSH が鍵を無視する（`CONNECT.ps1` が実施）。
- Coolify API は権限不足のエンドポイントで 403 ではなく **200 + 空配列**を返す。空配列を「リソースが無い」と読むと誤診する。
- BullMQ で `priority` 付きジョブは `wait` ではなく `prioritized` に入る。`wait`/`active`/`delayed` が 0 でも滞留ゼロとは限らない（実際に 328,383 件の未処理ジョブを空と誤認しかけた）。
- API キーの正典は `~/.claude/projects/**/memory/reference_api_keys.md`。`**` の通り**全プロジェクト横断で探す**こと。Hetzner や Coolify の鍵は別プロジェクト配下にある。

## ACTIVE HANDOFF - 2026-08-02 Vertical SaaS direction

- Product direction is fixed on an industry-specific vertical SaaS; the global PLG/OSS-wrapper consumer SaaS discussion is explicitly out of scope for this initiative.
- Default first wedge: quote follow-up and dormant-opportunity recovery for Japanese industrial machinery manufacturers, machinery trading companies, and adjacent equipment businesses.
- Go-to-market model: one shared workflow engine, prove paid retention in one narrow industry, then expand only to adjacent industries that can reuse at least 80% of the product.
- Pricing hypothesis to validate: 14-day reverse trial, Starter at JPY 29,800/month, Team at JPY 49,800/month, annual prepayment, and optional migration/onboarding packages.
- Acquisition hypothesis: distribute a no-login quote-neglect diagnostic to companies with visible intent signals such as trade-show participation, quote-request forms, sales-operations hiring, or multiple sales offices; prioritize product-qualified usage over raw registrations.
- Existing RevenueOS company collection, signal scoring, CRM, pipeline, notifications, and operational monitoring should be reused for acquisition operations. The customer-facing vertical SaaS must remain a separately scoped product surface and data model.
- MVP scope was validated against current manufacturing workflow and CRM/quote-management competitors. The initial production slice deliberately validates the riskiest assumptions before building tenant/auth/billing: no-login CSV diagnostic, explainable recovery priority, aggregate-only measurement, and qualified 14-day pilot inquiry.
- Implemented `/[locale]/quote-recovery` with Japanese Stripe-style responsive UI, CSV upload/sample flow, visible parse errors, aging buckets, monetary KPIs, explainable candidate ranking, loading/empty/error states, and a pilot form.
- Implemented `/api/quote-recovery/diagnose` and `/api/quote-recovery/pilot` with Zod validation, request-size/rate limits, structured error responses, Supabase persistence, and DB + Slack notification for pilot inquiries.
- Added `migration_059_quote_recovery_validation.sql`: aggregate diagnostic events and pilot inquiries only, RLS enabled, anon/authenticated grants revoked, service-role policies explicit. Raw quote rows are never persisted by this slice.
- Added unit coverage for Japanese/quoted CSV parsing, required-field rejection, rule-based prioritization, and exclusion of closed quotes. `npx tsc --noEmit --pretty false` passes. Vitest is currently blocked before test discovery by the pre-existing incomplete `node_modules/@vitest/utils` installation (`dist/constants.js` missing); repair dependencies without overwriting the user's in-progress package/lock changes, then rerun.
- Validation gates before building the authenticated SaaS core: confirm actual CSV import completion, candidate-ranking acceptance, pilot conversion, and repeated weekly use. Only then add organization membership, quote/activity persistence, reminders, invites, and billing; email auto-send, quote creation, OCR, and black-box AI scoring remain out of scope.
## CURRENT STATUS - 2026-08-02 AI creator direct-pay vertical slice

- Character direction is fixed: no central rose/gun tattoo; only the supplied floral tattoo reference on the right lateral abdomen/flank. Added the safe clothed master at `public/creator/character-master-v1.png`.
- Added an age-gated creator LP at `/[locale]/creator` with DB-backed offers, empty/error/loading states, and external Solana Pay USDC checkout.
- Added server-side checkout creation with a unique Ed25519 reference, private status token, finalized on-chain USDC validation, expiry handling, entitlement creation, and one-use Telegram invite delivery.
- Added authenticated creator operations at `/[locale]/admin/creator` plus `/api/creator/content-jobs`; jobs persist in Supabase and can dispatch to the existing n8n/Vast.ai/ComfyUI lane with `start-on-demand-stop-after-upload` policy.
- Added Supabase migration `20260802022541_creator_platform_foundation.sql`; all five tables have RLS enabled, anon/authenticated access revoked, and service-role-only grants.
- Crossmint was excluded because its official review policy prohibits adult content including qualifying AI-generated content. MoonPay was excluded because its terms forbid certain sexually oriented materials/services. Telegram crypto is kept off-platform: the external LP uses Solana Pay, while Telegram only receives an invite after validated payment.
- Verification: creator payment core TypeScript files passed an isolated TypeScript compile before dependency repair was attempted; `git diff --check` passes. Full Vitest/build remain blocked by the pre-existing incomplete `node_modules` (`@vitest/utils/dist/constants.js`, React, Payload and other packages missing). `npm ci` and a no-save TypeScript restore both stalled without output and were stopped; tracked package/lock changes were not overwritten.
- Release blocker: current branch is the unrelated `codex/quote-recovery-vertical-saas` with user-owned dirty `package.json`/`package-lock.json` changes. Do not commit this creator slice into that branch or deploy adult content under the Paradigm corporate domain. Move the listed creator files into a dedicated repo/domain, configure `CREATOR_SOLANA_RECIPIENT`, Telegram bot/chat, Solana RPC, and creator content webhook, then apply the migration and run build/E2E before release.

## CURRENT STATUS - 2026-08-07 YouTube 複数チャンネル自動運用パイプライン

### 実装済み (src/lib/youtube/)
- **形式レジストリ** (`formats/`): チャンネル形式を型ではなくデータとして定義。`definitions/` に1ファイル追加すれば新形式が増える。現在6形式 (manim解説 / ニュース / 漫画風 / キャラアバター / アニメ風 / 英語Shorts)。
- **品質ゲート** (`quality/`): 収益化剥奪を防ぐ公開前検査。反復性(文字3-gram Jaccard + 構成指紋)、情報密度、未検証の断定、メタデータ整合、合成メディア開示を機械判定。inauthentic content 判定はチャンネル全体の反復性で決まるため、直近N本との差分を測る設計。
- **リサーチ層** (`research/`): Google News RSS + Hacker News (どちらも無認証)。Reddit は 2026-08 時点で匿名JSONが403のため OAuth 必須。YouTube Data API は quota.ts が太平洋時間の暦日で管理 (search=100 units)。
- **台本層** (`script/`): 構成案 → シーンごと本文 → メタ情報 の3段階逐次生成。一括生成では qwen2.5:14b が390〜490文字で頭打ちになり密度不足で通らなかったため。逐次化で985〜1284文字に到達しゲート通過を実測。
- **レンダリング** (`render/`): HyperFrames コンポジション生成。visualSpec の構造 (timeline/columns/stat/quote) を解釈し、項目ごとのビート、edge-tts の発話区間から同期字幕、全編背景モーションを付与。
- **審査層** (`review/`): 公開前の人間承認。ゲート通過 ≠ 公開可能 (実測でゲート通過台本が出典に無い税率を創作) のため必須。migration_060_youtube_review.sql + /api/youtube/review + /[locale]/admin/youtube。

### 検証状況
- 157テスト通過 / 型エラー0。`npm test -- src/lib/youtube` で実行可能。
- 実データ (Google News 実記事 → 台本 → 3分43秒の動画) を通しで生成済み。
- LLM は OSS 既定 (`YOUTUBE_SCRIPT_LLM=oss`、OpenAI互換)。Dify Cloud は環境変数で切替。

### 次のアクション
1. 視覚素材の実装 — 現状はテキスト主体で視覚的訴求が不足。無料経路(Openverse / Wikimedia / SVG図表)と ComfyUI 経路の両方が未着手。
2. Supabase 起動 — Coolify にサービス定義済み (5コンテナに削減、既存キーが通る env 設定済み)。起動操作のみ残。
3. 投稿層 — YouTube Data API OAuth + private アップロード + Telegram 承認通知。

### インフラで解決した問題 (2026-08-07)
- **Twenty CRM の worker が server として起動していた** (`/opt/twenty-compose.yml` に command 指定漏れ)。2026-06-17 から328,421件のジョブが未処理で蓄積し、redis が 10.39GB まで肥大、swap枯渇・load average 332・OOM Killer 発動の原因になっていた。`command: ["node", "dist/queue-worker/queue-worker"]` の追加で解決。redis 129MB / load 1.64 に回復。
- node_modules の破損は `npm ci` で解消済み。

## 完了済みの記録

- 2026-06-18〜2026-08-02 の RevenueOS / Astro demo / 日本市場オペレーター関連は [docs/handoff-archive/2026-06-to-08-completed-status.md](docs/handoff-archive/2026-06-to-08-completed-status.md) に退避。
