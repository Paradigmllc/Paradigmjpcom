"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { RichText } from "@payloadcms/richtext-lexical/react"
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"

const EASE = [0.22, 1, 0.36, 1] as const

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export function SectionRender(b: AnyBlock) {
  const align = (b.alignment as string) ?? "center"
  const bgKey = (b.background as string) ?? "default"
  const bg = bgKey === "surface" ? "bg-paradigm-paper-deep" : bgKey === "accent-soft" ? "bg-paradigm-paper-deep" : "bg-paradigm-paper"
  const isSurface = bgKey === "surface" || bgKey === "accent-soft"
  return (
    <section className={`${bg} paradigm-section relative overflow-hidden`}>
      {isSurface && <div className="absolute inset-0 paradigm-mesh opacity-35" />}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`max-w-5xl mx-auto px-6 md:px-12 relative z-10 ${align === "center" ? "text-center" : "text-left"}`}>
        {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-5">{String(b.kicker)}</p>}
        <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-6">
          {String(b.title ?? "")}
        </h2>
        {!!b.subtitle && (
          <p className="text-[15px] md:text-[17px] text-paradigm-ink-soft max-w-3xl mx-auto leading-[1.85]">
            {String(b.subtitle)}
          </p>
        )}
      </motion.div>
    </section>
  )
}

export function CTARender(b: AnyBlock) {
  const bgKey = (b.background as string) ?? "gradient"
  const isDark = bgKey !== "surface" && bgKey !== "accent"
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined
  return (
    <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
      <div className="absolute inset-0 paradigm-mesh-vivid opacity-60" />
      <div className="section-dots absolute inset-0 opacity-[0.04]" />
      <Meteors number={20} color="rgba(167, 139, 250, 0.35)" />
      <Sparkles count={16} color="rgba(244, 114, 182, 0.4)" duration={3} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="max-w-3xl mx-auto px-6 md:px-12 text-center relative z-10">
        <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] mb-6">
          <span className="bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_5s_ease_infinite]">
            {String(b.title ?? "")}
          </span>
        </h2>
        {!!b.subtitle && (
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-xl mx-auto mb-10 leading-[1.85] font-light">
            {String(b.subtitle)}
          </p>
        )}
        <div className="flex flex-wrap gap-4 justify-center">
          {primary?.href && (
            <a href={primary.href}
              className="inline-flex items-center gap-2 bg-paradigm-glow/20 backdrop-blur-sm border border-paradigm-glow/40 text-paradigm-paper hover:bg-paradigm-glow/30 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-all paradigm-glow-sm rounded-xl">
              {primary.label ?? "Get started"} <ArrowRight size={16} />
            </a>
          )}
          {secondary?.href && (
            <a href={secondary.href}
              className="inline-flex items-center gap-2 border border-paradigm-paper/15 text-paradigm-paper/70 hover:bg-paradigm-paper/8 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors rounded-xl">
              {secondary.label ?? "Learn more"}
            </a>
          )}
        </div>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-transparent to-transparent pointer-events-none" />
    </section>
  )
}

export function FAQRender(b: AnyBlock) {
  const items = (b.items as Array<{ question?: string; answer?: SerializedEditorState }>) ?? []
  return (
    <section className="bg-paradigm-paper-deep paradigm-section relative overflow-hidden">
      <div className="paradigm-mesh opacity-30" />
      <div className="max-w-3xl mx-auto px-6 md:px-12 relative z-10">
        {!!b.title && (
          <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-3">
            {String(b.title)}
          </h2>
        )}
        {!!b.subtitle && (
          <p className="text-[15px] text-paradigm-ink-soft text-center mb-12 leading-[1.85]">{String(b.subtitle)}</p>
        )}
        <ul className="border-t border-paradigm-line">
          {items.map((item, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="border-b border-paradigm-line">
                <details className="group">
                  <summary className="cursor-pointer flex items-start gap-5 py-7 list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[18px] md:text-[22px] leading-[1.4] text-paradigm-ink flex-1 pr-8">{item.question ?? ""}</span>
                    <span aria-hidden className="shrink-0 text-paradigm-ink-mute mt-2 group-open:rotate-45 transition-transform text-[18px] leading-none">+</span>
                  </summary>
                  {item.answer && (
                    <div className="pl-1 pr-8 pb-7 -mt-2 text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">
                      <RichText data={item.answer} />
                    </div>
                  )}
                </details>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function RichTextRender(b: AnyBlock) {
  const maxWidth = (b.maxWidth as string) ?? "prose"
  const widthClass = maxWidth === "wide" ? "max-w-5xl" : maxWidth === "full" ? "max-w-full" : "max-w-3xl"
  const content = b.content as SerializedEditorState | undefined
  if (!content) return null
  return (
    <section className="bg-paradigm-paper paradigm-section">
      <div className={`${widthClass} mx-auto px-6 md:px-12 prose prose-paradigm max-w-none`}>
        <RichText data={content} />
      </div>
    </section>
  )
}

export function SplitContentRender(b: AnyBlock) {
  const reverse = (b.reverse as boolean) ?? false
  const content = b.content as SerializedEditorState | undefined
  const image = b.image as { url?: string; alt?: string } | undefined
  const bgKey = (b.background as string) ?? "default"
  const bg = bgKey === "surface" ? "bg-paradigm-paper-deep" : "bg-paradigm-paper"
  const ctaLabel = typeof b.ctaLabel === "string" ? b.ctaLabel : undefined
  const ctaHref = typeof b.ctaHref === "string" ? b.ctaHref : undefined
  const ctaIsExternal = ctaHref ? /^https?:\/\//i.test(ctaHref) : false
  const imagePlaceholder = typeof b.imagePlaceholder === "string" ? b.imagePlaceholder : "Image"
  return (
    <section className={`${bg} paradigm-section relative overflow-hidden`}>
      <div className={`max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center`}>
        <div className={reverse ? "md:order-2" : ""}>
          {!!b.kicker && <p className="paradigm-eyebrow text-paradigm-accent mb-4">{String(b.kicker)}</p>}
          {!!b.title && <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-5">{String(b.title)}</h2>}
          {content && <div className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] prose prose-paradigm max-w-none"><RichText data={content} /></div>}
          {ctaLabel && ctaHref && <a href={ctaHref} target={ctaIsExternal ? "_blank" : undefined} rel={ctaIsExternal ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-2 mt-8 text-paradigm-ink border-b border-paradigm-ink pb-1 text-[12px] tracking-[0.14em] uppercase hover:text-paradigm-accent hover:border-paradigm-accent transition-colors">{ctaLabel} →</a>}
        </div>
        <div className={reverse ? "md:order-1" : ""}>
          {image?.url ? (
            <img src={image.url} alt={image.alt ?? ""} className="rounded-2xl paradigm-glass w-full" loading="lazy" />
          ) : (
            <div className="bg-paradigm-line/20 rounded-2xl aspect-square flex items-center justify-center paradigm-eyebrow text-paradigm-ink-mute">{imagePlaceholder}</div>
          )}
        </div>
      </div>
    </section>
  )
}
