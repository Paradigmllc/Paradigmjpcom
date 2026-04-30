"use client"

/**
 * TestimonialsSection — 3 quote cards + Marquee trust strip.
 *
 * Avatar = gradient initial circle (no photos). Quote marks 大型化。
 * Marquee で trust badges を流し続ける。
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import FadeIn from "@/components/aesop/FadeIn"
import { Marquee } from "@/components/magicui/marquee"

const EASE = [0.22, 1, 0.36, 1] as const
const TESTIMONIAL_KEYS = ["1", "2", "3"] as const
const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const

const AVATAR_GRADIENTS = [
  "from-paradigm-accent to-paradigm-tech",
  "from-paradigm-tech to-paradigm-glow",
  "from-paradigm-glow to-paradigm-accent",
]

export default function TestimonialsSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-16 max-w-3xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-5">{t("testimonialsEyebrow")}</p>
          <h2 className="font-display text-[36px] md:text-[64px] leading-[1.05] tracking-[-0.025em] text-paradigm-ink">
            {t("testimonialsHeading")}
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
                className="group relative bg-paradigm-paper-deep border border-paradigm-line p-9 md:p-10 hover:border-paradigm-accent/40 hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_rgba(79,70,229,0.18)] transition-all duration-500 flex flex-col"
              >
                <span
                  aria-hidden
                  className="absolute top-6 right-7 font-display text-[80px] leading-none text-paradigm-accent/15 group-hover:text-paradigm-accent/30 transition-colors duration-500 select-none"
                >
                  &ldquo;
                </span>

                <p className="relative z-10 font-display text-[20px] md:text-[24px] leading-[1.45] text-paradigm-ink mb-8 flex-1 tracking-[-0.005em]">
                  {t(`testimonials.${k}.text`)}
                </p>

                <div className="relative z-10 flex items-center gap-4 border-t border-paradigm-line pt-5">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-paradigm-paper font-display text-[20px] tracking-[-0.02em]`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-paradigm-ink mb-0.5">{name}</p>
                    <p className="paradigm-eyebrow text-paradigm-ink-mute">{t(`testimonials.${k}.location`)}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Trust marquee */}
        <FadeIn delay={0.2} className="mt-20 border-y border-paradigm-line py-8">
          <Marquee duration={50} pauseOnHover className="text-paradigm-ink-soft">
            {TRUST_BADGE_KEYS.map((k) => (
              <span
                key={k}
                className="paradigm-eyebrow text-[13px] md:text-[15px] whitespace-nowrap inline-flex items-center gap-3"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-accent" />
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
