# Media OS production runbook

## Operational boundary

The local production lane is ready for source-linked script manifests, rights-safe stock narration, back-transcription, word timestamps, captions, deterministic media rendering, and human review. Publishing remains fail-closed. A `review_required` job is not permission to upload; factual, legal, originality, advertiser-suitability, pronunciation, rights, and final visual checks still require approval.

## First workstation setup

```powershell
npm ci
npm run voice:bootstrap
npm run voice:assets
npm run ops:preflight
```

The voice runtime is isolated under `.cache/voice-runtime`. Kokoro model assets are copied from a verified HyperFrames cache when available or downloaded from the pinned upstream release, then checked against fixed SHA-256 values. Japanese uses Misaki `0.7.17` G2P because direct Japanese text through the generic eSpeak path failed the regression audio test.

## Start Studio and worker

Configure `.env.local` from `.env.example`. Network-exposed production requires both `MEDIA_OS_STUDIO_ENABLED=true` and a non-empty `MEDIA_OS_ADMIN_TOKEN`.

```powershell
npm run build
npm run start
```

Run the queue worker in a separate process:

```powershell
npm run worker:start
```

The worker polls every five seconds and atomically claims narration, editorial-blueprint, or HyperFrames compilation jobs. Narration reuses segments only when the text, approved voice, model, QA version, and threshold hashes match. A supported worker job left in `running` for six hours is safely re-queued on the next startup.

## Direct the 90-second entertainment pilot first

Do not send a 10-20 minute master directly from editorial blueprint to final render. Queue `entertainment_pilot` after the evidence-linked blueprint and narration manifest exist. Studio exposes this as **90秒エンタメ演出を設計**.

The worker writes the following under `renders/entertainment/<episode-id>/`:

- `pilot-plan.json`: three treatment options and the selected shot-by-shot direction
- `creative-quality-report.json`: pacing, entertainment, host, evidence, and synthetic-media checks
- `visual-assets.json`: deterministic ComfyUI requests with seeds, rights, and disclosure metadata
- `.hyperframes/expanded-prompt.md`: the full per-shot production breakdown
- `pilot-run.json`: hashes, score, review gate, and render-readiness state

For a 90-second pilot, the default gate requires 14-26 shots, a 3-7 second average shot, at least six visual modes, no more than 15% pure presentation frames, and 12-30% fictional-host presence. The host cannot remain as a permanent corner overlay. Realistic host or reconstruction shots must disable real-person likeness and carry synthetic-content disclosure metadata.

The creative-plan score is not rendered-video quality. A 100/100 plan means the direction package is ready for character/style review and GPU asset generation. `renderReady` remains false until all requested generated assets pass provenance, rights, and hash verification and the audience-facing pilot assembly passes visual review.

```powershell
npm run entertainment:pilot-ja
npm run entertainment:pilot-en
```

After direction approval, `comfyui_hyperframes` consumes the entertainment pilot's `visual-assets.json` rather than the older scene-level fallback. If no approved GPU endpoint is available, the job fails closed.

## Compile approved long-form scenes

Queue `hyperframes` only after the episode has a passing `renders/editorial/<episode-id>/quality-report.json`. The worker then:

1. Loads the approved blueprint and its quality report; blocked or mismatched inputs fail closed.
2. Selects the channel-specific design system from `config/channel-design-systems.json`.
3. Emits a 10–20 minute master and a 60-second review project under `renders/hyperframes-projects/`.
4. Splits every scene into a seekable sub-composition and writes an expanded prompt, design contract, and SHA-256 compilation manifest.
5. Runs HyperFrames lint, WCAG validation, and nine-sample layout inspection against the review project.
6. Moves the job to `review_required` with the `hyperframes_layout_contrast_and_motion_review` gate.

Compilation does not publish or render the full master automatically. Review the 60-second project, evidence locators, transitions, and scene variation before approving an expensive master render.

Before Wave A production, run the portfolio-wide structural audit:

```powershell
npm run portfolio:variation-audit
```

It must report 24 blueprints, 276 comparisons, zero failures, and maximum similarity below 58%.

## Create episode narration

1. Copy an existing manifest from `operations/episode-enron-ja/narration.json` or its English counterpart.
2. Use only approved bundled stock voices. Reference audio, named-person imitation, and cloning fields are rejected.
3. Split narration into correction-sized segments. Evidence and outcome segments must retain claim IDs.
4. Click **ナレーションを生成** in Studio, or run the manifest directly during development.

