"use client"

/** A visual fallback mark for companies without a verified logo asset. */
export function PremiumV3BrandMark({ accent, label }: { accent: string; label: string }) {
  return (
    <span
      className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[34%] border border-black/10 bg-white shadow-[0_8px_24px_-16px_rgba(0,0,0,.5)]"
      aria-label={label}
    >
      <span className="absolute h-7 w-7 rotate-45 rounded-[32%] opacity-90" style={{ backgroundColor: accent }} aria-hidden="true" />
      <span className="absolute h-3.5 w-3.5 -rotate-45 rounded-full bg-white/90" aria-hidden="true" />
      <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full border-4 border-white/70" style={{ backgroundColor: accent }} aria-hidden="true" />
    </span>
  )
}
