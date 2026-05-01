"use client"

/**
 * DemoClient — /d/[slug] のクライアント側 (iframe + パーソナライズ + トラッキング)
 *
 * H-2-6 (2026-05-01): server component から html を受け取って描画。
 * すべての fetch は paradigmjp.com 内の相対パス経由 (appexx.me 通信ゼロ)。
 */

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"

interface Props {
  demoId: string
  slug: string
  name: string
  html: string
}

export default function DemoClient({ demoId, slug, name, html: htmlInitial }: Props) {
  const searchParams = useSearchParams()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [startTime] = useState(Date.now())
  const [html, setHtml] = useState(htmlInitial)

  // パーソナライズ: ?name=田中 で企業名差し替え
  useEffect(() => {
    const customName = searchParams.get("name")
    if (!customName || !htmlInitial) return
    let h = htmlInitial
    h = h.replace(/\{\{business_name\}\}/g, customName)
    h = h.replace(/サンプル企業/g, customName)
    h = h.replace(/株式会社〇〇/g, customName)
    setHtml(h)
  }, [htmlInitial, searchParams])

  // 閲覧時間トラッキング (paradigmjp.com 内 endpoint)
  useEffect(() => {
    const beacon = () => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      navigator.sendBeacon("/api/demo-view", JSON.stringify({
        demo_id: demoId, slug, duration_sec: duration,
        device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      }))
    }
    window.addEventListener("beforeunload", beacon)
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      fetch("/api/demo-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_id: demoId, slug, duration_sec: duration }),
      }).catch(() => {})
    }, 30000)
    return () => {
      window.removeEventListener("beforeunload", beacon)
      clearInterval(interval)
    }
  }, [demoId, startTime, slug])

  // CTA クリックトラッキング (iframe same-origin 限定)
  useEffect(() => {
    if (!iframeRef.current) return
    const handler = () => {
      fetch("/api/demo-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo_id: demoId, slug, cta_clicked: true,
          duration_sec: Math.floor((Date.now() - startTime) / 1000),
        }),
      }).catch(() => {})
    }
    try {
      iframeRef.current.contentDocument?.addEventListener("click", (e) => {
        const target = e.target as HTMLElement
        if (
          target.tagName === "A" || target.closest("a") ||
          target.tagName === "BUTTON" || target.closest("button")
        ) {
          handler()
        }
      })
    } catch {
      // cross-origin: トラッキング不可 (期待動作)
    }
  }, [demoId, startTime, slug, html])

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }
        #__next { height: 100%; }
      `}</style>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title={name}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          background: "#fff",
        }}
      />
    </>
  )
}
