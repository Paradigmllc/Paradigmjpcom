"use client"

/**
 * HomeEnClient — /[locale] homepage for /en + 10 non-ja locales.
 *
 * Aurora redesign 2026-06-09:
 *   - カラーパレット: violet→fuchsia→amber aurora グラデーション
 *   - タイポグラフィ: Outfit (display) + Noto Sans (body)
 *   - レイアウト: 非対称ヒーロー、オーバーラップセクション、大判タイポグラフィ
 *   - shadcn/ui + paradigm-ui + MagicUI フル活用
 *
 * 構成 (10-section): Hero / Loss / Offer / Mechanism / Comparison / Proof / Pricing / Report / FAQ / CTA
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles as SparkleIcon, AlertTriangle, Check, ShieldCheck, Zap, Globe, TrendingUp, Lock } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Marquee } from "@/components/magicui/marquee"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import FadeIn from "@/components/aesop/FadeIn"
import { ParadigmButton } from "@/components/paradigm-ui"
import { GlowCard, SectionHeader, StatCard, IconBadge } from "@/components/paradigm-ui"
import HomeEnPricingSection from "./HomeEnPricingSection"

const EASE = [0.22, 1, 0.36, 1] as const
const REPORT_HREF = "/contact?intent=report"
const CALL_HREF = "/contact?intent=call"

const LOSS_CARDS = ["card1", "card2", "card3", "card4"] as const
const OFFER_POINTS = ["point1", "point2", "point3", "point4"] as const
const MECH_ITEMS = ["item1", "item2", "item3", "item4"] as const
const COMPARE_ITEMS = ["item1", "item2", "item3", "item4"] as const
const PROOF_MARQUEE = ["marquee1", "marquee2", "marquee3", "marquee4"] as const
const PROOF_METRICS = ["metric1", "metric2", "metric3", "metric4"] as const
const FAQ_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const
const MECH_ICONS = [Zap, Globe, TrendingUp, Lock] as const

export default function HomeEnClient() {
  const t = useTranslations("homeEn")

  return (
    <div className="overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════
          1. Hero — asymmetric cinematic
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[95vh] flex items-center bg-paradigm-ink overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-br from-paradigm-ink/85 via-paradigm-ink/70 to-transparent" />
        <div className="absolute inset-0 section-dots opacity-[0.05]" />
        <Meteors number={18} color="rgba(167, 139, 250, 0.4)" />
        <Sparkles count={24} color="rgba(244, 114, 182, 0.4)" duration={4} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-4 py-2 mb-8">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-paradigm-accent to-paradigm-glow animate-pulse" />
                <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">{t("hero.eyebrow")}</span>
              </div>

              <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] tracking-[-0.04em] text-paradigm-paper mb-8">
                <span className="block bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_5s_ease_infinite]">
                  {t("hero.h1")}
                </span>
              </h1>

              <p className="text-[16px] md:text-[18px] text-paradigm-paper/65 max-w-lg mb-10 leading-[1.85] font-light">
                {t("hero.sub")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href={REPORT_HREF} legacyBehavior passHref>
                  <ParadigmButton variant="glow" size="xl" asChild>
                    <a>
                      {t("hero.ctaPrimary")}
                      <ArrowRight size={16} />
                    </a>
                  </ParadigmButton>
                </Link>
                <Link href={CALL_HREF} legacyBehavior passHref>
                  <ParadigmButton variant="secondary" size="xl" className="text-paradigm-paper border-paradigm-paper/15 hover:bg-paradigm-paper/8" asChild>
                    <a>{t("hero.ctaSecondary")}</a>
                  </ParadigmButton>
                </Link>
              </div>

              <div className="flex items-center gap-6">
                <p className="paradigm-eyebrow text-paradigm-glow/80 text-[10px]">{t("hero.ctaPrimaryNote")}</p>
                <span className="w-px h-4 bg-paradigm-line/30" />
                <p className="text-[11px] text-paradigm-paper/40">{t("hero.trust")}</p>
              </div>
            </motion.div>

            {/* Right: Visual element — abstract gradient orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative w-[420px] h-[420px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-paradigm-accent via-paradigm-glow to-paradigm-tech opacity-30 blur-3xl animate-[meshDrift_15s_ease-in-out_infinite]" />
                <div className="absolute inset-12 rounded-full border border-paradigm-paper/10 paradigm-glow-xl" />
                <div className="absolute inset-24 rounded-full bg-gradient-to-br from-paradigm-accent/20 to-paradigm-glow/10 backdrop-blur-sm border border-paradigm-paper/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-paradigm-paper/5 to-transparent backdrop-blur-md border border-paradigm-paper/10 flex items-center justify-center">
                  <SparkleIcon size={28} className="text-paradigm-glow/60" strokeWidth={1} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-paradigm-paper to-transparent pointer-events-none" />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. Loss visualization — bold stat grid
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-25" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <SectionHeader
            eyebrow={t("loss.eyebrow")}
            heading={t("loss.heading")}
            description={t("loss.sub")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {LOSS_CARDS.map((c, i) => (
              <GlowCard key={c} variant="solid" glow={i === 0 ? "md" : "sm"} showBeam beamDelay={i * 1.5} delay={i * 0.1}>
                <div className="p-7">
                  <div className="font-display text-[36px] md:text-[44px] leading-none bg-gradient-to-br from-paradigm-accent to-paradigm-glow bg-clip-text text-transparent mb-4 tracking-[-0.03em]">
                    {t(`loss.${c}Stat`)}
                  </div>
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.65]">{t(`loss.${c}Label`)}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. Offer = JaaS
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-35" />
        <div className="section-dots absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <SectionHeader
            eyebrow={t("offer.eyebrow")}
            heading={t("offer.heading")}
            description={t("offer.sub")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {OFFER_POINTS.map((p, i) => (
              <FadeIn key={p} delay={i * 0.07}>
                <Card className="paradigm-glass border-paradigm-line/40 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500 rounded-2xl overflow-hidden">
                  <CardContent className="flex items-start gap-5 p-7">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-paradigm-accent to-paradigm-glow text-white mt-0.5 shadow-lg shadow-paradigm-accent/25">
                      <Check size={18} strokeWidth={2.5} />
                    </span>
                    <p className="text-[15px] text-paradigm-ink leading-[1.8] pt-0.5">
                      {t(`offer.${p}`)}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. Mechanism — 2x2 bento with icons
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-25" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <SectionHeader
            eyebrow={t("mechanism.eyebrow")}
            heading={t("mechanism.heading")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {MECH_ITEMS.map((m, i) => {
              const Icon = MECH_ICONS[i]
              return (
                <GlowCard
                  key={m}
                  variant="glass"
                  glow={i === 0 ? "md" : "sm"}
                  delay={i * 0.08}
                  className="group"
                >
                  <div className="p-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-paradigm-accent/15 to-paradigm-glow/10 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 border border-paradigm-accent/10">
                      <Icon size={20} className="text-paradigm-accent" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display text-[20px] md:text-[24px] text-paradigm-ink mb-3 tracking-[-0.02em]">
                      {t(`mechanism.${m}Title`)}
                    </h3>
                    <p className="text-[14px] text-paradigm-ink-soft leading-[1.8]">
                      {t(`mechanism.${m}Body`)}
                    </p>
                  </div>
                </GlowCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. Comparison — dark section, aurora gradient accents
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-45" />
        <div className="section-dots absolute inset-0 opacity-[0.04]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <SectionHeader
            eyebrow={t("comparison.eyebrow")}
            heading={t("comparison.heading")}
            description={t("comparison.sub")}
            eyebrowClassName="text-paradigm-glow"
            headingClassName="text-paradigm-paper"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {COMPARE_ITEMS.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                className="paradigm-glass border-paradigm-line/25 rounded-2xl p-8 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full bg-gradient-to-b from-paradigm-accent to-paradigm-glow" />
                  <h3 className="font-display text-[18px] md:text-[21px] text-paradigm-paper tracking-[-0.02em]">
                    {t(`comparison.${item}Title`)}
                  </h3>
                </div>
                <p className="text-[14px] text-paradigm-paper/65 leading-[1.85] pl-4">
                  {t(`comparison.${item}Body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. Proof — trust marquee + metric cards
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-25" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <SectionHeader
            eyebrow={t("proof.eyebrow")}
            heading={t("proof.heading")}
            align="center"
          />

          <FadeIn delay={0.1} className="mb-10 paradigm-glass rounded-2xl py-4 border border-paradigm-line/50">
            <Marquee duration={40} pauseOnHover className="text-paradigm-ink-soft">
              {PROOF_MARQUEE.map((k) => (
                <span
                  key={k}
                  className="text-[12px] md:text-[14px] font-medium whitespace-nowrap inline-flex items-center gap-3 px-4"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-glow" />
                  {t(`proof.${k}`)}
                  <span className="text-paradigm-line">/</span>
                </span>
              ))}
            </Marquee>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {PROOF_METRICS.map((m, i) => (
              <StatCard
                key={m}
                value={t(`proof.${m}Value`)}
                label={t(`proof.${m}Label`)}
                variant="gradient"
                delay={i * 0.1}
              />
            ))}
          </div>

          <FadeIn delay={0.3} className="mt-10 text-center">
            <Badge variant="outline" className="border-paradigm-line/70 text-paradigm-ink-mute text-[11px] px-5 py-2 rounded-full gap-2">
              <ShieldCheck size={13} className="text-paradigm-accent" strokeWidth={2} />
              {t("proof.footnote")}
            </Badge>
          </FadeIn>
        </div>
      </section>

      {/* 7. Pricing table */}
      <HomeEnPricingSection />

      {/* ═══════════════════════════════════════════════════════════
          8. $1,500 Report — main conversion moment
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-65" />
        <div className="section-dots absolute inset-0 opacity-[0.05]" />
        <Meteors number={20} color="rgba(167, 139, 250, 0.35)" />
        <Sparkles count={12} color="rgba(251, 191, 36, 0.35)" duration={4} />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <Badge variant="outline" className="border-paradigm-glow/25 text-paradigm-glow text-[11px] px-5 py-2 rounded-full mb-6">
            {t("report.eyebrow")}
          </Badge>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.06] tracking-[-0.04em] text-paradigm-paper mb-6">
            {t("report.heading")}
          </h2>
          <p className="text-[16px] md:text-[18px] text-paradigm-paper/65 leading-[1.9] mb-10 max-w-2xl mx-auto font-light">
            {t("report.body")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {["bullet1", "bullet2", "bullet3"].map((b) => (
              <div key={b} className="paradigm-glass rounded-2xl px-6 py-5 text-left border border-paradigm-line/20">
                <Check size={16} className="text-paradigm-glow mb-3" strokeWidth={2.5} />
                <p className="text-[13px] text-paradigm-paper/80 leading-[1.7]">{t(`report.${b}`)}</p>
              </div>
            ))}
          </div>
          <Link href={REPORT_HREF} legacyBehavior passHref>
            <ParadigmButton variant="glow-dark" size="xl" asChild>
              <a>
                {t("report.cta")}
                <ArrowRight size={16} />
              </a>
            </ParadigmButton>
          </Link>
          <p className="paradigm-eyebrow text-paradigm-paper/40 text-[10px] mt-6">{t("report.note")}</p>
        </FadeIn>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          9. FAQ — shadcn Accordion
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <SectionHeader heading={t("faq.heading")} align="center" />

          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQ_KEYS.map((k) => (
              <AccordionItem
                key={k}
                value={k}
                className="paradigm-glass rounded-xl px-1 border-paradigm-line/50 paradigm-glow-sm"
              >
                <AccordionTrigger className="text-[14px] md:text-[16px] font-medium text-paradigm-ink hover:text-paradigm-accent transition-colors py-5 px-5">
                  {t(`faq.q${k}`)}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] text-paradigm-ink-soft leading-[1.9] px-5 pb-5">
                  {t(`faq.a${k}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          10. Final CTA — emotional close
          ═══════════════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-80" />
        <div className="section-dots absolute inset-0 opacity-[0.06]" />
        <Meteors number={22} color="rgba(255, 255, 255, 0.35)" />
        <Sparkles count={16} color="rgba(244, 114, 182, 0.4)" duration={4} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center"
        >
          <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-5 py-2.5 mb-8">
            <AlertTriangle size={13} className="text-paradigm-glow" strokeWidth={2} />
            <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">{t("hero.eyebrow")}</span>
          </div>

          <h2 className="font-display text-[clamp(2.2rem,6vw,4rem)] leading-[1.04] tracking-[-0.04em] text-paradigm-paper mb-8">
            <span className="block bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_5s_ease_infinite]">
              {t("finalCta.heading")}
            </span>
          </h2>

          <p className="text-[16px] md:text-[18px] text-paradigm-paper/60 max-w-xl mx-auto mb-12 leading-[1.9] font-light">
            {t("finalCta.sub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href={REPORT_HREF} legacyBehavior passHref>
              <ParadigmButton variant="glow-dark" size="xl" asChild>
                <a>
                  {t("finalCta.button")}
                  <ArrowRight size={16} />
                </a>
              </ParadigmButton>
            </Link>
            <Link href={CALL_HREF} legacyBehavior passHref>
              <ParadigmButton variant="secondary" size="xl" className="text-paradigm-paper border-paradigm-paper/15 hover:bg-paradigm-paper/8" asChild>
                <a>{t("finalCta.secondary")}</a>
              </ParadigmButton>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
