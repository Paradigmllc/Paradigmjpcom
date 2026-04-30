"use client"

/**
 * MarqueeSection — trust ribbon w/ balanced typography (P18-D-8 right-sized).
 * 大型 display 40px → 22px に削減。py-12 → py-6 で余白 tight。
 */

import { useTranslations } from "next-intl"
import { Marquee } from "@/components/magicui/marquee"

const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const
const SECONDARY_KEYS = ["growth", "retention", "consult", "support"] as const

export default function MarqueeSection() {
  const t = useTranslations("home")
  const tStats = (key: string) => t(`stats.${key}.label`)

  return (
    <section className="relative bg-paradigm-paper-deep py-6 md:py-8 overflow-hidden border-y border-paradigm-line">
      <div className="paradigm-mesh opacity-30" />
      <div className="relative z-10 space-y-2">
        <Marquee duration={45} pauseOnHover={false} className="text-paradigm-ink-soft">
          {TRUST_BADGE_KEYS.map((k) => (
            <span
              key={k}
              className="font-display text-[16px] md:text-[22px] leading-none tracking-[-0.01em] whitespace-nowrap"
            >
              {t(`trustBadges.${k}`)}
              <span className="mx-6 md:mx-10 text-paradigm-accent inline-block">●</span>
            </span>
          ))}
        </Marquee>
        <Marquee duration={60} reverse pauseOnHover={false} className="text-paradigm-ink-mute">
          {SECONDARY_KEYS.map((k) => (
            <span
              key={k}
              className="paradigm-eyebrow text-[10px] md:text-[12px] whitespace-nowrap"
            >
              {tStats(k)}
              <span className="mx-5 md:mx-7 text-paradigm-line inline-block">/</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
