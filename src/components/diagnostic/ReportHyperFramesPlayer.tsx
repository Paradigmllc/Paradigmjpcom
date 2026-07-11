"use client"

import { Gauge, Maximize2, Pause, Play, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ReportLang } from "./report-copy"

const SPEEDS = [1, 1.25, 1.5, 2] as const
const CHAPTERS = [
  { start: 0, key: "brief", ja: "要点", en: "Brief" },
  { start: 7, key: "evidence", ja: "根拠", en: "Evidence" },
  { start: 14, key: "loss", ja: "損失", en: "Leakage" },
  { start: 21, key: "future", ja: "改善後", en: "Future" },
  { start: 28, key: "action", ja: "次アクション", en: "Action" },
] as const

type PlaybackSpeed = (typeof SPEEDS)[number]

type PlayerCopy = {
  play: string
  pause: string
  replay: string
  speed: string
  fullscreen: string
  timeline: string
  chapters: string
  now: string
}

function formatTime(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`
}

function chapterIndex(time: number): number {
  let active = 0
  CHAPTERS.forEach((chapter, index) => {
    if (time >= chapter.start) active = index
  })
  return active
}

function ChapterOverlay({
  activeChapter,
  lang,
  copy,
  seekTo,
}: {
  activeChapter: number
  lang: ReportLang
  copy: PlayerCopy
  seekTo: (time: number) => void
}) {
  const active = CHAPTERS[activeChapter]
  const activeLabel = lang === "ja" ? active.ja : active.en

  return (
    <>
      <div className="pointer-events-none absolute left-2 right-2 top-2 z-20 sm:hidden">
        <button
          type="button"
          onClick={() => seekTo(active.start)}
          className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-zinc-950/70 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-sm"
          aria-label={`${copy.chapters}: ${activeLabel}`}
        >
          <span className="text-[9px] font-bold uppercase text-zinc-300">{copy.chapters}</span>
          <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-sky-100">
            {formatTime(active.start)}
          </span>
          <span className="truncate text-[11px] font-black">{activeLabel}</span>
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-3 mt-3 hidden rounded-2xl border border-white/15 bg-zinc-950/78 px-4 py-3 text-white shadow-2xl backdrop-blur-sm sm:block">
        <div className="pointer-events-auto mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300">
          <span>{copy.chapters}</span>
          <span className="truncate text-sky-200">
            {copy.now}: {activeLabel}
          </span>
        </div>
        <div className="pointer-events-auto grid grid-cols-5 gap-2">
          {CHAPTERS.map((chapter, index) => {
            const activeItem = index === activeChapter
            const label = lang === "ja" ? chapter.ja : chapter.en
            return (
              <button
                key={chapter.key}
                type="button"
                onClick={() => seekTo(chapter.start)}
                aria-label={`${label}${lang === "ja" ? "へ移動" : " skip"}`}
                className={[
                  "grid gap-1 rounded-xl border px-2 py-2 text-left transition",
                  activeItem
                    ? "border-sky-300 bg-sky-300 text-zinc-950"
                    : "border-white/10 bg-white/8 text-zinc-200 hover:border-sky-200 hover:bg-white/16",
                ].join(" ")}
              >
                <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {formatTime(chapter.start)}
                </span>
                <span className="truncate text-sm font-black">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function PlayerControls({
  copy,
  paused,
  currentTime,
  duration,
  speed,
  togglePlayback,
  seekTo,
  cycleSpeed,
  enterFullscreen,
  onScrubStart,
  onScrubEnd,
}: {
  copy: PlayerCopy
  paused: boolean
  currentTime: number
  duration: number
  speed: PlaybackSpeed
  togglePlayback: () => void
  seekTo: (time: number) => void
  cycleSpeed: () => void
  enterFullscreen: () => void
  onScrubStart: () => void
  onScrubEnd: () => void
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-2 mb-2 sm:mx-3 sm:mb-3">
      <div className="pointer-events-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-white/15 bg-zinc-950/88 px-3 py-2.5 text-white shadow-2xl backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-950 transition hover:bg-sky-100 sm:h-9 sm:w-9"
            aria-label={paused ? copy.play : copy.pause}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            onClick={() => seekTo(0)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14 sm:h-9 sm:w-9"
            aria-label={copy.replay}
          >
            <RotateCcw size={13} />
          </button>
        </div>
        <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 text-[10px] font-semibold text-zinc-300 sm:gap-2 sm:text-xs">
          <span className="w-8 text-right tabular-nums sm:w-10">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.1}
            value={Math.min(currentTime, duration)}
            onChange={(e) => seekTo(Number(e.target.value))}
            onMouseDown={onScrubStart}
            onMouseUp={onScrubEnd}
            onTouchStart={onScrubStart}
            onTouchEnd={onScrubEnd}
            className="h-1.5 w-full accent-sky-400"
            aria-label={copy.timeline}
          />
          <span className="w-8 tabular-nums sm:w-10">{formatTime(duration)}</span>
        </label>
        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={cycleSpeed}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 text-[10px] font-bold text-white transition hover:bg-white/14 sm:h-9 sm:px-3 sm:text-xs"
            aria-label={copy.speed}
          >
            <Gauge size={12} className="sm:h-[14px] sm:w-[14px]" /> {speed}x
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition hover:bg-white/14 sm:h-9 sm:w-9"
            aria-label={copy.fullscreen}
          >
            <Maximize2 size={12} className="sm:h-[14px] sm:w-[14px]" />
          </button>
        </div>
      </div>
    </div>
  )
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
  const wasPlayingBeforeScrubRef = useRef(false)
  const [paused, setPaused] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(36)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [useNative, setUseNative] = useState(false)

  const copy: PlayerCopy = {
    play: lang === "ja" ? "再生" : "Play",
    pause: lang === "ja" ? "一時停止" : "Pause",
    replay: lang === "ja" ? "最初から" : "Replay",
    speed: lang === "ja" ? "速度" : "Speed",
    fullscreen: lang === "ja" ? "全画面" : "Fullscreen",
    timeline: lang === "ja" ? "再生位置" : "Timeline",
    chapters: lang === "ja" ? "目次" : "Chapters",
    now: lang === "ja" ? "再生中" : "Now",
  }

  function showMediaError(action: string, error: unknown) {
    console.error(`[report-video-player] ${action} failed:`, error)
    toast.error(lang === "ja" ? "動画の操作に失敗しました。" : "Video control failed.")
  }

  function playNativeVideo(video: HTMLVideoElement) {
    void video.play().catch((error) => showMediaError("play", error))
  }

  const post = useCallback((command: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "diagnostic-report-player", ...command },
      "*",
    )
  }, [])

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

  useEffect(() => {
    if (!mp4Url) return
    const frame = window.requestAnimationFrame(() => setUseNative(true))
    return () => window.cancelAnimationFrame(frame)
  }, [mp4Url])

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

  useEffect(() => {
    const video = videoRef.current
    if (video && useNative) video.playbackRate = speed
  }, [speed, useNative])

  function togglePlayback() {
    if (useNative && videoRef.current) {
      if (videoRef.current.paused) {
        playNativeVideo(videoRef.current)
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
    if (!el?.requestFullscreen) return
    void el.requestFullscreen().catch((error) => showMediaError("fullscreen", error))
  }

  function beginScrub() {
    if (!useNative || !videoRef.current) return
    wasPlayingBeforeScrubRef.current = !videoRef.current.paused
    videoRef.current.pause()
  }

  function endScrub() {
    if (!useNative || !videoRef.current) return
    if (wasPlayingBeforeScrubRef.current) playNativeVideo(videoRef.current)
    wasPlayingBeforeScrubRef.current = false
  }

  const activeChapter = chapterIndex(currentTime)

  const controls = (
    <PlayerControls
      copy={copy}
      paused={paused}
      currentTime={currentTime}
      duration={duration}
      speed={speed}
      togglePlayback={togglePlayback}
      seekTo={seekTo}
      cycleSpeed={cycleSpeed}
      enterFullscreen={enterFullscreen}
      onScrubStart={beginScrub}
      onScrubEnd={endScrub}
    />
  )

  if (useNative && mp4Url) {
    return (
      <div
        ref={containerRef}
        className="group relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg"
      >
        <div className="relative w-full pb-[56.25%]">
        <video
          ref={videoRef}
          src={mp4Url}
          className="absolute inset-0 h-full w-full bg-zinc-950 object-contain"
          playsInline
          disableRemotePlayback
          preload="metadata"
          controls={false}
          onClick={togglePlayback}
          {...{ "webkit-playsinline": "true" }}
          {...{ "x-webkit-airplay": "deny" }}
        />
        </div>

        {paused && (
          <button
            type="button"
            onClick={togglePlayback}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/40 transition hover:bg-zinc-950/50"
            aria-label={copy.play}
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-2xl transition hover:scale-105 hover:bg-white sm:h-16 sm:w-16">
              <Play size={24} className="ml-1" />
            </span>
          </button>
        )}

        <ChapterOverlay activeChapter={activeChapter} lang={lang} copy={copy} seekTo={seekTo} />
        {controls}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg"
    >
      <div className="relative w-full pb-[56.25%]">
      <iframe
        ref={iframeRef}
        src={`${src}?autoplay=1&embedded=1`}
        className="absolute inset-0 h-full w-full border-0"
        title={lang === "ja" ? "診断動画" : "Diagnostic video"}
        allow="autoplay; fullscreen; picture-in-picture"
      />
      </div>
      <ChapterOverlay activeChapter={activeChapter} lang={lang} copy={copy} seekTo={seekTo} />
      {controls}
    </div>
  )
}
