// ─── Footer Block ──────────────────────────────────────────────
import type { FooterProps } from "./types"

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  github: "GH",
}

export function FooterBlock({ copyright, links, social }: FooterProps) {
  return (
    <footer className="border-t border-border py-10 px-6 bg-surface-1">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-text-muted">{copyright}</div>
        {links && links.length > 0 && (
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {links.map((l, i) => (
              <a key={i} href={l.url} className="text-text-secondary hover:text-accent transition-colors">{l.label}</a>
            ))}
          </nav>
        )}
        {social && social.length > 0 && (
          <div className="flex items-center gap-3">
            {social.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                aria-label={s.platform}
                className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-xs font-bold hover:bg-accent hover:text-white transition-colors">
                {SOCIAL_ICONS[s.platform] ?? "?"}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}
