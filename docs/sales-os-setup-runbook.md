# Sales OS — 本番運用セットアップ Runbook (Sprint 11/12)

> 役割: Sprint 11/12 で実装した Sales OS API・LP を本番運用するために必要な
>       残作業 (Coolify 環境変数の追加・cron 設定・Stripe / Notion 設定) の手順.
>
> 対象スコープ: paradigmjp.com (Coolify app `i12am4vvcbggefnqdizhnv9a`)

## ✅ 完了済 (Sprint 11/12 で自動セットアップ済)

| 項目 | 状態 | 備考 |
|------|------|------|
| `N8N_WEBHOOK_SECRET` | ✅ Coolify env 投入済 (64 hex) | scan / weekly-digest の認証 |
| `SLACK_BOT_TOKEN` | ✅ Coolify env 投入済 | chat.postMessage |
| `SLACK_CHANNEL_ID` | ✅ Coolify env 投入済 | `C0B1JJ1L276` (#all-paradigm) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Coolify env 投入済 | RLS bypass |
| `DEEPSEEK_API_KEY` | ✅ Coolify env 投入済 (2026-05-13) | V4 PRO 永久指定 |
| `sales_templates` 56 件 | ✅ Supabase に bulk insert 済 | 8 業種 × 7 課題 (100% coverage) |
| Notion 4 DB | ✅ 自動作成済 (Notion MCP) | リード/顧客/納品/テンプレ |

## ⚠️ 残作業 (ユーザー手動・優先度順)

### 🔴 P0 (運用開始前に必須)

#### 1. `NOTION_API_KEY` (Internal Integration Token)
- 取得: https://www.notion.so/my-integrations → `+ New integration` → "Paradigm Sales OS" → Secret コピー
- 4 DB に invite: 各 DB ページの `Share` → integration を Editor で追加
  - 🎯 リード DB: https://www.notion.so/8cbab1f501144f83872c1738ce3e79c4
  - 🏢 顧客 DB: https://www.notion.so/86b1d93e3b854862ae7b2750d2585677
  - 📦 納品 DB: https://www.notion.so/b3cbef9dd96f4e5bbbecc404c703a298
  - 📝 テンプレ DB: https://www.notion.so/115e2b0e79424bb0813fc05402096f95
- Coolify env 投入:
  ```bash
  curl -sS -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    "https://coolify.appexx.me/api/v1/applications/i12am4vvcbggefnqdizhnv9a/envs" \
    -d '{"key":"NOTION_API_KEY","value":"secret_xxx","is_preview":false}'
  ```

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

#### 5. `HYPERFRAMES_API_URL` (パーソナライズ動画生成)
- 自分でセルフホスト or HyperFrames サービス契約
- 60s 動画 HTML→MP4 レンダリング
- 未設定でも他機能は動くが /api/sales/generate-diagnostic-video は失敗

## 📅 Cron スケジュール (Coolify で設定)

### 週次ダイジェスト (毎週月曜 09:00 JST)
- Coolify scheduled task で:
  - Schedule: `0 0 * * 1` (UTC) = 毎週月曜 09:00 JST
  - Command:
    ```bash
    curl -X POST -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \
      https://paradigmjp.com/api/sales/weekly-digest
    ```

### HOT lead 自動検出 (n8n で 5 分ごと polling)
- n8n workflow で `sales_companies` を WHERE `is_hot_lead=true` AND `is_hot_lead_at` > now() - 5min で SELECT
- 検出時に Slack 通知 (Block Kit)

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

# 4. admin dashboard (Cookie auth)
curl -i -H "Cookie: paradigm_admin_token=<set>" https://paradigmjp.com/ja/admin/sales
# 期待: 200 + dashboard HTML

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

毎週月曜 09:00 (cron)
  └→ /api/sales/weekly-digest
        └→ Slack に Block Kit
            📊 週次ダイジェスト
            - HOT leads top 5
            - ステージ別件数
            - 課題別件数
            - 都道府県別件数
```

---
最終更新: 2026-05-13 (Sprint 12 完了時)
