"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X, ArrowUpRight } from "lucide-react"
import { FaInstagram } from "react-icons/fa6"
import type { DemoMeta, DemoQualityReport } from "@/lib/sales/demo-site-types"

interface NavLink { label: string; href: string }

export function DemoPremiumV2Layout({
  navLinks,
  basePath,
  companyName,
  accent,
  presentation,
  privatePreview,
  children,
}: {
  navLinks: NavLink[]
  basePath: string
  companyName: string
  accent: string
  quality?: DemoQualityReport
  presentation?: Pick<DemoMeta, "proposalNotice" | "primaryCtaLabel" | "primaryCtaHref" | "footerDescription" | "footerOwner" | "brandLogoUrl">
  privatePreview?: { expiresAt: string; assetStatus: "unreviewed" | "private_proposal" | "consented" | "blocked" }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const ctaHref = presentation?.primaryCtaHref ?? `${basePath}/contact`
  const ctaLabel = presentation?.primaryCtaLabel ?? "お問い合わせ"
  const isExternalCta = /^https?:\/\//.test(ctaHref)
  const isInstagram = /instagram\.com/i.test(ctaHref)

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  const isActive = (href: string) => pathname === href || (href !== basePath && pathname.startsWith(href))

  return (
    <div className="min-h-dvh bg-[#f4f1e9] text-[#171713] antialiased" style={{ "--demo-accent": accent } as React.CSSProperties}>
      {privatePreview && (
        <div className="border-b border-black/10 bg-[#e8dfcf] px-4 py-2 text-center text-[10px] font-semibold tracking-[.1em] text-black/65 sm:text-xs">
          非公開プレビュー · 公式サイトではありません · {new Date(privatePreview.expiresAt).toLocaleDateString("ja-JP")}まで
        </div>
      )}
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f4f1e9]/92 backdrop-blur-xl" aria-label="メインナビゲーション">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-5 sm:px-10 lg:px-16">
          <a href={basePath} className="flex min-w-0 items-center gap-3" aria-label={`${companyName} ホーム`}>
            {presentation?.brandLogoUrl ? (
              <span className="relative h-11 w-16 overflow-hidden bg-white/70 p-1.5">
                <Image src={presentation.brandLogoUrl} alt={`${companyName} ロゴ`} fill unoptimized className="object-contain p-1.5" />
              </span>
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white" style={{ background: accent }}>{companyName.slice(0, 1)}</span>
            )}
            <span className="truncate font-premium-serif text-lg font-semibold tracking-[-.02em] sm:text-xl">{companyName}</span>
          </a>
          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`relative py-2 text-xs font-bold tracking-[.08em] transition ${isActive(link.href) ? "text-black" : "text-black/48 hover:text-black"}`}>
                {link.label}
                {isActive(link.href) && <span className="absolute inset-x-0 -bottom-1 h-px bg-[var(--demo-accent)]" />}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="hidden min-h-11 items-center gap-2 bg-black px-5 text-xs font-bold text-white transition hover:bg-[var(--demo-accent)] sm:inline-flex">
              {isInstagram && <FaInstagram className="h-4 w-4" aria-hidden="true" />}{ctaLabel}<ArrowUpRight className="h-4 w-4" />
            </a>
            <button type="button" aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-11 w-11 place-items-center border border-black/15 lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className={`fixed inset-x-0 bottom-0 z-40 overflow-y-auto bg-[#171713] px-5 py-10 text-white sm:px-10 ${privatePreview ? "top-[109px]" : "top-[77px]"}`}>
          <div className="mx-auto max-w-2xl">
            {navLinks.map((link, index) => (
              <a key={link.href} href={link.href} className="flex items-center justify-between border-b border-white/15 py-5 font-premium-serif text-3xl">
                {link.label}<span className="text-xs text-white/35">0{index + 1}</span>
              </a>
            ))}
            <a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-white px-6 text-sm font-bold text-black">
              {isInstagram && <FaInstagram />}{ctaLabel}<ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <main>{children}</main>

      <footer className="bg-[#171713] px-5 py-16 text-white sm:px-10 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-12 border-b border-white/15 pb-14 lg:grid-cols-[1.2fr_.8fr_.8fr]">
            <div>
              <p className="font-premium-serif text-4xl tracking-[-.04em] sm:text-5xl">{companyName}</p>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/55">{presentation?.footerDescription}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.28em] text-white/35">Pages</p>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
                {navLinks.map((link) => <a key={link.href} href={link.href} className="text-sm text-white/65 transition hover:text-white">{link.label}</a>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.28em] text-white/35">Information</p>
              <div className="mt-5 grid gap-3 text-sm text-white/65">
                <a href={`${basePath}/news`}>お知らせ</a>
                <a href={`${basePath}/recruit`}>採用情報</a>
                <a href={`${basePath}/privacy`}>プライバシーポリシー</a>
                <a href={`${basePath}/terms`}>利用条件</a>
                <a href={`${basePath}/commerce`}>特定商取引法に基づく表記</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-[10px] tracking-[.08em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {presentation?.footerOwner ?? companyName}</p>
            <p>{privatePreview ? "非公開提案用プレビュー" : "Official website"}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
