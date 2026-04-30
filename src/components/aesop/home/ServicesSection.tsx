"use client"

/**
 * ServicesSection — Premium bento with rounded-3xl glass cards + 3D tilt.
 *
 * P18-D-7 leap:
 *   - rounded-3xl (24px) — soft luxurious corners
 *   - paradigm-tilt 3D hover (rotateY/X)
 *   - vivid gradient mesh per card
 *   - BorderBeam each w/ unique color
 *   - glow shadow on hover (paradigm-glow-lg)
 *   - icon: gradient bg + scale-110 -rotate-6 on hover
 *   - results: bigger gradient text
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
    iconBg: "from-pink-400 via-paradigm-accent to-paradigm-tech",
    beamFrom: "rgb(244 114 182)",
    beamTo: "rgb(14 165 233)",
    meshA: "rgba(244, 114, 182, 0.18)",
    meshB: "rgba(14, 165, 233, 0.15)",
    accent: "text-pink-400",
  },
  {
    key: "meo",
    icon: Search,
    href: "/services/meo",
    span: "md:col-span-1",
    iconBg: "from-paradigm-tech via-paradigm-glow to-violet-300",
    beamFrom: "rgb(14 165 233)",
    beamTo: "rgb(165 180 252)",
    meshA: "rgba(14, 165, 233, 0.18)",
    meshB: "rgba(165, 180, 252, 0.12)",
    accent: "text-paradigm-tech",
  },
  {
    key: "seo",
    icon: TrendingUp,
    href: "/services/seo",
    span: "md:col-span-1",
    iconBg: "from-paradigm-glow via-violet-400 to-paradigm-accent",
    beamFrom: "rgb(165 180 252)",
    beamTo: "rgb(79 70 229)",
    meshA: "rgba(165, 180, 252, 0.18)",
    meshB: "rgba(79, 70, 229, 0.12)",
    accent: "text-violet-400",
  },
  {
    key: "ai",
    icon: Bot,
    href: "/services/ai",
    span: "md:col-span-2",
    iconBg: "from-paradigm-accent via-pink-400 to-orange-300",
    beamFrom: "rgb(79 70 229)",
    beamTo: "rgb(251 146 60)",
    meshA: "rgba(79, 70, 229, 0.18)",
    meshB: "rgba(251, 146, 60, 0.15)",
    accent: "text-orange-400",
  },
] as const

export default function ServicesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-50" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 max-w-3xl">
          <p className="paradigm-eyebrow mb-5 text-paradigm-accent">{t("servicesEyebrow")}</p>
          <h2 className="font-display text-[40px] md:text-[80px] leading-[0.98] tracking-[-0.03em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
              {t("servicesHeading")}
            </span>
          </h2>
        </FadeIn>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 auto-rows-[280px] md:auto-rows-[340px]"
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
                className={s.span}
              >
                <Link
                  href={s.href}
                  className="group paradigm-tilt relative block h-full bg-paradigm-paper-card border border-paradigm-line rounded-3xl p-8 md:p-10 hover:border-paradigm-accent/50 transition-colors duration-500 overflow-hidden hover:paradigm-glow-xl"
                >
                  {/* per-card vivid mesh */}
                  <div
                    className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl"
                    style={{
                      background: `radial-gradient(circle at 25% 15%, ${s.meshA}, transparent 55%), radial-gradient(circle at 75% 85%, ${s.meshB}, transparent 55%)`,
                      filter: "blur(20px)",
                    }}
                    aria-hidden
                  />

                  <BorderBeam
                    size={220}
                    duration={9}
                    colorFrom={s.beamFrom}
                    colorTo={s.beamTo}
                    delay={idx * 1.5}
                    borderWidth={1.8}
                  />

                  {badge && (
                    <span className="absolute top-6 right-6 paradigm-eyebrow text-paradigm-accent z-10 paradigm-glass rounded-full px-3 py-1 paradigm-glow-sm">
                      {badge}
                    </span>
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="mb-auto">
                      <div
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.iconBg} text-paradigm-paper mb-7 paradigm-glow-md group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}
                      >
                        <Icon size={26} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-display text-[30px] md:text-[42px] leading-[1.05] text-paradigm-ink mb-3 tracking-[-0.025em]">
                        {t(`services.${s.key}.title`)}
                      </h3>
                      <p className={`paradigm-eyebrow mb-5 ${s.accent}`}>{t(`services.${s.key}.tagline`)}</p>
                      <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-md">
                        {t(`services.${s.key}.desc`)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-paradigm-line/60 pt-6 mt-7">
                      <span className="text-[14px] font-semibold bg-gradient-to-r from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                        {t(`services.${s.key}.results`)}
                      </span>
                      <span className="paradigm-eyebrow text-paradigm-ink-soft group-hover:text-paradigm-accent transition-colors flex items-center gap-1">
                        {t("servicesViewMore")}
                        <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
