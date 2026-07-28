# Optional media-worker contract

The factory control plane intentionally does not embed Blender, Manim, LivePortrait, or MuseTalk. Each approved worker is registered through one environment variable:

```env
BLENDER_ADAPTER_COMMAND=/opt/workers/blender/run
MANIM_ADAPTER_COMMAND=/opt/workers/manim/run
LIVEPORTRAIT_ADAPTER_COMMAND=/opt/workers/liveportrait/run
MUSETALK_ADAPTER_COMMAND=/opt/workers/musetalk/run
```

The factory invokes:

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
