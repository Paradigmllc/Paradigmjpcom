"use client"

/**
 * RichCtaBand — reusable closing CTA section (Meteors + Sparkles + gradient).
 *
 * 全 inner page で使用される共通 closing band。home の CtaSection と同じ voice。
 * Page 固有のテキストを props で受ける。AE-PHP-1: 70 lines.
 */

import { Link } from "@/i18n/routing"
import { ArrowRight, Sparkles as SparkleIcon } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import FadeIn from "@/components/aesop/FadeIn"

interface RichCtaBandProps {
  eyebrow: string
  title: string
  highlight?: string
  desc: string
  buttonLabel: string
  buttonHref?: string
  bullets?: readonly string[]
}

export default function RichCtaBand({
  eyebrow,
  title,
  highlight,
  desc,
  buttonLabel,
  buttonHref = "/contact",
  bullets,
}: RichCtaBandProps) {
  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-80" />
      <Meteors number={16} color="rgba(255, 255, 255, 0.55)" />
      <Sparkles count={12} color="rgba(244, 114, 182, 0.5)" duration={3.5} />

      <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
        <div className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-5 paradigm-glow-sm">
          <SparkleIcon size={12} className="text-paradigm-glow" strokeWidth={2} />
          <span className="paradigm-eyebrow text-paradigm-paper">{eyebrow}</span>
        </div>

        <h2 className="font-display text-[28px] md:text-[44px] leading-[1.1] tracking-[-0.03em] text-paradigm-paper mb-5">
          {highlight ? (
            <>
              {title.split(highlight)[0]}
              <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow to-paradigm-tech bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradientShift_6s_ease_infinite]">
                {highlight}
              </span>
              {title.split(highlight)[1]}
            </>
          ) : (
            title
          )}
        </h2>

        <p className="text-[14px] md:text-[16px] text-paradigm-paper/80 max-w-lg mx-auto mb-8 leading-[1.8]">
          {desc}
        </p>

        <Link
          href={buttonHref}
          className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-paradigm-paper text-paradigm-ink text-[12px] tracking-[0.14em] uppercase font-semibold paradigm-glow-lg overflow-hidden hover:scale-[1.03] transition-transform"
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <span className="relative z-10">{buttonLabel}</span>
          <ArrowRight size={14} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {bullets && bullets.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {bullets.map((b) => (
              <span key={b} className="paradigm-eyebrow text-paradigm-paper/60 inline-flex items-center gap-2 text-[10px]">
                <span className="inline-block w-1 h-1 rounded-full bg-gradient-to-br from-paradigm-glow to-paradigm-tech" />
                {b}
              </span>
            ))}
          </div>
        )}
      </FadeIn>
    </section>
  )
}
