# Isolated high-quality candidate bootstrap

This is the recovered Qwen Image 2512 / Wan 2.2 I2V A14B sandbox loader,
not a production workflow approval or a new rental entry point.

- Requires Python 3.11+ and the exact image and source revisions in `pilot_models.py`.
- Verifies the original provisioner SHA before making the narrowly tested sandbox patch.
- Removes the unrelated Wan 5B download/manifest block, but retains the authenticated
  TLS proxy, loopback ComfyUI and disabled custom nodes.
- Downloads two models concurrently, each with at most eight ranged connections,
  a 900-second timeout and three attempts. Partial files remain resumable.
- Reuses complete cache entries only after exact size and SHA-256 verification.
- Publishes the candidate model manifest only after all selected models verify.
- `PILOT_REUSE_MOTION=1` selects Wan-only weights for a hash-validated existing image
  continuation; otherwise both Qwen and Wan are loaded.
- The legacy proxy's base workflow advertisement is NOT executable approval for this
  candidate. The runner must validate its own graph, nodes, exact model hashes and
  `pilot` runtime receipt. No production registry is changed by this loader.

Run the no-network/no-GPU tests from this directory:

```sh
python3 -m unittest -v test_bootstrap
```

The sibling pinned shell script is only read and syntax-checked. The tests mock all
downloads with tiny byte fixtures. Mac system Python 3.9 lacks `hashlib.file_digest`;
use Python 3.11+ (the isolated server test used Python 3.12).

This correction has not yet passed a new paid model bootstrap or generated the
NOCTEA beauty film. It does not provide cache persistence after instance destruction,
a global spending ledger, or human creative acceptance. Those remain separate work.
