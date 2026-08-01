from __future__ import annotations

import argparse
import json

from .workflow_registry import merge_workflow_registry_defaults


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Safely merge bundled Video Factory workspace defaults.",
    )
    parser.add_argument("--workflow-defaults", required=True)
    parser.add_argument("--workflow-target", required=True)
    arguments = parser.parse_args()

    added = merge_workflow_registry_defaults(
        defaults_path=arguments.workflow_defaults,
        target_path=arguments.workflow_target,
    )
    print(
        json.dumps(
            {
                "workspace_bootstrap": "workflow_registry",
                "added": len(added),
                "workflow_ids": added,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
