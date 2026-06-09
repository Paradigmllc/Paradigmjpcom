"use client"

/**
 * HomeEnClient — /[locale] homepage for /en + 10 non-ja locales.
 *
 * 2026-06-09 デザイン全面刷新:
 *   - shadcn/ui Button / Card / Badge / Accordion を全面導入
 *   - paradigm-ui デザインプリミティブ (GlowCard / SectionHeader / StatCard / IconBadge)
 *   - MagicUI (Meteors / Sparkles / BorderBeam / Marquee) を全セクションに活用
 *   - タイポグラフィ階層強化、グラデーション多用、マイクロインタラクション充実
 *
 * 構成 (10-section):
 *   Hero / Loss / Offer / Mechanism / Comparison / Proof / Pricing / Report / FAQ / CTA
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles as SparkleIcon, AlertTriangle, Check, ShieldCheck, Zap, Globe, Lock, TrendingUp } from "lucide-react"
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
      {/* ── 1. Hero — cinematic pain/loss framing ─────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-paradigm-ink">
        <div className="paradigm-mesh-vivid opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/60 via-paradigm-ink/75 to-paradigm-ink/95" />
        <div className="absolute inset-0 section-dots opacity-[0.06]" />
        <Meteors number={14} color="rgba(165, 180, 252, 0.45)" />
        <Sparkles count={20} color="rgba(255, 215, 130, 0.45)" duration={3.5} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center pt-28 pb-16"
        >
          <IconBadge icon={<SparkleIcon size={12} className="text-paradigm-glow" strokeWidth={2} />}
            className="mb-8 paradigm-glow-sm">
            {t("hero.eyebrow")}
          </IconBadge>

          <h1
            style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}
            className="font-display leading-[1.06] tracking-[-0.03em] text-paradigm-paper mb-7 paradigm-glow-text"
          >
            {t("hero.h1")}
          </h1>

          <p className="text-[15px] md:text-[17px] text-paradigm-paper/75 max-w-2xl mx-auto mb-10 leading-[1.9]">
            {t("hero.sub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href={REPORT_HREF} legacyBehavior passHref>
              <ParadigmButton variant="glow" size="lg" asChild>
                <a>
                  {t("hero.ctaPrimary")}
                  <ArrowRight size={15} />
                </a>
              </ParadigmButton>
            </Link>
            <Link href={CALL_HREF} legacyBehavior passHref>
              <ParadigmButton variant="secondary" size="lg" className="text-paradigm-paper border-paradigm-paper/20 hover:bg-paradigm-paper/10" asChild>
                <a>{t("hero.ctaSecondary")}</a>
              </ParadigmButton>
            </Link>
          </div>
          <p className="paradigm-eyebrow text-paradigm-glow text-[10px] mb-8">{t("hero.ctaPrimaryNote")}</p>
          <Badge variant="outline" className="border-paradigm-paper/15 text-paradigm-paper/50 text-[10px] px-4 py-1.5 rounded-full">
            {t("hero.trust")}
          </Badge>
        </motion.div>
      </section>

      {/* ── 2. Loss visualization — quantified pain ───────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="section-grid absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <SectionHeader
            eyebrow={t("loss.eyebrow")}
            heading={t("loss.heading")}
            description={t("loss.sub")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {LOSS_CARDS.map((c, i) => (
              <GlowCard key={c} variant="solid" glow="sm" showBeam beamDelay={i * 1.5} delay={i * 0.08}>
                <div className="p-6">
                  <div className="font-display text-[32px] md:text-[38px] leading-none text-paradigm-accent mb-3 tracking-[-0.02em]">
                    {t(`loss.${c}Stat`)}
                  </div>
                  <p className="text-[13px] text-paradigm-ink-soft leading-[1.6]">{t(`loss.${c}Label`)}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Offer = JaaS ───────────────────────────────────── */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <div className="section-dots absolute inset-0 opacity-50" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <SectionHeader
            eyebrow={t("offer.eyebrow")}
            heading={t("offer.heading")}
            description={t("offer.sub")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {OFFER_POINTS.map((p, i) => (
              <FadeIn key={p} delay={i * 0.06}>
                <Card className="paradigm-glass border-paradigm-line/50 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 rounded-2xl">
                  <CardContent className="flex items-start gap-4 p-6">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-paradigm-accent to-paradigm-tech text-paradigm-paper mt-0.5">
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                    <p className="text-[14px] text-paradigm-ink leading-[1.75] pt-0.5">{t(`offer.${p}`)}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Mechanism — 2x2 bento ──────────────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="section-grid absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <SectionHeader
            eyebrow={t("mechanism.eyebrow")}
            heading={t("mechanism.heading")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {MECH_ITEMS.map((m, i) => {
              const Icon = MECH_ICONS[i]
              return (
                <GlowCard
                  key={m}
                  variant="glass"
                  glow={i === 0 ? "md" : "sm"}
                  delay={i * 0.07}
                  className="group"
                >
                  <div className="p-7">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-paradigm-accent/15 to-paradigm-tech/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon size={18} className="text-paradigm-accent" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-display text-[18px] md:text-[20px] text-paradigm-ink mb-2 tracking-[-0.015em]">
                      {t(`mechanism.${m}Title`)}
                    </h3>
                    <p className="text-[13px] text-paradigm-ink-soft leading-[1.75]">
                      {t(`mechanism.${m}Body`)}
                    </p>
                  </div>
                </GlowCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Comparison — dark section ──────────────────────── */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-50" />
        <div className="section-dots absolute inset-0 opacity-[0.04]" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <SectionHeader
            eyebrow={t("comparison.eyebrow")}
            heading={t("comparison.heading")}
            description={t("comparison.sub")}
            eyebrowClassName="text-paradigm-glow"
            headingClassName="text-paradigm-paper"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {COMPARE_ITEMS.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
                className="paradigm-glass border-paradigm-line/30 rounded-2xl p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 group"
              >
                <h3 className="font-display text-[17px] md:text-[19px] text-paradigm-paper mb-3 tracking-[-0.015em]">
                  {t(`comparison.${item}Title`)}
                </h3>
                <p className="text-[13px] text-paradigm-paper/70 leading-[1.8]">
                  {t(`comparison.${item}Body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Proof — trust marquee + metrics ────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="section-grid absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <SectionHeader
            eyebrow={t("proof.eyebrow")}
            heading={t("proof.heading")}
            align="center"
          />

          <FadeIn delay={0.1} className="mb-8 paradigm-glass rounded-xl py-3 border border-paradigm-line">
            <Marquee duration={45} pauseOnHover className="text-paradigm-ink-soft">
              {PROOF_MARQUEE.map((k) => (
                <span
                  key={k}
                  className="paradigm-eyebrow text-[11px] md:text-[13px] whitespace-nowrap inline-flex items-center gap-2"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech" />
                  {t(`proof.${k}`)}
                  <span className="ml-2 text-paradigm-line">/</span>
                </span>
              ))}
            </Marquee>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {PROOF_METRICS.map((m, i) => (
              <StatCard
                key={m}
                value={t(`proof.${m}Value`)}
                label={t(`proof.${m}Label`)}
                variant="gradient"
                delay={i * 0.08}
              />
            ))}
          </div>

          <FadeIn delay={0.3} className="mt-8 text-center">
            <Badge variant="outline" className="border-paradigm-line text-paradigm-ink-mute text-[11px] px-4 py-2 rounded-full gap-2">
              <ShieldCheck size={13} className="text-paradigm-accent" strokeWidth={2} />
              {t("proof.footnote")}
            </Badge>
          </FadeIn>
        </div>
      </section>

      {/* ── 7. Pricing table ──────────────────────────────────── */}
      <HomeEnPricingSection />

      {/* ── 8. $1,500 Report — main conversion ────────────────── */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-70" />
        <div className="section-dots absolute inset-0 opacity-[0.04]" />
        <Meteors number={16} color="rgba(165, 180, 252, 0.4)" />
        <Sparkles count={10} color="rgba(255, 215, 130, 0.4)" duration={3.5} />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <Badge variant="outline" className="border-paradigm-glow/30 text-paradigm-glow text-[10px] px-4 py-1.5 rounded-full mb-5">
            {t("report.eyebrow")}
          </Badge>
          <h2 className="font-display text-[30px] md:text-[48px] leading-[1.08] tracking-[-0.03em] text-paradigm-paper mb-5 paradigm-glow-text">
            {t("report.heading")}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/75 leading-[1.9] mb-8 max-w-2xl">
            {t("report.body")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-9">
            {["bullet1", "bullet2", "bullet3"].map((b) => (
              <div key={b} className="paradigm-glass rounded-xl px-5 py-4 text-left">
                <Check size={15} className="text-paradigm-glow mb-2" strokeWidth={2.5} />
                <p className="text-[12px] text-paradigm-paper/85 leading-[1.6]">{t(`report.${b}`)}</p>
              </div>
            ))}
          </div>
          <Link href={REPORT_HREF} legacyBehavior passHref>
            <ParadigmButton variant="glow-dark" size="xl" asChild>
              <a>
                {t("report.cta")}
                <ArrowRight size={15} />
              </a>
            </ParadigmButton>
          </Link>
          <p className="paradigm-eyebrow text-paradigm-paper/45 text-[10px] mt-5">{t("report.note")}</p>
        </FadeIn>
      </section>

      {/* ── 9. FAQ — shadcn Accordion ─────────────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-25" />
        <div className="section-grid absolute inset-0 opacity-40" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <SectionHeader heading={t("faq.heading")} align="center" />

          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQ_KEYS.map((k) => (
              <AccordionItem
                key={k}
                value={k}
                className="paradigm-glass rounded-xl px-1 border-paradigm-line/60 paradigm-glow-sm"
              >
                <AccordionTrigger className="text-[14px] md:text-[15px] font-medium text-paradigm-ink hover:text-paradigm-accent transition-colors py-4 px-4">
                  {t(`faq.q${k}`)}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-paradigm-ink-soft leading-[1.85] px-4 pb-4">
                  {t(`faq.a${k}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 10. Final CTA — emotional close ───────────────────── */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-85" />
        <div className="section-dots absolute inset-0 opacity-[0.05]" />
        <Meteors number={18} color="rgba(255, 255, 255, 0.4)" />
        <Sparkles count={14} color="rgba(244, 114, 182, 0.45)" duration={3.5} />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <IconBadge icon={<AlertTriangle size={12} className="text-paradigm-glow" strokeWidth={2} />}
            className="mb-6">
            {t("hero.eyebrow")}
          </IconBadge>

          <h2 className="font-display text-[32px] md:text-[56px] leading-[1.06] tracking-[-0.03em] text-paradigm-paper mb-6 paradigm-glow-text">
            {t("finalCta.heading")}
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-xl mx-auto mb-10 leading-[1.9]">
            {t("finalCta.sub")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={REPORT_HREF} legacyBehavior passHref>
              <ParadigmButton variant="glow-dark" size="xl" asChild>
                <a>
                  {t("finalCta.button")}
                  <ArrowRight size={15} />
                </a>
              </ParadigmButton>
            </Link>
            <Link href={CALL_HREF} legacyBehavior passHref>
              <ParadigmButton variant="secondary" size="xl" className="text-paradigm-paper border-paradigm-paper/20 hover:bg-paradigm-paper/10" asChild>
                <a>{t("finalCta.secondary")}</a>
              </ParadigmButton>
            </Link>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}
