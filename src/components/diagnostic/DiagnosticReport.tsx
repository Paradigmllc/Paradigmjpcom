/**
 * DiagnosticReport.tsx — 診断レポート LP (Sprint 9-D)
 *
 * 役割: sales_companies + sales_templates から組み立てた DiagnosticReportData を
 *       3-Act 構造 (pain / fear / hope) で表示する pure section components.
 *
 * 設計原則 (s10-4 提案ページ 4 鉄則の継承):
 *   ① Section-per-file (本 file = orchestrator・各 act は ActCard sub-component)
 *   ② Manifest-driven (acts 配列の順序が表示順)
 *   ③ Zero hardcoded JP strings (visible text は props 経由・i18n は将来)
 *   ④ Pure component (data + locale → JSX の純関数)
 *
 * mock 原典: C:/Users/apple/Downloads/diagnostic-report-lp.jsx (2026-05-13)
 */

"use client"

import { useState, useEffect, useRef } from "react"
import type { DiagnosticReportData, DiagnosticAct } from "@/lib/sales/diagnostic"

/* ───── Hooks: count up + in-view ───── */

function useCountUp(target: number, duration = 1800, start = false): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return value
}

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { threshold },
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ───── Sub-components ───── */

const SEVERITY_STYLES = {
  critical: { bg: "#fef2f2", color: "#dc2626", dot: "#dc2626", label: "緊急対応" },
  warning: { bg: "#fffbeb", color: "#d97706", dot: "#f59e0b", label: "要対応" },
  info: { bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e", label: "推奨" },
} as const

function SeverityBadge({ severity }: { severity: DiagnosticAct["severity"] }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{
          background: s.dot,
          animation: severity === "critical" ? "diagnostic-pulse 1.5s infinite" : "none",
        }}
      />
      {s.label}
    </span>
  )
}

function ActCard({ act, index }: { act: DiagnosticAct; index: number }) {
  const [ref, inView] = useInView()
  const numericVal = Number.parseInt(act.metric_value.replace(/[^0-9]/g, ""), 10) || 0
  const count = useCountUp(numericVal, 1400, inView)
  const display = Number.isNaN(Number.parseInt(act.metric_value, 10))
    ? act.metric_value
    : count.toLocaleString()

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl p-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
        border: "1px solid #f1f5f9",
      }}
    >
      <div>
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-xl">{act.icon}</span>
          <SeverityBadge severity={act.severity} />
        </div>
        <h3 className="text-[17px] font-extrabold text-slate-900 leading-tight tracking-tight mb-2.5">
          {act.headline}
        </h3>
        <p className="text-[13.5px] text-slate-500 leading-[1.85]">{act.body}</p>
      </div>
      <div
        className="rounded-2xl px-5 py-5 text-center min-w-[120px]"
        style={{
          background: act.severity === "critical" ? "#fff5f5" : "#f8fafc",
          border: `1px solid ${act.severity === "critical" ? "#fecaca" : "#e2e8f0"}`,
        }}
      >
        <div className="text-[11px] text-slate-400 mb-1.5 font-mono tracking-wide">
          {act.metric_label}
        </div>
        <div
          className="text-3xl font-black leading-none tracking-tight font-mono"
          style={{ color: act.severity === "critical" ? "#dc2626" : "#0f172a" }}
        >
          {display}
          <span className="text-sm font-semibold ml-0.5">{act.metric_unit}</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-2">{act.metric_bench}</div>
      </div>
    </div>
  )
}

/* ───── Main component ───── */

