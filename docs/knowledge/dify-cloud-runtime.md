# Dify Cloud Runtime

Dify is cloud-only for this project. Do not route production traffic to a self-hosted Dify instance.

Runtime rules:

- Official endpoint: `https://api.dify.ai`
- Old or accidental self-host URLs are normalized back to the official cloud endpoint.
- API key values are never returned to the UI, logs, or OpenClaw pipeline payloads.
- Twenty is the CRM system of record for sales operations. Stagehand is invoked on demand by the worker; there is no n8n or always-on video orchestration runtime.

Recognized key aliases:

- `DIFY_API_KEY`, `DIFY_API_KEY_JA`, `DIFY_API_KEY_EN`
- `DIFY_DIAGNOSIS_API_KEY`
- `DIFY_FORM_MESSAGE_API_KEY`, `DIFY_FORM_MESSAGE_KEY`
- `DIFY_TEMPLATE_PICKER_API_KEY`, `DIFY_TEMPLATE_PICKER_KEY`
- `DIFY_KARTE_TO_REPORT_API_KEY`, `DIFY_KARTE_TO_REPORT_KEY`
- `DIFY_KARTE_TO_SALES_MATERIAL_API_KEY`, `DIFY_KARTE_TO_SALES_MATERIAL_KEY`

Report and sales-material jobs use the dedicated workflow keys when configured. Secrets stay server-side and are never sent to Twenty, Stagehand, or the public site.

URL aliases are allowed for compatibility, but they must still resolve to Dify Cloud:

- `DIFY_BASE_URL`
- `DIFY_DIAGNOSIS_BASE_URL`, `DIFY_DIAGNOSIS_API_URL`
- `DIFY_FORM_MESSAGE_BASE_URL`, `DIFY_FORM_MESSAGE_API_URL`
