"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"

const EASE = [0.22, 1, 0.36, 1] as const

interface AnyBlock {
  blockType: string
  id?: string
  [key: string]: unknown
}

export default function BlockRendererHero({ block: b }: { block: AnyBlock }) {
  const stats = (b.stats as Array<{ value?: string; label?: string }>) ?? []
  const primary = b.primaryCta as { label?: string; href?: string } | undefined
  const secondary = b.secondaryCta as { label?: string; href?: string } | undefined

  return (
    <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center bg-paradigm-ink overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 paradigm-mesh-vivid opacity-90" />
        <div className="absolute top-[15%] left-[10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-transparent blur-[100px] animate-[blobFloat_18s_ease-in-out_infinite]" />
        <div className="absolute top-[50%] right-[5%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-bl from-amber-500/15 via-paradigm-glow/20 to-transparent blur-[100px] animate-[blobFloat2_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] left-[30%] w-[35vw] h-[35vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-tr from-paradigm-accent/20 via-fuchsia-400/15 to-transparent blur-[80px] animate-[blobFloat3_14s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-br from-paradigm-ink/75 via-paradigm-ink/60 to-transparent" />
      </div>
      <div className="absolute inset-0 section-dots opacity-[0.04] pointer-events-none" />
      <Meteors number={10} color="rgba(167, 139, 250, 0.4)" />
      <Sparkles count={18} color="rgba(244, 114, 182, 0.4)" duration={4} />
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 pt-32 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
          {!!b.badge && (
            <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-paradigm-accent to-paradigm-glow animate-pulse" />
              <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">{String(b.badge)}</span>
            </div>
          )}
          <h1 style={{ fontSize: "clamp(2.2rem, 6.5vw, 4.5rem)" }} className="font-display leading-[1.1] tracking-[-0.04em] text-paradigm-paper mb-6">
            <span className="bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_5s_ease_infinite]">
              {String(b.title ?? "")}
            </span>
          </h1>
          {!!b.subtitle && (
            <p className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-2xl mx-auto mb-10 leading-[1.85] font-light">{String(b.subtitle)}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {primary?.href && (
              <a href={primary.href} className="inline-flex items-center gap-2 bg-paradigm-glow/20 backdrop-blur-sm border border-paradigm-glow/40 text-paradigm-paper hover:bg-paradigm-glow/30 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-all paradigm-glow-sm rounded-xl">
                {primary.label ?? "Get started"} <ArrowRight size={16} />
              </a>
            )}
            {secondary?.href && (
              <a href={secondary.href} className="inline-flex items-center gap-2 border border-paradigm-paper/15 text-paradigm-paper/70 hover:bg-paradigm-paper/8 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors rounded-xl">
                {secondary.label ?? "Learn more"}
              </a>
            )}
          </div>
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {stats.map((s, i) => (
                <motion.div key={i} whileHover={{ y: -3, scale: 1.02 }} transition={{ duration: 0.3, ease: EASE }}
                  className="paradigm-glass rounded-xl px-3 py-4 text-center cursor-default paradigm-glow-sm">
                  <div className="font-display text-[22px] md:text-[28px] leading-none">
                    <span className="bg-gradient-to-br from-paradigm-glow via-paradigm-tech to-paradigm-accent bg-clip-text text-transparent">
                      {s.value ?? ""}
                    </span>
                  </div>
                  <div className="paradigm-eyebrow text-paradigm-paper/50 mt-1 text-[9px]">{s.label ?? ""}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-paradigm-paper to-transparent pointer-events-none" />
    </section>
  )
}
