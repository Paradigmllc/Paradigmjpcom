"use client"
import { motion } from "framer-motion"
import type { SectionProps } from "./_types"

export default function Nav({ data, theme, t }: SectionProps) {
  const links: { href: string; key: string }[] = [
    { href: "#hero", key: "overview" },
    { href: "#diagnosis", key: "diagnosis" },
    { href: "#video", key: "video" },
    { href: "#demo", key: "demo" },
    { href: "#cases", key: "cases" },
    { href: "#whyus", key: "whyus" },
    { href: "#cta", key: "contact" },
  ]
  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "sticky", top: 0, zIndex: 50,
        background: theme.surface, borderBottom: `1px solid ${theme.border}`,
        backdropFilter: "saturate(140%) blur(12px)",
      }}
    >
      <div style={{
        maxWidth: 1120, margin: "0 auto", padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 8,
            background: theme.accent, color: "#fff", fontSize: 13,
          }}>P</span>
          <span style={{ color: theme.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.business_name}
          </span>
        </div>
        <ul style={{ display: "flex", listStyle: "none", gap: 24, padding: 0, margin: 0, fontSize: 13 }}>
          {links.map(l => (
            <li key={l.key} style={{ display: "none" }} className="proposal-nav-item">
              <a href={l.href} style={{ color: theme.textMuted, textDecoration: "none", fontWeight: 500 }}>
                {t(`nav.${l.key}`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .proposal-nav-item { display: list-item !important; }
        }
      `}</style>
    </motion.nav>
  )
}
