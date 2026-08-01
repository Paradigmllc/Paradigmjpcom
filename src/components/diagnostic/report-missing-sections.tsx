"use client"

import { motion } from "framer-motion"
import { Camera, Clock, Film, Package, Play, Send, Smartphone, Video } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

type JsonRecord = Record<string, unknown>
type EvidenceStatus = "pass" | "fail" | "unknown"

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null
}

function evidenceRecord(data: DiagnosticReportData, key: string): JsonRecord | null {
  const meta = asRecord(data.meta)
  return meta ? asRecord(meta[key]) : null
}

function evidenceText(value: unknown, lang: string): string | null {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value)

  const localized = asRecord(value)
  if (!localized) return null
  const selected = localized[lang] ?? localized.en ?? localized.ja
  if (typeof selected === "string") {
    const normalized = selected.trim()
    return normalized.length > 0 ? normalized : null
  }
  if (typeof selected === "number" && Number.isFinite(selected)) return String(selected)
  return null
}

function evidenceStatus(value: unknown): EvidenceStatus {
  if (value === true) return "pass"
  if (value === false) return "fail"
  if (typeof value !== "string") return "unknown"

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (["pass", "passed", "complete", "completed", "success", "verified", "detected", "clear", "not_present", "eligible", "適合"].includes(normalized)) return "pass"
  if (["fail", "failed", "incomplete", "not_completed", "error", "blocked", "not_detected", "ineligible", "対象外"].includes(normalized)) return "fail"
  return "unknown"
}

function statusDetail(value: unknown, status: EvidenceStatus, lang: string): string {
  const explicit = evidenceText(value, lang)
  if (explicit) return explicit.replaceAll("_", " ")
  if (status === "pass") return lang === "ja" ? "確認済み" : "Verified"
  if (status === "fail") return lang === "ja" ? "未完了" : "Not completed"
  return lang === "ja" ? "未計測" : "Not measured"
}

// ─── Video: Sample Section ──────────────────────────────────
export function VideoSampleSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #faf5ff, #ede9fe)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Film className="h-5 w-5 text-violet-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "動画制作プラン" : "Video Production Plan"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Camera, title: lang === "ja" ? "撮影" : "Shoot", desc: lang === "ja" ? "最適な機材と構図で撮影" : "Professional equipment & framing" },
            { icon: Play, title: lang === "ja" ? "編集" : "Edit", desc: lang === "ja" ? "ブランドトーンに合わせた編集" : "Brand-tone aligned editing" },
            { icon: Smartphone, title: lang === "ja" ? "配信" : "Distribute", desc: lang === "ja" ? "Instagram/TikTok/YouTube最適化" : "Optimized for all platforms" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-violet-200 bg-white p-6 text-center">
              <item.icon className="mx-auto h-8 w-8 text-violet-500 mb-3" />
              <div className="text-sm font-bold text-zinc-900">{item.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-5 text-center">
          <div className="text-sm font-bold text-violet-800">{lang === "ja" ? "週4本のショート動画を完全代行" : "4 short videos/week — fully managed"}</div>
          <div className="mt-1 text-xs text-violet-600">{lang === "ja" ? "撮影から分析まで一貫サポート" : "End-to-end from filming to analytics"}</div>
        </div>
      </div>
    </section>
  )
}

