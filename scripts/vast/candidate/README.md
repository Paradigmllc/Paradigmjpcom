# Isolated high-quality candidate bootstrap

This is the recovered Qwen Image 2512 / Wan 2.2 I2V A14B sandbox loader,
not a production workflow approval or a new rental entry point.

- Requires Python 3.11+ and the exact image and source revisions in `pilot_models.py`.
- Verifies the original provisioner SHA before making the narrowly tested sandbox patch.
- Removes the unrelated Wan 5B download/manifest block, but retains the authenticated
  TLS proxy, loopback ComfyUI and disabled custom nodes.
- Downloads two models concurrently. Uses aria2 when present (at most eight ranged
  connections per model), otherwise bounded/resumable curl. Each subprocess has a
  900-second timeout. Partial files remain resumable.
- Reuses complete cache entries only after exact size and SHA-256 verification.
- Publishes the candidate model manifest only after all selected models verify.
- `PILOT_REUSE_MOTION=1` selects Wan-only weights for a hash-validated existing image
  continuation; otherwise both Qwen and Wan are loaded.
- `PILOT_REFERENCE_ONLY=1` selects only the three Qwen artifacts (30.07GB) and takes
  precedence over continuation mode. It does not generate or approve motion.
- The legacy proxy's base workflow advertisement is NOT executable approval for this
  candidate. The runner must validate its own graph, nodes, exact model hashes and
  `pilot` runtime receipt. No production registry is changed by this loader.
- On bootstrap failure, the manifest exposes `pilot.bootstrap_failed=true` and only
  the error category. The runner must immediately abort and verify teardown when
  this flag is set; do not wait until the ordinary bootstrap timeout.

Run the no-network/no-GPU tests from this directory:

```sh
python3 -m unittest -v test_bootstrap
```

The sibling pinned shell script is only read and syntax-checked. The tests mock all
downloads with tiny byte fixtures. Mac system Python 3.9 lacks `hashlib.file_digest`;
use Python 3.11+ (the isolated server test used Python 3.12).

The first real recovery attempt exposed missing aria2 in the pinned image. It was
terminated at 190 seconds with verified removal; no image or video was generated.
The curl fallback and explicit failure receipt were added afterward. A subsequent
Qwen-only sandbox successfully verified all three model hashes and generated the
1664x928 NOCTEA reference in75.4456 seconds after runtime setup; its rental was
destroyed with independent absence verification. That is still-image evidence only.
Fifteen GPU-free tests pass. The subsequent96GB motion benchmark emitted real model
byte progress; concurrent print calls could join JSON objects on one line. A shared
event lock now covers all loader messages, with a forced-interleaving regression.
The lock correction applies to future runs, not the already-running GPU process.
It does not provide cache persistence after instance destruction,
a global spending ledger, or human creative acceptance. Those remain separate work.
