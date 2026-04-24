"use client"

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react"
import { matchTemplateWithDB, applyPatternToTemplate, type ProposalTemplate, type DemoTab, type PagePattern } from "@/lib/proposal-templates"

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
export interface ProspectData {
  id?: string
  slug?: string
  business_name: string
  category: string
  address: string
  rating: number
  review_count: number
  unanswered_reviews: number
  unanswered_english: number
  reply_rate: number
  competitor_avg_reply_rate: number
  competitor_avg_rating: number
  page_speed_mobile: number
  page_speed_desktop: number
  has_website: boolean
  website_url: string | null
  tech_stack: string[]
  vulnerabilities: { name: string; desc: string; level: "critical" | "high" | "mid" }[]
  has_english_page: boolean
  foreign_review_ratio: number
  sample_reviews: string[]
  ai_reply_samples: { original: string; reply: string }[]
  loss_aversion_hook: string
  estimated_monthly_loss: number
  match_score: number
  primary_product: string
  demo_url?: string
  report_url?: string
  ai_analysis?: { summary: string; strengths?: string[]; weaknesses?: string[] } | null
  review_analysis?: { strengths?: string[]; weaknesses?: string[]; suggestions?: string[] } | null
  competitor_analysis?: { competitors?: Array<{ name: string; score: number }> } | null
  has_sns?: boolean
  has_ads?: boolean
  phone?: string
  email?: string
  visible_sections?: Record<string, boolean>
  template_accent?: string
  template_cta_text?: string
  template_cta_url?: string
  template_copy_tone?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db_template?: Record<string, any>
  demo_html?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matched_pattern?: Record<string, any>
}

// ═══════════════════════════════════════════════════════════════
// 商材名マッピング + 概算予算
// ═══════════════════════════════════════════════════════════════
const PRODUCT_INFO: Record<string, { name: string; desc: string; budget: string; features: string[] }> = {
  hp: { name: "ホームページ制作", desc: "集客に強いモダンなビジネスサイト", budget: "¥300,000〜¥800,000", features: ["レスポンシブ対応", "SEO最適化", "お問い合わせフォーム", "CMS管理画面"] },
  lp: { name: "ランディングページ制作", desc: "コンバージョン特化の1ページサイト", budget: "¥150,000〜¥400,000", features: ["A/Bテスト対応", "CTA最適化", "スマホファースト", "高速表示"] },
  meo: { name: "MEO対策（Googleマップ集客）", desc: "地域検索で上位表示を実現", budget: "¥30,000〜¥80,000/月", features: ["Googleビジネスプロフィール最適化", "口コミ返信代行", "投稿運用", "順位レポート"] },
  geo: { name: "GEO対策（AI検索最適化）", desc: "ChatGPT・Gemini等のAI検索で推薦される対策", budget: "¥50,000〜¥150,000/月", features: ["構造化データ対応", "E-E-A-T強化", "AI引用最適化", "ナレッジグラフ対策"] },
  ec: { name: "ECサイト構築", desc: "売上を最大化するオンラインショップ", budget: "¥500,000〜¥1,500,000", features: ["決済連携", "在庫管理", "マーケティング自動化", "分析ダッシュボード"] },
  seo: { name: "SEO対策", desc: "検索エンジンからの集客を最大化", budget: "¥50,000〜¥200,000/月", features: ["キーワード戦略", "コンテンツSEO", "テクニカルSEO", "月次レポート"] },
  saas: { name: "SaaS/業務システム開発", desc: "業務効率化のためのクラウドシステム", budget: "¥1,000,000〜¥5,000,000", features: ["カスタム開発", "API連携", "ダッシュボード", "保守運用"] },
  sns: { name: "SNS運用代行", desc: "フォロワー獲得とエンゲージメント向上", budget: "¥100,000〜¥300,000/月", features: ["投稿企画・制作", "広告運用", "分析レポート", "インフルエンサー連携"] },
  dx: { name: "DX支援コンサルティング", desc: "デジタル変革で業務を革新", budget: "¥200,000〜¥500,000/月", features: ["業務分析", "ツール選定", "導入支援", "社内研修"] },
}
const getProductInfo = (key: string) => PRODUCT_INFO[key] || PRODUCT_INFO.hp

// ═══════════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════════
const DEFAULT: ProspectData = {
  business_name: "サンプル企業",
  category: "飲食店",
  address: "東京都渋谷区神南 1-2-3",
  rating: 3.8, review_count: 124,
  unanswered_reviews: 31, unanswered_english: 12,
  reply_rate: 12,
  competitor_avg_reply_rate: 78,
  competitor_avg_rating: 4.4,
  page_speed_mobile: 34, page_speed_desktop: 56,
  has_website: true, website_url: "https://example.com",
  tech_stack: ["WordPress 5.2", "PHP 7.2", "jQuery 1.x"],
  vulnerabilities: [
    { name: "SSL証明書の期限切れ", desc: "「安全でないサイト」と表示されます。", level: "critical" },
    { name: "CMSバージョンの脆弱性", desc: "既知のセキュリティ問題が含まれています。", level: "high" },
    { name: "HTTPリダイレクト未設定", desc: "HTTPSに自動転送されていません。", level: "mid" },
  ],
  has_english_page: false, foreign_review_ratio: 0.23,
  sample_reviews: [],
  ai_reply_samples: [
    { original: "The sushi was amazing but we couldn't reserve in English.", reply: "Thank you! We now offer English reservation support on our new website." },
    { original: "素材は最高だけど、ウェブサイトが古くて予約しにくい", reply: "貴重なご意見ありがとうございます。オンライン予約システムを刷新中です。" },
  ],
  loss_aversion_hook: "近隣の競合は平均78%の口コミに返信していますが、御社は12%。月間推定¥280,000の機会損失が生じています。",
  estimated_monthly_loss: 280000,
  match_score: 87,
  primary_product: "hp",
}

// ═══════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════
function useCountUp(target: number, dur: number, go: boolean) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!go) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      setV(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [go, target, dur])
  return v
}

function useVisible(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [v, setV] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref, threshold])
  return v
}

function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const h = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? window.scrollY / max : 0)
    }
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])
  return p
}

