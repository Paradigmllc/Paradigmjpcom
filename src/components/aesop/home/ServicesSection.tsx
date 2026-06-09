"use client"

/**
 * ServicesSection — Bento w/ balanced typography (P18-D-8 right-sized).
 *
 * Card title 22-28px / body 14-15px / padding p-6 md:p-8 / row 240-280px.
 * Removed paradigm-tilt (was distracting). Keep BorderBeam + glow + mesh.
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Bot, Globe, Search, Video, ArrowUpRight } from "lucide-react"
import { BorderBeam } from "@/components/magicui/border-beam"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const SERVICES = [
  {
    key: "web",
    icon: Globe,
    href: "/services/web",
    span: "md:col-span-2 md:row-span-2",
    iconBg: "from-fuchsia-500 via-paradigm-accent to-paradigm-tech",
    beamFrom: "rgb(236 72 153)",
    beamTo: "rgb(245 158 11)",
    meshA: "rgba(236, 72, 153, 0.15)",
    meshB: "rgba(245, 158, 11, 0.12)",
    accent: "text-fuchsia-500",
  },
  {
    key: "meo",
    icon: Search,
    href: "/services/meo",
    span: "md:col-span-1",
    iconBg: "from-paradigm-tech via-paradigm-glow to-violet-400",
    beamFrom: "rgb(245 158 11)",
    beamTo: "rgb(167 139 250)",
    meshA: "rgba(245, 158, 11, 0.15)",
    meshB: "rgba(167, 139, 250, 0.10)",
    accent: "text-amber-500",
  },
  {
    key: "video",
    icon: Video,
    href: "/video",
    span: "md:col-span-1",
    iconBg: "from-paradigm-glow via-violet-500 to-paradigm-accent",
    beamFrom: "rgb(244 114 182)",
    beamTo: "rgb(139 92 246)",
    meshA: "rgba(244, 114, 182, 0.15)",
    meshB: "rgba(139, 92, 246, 0.10)",
    accent: "text-violet-500",
  },
  {
    key: "ai",
    icon: Bot,
    href: "/services/ai",
    span: "md:col-span-2",
    iconBg: "from-paradigm-accent via-fuchsia-500 to-amber-400",
    beamFrom: "rgb(139 92 246)",
    beamTo: "rgb(251 191 36)",
    meshA: "rgba(139, 92, 246, 0.15)",
    meshB: "rgba(251, 191, 36, 0.12)",
    accent: "text-amber-500",
  },
] as const

export default function ServicesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("servicesEyebrow")}</p>
          <h2 className="font-display text-[28px] md:text-[44px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
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
          className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 auto-rows-[220px] md:auto-rows-[260px]"
        >
          {SERVICES.map((s, idx) => {
            const Icon = s.icon
            const badge = t(`services.${s.key}.badge`)
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                className={s.span}
              >
                <Link
                  href={s.href}
                  className="group relative block h-full bg-paradigm-paper-card border border-paradigm-line rounded-2xl p-6 md:p-7 hover:border-paradigm-accent/50 hover:-translate-y-1 hover:paradigm-glow-lg transition-all duration-500 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                    style={{
                      background: `radial-gradient(circle at 25% 15%, ${s.meshA}, transparent 55%), radial-gradient(circle at 75% 85%, ${s.meshB}, transparent 55%)`,
                      filter: "blur(16px)",
                    }}
                    aria-hidden
                  />

                  <BorderBeam
                    size={180}
                    duration={9}
                    colorFrom={s.beamFrom}
                    colorTo={s.beamTo}
                    delay={idx * 1.5}
                    borderWidth={1.5}
                  />

                  {badge && (
                    <span className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent z-10 paradigm-glass rounded-full px-2.5 py-1 paradigm-glow-sm text-[10px]">
                      {badge}
                    </span>
                  )}

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="mb-auto">
                      <div
                        className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${s.iconBg} text-paradigm-paper mb-4 paradigm-glow-sm group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}
                      >
                        <Icon size={20} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-1.5 tracking-[-0.015em]">
                        {t(`services.${s.key}.title`)}
                      </h3>
                      <p className={`paradigm-eyebrow mb-3 text-[10px] ${s.accent}`}>{t(`services.${s.key}.tagline`)}</p>
                      <p className="text-[13px] text-paradigm-ink-soft leading-[1.7] max-w-md">
                        {t(`services.${s.key}.desc`)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-paradigm-line/60 pt-3 mt-4">
                      <span className="text-[12px] font-semibold bg-gradient-to-r from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                        {t(`services.${s.key}.results`)}
                      </span>
                      <span className="paradigm-eyebrow text-paradigm-ink-soft group-hover:text-paradigm-accent transition-colors flex items-center gap-1 text-[10px]">
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
