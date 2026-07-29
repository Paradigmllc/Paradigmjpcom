# Paradigm Video Factory — Production Operations

The production implementation lives in `services/video-factory` and is embedded in the existing Paradigm Coolify application. It is not exposed as a separate public service.

## Operator surface

- Admin entry: `/admin/video-factory`
- Browser console: `/console/`
- Safe readiness endpoint: `/api/video-factory/ready`
- Internal FastAPI origin: `http://127.0.0.1:8080`
- Persistent workspace: `/data/video-factory`

All console and `/v1/*` requests pass through the existing Paradigm admin authentication before Next.js forwards them to the loopback-only Python service. The browser never receives the internal Video Factory API secret.

## Runtime

The root production container starts and supervises two processes:

1. the public Next.js application on port 3000;
2. Video Factory Uvicorn on loopback port 8080.

The Video Factory process is restarted if it exits while Next.js remains healthy. Coolify keeps `/data/video-factory` on a persistent volume, preserving runtime credentials, project data, generated assets, QA evidence, and approval records across deployments.

## Daily browser workflow

1. Log into Paradigm admin.
2. Open `/admin/video-factory`.
3. Create and validate a video brief.
4. Produce a GPU-free preview or submit a production run.
5. Review the generated draft in the browser.
6. Approve the draft or request changes.
7. Finalize and approve immutable final masters.
8. Deliver locally, through rclone/Drive, or through Frame.io when configured.

No CLI access is required for normal production work.

## Vast.ai and ComfyUI activation

The application is usable immediately for GPU-free previews and deterministic HyperFrames/FFmpeg production. Generative ComfyUI lanes remain fail-closed until an operator completes the following in the GUI:

1. save a Vast.ai API key;
2. select a reviewed ComfyUI template and start a suitable GPU instance;
3. save the private/authenticated ComfyUI endpoint;
4. register exact model artifacts, SHA-256 hashes, licenses, allowed regions, and approved workflow JSON;
5. bind each API-format workflow with a named human reviewer.

The factory does not silently download model weights, install arbitrary custom nodes, or approve generated footage. Customer production always retains separate draft and final human approval gates.

## Deployment verification

Every main deployment must pass:

- the public JA/EN VaaS funnel checks;
- `/api/video-factory/ready` returning `ready: true`;
- unauthenticated `/console/` redirecting to admin login;
- the Video Factory Python tests, type/lint checks, registry checks, and two-gate dry-run;
- an exact build of the root production Dockerfile containing Next.js, Chromium, FFmpeg, HyperFrames, and the Video Factory Python environment.
