"use client"

/**
 * ServicesSection — Bento grid w/ BorderBeam on each card.
 *
 * 4 cards in 3-column bento layout:
 *   - web (featured / 2 cols span)
 *   - meo / seo / ai (1 col each)
 * Each card has a unique BorderBeam color for visual richness:
 *   - web: indigo→cyan (Modern Tech)
 *   - meo: cyan→glow
 *   - seo: glow→accent
 *   - ai: accent→indigo
 * Background gradient mesh per card + lift on hover + animated icon.
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Bot, Globe, Search, TrendingUp, ArrowUpRight } from "lucide-react"
import { BorderBeam } from "@/components/magicui/border-beam"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const SERVICES = [
  {
    key: "web",
    icon: Globe,
    href: "/services/web",
    span: "md:col-span-2 md:row-span-2",
    beamFrom: "rgb(79 70 229)",
    beamTo: "rgb(14 165 233)",
    meshA: "rgb(99 102 241 / 0.15)",
    meshB: "rgb(14 165 233 / 0.10)",
  },
  {
    key: "meo",
    icon: Search,
    href: "/services/meo",
    span: "md:col-span-1",
    beamFrom: "rgb(14 165 233)",
    beamTo: "rgb(129 140 248)",
    meshA: "rgb(14 165 233 / 0.12)",
    meshB: "rgb(99 102 241 / 0.08)",
  },
  {
    key: "seo",
    icon: TrendingUp,
    href: "/services/seo",
    span: "md:col-span-1",
    beamFrom: "rgb(129 140 248)",
    beamTo: "rgb(79 70 229)",
    meshA: "rgb(129 140 248 / 0.12)",
    meshB: "rgb(79 70 229 / 0.08)",
  },
  {
    key: "ai",
    icon: Bot,
    href: "/services/ai",
    span: "md:col-span-2",
    beamFrom: "rgb(79 70 229)",
    beamTo: "rgb(165 180 252)",
    meshA: "rgb(79 70 229 / 0.15)",
    meshB: "rgb(165 180 252 / 0.10)",
  },
] as const

export default function ServicesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-16 max-w-3xl">
          <p className="paradigm-eyebrow mb-5 text-paradigm-accent">{t("servicesEyebrow")}</p>
          <h2 className="font-display text-[36px] md:text-[68px] leading-[1.05] tracking-[-0.025em] text-paradigm-ink">
            {t("servicesHeading")}
          </h2>
        </FadeIn>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[280px] md:auto-rows-[320px]"
        >
          {SERVICES.map((s, idx) => {
            const Icon = s.icon
            const badge = t(`services.${s.key}.badge`)
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: idx * 0.1, ease: EASE }}
                className={`${s.span}`}
              >
                <Link
                  href={s.href}
                  className="group relative block h-full bg-paradigm-paper-deep border border-paradigm-line p-8 md:p-10 hover:border-paradigm-accent/40 transition-all duration-500 overflow-hidden hover:-translate-y-1 hover:shadow-[0_30px_80px_-20px_rgba(79,70,229,0.25)]"
                >
                  <div
                    className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${s.meshA}, transparent 60%), radial-gradient(circle at 80% 80%, ${s.meshB}, transparent 60%)`,
                      filter: "blur(20px)",
                    }}
                    aria-hidden
                  />

                  <BorderBeam size={180} duration={9} colorFrom={s.beamFrom} colorTo={s.beamTo} delay={idx * 1.5} />

                  {badge && (
                    <span className="absolute top-6 right-6 paradigm-eyebrow text-paradigm-accent z-10">
                      {badge}
                    </span>
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="mb-auto">
                      <Icon
                        size={32}
                        strokeWidth={1.25}
                        className="text-paradigm-ink-soft mb-6 group-hover:text-paradigm-accent group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500"
                      />
                      <h3 className="font-display text-[28px] md:text-[36px] leading-[1.1] text-paradigm-ink mb-2 tracking-[-0.02em]">
                        {t(`services.${s.key}.title`)}
                      </h3>
                      <p className="paradigm-eyebrow mb-4">{t(`services.${s.key}.tagline`)}</p>
                      <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-md">
                        {t(`services.${s.key}.desc`)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-paradigm-line pt-5 mt-6">
                      <span className="text-[13px] text-paradigm-ink font-medium bg-gradient-to-r from-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                        {t(`services.${s.key}.results`)}
                      </span>
                      <span className="paradigm-eyebrow text-paradigm-ink-soft group-hover:text-paradigm-accent transition-colors flex items-center gap-1">
                        {t("servicesViewMore")}
                        <ArrowUpRight size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
