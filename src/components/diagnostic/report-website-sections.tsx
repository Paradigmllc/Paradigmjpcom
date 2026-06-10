"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, ExternalLink, Monitor, Smartphone, ZoomIn } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

// ─── Screenshot with problem annotations ────────────────────
export function AnnotatedScreenshot({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const issues = data.acts.filter(a => a.type === "pain" || a.type === "fear").slice(0, 3)
  const screenshotUrl = data.screenshot_url

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Monitor className="h-5 w-5 text-zinc-600" />
          <h2 className="text-xl font-bold text-zinc-900">
            {lang === "ja" ? "御社サイトの診断結果" : "Your Site Diagnostic Findings"}
          </h2>
        </div>

        {screenshotUrl ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Screenshot with overlays */}
            <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100">
              <Image src={screenshotUrl} alt={data.company_name} width={1200} height={675} className="w-full" loading="lazy" />
              {/* Issue markers */}
              {issues.map((issue, i) => (
                <motion.div
                  key={issue.icon}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.2 }}
                  className="absolute flex items-start gap-2"
                  style={{
                    top: `${15 + i * 25}%`,
                    right: i % 2 === 0 ? `${10 + i * 8}%` : undefined,
                    left: i % 2 === 1 ? `${10 + i * 8}%` : undefined,
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30">
                    {i + 1}
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-white px-3 py-2 shadow-md max-w-[220px]">
                    <div className="text-[11px] font-bold text-rose-700">{issue.headline}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500 leading-relaxed">{issue.metric_label}: {issue.metric_value}</div>
                  </div>
                </motion.div>
              ))}
              {issues.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                  <p className="text-sm text-zinc-500">{lang === "ja" ? "スクリーンショット解析中..." : "Analyzing screenshot..."}</p>
                </div>
              )}
            </div>

            {/* Issue detail cards */}
            <div className="space-y-3">
              {issues.map((issue, i) => (
                <motion.div
                  key={issue.icon}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">{i + 1}</span>
                    <span className="text-xs font-bold text-zinc-700">{issue.headline}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-zinc-700 border border-zinc-200">{issue.metric_value}{issue.metric_unit}</span>
                    <span className="text-zinc-400">{issue.metric_bench}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 line-clamp-3">{issue.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* No screenshot fallback: show issues as cards */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {issues.length > 0 ? issues.map((issue, i) => (
              <motion.div
                key={issue.icon}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 text-xs font-bold">{i + 1}</span>
                  <span className="text-sm font-bold text-zinc-800">{issue.headline}</span>
                </div>
                <div className="text-xs text-zinc-500 mb-2">{issue.metric_label}: {issue.metric_value}{issue.metric_unit}</div>
                <p className="text-xs leading-relaxed text-zinc-600 line-clamp-3">{issue.body}</p>
              </motion.div>
            )) : (
              <p className="col-span-full text-sm text-zinc-500 text-center py-8">{lang === "ja" ? "診断データを収集中です" : "Collecting diagnostic data"}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Before/After comparison ────────────────────────────────
export function BeforeAfterComparison({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const hasScreenshot = !!data.screenshot_url
  const hasDemo = !!data.demo_url

  if (!hasScreenshot && !hasDemo) return null

  const beforeItems = [
    { label: lang === "ja" ? "PageSpeed" : "PageSpeed", value: data.acts.find(a => a.icon === "SPEED")?.metric_value ?? "-", icon: "SPEED" },
    { label: lang === "ja" ? "SSL" : "SSL", value: data.acts.find(a => a.icon === "TRUST")?.metric_value ?? "-", icon: "TRUST" },
    { label: lang === "ja" ? "OGP" : "OGP", value: data.acts.find(a => a.icon === "SNS")?.metric_value ?? "-", icon: "SNS" },
  ].filter(b => b.value !== "-")

  const afterItems = [
    { label: lang === "ja" ? "PageSpeed" : "PageSpeed", value: "85+", improvement: beforeItems[0]?.value !== "-" ? "↑" : null },
    { label: lang === "ja" ? "SSL" : "SSL", value: "A+", improvement: beforeItems[1]?.value !== "-" ? "↑" : null },
    { label: lang === "ja" ? "OGP" : "OGP", value: lang === "ja" ? "整備済" : "Configured", improvement: beforeItems[2]?.value !== "-" ? "↑" : null },
  ]

  return (
    <section className="px-5 py-14 bg-gradient-to-b from-white to-zinc-50 border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <ArrowRight className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-bold text-zinc-900">
            {lang === "ja" ? "Before → After" : "Before → After"}
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* BEFORE */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-rose-200 bg-rose-50/30 overflow-hidden"
          >
            <div className="bg-rose-100 px-4 py-2">
              <span className="text-xs font-bold text-rose-700">{lang === "ja" ? "現在" : "CURRENT"}</span>
            </div>
            <div className="p-5">
              {hasScreenshot && (
                <div className="rounded-lg border border-zinc-200 overflow-hidden mb-4 opacity-70">
                  <Image src={data.screenshot_url!} alt="Current site" width={1200} height={675} className="w-full grayscale" loading="lazy" />
                </div>
              )}
              <div className="space-y-2">
                {beforeItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{item.label}</span>
                    <span className="font-bold text-rose-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AFTER */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/30 overflow-hidden"
          >
            <div className="bg-emerald-100 px-4 py-2">
              <span className="text-xs font-bold text-emerald-700">{lang === "ja" ? "改善後（弊社デモ）" : "AFTER (Our Demo)"}</span>
            </div>
            <div className="p-5">
              {hasDemo && (
                <div className="rounded-lg border border-emerald-200 overflow-hidden mb-4">
                  <div className="aspect-video bg-zinc-100 flex items-center justify-center">
                    <a href={data.demo_url!} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors">
                      <Monitor className="h-10 w-10" />
                      <span className="text-sm font-bold">{lang === "ja" ? "デモサイトを見る" : "View Demo Site"}</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {afterItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{item.label}</span>
                    <span className="font-bold text-emerald-700">{item.value} {item.improvement && <span className="text-emerald-500">{item.improvement}</span>}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {hasDemo && (
          <div className="mt-6 text-center">
            <a
              href={data.demo_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
              {lang === "ja" ? "Astro改善デモサイトを見る" : "View Astro Demo Site"}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Mobile mockup comparison ───────────────────────────────
export function MobileComparison({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const speedMobile = data.acts.find(a => a.icon === "SPEED")?.metric_value

  return (
    <section className="px-5 py-14 bg-zinc-900 text-white">
      <div className="mx-auto max-w-6xl text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Smartphone className="h-5 w-5 text-zinc-400" />
          <h2 className="text-xl font-bold">
            {lang === "ja" ? "モバイル表示速度の差" : "Mobile Speed Difference"}
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3 items-end">
          <div className="text-center">
            <div className="mx-auto w-48 h-96 rounded-3xl border-4 border-rose-500/50 bg-zinc-800 flex flex-col items-center justify-center gap-3">
              <div className="text-rose-400 text-lg font-bold">{lang === "ja" ? "現在" : "Now"}</div>
              <div className="text-5xl font-black text-rose-500">{speedMobile ?? "?"}</div>
              <div className="text-rose-400/60 text-sm">/100</div>
              <div className="mt-4 w-32 h-2 bg-zinc-700 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-rose-500 rounded"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(Number(speedMobile) || 38, 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </div>
          </div>
          <div className="text-center">
            <ArrowRight className="mx-auto h-8 w-8 text-zinc-500 rotate-90 lg:rotate-0" />
            <p className="mt-4 text-sm text-zinc-400">{lang === "ja" ? "Astro + 画像最適化で" : "With Astro + optimization"}</p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-48 h-96 rounded-3xl border-4 border-emerald-500/50 bg-zinc-800 flex flex-col items-center justify-center gap-3">
              <div className="text-emerald-400 text-lg font-bold">{lang === "ja" ? "改善後" : "After"}</div>
              <div className="text-5xl font-black text-emerald-500">85+</div>
              <div className="text-emerald-400/60 text-sm">/100</div>
              <div className="mt-4 w-32 h-2 bg-zinc-700 rounded overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded"
                  initial={{ width: 0 }}
                  whileInView={{ width: "85%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
