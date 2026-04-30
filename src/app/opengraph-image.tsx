import { ImageResponse } from "next/og"

export const runtime = "edge"
// Brand-neutral OG image (shared across all locales — sits outside [locale] segment).
// Locale-aware OG is a P19 candidate via app/[locale]/opengraph-image.tsx.
export const alt = "Paradigm — Digital growth partner"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #4f46e5, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <span style={{ color: "white", fontSize: "36px", fontWeight: 700 }}>
            Paradigm
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "white",
            fontSize: "56px",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.3,
            marginBottom: "24px",
          }}
        >
          Digital growth partner.
        </div>

        {/* Services */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            color: "#a5b4fc",
            fontSize: "20px",
          }}
        >
          <span>Web</span>
          <span>·</span>
          <span>MEO</span>
          <span>·</span>
          <span>SEO / GEO</span>
          <span>·</span>
          <span>AI</span>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            color: "#64748b",
            fontSize: "18px",
          }}
        >
          paradigmjp.com
        </div>
      </div>
    ),
    { ...size }
  )
}
