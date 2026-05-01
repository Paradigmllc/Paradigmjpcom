// ─── CTA Block ──────────────────────────────────────────────────
import type { CTAProps } from "./types"

export function CTABlock({ heading, description, buttonLabel, buttonUrl, variant = "primary" }: CTAProps) {
  const isPrimary = variant === "primary"
  return (
    <section className={`py-16 px-6 ${isPrimary ? "bg-accent" : ""}`}>
      <div className={`max-w-3xl mx-auto text-center ${isPrimary ? "text-white" : ""}`}>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">{heading}</h2>
        {description && <p className={`text-lg mb-6 ${isPrimary ? "text-white/90" : "text-text-secondary"}`}>{description}</p>}
        <a href={buttonUrl} className={`inline-block px-8 py-4 rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02] ${
          isPrimary ? "bg-white text-accent hover:bg-white/90" : "bg-accent text-white hover:bg-accent/90"
        }`}>{buttonLabel}</a>
      </div>
    </section>
  )
}
