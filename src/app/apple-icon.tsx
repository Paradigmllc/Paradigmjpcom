/**
 * app/apple-icon.tsx — Apple touch icon (180x180) for iOS home screen
 */

import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"
export const runtime = "edge"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #f59e0b 100%)",
          color: "#FAFAF7",
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          fontFamily: "sans-serif",
          borderRadius: 40,
        }}
      >
        P
      </div>
    ),
    { ...size }
  )
}
