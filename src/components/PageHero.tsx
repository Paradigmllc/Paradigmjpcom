/**
 * PageHero — shared inner-page hero (Aesop / Le Labo grammar).
 *
 * P18-D-2 rewrite: drops the dark gradient + violet blobs + sakura petals
 * pattern in favour of paradigm-paper bg + paradigm-eyebrow + serif h1.
 * The `accent` and `icon` props are kept for callsite compatibility but
 * `accent` is now ignored (single brand voice). `icon` still renders if
 * passed but is rare on Aesop pages.
 *
 * Server component: CSS-only, no client motion. The PageTransition
 * wrapper at the layout level handles the fade-in for route changes.
 *
 * AE-PHP-1: 60 lines. AE-PHP-4: shared inner hero only — section content
 * lives in the page itself.
 */

interface PageHeroProps {
  /** Small caps eyebrow above the headline. */
  badge: string
  /** Serif display headline. */
  title: string
  /** Optional one-line description below the headline. */
  desc?: string
  /** @deprecated kept for callsite compatibility — Aesop pages avoid icons. */
  icon?: string
  /** @deprecated accent variant ignored in Aesop voice. */
  accent?: "violet" | "indigo" | "emerald" | "rose" | "amber"
}

export default function PageHero({ badge, title, desc, icon }: PageHeroProps) {
  return (
    <section className="relative bg-paradigm-paper pt-36 pb-20 md:pt-44 md:pb-28 px-6 md:px-12 border-b border-paradigm-line">
      <div className="max-w-5xl mx-auto">
        <p className="paradigm-eyebrow mb-6">{badge}</p>
        {icon && (
          <span aria-hidden className="block mb-6 text-[40px] leading-none opacity-70">
            {icon}
          </span>
        )}
        <h1 className="font-display text-[40px] md:text-[72px] leading-[1.08] tracking-[-0.015em] text-paradigm-ink max-w-4xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-8 text-[15px] md:text-[17px] text-paradigm-ink-soft leading-[1.85] max-w-2xl">
            {desc}
          </p>
        )}
      </div>
    </section>
  )
}
