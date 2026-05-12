"use client"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import type { SectionProps } from "./_types"

/** Loss / opportunity-cost framing — leads in `loss` & `compliance` angles. */
export default function Pain({ data, theme, t }: SectionProps) {
  const monthly = data.estimated_monthly_loss ?? 0
  const annual = monthly * 12
  const issues = data.vulnerabilities ?? []

  return (
    <section id="pain" style={{ padding: "72px 24px", background: theme.bg }}>
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
            background: `${theme.warn}1A`, color: theme.warn,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16,
          }}>
            {t("opportunity.label")}
          </span>
          <h2 style={{
            fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.02em", margin: "0 0 12px", color: theme.text,
          }}>
            {t("opportunity.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, maxWidth: 520, margin: "0 auto" }}>
            {t("opportunity.subtitle")}
          </p>
        </motion.div>

        {/* メイン損失額カード */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            padding: "40px 24px",
            background: theme.surface,
            border: `2px solid ${theme.warn}`,
            borderRadius: theme.radiusCard,
            boxShadow: theme.shadow,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 12, color: theme.warn, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
            {t("opportunity.annual_loss_label")}
          </div>
          <div style={{ fontSize: 64, fontWeight: 900, color: theme.warn, letterSpacing: "-0.04em", lineHeight: 1 }}>
            <NumberTicker value={annual} prefix="¥" stiffness={80} damping={40} />
          </div>
          <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 12 }}>
            {t("opportunity.monthly_loss_label")}: ¥<NumberTicker value={monthly} stiffness={120} damping={32} />
          </div>
        </motion.div>

        {/* 課題リスト */}
        {issues.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {issues.slice(0, 6).map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{
                  padding: "16px",
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderLeft: `3px solid ${
                    v.level === "critical" ? theme.warn :
                    v.level === "high" ? "#F59E0B" : theme.textMuted
                  }`,
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>{v.desc}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
