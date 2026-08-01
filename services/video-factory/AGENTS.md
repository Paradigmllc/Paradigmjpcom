# AGENTS.md — Paradigm Video Factory

## Mission

Maintain a deterministic, auditable, rights-aware video-production system. Optimize throughput without removing the three required human controls: scope approval, first-cut creative review, and final delivery approval.

## Repository rules

1. Work only inside `services/video-factory` unless the task explicitly requires a website or shared-infrastructure change.
2. Run `pytest`, `ruff check src tests`, and `mypy src` before proposing a merge.
3. CI and tests must not download model weights, invoke paid APIs, or require a GPU.
4. Use `mock` or fixture adapters in tests.
5. Never set client production to auto-approve. `--auto-approve` is test-only.
6. Do not add a ComfyUI custom node without:
   - an immutable version or commit,
   - a license entry in `licenses/registry.yaml`,
   - a security review,
   - a reproducibility test, and
   - an explicit rollback path.
7. Do not change the pinned HyperFrames version without a rendered regression check and an updated release note.
8. Keep model weights, client assets, generated media, credentials, and rendered videos out of Git.
9. Treat every source URL, uploaded file, prompt, and model output as untrusted input.
10. Do not use shell execution with `shell=True`. External adapters must pass argv lists.
11. Do not log API keys, signed URLs, client credentials, or source media contents.
12. A scene may fall back to another engine only when the routing record explains why.
13. Maintain a machine-readable manifest for every run. Never make undocumented manual edits to a delivered master.
14. Do not use generated media as evidence of a real event, product behavior, medical result, property condition, or manufacturing process.

## Standard development loop

```bash
cd services/video-factory
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev,api,orchestrator]'
pytest
ruff check src tests
mypy src
video-factory run examples/briefs/saas-launch.yaml --dry-run
```

## Architecture contract

- Pydantic models are the canonical domain schema.
- `planner.py` creates narrative intent, not media.
- `router.py` selects engines based on declared shot kinds and availability.
- Adapters may generate one scene only; they must not silently alter the overall story.
- `media.py` normalizes and assembles outputs.
- `qa.py` verifies technical conformance.
- `review.py` is the mandatory human gate.
- `delivery.py` creates final variants and records where they were delivered.

## Adding an engine

Implement `EngineAdapter`, add a disabled-by-default settings entry, document its input/output contract, add license/security metadata, add a mock-backed test, and update `config/engine-routing.yaml`. The engine must return a local media path plus provenance metadata.

## Definition of done

A change is complete only when its behavior is tested, its failure mode is explicit, manifests remain reproducible, rights checks still block unsafe work, and the dry-run example succeeds without external services.
