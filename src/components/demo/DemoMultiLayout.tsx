"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { navClasses, type NavStyle } from "@/lib/sales/demo-templates/registry"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import type { DemoDesignRecipe, DemoMeta, DemoQualityReport } from "@/lib/sales/demo-site-types"
import { JAPAN_ENTRY_CTA_EN, JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"

interface NavLink {
  label: string
  href: string
}

interface Props {
  navLinks: NavLink[]
  basePath: string
  isJa: boolean
  companyName: string
  /** Template ID for navigation style */
  templateId?: string
  /** Design tokens for accent colors */
  accentColor?: string
  designRecipe?: DemoDesignRecipe
  quality?: DemoQualityReport
  presentation?: Pick<DemoMeta, "proposalNotice" | "primaryCtaLabel" | "primaryCtaHref" | "footerDescription" | "footerOwner">
  children: React.ReactNode
}

export function DemoMultiLayout({
  navLinks,
  basePath,
  isJa,
  companyName,
  templateId,
  accentColor,
  designRecipe,
  quality,
  presentation,
  children,
}: Props) {
  const pathname = usePathname()
  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath
    return pathname.startsWith(href)
  }

  // Map template to nav style
  const navStyleMap: Record<string, NavStyle> = {
    zenith: "sticky",
    aether: "transparent",
    prism: "bordered",
    terra: "sticky",
    flux: "transparent",
    vertex: "bordered",
    nomad: "minimal",
    apex: "transparent",
  }
  const navStyle: NavStyle = templateId ? navStyleMap[templateId] ?? "sticky" : "sticky"
  const nc = navClasses(navStyle)
  const accent = accentColor || "#2563eb"

  // Extract initials
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || companyName.slice(0, 1).toUpperCase()

  const ctaText = presentation?.primaryCtaLabel ?? (isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN)
  const ctaHref = presentation?.primaryCtaHref ?? `${basePath}/contact`
  const footerCTA = `${ctaText} →`
  const footerContactLabel = isJa ? "お問い合わせ" : "Contact"
  const footerPagesLabel = isJa ? "ページ" : "Pages"
  const footerDescription = presentation?.footerDescription ?? (isJa
    ? "診断データから自動生成されました。改善後のWebサイトのイメージです。"
    : "Generated from diagnostic data. This is a demonstration of what an improved website could look like.")
  const proposalNotice = presentation?.proposalNotice ?? (isJa
    ? "提案用デモサイト（公式サイトではありません）"
    : "Proposal demo — not the company’s official website")
  const footerOwner = presentation?.footerOwner ?? "Paradigm LLC"

  // Dark theme for flux
  const isDarkNav = templateId === "flux"
  const isTransparent = navStyle === "transparent"

  return (
    <div
      className={`flex min-h-dvh flex-col antialiased ${isDarkNav ? "bg-gray-950 text-white" : "bg-white text-gray-900"}`}
      data-composition={designRecipe?.compositionVariant}
      data-motion={designRecipe?.motionVariant}
      style={{ "--demo-accent": accent } as React.CSSProperties}
    >
      <div className={`border-b px-4 py-2 text-center text-xs font-medium ${isDarkNav ? "border-white/10 bg-gray-950 text-white/70" : "border-blue-100 bg-blue-50 text-blue-900"}`}>
        {proposalNotice}
        {quality?.passed ? ` · Quality ${quality.score}/100` : ""}
      </div>
      {/* Nav */}
      <nav className={nc.wrapper} style={isDarkNav ? { background: "rgba(17,24,39,0.95)" } : {}}>
        <div className={`${nc.inner} ${templateId === "apex" ? "max-w-4xl" : templateId === "terra" ? "max-w-7xl" : "max-w-6xl"}`}>
          <a href={basePath}
            className={`flex items-center gap-2.5 font-display text-lg font-bold transition-colors group ${isDarkNav ? "text-white hover:text-white/80" : "text-gray-900 hover:text-[var(--demo-accent,#2563eb)]"}`}
          >
            <motion.div
              className={`flex h-10 w-10 items-center justify-center text-sm font-bold text-white shadow-sm ${navStyle === "bordered" ? "h-11 w-11 rounded-lg" : "rounded-xl"}`}
              style={{ background: "var(--demo-accent, #2563eb)" }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {initials}
            </motion.div>
            <span className="hidden sm:inline">{companyName}</span>
          </a>

          <div className="hidden gap-1 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 transition-colors ${
                  isActive(link.href)
                    ? isDarkNav
                      ? "bg-white/10 text-white"
                      : "bg-[var(--demo-accent,#2563eb)]/10 text-[var(--demo-accent,#2563eb)]"
                    : isDarkNav
                      ? "text-white/60 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 ${
              templateId === "apex" ? "rounded-full" : ""
            }`}
            style={{ background: "var(--demo-accent, #2563eb)" }}
          >
            {ctaText} <ArrowIcon />
          </a>
        </div>

        {/* Mobile nav */}
        <div className={`flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden ${isDarkNav ? "border-white/10" : "border-gray-100"}`}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive(link.href)
                  ? isDarkNav
                    ? "bg-white/10 text-white"
                    : "bg-[var(--demo-accent,#2563eb)]/10 text-[var(--demo-accent,#2563eb)]"
                  : isDarkNav
                    ? "text-white/50 hover:bg-white/10 hover:text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className={`border-t ${isDarkNav ? "border-white/10 bg-gray-950" : "border-gray-100 bg-gray-50"}`}>
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
                <span className="font-display text-base font-semibold">{companyName}</span>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkNav ? "text-white/50" : "text-gray-500"}`}>
                {footerDescription}
              </p>
            </div>
            <div>
              <h4 className={`mb-3 font-display text-sm font-semibold ${isDarkNav ? "text-white" : "text-gray-900"}`}>
                {footerPagesLabel}
              </h4>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}
                      className={`transition-colors ${isDarkNav ? "text-white/50 hover:text-[var(--demo-accent,#2563eb)]" : "text-gray-500 hover:text-[var(--demo-accent,#2563eb)]"}`}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`mb-3 font-display text-sm font-semibold ${isDarkNav ? "text-white" : "text-gray-900"}`}>
                {footerContactLabel}
              </h4>
              <p className={`text-sm leading-relaxed ${isDarkNav ? "text-white/50" : "text-gray-500"}`}>
                {footerDescription}
              </p>
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "var(--demo-accent, #2563eb)" }}
              >
                {footerCTA}
              </a>
            </div>
          </div>
          <div className={`mt-10 border-t pt-6 text-center text-xs ${isDarkNav ? "border-white/10 text-white/30" : "border-gray-200 text-gray-400"}`}>
            {isJa
              ? `© ${new Date().getFullYear()} ${footerOwner} — 提案用デモサイトです。`
              : `© ${new Date().getFullYear()} ${footerOwner} — Proposal demo.`}
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
              <a href={`${basePath}/news`} className="hover:text-[var(--demo-accent)]">{isJa ? "お知らせ" : "News"}</a>
              <a href={`${basePath}/recruit`} className="hover:text-[var(--demo-accent)]">{isJa ? "採用情報" : "Careers"}</a>
              <a href={`${basePath}/privacy`} className="hover:text-[var(--demo-accent)]">{isJa ? "プライバシー" : "Privacy"}</a>
              <a href={`${basePath}/terms`} className="hover:text-[var(--demo-accent)]">{isJa ? "利用条件" : "Terms"}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
