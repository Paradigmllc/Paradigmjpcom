# Paradigm Outreach Worker — SPA フォーム専用オプション (Playwright Stealth × Crawlee)

> ⚠️ **既定では不要。** 標準フォーム (CF7/WPForms/素の POST) は Next アプリ内の
> `HttpFormProvider` (ブラウザ不要 HTTP 送信) が捌くため、サーバー増設なしで動く。
> 本ワーカーは **JS-only な SPA フォーム** という少数ケース専用の将来オプション。
> **共有 Droplet にローカル Chromium を常駐させない方針** → 使うなら `CDP_ENDPOINT` に
> managed リモートブラウザ (案1) を指定し、この箱には Chromium を置かない。

Next アプリ (`src/lib/sales/outreach/browser-provider.ts` の `RemoteWorkerProvider`) から
HTTP で委譲される実ブラウザ送信ワーカー。判断 (discovery/classify/preflight) は Next 側で済み、
本ワーカーは「重い Chromium 操作」だけを担う。

## なぜ別パッケージか（ディスク/メモリ安全）

- Next アプリ (Coolify `paradigm-hp`) に `playwright`/`crawlee` を入れない → 本体イメージを軽量に保つ。
- 共有 Droplet (4vCPU/8GB・appexx.me と同居) で Chromium を**常駐させない**。
- **案1 (推奨・ディスク最安)**: `CDP_ENDPOINT` にリモートブラウザ (Steel-Browser 等) を指定 → ローカル Chromium 不要。
- **案1b**: `CDP_ENDPOINT` が空でも `STEEL_BASE_URL` があれば worker が CDP URL を自動生成。
- **案2**: `CDP_ENDPOINT` 空 → ローカル Chromium を起動。Coolify で **scale-to-zero**（バッチ時のみ起動）にする。
- `MAX_CONCURRENCY=2`・context 使い捨て・`CAPTURE_EVIDENCE=false` でディスク膨張を防ぐ。

> 案1/案2 の切替は worker 内の env だけで完結。Next 側は `OUTREACH_BROWSER_PROVIDER=remote` +
> `OUTREACH_WORKER_URL` / `OUTREACH_WORKER_SECRET` を向けるだけ（コード変更不要）。

## エンドポイント

| Method | Path | 用途 |
|--------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/submit` | `{ formUrl, fields, message, dryRun }` → Playwright Stealth `SubmitFormResult` |
| POST | `/submit` | `{ url, fields, message, dryRun }` → Stagehand `SubmitFormResult` |
| POST | `/discover-form` | `{ url }` → `{ formUrl }` (Stagehand contact-form discovery) |
| POST | `/discover-spa` | `{ homeUrl }` → `{ formUrl }` (Layer C: SPA フォーム追跡) |

`/submit` `/discover-form` `/discover-spa` は `X-Worker-Secret: $WORKER_SECRET` または
`Authorization: Bearer $WORKER_SECRET` 必須。Next.js `StagehandProvider` は Bearer を使う。

## ローカル開発

```bash
cd worker
npm install
npm run install:browser   # 案2 のときだけ (Chromium DL ~ 全部で 300MB+)
cp .env.example .env       # WORKER_SECRET を設定
npm run dev
```

## Coolify デプロイ (scale-to-zero / 案2)

1. 新規サービス `paradigm-outreach-worker`（Dockerfile or Nixpacks）。
2. Build: `npm ci && npm run install:browser`。Start: `npm start`。
3. env: `WORKER_SECRET` / `MAX_CONCURRENCY=2` / `CAPTURE_EVIDENCE=false`。
4. Stagehand を有効化する場合は `STAGEHAND_LLM_API_KEY` か `DEEPSEEK_API_KEY`、および `CDP_ENDPOINT` または `STEEL_BASE_URL` を設定する。
5. Next 側は `STAGEHAND_URL=https://<worker-domain>`、`STAGEHAND_API_KEY=$WORKER_SECRET` を設定する。
6. **idle 時に停止**する設定（常時稼働禁止・グローバル GPU Serverless 思想と同じ）。

## 案1 (リモートブラウザ・Chromium をこの箱に置かない)

1. Steel-Browser を別の安い VPS (Hetzner 等) or マネージドで用意。
2. worker env に `CDP_ENDPOINT=ws://<steel-browser-host>:9223`、または `STEEL_BASE_URL=http://<steel-browser-host>:3000`。
3. `npm run install:browser` は**不要**（ローカル Chromium を使わない）。

## 法務・安全 (SALES-CENTER #4 準拠)

- Next 側 preflight で `safe_*` 分類 + robots.txt 尊重を通過した案件のみ届く。
- `dryRun:true` では送信ボタンを押さず検証だけ（監査用）。
- CAPTCHA 等は Next 側で `manual_queue` に回るため、本ワーカーには来ない。
