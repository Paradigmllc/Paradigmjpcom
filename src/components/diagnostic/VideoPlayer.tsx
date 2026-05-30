"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { NarrationScript } from "@/lib/sales/video-generator"
import { themeForIndustry } from "@/lib/sales/render-quality"

interface Props {
  data: DiagnosticReportData
  script: NarrationScript
  trackingSlug: string
}

interface Scene {
  id: string
  start: number
  end: number
  label: string
  text: string
  metric?: string
}

const TOTAL = 60

export default function VideoPlayer({ data, script, trackingSlug }: Props) {
  const theme = themeForIndustry(data.industry)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const scenes: Scene[] = useMemo(
    () => [
      { id: "hook", start: 0, end: 8, label: "HOOK", text: script.hook, metric: data.company_name },
      { id: "pain", start: 8, end: 22, label: "EVIDENCE", text: script.pain, metric: data.acts[0]?.metric_value },
      { id: "fear", start: 22, end: 36, label: "IMPACT", text: script.fear, metric: data.total_loss },
      { id: "hope", start: 36, end: 52, label: "SOLUTION", text: script.hope, metric: data.demo_url ?? data.report_url },
      { id: "cta", start: 52, end: 60, label: "NEXT STEP", text: script.cta, metric: data.report_url },
    ],
    [data, script],
  )

  const currentScene = scenes.find((scene) => time >= scene.start && time < scene.end) ?? scenes[scenes.length - 1]
  const sceneProgress = Math.max(0, Math.min(1, (time - currentScene.start) / (currentScene.end - currentScene.start)))
  const totalProgress = Math.min(1, time / TOTAL)

  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now() - time * 1000
    const tick = (now: number) => {
      const next = (now - startRef.current) / 1000
      if (next >= TOTAL) {
        setTime(TOTAL)
        setPlaying(false)
        return
      }
      setTime(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, time])

  useEffect(() => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return
    if (!playing) {
      window.speechSynthesis.cancel()
      return
    }
    const utterance = new SpeechSynthesisUtterance([script.hook, script.pain, script.fear, script.hope, script.cta].join("。"))
    utterance.lang = data.report_locale === "ja" ? "ja-JP" : "en-US"
    utterance.rate = 0.96
    window.speechSynthesis.speak(utterance)
    return () => window.speechSynthesis.cancel()
  }, [data.report_locale, playing, script, ttsEnabled])

  const replay = () => {
    setTime(0)
    setPlaying(true)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-zinc-950 text-white">
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 72% 18%, ${theme.accent}55, transparent 28%), linear-gradient(140deg, ${theme.ink}, ${theme.accentDark})`,
        }}
      />
      <main className="relative z-10 flex h-full w-full flex-col justify-center gap-7 px-7 py-20 sm:px-14 lg:px-24">
        <div className="text-sm font-semibold text-white/60">{currentScene.label}</div>
        <h1
          key={currentScene.id}
          className="max-w-5xl text-3xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          style={{
            opacity: Math.min(1, sceneProgress * 2),
            transform: `translateY(${Math.max(0, (1 - sceneProgress * 2) * 26)}px)`,
          }}
        >
          {currentScene.text}
        </h1>
        {currentScene.metric && (
          <div
            className="max-w-3xl overflow-hidden rounded-lg border border-white/15 bg-white/10 p-4 text-lg font-semibold text-white/82 sm:text-2xl"
            style={{
              opacity: Math.min(1, sceneProgress * 2.6),
              transform: `translateY(${Math.max(0, (1 - sceneProgress * 2.6) * 18)}px)`,
            }}
          >
            {currentScene.metric}
          </div>
        )}
      </main>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5 text-white sm:p-7">
        <div className="text-xs font-semibold uppercase tracking-normal text-white/70">Paradigm Sales OS</div>
        <div className="text-xs text-white/70">{data.company_name}</div>
      </header>

      <footer className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7">
        <div className="h-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white transition-all" style={{ width: `${totalProgress * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-xs tabular-nums text-white/70">{Math.floor(time)}s / 60s</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTtsEnabled((value) => !value)}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                ttsEnabled ? "bg-white text-zinc-950" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {ttsEnabled ? "音声 ON" : "音声 OFF"}
            </button>
            {!playing && (
              <button type="button" onClick={replay} className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-zinc-950">
                もう一度再生
              </button>
            )}
            <a
              href={`/${data.report_locale}/report/${trackingSlug}`}
              className="rounded-md px-3 py-2 text-xs font-semibold text-zinc-950"
              style={{ background: theme.signal }}
            >
              詳細レポート
            </a>
          </div>
        </div>
      </footer>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}`}
        alt=""
        width={1}
        height={1}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
        aria-hidden
      />
    </div>
  )
}
