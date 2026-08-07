# Coolify / Supabase OSS Repair Log

Updated: 2026-05-30

## Current Production State

- Coolify and Traefik are running on `178.105.138.55`.
- Docker log rotation is configured in `/etc/docker/daemon.json`.
- Legacy `appexx-host-janitor.timer` / host guard timers are superseded by event-triggered one-shot recovery guards. Do not add cron/systemd timers for site operations.
- `supabase.paradigmjp.com` currently serves the Sales OS SSOT through PostgreSQL + PostgREST + Studio + Postgres Meta.
- The current Supabase OSS stack is not yet a full Supabase Cloud replacement because Kong, Auth, Storage, and Realtime are not deployed.

## Repairs Applied

- Applied Sales OS runtime migrations 022-025 directly to the production Supabase OSS database.
- Verified the following SSOT tables exist, have RLS enabled, and are granted to `service_role`:
  - `sales_content_templates`
  - `sales_agent_commands`
  - `sales_agent_events`
  - `sales_integration_status`
  - `sales_platform_health_snapshots`
- Seeded `sales_content_templates` with 256 Japanese/English asset templates.
- Persisted integration-status snapshots for 36 API/OSS integrations.
- Inserted operational health snapshots for Coolify, Supabase DB, PostgREST, full-stack gap state, and the Sales OS app.
- Removed hardcoded Supabase secrets from the repository compose template and converted it to required environment variables.

## Guardrails

- Do not run `docker system prune --volumes` on this host. Volumes hold production databases.
- Do not blindly replace the current Supabase containers with a full-stack Supabase compose. First take database backups, generate fresh JWT/API keys, and plan Kong/Auth/Storage/Realtime cutover.
- Treat `https://supabase.paradigmjp.com/rest/v1/` as the current stable SSOT API path.
- Treat `https://supabase.paradigmjp.com/auth/v1/health` returning 404 as expected until Auth/Kong is deployed.

## Next Hardening Step

For full Supabase parity, deploy a separate staged stack first:

1. Back up `paradigm-supabase-db`.
2. Generate fresh `SUPABASE_JWT_SECRET`, anon key, and service-role key.
3. Add Kong, GoTrue Auth, Storage API, Realtime, and Imgproxy in staging.
4. Point only staging DNS to Kong.
5. Run app smoke tests against staging.
6. Cut over production only after `/rest/v1`, `/auth/v1`, `/storage/v1`, and `/realtime/v1` all pass.

## 2026-08-07 — supabase.paradigmjp.com 502 の復旧

### 症状
`https://supabase.paradigmjp.com/` および `/rest/v1/` が 502。`supabase-db-1` と `supabase-rest-1` は Up かつ healthy だった。

### 原因（2つ）
1. **Traefik のルートが存在しないコンテナを指していた。** `supabase-svc` は `supabase-studio-1:3000`、`supabase-api-svc` は `supabase-api-proxy:80` を参照していたが、どちらのコンテナも存在しなかった。`/opt/supabase/docker-compose.yml` には db / rest / realtime / meta / studio の5サービスが定義されているのに、稼働していたのは db と rest の2つだけだった。
2. **PostgREST はテーブルを `/{table}` で公開する**が、Traefik はパスを剥がさずに `/rest/v1/{table}` のまま転送していた。この prefix 除去を担っていたのが、消えていた `supabase-api-proxy` だったと考えられる。

### 対処
1. `cd /opt/supabase && docker compose up -d meta studio realtime` — db と rest には触れず、欠けているサービスだけを明示的に起動した。
2. `paradigmjp.yml` の `supabase-api-svc` のバックエンドを `http://supabase-api-proxy:80` から `http://supabase-rest-1:3000` へ変更（`supabase-rest-1` は compose で coolify ネットワークに定義済みのエイリアス）。
3. 同ファイルに `supabase-rest-strip`（`stripPrefix: /rest/v1`）middleware を追加し、`supabase-rest-https` ルータに適用。

