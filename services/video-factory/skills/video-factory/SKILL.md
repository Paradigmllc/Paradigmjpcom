---
name: paradigm-video-factory
description: Plan, route, test, review, and maintain Paradigm's rights-aware multi-engine video-production pipeline.
---

# Paradigm Video Factory Skill

Use this engineering skill when changing the factory itself: schemas, engine adapters, approved workflow registry, orchestration, QA, security, delivery, or tests. Use `paradigm-video-producer` for an actual client video request.

## Workflow

1. Read `AGENTS.md`, the brief, current engine routing, workflow registry, model registry, and license registry.
2. Run `video-factory validate` before editing a manifest.
3. Preserve objective, audience, claims, rights, approver, and deliverable specifications.
4. Use the deterministic planner unless a configured external planner is explicitly required.
5. Route exact text, UI, charts, and final composition to HyperFrames; real browser behavior to Playwright; generative footage to an enabled SHA-pinned ComfyUI workflow; supplied footage to FFmpeg.
6. Use dry-run/mock mode for CI unless an integration test explicitly authorizes a real endpoint.
7. Generate provenance for every scene.
8. Run technical QA, stop for draft approval, finalize, rerun QA, then stop for final approval.
9. Do not deliver without an approved final review whose artifact hashes still match.
10. Run tests, Ruff, mypy, schema export, and an FFmpeg dry-run before merging.

## Commands

```bash
video-factory validate examples/briefs/saas-launch.yaml
video-factory plan examples/briefs/saas-launch.yaml
video-factory workflows list
video-factory doctor
video-factory run examples/briefs/saas-launch.yaml --dry-run
pytest
ruff check src tests
mypy src
```

## Prohibited shortcuts

- Do not treat a marketing prompt as a complete brief.
- Do not guess rights, consent, factual claims, or legal text.
- Do not install an arbitrary ComfyUI workflow, model, LoRA, or custom node.
- Do not substitute generated footage for real evidence.
- Do not bypass endpoint authentication or the approved workflow registry.
- Do not bypass either human approval gate.
