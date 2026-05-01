"use client"
/**
 * paradigmjp.com /[locale]/report/[slug] — 顧客向け診断/提案レポート公開ページ (canonical)
 *
 * 永久ルール (Appexxme CLAUDE.md s10-4 同期・両 repo 共通):
 *   ・顧客向けページは paradigmjp.com 配下が原則
 *   ・URL は /report/[slug] が canonical (旧 /p/[slug] は shim 経由 redirect)
 *   ・Magic UI + i18n + Manifest 駆動 4 鉄則準拠
 *
 * sync source: Appexxme src/app/report/[token]/page.tsx の slug-first 部分のみ移植
 * (paradigm-HP の /report/[token] は別実装の token-based legacy page なので衝突なし・
 *  /[locale]/report/[slug] と /report/[token] は別 path・問題ない)
 */

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
// 2026-05-01 audit: AllInOneClient.tsx (2123 行) retire — ProposalRenderer のみで動作。
// ?legacy=1 escape hatch も廃止。ProspectData 型は lib/proposal/prospect-data に移管済み。
import type { ProspectData } from "@/lib/proposal/prospect-data"
import ProposalRenderer from "@/components/proposal/ProposalRenderer"

export const dynamic = "force-dynamic"

export default function ReportPageWrapper() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<ProspectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const startTime = useRef(Date.now())

  // データ取得 (paradigmjp.com 内 API proxy 経由・H-2 2026-05-01)
  // 旧: 顧客ブラウザから直接 appexx.me を叩いていたが、ユーザ制約 "appexx.me 表示禁止" 違反
  // 新: 相対パス /api/sales-automation → paradigmjp.com 内で server-side proxy or 直接 Supabase fetch
  useEffect(() => {
    if (!slug) return
    fetch("/api/sales-automation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_prospect", slug }),
    }).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      const p = d.prospect
      const tpl = d.template || {}
      const demoData = p.demo_data || {}
      setData({
        diagnostic_report: d.diagnostic_report || null,
        id: p.id, slug: p.slug,
        business_name: p.business_name || "",
        category: p.category || "",
        address: p.address || "",
        rating: p.rating || 0, review_count: p.review_count || 0,
        unanswered_reviews: p.unanswered_reviews || 0,
        unanswered_english: p.unanswered_english || 0,
        reply_rate: p.reply_rate || 0,
        competitor_avg_reply_rate: p.competitor_avg_reply_rate || 78,
        competitor_avg_rating: 4.4,
        page_speed_mobile: p.page_speed_mobile || 0,
        page_speed_desktop: p.page_speed_desktop || 0,
        has_website: !!p.website_url,
        website_url: p.website_url || null,
        tech_stack: p.tech_stack || [],
        vulnerabilities: p.vulnerabilities || [],
        has_english_page: p.has_english_page || false,
        foreign_review_ratio: p.unanswered_english > 0 ? p.unanswered_english / Math.max(1, p.review_count) : 0,
        sample_reviews: [],
        ai_reply_samples: p.ai_reply_samples || [],
        loss_aversion_hook: p.loss_aversion_hook || "",
        estimated_monthly_loss: p.estimated_monthly_loss || 0,
        match_score: p.match_score || 0,
        primary_product: p.primary_product || "hp",
        demo_url: demoData.demo_url || "",
        report_url: demoData.report_url || "",
        ai_analysis: p.ai_analysis || null,
        review_analysis: p.review_analysis || null,
        competitor_analysis: p.competitor_analysis || null,
        has_sns: p.has_sns || false,
        has_ads: p.has_ads || false,
        phone: p.phone || "",
        email: p.email || "",
        visible_sections: p.visible_sections || undefined,
        template_accent: tpl.accent_color || tpl.accent2 || undefined,
        template_cta_text: tpl.cta_text || undefined,
        template_cta_url: tpl.cta_url || undefined,
        template_copy_tone: tpl.copy_tone || undefined,
        db_template: Object.keys(tpl).length > 0 ? tpl : undefined,
        demo_html: d.demo_html || undefined,
        matched_pattern: d.matched_pattern || undefined,
      })
      setLoading(false)
    }).catch(() => { setError("読み込みに失敗しました / Loading failed"); setLoading(false) })
  }, [slug])

  // 閲覧トラッキング (paradigmjp.com 内 API proxy 経由・H-2 2026-05-01)
  useEffect(() => {
    if (!slug || !data) return
    const send = () => {
      const sec = Math.round((Date.now() - startTime.current) / 1000)
      if (sec > 3) {
        navigator.sendBeacon("/api/demo-view", JSON.stringify({
          prospect_id: data.id, slug, duration_sec: sec,
          pattern_id: data.matched_pattern?.id || null,
          pattern_name: data.matched_pattern?.name || null,
        }))
      }
    }
    window.addEventListener("beforeunload", send)
    const timer = setTimeout(() => {
      fetch("/api/demo-view", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: data.id, slug, duration_sec: 30, pattern_id: data.matched_pattern?.id || null, pattern_name: data.matched_pattern?.name || null }),
      }).catch(() => {})
    }, 30000)
    return () => { window.removeEventListener("beforeunload", send); clearTimeout(timer) }
  }, [slug, data])

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFD", color: "#1e293b" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #635BFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: "#94a3b8" }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFD", color: "#1e293b" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🔒</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>{error || "Invalid URL"}</p>
      </div>
    </div>
  )

  // ProposalRenderer (Manifest-driven · 13 sections) のみで動作。
  return <ProposalRenderer data={data} />
}