export default function DiagnosticReport({ data }: { data: DiagnosticReportData }) {
  const [lossRef, lossInView] = useInView()
  const lossNumeric = Number.parseInt(data.total_loss.replace(/[^0-9]/g, ""), 10) || 0
  const lossCount = useCountUp(lossNumeric, 2000, lossInView)
  const [showVideo, setShowVideo] = useState(false)

  return (
    <div className="font-sans bg-slate-50 min-h-screen">
      <style>{`
        @keyframes diagnostic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes diagnostic-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── ヘッダーバー ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] text-white font-extrabold"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            P
          </div>
          <span className="text-xs text-slate-400 font-mono">Paradigm Web診断</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          有効期限: {data.expires_at}
        </span>
      </div>

      <div className="max-w-[680px] mx-auto px-5 py-10 pb-20">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="mb-10" style={{ animation: "diagnostic-fade-up 0.7s ease both" }}>
          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg px-3.5 py-1.5 mb-5">
            <span className="text-[11px] text-slate-500">診断対象</span>
            <span className="text-[11px] font-bold text-slate-900">{data.company_name}</span>
            {data.prefecture && (
              <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded">
                {data.prefecture}
              </span>
            )}
          </div>
          <h1
            className="font-black text-slate-900 mb-5 tracking-tight whitespace-pre-line"
            style={{ fontSize: "clamp(20px, 4vw, 26px)", lineHeight: 1.5 }}
          >
            {data.hook}
          </h1>
          <div
            className="h-0.5 w-12 rounded"
            style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
          />
        </div>

        {/* ── 課題カード群 ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 mb-10">
          {data.acts.map((act, i) => (
            <ActCard key={i} act={act} index={i} />
          ))}
        </div>

        {/* ── 損失合計 ─────────────────────────────────────────── */}
        <div
          ref={lossRef}
          className="rounded-3xl px-8 py-9 mb-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            opacity: lossInView ? 1 : 0,
            transform: lossInView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative">
            <div className="text-xs text-slate-500 font-mono tracking-widest mb-3">
              ESTIMATED MONTHLY LOSS
            </div>
            <div
              className="font-black text-white font-mono tracking-tighter leading-none mb-4"
              style={{ fontSize: "clamp(40px, 8vw, 56px)" }}
            >
              <span className="text-[0.5em] text-slate-500">¥</span>
              {lossCount.toLocaleString()}
            </div>
            <p className="text-[13px] text-slate-400 leading-relaxed m-0">
              上記の課題による月間推定機会損失の合算です。
              <br />
              改善により回収可能な損失として試算しています。
            </p>
          </div>
        </div>

        {/* ── 動画セクション ───────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl overflow-hidden mb-8"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
            border: "1px solid #f1f5f9",
          }}
        >
          {!showVideo ? (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              className="w-full p-12 flex flex-col items-center justify-center gap-4 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              >
                <span className="text-2xl ml-1">▶</span>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-bold text-white mb-1.5">
                  改善した場合の試算を2分で説明します
                </div>
                <div className="text-xs text-white/70">{data.company_name} 専用の解説動画</div>
              </div>
            </button>
          ) : (
            <div className="bg-black p-6 flex items-center justify-center min-h-[200px]">
              <span className="text-slate-500 text-[13px]">
                ※ HyperFrames / Loom 動画を埋め込み予定 (Sprint 10)
              </span>
            </div>
          )}
          <div className="p-5 px-6">
            <p className="text-[13px] text-slate-500 leading-relaxed m-0">
              御社サイトの診断結果と、具体的な改善シミュレーションをまとめました。
              まずは動画をご覧ください。
            </p>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-3xl px-8 py-10 text-center"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
            border: "1px solid #f1f5f9",
          }}
        >
          <div className="text-[11px] text-slate-400 font-mono tracking-widest mb-3">NEXT STEP</div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2.5 tracking-tight">
            まず30分、話だけでも聞いてみてください
          </h2>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-7">
            費用の話は一切しません。
            <br />
            診断結果の詳細説明と、改善の優先順位をお伝えします。
          </p>
          <a
            href="mailto:info@paradigmjp.com?subject=診断レポートについて"
            className="inline-flex items-center gap-2.5 text-white px-9 py-4 rounded-2xl text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            }}
          >
            <span>📅</span>
            {data.cta_text}
          </a>
          <div className="mt-4 text-[11px] text-slate-400">
            無料 · オンライン対応 · 30分
          </div>
        </div>

        <div className="text-center mt-12 text-[11px] text-slate-300 font-mono">
          Paradigm Web Diagnostics · このレポートは{data.expires_at}まで有効です
        </div>
      </div>
    </div>
  )
}
