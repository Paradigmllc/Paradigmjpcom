"use client"

import { useEffect, useRef, useState } from "react"
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

  useEffect(() => {
    const customName = searchParams.get("name")
    if (!customName || !htmlInitial) return
    setHtml(htmlInitial.replace(/\{\{business_name\}\}/g, customName))
  }, [htmlInitial, searchParams])

  useEffect(() => {
    const track = (payload: Record<string, unknown>) => {
      fetch("/api/demo-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.warn("[demo-view] tracking failed:", error)
      })
    }

    const durationPayload = () => ({
      demo_id: demoId,
      slug,
      duration_sec: Math.floor((Date.now() - startTime) / 1000),
      device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
    })

    const beacon = () => {
      navigator.sendBeacon("/api/demo-view", JSON.stringify(durationPayload()))
    }
    window.addEventListener("beforeunload", beacon)
    const interval = setInterval(() => track(durationPayload()), 30000)
    return () => {
      window.removeEventListener("beforeunload", beacon)
      clearInterval(interval)
    }
  }, [demoId, startTime, slug])

  useEffect(() => {
    const documentRef = iframeRef.current?.contentDocument
    if (!documentRef) return
    const handler = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!target) return
      if (target.tagName === "A" || target.closest("a") || target.tagName === "BUTTON" || target.closest("button")) {
        fetch("/api/demo-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            demo_id: demoId,
            slug,
            cta_clicked: true,
            duration_sec: Math.floor((Date.now() - startTime) / 1000),
          }),
        }).catch((error) => {
          console.warn("[demo-view] cta tracking failed:", error)
        })
      }
    }
    try {
      documentRef.addEventListener("click", handler)
      return () => documentRef.removeEventListener("click", handler)
    } catch (error) {
      console.warn("[demo-view] iframe click tracking unavailable:", error)
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