// ─── セクションラッパー: スタッガーフェードイン ───
function AnimSection({ children, className = "", delay = 0, style }: { children: React.ReactNode; className?: string; delay?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useVisible(ref, 0.08)
  return (
    <div ref={ref} className={`pp-anim-section ${vis ? "pp-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  )
}

const VULN_COLORS = {
  critical: { color: "#DC2626", bg: "rgba(220,38,38,.06)", border: "rgba(220,38,38,.15)", label: "重大" },
  high: { color: "#D97706", bg: "rgba(217,119,6,.06)", border: "rgba(217,119,6,.15)", label: "注意" },
  mid: { color: "#2563EB", bg: "rgba(37,99,235,.06)", border: "rgba(37,99,235,.15)", label: "軽微" },
}

// ═══════════════════════════════════════════════════════════════
// 1. Navigation — 桜花ナビ
// ═══════════════════════════════════════════════════════════════
function Nav({ name, accent }: { name: string; accent: string }) {
  const [scrolled, setScrolled] = useState(false)
  const progress = useScrollProgress()
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])

  return (
    <nav className="pp-nav" data-scrolled={scrolled}>
      <div className="pp-nav-inner">
        <div className="pp-nav-brand">
          <div className="pp-nav-logo" style={{ background: accent }}>P</div>
          <span className="pp-nav-name">{name}様へのご提案</span>
        </div>
        <div className="pp-nav-links">
          {[
            { href: "#hero", label: "概要" },
            { href: "#analysis", label: "分析" },
            { href: "#demo", label: "制作イメージ" },
            { href: "#opportunity", label: "改善効果" },
            { href: "#market", label: "市場動向" },
            { href: "#results", label: "実績" },
            { href: "#whyus", label: "選ばれる理由" },
            { href: "#contact", label: "ご相談" },
          ].map(l => (
            <a key={l.href} href={l.href} className="pp-nav-link">{l.label}</a>
          ))}
        </div>
      </div>
      <div className="pp-progress" style={{ width: `${progress * 100}%`, background: accent }} />
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2. Hero — 桜アニメーション + タイピング
// ═══════════════════════════════════════════════════════════════
function HeroSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const accent = d.template_accent || tpl.accent
  const [typed, setTyped] = useState("")
  const fullText = d.business_name

  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(iv)
    }, 60)
    return () => clearInterval(iv)
  }, [fullText])

  return (
    <section id="hero" className="pp-hero">
      {/* 桜の花びらアニメーション */}
      <div className="pp-sakura-container">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="pp-sakura" style={{
            left: `${(i * 13 + 5) % 100}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${6 + (i % 5) * 1.5}s`,
            fontSize: `${10 + (i % 4) * 3}px`,
            opacity: 0.3 + (i % 3) * 0.15,
          }}>🌸</div>
        ))}
      </div>

      <div className="pp-hero-content">
        <div className="pp-badge" style={{ borderColor: `${accent}30`, color: accent }}>
          <span className="pp-badge-dot" style={{ background: accent }} />
          御社専用にカスタマイズされたご提案
        </div>

        <h1 className="pp-hero-title">
          <span style={{ color: accent }}>{typed}</span>
          <span className="pp-cursor">|</span>
          <br />
          <span className="pp-hero-title-sub">様へのご提案書</span>
        </h1>

        {/* 商材名タグ */}
        <div className="pp-product-tag" style={{ background: `${accent}08`, border: `1.5px solid ${accent}20` }}>
          <span className="pp-product-icon" style={{ background: accent }}>📋</span>
          <div>
            <div className="pp-product-name" style={{ color: accent }}>{getProductInfo(d.primary_product).name}のご提案</div>
            <div className="pp-product-desc">{getProductInfo(d.primary_product).desc}</div>
          </div>
        </div>

        <p className="pp-hero-sub">
          {tpl.hook_sub || "御社のウェブサイト・口コミ・デジタル環境をAIが徹底分析し、最適な改善プランをご用意しました。"}
        </p>

        {/* Key metrics */}
        <div className="pp-hero-metrics">
          {[
            { val: `${d.rating}`, label: "Google評点", sub: `競合平均 ${d.competitor_avg_rating}`, warn: d.rating < d.competitor_avg_rating },
            { val: `${d.page_speed_mobile}`, label: "モバイル速度", sub: "100点満点", warn: d.page_speed_mobile < 50 },
            { val: `${d.reply_rate}%`, label: "口コミ返信率", sub: `競合平均 ${d.competitor_avg_reply_rate}%`, warn: d.reply_rate < d.competitor_avg_reply_rate },
          ].map(m => (
            <div key={m.label} className={`pp-hero-metric ${m.warn ? "warn" : ""}`}>
              <div className="pp-hero-metric-val" style={m.warn ? { color: "#DC2626" } : { color: accent }}>{m.val}</div>
              <div className="pp-hero-metric-label">{m.label}</div>
              <div className="pp-hero-metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="pp-scroll-hint">
          <span>SCROLL</span>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none"><path d="M6 1v16M1 11l5 6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3. 診断結果 — 現状の詳細分析（返報性: 圧倒的データ量）
// ═══════════════════════════════════════════════════════════════
function DiagnosisSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useVisible(ref)
  const accent = d.template_accent || tpl.accent

  const checks = [
    { label: "ウェブサイト", ok: d.has_website, icon: "🌐", detail: d.has_website ? `${d.website_url || "検出済み"}` : "ウェブサイトが見つかりません" },
    { label: "SSL/セキュリティ", ok: d.vulnerabilities.length === 0, icon: "🔒", detail: d.vulnerabilities.length === 0 ? "問題なし" : `${d.vulnerabilities.length}件の問題を検出` },
    { label: "モバイル表示速度", ok: d.page_speed_mobile >= 50, icon: "📱", detail: `${d.page_speed_mobile}/100点（推奨: 50以上）` },
    { label: "口コミ管理", ok: d.reply_rate >= 50, icon: "💬", detail: `返信率 ${d.reply_rate}%（${d.unanswered_reviews}件未返信）` },
    { label: "多言語対応", ok: d.has_english_page, icon: "🌍", detail: d.has_english_page ? "英語ページ確認済み" : `外国語レビュー ${Math.round(d.foreign_review_ratio * 100)}% — 対応なし` },
    { label: "SNS活用", ok: d.has_sns, icon: "📲", detail: d.has_sns ? "SNSアカウント検出" : "主要SNSでの存在なし" },
    { label: "デスクトップ速度", ok: d.page_speed_desktop >= 60, icon: "🖥️", detail: `${d.page_speed_desktop}/100点` },
    { label: "広告運用", ok: d.has_ads, icon: "📣", detail: d.has_ads ? "広告運用を検出" : "広告配信なし" },
  ]
  const passCount = checks.filter(c => c.ok).length
  const score = Math.round((passCount / checks.length) * 100)
  const scoreColor = score >= 60 ? "#16A34A" : score >= 30 ? "#D97706" : "#DC2626"
  const animatedScore = useCountUp(score, 1400, vis)

  return (
    <section id="analysis" ref={ref} className="pp-section pp-section-cream">
      <div className="pp-inner">
        <AnimSection>
          <span className="pp-section-label" style={{ color: accent }}>ANALYSIS</span>
          <h2 className="pp-h2">
            {tpl.pain_headline ? <span style={{ color: accent }}>{tpl.pain_headline}</span> : <>御社の<span style={{ color: accent }}>デジタル診断結果</span></>}
          </h2>
          <p className="pp-lead">{tpl.pain_desc || "ウェブサイト、口コミ、セキュリティなど8項目をAIが自動診断しました。"}</p>
        </AnimSection>

        <AnimSection delay={0.15}>
          <div className="pp-diag-wrap">
            {/* スコアリング */}
            <div className="pp-diag-score">
              <div className="pp-diag-ring" style={{
                background: `conic-gradient(${scoreColor} ${(vis ? score : 0) * 3.6}deg, #f1f5f9 0deg)`,
                transition: "background 1.5s cubic-bezier(.22,1,.36,1)",
              }}>
                <div className="pp-diag-ring-center">
                  <span className="pp-diag-ring-num" style={{ color: scoreColor }}>{animatedScore}</span>
                  <span className="pp-diag-ring-label">/ 100</span>
                </div>
              </div>
              <p className="pp-diag-score-text">
                {score >= 60 ? "良好な状態です" : score >= 30 ? "改善の余地があります" : "早急な対応をお勧めします"}
              </p>
            </div>

            {/* チェック項目 */}
            <div className="pp-diag-list">
              {checks.map((c, i) => (
                <div key={c.label} className={`pp-diag-item ${vis ? "pp-stagger-in" : ""}`} style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                  <span className="pp-diag-icon">{c.icon}</span>
                  <div className="pp-diag-info">
                    <span className="pp-diag-label">{c.label}</span>
                    <span className="pp-diag-detail">{c.detail}</span>
                  </div>
                  <span className={`pp-diag-badge ${c.ok ? "ok" : "ng"}`}>
                    {c.ok ? "✓ 良好" : "✗ 要改善"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimSection>

        {/* AI分析コメント */}
        {d.ai_analysis?.summary && (
          <AnimSection delay={0.3}>
            <div className="pp-insight-card">
              <div className="pp-insight-icon">🤖</div>
              <div>
                <div className="pp-insight-title">AI分析コメント</div>
                <p className="pp-insight-text">{d.ai_analysis.summary}</p>
                {d.ai_analysis.strengths && d.ai_analysis.strengths.length > 0 && (
                  <div className="pp-insight-tags">
                    <span className="pp-insight-tag ok">強み:</span>
                    {d.ai_analysis.strengths.map((s, i) => <span key={i} className="pp-insight-tag ok">{s}</span>)}
                  </div>
                )}
                {d.ai_analysis.weaknesses && d.ai_analysis.weaknesses.length > 0 && (
                  <div className="pp-insight-tags">
                    <span className="pp-insight-tag ng">課題:</span>
                    {d.ai_analysis.weaknesses.map((w, i) => <span key={i} className="pp-insight-tag ng">{w}</span>)}
                  </div>
                )}
              </div>
            </div>
          </AnimSection>
        )}

        {/* 技術スタック */}
        {d.tech_stack.length > 0 && (
          <AnimSection delay={0.35}>
            <div className="pp-tech-card">
              <div className="pp-tech-title">検出された技術スタック</div>
              <div className="pp-tech-tags">
                {d.tech_stack.map(t => (
                  <span key={t} className="pp-tech-tag">{t}</span>
                ))}
              </div>
            </div>
          </AnimSection>
        )}

        {/* 脆弱性 */}
        {d.vulnerabilities.length > 0 && (
          <AnimSection delay={0.4}>
            <div className="pp-alerts">
              <div className="pp-alerts-title">⚠️ 検出された問題点</div>
              {d.vulnerabilities.map((v, i) => (
                <div key={i} className="pp-alert" style={{ borderLeftColor: VULN_COLORS[v.level].color }}>
                  <span className="pp-alert-level" style={{ color: VULN_COLORS[v.level].color, background: VULN_COLORS[v.level].bg }}>{VULN_COLORS[v.level].label}</span>
                  <div>
                    <div className="pp-alert-name">{v.name}</div>
                    <p className="pp-alert-desc">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimSection>
        )}

        {/* 口コミ分析 */}
        {d.review_analysis && (d.review_analysis.strengths?.length || d.review_analysis.weaknesses?.length) && (
          <AnimSection delay={0.45}>
            <div className="pp-review-analysis">
              <div className="pp-review-title">📊 口コミ分析レポート（{d.review_count}件を分析）</div>
              <div className="pp-review-grid">
                {d.review_analysis.strengths && d.review_analysis.strengths.length > 0 && (
                  <div className="pp-review-col positive">
                    <div className="pp-review-col-title">👍 お客様が評価するポイント</div>
                    {d.review_analysis.strengths.map((s, i) => <div key={i} className="pp-review-item">✓ {s}</div>)}
                  </div>
                )}
                {d.review_analysis.weaknesses && d.review_analysis.weaknesses.length > 0 && (
                  <div className="pp-review-col negative">
                    <div className="pp-review-col-title">⚡ 改善すると効果が出るポイント</div>
                    {d.review_analysis.weaknesses.map((w, i) => <div key={i} className="pp-review-item">→ {w}</div>)}
                  </div>
                )}
              </div>
              {d.review_analysis.suggestions && d.review_analysis.suggestions.length > 0 && (
                <div className="pp-review-suggestions">
                  <div className="pp-review-col-title">💡 AI提案</div>
                  {d.review_analysis.suggestions.map((s, i) => <div key={i} className="pp-review-item">{i + 1}. {s}</div>)}
                </div>
              )}
            </div>
          </AnimSection>
        )}

        {d.report_url && (
          <AnimSection delay={0.5}>
            <a href={d.report_url} target="_blank" rel="noopener noreferrer" className="pp-report-link" style={{ color: accent, borderColor: `${accent}30` }}>
              📋 詳細な診断レポートを見る →
            </a>
          </AnimSection>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 4. デモ — 制作イメージ（返報性の中核: 無料で制作済み）
// ═══════════════════════════════════════════════════════════════
function DemoSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const [tab, setTab] = useState(tpl.demo_tabs[0]?.key || "home")
  const [iframeH, setIframeH] = useState(480)
  const accent = d.template_accent || tpl.accent
  const hasDemoHtml = !!d.demo_html

  useEffect(() => {
    if (!hasDemoHtml) return
    const h = (e: MessageEvent) => {
      if (e.data?.type === "demo-resize" && typeof e.data.height === "number") setIframeH(Math.min(Math.max(e.data.height, 300), 900))
    }
    window.addEventListener("message", h)
    return () => window.removeEventListener("message", h)
  }, [hasDemoHtml])

  const srcDoc = useMemo(() => {
    if (!d.demo_html) return ""
    const script = `<script>new ResizeObserver(()=>{parent.postMessage({type:"demo-resize",height:document.body.scrollHeight},"*")}).observe(document.body);window.addEventListener("load",()=>{parent.postMessage({type:"demo-resize",height:document.body.scrollHeight},"*")});</script>`
    return d.demo_html.includes("</body>") ? d.demo_html.replace("</body>", `${script}</body>`) : d.demo_html + script
  }, [d.demo_html])

  const currentTab = tpl.demo_tabs.find(t => t.key === tab) || tpl.demo_tabs[0]

  return (
    <section id="demo" className="pp-section">
      <div className="pp-inner">
        <AnimSection>
          <span className="pp-section-label" style={{ color: accent }}>PREVIEW</span>
          <h2 className="pp-h2">
            {tpl.reciprocity_headline ? (
              <span style={{ color: accent }}>{tpl.reciprocity_headline}</span>
            ) : (
              <>{d.business_name}様専用の<br /><span style={{ color: accent }}>制作イメージ</span></>
            )}
          </h2>
          <p className="pp-lead">
            御社の業種・立地・顧客層をもとに、実際にサイトを組み立てました。<br />
            下のプレビューでご確認ください。
          </p>
        </AnimSection>

        <AnimSection delay={0.15}>
          <div className="pp-browser">
            <div className="pp-browser-bar">
              <div className="pp-browser-dots">
                {["#FF5F57","#FEBC2E","#28C840"].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .8 }} />
                ))}
              </div>
              <div className="pp-browser-url">
                {d.business_name.toLowerCase().replace(/\s+/g,"").replace(/[^\w]/g,"")}.com
              </div>
              <div className="pp-browser-flags">{["🇯🇵","🇺🇸","🇨🇳"].map(f => <span key={f}>{f}</span>)}</div>
            </div>

            {hasDemoHtml ? (
              <iframe srcDoc={srcDoc} title="デモサイト" style={{ width: "100%", height: iframeH, border: "none", display: "block", background: "#fff" }} sandbox="allow-scripts allow-same-origin" />
            ) : (
              <>
                <div className="pp-browser-tabs">
                  {tpl.demo_tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`pp-browser-tab ${tab === t.key ? "active" : ""}`} style={tab === t.key ? { background: `${accent}10`, color: accent, borderBottomColor: accent } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="pp-browser-body">
                  <DemoTabRenderer tab={currentTab} d={d} accent={accent} />
                </div>
              </>
            )}
          </div>
        </AnimSection>

        {d.demo_url && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <a href={d.demo_url} target="_blank" rel="noopener noreferrer" className="pp-btn-primary" style={{ background: accent }}>
              🖥️ フルデモサイトを見る →
            </a>
          </div>
        )}

        {tpl.badge_features.length > 0 && (
          <AnimSection delay={0.3}>
            <div className="pp-features">
              {tpl.badge_features.map(f => (
                <div key={f.title} className="pp-feature">
                  <span style={{ fontSize: 22 }}>{f.icon}</span>
                  <div>
                    <div className="pp-feature-t">{f.title}</div>
                    <div className="pp-feature-s">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </AnimSection>
        )}
      </div>
    </section>
  )
}

// ─── 汎用デモタブレンダラー ───
function DemoTabRenderer({ tab, d, accent }: { tab: DemoTab; d: ProspectData; accent: string }) {
  const c = tab.content || {}
  const font = "'Noto Sans JP', sans-serif"

  if (tab.key === "home") {
    const tagline = c.tagline || d.category?.toUpperCase() || "BUSINESS"
    const navBtns = c.nav_buttons || ["サービス", "お問い合わせ", "会社概要"]
    const cards = c.info_cards || [["🕐", "営業時間"], ["📍", "アクセス"], ["📞", "お問い合わせ"], ["📅", "ご予約"]]
    const tags = c.feature_tags || ["🇯🇵 日本語", "🇺🇸 English", "⚡ Speed 91", "🔒 SSL"]

    return (
      <div style={{ fontFamily: font }}>
        <div style={{ padding: "48px 36px 36px", background: `linear-gradient(135deg, #0A2540, ${accent}30)`, color: "#fff" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: 3, marginBottom: 8 }}>{tagline}</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>{d.business_name}</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {navBtns.map((l, i) => (
              <span key={l} style={{ padding: "8px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: i === 0 ? accent : "rgba(255,255,255,.1)", cursor: "pointer" }}>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, padding: "10px 36px", background: "#f9fafb", borderBottom: "1px solid #eee", flexWrap: "wrap", fontSize: 11, color: "#666" }}>
          {tags.map(f => <span key={f}>{f}</span>)}
        </div>
        <div style={{ padding: "20px 36px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {cards.map(([ic, t]) => (
            <div key={t} style={{ border: "1px solid #eee", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#333" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{ic}</div>{t}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab.key === "reviews") {
    const heading = c.review_heading || "AI返信サンプル（自動生成）"
    return (
      <div style={{ padding: "20px 28px", fontFamily: font }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 14 }}>{heading}</div>
        {d.ai_reply_samples.slice(0, 2).map((s, i) => (
          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", marginBottom: 12, fontSize: 12 }}>
            <div style={{ color: "#888", marginBottom: 8, lineHeight: 1.5 }}>📝 &quot;{s.original.slice(0, 60)}...&quot;</div>
            <div style={{ color: "#0A6649", borderLeft: `3px solid ${accent}`, paddingLeft: 10, lineHeight: 1.6 }}>✓ {s.reply.slice(0, 90)}...</div>
          </div>
        ))}
      </div>
    )
  }

  const menuItems = c.menu_items || [
    { name: "スタンダードプラン", price: "¥8,800/月", tag: "人気No.1" },
    { name: "プロフェッショナル", price: "¥18,800/月", tag: "おすすめ" },
    { name: "エンタープライズ", price: "¥28,800/月", tag: "全機能" },
  ]
  return (
    <div style={{ padding: "20px 28px", fontFamily: font }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 14 }}>{tab.label}</div>
      {menuItems.map(item => (
        <div key={item.name} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#222" }}>{item.name}</div>
            <div style={{ fontSize: 10, color: "#999" }}>{item.tag}</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{item.price}</span>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 5. 改善の機会 — プロスペクト理論（損失回避）
// ═══════════════════════════════════════════════════════════════
function OpportunitySection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useVisible(ref)
  const accent = d.template_accent || tpl.accent
  const loss = useCountUp(d.estimated_monthly_loss, 1800, vis)
  const replyOwn = useCountUp(d.reply_rate, 900, vis)
  const replyComp = useCountUp(d.competitor_avg_reply_rate, 900, vis)

  return (
    <section id="opportunity" ref={ref} className="pp-section pp-section-cream">
      <div className="pp-inner">
        <AnimSection>
          <span className="pp-section-label" style={{ color: "#DC2626" }}>OPPORTUNITY</span>
          <h2 className="pp-h2">
            <span style={{ color: "#DC2626" }}>改善するだけで</span>、<br />
            これだけの効果が見込めます
          </h2>
        </AnimSection>

        <AnimSection delay={0.15}>
          <div className="pp-loss-card">
            <div className="pp-loss-label">月間の推定・改善効果額</div>
            <div className="pp-loss-num">¥{loss.toLocaleString()}</div>
            <p className="pp-loss-desc">{d.loss_aversion_hook}</p>
          </div>
        </AnimSection>

        <AnimSection delay={0.25}>
          <div className="pp-bars">
            <div className="pp-bars-title">口コミ返信率の比較</div>
            {[
              { label: `${d.business_name}（御社）`, val: replyOwn, color: "#DC2626", bold: true },
              { label: "近隣競合の平均", val: replyComp, color: "#16A34A", bold: false },
            ].map(row => (
              <div key={row.label} className="pp-bar-row">
                <div className="pp-bar-header">
                  <span style={{ fontWeight: row.bold ? 700 : 400, color: row.bold ? "#DC2626" : "#64748b" }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 800, fontSize: 18 }}>{row.val}%</span>
                </div>
                <div className="pp-bar-track">
                  <div className="pp-bar-fill" style={{ width: `${row.val}%`, background: row.color }} />
                </div>
              </div>
            ))}
            <p className="pp-bar-note">
              この差が月間来客に換算すると、推定<strong style={{ color: "#DC2626" }}> {Math.round((d.competitor_avg_reply_rate - d.reply_rate) * 0.5)}人の差</strong>になります
            </p>
          </div>
        </AnimSection>

        {/* 競合テーブル */}
        <AnimSection delay={0.35}>
          <div className="pp-table-wrap">
            <div className="pp-table-title">近隣競合との比較</div>
            <div className="pp-table">
              <div className="pp-table-head">
                {["店舗名","評点","返信率","速度","多言語"].map(h => <span key={h}>{h}</span>)}
              </div>
              {[
                { name: `${d.business_name}（御社）`, rating: d.rating, reply: d.reply_rate, speed: d.page_speed_mobile, english: d.has_english_page, self: true },
                { name: "近隣 A社", rating: +(d.competitor_avg_rating+.2).toFixed(1), reply: d.competitor_avg_reply_rate+8, speed: 74, english: true, self: false },
                { name: "近隣 B社", rating: d.competitor_avg_rating, reply: d.competitor_avg_reply_rate, speed: 69, english: true, self: false },
                { name: "近隣 C社", rating: +(d.competitor_avg_rating-.1).toFixed(1), reply: d.competitor_avg_reply_rate-7, speed: 64, english: false, self: false },
              ].map((r, i) => (
                <div key={i} className={`pp-table-row ${r.self ? "self" : ""}`}>
                  <span className="pp-table-name">{r.name}</span>
                  <span>{r.rating}</span>
                  <span style={{ fontWeight: 700, color: r.reply < 30 ? "#DC2626" : "#16A34A" }}>{r.reply}%</span>
                  <span style={{ color: r.speed < 50 ? "#DC2626" : "#64748b" }}>{r.speed}</span>
                  <span style={{ color: r.english ? "#16A34A" : "#DC2626" }}>{r.english ? "○" : "✗"}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimSection>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 6. 市場動向 — 追加データで返報性を最大化
// ═══════════════════════════════════════════════════════════════
function MarketSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const accent = d.template_accent || tpl.accent

  return (
    <section id="market" className="pp-section">
      <div className="pp-inner">
        <AnimSection>
          <span className="pp-section-label" style={{ color: accent }}>MARKET INSIGHT</span>
          <h2 className="pp-h2">
            <span style={{ color: accent }}>{d.category}</span>業界の<br />デジタル動向
          </h2>
        </AnimSection>

        <AnimSection delay={0.15}>
          <div className="pp-market-grid">
            <div className="pp-market-card">
              <div className="pp-market-icon">📈</div>
              <div className="pp-market-stat">73%</div>
              <div className="pp-market-label">消費者がGoogle検索で<br />お店を探す割合</div>
            </div>
            <div className="pp-market-card">
              <div className="pp-market-icon">⭐</div>
              <div className="pp-market-stat">4.1+</div>
              <div className="pp-market-label">来店の意思決定に<br />影響する最低評点</div>
            </div>
            <div className="pp-market-card">
              <div className="pp-market-icon">📱</div>
              <div className="pp-market-stat">68%</div>
              <div className="pp-market-label">スマホからの<br />サイト閲覧率</div>
            </div>
            <div className="pp-market-card">
              <div className="pp-market-icon">🌏</div>
              <div className="pp-market-stat">3,686万</div>
              <div className="pp-market-label">2024年の<br />訪日外国人数</div>
            </div>
          </div>
        </AnimSection>

        {/* AI返信サンプル */}
        {d.ai_reply_samples.length > 0 && (
          <AnimSection delay={0.3}>
            <div className="pp-reply-card">
              <div className="pp-reply-title">💬 AIが生成した口コミ返信サンプル</div>
              {d.ai_reply_samples.map((s, i) => (
                <div key={i} className="pp-reply-item">
                  <div className="pp-reply-original">📝 「{s.original}」</div>
                  <div className="pp-reply-ai" style={{ borderLeftColor: accent }}>
                    <span className="pp-reply-badge" style={{ background: `${accent}15`, color: accent }}>AI返信</span>
                    {s.reply}
                  </div>
                </div>
              ))}
            </div>
          </AnimSection>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 7. 導入実績 — バンドワゴン効果
// ═══════════════════════════════════════════════════════════════
function ResultsSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const accent = d.template_accent || tpl.accent

  return (
    <section id="results" className="pp-section pp-section-cream">
      <div className="pp-inner">
        <AnimSection>
          <span className="pp-section-label" style={{ color: accent }}>RESULTS</span>
          <h2 className="pp-h2">
            {tpl.bandwagon_headline
              ? <span style={{ color: accent }}>{tpl.bandwagon_headline}</span>
              : <>多くの企業様に<br /><span style={{ color: accent }}>ご利用いただいています</span></>
            }
          </h2>
        </AnimSection>

        <AnimSection delay={0.15}>
          <div className="pp-stats">
            {tpl.stats.map(s => (
              <div key={s.label} className="pp-stat">
                <div className="pp-stat-num" style={{ color: accent }}>{s.num}</div>
                <div className="pp-stat-label">{s.label}</div>
                <div className="pp-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </AnimSection>

        {tpl.testimonials.length > 0 && (
          <AnimSection delay={0.3}>
            <div className="pp-testimonials">
              {tpl.testimonials.map((t, i) => (
                <div key={i} className="pp-testimonial">
                  <div className="pp-testimonial-top">
                    <div className="pp-testimonial-avatar" style={{ background: `linear-gradient(135deg, ${accent}, ${tpl.accent2})` }}>{t.avatar}</div>
                    <div>
                      <div className="pp-testimonial-name">{t.name}</div>
                      <div className="pp-testimonial-biz">{t.biz}</div>
                    </div>
                  </div>
                  <div className="pp-testimonial-result" style={{ background: `${accent}08`, borderColor: `${accent}20`, color: accent }}>
                    ✓ {t.result}
                  </div>
                </div>
              ))}
            </div>
          </AnimSection>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 8. CTA — コンバージョン
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// 7.5 概算予算セクション
// ═══════════════════════════════════════════════════════════════
function WhyUsSection({ d, tpl }: { d: ProspectData; tpl: ProposalTemplate }) {
  const ref = useRef<HTMLDivElement>(null)
  const vis = useVisible(ref, 0.1)
  const accent = d.template_accent || tpl.accent

  const strengths = [
    { icon: "🤖", title: "AI × 人のハイブリッド", desc: "最新AI技術を活用しつつ、経験豊富なプロが品質を担保。効率と品質を両立。" },
    { icon: "📊", title: "データドリブンな改善提案", desc: "御社の課題をデータ分析で特定。感覚ではなく数値に基づいた施策をご提案。" },
    { icon: "⚡", title: "圧倒的なスピード", desc: "一般的な制作会社の半分以下の期間で納品。AIツール活用で工数を大幅削減。" },
    { icon: "🔄", title: "ワンストップ対応", desc: "Web制作・MEO・SEO・SNS・DXまで一社完結。複数社に依頼する手間とコストを削減。" },
    { icon: "💬", title: "伴走型サポート", desc: "納品して終わりではなく、効果測定・改善提案まで継続的にサポート。" },
    { icon: "🌏", title: "多言語・海外対応", desc: "英語・韓国語・中国語のコンテンツ制作やインバウンド集客にも対応可能。" },
  ]

  const comparison = [
    { item: "AI活用による効率化", us: true, a: false, b: false },
    { item: "データ分析に基づく改善提案", us: true, a: false, b: true },
    { item: "Web制作+マーケ一括対応", us: true, a: false, b: false },
    { item: "最短2週間の納品", us: true, a: false, b: false },
    { item: "納品後の伴走サポート", us: true, a: true, b: false },
    { item: "多言語・海外対応", us: true, a: false, b: false },
    { item: "成果レポートの定期提出", us: true, a: true, b: true },
    { item: "初期費用ゼロプランあり", us: true, a: false, b: true },
  ]

  return (
    <AnimSection>
      <section ref={ref} id="whyus" className="pp-whyus">
        <div className="pp-section-inner" style={{ maxWidth: 800 }}>
          <div className="pp-section-label" style={{ color: accent }}>WHY PARADIGM</div>
          <h2 className="pp-section-title">Paradigmが選ばれる理由</h2>
          <p className="pp-section-subtitle">他社にはない強みで、{d.business_name}様のビジネスを加速します</p>

          {/* 強み6つ */}
          <div className={`pp-whyus-grid ${vis ? "pp-visible" : ""}`}>
            {strengths.map((s, i) => (
              <div key={i} className="pp-whyus-card" style={{ borderColor: `${accent}15` }}>
                <div className="pp-whyus-icon" style={{ background: `${accent}08` }}>{s.icon}</div>
                <div className="pp-whyus-title">{s.title}</div>
                <div className="pp-whyus-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* 競合比較表 */}
          <div className={`pp-compare ${vis ? "pp-visible" : ""}`}>
            <h3 className="pp-compare-title">競合比較</h3>
            <div className="pp-compare-table">
              <div className="pp-compare-header">
                <div className="pp-compare-cell pp-compare-label" />
                <div className="pp-compare-cell pp-compare-us" style={{ background: accent, color: "#fff" }}>Paradigm</div>
                <div className="pp-compare-cell pp-compare-other">A社</div>
                <div className="pp-compare-cell pp-compare-other">B社</div>
              </div>
              {comparison.map((row, i) => (
                <div key={i} className="pp-compare-row">
                  <div className="pp-compare-cell pp-compare-label">{row.item}</div>
                  <div className="pp-compare-cell pp-compare-us-val" style={{ background: `${accent}06` }}>
                    <span style={{ color: accent, fontWeight: 800 }}>{row.us ? "○" : "—"}</span>
                  </div>
                  <div className="pp-compare-cell pp-compare-other-val">{row.a ? "○" : "—"}</div>
                  <div className="pp-compare-cell pp-compare-other-val">{row.b ? "○" : "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AnimSection>
  )
}

function CTASection({ d, onCta, tpl }: { d: ProspectData; onCta: () => void; tpl: ProposalTemplate }) {
  const accent = d.template_accent || tpl.accent
  const ctaUrl = d.template_cta_url || tpl.cta_url
  // 3モード: null=選択画面, "consult"=オンライン相談, "chat"=チャット, "docs"=資料請求
  const [mode, setMode] = useState<null | "consult" | "chat" | "docs">(null)
  const [formData, setFormData] = useState({ name: "", company: d.business_name || "", email: "", phone: "" })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  const handleSubmitConsult = async () => {
    if (!formData.name || !formData.email) return
    setSubmitting(true)
    onCta()
    // CTA クリック通知
    await fetch("/api/cta-click", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: d.id, slug: d.slug, action: "consult", contact: formData }),
    }).catch(() => {})
    setShowCalendar(true)
    setSubmitting(false)
  }

  const handleSubmitDocs = async () => {
    if (!formData.name || !formData.email) return
    setSubmitting(true)
    onCta()
    await fetch("/api/cta-click", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: d.id, slug: d.slug, action: "docs_request", contact: formData }),
    }).catch(() => {})
    setSubmitted(true)
    setSubmitting(false)
  }

  const openChat = () => {
    onCta()
    fetch("/api/cta-click", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: d.id, slug: d.slug, action: "chat" }),
    }).catch(() => {})
    // Difyチャットボットを開く
    const difyBtn = document.querySelector<HTMLElement>("[data-dify-btn]") || document.querySelector<HTMLElement>("#dify-chatbot-bubble-button")
    if (difyBtn) { difyBtn.click(); return }
    // Dify iframeをページ内に表示
    setMode("chat")
  }

  // フォームUI共通
  const ContactForm = ({ onSubmit, btnLabel, btnIcon }: { onSubmit: () => void; btnLabel: string; btnIcon: string }) => (
    <div className="pp-cta-form">
      <div className="pp-cta-form-row">
        <label>お名前 <span className="pp-required">*</span></label>
        <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          placeholder="山田 太郎" className="pp-cta-input" />
      </div>
      <div className="pp-cta-form-row">
        <label>会社名</label>
        <input type="text" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
          placeholder="株式会社〇〇" className="pp-cta-input" />
      </div>
      <div className="pp-cta-form-row">
        <label>メールアドレス <span className="pp-required">*</span></label>
        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
          placeholder="info@example.com" className="pp-cta-input" />
      </div>
      <div className="pp-cta-form-row">
        <label>電話番号</label>
        <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
          placeholder="090-0000-0000" className="pp-cta-input" />
      </div>
      <button onClick={onSubmit} disabled={submitting || !formData.name || !formData.email}
        className="pp-cta-btn" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, boxShadow: `0 12px 40px ${accent}25` }}>
        {submitting ? "送信中..." : `${btnIcon} ${btnLabel}`}
      </button>
      <button onClick={() => setMode(null)} className="pp-cta-back">← お問い合わせ方法を選びなおす</button>
    </div>
  )

  return (
    <section id="contact" className="pp-cta">
      {/* 桜 CTA */}
      <div className="pp-sakura-container pp-sakura-cta">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="pp-sakura" style={{
            left: `${(i * 19 + 10) % 100}%`,
            animationDelay: `${i * 1.2}s`,
            animationDuration: `${7 + (i % 4)}s`,
            fontSize: `${12 + (i % 3) * 3}px`,
            opacity: 0.2 + (i % 3) * 0.1,
          }}>🌸</div>
        ))}
      </div>

      {/* 左右に大きく散らす装飾 */}
      <div className="pp-cta-deco pp-cta-deco-left" style={{ background: `linear-gradient(135deg, ${accent}12, ${accent}06)` }}>
        <div className="pp-cta-deco-icon">👩‍💼</div>
      </div>
      <div className="pp-cta-deco pp-cta-deco-right" style={{ background: `linear-gradient(225deg, ${accent}12, ${accent}06)` }}>
        <div className="pp-cta-deco-icon">👨‍💻</div>
      </div>

      <div className="pp-cta-inner">
        <div className="pp-cta-badge-row">
          <span className="pp-cta-top-badge" style={{ background: `${accent}10`, color: accent, border: `1px solid ${accent}20` }}>✨ 初回無料相談 受付中</span>
        </div>

        <h2 className="pp-cta-title">まずは15分の<br />無料相談から</h2>
        <p className="pp-cta-lead">
          {tpl.cta_subtitle || "初期費用ゼロ・最低契約期間なし。設定はすべて弊社が対応いたします。"}
        </p>

        {/* === メインコンテンツ切り替え === */}

        {/* ① 3ボタン選択画面 */}
        {!mode && !submitted && (
          <div className="pp-cta-actions">
            <button onClick={() => setMode("consult")} className="pp-cta-action-card" style={{ borderColor: `${accent}25` }}>
              <div className="pp-cta-action-icon" style={{ background: `${accent}10`, color: accent }}>📅</div>
              <div className="pp-cta-action-title">15分オンライン相談</div>
              <div className="pp-cta-action-desc">日程を選んですぐ予約。<br />画面共有で具体的にご案内。</div>
              <div className="pp-cta-action-badge" style={{ background: `${accent}10`, color: accent }}>人気No.1</div>
            </button>

            <button onClick={openChat} className="pp-cta-action-card" style={{ borderColor: `${accent}25` }}>
              <div className="pp-cta-action-icon" style={{ background: "#10b98110", color: "#10b981" }}>💬</div>
              <div className="pp-cta-action-title">チャットで相談</div>
              <div className="pp-cta-action-desc">AIが即座に回答。<br />選択方式で簡単にご質問。</div>
              <div className="pp-cta-action-badge" style={{ background: "#10b98110", color: "#10b981" }}>即レス対応</div>
            </button>

            <button onClick={() => setMode("docs")} className="pp-cta-action-card" style={{ borderColor: `${accent}25` }}>
              <div className="pp-cta-action-icon" style={{ background: "#f59e0b10", color: "#f59e0b" }}>📄</div>
              <div className="pp-cta-action-title">資料請求</div>
              <div className="pp-cta-action-desc">詳しい提案資料を<br />メールでお届けします。</div>
              <div className="pp-cta-action-badge" style={{ background: "#f59e0b10", color: "#f59e0b" }}>PDF送付</div>
            </button>
          </div>
        )}

        {/* ② オンライン相談フォーム → Cal.com */}
        {mode === "consult" && !showCalendar && (
          <div className="pp-cta-mode-panel">
            <div className="pp-cta-mode-header">
              <span className="pp-cta-mode-icon" style={{ background: `${accent}10`, color: accent }}>📅</span>
              <div>
                <div className="pp-cta-mode-title">15分オンライン相談</div>
                <div className="pp-cta-mode-sub">ご情報をご入力後、日程をお選びください</div>
              </div>
            </div>
            <ContactForm onSubmit={handleSubmitConsult} btnLabel="日程を選択する" btnIcon="📅" />
          </div>
        )}

        {/* Cal.comカレンダー埋め込み */}
        {mode === "consult" && showCalendar && (
          <div className="pp-cta-mode-panel">
            <div className="pp-cta-mode-header">
              <span className="pp-cta-mode-icon" style={{ background: `${accent}10`, color: accent }}>📅</span>
              <div>
                <div className="pp-cta-mode-title">日程をお選びください</div>
                <div className="pp-cta-mode-sub">{formData.name}様、ご希望の日時をクリックしてください</div>
              </div>
            </div>
            <div className="pp-cta-calendar">
              <iframe
                src={`https://cal.appexx.me/paradigm/consultation?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&company=${encodeURIComponent(formData.company)}`}
                style={{ width: "100%", height: "520px", border: "none", borderRadius: "16px" }}
                title="日程予約"
              />
            </div>
            <div className="pp-cta-done" style={{ borderColor: `${accent}30`, background: `${accent}06`, marginTop: 16 }}>
              ✓ 予約が完了すると確認メールが届きます
            </div>
            <button onClick={() => { setMode(null); setShowCalendar(false) }} className="pp-cta-back">← 戻る</button>
          </div>
        )}

        {/* ③ チャット埋め込み */}
        {mode === "chat" && (
          <div className="pp-cta-mode-panel">
            <div className="pp-cta-mode-header">
              <span className="pp-cta-mode-icon" style={{ background: "#10b98110", color: "#10b981" }}>💬</span>
              <div>
                <div className="pp-cta-mode-title">AIチャットで相談</div>
                <div className="pp-cta-mode-sub">選択方式で簡単にご質問いただけます</div>
              </div>
            </div>
            <div className="pp-cta-chat">
              <iframe
                src="https://dify.appexx.me/chatbot/paradigm-consultation"
                style={{ width: "100%", height: "480px", border: "none", borderRadius: "16px" }}
                title="AIチャット"
              />
            </div>
            <button onClick={() => setMode(null)} className="pp-cta-back">← お問い合わせ方法を選びなおす</button>
          </div>
        )}

        {/* ④ 資料請求フォーム */}
        {mode === "docs" && !submitted && (
          <div className="pp-cta-mode-panel">
            <div className="pp-cta-mode-header">
              <span className="pp-cta-mode-icon" style={{ background: "#f59e0b10", color: "#f59e0b" }}>📄</span>
              <div>
                <div className="pp-cta-mode-title">資料請求</div>
                <div className="pp-cta-mode-sub">提案資料（PDF）をメールでお届けします</div>
              </div>
            </div>
            <ContactForm onSubmit={handleSubmitDocs} btnLabel="資料を受け取る" btnIcon="📄" />
          </div>
        )}

        {/* ⑤ 送信完了 */}
        {submitted && (
          <div className="pp-cta-mode-panel">
            <div className="pp-cta-complete" style={{ borderColor: `${accent}30`, background: `${accent}06` }}>
              <div className="pp-cta-complete-icon">✓</div>
              <div className="pp-cta-complete-title">ありがとうございます</div>
              <p className="pp-cta-complete-msg">
                {mode === "docs"
                  ? `${formData.email} 宛てに資料をお送りいたします。\n通常1営業日以内にお届けします。`
                  : "担当者より1営業日以内にご連絡いたします。"}
              </p>
            </div>
            <button onClick={() => { setMode(null); setSubmitted(false) }} className="pp-cta-back">← 他の方法でもご相談いただけます</button>
          </div>
        )}

        {/* 安心ポイント */}
        <div className="pp-cta-trust">
          {(tpl.trust_points?.length
            ? tpl.trust_points.map(tp => ({ icon: tp.slice(0, 2), text: tp.slice(2).trim() }))
            : [
                { icon: "🛡️", text: "個人情報は厳重に管理" },
                { icon: "⏱️", text: "15分のお電話で完結" },
                { icon: "🚫", text: "営業電話は一切なし" },
              ]
          ).map((t, i) => (
            <div key={i} className="pp-cta-trust-item">
              <span>{t.icon}</span><span>{t.text}</span>
            </div>
          ))}
        </div>

        <div className="pp-cta-badges">
          {["SSL暗号化通信", "相談無料", "秘密厳守"].map(b => (
            <span key={b} className="pp-cta-badge">🔒 {b}</span>
          ))}
        </div>

        <div className="pp-footer">
          Paradigm合同会社 · 東京都目黒区<br />
          info@paradigmjp.com · paradigmjp.com
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// Root
// ═══════════════════════════════════════════════════════════════
export default function PersuasionPage({ data }: { data?: ProspectData }) {
  const d = data ?? DEFAULT
  const tpl = useMemo(() => {
    const base = matchTemplateWithDB(d.category, d.db_template)
    if (d.matched_pattern?.template_data) {
      return applyPatternToTemplate(base, d.matched_pattern as unknown as PagePattern)
    }
    return base
  }, [d.category, d.db_template, d.matched_pattern])
  const vis = (key: string) => d.visible_sections?.[key] !== false
  const accent = d.template_accent || tpl.accent

  const handleCTA = useCallback(async () => {
    await fetch("/api/cta-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: d.id, slug: d.slug }),
    }).catch(() => {})
  }, [d.id, d.slug])

  useEffect(() => {
    const start = Date.now()
    return () => {
      const sec = Math.round((Date.now() - start) / 1000)
      navigator.sendBeacon?.("/api/demo-view", JSON.stringify({
        prospect_id: d.id, slug: d.slug, duration_sec: sec, cta_clicked: false,
      }))
    }
  }, [d.id, d.slug])

  return (
    <>
      <style>{STYLES(accent)}</style>
      <Nav name={d.business_name} accent={accent} />
      {vis("hook") && <HeroSection d={d} tpl={tpl} />}
      {vis("diagnostic") && <DiagnosisSection d={d} tpl={tpl} />}
      {vis("reciprocity") && <DemoSection d={d} tpl={tpl} />}
      {vis("prospect") && <OpportunitySection d={d} tpl={tpl} />}
      {vis("market") && <MarketSection d={d} tpl={tpl} />}
      {vis("bandwagon") && <ResultsSection d={d} tpl={tpl} />}
      {vis("cta") && <WhyUsSection d={d} tpl={tpl} />}
      {vis("cta") && <CTASection d={d} onCta={handleCTA} tpl={tpl} />}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Styles — ライトテーマ + 桜アニメーション
// ═══════════════════════════════════════════════════════════════
function STYLES(accent: string) {
  return `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{
  background:#FAFBFD;color:#1e293b;
  font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  overflow-x:hidden;font-feature-settings:'palt';line-height:1.7;
}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
@keyframes scaleIn{from{opacity:0;transform:scale(.94);}to{opacity:1;transform:scale(1);}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(.85);}}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(8px);}}
@keyframes sakuraFall{
  0%{transform:translateY(-60px) rotate(0deg) translateX(0);opacity:0;}
  10%{opacity:1;}
  90%{opacity:.6;}
  100%{transform:translateY(110vh) rotate(360deg) translateX(80px);opacity:0;}
}

.pp-anim-section{opacity:0;transform:translateY(20px);transition:all .7s cubic-bezier(.22,1,.36,1);}
.pp-anim-section.pp-visible{opacity:1;transform:translateY(0);}
.pp-stagger-in{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;}

::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${accent}30;border-radius:20px;}

/* ─── 桜アニメーション ─── */
.pp-sakura-container{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
.pp-sakura-cta{z-index:0;}
.pp-sakura{
  position:absolute;top:-40px;
  animation:sakuraFall linear infinite;
  filter:blur(0.5px);
}

/* ─── Nav ─── */
.pp-nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  background:rgba(255,255,255,.75);backdrop-filter:blur(20px) saturate(1.4);
  border-bottom:1px solid rgba(0,0,0,.06);transition:all .3s;
}
.pp-nav[data-scrolled="true"]{background:rgba(255,255,255,.95);box-shadow:0 2px 16px rgba(0,0,0,.06);}
.pp-nav-inner{max-width:1060px;margin:0 auto;padding:0 clamp(16px,3vw,32px);height:52px;display:flex;align-items:center;justify-content:space-between;}
.pp-nav-brand{display:flex;align-items:center;gap:10px;}
.pp-nav-logo{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;}
.pp-nav-name{font-size:13px;color:#64748b;font-weight:500;}
.pp-nav-links{display:flex;gap:2px;}
.pp-nav-link{padding:6px 12px;border-radius:6px;font-size:12px;color:#94a3b8;text-decoration:none;font-weight:500;transition:all .2s;}
.pp-nav-link:hover{color:#1e293b;background:rgba(0,0,0,.04);}
.pp-progress{height:2px;transition:width .15s linear;position:absolute;bottom:0;left:0;}

/* ─── Hero ─── */
.pp-hero{
  position:relative;min-height:100vh;min-height:100dvh;
  display:flex;align-items:center;justify-content:center;
  text-align:center;padding:80px 24px 60px;overflow:hidden;
  background:linear-gradient(170deg, #fff 0%, #FFF5F7 30%, #FFF0F3 50%, #FAFBFD 100%);
}
.pp-hero-content{position:relative;z-index:1;max-width:680px;display:flex;flex-direction:column;align-items:center;}
.pp-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(255,255,255,.8);border:1px solid;
  border-radius:40px;padding:7px 20px;margin-bottom:28px;
  font-size:12px;font-weight:600;
  animation:fadeUp .7s ease both;backdrop-filter:blur(8px);
}
.pp-badge-dot{width:6px;height:6px;border-radius:50%;animation:pulse 1.4s ease infinite;}
.pp-hero-title{
  font-size:clamp(32px,6vw,60px);font-weight:900;color:#0f172a;
  line-height:1.15;letter-spacing:-2px;margin-bottom:8px;
  animation:fadeUp .8s ease both .15s;opacity:0;
}
.pp-hero-title-sub{font-size:clamp(18px,3vw,28px);font-weight:400;color:#64748b;letter-spacing:0;}
.pp-cursor{animation:pulse 1s ease infinite;font-weight:300;color:#cbd5e1;}
/* 商材タグ */
.pp-product-tag{
  display:inline-flex;align-items:center;gap:14px;
  padding:14px 24px;border-radius:14px;margin-bottom:24px;
  animation:fadeUp .8s ease both .25s;opacity:0;
}
.pp-product-icon{
  display:flex;align-items:center;justify-content:center;
  width:38px;height:38px;border-radius:10px;font-size:18px;
  color:#fff;flex-shrink:0;
}
.pp-product-name{font-size:15px;font-weight:700;letter-spacing:-.2px;line-height:1.3;}
.pp-product-desc{font-size:12px;color:#64748b;margin-top:2px;}

.pp-hero-sub{
  font-size:clamp(14px,1.6vw,16px);color:#64748b;
  line-height:1.9;margin-bottom:40px;animation:fadeUp .8s ease both .3s;opacity:0;
}
.pp-hero-metrics{
  display:flex;gap:1px;animation:fadeUp .8s ease both .45s;opacity:0;
  background:#fff;border:1px solid #e2e8f0;
  border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);
}
.pp-hero-metric{
  padding:22px 32px;text-align:center;
  border-right:1px solid #f1f5f9;background:#fff;
}
.pp-hero-metric:last-child{border-right:none;}
.pp-hero-metric.warn{background:#FFF5F5;}
.pp-hero-metric-val{font-size:26px;font-weight:800;letter-spacing:-1px;margin-bottom:4px;}
.pp-hero-metric-label{font-size:12px;color:#475569;font-weight:600;margin-bottom:2px;}
.pp-hero-metric-sub{font-size:10px;color:#94a3b8;}
.pp-scroll-hint{
  position:absolute;bottom:28px;display:flex;flex-direction:column;
  align-items:center;gap:6px;animation:bounce 2s ease infinite;
  color:#cbd5e1;font-size:9px;letter-spacing:3px;
}

/* ─── Sections ─── */
.pp-section{padding:80px 0;}
.pp-section-cream{background:#F8F9FC;}
.pp-inner{max-width:860px;margin:0 auto;padding:0 clamp(20px,5vw,56px);display:flex;flex-direction:column;}
.pp-section-label{
  font-size:11px;letter-spacing:2.5px;
  margin-bottom:12px;font-weight:700;text-transform:uppercase;
}
.pp-h2{
  font-size:clamp(24px,3.5vw,40px);font-weight:800;color:#0f172a;
  line-height:1.25;letter-spacing:-1px;margin-bottom:16px;
}
.pp-lead{font-size:15px;color:#64748b;line-height:1.9;max-width:520px;margin-bottom:32px;}

/* ─── Diagnosis ─── */
.pp-diag-wrap{display:flex;gap:36px;align-items:flex-start;margin-bottom:32px;flex-wrap:wrap;justify-content:center;}
.pp-diag-score{text-align:center;flex-shrink:0;}
.pp-diag-ring{width:130px;height:130px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.06);}
.pp-diag-ring-center{width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 1px 4px rgba(0,0,0,.06);}
.pp-diag-ring-num{font-size:34px;font-weight:900;letter-spacing:-2px;}
.pp-diag-ring-label{font-size:10px;color:#94a3b8;}
.pp-diag-score-text{font-size:12px;color:#64748b;margin-top:10px;}
.pp-diag-list{display:flex;flex-direction:column;gap:6px;flex:1;min-width:280px;}
.pp-diag-item{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #f1f5f9;border-radius:10px;padding:10px 14px;animation:fadeUp .4s ease both;}
.pp-diag-icon{font-size:16px;width:28px;text-align:center;flex-shrink:0;}
.pp-diag-info{flex:1;min-width:0;}
.pp-diag-label{font-size:13px;color:#334155;font-weight:600;display:block;}
.pp-diag-detail{font-size:11px;color:#94a3b8;display:block;}
.pp-diag-badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid;white-space:nowrap;}
.pp-diag-badge.ok{background:rgba(22,163,74,.06);color:#16A34A;border-color:rgba(22,163,74,.15);}
.pp-diag-badge.ng{background:rgba(220,38,38,.06);color:#DC2626;border-color:rgba(220,38,38,.15);}

/* Insight */
.pp-insight-card{display:flex;gap:14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,.03);}
.pp-insight-icon{font-size:24px;flex-shrink:0;}
.pp-insight-title{font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;}
.pp-insight-text{font-size:13px;color:#475569;line-height:1.8;margin-bottom:8px;}
.pp-insight-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}
.pp-insight-tag{font-size:11px;padding:2px 10px;border-radius:20px;font-weight:600;}
.pp-insight-tag.ok{background:rgba(22,163,74,.08);color:#16A34A;}
.pp-insight-tag.ng{background:rgba(220,38,38,.08);color:#DC2626;}

/* Tech */
.pp-tech-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px 24px;margin-bottom:20px;}
.pp-tech-title{font-size:12px;font-weight:700;color:#475569;margin-bottom:10px;}
.pp-tech-tags{display:flex;flex-wrap:wrap;gap:6px;}
.pp-tech-tag{font-size:11px;background:#f1f5f9;color:#475569;padding:4px 12px;border-radius:6px;font-weight:500;}

/* Alerts */
.pp-alerts{background:#fff;border:1px solid #fee2e2;border-radius:14px;padding:20px 24px;margin-bottom:20px;}
.pp-alerts-title{font-size:13px;font-weight:700;color:#DC2626;margin-bottom:14px;}
.pp-alert{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #fef2f2;}
.pp-alert:last-child{border-bottom:none;padding-bottom:0;}
.pp-alert-level{font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
.pp-alert-name{font-size:13px;font-weight:600;color:#334155;margin-bottom:2px;}
.pp-alert-desc{font-size:12px;color:#64748b;line-height:1.6;}

/* Review Analysis */
.pp-review-analysis{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin-bottom:20px;}
.pp-review-title{font-size:13px;font-weight:700;color:#334155;margin-bottom:14px;}
.pp-review-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;}
.pp-review-col{border-radius:10px;padding:14px 16px;}
.pp-review-col.positive{background:rgba(22,163,74,.04);border:1px solid rgba(22,163,74,.12);}
.pp-review-col.negative{background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.12);}
.pp-review-col-title{font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;}
.pp-review-item{font-size:12px;color:#475569;line-height:1.7;margin-bottom:3px;}
.pp-review-suggestions{border-top:1px solid #f1f5f9;padding-top:14px;}

.pp-report-link{
  display:inline-flex;align-items:center;gap:8px;
  padding:12px 24px;border-radius:12px;border:1px solid;
  font-size:14px;font-weight:600;text-decoration:none;transition:all .2s;
  background:#fff;
}
.pp-report-link:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.08);}

/* ─── Browser Mock ─── */
.pp-browser{
  border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;
  box-shadow:0 12px 40px rgba(0,0,0,.08);max-width:700px;background:#fff;
}
.pp-browser-bar{
  background:#f8fafc;padding:10px 16px;
  display:flex;align-items:center;gap:10px;
  border-bottom:1px solid #e2e8f0;
}
.pp-browser-dots{display:flex;gap:6px;}
.pp-browser-url{
  flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:6px;
  padding:4px 12px;font-size:11px;color:#94a3b8;
}
.pp-browser-flags{display:flex;gap:4px;font-size:13px;}
.pp-browser-tabs{background:#f8fafc;padding:0 16px;display:flex;gap:0;border-bottom:1px solid #e2e8f0;}
.pp-browser-tab{
  padding:10px 18px;border:none;cursor:pointer;
  font-size:12px;font-weight:600;background:transparent;
  color:#94a3b8;transition:all .2s;border-bottom:2px solid transparent;
}
.pp-browser-tab.active{color:inherit;border-bottom-color:inherit;}
.pp-browser-body{background:#fff;min-height:280px;}

.pp-btn-primary{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 32px;border-radius:12px;
  font-size:14px;font-weight:700;text-decoration:none;transition:all .2s;
  color:#fff;
}
.pp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12);}

.pp-features{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:10px;margin-top:24px;max-width:700px;
}
.pp-feature{
  background:#fff;border:1px solid #e2e8f0;border-radius:12px;
  padding:14px 16px;display:flex;gap:12px;align-items:center;
  transition:all .2s;
}
.pp-feature:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.06);}
.pp-feature-t{font-size:13px;font-weight:700;color:#1e293b;}
.pp-feature-s{font-size:11px;color:#94a3b8;}

/* ─── Opportunity ─── */
.pp-loss-card{
  text-align:center;margin-bottom:40px;padding:44px 32px;
  background:#fff;border:2px solid #fee2e2;
  border-radius:20px;max-width:540px;box-shadow:0 8px 32px rgba(220,38,38,.06);
}
.pp-loss-label{font-size:12px;color:#DC2626;letter-spacing:1px;margin-bottom:14px;font-weight:700;}
.pp-loss-num{
  font-size:clamp(40px,7vw,68px);font-weight:900;color:#DC2626;
  letter-spacing:-3px;line-height:1;margin-bottom:14px;
}
.pp-loss-desc{font-size:14px;color:#64748b;line-height:1.8;max-width:380px;margin:0 auto;}

.pp-bars{margin-bottom:40px;max-width:580px;}
.pp-bars-title{font-size:12px;font-weight:700;color:#475569;letter-spacing:1px;margin-bottom:16px;text-transform:uppercase;}
.pp-bar-row{margin-bottom:16px;}
.pp-bar-header{display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;}
.pp-bar-track{height:14px;background:#f1f5f9;border-radius:20px;overflow:hidden;}
.pp-bar-fill{height:100%;border-radius:20px;transition:width 1.4s cubic-bezier(.22,1,.36,1);}
.pp-bar-note{margin-top:12px;font-size:13px;color:#64748b;}

.pp-table-wrap{max-width:700px;}
.pp-table-title{font-size:12px;font-weight:700;color:#475569;letter-spacing:1px;margin-bottom:10px;text-transform:uppercase;}
.pp-table{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04);}
.pp-table-head{
  display:grid;grid-template-columns:2.2fr .8fr 1fr .8fr .8fr;
  padding:12px 18px;background:#f8fafc;
  font-size:11px;color:#64748b;letter-spacing:1px;font-weight:700;
  border-bottom:1px solid #e2e8f0;
}
.pp-table-row{
  display:grid;grid-template-columns:2.2fr .8fr 1fr .8fr .8fr;
  padding:14px 18px;border-top:1px solid #f1f5f9;
  font-size:13px;color:#475569;align-items:center;
  border-left:3px solid transparent;
}
.pp-table-row.self{border-left-color:#DC2626;background:#FFF5F5;}
.pp-table-name{font-weight:inherit;}
.pp-table-row.self .pp-table-name{color:#0f172a;font-weight:700;}

/* ─── Market ─── */
.pp-market-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;}
.pp-market-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px 16px;text-align:center;transition:all .2s;}
.pp-market-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.06);}
.pp-market-icon{font-size:28px;margin-bottom:8px;}
.pp-market-stat{font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-1px;margin-bottom:4px;}
.pp-market-label{font-size:11px;color:#64748b;line-height:1.6;}

.pp-reply-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.03);}
.pp-reply-title{font-size:14px;font-weight:700;color:#334155;margin-bottom:16px;}
.pp-reply-item{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f1f5f9;}
.pp-reply-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
.pp-reply-original{font-size:13px;color:#64748b;margin-bottom:10px;line-height:1.7;font-style:italic;}
.pp-reply-ai{font-size:13px;color:#334155;line-height:1.7;border-left:3px solid;padding-left:14px;position:relative;}
.pp-reply-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:6px;}

/* ─── Results ─── */
.pp-stats{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:12px;margin-bottom:36px;max-width:540px;
}
.pp-stat{
  background:#fff;border:1px solid #e2e8f0;
  border-radius:14px;padding:28px 16px;text-align:center;
  transition:all .3s;
}
.pp-stat:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.06);}
.pp-stat-num{font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:6px;}
.pp-stat-label{font-size:13px;color:#1e293b;font-weight:600;}
.pp-stat-sub{font-size:11px;color:#94a3b8;margin-top:2px;}

.pp-testimonials{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;
}
.pp-testimonial{
  background:#fff;border:1px solid #e2e8f0;
  border-radius:14px;padding:20px;transition:all .3s;
}
.pp-testimonial:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.06);}
.pp-testimonial-top{display:flex;gap:12px;align-items:center;margin-bottom:14px;}
.pp-testimonial-avatar{
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:700;color:#fff;flex-shrink:0;
}
.pp-testimonial-name{font-size:14px;font-weight:600;color:#1e293b;}
.pp-testimonial-biz{font-size:12px;color:#94a3b8;}
.pp-testimonial-result{
  border:1px solid;border-radius:10px;padding:10px 14px;
  font-size:13px;font-weight:600;
}

/* ─── Budget ─── */
/* ─── Why Us ─── */
.pp-whyus{padding:80px clamp(20px,5vw,56px);background:#FAFBFD;}
.pp-whyus .pp-section-inner{margin:0 auto;text-align:center;}
.pp-whyus .pp-section-label{font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px;}
.pp-whyus .pp-section-title{font-size:clamp(22px,3vw,30px);font-weight:800;color:#0f172a;margin-bottom:8px;letter-spacing:-.5px;}
.pp-whyus .pp-section-subtitle{font-size:14px;color:#64748b;margin-bottom:36px;}
.pp-whyus-grid{
  display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px;
  opacity:0;transform:translateY(20px);transition:all .6s;
}
.pp-whyus-grid.pp-visible{opacity:1;transform:translateY(0);}
.pp-whyus-card{
  background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;
  padding:24px 20px;text-align:left;transition:all .25s;
}
.pp-whyus-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.06);}
.pp-whyus-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px;}
.pp-whyus-title{font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;letter-spacing:-.3px;}
.pp-whyus-desc{font-size:12px;color:#64748b;line-height:1.7;}
/* 比較表 */
.pp-compare{
  opacity:0;transform:translateY(20px);transition:all .6s .2s;
}
.pp-compare.pp-visible{opacity:1;transform:translateY(0);}
.pp-compare-title{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:20px;letter-spacing:-.3px;}
.pp-compare-table{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;text-align:center;}
.pp-compare-header{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;border-bottom:2px solid #e2e8f0;}
.pp-compare-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;border-bottom:1px solid #f1f5f9;}
.pp-compare-row:last-child{border-bottom:none;}
.pp-compare-cell{padding:12px 16px;font-size:13px;display:flex;align-items:center;justify-content:center;}
.pp-compare-label{justify-content:flex-start;font-weight:600;color:#334155;text-align:left;}
.pp-compare-us{font-size:12px;font-weight:800;border-radius:0;letter-spacing:.5px;}
.pp-compare-other{font-size:12px;font-weight:600;color:#94a3b8;background:#f8fafc;}
.pp-compare-us-val{font-size:16px;}
.pp-compare-other-val{font-size:14px;color:#cbd5e1;}
.pp-UNUSED{  border:1.5px solid #e2e8f0;border-radius:20px;overflow:hidden;
  background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.05);
  text-align:left;
  opacity:0;transform:translateY(20px);transition:all .7s cubic-bezier(.22,1,.36,1);
}
.pp-budget-card.pp-visible{opacity:1;transform:translateY(0);}
.pp-budget-header{padding:32px 36px;text-align:center;}
.pp-budget-product-name{font-size:13px;font-weight:700;letter-spacing:1px;margin-bottom:12px;}
.pp-budget-price{font-size:clamp(28px,4vw,36px);font-weight:900;color:#0f172a;letter-spacing:-1px;margin-bottom:8px;}
.pp-budget-note{font-size:11px;color:#94a3b8;}
.pp-budget-features{padding:28px 36px;border-top:1px solid #f1f5f9;}
.pp-budget-features-title{font-size:12px;font-weight:700;color:#475569;margin-bottom:16px;letter-spacing:.5px;}
.pp-budget-feature{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:14px;color:#334155;}
.pp-budget-check{font-size:14px;font-weight:800;}
.pp-budget-footer{padding:24px 36px;border-top:1px solid #f1f5f9;background:#f8fafc;}
.pp-budget-roi{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.pp-budget-roi-label{font-size:11px;color:#64748b;font-weight:600;background:#f1f5f9;padding:4px 10px;border-radius:6px;}
.pp-budget-roi-val{font-size:14px;font-weight:700;}
.pp-budget-disclaimer{font-size:11px;color:#94a3b8;line-height:1.6;}

/* ─── CTA ─── */
.pp-cta{
  position:relative;padding:100px clamp(20px,5vw,56px) 80px;overflow:hidden;
  background:linear-gradient(170deg, #FFF5F7 0%, #FFF0F3 30%, #FAFBFD 100%);
}
.pp-cta-inner{position:relative;z-index:1;text-align:center;max-width:560px;margin:0 auto;}
/* 左右装飾 */
.pp-cta-deco{
  position:absolute;top:50%;transform:translateY(-50%);
  width:220px;height:320px;border-radius:28px;
  display:flex;align-items:center;justify-content:center;
  opacity:.7;pointer-events:none;
}
.pp-cta-deco-left{left:clamp(20px,4vw,80px);}
.pp-cta-deco-right{right:clamp(20px,4vw,80px);}
.pp-cta-deco-icon{font-size:72px;opacity:.5;}
.pp-cta-badge-row{margin-bottom:24px;}
.pp-cta-top-badge{
  display:inline-block;font-size:13px;font-weight:700;
  padding:8px 20px;border-radius:100px;letter-spacing:.3px;
}
.pp-cta-title{
  font-size:clamp(28px,4.5vw,44px);font-weight:900;color:#0f172a;
  line-height:1.25;letter-spacing:-1.5px;margin-bottom:20px;
}
.pp-cta-lead{font-size:15px;color:#64748b;line-height:1.9;margin-bottom:32px;}
.pp-cta-trust{
  display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:36px;
}
.pp-cta-trust-item{
  display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;
  background:#fff;border:1px solid #e2e8f0;border-radius:100px;padding:6px 14px;
  box-shadow:0 1px 3px rgba(0,0,0,.04);
}
/* 3ボタンアクション */
.pp-cta-actions{
  display:grid;grid-template-columns:repeat(3,1fr);gap:16px;
  max-width:640px;margin:0 auto 36px;text-align:left;
}
.pp-cta-action-card{
  background:#fff;border:1.5px solid #e2e8f0;border-radius:18px;
  padding:28px 20px;cursor:pointer;transition:all .25s;
  display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;
  box-shadow:0 2px 12px rgba(0,0,0,.04);position:relative;
}
.pp-cta-action-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,.08);}
.pp-cta-action-icon{
  width:52px;height:52px;border-radius:16px;
  display:flex;align-items:center;justify-content:center;font-size:24px;
}
.pp-cta-action-title{font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-.3px;}
.pp-cta-action-desc{font-size:11px;color:#64748b;line-height:1.6;}
.pp-cta-action-badge{
  font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;
  position:absolute;top:-8px;right:-4px;
}
/* モードパネル */
.pp-cta-mode-panel{
  max-width:480px;margin:0 auto 24px;
  background:#fff;border-radius:20px;border:1px solid #e2e8f0;
  box-shadow:0 4px 24px rgba(0,0,0,.06);overflow:hidden;
}
.pp-cta-mode-header{
  display:flex;align-items:center;gap:14px;padding:20px 28px;
  border-bottom:1px solid #f1f5f9;
}
.pp-cta-mode-icon{
  width:42px;height:42px;border-radius:12px;font-size:20px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.pp-cta-mode-title{font-size:15px;font-weight:800;color:#0f172a;}
.pp-cta-mode-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
/* フォーム */
.pp-cta-form{padding:24px 28px;}
.pp-cta-form-row{margin-bottom:16px;text-align:left;}
.pp-cta-form-row label{display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;}
.pp-required{color:#ef4444;font-size:10px;}
.pp-cta-input{
  width:100%;height:44px;border:1.5px solid #e2e8f0;border-radius:12px;
  padding:0 14px;font-size:14px;color:#0f172a;outline:none;
  font-family:'Noto Sans JP',sans-serif;transition:border .2s;
}
.pp-cta-input:focus{border-color:${accent};}
.pp-cta-input::placeholder{color:#cbd5e1;}
.pp-cta-btn{
  display:inline-block;color:#fff;border:none;border-radius:16px;
  padding:16px 40px;font-size:15px;font-weight:800;cursor:pointer;
  text-decoration:none;transition:all .25s;letter-spacing:-.3px;
  width:100%;text-align:center;
}
.pp-cta-btn:hover{transform:translateY(-2px);filter:brightness(1.05);}
.pp-cta-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.pp-cta-back{
  display:block;width:100%;background:none;border:none;
  padding:14px;font-size:12px;color:#94a3b8;cursor:pointer;
  transition:color .2s;font-family:'Noto Sans JP',sans-serif;
}
.pp-cta-back:hover{color:#64748b;}
/* カレンダー/チャット */
.pp-cta-calendar,.pp-cta-chat{padding:0 16px 16px;}
/* 完了 */
.pp-cta-complete{
  border:1px solid;border-radius:16px;padding:36px 28px;margin:24px;text-align:center;
}
.pp-cta-complete-icon{font-size:36px;color:${accent};margin-bottom:12px;}
.pp-cta-complete-title{font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px;}
.pp-cta-complete-msg{font-size:13px;color:#64748b;line-height:1.8;white-space:pre-line;}
.pp-cta-done{
  border:1px solid;border-radius:16px;padding:20px 28px;
  font-size:13px;max-width:440px;margin:0 auto;color:${accent};line-height:1.7;text-align:center;
}
.pp-cta-badges{
  display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:36px;
}
.pp-cta-badge{
  font-size:11px;color:#94a3b8;border:1px solid #e2e8f0;border-radius:8px;
  padding:4px 10px;background:#fff;
}
.pp-footer{margin-top:48px;font-size:12px;color:#94a3b8;line-height:2;}

/* ─── Mobile ─── */
.pp-br-md{display:none;}
@media(min-width:640px){.pp-br-md{display:inline;}}
@media(max-width:639px){
  .pp-nav-links{display:none;}
  .pp-nav-name{font-size:11px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pp-hero-metrics{flex-direction:column;}
  .pp-hero-metric{padding:16px 24px;border-right:none;border-bottom:1px solid #f1f5f9;}
  .pp-hero-metric:last-child{border-bottom:none;}
  .pp-hero-metric-val{font-size:22px;}
  .pp-stats{grid-template-columns:1fr;gap:8px;}
  .pp-stat{padding:18px 14px;}
  .pp-stat-num{font-size:22px;}
  .pp-table-head,.pp-table-row{grid-template-columns:2fr .8fr 1fr .8fr .8fr;min-width:460px;padding:10px 12px;}
  .pp-table-wrap{overflow-x:auto;}
  .pp-testimonials{grid-template-columns:1fr;}
  .pp-browser{border-radius:10px;}
  .pp-browser-bar{padding:8px 12px;}
  .pp-browser-url{font-size:9px;}
  .pp-diag-wrap{flex-direction:column;}
  .pp-loss-card{padding:28px 16px;}
  .pp-loss-num{letter-spacing:-2px;}
  .pp-features{grid-template-columns:1fr 1fr;gap:6px;}
  .pp-cta-btn{padding:16px 36px;font-size:15px;}
  .pp-cta-actions{grid-template-columns:1fr;max-width:360px;}
  .pp-cta-action-card{flex-direction:row;padding:18px 20px;gap:14px;text-align:left;}
  .pp-cta-action-icon{width:44px;height:44px;font-size:20px;flex-shrink:0;}
  .pp-cta-action-badge{top:-6px;right:-2px;font-size:9px;}
  .pp-cta-deco{display:none;}
  .pp-product-tag{padding:10px 16px;gap:10px;}
  .pp-product-icon{width:32px;height:32px;font-size:14px;}
  .pp-product-name{font-size:13px;}
  .pp-whyus-grid{grid-template-columns:1fr 1fr;gap:10px;}
  .pp-compare-header,.pp-compare-row{grid-template-columns:2fr 1fr 1fr 1fr;}
  .pp-compare-cell{padding:10px 8px;font-size:11px;}
  .pp-compare-label{font-size:11px;}
  .pp-market-grid{grid-template-columns:1fr 1fr;gap:8px;}
  .pp-review-grid{grid-template-columns:1fr;}
}
`
}
