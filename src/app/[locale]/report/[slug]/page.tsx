"use client"
/**
 * paradigmjp.com /[locale]/report/[slug] — 顧客向け診断/提案レポート公開ページ (canonical)
 *
 * 永久ルール (Appexxme CLAUDE.md s10-4 同期・両 repo 共通):
 *   ・顧客向けページは paradigmjp.com 配下が原則
 *   ・URL は /report/[slug] が canonical (旧 /p/[slug] は shim 経由 redirect)
 *   ・Magic UI + i18n + Manifest 駆動 4 鉄則準拠
 *
 * H-2 (2026-05-01): 2-stage dispatcher 実装
 *   Stage 0: cms_content_blocks (V3 Phase 3-B canonical) → BlocksReportRenderer
 *   Stage 1: proposal_pages (V2 ProposalRenderer)
 *   Stage 2: error
 *
 * P18-A-FIX-1 (2026-05-08): V1 token 再統合
 *   slug が UUID-36 形式なら Stage 0 より前に V1 (diagnostic_reports) を試行し、
 *   ヒット時は report row → ProspectData minimal mapping → ProposalRenderer で描画。
 *   `/[locale]/report/[token]` orphan 削除後の旧 token URL 互換性確保 (404 防止)。
 *   API `/api/report/[slug]` は維持・閲覧トラッキング/HOT 検出も継続発火。
 *
 * D-11 R5 (2026-05-08): リサーチレポート級 12 block 対応
 *   paradigm-blocks v0.5.1+ で 5 research-grade block (cover_summary / methodology /
 *   industry_context / risk_quantification / appendix_references) + 7 narrative block
 *   を BlocksReportRenderer 経由で自動 dispatch (BlockRenderer の switch case 拡張済).
 *   依存関係: github:Paradigmllc/paradigm-blocks#main で次回 deploy 時に auto-fetch.
 *   appexxme composer v2 (composeReportWithPersonalize_v2) が cms_content_blocks に
 *   新 12 block JSON を書き込んだ時点で本ページが新 UI で render される.
 *   Citation cross-ref `[N]` ↔ `#ref-N` anchor は AppendixReferences 内で実装済.
 *   詳細 spec → docs/knowledge/diagnostic-report-research-grade-spec.md (appexxme)
 *   全面監査 → docs/audit/whole-sales-os-holistic-2026-05-08.md (appexxme)
 */

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import type { ProspectData } from "@/lib/proposal/prospect-data"
import type { ContentDoc } from "@paradigmllc/blocks/types"
import ProposalRenderer from "@/components/proposal/ProposalRenderer"
import { BlocksReportRenderer } from "@paradigmllc/blocks"

export const dynamic = "force-dynamic"

