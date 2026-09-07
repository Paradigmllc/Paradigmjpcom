# Native Wan source quality probe — 2026-09-07

## Scope

Internal synthetic cup/steam source QA. This is not a customer delivery, a new
production workflow approval, or proof of commercial-service parity. The owner's
10/100 editorial baseline remains rejected until actual improved footage is reviewed.

## Generation changes

- `tools/wan_quality_probe.py --candidate reference50` tests 1280x704, 121 frames,
  24fps, 50 steps, shift 5 and CFG 5 using the existing approved Wan TI2V-5B weights.
  These values follow the [upstream Wan configuration](https://github.com/Wan-Video/Wan2.2/blob/main/wan/configs/wan_ti2v_5B.py),
  but the ComfyUI sampler path is not an exact reproduction of upstream inference.
- The 1280x720 review file is letterboxed, not native 720-pixel image detail.
- `--runtime comfy-pinned` selects an immutable amd64 image digest for
  `vastai/comfy:v0.28.0-cuda-12.9-py312`. The exact manifest is in the tool; no mutable
  automatic tag or production configuration is changed.
- Read-only DockerHub metadata on September 7 reports 9,530,741,926 compressed bytes
  for this image versus 25,977,643,310 for the historical `vastai/aio-studio:2026-04-16`.
  This reduces cold-start transfer size; it does not by itself prove why earlier
  hosts failed or guarantee startup latency. Sources:
  [Comfy image metadata](https://hub.docker.com/v2/repositories/vastai/comfy/tags/v0.28.0-cuda-12.9-py312),
  [All-in-One metadata](https://hub.docker.com/v2/repositories/vastai/aio-studio/tags/2026-04-16).
- The pinned runtime rejects missing/nonfinite or insufficient host CUDA capability
  before rental. The marketplace's current recommended Comfy template used CUDA
  13.2; do not assume it fits a cheaper CUDA 12.x host.

## Failure behavior

The production adapter previously waited for outputs even after ComfyUI reported
`execution_error` or interruption, and could consume a partial output attached to
an unsuccessful history. It now rejects these on the first history response,
before download or normalization. Only fixed diagnostic categories are exposed;
model inputs, exception text and tracebacks are not copied into application errors.
Existing run/API/error-event handling remains the integration path.

The sandbox retains a single exclusive project marker, exact offer/host selection,
no replacement rental, 900-second bootstrap cutoff, 600-second generation timeout,
2400-second overall alarm, and stop/destroy/read-back cleanup. The $1 estimate is
not a provider-enforced billing cap. Disk and transfer charges must not be confused
with GPU inference time or finalized invoice cost.

## Run safely

Use the already approved secure workspace configuration, not repository placeholders.
`COMFYUI_WORKFLOW_ROOT`, `COMFYUI_WORKFLOW_REGISTRY`, `VIDEO_FACTORY_MODEL_REGISTRY`
and the production region must point to the persistent approved registries.

```sh
python tools/wan_quality_probe.py --machine-id REVIEWED_HOST \
  --project wan-qa-UNIQUE --candidate reference50 --runtime comfy-pinned
```

This is read-only with respect to the provider. Add `--execute` only for the reviewed
single-rental experiment. A used project is never rerented, even after failure.
Never bypass a model checksum, doctor, approval or spending gate to obtain an output.

## Actual experiment result

- Instance 50147253 on reviewed machine 12418 (RTX 4090) was created once.
  Container running: 186s; model/doctor verified: 395s; generation: 420.52s;
  cleanup and verified removal: 818s. A separate provider query confirmed zero
  remaining instances. The temporary instance-scoped SSH public-key attachment
  disappeared with the instance; no account-wide key or credential was changed.
- Runtime SSH read-back: ComfyUI `v0.28.0`, commit
  `700821e1364eaab0e8f21c538a2131719fec57bf`. Native workflow SHA:
  `027f37c6bc3aedd8cfc00004b6b078850e641111f9c9e7ef668c8f30feed9477`.
- Native source: H.264, 1280x704, 24fps, 121 frames, 5.041667s, no audio.
  SHA-256: `c0710fc4b2d3a26d235d6b3803ace4a577cb01439e0be484e604f41998a152f5`.
- Local artifact and receipts:
  `/Users/apple/Desktop/Paradigm-video-QA-20260907/wan-qa-pinned-20260907/`.
  Video: `assets/generated/default/ParadigmWan22_00001_.mp4`.
- The $0.362222/hour quote multiplied by 420.52s is approximately $0.0423, **not
  a finalized bill or an all-in usable-video cost**. Startup, transfer, storage,
  failures and future acceptance yield are excluded. Final invoice cost is unknown.
- Ten temporal samples and one native-size frame were visually inspected. Compared
  with the older 640x360 two-second canary: fewer blown highlights, clearly moving
  steam and better ceramic volume. Remaining limitations: steam resembles smoke,
  camera push is weak, and material microdetail is not sufficiently convincing.
  The changed prompt, size and sampler prevent attributing the difference to steps
  alone. No human acceptance or commercial-service comparison was performed.
- FFmpeg decoded all 121 frames, with 121 distinct frame hashes. There were no
  events for `blackdetect=d=0.1:pix_th=0.1` or
  `freezedetect=n=-50dB:d=0.5`. These are limited technical diagnostics, not proof
  of natural physics, subject consistency, compelling direction or final quality.
- The stock image's dedicated fallback startup loaded ComfyUI-Manager despite
  `COMFYUI_ARGS` requesting disabled custom nodes; the old pinned provisioning
  fallback does not inherit those arguments. No new custom node was installed by
  this experiment and the graph uses built-in nodes only. Fix/verify this startup
  behavior before promoting the runtime to production; do not claim all custom
  nodes were disabled in this test.

## Validation and next acceptance evidence

Full service pytest: 162 passed with test-only
`PREFECT_SERVER_EPHEMERAL_STARTUP_TIMEOUT_SECONDS=120`; existing Prefect teardown
logging and dependency deprecation warnings remain. Focused tests: 16 passed;
Ruff, mypy (64 files) and root TypeScript passed. Production remains undeployed.

Record actual native output dimensions/duration/hash, inspected frames and motion,
generation time, total rental interval, known versus unknown billing and independently
verified deletion. Inspect white clipping, ceramic texture, cup geometry, visible
steam and camera continuity. Technical conformance is not a creative quality score.
Do not extend a failed source into a longer master by freezing, looping or upscaling.
