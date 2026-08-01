"use client"

import { Link } from "@/i18n/routing"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"

interface RichCtaBandProps {
  eyebrow: string
  title: string
  highlight?: string
  desc: string
  buttonLabel: string
  buttonHref?: string
  bullets?: readonly string[]
  analyticsSource?: string
}

function renderTitle(title: string, highlight?: string) {
  if (!highlight || !title.includes(highlight)) return title
  const [before, after = ""] = title.split(highlight)
  return (
    <>
      {before}
      <span className="text-paradigm-accent">{highlight}</span>
      {after}
    </>
  )
}

export default function RichCtaBand({
  eyebrow,
  title,
  highlight,
  desc,
  buttonLabel,
  buttonHref = "/contact",
  bullets,
  analyticsSource = "final-cta",
}: RichCtaBandProps) {
  const isJapanEntryCta = buttonHref.includes("intent=japan-entry")
  return (
    <section className="border-y border-paradigm-line bg-paradigm-ink text-paradigm-paper">
      <FadeIn className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-5 py-14 md:grid-cols-[minmax(0,1fr)_280px] md:px-8 md:py-20 lg:px-10">
        <div>
          <p className="paradigm-eyebrow mb-4 text-paradigm-paper/65">{eyebrow}</p>
          <h2 className="max-w-3xl font-display text-[30px] leading-[1.14] md:text-[46px]">
            {renderTitle(title, highlight)}
          </h2>
          <p className="mt-5 max-w-2xl text-[14px] leading-[1.9] text-paradigm-paper/72 md:text-[15px]">
            {desc}
          </p>
        </div>

        <div className="flex flex-col justify-end gap-5">
          <Link
            href={buttonHref}
            {...(isJapanEntryCta ? {
              "data-umami-event": "japan-entry-apply",
              "data-umami-event-source": analyticsSource,
            } : {})}
            className="inline-flex h-12 items-center justify-center gap-2 border border-paradigm-paper bg-paradigm-paper px-6 text-[12px] font-semibold text-paradigm-ink transition-colors hover:bg-transparent hover:text-paradigm-paper"
          >
            {buttonLabel}
            <ArrowRight size={14} aria-hidden />
          </Link>

          {bullets && bullets.length > 0 && (
            <ul className="space-y-2">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-[12px] leading-[1.7] text-paradigm-paper/68">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-paradigm-glow" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FadeIn>
    </section>
  )
}
