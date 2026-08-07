# OSS adoption register

## Gracecom1 star watchlist snapshot — 2026-08-02

The starred-repository list is treated as a discovery feed, not an automatic dependency list. The current recent page adds these Media OS candidates:

| Project | Possible use | Decision |
| --- | --- | --- |
| PixelRAG | Pixel-native retrieval for image-heavy filings and scanned evidence | Evaluate against PaddleOCR on a fixed document set |
| LongCat-Video | Generated establishing shots and abstract reconstructions | Adapter only; review code and model-weight licenses before GPU trials |
| voicebox / voice-pro | Narration studio and local TTS experiments | Adapter only; real-person cloning stays disabled |
| openscreen | Internal workflow demos and operator training | Useful outside the render master |
| screenshot-to-code | Rapid reconstruction of approved graphic references | Design utility only; generated code requires review |

The inventory should be refreshed periodically because the star list is large and changes continuously.

## Adopt now

| Project | Use | Boundary |
| --- | --- | --- |
| HyperFrames | Deterministic composition, validation, inspection, rendering | Source of truth for review video |
| Crawl4AI | Research ingestion adapter | Public sources only; obey site rules |
| Steel Browser | Browser automation adapter | No CAPTCHA bypass or anti-detect behavior |
| PaddleOCR | PDF/image extraction | Preserve page and bounding-box provenance |
| ComfyUI | Image/video workflow API | Separate GPL service; workflow JSON versioned |
| Whisper | Transcription and narration QA | Back-transcribe every final narration |
| AntV Infographic | Timelines and relationship diagrams | Export into HyperFrames-compatible assets |
| OpenCut Classic | Human or agent-assisted timeline editing | Serialized project is adapted into the deterministic Media OS EDL; retimed or multi-source timelines fail closed |
| Noto Sans JP | Deterministic Japanese ASS subtitles | Pinned Google Fonts commit, SIL OFL license, SHA-256 verified before use |
| Kokoro ONNX | Local rights-reviewed stock narration | MIT adapter and Apache-2.0 model; model files are SHA-256 verified; no reference audio or named-person imitation |
| Misaki | Japanese text-to-phoneme conversion | Pin 0.7.17 for Windows portability; the direct eSpeak Japanese path failed regression QA |
| Faster Whisper | Word timestamps and narration QA | Japanese uses multilingual `small` with explicit `ja`; English-only models require confirmed English audio |
| auto-editor | Post-production experiments | Candidate discovery only; never replaces the reviewed edit manifest |

## Evaluate behind adapters

Jellyfish supplies the strongest reference model for script breakdown, reusable entities, shot readiness, and asynchronous generation. ArcReel is useful as an architectural reference but remains isolated pending AGPL review. MoneyPrinterTurbo is a component source for batch assembly, not a quality target. Voicebox, GPT-SoVITS, LTX-Video, LongCat-Video, LatentSync, n8n, Dify, and Remotion require per-project license and model-weight review.

## Blocked categories

- AI watermark or provenance removal
- Unlicensed real-person deepfakes or voice clones
- CAPTCHA bypass, anti-detect, proxy, or Tor tooling
- Unverified stock footage or music
- Repetitive template output with minimal editorial variation
