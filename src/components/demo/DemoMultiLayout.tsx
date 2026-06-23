"use client"

import { usePathname } from "next/navigation"

interface NavLink {
  label: string
  href: string
}

interface Props {
  navLinks: NavLink[]
  basePath: string
  children: React.ReactNode
}

export function DemoMultiLayout({ navLinks, basePath, children }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath
    return pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-gray-900 antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a href={basePath} className="flex items-center gap-2.5 font-display text-lg font-bold text-gray-900 hover:text-[var(--demo-accent,#2563eb)] transition-colors">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: "var(--demo-accent, #2563eb)" }}
            >
              P
            </div>
            <span className="hidden sm:inline">Paradigm Demo</span>
          </a>

          {/* Links */}
          <div className="hidden gap-1 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 transition-colors ${
                  isActive(link.href)
                    ? "bg-[var(--demo-accent,#2563eb)]/10 text-[var(--demo-accent,#2563eb)]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <a
            href={`${basePath}/contact`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--demo-accent, #2563eb)" }}
          >
            無料相談
            <ArrowIcon />
          </a>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-[var(--demo-accent,#2563eb)]/10 text-[var(--demo-accent,#2563eb)]"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--demo-accent, #2563eb)" }}
                >
                  P
                </div>
                <span className="font-display text-base font-semibold text-gray-900">Paradigm Demo</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                Generated from diagnostic data. This is a demonstration of what an improved website could look like.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-gray-900">Pages</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-gray-500 transition-colors hover:text-[var(--demo-accent,#2563eb)]">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-gray-900">Contact</h4>
              <p className="text-sm leading-relaxed text-gray-500">
                Ready to improve your website? Book a free 15-minute consultation.
              </p>
              <a
                href={`${basePath}/contact`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--demo-accent, #2563eb)" }}
              >
                Book a call →
              </a>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Paradigm LLC — This demo was auto-generated from diagnostic data.
          </div>
        </div>
      </footer>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M12 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
