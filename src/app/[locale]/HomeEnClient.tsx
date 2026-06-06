"use client"

/**
 * HomeEnClient — /[locale] homepage for /en + 10 non-ja locales (Plan B).
 *
 * 役割:   JaaS (Japan-as-a-Service) を主役にした「痛み・機会損失の可視化 → 希望」
 *         アーク LP。海外SMBの日本進出を主CTA=$1,500 Market Fit Report に誘導。
 * 入力:   なし (locale は NextIntlClientProvider context・messages.homeEn 経由)
 * 出力:   8-section composition (Hero / Loss / Offer / Mechanism / Proof / Report / FAQ / CTA)
 *
 * AE-PHP-2: 全 visible text は useTranslations("homeEn") 経由 (zero hardcode)。
 * AE-PHP-4: 役割/入力/出力 明示。/ja は別構造 (HomeClient) — page.tsx で locale 分岐。
 * 2026-05-20 壁打ち確定: 痛み/損失可視化スパイン・honest proof・$1,500 Report 主CTA。
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles as SparkleIcon, AlertTriangle, Check } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import { BorderBeam } from "@/components/magicui/border-beam"
import FadeIn from "@/components/aesop/FadeIn"
import HomeEnPricingSection from "./HomeEnPricingSection"

const EASE = [0.22, 1, 0.36, 1] as const
const REPORT_HREF = "/contact?intent=report"
const CALL_HREF = "/contact?intent=call"

const LOSS_CARDS = ["card1", "card2", "card3", "card4"] as const
const OFFER_POINTS = ["point1", "point2", "point3", "point4"] as const
const MECH_ITEMS = ["item1", "item2", "item3", "item4"] as const
const FAQ_KEYS = ["1", "2", "3", "4", "5"] as const

export default function HomeEnClient() {
  const t = useTranslations("homeEn")

  return (
    <div className="overflow-x-hidden">
      {/* ── 1. Hero (pain / loss) ─────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-paradigm-ink">
        <div className="paradigm-mesh-vivid opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/70 via-paradigm-ink/80 to-paradigm-ink/95" />
        <Meteors number={12} color="rgba(244, 114, 182, 0.5)" />
        <Sparkles count={16} color="rgba(255, 215, 130, 0.5)" duration={3.5} />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center pt-24 pb-12"
        >
          <span className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-7 paradigm-glow-sm">
            <SparkleIcon size={12} className="text-paradigm-glow" strokeWidth={2} />
            <span className="paradigm-eyebrow text-paradigm-paper">{t("hero.eyebrow")}</span>
          </span>

          <h1
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
            className="font-display leading-[1.1] tracking-[-0.025em] text-paradigm-paper mb-6"
          >
            {t("hero.h1")}
          </h1>

          <p className="text-[14px] md:text-[16px] text-paradigm-paper/80 max-w-2xl mx-auto mb-9 leading-[1.85]">
            {t("hero.sub")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link
              href={REPORT_HREF}
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-paradigm-paper text-paradigm-ink text-[12px] tracking-[0.12em] uppercase font-semibold paradigm-glow-md hover:scale-[1.03] transition-transform"
            >
              {t("hero.ctaPrimary")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href={CALL_HREF}
              className="inline-flex items-center gap-2 paradigm-glass text-paradigm-paper hover:bg-paradigm-paper/15 px-7 py-4 rounded-xl text-[12px] tracking-[0.12em] uppercase font-medium transition-colors"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <p className="paradigm-eyebrow text-paradigm-glow text-[10px] mb-8">{t("hero.ctaPrimaryNote")}</p>
          <p className="paradigm-eyebrow text-paradigm-paper/55 text-[10px]">{t("hero.trust")}</p>
        </motion.div>
      </section>

      {/* ── 2. Loss visualization ─────────────────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("loss.eyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink">
              {t("loss.heading")}
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft leading-[1.8] mt-4 max-w-xl">{t("loss.sub")}</p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {LOSS_CARDS.map((c, i) => (
              <motion.div
                key={c}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
                className="relative bg-paradigm-paper-card border border-paradigm-line rounded-2xl p-6 overflow-hidden paradigm-glow-sm"
              >
                <BorderBeam size={140} duration={9} colorFrom="rgb(244 114 182)" colorTo="rgb(193 39 45)" delay={i * 1.2} borderWidth={1.5} />
                <div className="font-display text-[28px] md:text-[34px] leading-none text-paradigm-accent mb-3 tracking-[-0.02em]">
                  {t(`loss.${c}Stat`)}
                </div>
                <p className="text-[13px] text-paradigm-ink-soft leading-[1.6]">{t(`loss.${c}Label`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Offer = JaaS ───────────────────────────────────── */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("offer.eyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink">
              {t("offer.heading")}
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft leading-[1.8] mt-4">{t("offer.sub")}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {OFFER_POINTS.map((p, i) => (
              <FadeIn key={p} delay={i * 0.06}>
                <div className="flex items-start gap-3 paradigm-glass rounded-xl p-5 paradigm-glow-sm h-full">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-paradigm-accent to-paradigm-tech text-paradigm-paper mt-0.5">
                    <Check size={15} strokeWidth={2.5} />
                  </span>
                  <p className="text-[14px] text-paradigm-ink leading-[1.7]">{t(`offer.${p}`)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Mechanism ──────────────────────────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("mechanism.eyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink">
              {t("mechanism.heading")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {MECH_ITEMS.map((m, i) => (
              <motion.div
                key={m}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
                className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500"
              >
                <h3 className="font-display text-[18px] md:text-[20px] text-paradigm-ink mb-2 tracking-[-0.015em]">
                  {t(`mechanism.${m}Title`)}
                </h3>
                <p className="text-[13px] text-paradigm-ink-soft leading-[1.7]">{t(`mechanism.${m}Body`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Proof (placeholder — cases pending) ────────────── */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <FadeIn>
            <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("proof.eyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink mb-5">
              {t("proof.heading")}
            </h2>
            <p className="text-[14px] text-paradigm-ink-soft leading-[1.8] paradigm-glass rounded-2xl p-6 paradigm-glow-sm">
              {t("proof.placeholder")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── 6. $1,500 Report (main CTA) ───────────────────────── */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-70" />
        <Meteors number={14} color="rgba(165, 180, 252, 0.5)" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <p className="paradigm-eyebrow mb-3 text-paradigm-glow">{t("report.eyebrow")}</p>
          <h2 className="font-display text-[28px] md:text-[44px] leading-[1.1] tracking-[-0.03em] text-paradigm-paper mb-5">
            {t("report.heading")}
          </h2>
          <p className="text-[14px] md:text-[16px] text-paradigm-paper/80 leading-[1.85] mb-7 max-w-2xl">
            {t("report.body")}
          </p>
          <ul className="space-y-2.5 mb-9">
            {["bullet1", "bullet2", "bullet3"].map((b) => (
              <li key={b} className="flex items-start gap-3 text-[14px] text-paradigm-paper/90">
                <Check size={16} className="flex-shrink-0 mt-0.5 text-paradigm-glow" strokeWidth={2.5} />
                {t(`report.${b}`)}
              </li>
            ))}
          </ul>
          <Link
            href={REPORT_HREF}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-paradigm-paper text-paradigm-ink text-[12px] tracking-[0.12em] uppercase font-semibold paradigm-glow-lg hover:scale-[1.03] transition-transform"
          >
            {t("report.cta")}
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="paradigm-eyebrow text-paradigm-paper/55 text-[10px] mt-4">{t("report.note")}</p>
        </FadeIn>
      </section>

      {/* 7. Pricing table */}
      <HomeEnPricingSection />

      {/* ── 8. FAQ ────────────────────────────────────────────── */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10">
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink">
              {t("faq.heading")}
            </h2>
          </FadeIn>
          <div className="space-y-3">
            {FAQ_KEYS.map((k, i) => (
              <FadeIn key={k} delay={i * 0.05}>
                <details className="group paradigm-glass rounded-xl px-5 py-4 paradigm-glow-sm">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-[14px] md:text-[15px] font-medium text-paradigm-ink">
                    {t(`faq.q${k}`)}
                    <span className="ml-3 text-paradigm-accent transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <p className="text-[13px] text-paradigm-ink-soft leading-[1.8] mt-3">{t(`faq.a${k}`)}</p>
                </details>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Final CTA ──────────────────────────────────────── */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh-vivid opacity-80" />
        <Meteors number={16} color="rgba(255, 255, 255, 0.5)" />
        <Sparkles count={12} color="rgba(244, 114, 182, 0.5)" duration={3.5} />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-5 paradigm-glow-sm">
            <AlertTriangle size={12} className="text-paradigm-glow" strokeWidth={2} />
            <span className="paradigm-eyebrow text-paradigm-paper">{t("hero.eyebrow")}</span>
          </div>
          <h2 className="font-display text-[30px] md:text-[52px] leading-[1.08] tracking-[-0.03em] text-paradigm-paper mb-5">
            {t("finalCta.heading")}
          </h2>
          <p className="text-[14px] md:text-[16px] text-paradigm-paper/80 max-w-xl mx-auto mb-9 leading-[1.85]">
            {t("finalCta.sub")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={REPORT_HREF}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-paradigm-paper text-paradigm-ink text-[12px] tracking-[0.12em] uppercase font-semibold paradigm-glow-lg hover:scale-[1.03] transition-transform"
            >
              {t("finalCta.button")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href={CALL_HREF}
              className="inline-flex items-center gap-2 paradigm-glass text-paradigm-paper hover:bg-paradigm-paper/15 px-8 py-4 rounded-xl text-[12px] tracking-[0.12em] uppercase font-medium transition-colors"
            >
              {t("finalCta.secondary")}
            </Link>
          </div>
        </FadeIn>
      </section>
    </div>
  )
}
