---
name: crm-sync
description: Twenty CRMのステータスを一括更新し送信待ちにする。
metadata:
  openclaw:
    emoji: 🔄
    requires:
      env:
      - TWENTY_API_KEY
      - TWENTY_BASE_URL
allowed-tools: Bash(ssh:*) Bash(node:*)
---

# CRM同期・送信待ち化

## 実行コマンド

```bash
node /app/openclaw-pipeline/crm-sync/scripts/sync-status.js --batch --limit 20
```
