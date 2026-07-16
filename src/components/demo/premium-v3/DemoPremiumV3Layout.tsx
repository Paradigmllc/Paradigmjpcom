"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState, type CSSProperties } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { FaFacebookF, FaInstagram, FaLine, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6"
import type { DemoBrandSystem, DemoMeta, DemoPremiumExperience, DemoQualityReport } from "@/lib/sales/demo-site-types"
import { PremiumV3Magnetic, PremiumV3ScrollProgress } from "./PremiumV3Motion"
import { PremiumV3BrandMark } from "./PremiumV3BrandMark"

interface NavLink { label: string; href: string }
type DemoStyle = CSSProperties & Record<`--demo-${string}`, string | number>

export function DemoPremiumV3Layout({
  navLinks,
  basePath,
  companyName,
  accent,
  brand,
  presentation,
  social = [],
  privatePreview,
  children,
}: {
  navLinks: NavLink[]
  basePath: string
  companyName: string
  accent: string
  brand: DemoBrandSystem
  quality?: DemoQualityReport
  presentation?: Pick<DemoMeta, "proposalNotice" | "primaryCtaLabel" | "primaryCtaHref" | "footerDescription" | "footerOwner" | "brandLogoUrl">
  social?: DemoPremiumExperience["social"]
  privatePreview?: { expiresAt: string; assetStatus: "unreviewed" | "private_proposal" | "consented" | "blocked" }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const ctaHref = presentation?.primaryCtaHref ?? `${basePath}/contact`
  const ctaLabel = presentation?.primaryCtaLabel ?? "お問い合わせ"
  const isExternalCta = /^https?:\/\//u.test(ctaHref)
  const isInstagram = /instagram\.com/iu.test(ctaHref)
  const styles: DemoStyle = {
    "--demo-accent": accent,
    "--demo-font-display": brand.displayFont,
    "--demo-font-body": brand.bodyFont,
    "--demo-heading-weight": brand.headingWeight,
    "--demo-surface": brand.surface,
    "--demo-surface-alt": brand.surfaceAlt,
    "--demo-ink": brand.ink,
    "--demo-muted": brand.muted,
    "--demo-line": brand.line,
    fontFamily: brand.bodyFont,
  }

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])
  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 420)
    return () => window.clearTimeout(timer)
  }, [])

  const isActive = (href: string) => pathname === href || (href !== basePath && pathname.startsWith(href))

  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1] }}>
    <div className="demo-v3-shell min-h-dvh bg-[var(--demo-surface)] text-[var(--demo-ink)] antialiased" style={styles} data-demo-site="premium-v3" data-brand-system={brand.id}>
      <PremiumV3ScrollProgress />
      <AnimatePresence>
        {isLoading && <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="fixed inset-0 z-[80] grid place-items-center bg-[var(--demo-surface)]" role="status" aria-live="polite" aria-label={`${companyName}を読み込み中`}>
          <div className="flex flex-col items-center gap-5">
            <PremiumV3BrandMark accent={accent} label={`${companyName} ロゴ`} />
            <div className="h-px w-28 overflow-hidden bg-[var(--demo-line)]"><motion.span className="block h-full origin-left bg-[var(--demo-accent)]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} /></div>
            <p className="text-[9px] font-bold uppercase tracking-[.34em] text-[var(--demo-muted)]">{companyName}</p>
          </div>
        </motion.div>}
      </AnimatePresence>
      <motion.nav initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.8 }} className={`sticky top-0 z-50 border-b border-[var(--demo-line)] bg-[color:var(--demo-surface)]/88 backdrop-blur-xl transition-[box-shadow,background-color] duration-500 ${isScrolled ? "shadow-[0_16px_40px_-28px_var(--demo-ink)] bg-[color:var(--demo-surface)]/96" : ""}`} aria-label="メインナビゲーション">
        <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-10 xl:px-14">
          <motion.a href={basePath} whileHover={{ x: 3 }} className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-[22rem]" aria-label={`${companyName} ホーム`}>
            {presentation?.brandLogoUrl ? (
              <span className="relative h-11 w-16 overflow-hidden bg-white/75 p-1"><Image src={presentation.brandLogoUrl} alt={`${companyName} ロゴ`} fill unoptimized className="object-contain p-1" /></span>
            ) : (
              <PremiumV3BrandMark accent={accent} label={`${companyName} ロゴ`} />
            )}
            <span className="truncate text-lg font-[var(--demo-heading-weight)] tracking-[-.02em] sm:text-xl [font-family:var(--demo-font-display)]">{companyName}</span>
          </motion.a>
          <div className="hidden shrink-0 items-center gap-6 xl:flex">
            {navLinks.map((link) => <a key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`relative py-2 text-xs font-bold tracking-[.08em] transition ${isActive(link.href) ? "text-[var(--demo-ink)]" : "text-[var(--demo-muted)] hover:text-[var(--demo-ink)]"}`}>{link.label}{isActive(link.href) && <motion.span layoutId="premium-v3-active-nav" className="absolute inset-x-0 -bottom-1 h-px bg-[var(--demo-accent)]" transition={{ duration: 0.35 }} />}</a>)}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PremiumV3Magnetic className="hidden md:inline-block">
              <a href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex min-h-11 items-center gap-2 bg-[var(--demo-ink)] px-5 text-xs font-bold text-white transition-colors hover:bg-[var(--demo-accent)]">{isInstagram && <FaInstagram className="h-4 w-4" aria-hidden="true" />}{ctaLabel}<ArrowUpRight className="h-4 w-4" /></a>
            </PremiumV3Magnetic>
            <button type="button" aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid h-11 w-11 place-items-center border border-[var(--demo-line)] xl:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </motion.nav>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }} exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.55 }} className="fixed inset-x-0 bottom-0 top-[79px] z-40 overflow-y-auto bg-[var(--demo-ink)] px-5 py-10 text-white sm:px-10">
            <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } }} className="mx-auto max-w-2xl">{navLinks.map((link, index) => <motion.a variants={{ hidden: { opacity: 0, x: -22 }, visible: { opacity: 1, x: 0 } }} key={link.href} href={link.href} className="flex items-center justify-between border-b border-white/15 py-5 text-3xl [font-family:var(--demo-font-display)]">{link.label}<span className="text-xs text-white/35">0{index + 1}</span></motion.a>)}<motion.a variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }} href={ctaHref} {...(isExternalCta ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 bg-white px-6 text-sm font-bold text-black">{isInstagram && <FaInstagram />}{ctaLabel}<ArrowUpRight className="h-4 w-4" /></motion.a></motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.main key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55 }}>{children}</motion.main>
      <footer className="bg-[var(--demo-ink)] px-5 py-16 text-white sm:px-10 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-12 border-b border-white/15 pb-14 lg:grid-cols-[1.2fr_.8fr_.8fr]">
            <div><div className="flex items-center gap-4"><PremiumV3BrandMark accent={accent} label={`${companyName} ロゴ`} /><p className="text-4xl tracking-[-.03em] sm:text-5xl [font-family:var(--demo-font-display)]">{companyName}</p></div><p className="mt-6 max-w-lg text-sm leading-7 text-white/58">{presentation?.footerDescription ?? `${companyName}の事業・サービスをご紹介します。`}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-white/35">Pages</p><div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">{navLinks.map((link) => <a key={link.href} href={link.href} className="text-sm text-white/68 transition hover:text-white">{link.label}</a>)}</div></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-white/35">Information</p><div className="mt-5 grid gap-3 text-sm text-white/68"><a href={`${basePath}/news`}>お知らせ</a><a href={`${basePath}/recruit`}>採用情報</a><a href={`${basePath}/privacy`}>プライバシーポリシー</a><a href={`${basePath}/terms`}>利用条件</a><a href={`${basePath}/commerce`}>特定商取引法に基づく表記</a></div>{social.length > 0 && <div className="mt-7 flex flex-wrap gap-2">{social.map((item) => <a key={`${item.network}-${item.href}`} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.label}を開く`} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white/70 transition hover:border-white hover:bg-white hover:text-black">{socialIcon(item.network)}</a>)}</div>}</div>
          </div>
          <div className="flex flex-col gap-3 pt-7 text-[10px] tracking-[.08em] text-white/38 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} {presentation?.footerOwner ?? companyName}</p><p>{privatePreview ? "Concept preview" : ""}</p></div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  )
}

function socialIcon(network: DemoPremiumExperience["social"][number]["network"]) {
  if (network === "instagram") return <FaInstagram aria-hidden="true" />
  if (network === "facebook") return <FaFacebookF aria-hidden="true" />
  if (network === "youtube") return <FaYoutube aria-hidden="true" />
  if (network === "tiktok") return <FaTiktok aria-hidden="true" />
  if (network === "x") return <FaXTwitter aria-hidden="true" />
  return <FaLine aria-hidden="true" />
}
