# Managed OSS media-worker contract

All non-Wan major OSS profiles are registered in `config/engine-profiles.yaml`. GPU-bound external profiles execute only through `video_factory.engine_worker_api`, never as a control-plane subprocess. CPU profiles retain the same request/output contract locally.

Run the worker on the managed GPU host:

```bash
docker build -f Dockerfile.oss-worker -t paradigm-video-factory-oss-worker .
docker run --rm --gpus all --network none \
  -e VIDEO_FACTORY_OSS_WORKER_API_KEY='<32+ random characters>' \
  -v "$PWD/config/engine-profiles.yaml:/app/config/engine-profiles.yaml:ro" \
  -v /opt/video-factory/workers:/opt/workers:ro \
  -v /opt/video-factory/models:/opt/models:ro \
  -p 127.0.0.1:8090:8090 \
  paradigm-video-factory-oss-worker
```

Place TLS and private-network authentication in front of port 8090. Production control-plane settings reject plain HTTP. `--network none` is the preferred runtime posture after all artifacts have been built into or mounted into the host.

The factory control plane intentionally does not embed Blender, Manim, LivePortrait, or MuseTalk. Each approved worker is registered through one environment variable:

```env
BLENDER_ADAPTER_COMMAND=/opt/workers/blender/run
MANIM_ADAPTER_COMMAND=/opt/workers/manim/run
LIVEPORTRAIT_ADAPTER_COMMAND=/opt/workers/liveportrait/run
MUSETALK_ADAPTER_COMMAND=/opt/workers/musetalk/run
WHISPER_ADAPTER_COMMAND=/opt/workers/whisper/run
KOKORO_ADAPTER_COMMAND=/opt/workers/kokoro/run
DEMUCS_ADAPTER_COMMAND=/opt/workers/demucs/run
REAL_ESRGAN_ADAPTER_COMMAND=/opt/workers/real-esrgan/run
RIFE_ADAPTER_COMMAND=/opt/workers/rife/run
GFPGAN_ADAPTER_COMMAND=/opt/workers/gfpgan/run
SAM2_ADAPTER_COMMAND=/opt/workers/sam2/run
REMBG_ADAPTER_COMMAND=/opt/workers/rembg/run
LAMA_ADAPTER_COMMAND=/opt/workers/lama/run
TRIPOSR_ADAPTER_COMMAND=/opt/workers/triposr/run
```

`config/engine-profiles.yaml` is the source of truth for every supported worker.
Noncommercial profiles remain visible in the Console but must never receive a command in
production. Worker images are built ahead of a client job; the command may start only for the
job and must exit after writing the requested output so no GPU model remains resident.

The authenticated worker invokes:

```text
<command...> --request /absolute/request.json --output /absolute/output.mp4
```

The request contains the shot, target deliverable, brand tokens, and rights declaration. A worker must:

1. reject unknown fields and unsafe paths;
2. use only pinned code, model weights, and dependencies listed in the model registry;
3. never download a model or custom node during a client job;
4. write exactly one media file to `--output`;
5. preserve a machine-readable provenance record next to the output;
6. return non-zero on partial or invalid output;
7. avoid outbound network access unless the approved engine contract requires it;
8. never bypass the factory's human approval gate.

## Activation checklist

- [ ] Exact repository and commit pinned
- [ ] Code and model licenses recorded
- [ ] Model/artifact SHA-256 recorded
- [ ] Container or virtual environment built in CI
- [ ] Representative fixture rendered
- [ ] VRAM, timeout, and concurrency limit measured
- [ ] Portrait/voice consent controls tested when applicable
- [ ] Network policy reviewed
- [ ] Adapter command added only after approval

Until these checks pass, the router uses another approved engine or rejects the shot.

Worker health reports `command_configured` and `executable_available` for every managed profile. A production run compares both profile ID and pinned 40-character revision before acquiring the execution path. The worker permits one GPU task at a time, streams only a probed MP4, enforces a byte limit, records SHA-256 provenance, removes temporary files, and exits the task without leaving a model process running.