export default function ReportPageWrapper() {
  const { slug, locale } = useParams<{ slug: string; locale: string }>()
  const [data, setData] = useState<ProspectData | null>(null)
  const [blocksDoc, setBlocksDoc] = useState<ContentDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const startTime = useRef(Date.now())

  // データ取得 (2-stage dispatcher・H-2 2026-05-01)
  // Stage 0: cms_content_blocks (V3 Phase 3-B) → Stage 1: proposal_pages (V2)
  // 全 fetch は paradigmjp.com 内 API proxy 経由 (顧客ブラウザは appexx.me と通信しない)
  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      // ── Stage -1) V1 token 互換 (P18-A-FIX-1 2026-05-08) ───────────
      // UUID-36 形式 (8-4-4-4-12 hex) のみ V1 を試行。短い slug は V2/V3 のみ。
      const isUuid =
        slug.length === 36 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
      if (isUuid) {
        try {
          const rV1 = await fetch(`/api/report/${slug}`, { cache: "no-store" })
          if (!cancelled && rV1.ok) {
            const dV1 = await rV1.json()
            const r = dV1?.report
            if (r && r.token) {
              // diagnostic_reports row → ProspectData minimal mapping
              setData({
                diagnostic_report: r,
                id: r.id,
                slug: r.token,
                business_name: r.business_name || "",
                category: r.category || "",
                address: r.address || "",
                rating: r.rating || 0,
                review_count: r.review_count || 0,
                unanswered_reviews: r.unanswered_reviews || 0,
                unanswered_english: r.unanswered_english || 0,
                reply_rate: r.reply_rate || 0,
                competitor_avg_reply_rate: r.competitor_avg_reply_rate || 78,
                competitor_avg_rating: 4.4,
                page_speed_mobile: r.page_speed_mobile || 0,
                page_speed_desktop: r.page_speed_desktop || 0,
                has_website: !!r.website_url,
                website_url: r.website_url || null,
                tech_stack: r.tech_stack || [],
                vulnerabilities: r.vulnerabilities || [],
                has_english_page: r.has_english_page || false,
                foreign_review_ratio: 0,
                sample_reviews: [],
                ai_reply_samples: r.ai_reply_samples || [],
                loss_aversion_hook: r.loss_aversion_hook || "",
                estimated_monthly_loss: r.estimated_monthly_loss || 0,
                match_score: r.match_score || 0,
                primary_product: r.primary_product || "hp",
                demo_url: r.demo_url || "",
                report_url: r.report_url || "",
                ai_analysis: r.ai_analysis || null,
                review_analysis: r.review_analysis || null,
                competitor_analysis: r.competitor_analysis || null,
                has_sns: r.has_sns || false,
                has_ads: r.has_ads || false,
                phone: r.phone || "",
                email: r.email || "",
                visible_sections: r.visible_sections || undefined,
              })
              setLoading(false)
              return
            }
          } else if (!cancelled && rV1.status !== 404 && rV1.status !== 410) {
            console.warn(`[paradigm-hp/report] V1 unexpected status: ${rV1.status}`)
          }
        } catch (e) {
          console.warn("[paradigm-hp/report] V1 fetch failed, falling to V2/V3:", e)
        }
        if (cancelled) return
      }

      // ── Stage 0) cms_content_blocks (V3 canonical) ─────────────────
      try {
        const r0 = await fetch(`/api/content-blocks/${slug}`, { cache: "no-store" })
        if (!cancelled && r0.ok) {
          const d0 = await r0.json()
          if (d0 && !d0.error && Array.isArray(d0.blocks) && d0.blocks.length > 0) {
            setBlocksDoc(d0 as ContentDoc)
            setLoading(false)
            return
          }
          if (!cancelled) console.info("[paradigm-hp/report] stage0 empty, falling to stage1")
        } else if (!cancelled && r0.status !== 404) {
          console.warn(`[paradigm-hp/report] stage0 unexpected status: ${r0.status}`)
        }
      } catch (e) {
        console.warn("[paradigm-hp/report] stage0 fetch failed:", e)
      }
      if (cancelled) return

      // ── Stage 1) proposal_pages (V2 ProposalRenderer) ──────────────
      try {
        const r1 = await fetch("/api/sales-automation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_prospect", slug }),
        })
        const d = await r1.json()
        if (cancelled) return
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
      } catch (e) {
        console.error("[paradigm-hp/report] stage1 fetch failed:", e)
        if (!cancelled) {
          setError("読み込みに失敗しました / Loading failed")
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
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

  // Stage 0) cms_content_blocks ヒット → BlocksReportRenderer (V3 Phase 3-B canonical)
  if (blocksDoc) return (
    <>
      <BlocksReportRenderer doc={blocksDoc} slugOrToken={slug} />
      <MvpTrackingInjection meta={(blocksDoc as { meta?: { tracking?: TrackingMeta } }).meta?.tracking} locale={locale} />
    </>
  )

  // Stage 1) proposal_pages ヒット → ProposalRenderer V2 (Manifest-driven · 13 sections)
  if (data) return <ProposalRenderer data={data} />

  // ── helper end ──

  // Stage 2) どちらも該当なし → エラー
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFD", color: "#1e293b" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🔒</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>{error || "Invalid URL"}</p>
      </div>
    </div>
  )
}

// ── B36-P3: MVP tracking injection (pixel + CTA + footer links) ────────
interface TrackingMeta {
  pixel_url: string
  cta_url: string
  optout_url: string
  privacy_url: string
  lead_id: string
  run_id: string
  generated_at: string
}

