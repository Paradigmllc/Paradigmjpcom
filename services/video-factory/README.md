# Paradigm Video Factory

Paradigm's rights-aware production system for turning a natural-language business-video request into validated briefs, multi-engine drafts, immutable human approvals, final masters, and auditable delivery.

## Operational architecture

```text
Natural-language request in Codex
  -> paradigm-video-producer skill
  -> validated ClientBrief
  -> deterministic or external planner
  -> shot-manifest.json
  -> scene router
       exact text/UI/charts/final assembly -> HyperFrames
       real browser behavior              -> Playwright
       approved generative footage        -> ComfyUI
       supplied footage/normalization     -> FFmpeg
       specialist work                    -> isolated approved worker
  -> technical QA for every deliverable
  -> DRAFT HUMAN APPROVAL
  -> final masters + final technical QA
  -> FINAL HUMAN APPROVAL
  -> local / rclone / Frame.io delivery
```

## What is implemented

- Strict YAML/JSON client brief and rights validation
- Deterministic planner plus a schema-bound external planner contract for Codex
- Per-shot routing for HyperFrames, Playwright, ComfyUI, FFmpeg, Blender, Manim, LivePortrait, and MuseTalk
- Deterministic HyperFrames composition for every language/aspect-ratio deliverable
- Authenticated ComfyUI execution with SHA-pinned approved workflow registry
- Eight fail-closed ComfyUI workflow contracts
- ComfyUI workflow bind/disable/readiness commands
- ComfyUI endpoint node validation and exact model-artifact binding
- Route-limited API-key reverse proxy for a private GPU ComfyUI worker
- Playwright host allow-list and browser-recording adapter
- FFmpeg normalization and `ffprobe` QA
- Prefect-compatible durable orchestration with local fallback
- FastAPI and Typer interfaces
- Two distinct human approval gates with artifact SHA-256 verification
- Local, rclone/Drive, and Frame.io delivery adapters
- Official HyperFrames Codex skill bootstrap
- ComfyUI MCP 0.2.2 wrapper for trusted endpoint discovery and workflow administration
- Docker Compose API, worker, Prefect, PostgreSQL, and optional ComfyUI auth proxy
- GPU-free dry-run mode for CI and development

## Deliberate boundaries

The factory does not silently download model weights, install custom nodes, approve creative output, or treat generated footage as factual evidence. ComfyUI remains unavailable until its endpoint, GPU, API authentication, exact model files, model licenses, workflow JSON, reviewer, and hashes all pass `video-factory doctor`.

## Local setup

Requirements:

- Python 3.11–3.13
- FFmpeg and ffprobe
- Node.js 22+
- `uvx` for the selected ComfyUI MCP
- Docker Compose for the full orchestration stack

```bash
cd services/video-factory
cp .env.example .env
./scripts/bootstrap-local.sh
./scripts/setup-codex-video-producer.sh
video-factory doctor
```

The HyperFrames bootstrap uses the official non-interactive installer and installs the core router plus product launch, explainer, captions, talking-head, motion-graphics, music, PR, and general-video workflows.

Restart Codex after skill installation, then invoke the project skill with a natural-language request, for example:

```text
/paradigm-video-producer
Create a 30-second 9:16 Japanese SaaS launch video from https://example.com.
Use the real UI for product claims, text-free abstract ComfyUI B-roll, exact pricing in HyperFrames, captions, and a final application CTA.
```

The skill creates a structured brief, validates it, plans and renders a draft, and stops for named human draft approval.

## Core CLI flow

```bash
video-factory validate examples/briefs/saas-launch.yaml
video-factory plan examples/briefs/saas-launch.yaml --output /tmp/manifest.json
video-factory workflows list
video-factory doctor
video-factory run examples/briefs/saas-launch.yaml --dry-run
```

Production approval sequence:

```bash
video-factory approve-draft PROJECT_ID --reviewer "Producer Name" --notes "Draft approved"
video-factory finalize PROJECT_ID
video-factory approve-final PROJECT_ID --reviewer "Final Approver" --notes "Final approved"
video-factory deliver PROJECT_ID --target local
```

`--auto-approve` is restricted to `--dry-run` test fixtures. It performs both approvals only to validate the full pipeline.

## ComfyUI production connection

Recommended topology:

```text
Private GPU host: ComfyUI :8188
  -> private network/TLS tunnel
  -> Video Factory comfyui-auth-proxy :8189
  -> authenticated Video Factory adapter
```

Set:

