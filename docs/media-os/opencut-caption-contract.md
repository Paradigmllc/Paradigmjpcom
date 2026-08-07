# OpenCut and caption contract

## Compatibility boundary

OpenCut's active rewrite is designing an Editor API, MCP server, headless mode, and scripting surface. The currently usable editor remains OpenCut Classic. Media OS therefore does not import OpenCut internals as a runtime dependency. It accepts a serialized project snapshot through a narrow adapter and records the inspected upstream commit in every generated EDL.

The reference snapshot is OpenCut Classic commit `cf5e79e919144200294fb9fed22a222592a0aeea`, where the current project version is 31. Project version 23 migrated timeline values from seconds to integer ticks at 120,000 ticks per second.

## Accepted OpenCut subset

- One selected scene, resolved from `currentSceneId`, `isMain`, or an explicit scene ID/name.
- One visible main video track.
- One source `mediaId` across all selected video elements.
- Playback rate exactly 1.0.
- Non-overlapping clips ordered by `startTime`.
- Optional `params.mediaOs` metadata containing `role`, `claimIds`, `wordIds`, and `requiredAttribution`.

Multiple media sources and retimed clips are rejected until the FFmpeg worker can reproduce those semantics exactly. Timeline gaps are reported in the adapter manifest because the current EDL concatenator intentionally emits only selected source intervals.

## Caption traceability

1. The transcript gate assigns stable word IDs and rejects invalid language/model combinations, timestamps, and noise ratios.
2. The ASS generator groups words by language-aware character limits, duration, silence gaps, and terminal punctuation.
3. Every ASS `Dialogue` event stores `mediaos:<caption-id>:<word-id>|...` in its `Effect` field.
4. A JSON sidecar retains caption text, times, and word IDs for review tools and later corrections.
5. FFmpeg loads a SHA-256-verified Noto Sans JP font from a pinned Google Fonts commit, then validates the rendered duration and dimensions with `ffprobe`.

Generated media, font cache, and review artifacts remain outside Git. Source manifests, adapters, tests, and license metadata stay versioned.
