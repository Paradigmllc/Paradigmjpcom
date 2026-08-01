#!/bin/sh
set -eu

workspace="${VIDEO_FACTORY_WORKSPACE:-/data/video-factory}"
mkdir -p "${workspace}"
chown -R factory:factory "${workspace}"

if [ "$#" -eq 0 ]; then
  set -- uvicorn video_factory.web:app --host 0.0.0.0 --port 8080
fi

exec gosu factory "$@"
