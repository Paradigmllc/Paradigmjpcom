# Production Deployment

## Trust zones

1. **Codex workstation** — repository, official HyperFrames skills, Paradigm producer skill, and trusted-admin ComfyUI MCP.
2. **Video Factory control plane** — FastAPI, Prefect, PostgreSQL, workspace, approvals, QA, and delivery.
3. **ComfyUI auth proxy** — API-key boundary and route allow-list.
4. **GPU worker** — private ComfyUI plus authenticated OSS worker, pinned revisions, exact models/custom nodes, no public unauthenticated port.
5. **Delivery systems** — Frame.io or rclone target with least-privilege credentials.

## Required deployment order

1. Generate random `VIDEO_FACTORY_API_KEY`, `COMFYUI_PROXY_API_KEY`, and `VIDEO_FACTORY_OSS_WORKER_API_KEY` values of at least 32 characters.
2. Deploy PostgreSQL, Prefect, Factory API, and worker.
3. Deploy ComfyUI v0.28.0 on the approved GPU host.
4. Keep ComfyUI port 8188 private; expose it only to the proxy or trusted admin tunnel.
5. Set `COMFYUI_UPSTREAM_URL` on the proxy.
6. Set `COMFYUI_API_URL` to the proxy URL and the matching `COMFYUI_API_KEY` on API/worker.
7. Set the TLS `VIDEO_FACTORY_OSS_WORKER_URL` and matching worker key when an external GPU profile is enabled.
8. Run `video-factory doctor`; endpoint and VRAM must pass.
9. Review exact models, hashes, licenses, regions, and custom nodes.
10. Export workflows in ComfyUI API format and bind them with `video-factory workflows bind`.
11. Build external commands ahead of the job and verify the worker health reports the exact catalog revision.
12. Run `video-factory doctor` again; required workflow readiness must pass.
13. Run the synthetic end-to-end fixture and verify both review gates.
14. Enable client production only after the evidence is recorded.

## GPU baseline

The factory defaults to a 24 GB minimum (`COMFYUI_MIN_VRAM_GB=24`) for a practical video-generation worker. A lower value may be approved for image-only or lightweight workflows, but the exact workflow/model profile must be tested. Hardware readiness is based on `/system_stats`, not a declared provider label.

The initial production profile requires only `abstract-broll-t2v`. Other registry contracts remain disabled until their exact model artifacts, licenses, workflow JSON, and output quality have been reviewed. Override `COMFYUI_REQUIRED_WORKFLOWS` only when every newly required contract has been bound and verified.

## Vast.ai managed worker recovery

Paradigm-managed workers use an authenticated TLS proxy on container port `18189`. The provisioning script starts a dedicated ComfyUI API process on loopback port `18188`, verifies `/system_stats` and the workflow node inventory, and reuses already downloaded model artifacts after a restart. Production runtime configuration rejects plain-HTTP ComfyUI endpoints.

The control-plane image trusts only the public Vast.ai Jupyter CA copied from <https://console.vast.ai/static/jvastai_root.cer>. The normalized, reviewed PEM in this repository has SHA-256 `5960778b0ce081b391ca640a392259a2d9b3f87625d8d94c8cac04b1277a2afa` and expires in 2051. Any certificate rotation requires a new fingerprint review and a TLS integration test; never disable certificate verification.

The operator console lists only an allowlist of instance metadata. Vast.ai fields such as `extra_env`, notebook tokens, SSH material, and the ComfyUI proxy key must never be returned to the browser. Use **既存GPUを安全に回収** to recover the proxy URL and key server-side, verify the authenticated status endpoint, and save them to the mode-`0600` runtime configuration.

Adoption also records the managed instance ID and enables event-driven lifecycle control. Non-dry-run jobs start that exact instance only when the routed manifest contains a ComfyUI or managed external GPU shot, wait for authenticated readiness and the selected exact worker revisions, and stop it when no queued/running job remains. Dry runs and CPU-only routes do not start it. The controller never searches the marketplace or creates a replacement. Set `VIDEO_FACTORY_GPU_LIFECYCLE_ENABLED=false` only during an operator-controlled incident; disabling it restores manual responsibility for compute charges.

Vast.ai bills stopped instances for storage even though active GPU compute billing is paused. Restart can remain in `scheduling` when the original GPU has been reassigned. Treat a start timeout as a visible capacity incident rather than silently provisioning a second GPU.

The approved initial model is Wan 2.2 TI2V-5B from the official ComfyUI distribution. Record the downloaded artifact checksums and the upstream Apache-2.0 model license before binding `abstract-broll-t2v`:

- <https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B>
- <https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged>

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

The `gpu` profile defines the auth proxy and authenticated OSS worker; it does not install models, create a marketplace instance, or start a paid GPU by itself. On a provider host, run it only for an acquired job and stop it with the lifecycle-managed instance.

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
