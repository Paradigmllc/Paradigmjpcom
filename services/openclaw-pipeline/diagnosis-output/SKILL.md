---
name: diagnosis-output
description: Web診断レポートをDeepSeek V4で自動生成。
metadata:
  openclaw:
    emoji: 🩺
    requires:
      env:
      - TWENTY_API_KEY
      - DEEPSEEK_API_KEY
allowed-tools: Bash(ssh:*) Bash(node:*)
---

# Web診断レポート生成

## 実行コマンド

```bash
node /app/openclaw-pipeline/diagnosis-output/scripts/diagnose-batch.js --limit {件数}
```
