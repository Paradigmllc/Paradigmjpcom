"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"
import { ArrowRight, Sparkles, TrendingUp, Search, Bot, Globe, CheckCircle, Star, ChevronRight, Zap, Shield, Users } from "lucide-react"

// ── Typing effect hook
function useTypingEffect(words: string[], speed = 80, pause = 2000) {
  const [text, setText] = useState("")
  const [wordIdx, setWordIdx] = useState(0)
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const word = words[wordIdx]
    if (typing) {
      if (text.length < word.length) {
        const t = setTimeout(() => setText(word.slice(0, text.length + 1)), speed)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setTyping(false), pause)
        return () => clearTimeout(t)
      }
    } else {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), speed / 2)
        return () => clearTimeout(t)
      } else {
        setWordIdx((wordIdx + 1) % words.length)
        setTyping(true)
      }
    }
  }, [text, typing, wordIdx, words, speed, pause])

  return text
}

// ── Counter animation
function AnimCounter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const value = useMotionValue(0)
  const spring = useSpring(value, { stiffness: 60, damping: 20 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (inView) value.set(to)
  }, [inView, to, value])
  useEffect(() => spring.on("change", v => setDisplay(Math.round(v))), [spring])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

// ── Stagger variants
const EASE = [0.22, 1, 0.36, 1] as const
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }
const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }

const SERVICES = [
  {
    icon: Globe,
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    title: "ホームページ制作",
    tagline: "集客に強いモダンサイト",
    desc: "レスポンシブ・SEO最適化・CMS付き。制作後の集客もワンストップでサポート。",
    results: "問い合わせ数 +3倍",
    href: "/services/web",
    badge: "最人気",
  },
  {
    icon: Search,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-100",
    title: "MEO対策",
    tagline: "Googleマップで上位表示",
    desc: "口コミ管理・投稿運用・順位改善で近隣検索1位を目指します。",
    results: "来店数 +220%",
    href: "/services/meo",
    badge: null,
  },
  {
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    title: "SEO/GEO対策",
    tagline: "AI検索・Google双方に対応",
    desc: "ChatGPT・Gemini等のAI検索でも推薦される次世代SEO。",
    results: "自然流入 +180%",
    href: "/services/seo",
    badge: "新定番",
  },
  {
    icon: Bot,
    color: "from-orange-500 to-rose-500",
    bg: "bg-orange-50",
    border: "border-orange-100",
    title: "AI導入支援",
    tagline: "業務を自動化・効率化",
    desc: "AIチャットボット・業務自動化・AI広告など導入から運用まで一括対応。",
    results: "業務コスト -45%",
    href: "/services/ai",
    badge: null,
  },
]

const STATS = [
  { to: 200, suffix: "社+", label: "支援実績" },
  { to: 98, suffix: "%", label: "継続率" },
  { to: 3, suffix: "倍", label: "平均集客増加" },
  { to: 15, suffix: "分", label: "初回相談時間" },
]

const FEATURES = [
  { icon: Zap, title: "最短2週間で納品", desc: "スリムなプロセスで高品質・スピード納品。急ぎの案件も対応可能。" },
  { icon: Shield, title: "成果保証プラン", desc: "MEO・SEOは一定期間内に成果が出なければ返金対応。安心してお任せください。" },
  { icon: Users, title: "専任担当が伴走", desc: "担当者が変わらない。月次レポート+定例MTGで継続サポート。" },
  { icon: Sparkles, title: "AI×デジタルの融合", desc: "最新AIツールを活用した次世代集客。競合に差をつける戦略を提供。" },
]

const TESTIMONIALS = [
  { name: "飲食店オーナー", location: "東京都渋谷区", stars: 5, text: "MEO対策を始めて3ヶ月で月30件以上の新規来店。費用対効果が明確で驚きました。" },
  { name: "クリニック院長", location: "大阪府北区", stars: 5, text: "ホームページをリニューアルしてから問い合わせが倍増。AIチャットも好評です。" },
  { name: "EC運営者", location: "愛知県名古屋市", stars: 5, text: "GEO対策でChatGPT検索からの流入が急増。新しい集客チャンネルができました。" },
]

