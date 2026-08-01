---
name: outreach-exec
description: Contact Formから自動で営業メッセージを送信。
metadata:
  openclaw:
    emoji: 📨
    requires:
      env:
      - TWENTY_API_KEY
      - TWENTY_BASE_URL
allowed-tools: Bash(ssh:*) Bash(node:*)
---

# フォームアウトリーチ実行

## 実行コマンド

```bash
node /app/openclaw-pipeline/outreach-exec/scripts/outreach-batch.js --limit {件数}
```