```dotenv
COMFYUI_UPSTREAM_URL=http://private-gpu-host:8188
COMFYUI_PROXY_API_KEY=<32+ random characters>
COMFYUI_API_URL=http://comfyui-auth-proxy:8189
COMFYUI_API_KEY=<same shared key>
VIDEO_FACTORY_ENVIRONMENT=production
```

Start the optional proxy profile:

```bash
docker compose --profile gpu up --build
```

The proxy exposes only the ComfyUI routes required for health, node discovery, queueing, history, output retrieval, interrupt, and queue control. Manager/install routes are blocked.

## Approved ComfyUI workflow binding

The repository contains eight reviewed workflow contracts, initially disabled:

- brand background
- product hero still
- social thumbnail
- text-to-video abstract B-roll
- image-to-video product B-roll
- video upscale
- frame interpolation
- background removal/replacement

Export an exact ComfyUI workflow in **API format**, then bind it only after model and license review:

```bash
video-factory workflows bind abstract-broll-t2v /secure/reviewed/abstract-broll-api.json \
  --reviewed-by "Human Reviewer" \
  --model-binding approved-video-checkpoint=wan_approved_exact_file.safetensors \
  --confirm-license-review
```

Binding verifies:

- API format, not UI format
- live endpoint reachability
- every workflow node exists on that endpoint
- every symbolic model slot has an exact artifact binding
- exact artifact names occur in the workflow
- human reviewer and GPU profile are recorded
- copied workflow SHA-256 is persisted

Any later workflow-file change invalidates execution. `--offline` is prohibited in production.

## ComfyUI MCP

The selected MCP is `IO-AtelierTech/comfyui-mcp`, package `comfyui-easy-mcp==0.2.2`. It provides node/model discovery, workflow validation, saved workflow execution, queue/history inspection, and workflow editing.

```bash
services/video-factory/scripts/run-comfyui-mcp.sh
```

The upstream MCP release does not expose an API-key header option. Therefore it is restricted to loopback/private administrative access. Client production runs always use the authenticated Video Factory adapter, not raw MCP execution.

## Full stack

```bash
cp .env.example .env
docker compose up --build
```

- Factory API: `http://localhost:8080`
- API docs: `http://localhost:8080/docs`
- Prefect UI: `http://localhost:4200`
- Optional authenticated ComfyUI proxy: internal port `8189`

## API flow

- `POST /v1/briefs/validate`
- `POST /v1/briefs/plan`
- `POST /v1/runs/sync` — dry-run only
- `POST /v1/runs` — Prefect production queue
- `GET /v1/runs/{run_id}`
- `GET /v1/projects/{project_id}`
- `POST /v1/projects/{project_id}/reviews/draft/approve`
- `POST /v1/projects/{project_id}/reviews/draft/request-changes`
- `POST /v1/projects/{project_id}/finalize`
- `POST /v1/projects/{project_id}/reviews/final/approve`
- `POST /v1/projects/{project_id}/reviews/final/request-changes`
- `POST /v1/projects/{project_id}/deliver`

Set `VIDEO_FACTORY_API_KEY` and send it as `X-Api-Key` outside local development.

## Workspace and states

```text
workspace/projects/<project-id>/
├── brief.json
├── validation.json
├── shot-manifest.json
├── engine-outputs.json
├── state.json
├── assets/
├── scenes/
├── hyperframes/
├── master/
│   └── final/
├── qa/
├── review/
│   ├── draft-review.json
│   └── final-review.json
└── deliverables/
    └── delivery.json
```

State sequence:

```text
production
-> draft_review_required
-> draft_approved
-> finalizing
-> final_review_required
-> final_approved
-> delivered
```

Invalid state jumps are rejected. Each review records hashes for every reviewed master; changing a file after the record is created invalidates approval.

## Engine activation

| Engine | Activation |
|---|---|
| Mock | Always available for CI/dry-run |
| FFmpeg | `ffmpeg` + `ffprobe` |
| HyperFrames | Node 22+, pinned CLI, FFmpeg |
| Playwright | installed capture tool + allow-listed host |
| ComfyUI | authenticated reachable endpoint + GPU + bound registry workflows |
| Blender/Manim/LivePortrait/MuseTalk | explicitly configured reviewed worker command |

## Testing

```bash
python -m compileall -q src tests
pytest --cov=video_factory --cov-report=term-missing
ruff check src tests
mypy src
video-factory run examples/briefs/saas-launch.yaml --dry-run --auto-approve
```

Tests use synthetic media and mock/dry-run adapters. They do not download model weights or call paid APIs.
