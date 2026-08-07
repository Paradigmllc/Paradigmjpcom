## ACTIVE HANDOFF - 2026-08-07 Supabase 復旧完了 / 視覚素材が次の実装

### 前回ハンドオフの「Supabase は起動操作のみ残」は誤り。3つの罠があった

1. **Coolify サービス `kw7m6sd5otbouk4h0ydpniwn` を起動してはいけない。**
   別ボリュームの**空の PG15**（`kw7m6sd5otbouk4h0ydpniwn_supabase-db-data` = 72M / PG_VERSION 15）を指している。
   実データは旧スタック `/opt/supabase`（compose project `supabase`）の
   `supabase_supabase-db-data` = **4.1G / PG_VERSION 16**（`postgres:16-alpine`）。
   JWT シークレットを引き継いでいるため anon/service キーは**通ってしまう**。
   接続成功・全テーブル0件というサイレント失敗になる。PG16 データを PG15 バイナリでは開けないので
   ボリューム差し替えでも解決しない。Coolify 移行は独立した課題として判断すること。

2. **`SALES_SUPABASE_URL`（.env.local 145行目）が旧 DigitalOcean droplet のまま。**
   `https://supabase-paradigm.139.59.250.5.sslip.io` を指している。前回直したのは
   `NEXT_PUBLIC_SUPABASE_URL`（47行目）だけ。139.59.250.5 は旧 Appexxme 時代の廃止済みホスト。

3. **Traefik の `/rest/v1` 経路が壊れている。** `paradigmjp.yml` の `supabase-api-svc` は
   `http://supabase-api-proxy:80` を指すが、**そのコンテナは存在しない**（`docker ps -a` に無し）。
   `supabase.paradigmjp.com` 本体は `supabase-studio-1:3000` に向いている。
   公開 URL 経由の REST は 502 になる。内部 docker ネットワーク経由なら `supabase-rest-1` で疎通する。

### 今回やったこと（2026-08-07）

- 旧スタックは 00:29 UTC に**全5コンテナが同時 SIGTERM で正常停止**していた（`OOMKilled=false`、db は exit 0）。
  クラッシュではないので、既存コンテナをそのまま `docker start` で復帰させた（compose 再作成なし＝設定・ボリューム無変更）。
- `docker start supabase-db-1` → healthy / `docker start supabase-rest-1` → schema cache 409 relations。
  メモリ増加は約 120MB のみ。realtime と studio は**起動していない**
  （realtime は停止時に `system_memory_high_watermark` アラームが有効だった。必要になるまで止めておく）。
- `migration_060_youtube_review.sql` は**未適用だった**ので適用した（冪等・追加のみ・トランザクション）。
  `yt_channels` / `yt_videos` / `yt_review_events` を作成、3表とも RLS 有効・service_role のみ・anon SELECT 拒否。
  postgrest は 409 → **412 relations** を認識。
- `npx vitest run src/lib/youtube` = **148 passed / 10 files / 2.41s**。

### 視覚素材: SVG 図表を実装済み（2026-08-07）

`render/figures.ts` を追加した（`b5c92e91` / `a97996c4`）。正規化済み items から図を組み立てる。
外部素材を取りに行かないのでネットワーク・APIキー・GPU・第三者の権利が一切絡まない。

- stat = 割合なら円弧ゲージ、それ以外は下線付きの大きな数値
- columns = 数値が2つ以上あるときだけ比較棒グラフ（幅は最大値に対する比）
- timeline = marker が2つ以上あるとき横軸に点を打つ
- quote / headline = 文字組みそのものが表現なので図を足さない
- **数値が読めなければ空文字を返す**。根拠の無い飾りの図形は出さない（事実性の担保）
- 段階表示は既存の `data-beat` に載せた。GSAP が `[data-beat='N']` を拾うので図の各行が本文と同時に出る
- 幾何は items から決定論的に導く。HyperFrames は任意時刻へシークするため乱数・現在時刻は混ぜられない

**併せて `normalizeItem` のデータ欠落を直した。** `{name:"中国", value:"820万台"}` のような項目で
最初の内容キーだけを読んで `820万台` を捨てていた。図表だけでなく本文の col-marker からも
数量が消えていたので、時間軸キーが無いときに限り未使用の内容キーから数値を marker に採る。

検証: `npx vitest run src/lib/youtube` = **171 passed / 11 files**、tsc エラー0。
実台本相当のフィクスチャで 3/3 シーンに SVG が入り、棒の比率も一致することを確認済み。
（ESLint はこのブランチに設定ファイルが無く実行できない。既存の状態。）

### 実レンダリング検証で出た欠陥（2026-08-07・`ea40341a`）

`hyperframes check --snapshots` で実フレームを見て3件見つけた。**HTML の中身が正しくても
フレームを見ないと分からない種類のものばかりだった。**

