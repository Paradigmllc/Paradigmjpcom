"""Isolated candidate bootstrap. Existing authenticated TLS proxy; no new nodes."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request

from pilot_models import MODELS, COMFY_REVISION, PROVISION_REVISION, PROVISION_SHA256


def fetch_model(root, item):
    repo, revision, relative, size, digest = item
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_file() and target.stat().st_size == size:
        with target.open("rb") as source:
            existing = hashlib.file_digest(source, "sha256").hexdigest()
        if existing == digest:
            return {"exact_artifact": target.name, "sha256": digest}
        raise RuntimeError("Existing candidate artifact checksum mismatch")
    partial = target.with_suffix(".pilot-part")
    url = f"https://huggingface.co/{repo}/resolve/{revision}/split_files/{relative}"
    started = time.monotonic()
    print(json.dumps({"model_download_started": target.name, "bytes": size}), flush=True)
    # Existing image includes aria2: bounded parallel ranges and resumable partials.
    subprocess.run(["aria2c", "--continue=true", "--auto-file-renaming=false",
        "--allow-overwrite=false", "--max-connection-per-server=8", "--split=8",
        "--min-split-size=64M", "--max-tries=3", "--retry-wait=3", "--timeout=45",
        "--connect-timeout=15", "--file-allocation=none", "--console-log-level=error",
        "--summary-interval=0", f"--dir={partial.parent}", f"--out={partial.name}", url],
        check=True, timeout=900, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with partial.open("rb") as source:
        actual = hashlib.file_digest(source, "sha256").hexdigest()
    if partial.stat().st_size != size or actual != digest:
        raise RuntimeError("Downloaded candidate artifact checksum mismatch")
    partial.replace(target)
    print(json.dumps({"candidate_model_verified": target.name, "seconds": round(time.monotonic()-started, 2)}), flush=True)
    return {"exact_artifact": target.name, "sha256": digest}


def candidate_provisioner(source):
    if hashlib.sha256(source).hexdigest() != PROVISION_SHA256:
        raise RuntimeError("Pinned provisioner checksum mismatch")
    # Narrow sandbox correction to the known fallback: actually disable custom nodes.
    old = b"--disable-auto-launch \\\n      --listen 127.0.0.1"
    new = b"--disable-auto-launch \\\n      --disable-all-custom-nodes \\\n      --listen 127.0.0.1"
    if source.count(old) != 1:
        raise RuntimeError("Provisioner fallback changed")
    patched = source.replace(old, new)
    # The candidate owns an exact independent model manifest. Do not first download
    # the unrelated production Wan5B/encoder/VAE bundle and checksum it again.
    begin_marker = b'DIFFUSION_NAME="wan2.2_ti2v_5B_fp16.safetensors"'
    end_marker = b'chmod 600 "$BOOTSTRAP_ROOT/manifest-base.json"'
    if patched.count(begin_marker) != 1 or patched.count(end_marker) != 1:
        raise RuntimeError("Provisioner model block changed")
    begin = patched.index(begin_marker)
    end = patched.index(end_marker, begin) + len(end_marker)
    empty_manifest = b'printf \'{"models":[],"production_approved":false}\\n\' > "$BOOTSTRAP_ROOT/manifest-base.json"\nchmod 600 "$BOOTSTRAP_ROOT/manifest-base.json"'
    patched = patched[:begin] + empty_manifest + patched[end:]
    return patched


def main():
    root = Path("/workspace/video-factory-bootstrap")
    root.mkdir(parents=True, exist_ok=True)
    url = f"https://raw.githubusercontent.com/Paradigmllc/Paradigmjpcom/{PROVISION_REVISION}/scripts/vast/provision-video-factory-wan22.sh"
    with urllib.request.urlopen(url, timeout=30) as response:
        source = response.read()
    patched = candidate_provisioner(source)
    script = root / "candidate-provision.sh"
    script.write_bytes(patched)
    subprocess.run(["bash", str(script)], check=True, timeout=900)
    candidates = [Path(p) for p in ["/workspace/ComfyUI", "/opt/workspace-internal/ComfyUI", "/opt/ComfyUI", "/root/ComfyUI", "/ComfyUI"]]
    comfy = next((p for p in candidates if (p / "main.py").is_file()), None)
    if comfy is None:
        raise RuntimeError("Pinned ComfyUI installation missing")
    revision = subprocess.check_output(["git", "-C", str(comfy), "rev-parse", "HEAD"], text=True).strip()
    if revision != COMFY_REVISION:
        raise RuntimeError("ComfyUI source revision drift")
    pid = int((root / "comfyui.pid").read_text())
    argv = Path(f"/proc/{pid}/cmdline").read_bytes().split(b"\0")
    if b"--disable-all-custom-nodes" not in argv or b"127.0.0.1" not in argv:
        raise RuntimeError("Dedicated runtime must disable custom nodes and bind loopback")
    selected = [item for item in MODELS if 'Wan_2.2' in item[0]] if os.environ.get('PILOT_REUSE_MOTION') == '1' else MODELS
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        models = list(executor.map(lambda item: fetch_model(comfy / "models", item), selected))
    target = root / "manifest-base.json"
    data = json.loads(target.read_text())
    data["pilot"] = {"models": models, "comfy_revision": revision,
                     "custom_nodes_disabled": True, "production_approved": False,
                     "provision_sha256": hashlib.sha256(patched).hexdigest()}
    temporary = root / "manifest-pilot.tmp"
    temporary.write_text(json.dumps(data))
    temporary.replace(target)
    print(json.dumps({"pilot_bootstrap_ready": True}), flush=True)


if __name__ == "__main__":
    main()