### 結果
- Studio: 307（Studio の通常のリダイレクト）
- `/rest/v1/`: 200
- Sales OS の SSOT テーブル（`sales_content_templates` / `sales_agent_events` / `sales_integration_status`）へ service_role で 200 応答を確認

変更前に `paradigmjp.yml.bak-supabase-fix-<timestamp>` を作成済み。

### 未対応の課題
- `/opt/supabase/docker-compose.yml` に **PostgreSQL パスワードと JWT シークレットが平文で書かれている**（`POSTGRES_PASSWORD`、`PGRST_JWT_SECRET`）。JWT シークレットは既定値のままの文字列を含む。環境変数への外出しとローテーションが必要。
- studio / meta / realtime が停止していた原因は特定できていない。再発した場合はコンテナの終了理由を確認すること。
- ディスク使用率 87%。

## 2026-08-07 — ディスク逼迫 (89%) の根本解決

`/` が 150GB 中 89% まで到達し、作業中もさらに増え続けていた。Supabase の studio/meta/realtime が停止していた原因もこれである可能性が高い。

### 根本原因（3つ）

**1. Redis の失敗した BGSAVE 残骸 12.2GB（最大要因）**

`opt-twenty-redis-1`（Twenty CRM の Redis）のボリュームに `temp-*.rdb` が5個、計12.2GB 残留していた。実際の `dump.rdb` は 45MB。Redis は BGSAVE 完了時に temp を `dump.rdb` へリネームするが、**失敗した場合は削除せず放置する**。

`maxmemory` が未設定（0B=無制限）だったためデータセットが 2.9GB まで膨張し、保存が失敗。以後 **ディスク逼迫 → BGSAVE 失敗 → 残骸増加 → さらに逼迫** という自己増強ループに入っていた。

対処: 孤児 temp を削除し、`/opt/twenty-compose.yml` の redis に `--maxmemory 1gb --maxmemory-policy noeviction` と `mem_limit: 1500m` を設定。通常使用は約150MB なので約7倍の余裕があり、暴走時は書き込みが明示的に失敗して気づける。

**2. cloudflared-ssh.service の無限再起動（syslog 191,780行）**

`ExecStart=/usr/local/bin/cloudflared access tcp --hostname ssh.paradigmjp.com --url localhost:22` は**クライアント側で実行するコマンド**で、サーバー上では sshd が保持する 127.0.0.1:22 に bind できず必ず失敗する。`Restart=always` と組み合わさり **NRestarts=85,645**。一度も成功していない。

対処: `systemctl disable --now cloudflared-ssh.service`。`cloudflared-openclaw.service`（正常稼働中の別トンネル）と直接 SSH には影響なし。

**3. 同一 DB に対する二重バックアップ**

| | `db-backup.service` | `oss-supabase-backup.service` |
|---|---|---|
| 内容 | 単一 pg_dump・平文 | pg_dump×2 + pg_dumpall・GPG暗号化 |
| 保管 | ローカルのみ | R2 へオフサイト（毎日成功を確認） |
| 増加 | 約0.6GB/日 | 約1.2GB/日 |

前者は後者に完全に劣後していた。対処: `db-backup.timer` を無効化し、移行用に直近2件を残して6件削除。

### その他の回収
- Docker ビルドキャッシュ 3.7GB
- npm キャッシュ・`/root/.cache` 約2GB
- journald を 200MB へ vacuum（310MB 回収）

### 結果
**89% → 74%（38GB 空き）**。コンテナ55個すべて正常、Twenty も 200 応答を維持。

### 残る課題
- `/opt/supabase/docker-compose.yml` と `/opt/twenty-compose.yml` に **DB パスワード・JWT シークレット・Supabase キーが平文**で記載されている。`APP_SECRET` と `PGRST_JWT_SECRET` は `change_me` を含む既定値のまま。環境変数への外出しとローテーションが必要。
- `docker-network-fix.service` と `cloud-init-hotplugd.service` が failed 状態。
- 定常的な増加要因は oss-supabase バックアップ（約1.2GB/日・14日保持で頭打ち）とイメージ55.8GB。**新たな cron / systemd timer は WW-EVENT ルールにより追加していない。**

