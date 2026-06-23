"use client"

import { motion } from "framer-motion"
import type { DemoAboutPage } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"

/* ──────────── Story (Default) ──────────── */

export function StoryDefault({
  about, isJa, accent, template,
}: { about: DemoAboutPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div className="mb-10"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {isJa ? "私たちのストーリー" : "Our Story"}
          </span>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? `${about.companyName}の歩み` : `The ${about.companyName} journey`}
          </h2>
        </motion.div>
        <div className="prose prose-gray max-w-none">
          <p className="text-lg leading-relaxed text-gray-600">{about.story}</p>
        </div>
      </div>
    </section>
  )
}

/* ──────────── Mission Bold ──────────── */

export function MissionBold({
  about, isJa, accent, template,
}: { about: DemoAboutPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-gray-900 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {isJa ? "ミッション" : "Mission"}
          </span>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-white`}>
            {isJa ? "私たちの使命" : "Our Mission"}
          </h2>
          <div
            className="relative mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 p-8"
            style={{ background: `${accent}10` }}
          >
            <p className="text-xl font-light leading-relaxed text-white/80 italic">"{about.mission}"</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Values Grid ──────────── */

export function ValuesGrid({
  about, isJa, accent, template,
}: { about: DemoAboutPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {isJa ? "バリュー" : "Values"}
          </span>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "大切にしていること" : "What We Stand For"}
          </h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2">
          {about.values.map((v, i) => (
            <motion.div key={i}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <ValueIcon name={v.icon} accent={accent} />
              </div>
              <h3 className={`mb-2 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{v.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{v.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Team ──────────── */

export function TeamNote({
  about, isJa, accent,
}: { about: DemoAboutPage; isJa: boolean; accent: string }) {
  return (
    <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p className="text-lg leading-relaxed text-gray-600"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          {about.teamNote}
        </motion.p>
      </div>
    </section>
  )
}

/* ──────────── Timeline ──────────── */

export function Timeline({
  about, isJa, accent,
}: { about: DemoAboutPage; isJa: boolean; accent: string }) {
  const milestones = [
    { year: "2015", labelJa: "創業", labelEn: "Founded" },
    { year: "2018", labelJa: "事業拡大", labelEn: "Expansion" },
    { year: "2021", labelJa: "デジタル化推進", labelEn: "Digital Push" },
    { year: "2024", labelJa: "Web刷新", labelEn: "Web Renewal" },
  ]
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
            {isJa ? `${about.companyName}の歩み` : `${about.companyName} Timeline`}
          </h2>
        </motion.div>
        <div className="relative">
          <div className="absolute left-6 top-0 h-full w-0.5 bg-gray-200" />
          <div className="space-y-10">
            {milestones.map((m, i) => (
              <motion.div key={i} className="relative flex items-start gap-8"
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.1 }}>
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: accent }}>
                  {m.year.slice(2)}
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">{isJa ? m.labelJa : m.labelEn}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────── Icons ──────────── */

function ValueIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    star: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    lightbulb: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14" /></svg>,
    users: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>,
    globe: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
  }
  return icons[name] ?? <ValueIcon name="star" accent={accent} />
}
