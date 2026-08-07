# YouTube Media OS architecture

## Entertainment-first production path

`research_ingest -> editorial_blueprint -> narration -> entertainment_pilot -> GPU assets -> HyperFrames/OpenCut assembly -> creative review -> professional_master -> derivatives`

The entertainment pilot is persisted in SQLite and exposed through the dashboard API. It turns scene-level narration into a 90-second, 14-26 shot package with treatment alternatives, host appearance rules, visual asset requests, evidence bindings, and a dedicated creative-plan report. This prevents the deterministic long-form renderer from treating technically valid presentation-style motion graphics as a publishable YouTube master.

## Product boundary

This repository operates a portfolio of Japanese and English YouTube channels. It is intentionally separate from the Paradigm corporate site, Sales OS, and unrelated creator products.

## Initial flow

1. Research imports public records and authoritative reporting.
2. Evidence ledger stores every source and atomic claim.
3. Claims receive one of: confirmed, alleged, disputed, hypothesis, dramatized, or rejected.
4. Script planning can only cite claims linked to stored sources.
5. Channel-specific editorial DNA generates a deterministic 10–20 minute blueprint, then blocks source, originality, structural-similarity, synthetic-media, or advertiser-safety defects below the 92/100 gate.
6. Storyboard separates drama beats from Evidence Room beats and targets a 10–20 minute YouTube master.
7. Providers generate visuals, narration, captions, and motion assets.
8. HyperFrames produces the deterministic 16:9 long-form review master.
9. Human gates approve factual accuracy, rights, legal risk, originality, and advertiser suitability.
10. Approved master timecodes become a distribution manifest for a YouTube summary, YouTube Shorts, TikTok, and Instagram Reels.
11. OpenCut may prepare editorial decisions; FFmpeg performs deterministic trims, reframing, caption burn-in, encoding, and media checks.
12. Every derivative receives its own hook, caption layout, packaging, and review. It is never treated as an unrelated original claim.
13. Only approved assets may enter a publisher adapter.

## Master and derivative model

The long-form episode is the editorial source of truth. A typical episode produces one 10–20 minute 16:9 master, one optional 3–6 minute YouTube summary, two to four 9:16 highlights, and a short teaser. Derivatives store the parent asset, source timecode segments, platform, aspect ratio, editor, caption mode, status, and output manifest.

Simple footage may be reframed by FFmpeg. Evidence cards, timelines, and dense graphics are re-composed as native 9:16 HyperFrames scenes instead of center-cropping the 16:9 master. The same factual claim may travel across platforms, but its attribution and claim status must remain visible.

The executable derivative contract is a versioned EDL JSON manifest containing the source, output profile, ordered intervals, narrative roles, and claim IDs. The worker renders intervals to a normalized codec and frame before concatenation, then verifies dimensions and total duration. Transcript JSON passes a separate language and timing gate before any captions are burned in. This keeps editorial selection, transcript cleanup, rendering, and release approval independently testable.

## Provider boundaries

| Interface | Initial implementation | Later candidates |
| --- | --- | --- |
| ResearchProvider | Manual seed + Crawl4AI/Steel adapter contract | Scrapling, PaddleOCR |
| ScriptProvider | Deterministic evidence-to-scene planner | DeepSeek, Dify, local models |
| ImageProvider | Placeholder evidence graphics | ComfyUI on Vast.ai, Sana |
| VideoProvider | HyperFrames motion graphics | LTX-Video, LongCat-Video |
| VoiceProvider | Kokoro stock voices; Misaki Japanese G2P; no real-person cloning | Additional rights-reviewed stock models only |
| Renderer | HyperFrames long-form master | OpenCut edit decisions + FFmpeg derivative renders |
| Publisher | Disabled | YouTube Data API after approval |

## Data ownership

SQLite is used for credential-free local development. The production schema is portable to Postgres/Supabase. Generated media belongs in object storage, while the database stores manifests, provenance, hashes, status, cost, and review decisions.

## Safety invariants

- Allegations are never rewritten as confirmed facts.
- Dramatized dialogue is labeled and cannot be used as evidence.
- A source URL alone is insufficient; each claim stores the supporting excerpt or structured locator.
- Real-person face or voice cloning requires explicit rights metadata and manual approval.
- AI provenance metadata is retained.
- Every social cut retains parent asset ID, source timecodes, claim IDs, transcript word IDs, and rights metadata.
- Japanese audio is transcribed with a multilingual Whisper model and explicit `ja`; `.en` models are only used for confirmed English audio.
- Publishing is fail-closed.
- Narration cache keys include text, voice, model, QA method, and threshold; stale output cannot bypass a stricter review policy.
- Editorial blueprints carry channel DNA, ordered structural fingerprints, and a versioned quality report; peer similarity at or above 58% blocks the job.
- Synthetic expert personas and real-person likeness or voice cloning are disabled. Introducing realistic generated scenes forces a new disclosure review.
