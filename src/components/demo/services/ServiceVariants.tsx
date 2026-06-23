"use client"

import { motion } from "framer-motion"
import type { DemoServicesPage } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"

/* ──────────── Service Cards: Detailed ──────────── */

export function ServiceCardsDetailed({
  services, isJa, accent, template,
}: { services: DemoServicesPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-3">
          {services.services.map((svc, i) => (
            <motion.div key={i}
              className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${accent}10` }}>
                <ServiceIcon name={svc.icon} accent={accent} />
              </div>
              <h3 className={`mb-3 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>{svc.title}</h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-500">{svc.description}</p>
              <ul className="mb-5 space-y-2.5 border-t border-gray-100 pt-5">
                {svc.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
              {svc.priceNote && (
                <div className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold" style={{ background: `${accent}08`, color: accent }}>
                  {svc.priceNote}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Service Cards: Minimal ──────────── */

export function ServiceCardsMinimal({
  services, isJa, accent, template,
}: { services: DemoServicesPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 lg:grid-cols-3">
          {services.services.map((svc, i) => (
            <motion.div key={i}
              className="rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:shadow-sm"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}>
              <h3 className={`font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{svc.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-3">{svc.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {svc.features.slice(0, 3).map((feat, j) => (
                  <span key={j} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">{feat}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Service Cards: Icon-Led ──────────── */

export function ServiceCardsIconLed({
  services, accent, template,
}: { services: DemoServicesPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-3">
          {services.services.map((svc, i) => (
            <motion.div key={i} className="text-center"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.1 }}>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
                style={{ background: `${accent}10`, boxShadow: `0 4px 14px ${accent}15` }}>
                <ServiceIcon name={svc.icon} accent={accent} />
              </div>
              <h3 className={`mb-2 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{svc.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{svc.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Service Cards: Image-Led ──────────── */

export function ServiceCardsImageLed({
  services, isJa, accent, template,
}: { services: DemoServicesPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.services.map((svc, i) => (
            <motion.div key={i} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white"
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}>
              <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50"
                style={{ background: `linear-gradient(135deg, ${accent}08, ${accent}15)` }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                  <ServiceIcon name={svc.icon} accent={accent} />
                </div>
              </div>
              <div className="p-5">
                <h3 className={`mb-2 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>{svc.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">{svc.description}</p>
                <ul className="space-y-2">
                  {svc.features.slice(0, 3).map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-500">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────── Process Timeline ──────────── */

export function ProcessTimeline({
  services, isJa, accent, template,
}: { services: DemoServicesPage; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="border-t border-gray-100 bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {isJa ? "プロセス" : "Process"}
          </span>
          <h2 className={`mt-2 font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            {isJa ? "ご依頼から実装までの流れ" : "From Inquiry to Implementation"}
          </h2>
        </motion.div>
        <div className="relative">
          <div className="absolute left-6 top-0 h-full w-0.5 bg-gray-200 md:left-1/2 md:-translate-x-px" />
          <div className="space-y-12">
            {services.process.map((step, i) => (
              <div key={step.step} className={`relative flex gap-8 md:gap-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm md:absolute md:left-1/2 md:-translate-x-1/2"
                  style={{ background: accent }}>
                  <span className="font-display text-lg font-bold text-white">{step.step}</span>
                </div>
                <div className={`flex-1 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
                  <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className={`mb-2 font-display ${size.h3} ${template?.typography.headingWeight ?? "font-semibold"} text-gray-900`}>{step.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500">{step.description}</p>
                  </div>
                </div>
                <div className="hidden flex-1 md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────── Pricing ──────────── */

export function PricingSection({
  accent, template,
}: { isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className={`font-display ${size.h2} ${template?.typography.headingWeight ?? "font-bold"} text-gray-900`}>
            Pricing
          </h2>
          <p className="mt-4 text-gray-500">Custom quotes based on your specific needs. Contact us for a free estimate.</p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--home-accent,#2563eb)]/20 bg-[var(--home-accent,#2563eb)]/5 px-6 py-3">
            <span className="text-sm font-semibold" style={{ color: accent }}>Free 15-Minute Consultation</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ──────────── Icons ──────────── */

function ServiceIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    globe: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
    search: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    cpu: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /></svg>,
  }
  return icons[name] ?? <ServiceIcon name="globe" accent={accent} />
}
