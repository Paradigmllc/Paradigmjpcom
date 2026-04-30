"use client"

/**
 * MarqueeSection — infinite scrolling trust ribbon between hero & services.
 *
 * 「殺風景」回避のため hero と services の間に動的な帯を挿入。
 * MagicUI Marquee で 30s 周期 + reverse 副ライン × 2 layer で
 * 立体感のある motion を作る。trust badges は messages keys から取得。
 *
 * AE-PHP-1: 60 lines.
 */

import { useTranslations } from "next-intl"
import { Marquee } from "@/components/magicui/marquee"

const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const
const SECONDARY_KEYS = ["growth", "retention", "consult", "support"] as const

export default function MarqueeSection() {
  const t = useTranslations("home")
  const tStats = (key: string) => t(`stats.${key}.label`)

  return (
    <section className="relative bg-paradigm-paper-deep py-12 overflow-hidden border-y border-paradigm-line">
      <div className="paradigm-mesh opacity-50" />
      <div className="relative z-10 space-y-3">
        <Marquee duration={45} pauseOnHover={false} className="text-paradigm-ink-soft">
          {TRUST_BADGE_KEYS.map((k) => (
            <span
              key={k}
              className="font-display text-[28px] md:text-[40px] leading-none tracking-[-0.01em] whitespace-nowrap"
            >
              {t(`trustBadges.${k}`)}
              <span className="mx-8 md:mx-12 text-paradigm-accent inline-block">●</span>
            </span>
          ))}
        </Marquee>
        <Marquee duration={60} reverse pauseOnHover={false} className="text-paradigm-ink-mute">
          {SECONDARY_KEYS.map((k) => (
            <span
              key={k}
              className="paradigm-eyebrow text-[14px] md:text-[16px] whitespace-nowrap"
            >
              {tStats(k)}
              <span className="mx-6 md:mx-8 text-paradigm-line inline-block">/</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
