#!/usr/bin/env bash
set -euo pipefail

video-factory validate examples/briefs/saas-launch.yaml
video-factory plan examples/briefs/saas-launch.yaml --output /tmp/video-factory-manifest.json
video-factory run examples/briefs/saas-launch.yaml --dry-run
