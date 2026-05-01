// ─── Hero Block ──────────────────────────────────────────────────
import type { HeroProps } from "./types"

export function HeroBlock({ title, subtitle, ctaLabel, ctaUrl, imageUrl, variant = "centered" }: HeroProps) {
  if (variant === "split" && imageUrl) {
    return (
      <section className="grid md:grid-cols-2 gap-8 items-center py-16 px-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-4 text-lg text-text-secondary">{subtitle}</p>}
          {ctaLabel && ctaUrl && (
            <a href={ctaUrl} className="mt-6 inline-block px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90">{ctaLabel}</a>
          )}
        </div>
        <img src={imageUrl} alt="" className="rounded-2xl shadow-xl w-full" />
      </section>
    )
  }
  const align = variant === "left" ? "text-left" : "text-center"
  return (
    <section className={`py-20 px-6 ${align}`}>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">{title}</h1>
      {subtitle && <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">{subtitle}</p>}
      {ctaLabel && ctaUrl && (
        <a href={ctaUrl} className={`mt-8 inline-block px-8 py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 shadow-lg ${variant === "centered" ? "" : ""}`}>
          {ctaLabel}
        </a>
      )}
    </section>
  )
}
