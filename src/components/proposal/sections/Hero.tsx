"use client"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { BorderBeam } from "@/components/magicui/border-beam"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { Sparkles } from "@/components/magicui/sparkles"
import type { SectionProps } from "./_types"

export default function Hero({ data, theme, t, pitchAngle, locale }: SectionProps) {
  const score = data.ai_analysis?.overall_score ?? data.match_score ?? 43
  const issuesCount = (data.vulnerabilities?.length ?? 0) + (data.review_analysis?.weaknesses?.length ?? 0)
  const annualLossMan = Math.round((data.estimated_monthly_loss ?? 0) * 12 / 10000)

  // 訴求角度ごとに gradient color を変える
  const gradientColors =
    pitchAngle === "loss" ? ["#DC2626", "#F59E0B", "#DC2626"] :
    pitchAngle === "opportunity" ? ["#10B981", "#06B6D4", "#10B981"] :
    pitchAngle === "trust" ? ["#635BFF", "#8B5CF6", "#635BFF"] :
    pitchAngle === "urgency" ? ["#EF4444", "#F97316", "#EF4444"] :
    pitchAngle === "competitive" ? ["#0EA5E9", "#3B82F6", "#0EA5E9"] :
    ["#6366F1", "#8B5CF6", "#6366F1"]

  return (
    <section id="hero" style={{
      position: "relative",
      padding: "80px 24px 64px",
      background: theme.heroBg,
      overflow: "hidden",
    }}>
      {/* 装飾: meteors / blob は theme=premium のみ */}
      {theme.heroOverlay !== "transparent" && (
        <div style={{ position: "absolute", inset: 0, background: theme.heroOverlay, pointerEvents: "none" }} />
      )}

      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        {/* バッジ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 999,
            background: theme.accentSoft, color: theme.accent,
            fontSize: 12, fontWeight: 600, marginBottom: 24,
          }}
        >
          <Sparkles count={6} color={theme.accent} duration={2} />
          {t("hero.badge")}
        </motion.div>

        {/* タイトル */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            fontWeight: 800,
            color: theme.text,
            margin: "0 0 16px",
          }}
        >
          {data.business_name}
          <br />
          <AnimatedGradientText colors={gradientColors} speed={6}>
            {t("hero.title_company_suffix")}
          </AnimatedGradientText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ fontSize: 16, color: theme.textMuted, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6 }}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* 損失警告バナー (loss / urgency / compliance angle のみ) */}
        {(pitchAngle === "loss" || pitchAngle === "urgency" || pitchAngle === "compliance") && annualLossMan > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              position: "relative",
              padding: "16px 24px", marginBottom: 36,
              background: theme.surface, border: `1px solid ${theme.warn}`,
              borderRadius: theme.radiusCard, overflow: "hidden",
              fontSize: 14, color: theme.warn, fontWeight: 600,
            }}
          >
            <BorderBeam size={120} duration={6} colorFrom={theme.warn} colorTo={theme.accent} />
            ⚠️ {t("hero.loss_warning", { loss: annualLossMan.toLocaleString() })}
          </motion.div>
        )}

        {/* メトリクス 3カード */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, maxWidth: 600, margin: "0 auto",
          }}
        >
          {[
            { value: score, label: t("hero.metric_score"), sub: t("hero.metric_score_unit"), warn: score < 60 },
            { value: issuesCount, label: t("hero.metric_issues"), sub: t("hero.metric_issues_sub"), suffix: locale === "ja" ? "件" : "" },
            { value: data.reply_rate ?? 0, label: t("hero.metric_reply_rate"), sub: t("hero.metric_reply_rate_sub", { competitor: data.competitor_avg_reply_rate ?? 78 }), suffix: "%" },
          ].map((m) => (
            <div key={m.label} style={{
              position: "relative",
              padding: "16px 12px",
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusCard,
              boxShadow: theme.shadow,
              overflow: "hidden",
            }}>
              {m.warn && <BorderBeam size={80} duration={5} colorFrom={theme.warn} colorTo={theme.accent} />}
              <div style={{
                display: "block",
                fontSize: 28, fontWeight: 800,
                color: m.warn ? theme.warn : theme.accent,
                marginBottom: 4,
              }}>
                <NumberTicker
                  value={m.value as number}
                  suffix={m.suffix as string | undefined}
                  stiffness={120}
                  damping={30}
                />
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: theme.textMuted, opacity: 0.7 }}>{m.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
