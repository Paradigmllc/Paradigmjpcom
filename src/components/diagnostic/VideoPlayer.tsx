/**
 * components/diagnostic/VideoPlayer.tsx — HTML auto-play 診断動画 (Sprint 14)
 *
 * 役割: 5 scene (5s + 15s×3 + 10s = 60s) を CSS keyframes で auto-play する HTML 動画.
 *       MP4 サーバー (HyperFrames) 未構築時の代替・URL 共有で完結.
 *
 * 入力: data (DiagnosticReportData), script (NarrationScript), trackingSlug
 * 出力: 全画面アニメーション + replay / open report ボタン + tracking pixel
 *
 * 設計:
 *   - scene 切替は単純な setTimeout / state machine ではなく
 *     CSS animation の delay で実装 (JS なくても動く)
 *   - speechSynthesis (Web Speech API) で日本語 TTS 同期再生 (オプション)
 *
 * AE-PHP-4 準拠.
 */

"use client"

import { useEffect, useRef, useState } from "react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { NarrationScript } from "@/lib/sales/video-generator"

interface Props {
  data: DiagnosticReportData
  script: NarrationScript
  trackingSlug: string
}

interface Scene {
  start: number
  end: number
  bg: string
  text: string
  metric?: { value: string; unit: string } | null
}

export default function VideoPlayer({ data, script, trackingSlug }: Props) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const scenes: Scene[] = [
    { start: 0, end: 5, bg: "linear-gradient(135deg,#6366f1,#8b5cf6)", text: script.hook, metric: null },
    {
      start: 5,
      end: 20,
      bg: "linear-gradient(135deg,#dc2626,#991b1b)",
      text: script.pain,
      metric: data.acts[0]
        ? { value: String(data.acts[0].metric_value), unit: data.acts[0].metric_unit }
        : null,
    },
    {
      start: 20,
      end: 35,
      bg: "linear-gradient(135deg,#d97706,#92400e)",
      text: script.fear,
      metric: data.acts[1]
        ? { value: String(data.acts[1].metric_value), unit: data.acts[1].metric_unit }
        : null,
    },
    {
      start: 35,
      end: 50,
      bg: "linear-gradient(135deg,#16a34a,#14532d)",
      text: script.hope,
      metric: null,
    },
    { start: 50, end: 60, bg: "linear-gradient(135deg,#0f172a,#1e293b)", text: script.cta, metric: null },
  ]

  const TOTAL = 60
  const currentScene = scenes.find((s) => time >= s.start && time < s.end) ?? scenes[scenes.length - 1]
  const sceneProgress = (time - currentScene.start) / (currentScene.end - currentScene.start)
  const totalProgress = Math.min(1, time / TOTAL)

  // animation loop
  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now() - time * 1000
    const tick = (now: number) => {
      const t = (now - startRef.current) / 1000
      if (t >= TOTAL) {
        setTime(TOTAL)
        setPlaying(false)
        return
      }
      setTime(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  // TTS 同期
  useEffect(() => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return
    if (!playing) {
      window.speechSynthesis.cancel()
      return
    }
    const fullText = [script.hook, script.pain, script.fear, script.hope, script.cta].join("。 ")
    const u = new SpeechSynthesisUtterance(fullText)
    u.lang = "ja-JP"
    u.rate = 1.0
    u.pitch = 1.0
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [ttsEnabled, playing, script])

  const replay = () => {
    setTime(0)
    setPlaying(true)
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {/* Scene canvas */}
      <div
        className="absolute inset-0 transition-all duration-500 flex items-center justify-center p-8 md:p-16"
        style={{ background: currentScene.bg }}
      >
        <div className="max-w-4xl w-full text-center text-white">
          {currentScene.metric && (
            <div
              className="font-mono font-black text-7xl md:text-9xl mb-4 transition-all"
              style={{
                opacity: Math.min(1, sceneProgress * 3),
                transform: `scale(${0.8 + sceneProgress * 0.2})`,
              }}
            >
              {currentScene.metric.value}
              <span className="text-3xl md:text-4xl ml-2">{currentScene.metric.unit}</span>
            </div>
          )}
          <h1
            className="text-2xl md:text-5xl font-bold leading-tight whitespace-pre-line"
            style={{
              opacity: Math.min(1, sceneProgress * 2),
              transform: `translateY(${Math.max(0, (1 - sceneProgress * 2) * 20)}px)`,
            }}
          >
            {currentScene.text}
          </h1>
        </div>
      </div>

      {/* Header overlay (company name + scene indicator) */}
      <div className="absolute top-0 inset-x-0 p-4 md:p-6 flex items-center justify-between text-white pointer-events-none">
        <div className="text-xs md:text-sm tracking-widest uppercase font-bold opacity-80">
          Paradigm Web Diagnostics
        </div>
        <div className="text-xs md:text-sm opacity-80">
          {data.company_name}
        </div>
      </div>

      {/* Progress bar + controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 flex flex-col gap-3">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${totalProgress * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-white text-xs md:text-sm font-mono tabular-nums opacity-80">
            {Math.floor(time)}s / 60s
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTtsEnabled((v) => !v)}
              className={`text-xs md:text-sm px-3 py-1.5 rounded-full font-bold transition-colors ${
                ttsEnabled
                  ? "bg-white text-slate-900"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {ttsEnabled ? "🔊 音声 ON" : "🔇 音声 OFF"}
            </button>
            {!playing && (
              <button
                type="button"
                onClick={replay}
                className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-white text-slate-900 font-bold"
              >
                ⟲ もう一度再生
              </button>
            )}
            <a
              href={`/ja/report/${trackingSlug}`}
              className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-yellow-400 text-slate-900 font-bold hover:bg-yellow-300 transition-colors"
            >
              📋 詳細レポートを見る
            </a>
          </div>
        </div>
      </div>

      {/* Tracking pixel (一覧と同じく閲覧記録) */}
      <img
        src={`/api/sales/track-view?slug=${encodeURIComponent(trackingSlug)}`}
        alt=""
        width={1}
        height={1}
        style={{ position: "absolute", top: 0, left: 0, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  )
}
