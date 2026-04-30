"use client"

/**
 * TestimonialsSection — rounded-3xl glass cards + giant quote + gradient avatars.
 *
 * P18-D-7 leap: rounded-3xl, glass background, 5-star rating row, hover lift.
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
      <div className="paradigm-mesh opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 max-w-3xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-5">{t("testimonialsEyebrow")}</p>
          <h2 className="font-display text-[40px] md:text-[72px] leading-[1.02] tracking-[-0.03em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("testimonialsHeading")}
            </span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIAL_KEYS.map((k, idx) => {
            const name = t(`testimonials.${k}.name`)
            const initial = name.charAt(0)
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: idx * 0.12, ease: EASE }}
                whileHover={{ y: -6 }}
                className="group relative paradigm-glass rounded-3xl p-9 md:p-10 paradigm-glow-md hover:paradigm-glow-xl hover:border-paradigm-accent/40 transition-all duration-500 flex flex-col"
              >
                <span
                  aria-hidden
                  className="absolute top-7 right-8 font-display text-[100px] leading-none bg-gradient-to-br from-paradigm-accent/30 to-paradigm-tech/20 bg-clip-text text-transparent select-none"
                >
                  &ldquo;
                </span>

                <div className="relative z-10 flex items-center gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="fill-paradigm-accent text-paradigm-accent" />
                  ))}
                </div>

                <p className="relative z-10 font-display text-[20px] md:text-[26px] leading-[1.4] text-paradigm-ink mb-8 flex-1 tracking-[-0.01em]">
                  {t(`testimonials.${k}.text`)}
                </p>

                <div className="relative z-10 flex items-center gap-4 border-t border-paradigm-line/60 pt-6">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-paradigm-paper font-display text-[20px] tracking-[-0.02em] paradigm-glow-md`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-paradigm-ink mb-0.5">{name}</p>
                    <p className="paradigm-eyebrow text-paradigm-ink-mute">{t(`testimonials.${k}.location`)}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <FadeIn delay={0.2} className="mt-24 paradigm-glass rounded-2xl py-8 px-2 border border-paradigm-line">
          <Marquee duration={50} pauseOnHover className="text-paradigm-ink-soft">
            {TRUST_BADGE_KEYS.map((k) => (
              <span key={k} className="paradigm-eyebrow text-[13px] md:text-[15px] whitespace-nowrap inline-flex items-center gap-3">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech" />
                {t(`trustBadges.${k}`)}
                <span className="ml-3 text-paradigm-line">/</span>
              </span>
            ))}
          </Marquee>
        </FadeIn>
      </div>
    </section>
  )
}
