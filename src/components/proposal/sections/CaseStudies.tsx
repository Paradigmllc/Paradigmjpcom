"use client"
import { motion } from "framer-motion"
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid"
import type { SectionProps } from "./_types"

// MVP: 業種ごとの汎用ケーススタディ (将来 DB から動的取得に拡張可能)
const GENERIC_CASES = [
  { metric: "+312%", label: "問い合わせ数", industry: "飲食店", duration: "3ヶ月", icon: "🍽️" },
  { metric: "-67%", label: "口コミ未返信", industry: "美容室", duration: "1ヶ月", icon: "💇" },
  { metric: "x4.8", label: "予約 CVR", industry: "ホテル", duration: "6ヶ月", icon: "🏨" },
  { metric: "+89%", label: "オーガニック流入", industry: "IT/SaaS", duration: "4ヶ月", icon: "💻" },
]

export default function CaseStudies({ theme, t }: SectionProps) {
  return (
    <section id="cases" style={{ padding: "72px 24px", background: theme.bg }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
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
            {t("cases.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("cases.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0 }}>{t("cases.subtitle")}</p>
        </motion.div>

        <BentoGrid>
          {GENERIC_CASES.map((c, i) => (
            <BentoCard
              key={i}
              name={`${c.icon} ${c.label}`}
              className={i === 0 ? "md:col-span-2" : ""}
              header={
                <div style={{ fontSize: 48, fontWeight: 900, color: theme.accent, lineHeight: 1, letterSpacing: "-0.03em" }}>
                  {c.metric}
                </div>
              }
              description={
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  {c.industry} · {c.duration}
                </span>
              }
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
