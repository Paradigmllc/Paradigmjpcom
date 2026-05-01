// ─── FeatureGrid Block ──────────────────────────────────────────
import type { FeatureGridProps } from "./types"

export function FeatureGridBlock({ heading, features, columns = 3 }: FeatureGridProps) {
  const colClass = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
  return (
    <section className="py-16 px-6">
      {heading && <h2 className="text-3xl font-bold text-center mb-12">{heading}</h2>}
      <div className={`grid grid-cols-1 ${colClass} gap-8 max-w-6xl mx-auto`}>
        {features.map((f, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-1 p-6 text-center hover:shadow-lg transition-shadow">
            {f.icon && <div className="text-4xl mb-3" aria-hidden>{f.icon}</div>}
            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
