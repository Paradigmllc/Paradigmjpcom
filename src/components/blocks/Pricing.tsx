// ─── Pricing Block ──────────────────────────────────────────────
import type { PricingProps } from "./types"

export function PricingBlock({ heading, plans }: PricingProps) {
  return (
    <section className="py-16 px-6">
      {heading && <h2 className="text-3xl font-bold text-center mb-12">{heading}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((p, i) => (
          <div key={i} className={`rounded-2xl border-2 p-6 flex flex-col ${
            p.highlighted ? "border-accent bg-accent/5 shadow-xl scale-105" : "border-border bg-surface-1"
          }`}>
            {p.highlighted && <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">⭐ Most Popular</div>}
            <h3 className="text-lg font-bold mb-1">{p.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">{p.price}</span>
              {p.cycle && <span className="text-sm text-text-muted">{p.cycle}</span>}
            </div>
            <ul className="space-y-2 mb-6 flex-1 text-sm">
              {p.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-accent shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {p.ctaLabel && p.ctaUrl && (
              <a href={p.ctaUrl} className={`block text-center px-6 py-3 rounded-xl font-semibold transition-colors ${
                p.highlighted ? "bg-accent text-white hover:bg-accent/90" : "border-2 border-border hover:bg-surface-2"
              }`}>{p.ctaLabel}</a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
