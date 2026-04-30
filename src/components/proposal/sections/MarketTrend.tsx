"use client"
import { motion } from "framer-motion"
import { Meteors } from "@/components/magicui/meteors"
import type { SectionProps } from "./_types"

export default function MarketTrend({ data, theme, t }: SectionProps) {
  // 競合との比較を可視化（もしデータがあれば）
  const competitors = data.competitor_analysis?.competitors ?? []
  const myScore = data.ai_analysis?.overall_score ?? data.match_score ?? 50

  return (
    <section id="market" style={{ position: "relative", padding: "72px 24px", background: theme.bgAlt, overflow: "hidden" }}>
      <Meteors number={10} />
      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto" }}>
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
            {t("market.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("market.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0 }}>{t("market.subtitle")}</p>
        </motion.div>

        {competitors.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 自社 */}
            <BarRow name={data.business_name} score={myScore} theme={theme} highlight />
            {competitors.slice(0, 5).map((c, i) => (
              <BarRow key={i} name={c.name} score={c.score} theme={theme} />
            ))}
          </div>
        ) : (
          <div style={{
            padding: 24, textAlign: "center", color: theme.textMuted,
            background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radiusCard,
          }}>
            (Competitor data not yet available)
          </div>
        )}
      </div>
    </section>
  )
}

function BarRow({ name, score, theme, highlight }: { name: string; score: number; theme: SectionProps["theme"]; highlight?: boolean }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(120px, 200px) 1fr 60px",
      gap: 12, alignItems: "center",
      padding: "10px 16px",
      background: highlight ? theme.accentSoft : theme.surface,
      border: `1px solid ${highlight ? theme.accent : theme.border}`,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {highlight && "★ "}{name}
      </div>
      <div style={{ height: 6, background: theme.bg, borderRadius: 999, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ height: "100%", background: highlight ? theme.accent : theme.textMuted }}
        />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textAlign: "right" }}>{score}</div>
    </div>
  )
}