## 2026-08-07 — シークレットのローテーションと failed ユニットの解消

### JWT シークレットのローテーション（完了）

`PGRST_JWT_SECRET` が `paradigm_jwt_secret_change_me_2026_changeme` という既定値のままだった。**これを知っていれば service_role の JWT を偽造でき、公開されている `https://supabase.paradigmjp.com/rest/v1/` 経由で DB を全操作できる**状態だった（DB ポート自体は外部露出していないが、REST は公開されている）。

消費者の全体像:

| 消費者 | 対象 |
|---|---|
| `/opt/supabase/docker-compose.yml` | `PGRST_JWT_SECRET`（署名鍵）3箇所 |
| `/opt/twenty-compose.yml` | anon / service_role |
| `dotfiles/infra/token-registry.json` | 4件 |
| Coolify `paradigm-hp` env | 5件（production + preview） |

無効時間を最小化するため次の順序で実施した。**Coolify env を先に更新 → paradigm-hp をデプロイ（この間も旧鍵は有効なのでサイトは動く）→ デプロイ完了後に PostgREST を切替 → 消費者を再起動。**

結果: 新鍵で REST 200、**旧 service_role は 401 で拒否**を確認。paradigmjp.com / ai-tools / twenty / supabase すべて正常。

### 注意点（次回のために）

- **Coolify API の `value` は一覧で20文字に切り詰められる。`real_value` が実値。** これで照合すると必ずミスする。
- Coolify の env PATCH に `uuid` を含めると 422（`This field is not allowed.`）。
- Coolify API は Python の urllib だと Cloudflare に 403 で弾かれる。curl を使う。
- `opt-twenty-server-1` は **compose 管理外（手動 docker run 作成）**。compose を書き換えても反映されないため、鍵の更新には再作成が必要。稼働中コンテナには compose に無い `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` があり、compose 側に補完した。
- Traefik は Twenty を **IP 直指定（`10.0.1.4:3000`）** していた。コンテナ再作成で壊れるため、エイリアス `twenty-server` 参照へ変更した。切替時に一時的に 502 になったので、エイリアス付与と同時に行うこと。

### failed ユニットの解消（完了）

**`docker-network-fix.service`** — 存在しないコンテナ (`services-paperclip-1` / `paradigm-outreach-worker`) への接続を試み、ループ末尾の `docker network connect` が非ゼロを返してサービス全体が failed になっていた。存在確認・接続済み判定・明示的な `exit 0` を持つ `/usr/local/sbin/docker-network-fix.sh` に置き換え、`twenty-server` エイリアスの維持も担わせた。

**`cloud-init-hotplugd.service`** — Docker が veth インターフェースを頻繁に作り消しするため udev フックが発火し、**7日で161回失敗**して毎回 Python トレースバックをログに書いていた（`RuntimeError: Failed to detect False in updated metadata`）。この環境では成功しえないので `90-cloud-init-hook-hotplug.rules` を無効化し、socket も停止。元ファイルは `/root/` に退避。

failed ユニットは 0 件になった。

### 残作業

- `opt-twenty-server-1` の再作成（新 Supabase 鍵と新 `APP_SECRET` の反映）。compose 側は更新済みだが、稼働中コンテナは旧値のまま。Twenty の UI 自体は動作しているが、Twenty 内の Supabase 連携は 401 になる。
- Postgres のパスワード（`supabase2026pass` / `twenty_secret_2026`）は未ローテーション。**DB ポートは外部露出しておらず UFW も 22/80/443/3001 のみ許可**のため遠隔からの悪用は不可。優先度は JWT より低い。
- **作業中に fail2ban で SSH が繰り返し遮断された。** 短時間に多数の SSH 接続を張ったため。今後は `ControlMaster` による多重化で1接続に集約すること。
