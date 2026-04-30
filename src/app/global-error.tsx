"use client"

/**
 * app/global-error.tsx — root-level Error Boundary (catches errors in [locale]/layout.tsx itself)
 *
 * 役割: route-level error.tsx が catch できないトップレベルの layout エラーを処理。
 *       Next.js 規約: must include <html> and <body>.
 * 入力: { error: Error & { digest?: string }; reset: () => void }
 * 出力: locale 非依存の minimal error page (英語のみ・最後の砦)
 */

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error]", { message: error.message, digest: error.digest })
  }, [error])

  return (
    <html>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FAFAF7",
          color: "#1c1c2e",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center", padding: "0 24px" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ec4899", marginBottom: 12 }}>
            Critical error
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, marginBottom: 16 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#6b7280", marginBottom: 32 }}>
            A critical error occurred. Please refresh the page or contact us at info@paradigmjp.com.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#1c1c2e",
              color: "#FAFAF7",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