// 12-language CTA copy (Phase 6 i18n 徹底)
type Lang = "ja" | "en" | "ko" | "zh" | "es" | "pt" | "ru" | "ar" | "vi" | "id" | "de" | "fr"
const TRACKING_COPY: Record<Lang, { heading: string; subheading: string; cta: string; optout: string; privacy: string }> = {
  ja: { heading: "所見をご一緒に確認しませんか?", subheading: "診断結果について、当社のシニアコンサルタントが 30 分のオンラインセッションで詳細をご説明いたします。\n無料・参加義務なし・その場での意思決定は不要です。", cta: "📅 セッションを予約する", optout: "配信停止", privacy: "プライバシーポリシー" },
  en: { heading: "Want to review the findings together?", subheading: "Our senior consultant will walk you through the diagnostic results in a 30-min online session.\nFree · no commitment · no decision required on the spot.", cta: "📅 Book a session", optout: "Unsubscribe", privacy: "Privacy Policy" },
  ko: { heading: "발견사항을 함께 확인하시겠어요?", subheading: "당사의 시니어 컨설턴트가 30분 온라인 세션에서 진단 결과를 자세히 설명해드립니다.\n무료 · 참여 의무 없음 · 즉시 의사결정 불필요.", cta: "📅 세션 예약하기", optout: "수신 거부", privacy: "개인정보 보호정책" },
  zh: { heading: "想一起查看诊断结果吗?", subheading: "我们的资深顾问将在 30 分钟在线会议中详细解读诊断结果。\n免费 · 无义务 · 无需当场决策。", cta: "📅 预约会议", optout: "退订", privacy: "隐私政策" },
  es: { heading: "¿Quiere revisar los hallazgos juntos?", subheading: "Nuestro consultor senior le explicará los resultados del diagnóstico en una sesión online de 30 minutos.\nGratis · sin compromiso · sin necesidad de decidir en el momento.", cta: "📅 Reservar sesión", optout: "Darse de baja", privacy: "Política de privacidad" },
  pt: { heading: "Gostaria de revisar os achados juntos?", subheading: "Nosso consultor sênior explicará os resultados do diagnóstico em uma sessão online de 30 minutos.\nGrátis · sem compromisso · sem necessidade de decisão no momento.", cta: "📅 Agendar sessão", optout: "Cancelar inscrição", privacy: "Política de Privacidade" },
  ru: { heading: "Хотите рассмотреть результаты вместе?", subheading: "Наш старший консультант подробно расскажет о результатах диагностики в 30-минутной онлайн-сессии.\nБесплатно · без обязательств · решение принимать сразу не требуется.", cta: "📅 Записаться на сессию", optout: "Отписаться", privacy: "Политика конфиденциальности" },
  ar: { heading: "هل تودون مراجعة النتائج معاً؟", subheading: "سيقوم مستشارنا الكبير بشرح نتائج التشخيص بالتفصيل في جلسة عبر الإنترنت لمدة 30 دقيقة.\nمجاني · بدون التزام · لا يلزم اتخاذ قرار في الحال.", cta: "📅 احجز جلسة", optout: "إلغاء الاشتراك", privacy: "سياسة الخصوصية" },
  vi: { heading: "Cùng xem xét kết quả?", subheading: "Chuyên gia cấp cao của chúng tôi sẽ giải thích chi tiết kết quả chẩn đoán trong phiên online 30 phút.\nMiễn phí · không cam kết · không cần quyết định ngay.", cta: "📅 Đặt lịch", optout: "Hủy đăng ký", privacy: "Chính sách bảo mật" },
  id: { heading: "Mau telaah hasilnya bersama?", subheading: "Konsultan senior kami akan menjelaskan hasil diagnostik secara detail dalam sesi online 30 menit.\nGratis · tanpa kewajiban · tidak perlu memutuskan saat itu juga.", cta: "📅 Pesan sesi", optout: "Berhenti berlangganan", privacy: "Kebijakan Privasi" },
  de: { heading: "Befunde gemeinsam besprechen?", subheading: "Unser Senior-Berater erläutert die Diagnoseergebnisse in einer 30-minütigen Online-Sitzung.\nKostenlos · unverbindlich · keine Entscheidung vor Ort erforderlich.", cta: "📅 Termin buchen", optout: "Abmelden", privacy: "Datenschutz" },
  fr: { heading: "Examinons les résultats ensemble?", subheading: "Notre consultant senior vous expliquera les résultats du diagnostic en 30 minutes en visioconférence.\nGratuit · sans engagement · aucune décision à prendre sur le moment.", cta: "📅 Réserver une session", optout: "Se désabonner", privacy: "Politique de confidentialité" },
}

function MvpTrackingInjection({ meta, locale }: { meta?: TrackingMeta; locale?: string }) {
  if (!meta) return null
  // meta.tracking には language 直接無いので親 page locale を使う (i18n route は /[locale])
  const lang = (locale && (locale in TRACKING_COPY)) ? (locale as Lang) : "en"
  const copy = TRACKING_COPY[lang]
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.pixel_url} alt="" width={1} height={1} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
      <section style={{ maxWidth: 720, margin: "48px auto 32px", padding: "32px 24px", textAlign: "center", borderTop: "1px solid #E2E8F0" }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#0F172A" }}>{copy.heading}</h3>
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 20, lineHeight: 1.7, whiteSpace: "pre-line" }}>{copy.subheading}</p>
        <a href={meta.cta_url} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", padding: "12px 32px", background: "#635BFF", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          {copy.cta}
        </a>
        <div style={{ marginTop: 32, fontSize: 11, color: "#94A3B8" }}>
          <a href={meta.optout_url} style={{ color: "#94A3B8", textDecoration: "underline", marginRight: 16 }}>{copy.optout}</a>
          <a href={meta.privacy_url} target="_blank" rel="noopener noreferrer" style={{ color: "#94A3B8", textDecoration: "underline" }}>{copy.privacy}</a>
        </div>
      </section>
    </>
  )
}
