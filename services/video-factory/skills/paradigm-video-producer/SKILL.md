---
name: paradigm-video-producer
description: Turn a natural-language business-video request into a validated Paradigm brief, multi-engine draft, two human approvals, final masters, and an auditable delivery.
---

# Paradigm Video Producer

Use this skill for any request to create, adapt, localize, render, review, or deliver a business video through Paradigm's Video Factory.

## Non-negotiable operating contract

- Natural language is an intake, not permission to invent rights, claims, customer data, logos, likenesses, voices, or evidence.
- Exact text, product UI, prices, charts, disclaimers, logos, captions, and final composition belong in HyperFrames.
- Generative footage may use only an enabled, SHA-pinned workflow from `workflows/comfyui/registry.yaml`.
- ComfyUI MCP is for endpoint discovery and workflow administration. Production execution must go through the authenticated Video Factory adapter.
- Generated visuals must never be represented as documentary evidence, product proof, medical results, financial results, property condition, or other factual footage.
- Draft approval and final approval are separate, mandatory human gates. Never run `--auto-approve` outside an explicit dry-run fixture.
- Final delivery requires an approved final review whose artifact hashes still match.

## Read first

1. Repository `AGENTS.md` and `Task.md`.
2. `services/video-factory/AGENTS.md`.
3. `services/video-factory/workflows/comfyui/registry.yaml`.
4. `services/video-factory/licenses/registry.yaml` and the exact model registry.
5. Invoke `/hyperframes` before authoring or editing any HyperFrames composition.

## Natural-language intake

Convert the request into a `ClientBrief` YAML/JSON. Preserve explicit facts and mark unknown fields rather than guessing. The brief must contain:

- project name;
- objective and audience;
- channels, duration, languages, and deliverables;
- brand colors, font, logo path, and approved source assets;
- exact claims and call to action;
- source-asset clearance;
- AI-generation permission;
- likeness and voice consent;
- client approval of claims;
- one final approver;
- localization copy for every non-primary language.

Run:

```bash
cd services/video-factory
video-factory validate <brief.yaml>
```

If validation fails, stop before production and surface the missing decisions. Do not weaken validation rules.

## Planning and routing

Create and inspect the shot manifest:

```bash
video-factory plan <brief.yaml> --output <manifest.json>
video-factory workflows list
video-factory doctor
```

Routing principles:

- `text_motion`, exact UI, charts, CTA, captions, and final assembly → HyperFrames.
- real browser behavior → Playwright with an allow-listed host.
- conceptual generative B-roll → an approved ComfyUI workflow ID.
- supplied media edits and normalization → FFmpeg.
- specialist 3D, technical animation, portrait, or lip-sync → only a separately approved worker.

If `doctor.production_ready` is false, use dry-run/mock mode or fix the reported blocker. Never silently bypass a missing GPU, unbound workflow, missing model license, or authentication requirement.

## Draft production

```bash
video-factory run <brief.yaml> --planner-provider deterministic
```

Use `--planner-provider external` only when `VIDEO_FACTORY_PLANNER_COMMAND` is configured and its output validates against the shot-manifest schema.

The successful draft state is `draft_review_required`. Provide the reviewer with:

- all draft master paths;
- technical QA report;
- provenance and workflow/model IDs;
- known limitations and generated-vs-real disclosure;
- the immutable artifact hashes recorded in `draft-review.json`.

Do not approve on the user's behalf.

## Draft approval and finalization

After a named human explicitly approves the draft:

```bash
video-factory approve-draft <project-id> --reviewer "<name>" --notes "<decision>"
video-factory finalize <project-id>
```

Finalization creates separate final masters and reruns technical QA. The resulting state is `final_review_required`.

## Final approval and delivery

After a named human explicitly approves the final masters:

```bash
video-factory approve-final <project-id> --reviewer "<name>" --notes "<decision>"
video-factory deliver <project-id> --target local
```

Other targets may be `rclone` or `frameio` only when `doctor` confirms the corresponding integration is configured. Record the delivery manifest and remote URIs.

## ComfyUI workflow administration

Never invent or download a production workflow during a client run. New workflows are developed in a sandbox, reviewed, and bound separately:

```bash
video-factory workflows bind <workflow-id> <api-workflow.json> \
  --reviewed-by "<human reviewer>" \
  --model-binding symbolic-model-slot=exact-model-file.safetensors \
  --confirm-license-review
```

The bind command verifies API format, endpoint node availability, exact model references, reviewer identity, profile, and SHA-256 before enabling the workflow. `--offline` is prohibited in production.

## HyperFrames agent workflow

Use the official `/hyperframes` router. Select the closest creation workflow:

- website/product launch → `/product-launch-video`;
- text-led explanation → `/faceless-explainer`;
- talking-head packaging → `/talking-head-recut`;
- captions → `/embedded-captions`;
- short design-led motion → `/motion-graphics`;
- freeform/brand film → `/general-video`.

Run HyperFrames lint/check/snapshot before render. Freeze all media locally and preserve its rights/provenance record.

## Completion definition

A job is complete only when:

- the brief and manifest validate;
- every shot has engine provenance;
- technical QA passes for every deliverable;
- draft approval is recorded;
- finalization and final QA pass;
- final approval is recorded;
- hashes remain unchanged after approval;
- the delivery record exists;
- no unreviewed model, node, voice, person, logo, or claim was introduced.
