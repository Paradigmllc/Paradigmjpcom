---
name: lead-discovery
description: 営業パイプライン全体を自動実行する。リード発見・診断・営業活動。
metadata:
  openclaw:
    emoji: 🔍
    requires:
      env:
      - TWENTY_API_KEY
      - TWENTY_BASE_URL
      - DEEPSEEK_API_KEY
allowed-tools: Bash(ssh:*)
---

# 全自動営業パイプライン — Lead Discovery

発見→診断→同期までを1コマンドで実行する。

## 全自動実行

```bash
node /app/openclaw-pipeline/lead-discovery/scripts/orchestrator.js --country {国} --industry {業種} --limit {件数}
```

## 追加アクション

- 診断のみ: `node /app/openclaw-pipeline/diagnosis-output/scripts/diagnose-batch.js --limit N`
- 同期のみ: `node /app/openclaw-pipeline/crm-sync/scripts/sync-status.js --batch --limit N`
