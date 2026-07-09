"use client"

import { motion } from "framer-motion"
import { Marquee } from "@/components/magicui/marquee"

const EASE = [0.22, 1, 0.36, 1] as const

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export function VideoRender(b: AnyBlock) {
  const embedUrl = b.embedUrl as string | undefined
  if (!embedUrl) return null
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {!!b.title && <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-4">{String(b.title)}</h2>}
        {!!b.subtitle && <p className="text-[15px] text-paradigm-ink-soft mb-8 leading-[1.85]">{String(b.subtitle)}</p>}
        <div className="aspect-video rounded-2xl overflow-hidden paradigm-glass">
          <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" title={String(b.title ?? "")} />
        </div>
      </div>
    </section>
  )
}

export function MarqueeRender(b: AnyBlock) {
  const items = (b.items as Array<{ text?: string }>) ?? []
  if (items.length === 0) return null
  const direction = (b.direction as string) ?? "left"
  const speed = (b.speed as string) ?? "normal"
  const duration = speed === "slow" ? 50 : speed === "fast" ? 20 : 40
  return (
    <section className="bg-paradigm-paper-deep py-7 overflow-hidden border-y border-paradigm-line relative">
      <div className="paradigm-mesh opacity-25 absolute inset-0" />
      <Marquee duration={duration} pauseOnHover reverse={direction === "right"} className="relative z-10">
        {items.map((it, i) => (
          <span key={i} className="text-[12px] md:text-[14px] font-medium whitespace-nowrap inline-flex items-center gap-3 px-6 text-paradigm-ink-soft">
            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-glow" />
            {it.text ?? ""}
          </span>
        ))}
      </Marquee>
    </section>
  )
}

export function LogoCloudRender(b: AnyBlock) {
  const logos = (b.logos as Array<{ image?: unknown; alt?: string }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section py-16 border-y border-paradigm-line">
      <div className="max-w-6xl mx-auto px-6 md:px-12 text-center">
        {!!b.title && <p className="paradigm-eyebrow text-paradigm-accent mb-8">{String(b.title)}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-30 hover:opacity-50 transition-opacity grayscale">
          {logos.map((l, i) => (
            <div key={i} className="paradigm-eyebrow text-paradigm-ink-mute text-[11px] tracking-[0.14em] uppercase">
              {l.alt ?? `Logo ${i + 1}`}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
