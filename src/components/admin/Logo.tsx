import React from "react"

const Logo: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 4px",
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "linear-gradient(135deg, #C1272D 0%, #1E3A5F 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      P
    </div>
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text)" }}>
        Paradigm CMS
      </span>
      <span style={{ fontSize: 11, color: "var(--theme-elevation-500)" }}>
        paradigmjp.com
      </span>
    </div>
  </div>
)

export default Logo