1. **レンダリングホストに日本語フォントが1つも入っていなかった（最重要）。**
   `fc-list :lang=ja` が **0件**、フォント総数8。コンポジションは `"Noto Sans JP", sans-serif` を
   指定しているので、CJK が全て豆腐（□）になっていた。見出し・SVG ラベル・「出典 1件」が全滅。
   `apt-get install -y fonts-noto-cjk` + `fc-cache -f` で解消（30件認識）。
   **恒久対策が必要**: このホストに手で入れただけなので、Docker / Lambda / Cloud Run など
   別環境でレンダリングした瞬間に再発する。レンダリング用イメージ側にフォントを焼くこと。
   過去に「実データで3分43秒の動画を生成済み」とあるが、その動画も見出しが豆腐だった可能性が高い。

2. **stat で数値が二重に描かれ衝突していた。** 図のゲージと `.stat-value`(168px) が同じ数字を
   出し、`check` が `content_overlap` を error 報告。図がある場合は数値をゲージに任せる形に修正。

3. **timeline の図を削除した。** 既存の `<ol class="tl">` と内容が完全に重複するうえ、
   横軸へ等間隔に点を打つ実装は「2024/2025/2030」でも等間隔に見え、実際の年数差を偽る。
   図は **stat（円弧ゲージ）と columns（比較棒）の2種のみ**。

検証結果: `hyperframes check` = OVERALL ok / layout error 0 / contrast 29/29 通過 / runtime error 0。
lint の warning 32件は `hyperframes.ts` が元から出している `composition_self_attribute_selector` で
今回の変更とは無関係。

### 紙芝居からの脱却: 図表を動かした（2026-08-07・`102156d5`）

入場フェードのあと画面が完全に静止しており、実質「紙芝居」だった。データそのものを動かす。

- **リング**: `stroke-dasharray` / `dashoffset` を掃く。-90度回して12時から時計回り。
  半径と円周を同じ定数から出しているので実行時の `getTotalLength()` は不要。
- **棒**: `scaleX` で左端を原点に伸ばす。**`width` / `height` のトゥイーンは HyperFrames で禁止**。
- **数値**: 0から実数へ数え上げ。`onUpdate` は `textContent` の書き換えだけ（O(1)）。
  桁揺れ防止に `.figure text { font-variant-numeric: tabular-nums }`。
- **値ラベル**: 棒の先端に付いて動く（`x` の transform）。棒と同じ尺・同じイーズで着地。
- **静止の解消**: 本文を尺いっぱいかけてゆっくり上へ流し、背景ドリフトとの視差を作る。

**時刻は `figures.ts` に持たせない。** `data-*` に終値だけを置き、尺とビート時刻を知っている
`hyperframes.ts` 側でトゥイーンを組む。両方に時刻を書くと二重管理になる。

比較棒グラフが項目名と値を両方描くため、重複する `.columns` のカードは図があるとき出さない
（stat と同じ理由）。

**実 MP4 で検証済み**: 1920×1080 / H.264 / 30fps / 18.9秒 / 567フレーム / 4.9MB、
レンダリング 1分22秒（3 worker）。`ffmpeg` で抜いたフレームが t=0.9s→30%、t=1.3s→44% と
数え上げ中であることを確認。プレビューだけでなくエンコード後の動画に動きが入っている。

`hyperframes check` = OVERALL ok（runtime 0 / layout error 0 / contrast 0 / motion 0）。
`index.motion.json` で `appearsBy` `staysInFrame` `keepsMoving` を検査している。
175 tests passed / tsc エラー0。

**注意**: `keepsMoving` に `withinSelector` でシーンを指定すると、そのシーンが画面に出ていない
区間まで「静止」と判定されて必ず落ちる。時間窓を指定する手段が無いので、シーン単位ではなく
コンポジション全体に掛けること。

### 次のアクション

1. **レンダリング環境へのフォント焼き込み（先にこれ）** — 上記1の恒久対策。
   別環境でレンダリングすると日本語が豆腐に戻る。実測でレンダリングは
   18.9秒の動画に1分22秒・3 worker で CPU を占有するので、本番同居ホストでは負荷に注意。
2. **視覚素材の残り** — SVG 図表は入った。実写が要るなら Openverse / Wikimedia（APIキー不要）だが、
   CC-BY は表示クレジット義務があるため、収益化チャンネルではライセンス種別・帰属表記・
   非商用除外を機械的に守る実装と品質ゲート側の権利チェックが必須。ComfyUI 経路は未着手。
3. 投稿層 — YouTube Data API OAuth + private アップロード + Telegram 承認通知。
4. Coolify への Supabase 移行方針の決定（上記の罠を解消してから）。
5. `SALES_SUPABASE_URL` を廃止済み droplet から `supabase.paradigmjp.com` へ直す。
6. Traefik の `supabase-api-svc` が存在しない `supabase-api-proxy` を指している件の解消。

### 注意

- ディスクが **92%（150G中12G空き）**。docker の再利用可能領域が約10GB
  （build cache 6.07GB + dangling image 4.0GB）。動画レンダリングは大きなファイルを書くので事前に確認すること。
- 本番サイトと Twenty CRM が同居。重い処理の前に `free -h` の**実使用量**を見る（`limits_memory` 設定値ではない）。

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
