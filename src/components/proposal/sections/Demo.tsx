"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { BorderBeam } from "@/components/magicui/border-beam"
import type { SectionProps } from "./_types"

export default function Demo({ data, theme, t }: SectionProps) {
  const [tab, setTab] = useState(0)
  const tabs = [t("demo.tab_home"), t("demo.tab_menu"), t("demo.tab_reviews")]

  return (
    <section id="demo" style={{ padding: "72px 24px", background: theme.bgAlt }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 32 }}
        >
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 999,
            background: theme.accentSoft, color: theme.accent,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16,
          }}>
            {t("demo.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("demo.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0 }}>{t("demo.subtitle")}</p>
        </motion.div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 4, padding: 4, marginBottom: 16,
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: theme.radiusCard, width: "fit-content", margin: "0 auto 16px",
        }}>
          {tabs.map((label, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding: "8px 16px", border: "none",
              background: tab === i ? theme.accent : "transparent",
              color: tab === i ? "#fff" : theme.textMuted,
              fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Demo iframe / placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            position: "relative",
            aspectRatio: "16 / 10",
            background: theme.surface, border: `1px solid ${theme.border}`,
            borderRadius: theme.radiusCard, boxShadow: theme.shadow, overflow: "hidden",
          }}
        >
          <BorderBeam size={180} duration={9} colorFrom={theme.accent} colorTo={theme.warn} />
          {data.demo_html ? (
            <iframe
              srcDoc={data.demo_html}
              title={`${data.business_name} demo`}
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : data.demo_url ? (
            <iframe
              src={data.demo_url}
              title={`${data.business_name} demo`}
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 48, color: theme.textMuted,
            }}>🎨</div>
          )}
        </motion.div>

        {data.demo_url && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href={data.demo_url} target="_blank" rel="noopener noreferrer"
               style={{ color: theme.accent, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              {t("demo.open_full")} →
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
