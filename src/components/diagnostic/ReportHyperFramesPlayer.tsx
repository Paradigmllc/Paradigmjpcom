"use client"

import { Gauge, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ReportLang } from "./report-copy"

const SPEEDS = [1, 1.25, 1.5, 2] as const
const CHAPTERS = [
  { start: 0, key: "brief", ja: "要点", en: "Brief" },
  { start: 7, key: "evidence", ja: "根拠", en: "Evidence" },
  { start: 14, key: "loss", ja: "損失", en: "Leakage" },
  { start: 21, key: "future", ja: "改善像", en: "Future" },
  { start: 28, key: "action", ja: "次アクション", en: "Action" },
] as const

function formatTime(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
}

function chapterIndex(time: number): number {
  let active = 0
  CHAPTERS.forEach((chapter, index) => { if (time >= chapter.start) active = index })
  return active
}

export default function ReportHyperFramesPlayer({ src, lang }: { src: string; lang: ReportLang }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [paused, setPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(36)
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1)

  const copy = {
    play: lang === "ja" ? "再生" : "Play",
    pause: lang === "ja" ? "一時停止" : "Pause",
    replay: lang === "ja" ? "最初から" : "Replay",
    speed: lang === "ja" ? "倍速" : "Speed",
    fullscreen: lang === "ja" ? "全画面" : "Fullscreen",
    timeline: lang === "ja" ? "再生位置" : "Timeline",
    chapters: lang === "ja" ? "目次" : "Chapters",
    now: lang === "ja" ? "再生中" : "Now",
  }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "diagnostic-report-player") return
      if (e.data.type === "timeupdate" && Number.isFinite(e.data.currentTime)) {
        setCurrentTime(e.data.currentTime)
        if (e.data.duration > 0) setDuration(e.data.duration)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  function post(command: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage({ source: "diagnostic-report-player", ...command }, "*")
  }

  function togglePlayback() {
    if (paused) { post({ type: "play" }); setPaused(false) }
    else { post({ type: "pause" }); setPaused(true) }
  }

  function seekTo(time: number) {
    const next = Math.max(0, Math.min(duration, time))
    post({ type: "seek", time: next })
    setCurrentTime(next)
    setPaused(true)
  }

  const activeChapter = chapterIndex(currentTime)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg">
      <iframe
        ref={iframeRef}
        src={`${src}?autoplay=1`}
        className="absolute inset-0 h-full w-full border-0"
        title={lang === "ja" ? "診断動画" : "Diagnostic video"}
        allow="autoplay; fullscreen; picture-in-picture"
      />

      {/* Chapters overlay */}
      <div className="absolute inset-x-0 top-0 z-20 mx-3 mt-3 rounded-2xl border border-white/15 bg-zinc-950/78 px-4 py-3 text-white shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
          <span>{copy.chapters}</span>
          <span className="truncate text-sky-200">{copy.now}: {lang === "ja" ? CHAPTERS[activeChapter].ja : CHAPTERS[activeChapter].en}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {CHAPTERS.map((chapter, index) => {
            const active = index === activeChapter
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button key={chapter.key} type="button" onClick={() => seekTo(chapter.start)} aria-label={`${label}${lang === "ja" ? "へスキップ" : " skip"}`} className={["grid gap-1 rounded-xl border px-2 py-2 text-left transition", active ? "border-sky-300 bg-sky-300 text-zinc-950" : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16"].join(" ")}>
                <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{formatTime(chapter.start)}</span>
                <span className="truncate text-sm font-black">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 mx-3 mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/15 bg-zinc-950/88 px-4 py-3 text-white shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={togglePlayback} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100" aria-label={paused ? copy.play : copy.pause}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button type="button" onClick={() => seekTo(0)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14" aria-label={copy.replay}>
            <RotateCcw size={15} />
          </button>
        </div>
        <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-semibold text-zinc-300">
          <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
          <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={Math.min(currentTime, duration)} onChange={(e) => { setCurrentTime(Number(e.target.value)); post({ type: "seek", time: Number(e.target.value) }) }} className="h-1.5 w-full accent-sky-400" aria-label={copy.timeline} />
          <span className="w-10 tabular-nums">{formatTime(duration)}</span>
        </label>
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={() => { const i = SPEEDS.indexOf(speed); const n = SPEEDS[(i + 1) % SPEEDS.length]; setSpeed(n); post({ type: "speed", speed: n }) }} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 text-xs font-bold text-white transition hover:bg-white/14">
            <Gauge size={14} /> {speed}x
          </button>
          <button type="button" onClick={() => iframeRef.current?.requestFullscreen?.()} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-xs font-bold text-white transition hover:bg-white/14">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
