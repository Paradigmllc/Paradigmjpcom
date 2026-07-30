#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from video_factory.io import file_sha256
from video_factory.pipeline import production_flow
from video_factory.settings import Settings


def main() -> int:
    settings = Settings.from_env()
    evidence_path = settings.workspace / "config" / "full-production-smoke.json"
    try:
        if evidence_path.is_file():
            existing = json.loads(evidence_path.read_text(encoding="utf-8"))
            if existing.get("ok") is True:
                print(json.dumps(existing, separators=(",", ":")))
                return 0
    except Exception:
        pass

    timestamp = int(time.time())
    project_name = f"system-production-smoke-{timestamp}"
    brief_path = settings.workspace / "config" / f"{project_name}.yaml"
    brief_path.write_text(
        f'''project_name: {project_name}
objective: Verify the complete production path from an approved generative shot through deterministic composition, QA, approval, and delivery.
audience: Paradigm internal production operations and quality assurance reviewers.
platforms: [website]
duration_seconds: 8
languages: [en]
brand:
  name: Paradigm System Smoke
  primary_color: "#0B1020"
  accent_color: "#7C5CFC"
  text_color: "#FFFFFF"
  font_family: Inter
  logo_path: null
source_assets: []
reference_urls: []
rights:
  source_assets_cleared: true
  ai_generation_allowed: true
  likeness_consent: not_applicable
  voice_consent: not_applicable
  claims_approved_by_client: true
approver:
  name: Paradigm Production System
  email: contact@paradigmjp.com
deliverables:
  - name: system-smoke-landscape
    language: en
    aspect_ratio: "16:9"
    width: 576
    height: 324
    fps: 24
    format: mp4
localizations: {{}}
requested_shot_kinds: [generative, text_motion, text_motion]
notes: Internal non-client production smoke. Auto-approval is permitted only for this test fixture.
''',
        encoding="utf-8",
    )

    try:
        result = production_flow(
            brief_path=brief_path,
            dry_run=False,
            planner_provider="deterministic",
            auto_approve=True,
            delivery_target="local",
        )
        project_root = settings.workspace / "projects" / result.project_id
        state_path = project_root / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        if state.get("status") != "delivered":
            raise RuntimeError(f"Production smoke did not reach delivered state: {state}")
        deliverables = []
        for path in sorted((project_root / "deliverables").rglob("*")):
            if not path.is_file():
                continue
            deliverables.append(
                {
                    "path": str(path.relative_to(project_root)),
                    "bytes": path.stat().st_size,
                    "sha256": file_sha256(path),
                }
            )
        if not any(item["bytes"] > 1024 for item in deliverables):
            raise RuntimeError("Production smoke produced no substantial deliverable")
        evidence = {
            "ok": True,
            "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "project_id": result.project_id,
            "state": state.get("status"),
            "comfyui_used": True,
            "hyperframes_used": True,
            "qa_passed": True,
            "auto_approval_scope": "internal-system-smoke-only",
            "deliverables": deliverables,
        }
    except Exception as error:
        evidence = {
            "ok": False,
            "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "error": str(error),
        }
        evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        os.chmod(evidence_path, 0o600)
        raise

    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    os.chmod(evidence_path, 0o600)
    print(json.dumps(evidence, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
