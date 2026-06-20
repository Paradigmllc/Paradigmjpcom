# Sales OS — 本番運用セットアップ Runbook (Sprint 11/12)

> 役割: Sprint 11/12 で実装した Sales OS API・LP を本番運用するために必要な
>       残作業 (Coolify 環境変数の追加・webhook 設定・Stripe / Notion 設定) の手順.
>
> 対象スコープ: paradigmjp.com (Coolify app `i12am4vvcbggefnqdizhnv9a`)

## ✅ 完了済 (Sprint 11/12 で自動セットアップ済)

| 項目 | 状態 | 備考 |
|------|------|------|
| `TRIGGER_WEBHOOK_SECRET` | ✅ Coolify env 投入対象 | scan / weekly-digest / Trigger.dev inbound の認証 |
| `SLACK_BOT_TOKEN` | ✅ Coolify env 投入済 | chat.postMessage |
| `SLACK_CHANNEL_ID` | ✅ Coolify env 投入済 | `C0B1JJ1L276` (#all-paradigm) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Coolify env 投入済 | RLS bypass |
| `DEEPSEEK_API_KEY` | ✅ Coolify env 投入済 (2026-05-13) | V4 PRO 永久指定 |
| `sales_templates` 56 件 | ✅ Supabase に bulk insert 済 | 8 業種 × 7 課題 (100% coverage) |
| Notion 4 DB | ✅ 自動作成済 (Notion MCP) | リード/顧客/納品/テンプレ |

## ⚠️ 残作業 (ユーザー手動・優先度順)

### 🔴 P0 (運用開始前に必須・ユーザー手動 1 step のみ)

#### 1. ✅ NOTION_API_KEY (2026-05-13 投入済)
- ✅ Internal Integration Token は `NOTION_API_KEY` として非gitの秘密情報ストアで管理する
- ✅ Coolify env `NOTION_API_KEY` 投入済 (UUID: kpjqu3ec4y4igplo0nz12qea)
- ⚠️ **残作業 (ユーザー手動・1 step)**: integration を 4 DB に invite (現状 API access ゼロ)

**最も簡単な手順** (親ページに 1 回 invite で配下 4 DB に継承):
1. Notion を開く: https://www.notion.so/35fa2b78f3fc81299d91e457889ee393 (旧親ページ "Paradigm 営業 OS")
2. ページ右上の **⋮ (3-dot メニュー) → 「コネクトを追加」**
3. **"Paradigm Sales OS"** を検索 → 選択 → 確認
4. 配下 4 DB (リード/顧客/納品/テンプレ) に自動継承

**動作確認**:
```bash
curl -sS -X POST "https://api.notion.com/v1/databases/8cbab1f501144f83872c1738ce3e79c4/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" -H "Content-Type: application/json" -d '{"page_size":1}'
# 期待: {"object":"list","results":[...]} (204 OK)
# NG時: {"object":"error","status":404,"code":"object_not_found",...} ← invite 未完
```

**新しい親ページ (342a2b78-...) を使う場合**: 4 DB を新ページに移動するか、新親ページにも invite を追加する。

### 🟡 P1 (本番運用品質を上げる)

#### 2. `GOOGLE_PSI_API_KEY` (オプション・rate-limit 緩和)
- 取得: https://console.cloud.google.com/apis/credentials → 新規 API key → "PageSpeed Insights API" 有効化
- 未設定でも PSI は動くが匿名アクセス制限 (1 リクエスト/秒) になる
- Coolify env: `GOOGLE_PSI_API_KEY=AIzaXXX`

#### 3. `GBIZ_API_TOKEN` (経産省 gBizInfo API)
- 取得: https://info.gbiz.go.jp/api/index.html → 無料申請 (1 営業日で発行)
- 未設定でも form-outreach は動くが企業属性 (法人番号/従業員数) が取れない
- Coolify env: `GBIZ_API_TOKEN=xxx`

### 🟢 P2 (収益化機能 — 後でも OK)

#### 4. Stripe Checkout (動画サブスク LP)
- Stripe Dashboard で 5 Prices を作成:
  - `PRICE_DIAG_BASIC` (¥300,000 one-time)
  - `PRICE_DIAG_PRO` (¥800,000 one-time)
  - `PRICE_VIDEO_30` (¥300,000/月)
  - `PRICE_VIDEO_50` (¥500,000/月)
  - `PRICE_VIDEO_80` (¥800,000/月)
- Coolify env 投入 (5 個): `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `PRICE_*`
- Webhook URL: https://paradigmjp.com/api/stripe/webhook

#### 5. `HYPERFRAMES_API_URL` — Sprint 14 で HTML preview ルートに切替 (✅ ほぼ完了)
**Sprint 14 設計変更**: HYPERFRAMES_API_URL 未設定でも動画は配信可能。HTML 自動再生プレビュー (`/[locale]/report/[slug]/video`) で代替し、URL 共有で完結。

**実装済 fallback chain**:
1. HYPERFRAMES_API_URL **設定済** → MP4 を生成 (HyperFrames API call) → R2 アップ
2. HYPERFRAMES_API_URL **未設定** → HTML preview URL (`https://paradigmjp.com/ja/report/[slug]/video`) を返す
3. MP4 化が失敗しても HTML preview にフォールバック

**MP4 化が必要になったら** (後段拡張・任意):
- Plan A: Coolify に新 service `paradigm-video-renderer` (Node.js + Puppeteer + ffmpeg) を立てる
- Plan B: Remotion lambda を AWS or Cloudflare Workers にデプロイ
- Plan C: Vast.ai + ComfyUI + Wan2.2 (avatar 動画パイプライン)
- どの方式でも endpoint URL を `HYPERFRAMES_API_URL` に投入すれば自動切替

## 📣 イベント駆動ジョブ (Cron / 定期実行は禁止)

### 週次ダイジェスト
- Coolify Scheduled Task / pg_cron / systemd timer は使わない。
- 管理者の明示操作、Slack slash command、または外部 webhook から one-shot で呼ぶ。
- 手動実行:
  ```bash
  curl -X POST -H "X-Webhook-Secret: $TRIGGER_WEBHOOK_SECRET" \
    https://paradigmjp.com/api/sales/weekly-digest
  ```

### HOT lead 自動検出
- `sales_companies` の INSERT/UPDATE は Supabase Database Webhook から通知する。
- poll ではなく、`is_hot_lead` が true に変わったイベントで Slack 通知 (Block Kit) を送る。

## 🧪 動作確認チェックリスト (deploy 完了後)

```bash
# 1. scan API (PSI + HTML inspect)
curl -X POST -H "X-Webhook-Secret: $SECRET" \
  https://paradigmjp.com/api/sales/scan/example.com
# 期待: {"ok":true,"domain":"example.com","mobile":XX,"desktop":XX,"issues":[...]}

# 2. track-view (1x1 pixel)
curl -i https://paradigmjp.com/api/sales/track-view?slug=00335ac8-fe51-40bb-bd00-b5b018b6d4e3
# 期待: 200 + Content-Type: image/png + Content-Length: 67

# 3. opengraph-image (1200×630)
curl -i https://paradigmjp.com/ja/diagnostic/00335ac8-fe51-40bb-bd00-b5b018b6d4e3/opengraph-image
# 期待: 200 + Content-Type: image/png

# 4. sales dashboard (PayloadCMS共通ログイン)
# ブラウザで https://paradigmjp.com/admin にログイン後、管理画面上部の「営業ダッシュボードを開く」から遷移
# 期待: /ja/admin/sales が 200 + dashboard HTML

# 5. diagnostic LP (seeded company)
curl -i https://paradigmjp.com/ja/diagnostic/00335ac8-fe51-40bb-bd00-b5b018b6d4e3
# 期待: 200 + DiagnosticReport HTML + tracking pixel

# 6. weekly digest (Slack に通知)
curl -X POST -H "X-Webhook-Secret: $SECRET" \
  https://paradigmjp.com/api/sales/weekly-digest
# 期待: {"ok":true,"digest":{...}} + Slack に Block Kit 投稿
```

## 🔄 運用フロー (実装完了状態)

```
顧客サイト
  ↓ contact form
/api/contact
  ↓ fire-and-forget
enrichFromContact()
  ├→ scanDomain() (PSI + HTML)
  ├→ gBizInfo (company_name)
  └→ upsertCompanyByDomain()
        ↓
sales_companies に INSERT
  ↓ Slack Bot 通知 (Block Kit)
🌱 新規リード: {name} ({domain})
  └→ ボタン: 診断レポート / 管理画面

管理者操作 / Slack command / webhook
  └→ /api/sales/weekly-digest (one-shot)
        └→ Slack に Block Kit
            📊 週次ダイジェスト
            - HOT leads top 5
            - ステージ別件数
            - 課題別件数
            - 都道府県別件数
```

---
最終更新: 2026-06-20 (Cron 廃止・イベント駆動化)
