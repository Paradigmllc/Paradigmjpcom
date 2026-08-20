# revenueos-twenty-bridge

RevenueOS ⇄ Twenty の双方向同期を **イベント駆動**にする常駐ブリッジ。
`revenueos-twenty-sync.timer`（60秒ごとの systemd timer）を廃止し、その役割を DB イベント
（Postgres `LISTEN`/`NOTIFY`）に置き換えたもの。ポーリングなし＝アイドル時は CPU ほぼ 0。

## なぜ

旧構成は 60 秒ごとに `pull`(Twenty→RevenueOS, 100件全スキャン) と `writeback`(RevenueOS→Twenty, 3件)
を叩いていた。1 日 1,440 回の起動でサーバー負荷・メンテ口数が増え、「定期実行 NG」方針に反する。
実イベント（会社の追加/編集、レポート完成）が起きた時だけ動くように再設計した。

## 仕組み（2 方向とも DB イベント駆動）

```
① writeback (RevenueOS → Twenty)
   sales_companies.pipeline_status が 'report_ready' に遷移
     └─ Supabase trigger trg_twenty_writeback → pg_notify('twenty_writeback', <company_id>)
          └─ bridge が supabase-db-1 を LISTEN → POST /api/sales/companies/<id>/twenty-sync

② pull (Twenty → RevenueOS)
   Twenty で company を追加/編集/削除
     └─ Twenty trigger trg_revenueos_pull → pg_notify('twenty_pull', <company_id>)
          └─ bridge が opt-twenty-db-1 を LISTEN → (8s debounce) → POST /api/sales/twenty/webhook

③ 起動時 reconcile（1 回のみ・定期ではない）
   未同期の report_ready を writeback し、full pull を 1 回実行 → ダウン中の取りこぼしを回収。
```

- **HTTP `/pull/<PULL_TOKEN>`** も残してある。Twenty の *native* webhook が使えるようになったら
  そちらを targetUrl に向けるだけで DB trigger を外せる（現状の Twenty は raw-insert した
  `core.webhook` を worker が配送しないため DB event で代替している）。
- **`/health`** は `{ok, consecutiveFailures, pullPending, listening}` を返す（Docker HEALTHCHECK 用）。

## なぜ native webhook でなく DB trigger（pull 側）

この Twenty（`twentycrm/twenty:latest`）は `core.webhook` に直接 INSERT した webhook を
worker/server 再起動後も配送しなかった（GraphQL introspection も workspace の不正な
オブジェクト名 `美容サロン` で壊れており API 登録も不可）。そのため pull は
`workspace_….company` の DB trigger → NOTIFY で駆動する。関数は `public` に置き、
トリガーのみ company テーブルに付く。

## ループ防止

writeback の Twenty 更新は company を書き換えるので `twenty_pull` を撃つが、その pull が
Supabase を再書き込みしても `pipeline_status` の**遷移**は起きない（`trg_twenty_writeback` は
`OLD IS DISTINCT FROM NEW` の遷移時のみ発火）。よって writeback ⇄ pull の無限ループにならない。
連続イベントは 8 秒 debounce で 1 回の pull に束ねる。

## デプロイ / 再適用

`deploy.sh` がべき等。secret はコンテナ env / media-os volume から実行時に読み、
`/opt/revenueos-twenty-bridge/.env`（0600）に書く（git には置かない）。

```bash
scp -r ops/revenueos-twenty-bridge/* root@<host>:/opt/revenueos-twenty-bridge/
ssh root@<host> 'cd /opt/revenueos-twenty-bridge && bash deploy.sh'
```

### ⚠️ Twenty マイグレーション後の復旧

Twenty がデータモデル変更で `company` テーブルを作り替えると `trg_revenueos_pull` が
消えることがある（サイレント）。その場合 pull が止まる。復旧は **pull-trigger.sql を再適用**
するだけ：

```bash
ssh root@<host> 'docker exec -i opt-twenty-db-1 psql -U twenty -d twenty < /opt/revenueos-twenty-bridge/pull-trigger.sql'
```

保険として、ブリッジを再起動すれば起動時 reconcile が full pull を 1 回走らせる
（＝トリガーが一時的に外れても取りこぼしは次の再起動で回収される）。

## 監視

- 構造化ログ: `docker logs revenueos-twenty-bridge`（JSON 1行/イベント）。
- `/health` が `consecutiveFailures` を返す（連続失敗数）。Docker HEALTHCHECK が 60s ごとに叩く。
- 外部通知（Slack 等）は持たない。監視はログ + `/health` のみ。

## 旧 timer

`revenueos-twenty-sync.timer` は `systemctl disable --now` 済み。`.service` と
`/usr/local/sbin/revenueos-twenty-sync.sh` は**手動フル再同期**用に温存（`systemctl start
revenueos-twenty-sync.service` で 1 回だけ全同期）。二度と `enable` しないこと。
