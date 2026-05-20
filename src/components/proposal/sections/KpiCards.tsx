"use client"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { BorderBeam } from "@/components/magicui/border-beam"
import type { SectionProps } from "./_types"

/** Reusable diagnostic KPI card row — used in trust/competitive angles too */
export default function KpiCards({ data, theme, t, locale }: SectionProps) {
  const score = data.ai_analysis?.overall_score ?? data.match_score ?? 0
  const annualLoss = (data.estimated_monthly_loss ?? 0) * 12
  const recovery = data.ai_analysis?.estimated_recovery_jpy ?? Math.round(annualLoss * 0.65)

  // 金額は JPY が正準。ja は「¥120万」表記、それ以外は「万」が通じないため
  // 全額表示「¥1,200,000」にする (旧: 全 region で "万" がハードコード leak)。
  const isJa = locale === "ja"
  const yen = (jpy: number) => (isJa ? Math.round(jpy / 10000) : Math.round(jpy))
  const yenSuffix = isJa ? "万" : ""

  const cards = [
    {
      value: score,
      label: t("diagnosis.score_label"),
      suffix: "/100",
      color: score < 60 ? theme.warn : theme.accent,
      beam: score < 60,
    },
    {
      value: yen(annualLoss),
      label: t("opportunity.annual_loss_label"),
      prefix: "¥",
      suffix: yenSuffix,
      color: theme.warn,
      beam: true,
    },
    {
      value: yen(recovery),
      label: t("opportunity.recovery_label"),
      prefix: "¥",
      suffix: yenSuffix,
      color: theme.accent,
      beam: false,
    },
  ]

  return (
    <section style={{ padding: "48px 24px", background: theme.bgAlt }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: 980, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            style={{
              position: "relative",
              padding: "28px 24px",
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusCard,
              boxShadow: theme.shadow,
              overflow: "hidden",
            }}
          >
            {c.beam && <BorderBeam size={140} duration={7} colorFrom={c.color} colorTo={theme.accent} />}
            <div style={{
              display: "block",
              fontSize: 40, fontWeight: 800,
              color: c.color,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}>
              <NumberTicker
                value={c.value}
                prefix={c.prefix}
                suffix={c.suffix}
                stiffness={100}
                damping={32}
              />
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>{c.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
