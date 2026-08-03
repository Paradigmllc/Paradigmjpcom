# Pet Life Movie — Motion Design System

## Brand promise

Turn real family photos into a private keepsake that feels authored, never generic. The pet's identity is protected: source-conditioned GPU motion may add only restrained natural movement, while supplied images remain the identity reference and editorial fallback.

## Palette

- Canvas: `#17131A` — warm charcoal, never pure black.
- Paper: `#F7F1E8` — warm ivory, never pure white.
- Ink: `#2B202A`.
- Warm accent: `#D97A62`.
- Playful accent: `#E8A838`.
- Memorial accent: `#8D7BAF`.
- Support sage: `#71856F`.

Each template uses one dominant accent. Gradients are atmospheric only and never used as text fill.

## Typography

- Japanese emotional voice: `BIZ UDPMincho`, 700–900 for titles and 400 for captions.
- Latin emotional voice: `Fraunces`, 700–900 for titles and 350–450 for captions.
- Metadata voice: `IBM Plex Mono`, 600–700.
- Display titles occupy 60–78% of the title-safe width. Captions are at least 46 px at 1080×1920 and 38 px at 1920×1080.
- Caption lines are limited to two, with strong outline/scrim contrast and fixed reading time.

## Layout and safety

- Title-safe margin: 8% on landscape/square, 9% on vertical.
- Social UI exclusion: an additional 13% at the bottom of vertical deliverables.
- Faces and source-photo focal areas remain outside caption plates whenever possible.
- Every scene has background, image, and foreground-detail layers.

## Motion language

- `warm-keepsake`: slow-build–breathe–resolve. Gentle focus pulls, page-like reveals, 0.65 s transitions.
- `playful-scrapbook`: hook–bounce–hold–smile. Elastic paper reveals, directional pans, 0.38 s transitions.
- `cinematic-tribute`: drift–build–peak–resolve. Restrained push-ins, light-leak transitions, 0.8 s transitions.
- Entrances use varied direction, scale, and focus. No wall-clock or random motion; all frames must be deterministic.
- Outgoing scenes remain visible; the incoming transition performs the handoff. Only the final scene fades to the canvas.

## Image treatment

- Photos use cover crop with a blurred, accent-tinted background fill so portrait and landscape sources both feel intentional.
- Motion alternates among slow push, lateral pan, perspective drift, and near-still focus pull.
- A subtle grain layer and edge vignette prevent flat digital slides while preserving the source image.

## Do not

- Do not accept facial changes, altered markings, missing body parts, or events not present in the supplied photos; reject the shot when the source-fidelity gate fails.
- Do not use neon SaaS gradients, generic centered card layouts, or identical movement in every scene.
- Do not place captions under mobile platform controls.
- Do not auto-deliver internal QA renders or send customer email for them.
