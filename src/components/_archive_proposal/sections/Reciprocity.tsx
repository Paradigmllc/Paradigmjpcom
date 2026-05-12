"use client"
import { motion } from "framer-motion"
import type { SectionProps } from "./_types"

export default function Reciprocity({ data, theme, t }: SectionProps) {
  const samples = data.ai_reply_samples ?? []
  if (samples.length === 0) return null

  return (
    <section id="reciprocity" style={{ padding: "72px 24px", background: theme.bg }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
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
            {t("reciprocity.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("reciprocity.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0 }}>{t("reciprocity.subtitle")}</p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          {samples.slice(0, 4).map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                padding: 20, background: theme.surface,
                border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard,
                boxShadow: theme.shadow,
              }}
            >
              <div style={{ marginBottom: 12, padding: 12, background: theme.bg, borderRadius: 8, borderLeft: `3px solid ${theme.textMuted}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted, marginBottom: 4, letterSpacing: "0.08em" }}>
                  {t("reciprocity.original").toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{s.original}</div>
              </div>
              <div style={{ padding: 12, background: theme.accentSoft, borderRadius: 8, borderLeft: `3px solid ${theme.accent}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.accent, marginBottom: 4, letterSpacing: "0.08em" }}>
                  ✨ {t("reciprocity.reply").toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>{s.reply}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
