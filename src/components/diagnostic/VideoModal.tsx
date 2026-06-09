"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface Props {
  videoHref: string
  lang: string
}

export default function VideoModal({ videoHref, lang }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Video thumbnail CTA */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block overflow-hidden rounded-2xl border border-zinc-200 shadow-lg bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 transition-shadow hover:shadow-xl w-full text-left"
      >
        <div className="aspect-video flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.15)_0%,transparent_70%)]" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-transform group-hover:scale-110 group-hover:bg-white/20">
              <svg width="32" height="36" viewBox="0 0 32 36" fill="white">
                <path d="M0 0v36l32-18z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {lang === "ja" ? "60秒診断動画を見る" : "Watch 60-Second Diagnostic"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {lang === "ja" ? "クリックで再生" : "Click to play"}
              </p>
            </div>
          </div>
        </div>
      </button>

      {/* Fullscreen modal */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={lang === "ja" ? "閉じる" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Video iframe — autoplays via GSAP in the HTML */}
          <div
            className="relative w-full max-w-[90vw] aspect-video rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={videoHref}
              className="w-full h-full"
              allow="autoplay"
              title={lang === "ja" ? "60秒診断動画" : "60-second diagnostic video"}
            />
          </div>
        </div>
      )}
    </>
  )
}
