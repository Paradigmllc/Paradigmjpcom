import { Link } from "@/i18n/routing"

/**
 * Enhanced Aesop-style wordmark + geometric icon mark.
 *
 * The icon mark — a perfectly split regular hexagon (left half outlined,
 * right half filled) — represents the paradigm shift (パラダイムシフト):
 * the same structural whole seen from two complementary perspectives.
 *
 * AE-PHP-1: ~30 lines. AE-PHP-2: no hardcoded UI strings — "PARADIGM" is
 * the brand wordmark (proper noun, not subject to i18n).
 */

function ParadigmMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left half — outlined (classic view) */}
      <path
        d="M14 3.6L5.2 8.6V19.4L14 24.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="opacity-60"
      />
      {/* Right half — filled (shifted view) */}
      <path
        d="M14 3.6L22.8 8.6V19.4L14 24.4Z"
        fill="currentColor"
        className="opacity-90"
      />
      {/* Center dividing line */}
      <line
        x1="14" y1="3.6" x2="14" y2="24.4"
        stroke="currentColor"
        strokeWidth="1.5"
        className="opacity-60"
      />
    </svg>
  )
}

export default function Logo({
  className = "",
  href = "/",
}: {
  className?: string
  href?: string
}) {
  const content = (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label="Paradigm"
    >
      <ParadigmMark className="w-6 h-6 md:w-7 md:h-7 shrink-0 text-paradigm-accent" />
      <span className="text-[18px] md:text-[20px] uppercase font-light tracking-[0.25em] text-paradigm-ink leading-none">
        PARADIGM
      </span>
    </span>
  )
  if (!href) return content
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  )
}
