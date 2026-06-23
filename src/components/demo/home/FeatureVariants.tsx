"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { DemoFeatureItem } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"

interface Props {
  features: DemoFeatureItem[]
  isJa: boolean
  accent: string
  template?: DemoTemplate["designTokens"]
}

/* ──────────── Feature Grid 3 ──────────── */

export function FeatureGrid3({ features, isJa, accent, template }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="features" className="bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className={`font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "改善のポイント" : "Key Improvements"}
          </h2>
          <p className="mt-3 text-gray-500">{isJa ? "診断レポートに基づく重点領域" : "Focus areas based on the diagnostic report"}</p>
        </motion.div>
        <motion.div ref={ref} className="grid gap-8 md:grid-cols-3" initial="hidden" animate={inView ? "visible" : "hidden"}>
          {features.map((feature, i) => (
            <motion.div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <FeatureIcon name={feature.icon} accent={accent} />
              </div>
              <h3 className={`mb-3 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
              {feature.metricValue && feature.metricValue !== "-" && (
                <div className="mt-4 flex items-end gap-2 border-t border-gray-100 pt-4">
                  <span className="font-display text-2xl font-bold" style={{ color: accent }}>{feature.metricValue}</span>
                  {feature.metricLabel && <span className="text-xs text-gray-400">{feature.metricLabel}</span>}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Feature Grid 2 ──────────── */

export function FeatureGrid2({ features, isJa, accent, template }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className={`font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "改善のポイント" : "Key Improvements"}
          </h2>
        </motion.div>
        <motion.div ref={ref} className="grid gap-8 md:grid-cols-2" initial="hidden" animate={inView ? "visible" : "hidden"}>
          {features.map((feature, i) => (
            <motion.div key={i} className="flex gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <FeatureIcon name={feature.icon} accent={accent} />
              </div>
              <div>
                <h3 className={`mb-2 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
                {feature.metricValue && feature.metricValue !== "-" && (
                  <p className="mt-3 font-display text-2xl font-bold" style={{ color: accent }}>{feature.metricValue}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Feature Cards ──────────── */

export function FeatureCards({ features, isJa, accent, template }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div className="mb-12 text-left"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {isJa ? "改善ポイント" : "Improvements"}
          </p>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "集中的に改善する領域" : "Areas of Focus"}
          </h2>
        </motion.div>
        <motion.div ref={ref} className="grid gap-6 md:grid-cols-3" initial="hidden" animate={inView ? "visible" : "hidden"}>
          {features.map((feature, i) => (
            <motion.div key={i}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2"
              variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, delay: i * 0.1 }}>
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full opacity-10"
                style={{ background: accent }} />
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
                style={{ background: `${accent}15`, boxShadow: `0 4px 14px ${accent}20` }}>
                <FeatureIcon name={feature.icon} accent={accent} />
              </div>
              <h3 className={`mb-3 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Feature Alternating ──────────── */

export function FeatureAlternating({ features, isJa, accent, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className={`font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "改善のポイント" : "Key Improvements"}
          </h2>
        </motion.div>
        <div className="space-y-16">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0
            return (
              <motion.div key={i}
                className={`grid items-center gap-12 md:grid-cols-2 ${isEven ? "" : "md:grid-flow-dense"}`}
                initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className={isEven ? "" : "md:col-start-2"}>
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${accent}10` }}>
                    <FeatureIcon name={feature.icon} accent={accent} />
                  </div>
                  <h3 className={`mb-4 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{feature.title}</h3>
                  <p className="mb-6 text-base leading-relaxed text-gray-500">{feature.description}</p>
                  {feature.metricValue && feature.metricValue !== "-" && (
                    <div className="flex items-center gap-3">
                      <span className="font-display text-3xl font-bold" style={{ color: accent }}>{feature.metricValue}</span>
                      {feature.metricLabel && <span className="text-sm text-gray-400">{feature.metricLabel}</span>}
                    </div>
                  )}
                </div>
                <div className={`hidden md:flex items-center justify-center ${isEven ? "" : "md:col-start-1 md:row-start-1"}`}>
                  <div className="flex h-64 w-full max-w-sm items-center justify-center rounded-2xl"
                    style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}15)` }}>
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl"
                      style={{ background: `${accent}20`, boxShadow: `0 8px 30px ${accent}20` }}>
                      <FeatureIcon name={feature.icon} accent={accent} size="lg" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Feature List ──────────── */

export function FeatureList({ features, isJa, accent, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")

  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div className="mb-12"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {isJa ? "改善領域" : "Improvement Areas"}
          </p>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "改善のポイント" : "Key Improvements"}
          </h2>
        </motion.div>
        <div className="divide-y divide-gray-100">
          {features.map((feature, i) => (
            <motion.div key={i} className="grid gap-6 py-8 first:pt-0 last:pb-0 md:grid-cols-[auto_1fr_auto] md:items-center"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
                <FeatureIcon name={feature.icon} accent={accent} />
              </div>
              <div>
                <h3 className={`font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
              {feature.metricValue && feature.metricValue !== "-" && (
                <div className="text-right">
                  <p className="font-display text-2xl font-bold" style={{ color: accent }}>{feature.metricValue}</p>
                  {feature.metricLabel && <p className="text-xs text-gray-400">{feature.metricLabel}</p>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Icon ──────────── */

function FeatureIcon({ name, accent, size: iconSize = "md" }: { name: string; accent: string; size?: "md" | "lg" }) {
  const wh = iconSize === "lg" ? "h-8 w-8" : "h-6 w-6"
  const strokeW = iconSize === "lg" ? "1.5" : "2"
  const icons: Record<string, React.ReactNode> = {
    sparkles: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW} strokeLinecap="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z" /></svg>,
    shield: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW} strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    route: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW} strokeLinecap="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></svg>,
    globe: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10" /></svg>,
    search: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    cpu: <svg className={wh} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={strokeW}><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /></svg>,
  }
  return icons[name] ?? <FeatureIcon name="sparkles" accent={accent} size={iconSize} />
}
