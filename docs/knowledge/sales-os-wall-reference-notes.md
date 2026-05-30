# Sales OS Wall Reference Notes

Last updated: 2026-05-30

This note captures external brainstorming links supplied for the Sales OS roadmap. It is intentionally a short implementation memo, not a transcript copy.

## Source Access

- Gemini share: `https://gemini.google.com/share/cd7551d83627`
  - Readable by rendered browser extraction.
  - Topic: global SMB cold form outreach, Shopify Japan-entry offer, video-delivery subscription offer, Wappalyzer-driven targeting, opportunity-loss framing.
- Gemini share: `https://gemini.google.com/share/3ce0c598b274`
  - Readable by rendered browser extraction.
  - Topic: OpenMontage, HyperFrames, ComfyUI API, Remotion-like deterministic video pipeline, human approval before client delivery.
- Claude share: `https://claude.ai/share/24b3467c-6b8f-486b-89f4-e8c7cfbda217`
  - Blocked by Cloudflare security verification in headless retrieval. Re-check with an authenticated/manual browser if these notes become necessary.
- Claude share: `https://claude.ai/share/48e85146-57a7-48c3-918a-6b88f790af99`
  - Blocked by Cloudflare security verification in headless retrieval. Re-check with an authenticated/manual browser if these notes become necessary.

## Decisions Imported Into Sales OS

1. Keep the core offer matrix:
   - Japan: Web production and DX package.
   - Global: Japan Entry Package for Shopify/D2C, and video delivery subscription for ad-heavy D2C or agencies.
2. Use technology and market evidence to create the company karte:
   - Shopify, Meta Pixel, TikTok Pixel, Klaviyo and ad/marketing tags are strong routing signals.
   - Opportunity-loss calculations must be framed as estimates with confidence/source labels, not hard factual claims.
3. Add evidence sources beyond the original list:
   - Similarweb for traffic/geography where budget allows.
   - Meta Ad Library and TikTok public/commercial content APIs for creative volume and ad fatigue signals.
   - Pexels, ElevenLabs and Faster Whisper for video asset generation, narration and captions.
4. Keep form automation conservative:
   - Contact-form automation can run only after anti-bot/CAPTCHA gates pass.
   - Cloudflare Challenge, Turnstile, reCAPTCHA, hCaptcha, DataDome, PerimeterX and similar gates move the lead to human-led review.
5. Treat video delivery as a pipeline, not a single generator:
   - OpenMontage orchestrates research/script/timeline.
   - HyperFrames/Remotion-style rendering keeps text, captions and layout deterministic.
   - ComfyUI generates or adapts visuals.
   - R2/Drive stores delivery artifacts.
   - Slack/Appsmith approval remains before client-facing delivery.

## Implementation Mapping

- API/OSS inventory: `src/lib/sales/integration-registry.ts`
- Wappalyzer-style detection: `src/lib/sales/sources/wappalyzer.ts`
- Form safety classifier: `src/lib/sales/outreach/form-classifier.ts`
- Sales asset templates: `src/lib/sales/content-templates.ts`
- Video generation bridge: `src/lib/sales/video-generator.ts`
- Dashboard inventory view: `src/components/sales-dashboard/SalesCommandPanels.tsx`

## Current Follow-up

- Similarweb, Meta/TikTok ad library, Pexels, ElevenLabs and Faster Whisper were added to the integration registry as environment-gated sources.
- TikTok Pixel and Klaviyo were added to the built-in Wappalyzer-style detector.
- The Claude share links still need manual/browser-authenticated review if their contents include additional implementation details.
