"use client"
import { motion } from "framer-motion"
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid"
import type { SectionProps } from "./_types"

export default function WhyUs({ data, theme, t }: SectionProps) {
  const features = [
    { key: "speed", icon: "⚡", className: "md:col-span-2" },
    { key: "ai", icon: "🤖" },
    { key: "full_stack", icon: "🎯" },
    { key: "global", icon: "🌐", className: "md:col-span-2" },
  ]

  return (
    <section id="whyus" style={{ padding: "72px 24px", background: theme.bgAlt }}>
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
            {t("whyus.label")}
          </span>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: theme.text }}>
            {t("whyus.title")}
          </h2>
          <p style={{ fontSize: 15, color: theme.textMuted, margin: 0, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            {t("whyus.subtitle", { name: data.business_name })}
          </p>
        </motion.div>

        <BentoGrid>
          {features.map(f => (
            <BentoCard
              key={f.key}
              name={`${f.icon} ${t(`whyus.feature_${f.key}`)}`}
              className={f.className}
              description={
                <span style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.6 }}>
                  {t(`whyus.feature_${f.key}_desc`)}
                </span>
              }
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
