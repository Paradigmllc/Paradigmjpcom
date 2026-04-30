/**
 * PageHero — Rich shared inner-page hero (P18-D-9 quality leap).
 *
 * 全 inner page で使用される共通 hero。home 並みの richness を提供:
 *   - paradigm-mesh-vivid (5-stop rainbow drift)
 *   - Sparkles overlay (subtle)
 *   - gradient text headline (font-display + multi-color clip)
 *   - paradigm-glass badge with pulse dot
 *   - paradigm-glow-text ambient halo
 *
 * Server component: client motion は使わず CSS animation のみで軽量化。
 *
 * AE-PHP-1: 80 lines.
 */

import { Sparkles } from "@/components/magicui/sparkles"

interface PageHeroProps {
  badge: string
  title: string
  desc?: string
  /** @deprecated kept for callsite compatibility */
  icon?: string
  /** @deprecated accent variant ignored in unified voice */
  accent?: "violet" | "indigo" | "emerald" | "rose" | "amber"
  /** Optional gradient highlight portion (will be styled with rainbow text) */
  highlight?: string
}

export default function PageHero({ badge, title, desc, highlight }: PageHeroProps) {
  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper pt-32 pb-16 md:pt-40 md:pb-20 px-6 md:px-8 overflow-hidden border-b border-paradigm-line">
      <div className="paradigm-mesh-vivid opacity-70" />
      <Sparkles count={14} color="rgba(165, 180, 252, 0.45)" duration={4} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-6 paradigm-glow-sm">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
          <span className="paradigm-eyebrow text-paradigm-paper">{badge}</span>
        </div>

        <h1 className="font-display text-[34px] md:text-[56px] leading-[1.05] tracking-[-0.025em] text-paradigm-paper max-w-4xl paradigm-glow-text">
          {highlight ? (
            <>
              {title.split(highlight)[0]}
              <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradientShift_6s_ease_infinite]">
                {highlight}
              </span>
              {title.split(highlight)[1]}
            </>
          ) : (
            title
          )}
        </h1>

        {desc && (
          <p className="mt-6 text-[14px] md:text-[16px] text-paradigm-paper/80 leading-[1.85] max-w-2xl">
            {desc}
          </p>
        )}
      </div>
    </section>
  )
}
