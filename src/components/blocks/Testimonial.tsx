// ─── Testimonial Block ──────────────────────────────────────────
import type { TestimonialProps } from "./types"

export function TestimonialBlock({ quote, author, role, avatarUrl }: TestimonialProps) {
  return (
    <section className="py-16 px-6">
      <figure className="max-w-3xl mx-auto rounded-2xl border border-border bg-surface-1 p-8 shadow-sm">
        <div className="text-4xl text-accent leading-none mb-4" aria-hidden>"</div>
        <blockquote className="text-lg leading-relaxed mb-6">{quote}</blockquote>
        <figcaption className="flex items-center gap-3">
          {avatarUrl && <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full" />}
          <div>
            <div className="font-bold">{author}</div>
            {role && <div className="text-sm text-text-muted">{role}</div>}
          </div>
        </figcaption>
      </figure>
    </section>
  )
}
