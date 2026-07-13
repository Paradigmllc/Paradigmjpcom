const COVER_GRADIENTS = [
  "from-zinc-950 via-blue-900 to-cyan-600",
  "from-zinc-950 via-emerald-900 to-teal-500",
  "from-zinc-900 via-violet-900 to-fuchsia-500",
  "from-zinc-950 via-amber-800 to-orange-500",
] as const

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "JP"
}

interface BlogCoverFallbackProps {
  category?: string
  title: string
  index?: number
  compact?: boolean
}

/** A deterministic editorial cover for CMS posts without an approved image. */
export default function BlogCoverFallback({ category, title, index = 0, compact = false }: BlogCoverFallbackProps) {
  const gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length]
  return (
    <div
      className={`relative isolate overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}
      aria-label={title}
    >
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/20 bg-white/10 blur-[1px]" />
      <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full border border-white/15 bg-black/10" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{category ?? "Paradigm field note"}</span>
          <span className="font-display text-3xl tracking-[-0.06em] text-white/90">{initials(title)}</span>
        </div>
        <div className="max-w-[85%]">
          <p className="text-lg font-semibold leading-tight tracking-[-0.02em] sm:text-xl">{title}</p>
          <div className="mt-4 h-px w-16 bg-emerald-300/80" />
        </div>
      </div>
    </div>
  )
}