// ── City photo background with Ken Burns zoom (Unsplash CDN allows hotlinking)
function CityPhotoBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Tokyo city night photo — Unsplash CDN is hotlink-friendly */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=85&fit=crop&crop=center"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45, filter: "brightness(1.15) saturate(1.5) contrast(1.05)" }}
        animate={{ scale: [1, 1.07] }}
        transition={{ duration: 14, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      {/* Gradient overlay: lighter at top (show city), darker at center (text area) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/35 via-[#05070d]/70 to-[#05070d]/88" />
    </div>
  )
}

// ── Sakura petals — pure CSS approach (same as proposal page, proven to work)
const SAKURA_CSS = `
@keyframes sakuraFall {
  0%   { transform: translateY(-60px) rotate(0deg) translateX(0px); opacity: 0; }
  8%   { opacity: 1; }
  88%  { opacity: 0.65; }
  100% { transform: translateY(110vh) rotate(540deg) translateX(70px); opacity: 0; }
}
.sakura-petal {
  position: absolute;
  top: -40px;
  animation: sakuraFall linear infinite;
  filter: blur(0.4px);
  user-select: none;
}
`

function SakuraPetals() {
  const petals = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${4 + (i * 4.6) % 90}%`,
      delay: `${(i * 0.42) % 4}s`,
      duration: `${7 + (i * 1.1) % 7}s`,
      fontSize: `${18 + (i * 5) % 16}px`,
      opacity: 0.4 + (i % 3) * 0.15,
    }))
  , [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SAKURA_CSS }} />
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        {petals.map(p => (
          <span
            key={p.id}
            className="sakura-petal"
            style={{
              left: p.left,
              fontSize: p.fontSize,
              opacity: p.opacity,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            🌸
          </span>
        ))}
      </div>
    </>
  )
}

export default function HomeClient() {
  const typingText = useTypingEffect(["MEO対策", "AI活用", "Web制作", "SEO/GEO"], 90, 1800)

  return (
    <div className="overflow-x-hidden">

      {/* ══ Hero ══ */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-[#05070d] overflow-hidden">
        {/* Tokyo city photo with Ken Burns zoom */}
        <CityPhotoBackground />
        {/* Grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-indigo-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            中小企業のデジタルパートナー
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {typingText}
              <span className="inline-block w-0.5 h-[0.85em] bg-violet-400 ml-1 animate-[blink_1s_step-end_infinite] align-middle" />
            </span>
            <br className="hidden sm:block" />
            <span className="text-white">で事業を加速する。</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }}
            className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Web制作・MEO対策・SEO/GEO・AI導入支援。<br className="hidden sm:block" />
            中小企業のデジタル変革をワンストップで支援します。
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-[0_0_32px_rgba(139,92,246,0.4)] hover:shadow-[0_0_48px_rgba(139,92,246,0.6)]">
              無料相談を予約
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/services"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/80 hover:text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-white/5">
              サービスを見る
              <ChevronRight size={16} />
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/3 px-6 py-4 text-center">
                <div className="text-2xl md:text-3xl font-black text-white">
                  <AnimCounter to={s.to} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ Services ══ */}
      <section className="relative py-28 px-6 bg-white overflow-hidden">
        <SakuraPetals />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <p className="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">Services</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
              事業を成長させる<br className="sm:hidden" />4つのサービス
            </h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {SERVICES.map(s => {
              const Icon = s.icon
              return (
                <motion.div key={s.title} variants={item}>
                  <Link href={s.href}
                    className={`group relative block rounded-3xl border ${s.border} ${s.bg} p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                    {s.badge && (
                      <span className={`absolute top-5 right-5 bg-gradient-to-r ${s.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
                        {s.badge}
                      </span>
                    )}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} text-white mb-5 shadow-lg`}>
                      <Icon size={22} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-violet-700 transition-colors">{s.title}</h3>
                    <p className="text-xs font-semibold text-slate-500 mb-3">{s.tagline}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{s.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.results}</span>
                      <span className="text-xs text-slate-400 group-hover:text-violet-500 flex items-center gap-1 transition-colors">
                        詳しく見る <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══ Features ══ */}
      <section className="py-28 px-6 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">Why Paradigm</p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              選ばれる4つの理由
            </h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} variants={item}
                  className="group bg-white/5 border border-white/8 rounded-2xl p-6 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4 group-hover:bg-violet-500/25 transition-colors">
                    <Icon size={18} className="text-violet-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══ Testimonials ══ */}
      <section className="relative py-28 px-6 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <SakuraPetals />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <p className="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900">お客様の声</h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {TESTIMONIALS.map(t => (
              <motion.div key={t.name} variants={item}
                className="bg-white rounded-3xl border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <motion.div className="mt-14 flex flex-wrap items-center justify-center gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            {["実績200社以上", "継続率98%", "導入後3ヶ月無料サポート", "押し売りなし"].map(b => (
              <span key={b} className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-4 py-2 text-xs text-violet-700 font-semibold">
                <CheckCircle size={12} className="text-violet-500" />
                {b}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="relative py-28 px-6 bg-[#05070d] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />

        <motion.div className="relative max-w-3xl mx-auto text-center" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Get Started</p>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-5">
            まずは<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">無料相談</span>から
          </h2>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            15分のオンライン相談。課題をヒアリングし、<br className="hidden sm:block" />
            最適なデジタル戦略を無料でご提案します。
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:shadow-[0_0_60px_rgba(139,92,246,0.7)]">
              無料相談を予約する
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/30">
            <span className="flex items-center gap-1.5"><CheckCircle size={11} /> 完全無料</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={11} /> 営業電話なし</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={11} /> 最短15分</span>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
