// ─── FAQ Block (native <details> で軽量) ────────────────────────
import type { FAQProps } from "./types"

export function FAQBlock({ heading, items }: FAQProps) {
  return (
    <section className="py-16 px-6">
      {heading && <h2 className="text-3xl font-bold text-center mb-10">{heading}</h2>}
      <div className="max-w-3xl mx-auto space-y-3">
        {items.map((item, i) => (
          <details key={i} className="rounded-xl border border-border bg-surface-1 p-5 group">
            <summary className="font-semibold cursor-pointer list-none flex items-center justify-between gap-4">
              <span>{item.question}</span>
              <span className="text-accent group-open:rotate-180 transition-transform" aria-hidden>▾</span>
            </summary>
            <p className="mt-3 text-sm text-text-secondary leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
