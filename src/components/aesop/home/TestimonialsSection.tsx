"use client"

/**
 * TestimonialsSection — 3 quote cards (P18-D-8 right-sized).
 * Title 26px → 18-20px / padding p-10 → p-6 / quote mark 100px → 56px.
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Star } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { Marquee } from "@/components/magicui/marquee"

const EASE = [0.22, 1, 0.36, 1] as const
const TESTIMONIAL_KEYS = ["1", "2", "3"] as const
const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const

const AVATAR_GRADIENTS = [
  "from-pink-400 via-paradigm-accent to-paradigm-tech",
  "from-paradigm-tech via-paradigm-glow to-violet-400",
  "from-paradigm-glow via-violet-400 to-paradigm-accent",
]

export default function TestimonialsSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("testimonialsEyebrow")}</p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("testimonialsHeading")}
            </span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {TESTIMONIAL_KEYS.map((k, idx) => {
            const name = t(`testimonials.${k}.name`)
            const initial = name.charAt(0)
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: EASE }}
                whileHover={{ y: -4 }}
                className="group relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-lg hover:border-paradigm-accent/40 transition-all duration-500 flex flex-col"
              >
                <span
                  aria-hidden
                  className="absolute top-4 right-5 font-display text-[56px] leading-none bg-gradient-to-br from-paradigm-accent/30 to-paradigm-tech/20 bg-clip-text text-transparent select-none"
                >
                  &ldquo;
                </span>

                <div className="relative z-10 flex items-center gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className="fill-paradigm-accent text-paradigm-accent" />
                  ))}
                </div>

                <p className="relative z-10 font-display text-[15px] md:text-[17px] leading-[1.55] text-paradigm-ink mb-5 flex-1 tracking-[-0.005em]">
                  {t(`testimonials.${k}.text`)}
                </p>

                <div className="relative z-10 flex items-center gap-3 border-t border-paradigm-line/60 pt-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-paradigm-paper font-display text-[16px] tracking-[-0.02em] paradigm-glow-sm`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-paradigm-ink">{name}</p>
                    <p className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">{t(`testimonials.${k}.location`)}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <FadeIn delay={0.2} className="mt-12 paradigm-glass rounded-xl py-4 px-2 border border-paradigm-line">
          <Marquee duration={50} pauseOnHover className="text-paradigm-ink-soft">
            {TRUST_BADGE_KEYS.map((k) => (
              <span key={k} className="paradigm-eyebrow text-[11px] md:text-[13px] whitespace-nowrap inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech" />
                {t(`trustBadges.${k}`)}
                <span className="ml-2 text-paradigm-line">/</span>
              </span>
            ))}
          </Marquee>
        </FadeIn>
      </div>
    </section>
  )
}
