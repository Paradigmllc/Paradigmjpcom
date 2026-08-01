# Architecture

## Control plane

- `ClientBrief` and JSON schemas define the request contract.
- Planner converts a valid brief to `ShotManifest`.
- Router chooses only available, policy-compliant engines.
- `config/engine-profiles.yaml` binds every major OSS capability to an immutable upstream
  revision, runtime, commercial policy, VRAM floor, workflow/model IDs, and reviewer state.
- Prefect handles durable queueing and retries.
- Project workspaces hold immutable inputs, provenance, QA, approvals, and delivery records.

## Rendering plane

- HyperFrames is the deterministic master compositor.
- Playwright captures exact browser behavior.
- ComfyUI produces approved conceptual assets through API-format workflows.
- FFmpeg normalizes all media and produces delivery variants.
- Specialist engines run as isolated adapters, never as arbitrary repository commands.
- Non-native OSS engines use one JSON request/output worker contract. The selected profile ID and
  source/license provenance are written to every engine output.

## Engine profile gate

Profile routing is fail-closed before GPU acquisition. A requested profile must support the shot
kind, be commercially approved, have its specific runtime command, have all workflow contracts
approved and bound, and have every exact model artifact approved. Preview ignores production
profile selection and routes to the mock engine, so it cannot load weights or start a GPU.

The committed catalog is mirrored into RLS-protected Supabase tables through the authenticated
internal API. Selection, start, completion, and failure events are appended to the DB and also
persisted in the local mode-0600 event journal. Console refresh is explicit; there is no catalog
polling process and no GPU side effect.

## ComfyUI policy layer

`workflows/comfyui/registry.yaml` is the execution allow-list. A workflow executes only when:

- its contract is `approved_bound` and enabled;
- the API JSON resides under the configured workflow root;
- its SHA-256 still matches;
- all approved node types are present;
- exact model artifacts are embedded in the workflow;
- required rights are true in the client brief;
- production endpoint authentication is configured.

MCP is outside the production execution path. It assists trusted administrators with node/model discovery and workflow development.

## Review state machine

```text
production -> draft_review_required -> draft_approved
-> finalizing -> final_review_required -> final_approved -> delivered
```

Technical failure routes to `qa_failed`; unrecoverable failure routes to `failed`. State skips are rejected.

Draft and final review records each hash every reviewed master. Approval authorizes those bytes only.

## Natural-language interface

Codex receives the request through `paradigm-video-producer`. The skill creates the brief, invokes official HyperFrames workflows, selects only approved ComfyUI workflow IDs, executes factory commands, and stops at both human gates. The LLM is an orchestration and authoring layer, not the source of rights, claims, evidence, or approval.
