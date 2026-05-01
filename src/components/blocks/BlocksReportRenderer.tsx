"use client"

// ─── BlocksReportRenderer — cms_content_blocks 専用 公開ページラッパー ──
// Phase 3-B (2026-05-01)
//
// `/report/[slug]` の Stage 0 (cms_content_blocks ヒット) で使用される薄い wrapper。
// 役割:
//   - BlockRenderer で blocks 描画
//   - Footer を統一 (©Paradigm + Confidential)
//   - 滞在時間トラッキング (sendBeacon /api/report/[slug])
//   - CTA クリックトラッキング (data-cta-track 属性付き <a> を捕捉)
//
// 設計:
//   - 親 (/report/[token]/page.tsx) で fetch 済みの ContentDoc を受け取るだけ
//   - 重複ロード回避のため fetch は親に委譲
//   - region は ContentDoc.region から取得 (null の場合は ja default)

import { useEffect, useRef } from "react"
import type { ContentDoc } from "./types"
import { BlockRenderer } from "./BlockRenderer"
import type { SalesRegion } from "@/lib/stores/sales-region"
import { isValidRegion } from "@/lib/stores/sales-region"

interface Props {
  doc: ContentDoc
  /** /report/[token] に渡された URL identifier (slug or token) */
  slugOrToken: string
}

export default function BlocksReportRenderer({ doc, slugOrToken }: Props) {
  const startTime = useRef(Date.now())
  const region: SalesRegion = isValidRegion(doc.region) ? doc.region : "ja"

  // 滞在時間トラッキング (V1/V2 と同じ /api/report/[token] エンドポイント)
  useEffect(() => {
    const sendDuration = () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000)
      if (seconds > 3) {
        try {
          navigator.sendBeacon(
            `/api/report/${slugOrToken}`,
            JSON.stringify({ duration_seconds: seconds }),
          )
        } catch {
          // sendBeacon 失敗時は静かに諦める (V1/V2 と同挙動)
        }
      }
    }
    window.addEventListener("beforeunload", sendDuration)
    return () => window.removeEventListener("beforeunload", sendDuration)
  }, [slugOrToken])

  // CTA クリックトラッキング (BlockRenderer 配下の <a> で data-cta-track="1" を持つもの)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const link = target.closest<HTMLAnchorElement>("a[data-cta-track]")
      if (!link) return
      const source = link.getAttribute("data-cta-source") || "block_cta"
      try {
        fetch("/api/cta-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: slugOrToken, source }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        // noop — トラッキング失敗で遷移は止めない
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [slugOrToken])

  return (
    <div
      className="min-h-screen bg-white"
      dir={region === "ar" ? "rtl" : "ltr"}
      data-cms-slug={doc.slug}
      data-page-type={doc.page_type}
    >
      <BlockRenderer blocks={doc.blocks} region={region} />

      <footer className="border-t border-gray-100 mt-8 py-6 text-center">
        <p className="text-[10px] text-gray-400">
          © {new Date().getFullYear()} Paradigm合同会社
        </p>
        {doc.title && (
          <p className="text-[10px] text-gray-400 mt-1">
            Confidential — {doc.title}
          </p>
        )}
      </footer>
    </div>
  )
}
