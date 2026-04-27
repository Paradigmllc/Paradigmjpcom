"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { motion, useInView, useMotionValue, useSpring } from "framer-motion"
import { ArrowRight, Sparkles, TrendingUp, Search, Bot, Globe, CheckCircle, Star, ChevronRight, Zap, Shield, Users } from "lucide-react"

// ── Typing effect hook
function useTypingEffect(words: string[], speed = 80, pause = 2000) {
  const [text, setText] = useState("")
  const [wordIdx, setWordIdx] = useState(0)
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    const word = words[wordIdx]
    if (!word) return
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

// ── Service definitions（visual only — text は messages から取得）
const SERVICE_DEFS = [
  { key: "web", icon: Globe, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", border: "border-violet-100", href: "/services/web" },
  { key: "meo", icon: Search, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", border: "border-blue-100", href: "/services/meo" },
  { key: "seo", icon: TrendingUp, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", border: "border-emerald-100", href: "/services/seo" },
  { key: "ai", icon: Bot, color: "from-orange-500 to-rose-500", bg: "bg-orange-50", border: "border-orange-100", href: "/services/ai" },
] as const

const STAT_DEFS = [
  { key: "support", to: 200 },
  { key: "retention", to: 98 },
  { key: "growth", to: 3 },
  { key: "consult", to: 15 },
] as const

const FEATURE_DEFS = [
  { key: "speed", icon: Zap },
  { key: "guarantee", icon: Shield },
  { key: "team", icon: Users },
  { key: "aiFusion", icon: Sparkles },
] as const

const TESTIMONIAL_KEYS = ["1", "2", "3"] as const
const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const
const CTA_BULLET_KEYS = ["1", "2", "3"] as const

// ── City photo background with Ken Burns zoom (Unsplash CDN allows hotlinking)
function CityPhotoBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=85&fit=crop&crop=center"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45, filter: "brightness(1.15) saturate(1.5) contrast(1.05)" }}
        animate={{ scale: [1, 1.07] }}
        transition={{ duration: 14, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/35 via-[#05070d]/70 to-[#05070d]/88" />
    </div>
  )
}

// ── Sakura petals — pure CSS approach
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
  const t = useTranslations("home")

  // Typing words: t.raw() で配列を取得（next-intl v4）
  const typingWords = (t.raw("heroTypingWords") as string[]) ?? ["MEO対策"]
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <div className="overflow-x-hidden">

      {/* ══ Hero ══ */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-[#05070d] overflow-hidden">
        <CityPhotoBackground />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-indigo-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t("heroBadge")}
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {typingText}
              <span className="inline-block w-0.5 h-[0.85em] bg-violet-400 ml-1 animate-[blink_1s_step-end_infinite] align-middle" />
            </span>
            <br className="hidden sm:block" />
            <span className="text-white">{t("heroSuffix")}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }}
            className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("heroSubheadline")}
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
            className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-[0_0_32px_rgba(139,92,246,0.4)] hover:shadow-[0_0_48px_rgba(139,92,246,0.6)]">
              {t("heroBookConsult")}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/services"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/80 hover:text-white px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-white/5">
              {t("heroSeeServices")}
              <ChevronRight size={16} />
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
            {STAT_DEFS.map(s => (
              <div key={s.key} className="bg-white/3 px-6 py-4 text-center">
                <div className="text-2xl md:text-3xl font-black text-white">
                  <AnimCounter to={s.to} suffix={t(`stats.${s.key}.suffix`)} />
                </div>
                <div className="text-xs text-white/40 mt-0.5">{t(`stats.${s.key}.label`)}</div>
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
            <p className="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">{t("servicesEyebrow")}</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
              {t("servicesHeading")}
            </h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {SERVICE_DEFS.map(s => {
              const Icon = s.icon
              const badge = t(`services.${s.key}.badge`)
              return (
                <motion.div key={s.key} variants={item}>
                  <Link href={s.href}
                    className={`group relative block rounded-3xl border ${s.border} ${s.bg} p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}>
                    {badge && (
                      <span className={`absolute top-5 right-5 bg-gradient-to-r ${s.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
                        {badge}
                      </span>
                    )}
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} text-white mb-5 shadow-lg`}>
                      <Icon size={22} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-violet-700 transition-colors">{t(`services.${s.key}.title`)}</h3>
                    <p className="text-xs font-semibold text-slate-500 mb-3">{t(`services.${s.key}.tagline`)}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{t(`services.${s.key}.desc`)}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{t(`services.${s.key}.results`)}</span>
                      <span className="text-xs text-slate-400 group-hover:text-violet-500 flex items-center gap-1 transition-colors">
                        {t("servicesViewMore")} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
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
            <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">{t("featuresEyebrow")}</p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              {t("featuresHeading")}
            </h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {FEATURE_DEFS.map(f => {
              const Icon = f.icon
              return (
                <motion.div key={f.key} variants={item}
                  className="group bg-white/5 border border-white/8 rounded-2xl p-6 hover:bg-white/8 hover:border-violet-500/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4 group-hover:bg-violet-500/25 transition-colors">
                    <Icon size={18} className="text-violet-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{t(`features.${f.key}.title`)}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{t(`features.${f.key}.desc`)}</p>
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
            <p className="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase mb-3">{t("testimonialsEyebrow")}</p>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900">{t("testimonialsHeading")}</h2>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={container}>
            {TESTIMONIAL_KEYS.map(k => {
              const name = t(`testimonials.${k}.name`)
              return (
                <motion.div key={k} variants={item}
                  className="bg-white rounded-3xl border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-5">&ldquo;{t(`testimonials.${k}.text`)}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{name}</p>
                      <p className="text-[10px] text-slate-400">{t(`testimonials.${k}.location`)}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Trust badges */}
          <motion.div className="mt-14 flex flex-wrap items-center justify-center gap-4" initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            {TRUST_BADGE_KEYS.map(k => (
              <span key={k} className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-4 py-2 text-xs text-violet-700 font-semibold">
                <CheckCircle size={12} className="text-violet-500" />
                {t(`trustBadges.${k}`)}
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
          <p className="text-violet-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">{t("ctaEyebrow")}</p>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-5">
            {t("ctaHeading")}<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">{t("ctaHeadingHighlight")}</span>{t("ctaHeadingSuffix")}
          </h2>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            {t("ctaSubheading")}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/contact"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:shadow-[0_0_60px_rgba(139,92,246,0.7)]">
              {t("ctaButton")}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/30">
            {CTA_BULLET_KEYS.map(k => (
              <span key={k} className="flex items-center gap-1.5"><CheckCircle size={11} /> {t(`ctaBullets.${k}`)}</span>
            ))}
          </div>
        </motion.div>
      </section>

    </div>
  )
}
