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
    post({ type: "play" })
    setCurrentTime(next)
    setPaused(false)
  }

  const activeChapter = chapterIndex(currentTime)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg">
      {/* YouTube-style responsive iframe: 16:9 aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          ref={iframeRef}
          src={`${src}?autoplay=1&mobile=0`}
          className="absolute inset-0 w-full h-full"
          title={lang === "ja" ? "診断動画" : "Diagnostic video"}
          allow="autoplay; fullscreen; picture-in-picture"
          style={{ border: "none" }}
        />
      </div>

      {/* Chapters overlay */}
      <div className="relative z-20 rounded-xl border border-white/15 bg-zinc-950 px-2 py-2 text-white shadow-2xl sm:absolute sm:inset-x-3 sm:top-3 sm:rounded-2xl sm:bg-zinc-950/78 sm:px-4 sm:py-3 sm:backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300 sm:mb-2 sm:text-[11px] sm:tracking-[0.18em]">
          <span>{copy.chapters}</span>
          <span className="truncate text-sky-200">{copy.now}: {lang === "ja" ? CHAPTERS[activeChapter].ja : CHAPTERS[activeChapter].en}</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:pb-0">
          {CHAPTERS.map((chapter, index) => {
            const active = index === activeChapter
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button key={chapter.key} type="button" onClick={() => seekTo(chapter.start)} aria-label={`${label}${lang === "ja" ? "へスキップ" : " skip"}`} className={["grid min-w-[84px] gap-0.5 rounded-lg border px-2 py-1.5 text-left transition sm:min-w-0 sm:gap-1 sm:rounded-xl sm:py-2", active ? "border-sky-300 bg-sky-300 text-zinc-950" : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16"].join(" ")}>
                <span className="truncate text-[9px] font-black uppercase tracking-[0.1em] opacity-70 sm:text-[10px] sm:tracking-[0.12em]">{formatTime(chapter.start)}</span>
                <span className="truncate text-[11px] font-black sm:text-sm">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 flex flex-col gap-2 rounded-xl border border-white/15 bg-zinc-950 px-3 py-3 text-white shadow-2xl sm:absolute sm:inset-x-3 sm:bottom-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3 sm:rounded-2xl sm:bg-zinc-950/88 sm:px-4 sm:py-3 sm:backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={togglePlayback} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100" aria-label={paused ? copy.play : copy.pause}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button type="button" onClick={() => seekTo(0)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14" aria-label={copy.replay}>
            <RotateCcw size={17} />
          </button>
        </div>
        <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-[11px] font-semibold text-zinc-300 sm:text-xs">
          <span>{formatTime(currentTime)}</span>
          <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={Math.min(currentTime, duration)} onChange={(e) => { setCurrentTime(Number(e.target.value)); post({ type: "seek", time: Number(e.target.value) }) }} className="h-2 w-full accent-sky-400" aria-label={copy.timeline} />
          <span>{formatTime(duration)}</span>
        </label>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => { const i = SPEEDS.indexOf(speed); const n = SPEEDS[(i + 1) % SPEEDS.length]; setSpeed(n); post({ type: "speed", speed: n }) }} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14">
            <Gauge size={16} /> {speed}x
          </button>
          <button type="button" onClick={() => iframeRef.current?.requestFullscreen?.()} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14">
            <Maximize2 size={16} /> <span className="hidden sm:inline">{copy.fullscreen}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
