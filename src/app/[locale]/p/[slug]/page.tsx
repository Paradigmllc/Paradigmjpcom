"use client"

/**
 * paradigmjp.com /[locale]/p/[slug] — DEPRECATED redirect shim → /[locale]/report/[slug]
 *
 * 2026-04-30 ユーザ指示: 「/p/ ではなく /report/ 配下で統一」
 * 顧客向けページは canonical = /[locale]/report/[slug]。本 shim は 3 ヶ月後
 * (2026-07-30 目安) に 404 化予定。
 *
 * Why client-side redirect:
 *   2026-05-01 audit: AllInOneClient.tsx (2123 行) は retire 済み。本 shim は
 *   redirect だけの薄い client component。useEffect で client redirect・query string 保持。
 */

import { useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"

export const dynamic = "force-dynamic"

export default function ProposalSlugShim() {
  const { locale, slug } = useParams<{ locale: string; slug: string }>()
  const search = useSearchParams()

  useEffect(() => {
    if (!slug || !locale) return
    const qs = search?.toString()
    const target = `/${locale}/report/${slug}${qs ? `?${qs}` : ""}`
    window.location.replace(target)
  }, [locale, slug, search])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFD", color: "#1e293b" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #635BFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: "#94a3b8" }}>Redirecting to /report/...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
