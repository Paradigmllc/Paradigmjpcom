# Production Runbook

## New natural-language request

1. Invoke `/paradigm-video-producer` in Codex.
2. Convert the request to a structured brief without guessing rights or claims.
3. Validate the brief.
4. Run `video-factory doctor` and `video-factory workflows list`.
5. Plan and inspect the shot manifest.
6. Run production or a dry-run fixture.
7. Share draft masters, QA, provenance, and disclosures with the named approver.

## Draft gate

Expected state: `draft_review_required`.

Approve:

```bash
video-factory approve-draft PROJECT_ID --reviewer "NAME" --notes "DECISION"
```

Request changes through the API or mark the draft review accordingly. A changed media file invalidates the original review hash and requires a new review revision.

## Finalization and final gate

```bash
video-factory finalize PROJECT_ID
```

Expected state: `final_review_required`. Verify final technical QA and all formats/languages.

```bash
video-factory approve-final PROJECT_ID --reviewer "NAME" --notes "DECISION"
```

## Delivery

```bash
video-factory deliver PROJECT_ID --target local
# or: --target rclone
# or: --target frameio
```

Delivery is blocked unless final approval is valid and artifact hashes match.

## ComfyUI workflow onboarding

1. Develop in a sandbox.
2. Export API JSON.
3. Review custom nodes, model files, model cards, commercial use, geography, likeness/voice obligations, and output terms.
4. Verify endpoint node availability.
5. Bind exact model files and the human reviewer.
6. Run a controlled fixture.
7. Enable only the intended workflow ID.

```bash
video-factory workflows bind WORKFLOW_ID workflow-api.json \
  --reviewed-by "NAME" \
  --model-binding SLOT=EXACT_FILE \
  --confirm-license-review
```

## Incident controls

- **Unexpected generation:** disable the workflow contract immediately.
- **Credential exposure:** revoke/rotate API, Frame.io, rclone, and provider credentials; do not merely edit `.env`.
- **Wrong client data:** stop queue, remove access, preserve incident evidence, notify the internal owner.
- **Post-approval file change:** approval becomes invalid automatically; create a new review record.
- **GPU/model drift:** compare workflow/model hashes and container image; restore pinned versions.
- **Rights dispute:** stop delivery and portfolio use; preserve source declarations and licenses.

## GPU lifecycle operations

- Adopt exactly one `paradigm-comfyui-*` instance in the console. Its ID is persisted with mode `0600` and is never inferred from an arbitrary account instance.
- A production submission starts the managed instance only after routing selects a ComfyUI shot, then waits up to `VIDEO_FACTORY_GPU_START_TIMEOUT_SECONDS` for the authenticated ComfyUI readiness contract. Dry runs, rejected briefs, and non-ComfyUI routes leave it stopped.
- The final queued/running job stops the managed instance. If another job is queued, the GPU remains available for that job and is stopped after it completes.
- On application restart, interrupted local jobs are marked failed for operator review before the idle GPU is reconciled. They are not replayed automatically because generation is not assumed idempotent.
- Use **GPU・接続設定 → GPU空き状態を再判定** for a one-shot reconciliation. Do not add cron polling.
- A stop/start failure appears in the console, the workspace event record, the DB bell, and Slack. Do not destroy or replace the managed GPU until its persistent assets are backed up and the lifecycle assignment is deliberately changed.
