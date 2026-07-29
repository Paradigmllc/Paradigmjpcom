# Production Deployment

## Trust zones

1. **Codex workstation** — repository, official HyperFrames skills, Paradigm producer skill, and trusted-admin ComfyUI MCP.
2. **Video Factory control plane** — FastAPI, Prefect, PostgreSQL, workspace, approvals, QA, and delivery.
3. **ComfyUI auth proxy** — API-key boundary and route allow-list.
4. **GPU worker** — private ComfyUI instance, pinned core version, exact models/custom nodes, no public unauthenticated port.
5. **Delivery systems** — Frame.io or rclone target with least-privilege credentials.

## Required deployment order

1. Generate random `VIDEO_FACTORY_API_KEY` and `COMFYUI_PROXY_API_KEY` values of at least 32 characters.
2. Deploy PostgreSQL, Prefect, Factory API, and worker.
3. Deploy ComfyUI v0.28.0 on the approved GPU host.
4. Keep ComfyUI port 8188 private; expose it only to the proxy or trusted admin tunnel.
5. Set `COMFYUI_UPSTREAM_URL` on the proxy.
6. Set `COMFYUI_API_URL` to the proxy URL and the matching `COMFYUI_API_KEY` on API/worker.
7. Run `video-factory doctor`; endpoint and VRAM must pass.
8. Review exact models, hashes, licenses, regions, and custom nodes.
9. Export workflows in ComfyUI API format and bind them with `video-factory workflows bind`.
10. Run `video-factory doctor` again; required workflow readiness must pass.
11. Run the synthetic end-to-end fixture and verify both review gates.
12. Enable client production only after the evidence is recorded.

## GPU baseline

The factory defaults to a 24 GB minimum (`COMFYUI_MIN_VRAM_GB=24`) for a practical video-generation worker. A lower value may be approved for image-only or lightweight workflows, but the exact workflow/model profile must be tested. Hardware readiness is based on `/system_stats`, not a declared provider label.

## ComfyUI core installation

```bash
cd services/video-factory
COMFYUI_VERSION=v0.28.0 COMFYUI_HOME=/opt/comfyui ./scripts/bootstrap-comfyui.sh
```

The bootstrap installs core only. Model weights and custom nodes are deliberately excluded. Add them through a reviewed image/container build, record exact source and hashes, and never auto-update production nodes.

Start the private worker:

```bash
/opt/comfyui/.venv/bin/python /opt/comfyui/main.py \
  --listen 0.0.0.0 \
  --port 8188 \
  --disable-api-nodes
```

Protect network access with a private VPC/VPN/firewall. The Video Factory proxy provides application-layer API-key authentication but does not replace network isolation or TLS.

## Docker Compose control plane

```bash
cp .env.example .env
docker compose --profile gpu up --build -d
```

The `gpu` profile starts the auth proxy; it does not install or pay for a GPU. The worker may run on a separate host or provider.

## Readiness command

```bash
video-factory doctor
```

Production is not ready unless:

- Python, FFmpeg, ffprobe, Node, and npx are available;
- Factory API auth is configured;
- HyperFrames is available;
- ComfyUI endpoint is authenticated and reachable;
- reported VRAM meets the configured minimum;
- every required workflow contract is bound, enabled, hash-valid, and references approved model artifacts;
- Playwright capture script exists;
- selected delivery integration is configured.

## Rollback

- Disable affected workflow: `video-factory workflows disable WORKFLOW_ID`.
- Stop new Prefect queue submissions.
- Preserve project workspace and review records.
- Restore the previous pinned container/model/workflow registry commit.
- Re-run `doctor`, tests, dry-run, and a controlled real-engine fixture.
- Never mutate a previously approved workflow file in place; bind a new version and retain the old record.
