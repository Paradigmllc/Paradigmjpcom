"use client"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import type { SectionProps } from "./_types"

export default function Diagnosis({ data, theme, t }: SectionProps) {
  const ai = data.ai_analysis
  const score = ai?.overall_score ?? data.match_score ?? 0
  const strengths = ai?.strengths ?? []
  const weaknesses = ai?.weaknesses ?? data.review_analysis?.weaknesses ?? []

  return (
    <section id="diagnosis" style={{ padding: "72px 24px", background: theme.bg }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <span style={{
            display: "inline-block", padding: "4px 10px", borderRadius: 999,
            background: theme.accentSoft, color: theme.accent,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16,
          }}>
            {t("diagnosis.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("diagnosis.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0 }}>
            {t("diagnosis.subtitle", { name: data.business_name })}
          </p>
        </motion.div>

        {/* スコアリング */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
          {/* 強み */}
          {strengths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{
                padding: 20, background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusCard, boxShadow: theme.shadow,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 12, letterSpacing: "0.05em" }}>
                ✓ {t("diagnosis.strengths_title").toUpperCase()}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {strengths.slice(0, 5).map((s, i) => (
                  <li key={i} style={{ fontSize: 14, color: theme.text, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#10B981" }}>•</span>{s}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* 課題 */}
          {weaknesses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{
                padding: 20, background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: theme.radiusCard, boxShadow: theme.shadow,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.warn, marginBottom: 12, letterSpacing: "0.05em" }}>
                ⚠ {t("diagnosis.weaknesses_title").toUpperCase()}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {weaknesses.slice(0, 5).map((w, i) => (
                  <li key={i} style={{ fontSize: 14, color: theme.text, paddingLeft: 16, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: theme.warn }}>•</span>{w}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* スコアバー */}
        <div style={{
          padding: "24px 28px", background: theme.surface,
          border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard, boxShadow: theme.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{t("diagnosis.score_label")}</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: score < 60 ? theme.warn : theme.accent }}>
              <NumberTicker value={score} />/100
            </span>
          </div>
          <div style={{ height: 8, background: theme.bg, borderRadius: 999, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${score}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                height: "100%",
                background: score < 60
                  ? `linear-gradient(90deg, ${theme.warn}, #F59E0B)`
                  : `linear-gradient(90deg, ${theme.accent}, #10B981)`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
