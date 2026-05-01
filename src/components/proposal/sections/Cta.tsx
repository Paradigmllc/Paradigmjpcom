"use client"
import { motion } from "framer-motion"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { Sparkles } from "@/components/magicui/sparkles"
import type { SectionProps } from "./_types"

export default function Cta({ data, theme, t, onCtaClick }: SectionProps) {
  // H-2 (2026-05-01): "appexx.me 顧客表示禁止" 対応
  // NEXT_PUBLIC_CAL_URL を Coolify env に設定すれば paradigmjp.com 配下の予約 URL に切替可能
  // (例: https://cal.paradigmjp.com を CNAME alias で運用)
  // env 未設定時は内部 /contact ページにフォールバック (cal.appexx.me 直リンク廃止)
  const ctaUrl =
    data.template_cta_url
    || process.env.NEXT_PUBLIC_CAL_URL
    || "/contact"
  const ctaText = data.template_cta_text || t("cta.button")

  return (
    <section id="cta" style={{
      position: "relative",
      padding: "96px 24px",
      background: theme.heroBg,
      overflow: "hidden",
    }}>
      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <Sparkles count={20} color={theme.accent} duration={3} />
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            color: theme.text,
          }}
        >
          {t("cta.title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ fontSize: 16, color: theme.textMuted, margin: "0 0 32px" }}
        >
          {t("cta.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
        >
          <ShimmerButton
            background={theme.accent}
            shimmerColor={theme.text === "#FFFFFF" ? "#000000" : "#FFFFFF"}
            shimmerDuration="3s"
            borderRadius="999px"
            onClick={() => {
              onCtaClick?.()
              if (ctaUrl) window.open(ctaUrl, "_blank", "noopener,noreferrer")
            }}
            style={{ padding: "16px 32px", fontSize: 16, fontWeight: 700 }}
          >
            {ctaText} →
          </ShimmerButton>

          {data.phone && (
            <div style={{ fontSize: 13, color: theme.textMuted }}>
              {t("cta.or")} <a href={`tel:${data.phone}`} style={{ color: theme.accent, fontWeight: 600 }}>
                {t("cta.phone")}: {data.phone}
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