```powershell
npm run narration:pilot-ja
npm run narration:pilot-en
```

Outputs are placed under `renders/narration/<episode-id>/`:

- `narration.wav`: concatenated 48 kHz mono review audio
- `transcript.validated.json`: stable word IDs, segment IDs, claim IDs, and timestamps
- `captions.ass` and `captions.json`: caption render input and traceability sidecar
- `narration-run.json`: hashes, licenses, QA scores, state, and review gate

## Automatic quality gates

- Japanese is back-transcribed with multilingual Faster Whisper and explicit `ja`; `.en` models are rejected.
- Japanese compares expected and recognized pronunciation by Misaki phonemes, avoiding false failures from homophones.
- English compares normalized words and uses an English-only model only for confirmed English audio.
- Empty transcripts, language mismatches, timing reversals, excessive noise, or accuracy below the manifest threshold fail the job.
- Words shorter than 50 ms are merged with a neighbor and then revalidated; they are never passed through as unstable caption events.
- Model assets, final audio, transcripts, and captions receive SHA-256 hashes.

## Human review checklist

Before moving an editorial-blueprint job beyond `review_required`, confirm the SQLite quality report is `pass`, its score is at least 92, nearest-peer similarity is below 58%, and the thesis, counterpoint, and takeaway are genuinely case-specific. The numeric gate cannot replace editorial judgment.

Before moving a narration job beyond `review_required`:

1. Listen to every segment and the concatenated file with headphones.
2. Confirm names, acronyms, dates, currencies, legal terms, and allegation language.
3. Compare each evidence segment with its claim IDs and source locator.
4. Check that no voice resembles or is presented as a real person.
5. Scrub the caption timeline at every segment boundary and verify safe-area placement.
6. Record approval in the release gate before master rendering or distribution.

Before moving a HyperFrames job beyond `review_required`, confirm the compilation manifest matches the approved blueprint fingerprint, all three automated checks are `pass`, every allegation remains visibly labeled, source locators are readable, no real-person likeness was synthesized, and the six layout modes do not create repetitive or clipped sequences.

## Recovery

- Correct only the affected segment text and rerun. Unchanged segment hashes are reused.
- A failed run writes its cause to both `narration-run.json` and the SQLite production job.
- Delete no cache during ordinary recovery. Use `--force` on `run-narration-pipeline.mjs` only when intentionally regenerating every segment.
- Run `npm run ops:preflight` after moving the repository or changing runtimes.

## Production deployment

The production topology uses one immutable image with three services:

- `studio`: Next.js dashboard and authenticated API on port 3000.
- `voice-bootstrap`: a fail-closed one-shot service that verifies the pinned Python runtime, SHA-256-pinned Kokoro assets, and the `small`/`small.en` Faster Whisper caches before the worker starts.
- `worker`: a single-concurrency SQLite queue consumer. The production allowlist is `narration,editorial_blueprint,hyperframes`; GPU generation remains disabled on the shared host.
- `media-os-data`: persistent SQLite volume shared by Studio and worker.
- `media-os-renders`: persistent manifests and compiled HyperFrames projects.
- `media-os-models`: persistent Kokoro and Faster Whisper model cache shared by Studio, bootstrap, and worker.

The Linux image installs the exact versions in `config/voice-runtime-requirements.txt` under `/opt/voice-runtime`. It never uses the system Python for production jobs. Japanese synthesis uses Misaki G2P, English uses Kokoro's confirmed English path, and back-transcription retains the strict non-English `.en` model rejection. A failed model preload prevents the worker from starting; it does not silently download or switch models inside a claimed job.

Create `.env.production` only on the server. Never commit it. It must define a unique release fingerprint, hostname, random admin token, and random Basic-auth password. The public health endpoint exposes only service, release, database readiness, and channel count. Every dashboard and mutation route is protected by Basic or bearer authentication.

Deploy and verify from the dedicated application directory:

```bash
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail --silent https://$MEDIA_OS_HOSTNAME/api/health
```

A deploy is complete only when the health response contains the intended `MEDIA_OS_RELEASE_FINGERPRINT`, an unauthenticated dashboard request returns HTTP 401, an authenticated dashboard request returns HTTP 200, and both containers are healthy/running. Publishing remains intentionally disabled behind human review.
