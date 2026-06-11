"use client"

import { Gauge, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
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

export default function ReportHyperFramesPlayer({
  src,
  lang,
  mp4Url,
}: {
  src: string
  lang: ReportLang
  mp4Url?: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(36)
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1)
  const [useNative, setUseNative] = useState(false)

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

  const post = useCallback(
    (command: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "diagnostic-report-player", ...command },
        "*",
      )
    },
    [],
  )

  // ── iframe message listener ──
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

  // ── Decide native vs iframe on mount ──
  useEffect(() => {
    if (mp4Url) {
      setUseNative(true)
    }
  }, [mp4Url])

  // ── Native video event handlers ──
  useEffect(() => {
    const video = videoRef.current
    if (!video || !useNative) return

    const onLoadedMetadata = () => {
      const d = video.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }
    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onEnded = () => setPaused(true)
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)

    video.addEventListener("loadedmetadata", onLoadedMetadata)
    video.addEventListener("timeupdate", onTimeUpdate)
    video.addEventListener("ended", onEnded)
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata)
      video.removeEventListener("timeupdate", onTimeUpdate)
      video.removeEventListener("ended", onEnded)
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
    }
  }, [useNative])

  // ── Sync speed to video ──
  useEffect(() => {
    const video = videoRef.current
    if (video && useNative) video.playbackRate = speed
  }, [speed, useNative])

  // ── Controls ──
  function togglePlayback() {
    if (useNative && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
      return
    }
    if (paused) {
      post({ type: "play" })
      setPaused(false)
    } else {
      post({ type: "pause" })
      setPaused(true)
    }
  }

  function seekTo(time: number) {
    const next = Math.max(0, Math.min(duration, time))
    if (useNative && videoRef.current) {
      videoRef.current.currentTime = next
      setCurrentTime(next)
      return
    }
    post({ type: "seek", time: next })
    setCurrentTime(next)
    setPaused(true)
  }

  function cycleSpeed() {
    const i = SPEEDS.indexOf(speed)
    const n = SPEEDS[(i + 1) % SPEEDS.length]
    setSpeed(n)
    if (!useNative) post({ type: "speed", speed: n })
  }

  function enterFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
  }

  const activeChapter = chapterIndex(currentTime)

  // ── Render native video player (YouTube-style) ──
  if (useNative && mp4Url) {
    return (
      <div
        ref={containerRef}
        className="relative w-full bg-zinc-950 rounded-2xl overflow-hidden shadow-lg border border-zinc-200 group"
        style={{ aspectRatio: "16/9" }}
      >
        <video
          ref={videoRef}
          src={mp4Url}
          className="absolute inset-0 h-full w-full object-contain bg-zinc-950"
          playsInline
          preload="metadata"
          controls={false}
          onClick={togglePlayback}
        />

        {/* Big play button overlay (visible when paused) */}
        {paused && (
          <button
            type="button"
            onClick={togglePlayback}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/40 transition hover:bg-zinc-950/50"
            aria-label={copy.play}
          >
            <span className="inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-2xl transition hover:scale-105 hover:bg-white">
              <Play size={24} className="ml-1" />
            </span>
          </button>
        )}

        {/* Chapters overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-2 mt-2 sm:mx-3 sm:mt-3 rounded-xl sm:rounded-2xl border border-white/15 bg-zinc-950/78 px-2.5 py-2 sm:px-4 sm:py-3 text-white shadow-2xl backdrop-blur-sm">
          <div className="pointer-events-auto mb-1.5 sm:mb-2 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.18em] text-zinc-300">
            <span>{copy.chapters}</span>
            <span className="hidden sm:inline truncate text-sky-200">
              {copy.now}: {lang === "ja" ? CHAPTERS[activeChapter].ja : CHAPTERS[activeChapter].en}
            </span>
          </div>
          <div className="pointer-events-auto grid grid-cols-5 gap-1 sm:gap-2">
            {CHAPTERS.map((chapter, index) => {
              const active = index === activeChapter
              const label = lang === "ja" ? chapter.ja : chapter.en
              return (
                <button
                  key={chapter.key}
                  type="button"
                  onClick={() => seekTo(chapter.start)}
                  aria-label={`${label}${lang === "ja" ? "へスキップ" : " skip"}`}
                  className={[
                    "grid gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border px-1.5 py-1.5 sm:px-2 sm:py-2 text-left transition",
                    active
                      ? "border-sky-300 bg-sky-300 text-zinc-950"
                      : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16",
                  ].join(" ")}
                >
                  <span className="truncate text-[8px] sm:text-[10px] font-black uppercase tracking-[0.08em] sm:tracking-[0.12em] opacity-70">
                    {formatTime(chapter.start)}
                  </span>
                  <span className="truncate text-[11px] sm:text-sm font-black">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Controls overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-2 mb-2 sm:mx-3 sm:mb-3">
          <div className="pointer-events-auto grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/15 bg-zinc-950/88 px-3 py-2.5 sm:px-4 sm:py-3 text-white shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100"
                aria-label={paused ? copy.play : copy.pause}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                type="button"
                onClick={() => seekTo(0)}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
                aria-label={copy.replay}
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-zinc-300">
              <span className="w-8 sm:w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={Math.min(currentTime, duration)}
                onChange={(e) => seekTo(Number(e.target.value))}
                onMouseDown={() => {
                  if (useNative && videoRef.current) videoRef.current.pause()
                }}
                onMouseUp={() => {
                  if (useNative && videoRef.current && !paused)
                    videoRef.current.play().catch(() => {})
                }}
                className="h-1.5 w-full accent-sky-400"
                aria-label={copy.timeline}
              />
              <span className="w-8 sm:w-10 tabular-nums">{formatTime(duration)}</span>
            </label>
            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={cycleSpeed}
                className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 sm:px-3 text-[10px] sm:text-xs font-bold text-white transition hover:bg-white/14"
              >
                <Gauge size={12} className="sm:w-[14px] sm:h-[14px]" /> {speed}x
              </button>
              <button
                type="button"
                onClick={enterFullscreen}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
                aria-label={copy.fullscreen}
              >
                <Maximize2 size={12} className="sm:w-[14px] sm:h-[14px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render iframe fallback (HyperFrames) ──
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg" style={{ aspectRatio: "16/9" }}>
      <iframe
        ref={iframeRef}
        src={`${src}?autoplay=1&embedded=1`}
        className="absolute inset-0 h-full w-full border-0"
        title={lang === "ja" ? "診断動画" : "Diagnostic video"}
        allow="autoplay; fullscreen; picture-in-picture"
      />

      {/* Chapters overlay */}
      <div className="absolute inset-x-0 top-0 z-20 mx-2 mt-2 sm:mx-3 sm:mt-3 rounded-xl sm:rounded-2xl border border-white/15 bg-zinc-950/78 px-2.5 py-2 sm:px-4 sm:py-3 text-white shadow-2xl backdrop-blur-sm">
        <div className="mb-1.5 sm:mb-2 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.18em] text-zinc-300">
          <span>{copy.chapters}</span>
          <span className="hidden sm:inline truncate text-sky-200">
            {copy.now}: {lang === "ja" ? CHAPTERS[activeChapter].ja : CHAPTERS[activeChapter].en}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {CHAPTERS.map((chapter, index) => {
            const active = index === activeChapter
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button
                key={chapter.key}
                type="button"
                onClick={() => seekTo(chapter.start)}
                aria-label={`${label}${lang === "ja" ? "へスキップ" : " skip"}`}
                className={[
                  "grid gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border px-1.5 py-1.5 sm:px-2 sm:py-2 text-left transition",
                  active
                    ? "border-sky-300 bg-sky-300 text-zinc-950"
                    : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16",
                ].join(" ")}
              >
                <span className="truncate text-[8px] sm:text-[10px] font-black uppercase tracking-[0.08em] sm:tracking-[0.12em] opacity-70">
                  {formatTime(chapter.start)}
                </span>
                <span className="truncate text-[11px] sm:text-sm font-black">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 z-20 mx-2 mb-2 sm:mx-3 sm:mb-3">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/15 bg-zinc-950/88 px-3 py-2.5 sm:px-4 sm:py-3 text-white shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100"
              aria-label={paused ? copy.play : copy.pause}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              type="button"
              onClick={() => seekTo(0)}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
              aria-label={copy.replay}
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-zinc-300">
            <span className="w-8 sm:w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={0.1}
              value={Math.min(currentTime, duration)}
              onChange={(e) => {
                setCurrentTime(Number(e.target.value))
                post({ type: "seek", time: Number(e.target.value) })
              }}
              className="h-1.5 w-full accent-sky-400"
              aria-label={copy.timeline}
            />
            <span className="w-8 sm:w-10 tabular-nums">{formatTime(duration)}</span>
          </label>
          <div className="flex items-center justify-end gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={cycleSpeed}
              className="inline-flex h-8 sm:h-9 items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 sm:px-3 text-[10px] sm:text-xs font-bold text-white transition hover:bg-white/14"
            >
              <Gauge size={12} className="sm:w-[14px] sm:h-[14px]" /> {speed}x
            </button>
            <button
              type="button"
              onClick={() => iframeRef.current?.requestFullscreen?.()}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14"
              aria-label={copy.fullscreen}
            >
              <Maximize2 size={12} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
