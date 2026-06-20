"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowUp, Share2 } from "lucide-react"

// ─── Reading Progress Bar ────────────────────────────────────
export function ReadingProgress({ isDark }: { isDark?: boolean }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0)
    }
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  return (
    <div className="fixed top-0 left-0 z-50 h-0.5 w-full">
      <div
        className={`h-full transition-[width] duration-100 ease-linear ${isDark ? "bg-violet-400" : "bg-violet-600"}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// ─── Back to Top Button ──────────────────────────────────────
export function BackToTop({ isDark }: { isDark?: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 800)
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [])

  if (!visible) return null

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`fixed bottom-24 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors ${
        isDark ? "bg-zinc-700 text-zinc-200 hover:bg-zinc-600" : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
      }`}
    >
      <ArrowUp className="h-4 w-4" />
    </motion.button>
  )
}

// ─── Section Table of Contents ───────────────────────────────
export function TableOfContents({ sections, lang, isDark }: {
  sections: { id: string; label: string }[]
  lang: string
  isDark?: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px" }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  if (sections.length < 3) return null

  return (
    <nav className={`hidden xl:block fixed left-8 top-32 z-20 max-w-[180px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
      <div className="text-[10px] font-bold uppercase mb-2 opacity-50">{lang === "ja" ? "目次" : "Contents"}</div>
      <ul className="space-y-1">
        {sections.map(s => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={e => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }) }}
              className={`block text-[11px] leading-relaxed transition-colors hover:opacity-100 ${
                activeId === s.id
                  ? (isDark ? "text-white font-bold" : "text-zinc-900 font-bold")
                  : "opacity-50"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── Share Button ────────────────────────────────────────────
export function ShareReport({ url, title, lang, isDark }: {
  url: string
  title: string
  lang: string
  isDark?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={share}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
        isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <Share2 className="h-3 w-3" />
      {copied ? (lang === "ja" ? "コピー完了" : "Copied!") : (lang === "ja" ? "共有" : "Share")}
    </button>
  )
}

// ─── Term Tooltip ────────────────────────────────────────────
export function TermTooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const glossary: Record<string, { ja: string; en: string }> = {
    "PageSpeed": { ja: "Googleが提供するWebサイト表示速度の測定ツール。100点満点。", en: "Google's website speed measurement tool. Scored out of 100." },
    "SSL": { ja: "通信を暗号化する仕組み。A+が最高グレード。", en: "Encryption protocol for secure communication. A+ is the highest grade." },
    "OGP": { ja: "SNSでURLを共有した時のプレビュー表示設定。", en: "Preview display settings when sharing URLs on social media." },
    "HSTS": { ja: "ブラウザにHTTPS接続を強制するセキュリティ設定。", en: "Security setting forcing browsers to use HTTPS." },
    "MEO": { ja: "Googleマップでの表示順位を最適化する施策。", en: "Optimization to improve Google Maps ranking." },
    "CMS": { ja: "Webサイトのコンテンツ管理システム。WordPressなど。", en: "Content Management System. e.g. WordPress." },
    "CDN": { ja: "世界中のサーバーからコンテンツを高速配信する仕組み。", en: "Network that delivers content quickly from servers worldwide." },
    "CSP": { ja: "不正なスクリプト実行を防ぐセキュリティヘッダー。", en: "Security header preventing unauthorized script execution." },
    "DMARC": { ja: "なりすましメールを防ぐメール認証技術。", en: "Email authentication preventing spoofing." },
  }

  const def = glossary[term]

  return (
    <span className="group relative cursor-help border-b border-dotted border-zinc-400">
      {children}
      {def && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 rounded-lg bg-zinc-900 px-3 py-2 text-[10px] leading-relaxed text-white shadow-lg z-50">
          {def.ja}
        </span>
      )}
    </span>
  )
}
