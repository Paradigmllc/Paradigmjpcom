# Paradigm Website Showreel — Design System

## Art direction

A 12-second editorial systems film for Paradigm's website. The composition
should feel like a calm control room: tactile 3D system imagery, precise rules,
large typography, and restrained operational labels. It must communicate that
video, web, AI, and Japan-market execution are coordinated as one system.

The film is intentionally language-light so it works on both Japanese and
English pages. It does not use client logos, fabricated dashboards, invented
metrics, stock people, or unsupported outcome claims.

## Canvas and safe area

- Canvas: 1920 × 1080, 16:9
- Safe area: 88px on every edge
- Primary grid: 12 columns, 24px gutters
- Panel radius: 28px
- Rule weight: 1–2px

## Palette

- Paper: `#FAFAF7`
- Ink: `#0F1115`
- Cobalt: `#2563EB`
- Emerald: `#10B981`
- Amber: `#F59E0B`
- Muted ink: `#646A73`
- Hairline: `rgba(15, 17, 21, 0.16)`

## Typography

- Display: `Arial Narrow`, `Helvetica Neue`, sans-serif; condensed, uppercase
- Body: `Helvetica Neue`, Arial, sans-serif
- Operational labels: `IBM Plex Mono`, `SFMono-Regular`, monospace
- Do not use Inter, Roboto, or Noto Sans.
- Display sizes: 104–152px
- Label sizes: 22–30px

## Motion

- Beat map: drift → build → peak → resolve
- Scene transitions: 400ms blur-dissolve with a horizontal wipe rule
- Entrances: opacity + 20–56px vertical travel; image drift at 1.02–1.07 scale
- Each scene has an entrance. No scene exit animation except the final resolve.
- Easing: `power3.out` for entrances, `power2.inOut` for transitions.
- Motion stays deterministic and timeline-driven; no CSS keyframes.

## Scene plan

1. **System / 0.0–3.2s** — execution-studio image, “VIDEO · WEB · AI”
2. **Video / 2.8–6.2s** — video-production image, four-step delivery rail
3. **Market / 5.8–9.2s** — Japan-market image, “LOCAL SIGNAL / CLEAR ACTION”
4. **Resolve / 8.8–12.0s** — web-AI image, “PARADIGM / EXECUTION SYSTEM”

## Audio

No audio. The website embed is muted and includes native controls.
