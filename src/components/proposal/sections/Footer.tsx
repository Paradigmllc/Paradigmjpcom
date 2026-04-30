"use client"
import type { SectionProps } from "./_types"

export default function Footer({ theme, t }: SectionProps) {
  return (
    <footer style={{
      padding: "32px 24px",
      borderTop: `1px solid ${theme.border}`,
      background: theme.bgAlt,
      textAlign: "center",
      fontSize: 12,
      color: theme.textMuted,
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <span>{t("footer.copyright")}</span>
          <span>·</span>
          <span>{t("footer.powered")}</span>
        </div>
      </div>
    </footer>
  )
}
