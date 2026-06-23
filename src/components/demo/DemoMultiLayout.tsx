"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

interface NavLink {
  label: string
  href: string
}

interface Props {
  navLinks: NavLink[]
  basePath: string
  isJa: boolean
  companyName: string
  children: React.ReactNode
}

export function DemoMultiLayout({ navLinks, basePath, isJa, companyName, children }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath
    return pathname.startsWith(href)
  }

  // Extract initials from company name (first 1-2 chars of the first two words)
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || companyName.slice(0, 1).toUpperCase()

  const ctaText = isJa ? "無料相談" : "Free Consultation"
  const footerDescription = isJa
    ? "診断データから自動生成されました。改善後のWebサイトのイメージです。"
    : "Generated from diagnostic data. This is a demonstration of what an improved website could look like."
  const footerCTA = isJa ? "無料相談を予約 →" : "Book a call →"
  const footerContactLabel = isJa ? "お問い合わせ" : "Contact"
  const footerPagesLabel = isJa ? "ページ" : "Pages"

  return (
    <div className="flex min-h-dvh flex-col bg-white text-gray-900 antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a
            href={basePath}
            className="flex items-center gap-2.5 font-display text-lg font-bold text-gray-900 hover:text-[var(--demo-accent,#2563eb)] transition-colors group"
          >
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold text-white shadow-sm"
              style={{ background: "var(--demo-accent, #2563eb)" }}
              whileHover={{ borderRadius: "0.75rem" }}
              transition={{ duration: 0.2 }}
            >
              {initials}
            </motion.div>
            <span className="hidden sm:inline">{companyName}</span>
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
            {ctaText}
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
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--demo-accent, #2563eb)" }}
                >
                  {initials}
                </div>
                <span className="font-display text-base font-semibold text-gray-900">{companyName}</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                {footerDescription}
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-gray-900">{footerPagesLabel}</h4>
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
              <h4 className="mb-3 font-display text-sm font-semibold text-gray-900">{footerContactLabel}</h4>
              <p className="text-sm leading-relaxed text-gray-500">
                {isJa
                  ? "Webサイトの改善にご興味はありませんか？15分の無料コンサルテーションを予約してください。"
                  : "Ready to improve your website? Book a free 15-minute consultation."}
              </p>
              <a
                href={`${basePath}/contact`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--demo-accent, #2563eb)" }}
              >
                {footerCTA}
              </a>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            {isJa
              ? `© ${new Date().getFullYear()} Paradigm LLC — このデモは診断データから自動生成されました。`
              : `© ${new Date().getFullYear()} Paradigm LLC — This demo was auto-generated from diagnostic data.`}
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
