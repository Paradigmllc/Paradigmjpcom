"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { Menu, X } from "lucide-react"
import LocaleSwitcher from "./LocaleSwitcher"

/**
 * Header — locale-aware top navigation
 *
 * AE-10 準拠: locale の切替UIは LocaleSwitcher のみが担当。
 * Header は useTranslations 経由でラベルを読むだけで locale を持たない。
 * Link は `@/i18n/routing` 由来を使い、クリック時に自動で /{locale}/… prefix を付与する。
 */
export default function Header() {
  const t = useTranslations("nav")
  const tCta = useTranslations("cta")
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  // 提案ページ（/ja/p/xxx / /en/p/xxx）では Header 非表示
  if (pathname.includes("/p/")) return null

  // ホームは /ja または /en で終わる
  const isHome = pathname === "/" || /^\/(ja|en)\/?$/.test(pathname)

  const transparent = isHome && !scrolled

  const NAV = [
    { href: "/about", label: t("about") },
    { href: "/services", label: t("services") },
    { href: "/faq", label: t("faq") },
    { href: "/blog", label: t("blog") },
  ]

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent
        ? "bg-transparent border-b border-transparent"
        : "bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm"
    }`}>
      {transparent && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      )}
      <div className="relative max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white text-xs font-black shadow-md">P</div>
          <span className={`text-base font-bold transition-colors ${transparent ? "text-white" : "text-slate-900"}`}
            style={transparent ? { textShadow: "0 1px 4px rgba(0,0,0,0.6)" } : {}}>
            Paradigm
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`text-sm font-medium transition-colors ${
                transparent ? "text-white/90 hover:text-white" : "text-slate-500 hover:text-slate-900"
              }`}
              style={transparent ? { textShadow: "0 1px 3px rgba(0,0,0,0.7)" } : {}}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <span className={transparent ? "text-white/90" : "text-slate-700"}>
            <LocaleSwitcher />
          </span>
          <Link href="/contact"
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold flex items-center shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_28px_rgba(139,92,246,0.5)] transition-all">
            {tCta("primary")}
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setOpen(!open)}
          className={`md:hidden transition-colors ${transparent ? "text-white" : "text-slate-700"}`}
          aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b border-gray-50">
              {n.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-slate-700"><LocaleSwitcher /></span>
          </div>
          <Link href="/contact" onClick={() => setOpen(false)}
            className="block mt-3 text-center py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold">
            {tCta("primary")}
          </Link>
        </div>
      )}
    </header>
  )
}
