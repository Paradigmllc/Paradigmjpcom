/**
 * app/icon.tsx — favicon / PWA icon (192/512) dynamic generator via ImageResponse
 *
 * 役割: 16x16 〜 512x512 の icon を一発で動的生成 (Next.js File Convention)。
 *       static .png ファイルを置く代わりに edge runtime の ImageResponse で
 *       gradient + "P" mark を出力。
 */

import { ImageResponse } from "next/og"

export const size = { width: 192, height: 192 }
export const contentType = "image/png"
export const runtime = "edge"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5 0%, #818cf8 50%, #14b8a6 100%)",
          color: "#FAFAF7",
          fontSize: 128,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          fontFamily: "sans-serif",
        }}
      >
        P
      </div>
    ),
    { ...size }
  )
}
