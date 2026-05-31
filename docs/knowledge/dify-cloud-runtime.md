# Dify Cloud Runtime

Dify is cloud-only for this project. Do not route production traffic to a self-hosted Dify instance.

Runtime rules:

- Official endpoint: `https://api.dify.ai`
- Old or accidental self-host URLs are normalized back to the official cloud endpoint.
- API key values are never returned to the UI, logs, or n8n payloads.
- The video pipeline sends n8n a `dify` metadata block only: `provider`, `base_url`, `workflow_url`, `configured_groups`, `missing_groups`, `secret_values_in_payload`.

Recognized key aliases:

- `DIFY_API_KEY`, `DIFY_API_KEY_JA`, `DIFY_API_KEY_EN`
- `DIFY_DIAGNOSIS_API_KEY`
- `DIFY_FORM_MESSAGE_API_KEY`, `DIFY_FORM_MESSAGE_KEY`
- `DIFY_TEMPLATE_PICKER_API_KEY`, `DIFY_TEMPLATE_PICKER_KEY`
- `DIFY_VIDEO_WORKFLOW_API_KEY`, `DIFY_VIDEO_API_KEY`
- `DIFY_KARTE_TO_REPORT_API_KEY`, `DIFY_KARTE_TO_REPORT_KEY`
- `DIFY_KARTE_TO_SALES_MATERIAL_API_KEY`, `DIFY_KARTE_TO_SALES_MATERIAL_KEY`

Video jobs can use the dedicated video workflow key when it exists. Until then, the sales-material workflow key is accepted as the Dify copy/story fallback because it already produces proposal-ready narrative structure from the company karte.

URL aliases are allowed for compatibility, but they must still resolve to Dify Cloud:

- `DIFY_BASE_URL`
- `DIFY_DIAGNOSIS_BASE_URL`, `DIFY_DIAGNOSIS_API_URL`
- `DIFY_FORM_MESSAGE_BASE_URL`, `DIFY_FORM_MESSAGE_API_URL`
- `DIFY_VIDEO_WORKFLOW_BASE_URL`, `DIFY_VIDEO_WORKFLOW_API_URL`
