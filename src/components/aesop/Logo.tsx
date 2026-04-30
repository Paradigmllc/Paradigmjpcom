import { Link } from "@/i18n/routing"

/**
 * Aesop-style wordmark — light weight + wide tracking + uppercase.
 *
 * Why no SVG: Aesop / Le Labo / COS all ship the wordmark as text so it
 * inherits theme color via `currentColor` and respects user font scaling.
 * The visual weight comes from `font-light + tracking-[0.3em]`, not an
 * image. Single-line `inline-block` keeps it from breaking the header
 * baseline alignment when paired with nav.
 *
 * AE-PHP-1: 22 lines. AE-PHP-2: no hardcoded UI strings — "PARADIGM" is
 * the brand wordmark, treated as a proper noun (not subject to i18n).
 */
export default function Logo({
  className = "",
  href = "/",
}: {
  className?: string
  href?: string
}) {
  const content = (
    <span
      className={`inline-block text-[20px] md:text-[22px] uppercase font-light tracking-[0.3em] text-paradigm-ink leading-none select-none ${className}`}
      aria-label="Paradigm"
    >
      PARADIGM
    </span>
  )
  if (!href) return content
  return (
    <Link href={href} className="inline-block">
      {content}
    </Link>
  )
}
