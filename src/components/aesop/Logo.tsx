import { Link } from "@/i18n/routing"

/**
 * Paradigm logo — geometric lens mark + title-case wordmark.
 *
 * The icon: two overlapping circles forming a lens (almond shape) at their
 * intersection — the paradigm as a way of seeing. One circle outlined
 * (current view), one filled (new view). Their overlap is the shift.
 * Minimal, architectural, luxury-brand feel.
 */

function ParadigmLens({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left circle — outlined (established perspective) */}
      <circle
        cx="12" cy="16" r="9"
        stroke="currentColor"
        strokeWidth="1.8"
        className="opacity-50"
      />
      {/* Right circle — filled (new perspective) */}
      <circle
        cx="20" cy="16" r="9"
        fill="currentColor"
        className="opacity-85"
      />
      {/* Lens intersection — the shift itself */}
      <path
        d="M16.5 7.5C18.5 9.5 20 12 20 16C20 20 18.5 22.5 16.5 24.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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
      className={`inline-flex items-center gap-3 select-none ${className}`}
      aria-label="Paradigm"
    >
      <ParadigmLens className="w-[26px] h-[26px] md:w-7 md:h-7 shrink-0 text-paradigm-ink" />
      <span className="text-[19px] md:text-[21px] font-light tracking-[0.06em] text-paradigm-ink leading-none">
        Paradigm
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