// ─── Video: Production Flow Section ─────────────────────────
export function VideoFlowSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const flow = evidenceRecord(data, "video_production_flow")
  const notMeasured = lang === "ja" ? "未計測" : "Not measured"
  const steps = [
    { step: "1", title: lang === "ja" ? "ヒアリング" : "Discovery", desc: lang === "ja" ? "ターゲット・目的・トンマナを共有" : "Target, goals & tone definition", time: evidenceText(flow?.discovery_duration, lang) ?? notMeasured },
    { step: "2", title: lang === "ja" ? "企画・構成" : "Planning", desc: lang === "ja" ? "動画企画と構成を作成" : "Storyboard and content planning", time: evidenceText(flow?.planning_duration, lang) ?? notMeasured },
    { step: "3", title: lang === "ja" ? "撮影・編集" : "Production", desc: lang === "ja" ? "撮影〜編集〜BGM・字幕まで" : "Shoot → edit → BGM → captions", time: evidenceText(flow?.production_duration, lang) ?? notMeasured },
    { step: "4", title: lang === "ja" ? "納品・分析" : "Delivery", desc: lang === "ja" ? "各SNSに最適化して納品＋効果測定" : "Platform-optimized delivery + analytics", time: evidenceText(flow?.delivery_duration, lang) ?? notMeasured },
  ]

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "制作フロー" : "Production Flow"}</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-violet-200" />
          {steps.map((item) => (
            <div key={item.step} className="relative flex gap-4 pb-6 last:pb-0">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{item.step}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900">{item.title}</div>
                  <span className="text-[10px] text-violet-500 font-bold">{item.time}</span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Subsidy: Matching Table Section ────────────────────────
export function SubsidyTableSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const analysis = evidenceRecord(data, "subsidy_analysis")
  const notMeasured = lang === "ja" ? "未計測" : "Not measured"
  const rawPrograms = Array.isArray(analysis?.programs) ? analysis.programs : []
  const subsidies = rawPrograms.flatMap((value) => {
    const program = asRecord(value)
    if (!program) return []
    const rawEligibility = program.eligibility
    const eligibilityText = evidenceText(rawEligibility, lang)
    const eligibility = (eligibilityText ?? notMeasured).replaceAll("_", " ")
    const status = evidenceStatus(eligibilityText)
    return [{
      name: evidenceText(program.name, lang) ?? notMeasured,
      max: evidenceText(program.max_amount, lang) ?? notMeasured,
      deadline: evidenceText(program.deadline, lang) ?? notMeasured,
      match: eligibility,
      status,
    }]
  })
  const supportSuccessRate = evidenceText(analysis?.support_success_rate, lang)

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-teal-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "補助金マッチングの根拠" : "Grant Matching Evidence"}</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-teal-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-teal-50 text-xs text-teal-700">
              <tr>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "制度名" : "Program"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "上限額" : "Max Amount"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "募集時期" : "Deadline"}</th>
                <th className="px-4 py-3 font-medium">{lang === "ja" ? "適合判定" : "Match"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100">
              {subsidies.length > 0 ? subsidies.map((subsidy, index) => (
                <motion.tr key={`${subsidy.name}-${index}`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                  className="hover:bg-teal-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{subsidy.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{subsidy.max}</td>
                  <td className="px-4 py-3 text-zinc-600">{subsidy.deadline}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      subsidy.status === "pass"
                        ? "bg-emerald-100 text-emerald-700"
                        : subsidy.status === "fail"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-zinc-100 text-zinc-600"
                    }`}>{subsidy.match}</span>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-center text-zinc-500" colSpan={4}>{lang === "ja" ? "確認済みの補助金データはありません" : "No verified grant data"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {supportSuccessRate && (
          <div className="mt-4 text-center text-xs text-teal-600">
            {lang === "ja" ? "記録済みの支援実績: " : "Recorded support outcome: "}{supportSuccessRate}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Outreach: Funnel Section ───────────────────────────────
export function OutreachFunnelSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const funnel = evidenceRecord(data, "outreach_funnel")
  const notMeasured = lang === "ja" ? "未計測" : "Not measured"
  const metric = (key: string) => {
    const raw = funnel?.[key]
    const detail = asRecord(raw)
    return {
      value: evidenceText(detail?.value ?? raw, lang),
      percentage: evidenceText(detail?.percentage, lang),
    }
  }
  const metrics = [
    { label: lang === "ja" ? "問い合わせ" : "Inquiries", ...metric("inquiries"), tone: "indigo" },
    { label: lang === "ja" ? "自動返信" : "Auto-reply", ...metric("auto_reply"), tone: "rose" },
    { label: lang === "ja" ? "営業返信" : "Sales reply", ...metric("sales_reply"), tone: "amber" },
    { label: lang === "ja" ? "商談化" : "Conversations", ...metric("conversations"), tone: "emerald" },
  ]
  const currentResponseTime = evidenceText(funnel?.current_response_time, lang)
  const targetResponseTime = evidenceText(funnel?.target_response_time, lang)

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Send className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "営業ファネル診断" : "Sales Funnel Diagnostic"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {metrics.map((item, i) => {
            const colors: Record<string, string> = {
              indigo: "bg-violet-50 border-violet-200 text-violet-700",
              rose: "bg-rose-50 border-rose-200 text-rose-700",
              amber: "bg-amber-50 border-amber-200 text-amber-700",
              emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
              neutral: "bg-zinc-50 border-zinc-200 text-zinc-600",
            }
            const tone = item.value ? item.tone : "neutral"
            return (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`rounded-xl border p-4 text-center ${colors[tone]}`}>
                <div className="text-[10px] font-semibold uppercase opacity-70">{item.label}</div>
                <div className="mt-2 text-xl font-bold">{item.value ?? notMeasured}</div>
                {item.percentage && <div className="mt-1 text-xs opacity-70">{item.percentage}</div>}
              </motion.div>
            )
          })}
        </div>
        <div className="mt-6 text-center">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${currentResponseTime && targetResponseTime ? "bg-orange-100 text-orange-700" : "bg-zinc-100 text-zinc-600"}`}>
            <Clock className="h-4 w-4" />
            {currentResponseTime && targetResponseTime
              ? (lang === "ja" ? `記録済みの返信時間: ${currentResponseTime} → ${targetResponseTime}` : `Recorded response-time comparison: ${currentResponseTime} → ${targetResponseTime}`)
              : (lang === "ja" ? "返信時間への影響: 未計測" : "Response-time impact: Not measured")}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Outreach: Test Result Section ──────────────────────────
export function OutreachTestSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const formTest = evidenceRecord(data, "form_test")
  const explicitDetection = evidenceStatus(formTest?.form_detected)
  const detectionStatus = explicitDetection !== "unknown"
    ? explicitDetection
    : data.contactFormUrl
      ? "pass"
      : "unknown"
  const checks = [
    {
      label: lang === "ja" ? "フォーム検出" : "Form detected",
      status: detectionStatus,
      detail: explicitDetection === "unknown" && data.contactFormUrl
        ? (lang === "ja" ? "URL確認済み" : "URL verified")
        : statusDetail(formTest?.form_detected, detectionStatus, lang),
    },
    {
      label: lang === "ja" ? "フォーム解析" : "Form analysis",
      status: evidenceStatus(formTest?.analysis_completed),
      detail: statusDetail(formTest?.analysis_completed, evidenceStatus(formTest?.analysis_completed), lang),
    },
    {
      label: lang === "ja" ? "CAPTCHA確認" : "CAPTCHA check",
      status: evidenceStatus(formTest?.captcha_status),
      detail: statusDetail(formTest?.captcha_status, evidenceStatus(formTest?.captcha_status), lang),
    },
    {
      label: lang === "ja" ? "送信テスト" : "Send test",
      status: evidenceStatus(formTest?.send_test_status),
      detail: statusDetail(formTest?.send_test_status, evidenceStatus(formTest?.send_test_status), lang),
    },
  ] satisfies Array<{ label: string; status: EvidenceStatus; detail: string }>

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "フォーム送信テスト結果" : "Form Submission Test"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {checks.map((item, index) => (
            <motion.div key={item.label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-4 ${
                item.status === "pass"
                  ? "border-emerald-200 bg-emerald-50"
                  : item.status === "fail"
                    ? "border-rose-200 bg-rose-50"
                    : "border-zinc-200 bg-zinc-50"
              }`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                item.status === "pass"
                  ? "bg-emerald-100 text-emerald-600"
                  : item.status === "fail"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-zinc-200 text-zinc-500"
              }`}>
                {item.status === "pass" ? "✓" : item.status === "fail" ? "×" : "?"}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-800">{item.label}</div>
                <div className={`text-[10px] ${item.status === "fail" ? "text-rose-600" : item.status === "pass" ? "text-emerald-700" : "text-zinc-500"}`}>{item.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
