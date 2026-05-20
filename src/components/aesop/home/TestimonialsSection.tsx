"use client"

/**
 * TestimonialsSection — honest proof panel (2026-05-20 壁打ち).
 *
 * 旧: 架空の顧客 3 件 (名前/地域/星評価/数字) を捏造表示していた。
 * 壁打ち方針「捏造数字・匿名テンプレ証言は全廃」に基づき、星付き顧客レビュー形式を撤去し、
 * /en の proof セクションと同じ「事例は準備中・照会は相談で」の誠実なパネルに置換。
 * 信頼バッジ marquee (検証可能な事実のみ) は維持。
 */

import { useTranslations } from "next-intl"
import { ShieldCheck } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { Marquee } from "@/components/magicui/marquee"

const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const

export default function TestimonialsSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
        <FadeIn>
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("testimonialsEyebrow")}</p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink mb-6">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("testimonialsHeading")}
            </span>
          </h2>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-paradigm-accent to-paradigm-tech text-paradigm-paper mb-6 paradigm-glow-md">
            <ShieldCheck size={22} strokeWidth={1.5} />
          </div>

          <p className="text-[15px] md:text-[17px] leading-[1.85] text-paradigm-ink-soft max-w-2xl mx-auto">
            {t("testimonialsBody")}
          </p>
        </FadeIn>
      </div>

      <FadeIn
        delay={0.2}
        className="relative z-10 max-w-6xl mx-auto px-2 md:px-8 mt-12 paradigm-glass rounded-xl py-4 border border-paradigm-line"
      >
        <Marquee duration={50} pauseOnHover className="text-paradigm-ink-soft">
          {TRUST_BADGE_KEYS.map((k) => (
            <span
              key={k}
              className="paradigm-eyebrow text-[11px] md:text-[13px] whitespace-nowrap inline-flex items-center gap-2"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech" />
              {t(`trustBadges.${k}`)}
              <span className="ml-2 text-paradigm-line">/</span>
            </span>
          ))}
        </Marquee>
      </FadeIn>
    </section>
  )
}
