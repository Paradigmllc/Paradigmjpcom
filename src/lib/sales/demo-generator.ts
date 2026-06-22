/**
 * Professional Astro-style demo site generator — designer-quality, client-deliverable.
 * Features: Tailwind CDN + Glassmorphism + Bento Grid + animated counters + responsive.
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import type { SalesCompany, Industry, ReportLocale } from "./types"
import { compactText, escapeHtml, labelForIndustry, themeForIndustry } from "./render-quality"

const CORRUPT = /縺|繝|譁|蜑|荳|譛|谿|險|螟|豕|邨|髻|蠕|蝠|逕|莠|陦|蛻|諡|蜷|繧|�/

function esc(s: string): string { return escapeHtml(s) }
function cln(s: string | null | undefined, fb: string, max = 200): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  if (!t || CORRUPT.test(t)) return fb
  return compactText(t, fb, max)
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase().slice(0, 2)
}

function svgIcon(name: "chart" | "zap" | "shield" | "star" | "globe" | "arrow"): string {
  const paths: Record<string, string> = {
    chart: `<path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    zap: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    star: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    globe: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 12h20M12 2a15 15 0 0115 15M12 2a15 15 0 00-5 15M12 2a15 15 0 015 15M12 2a15 15 0 00-5 3" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
    arrow: `<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  }
  return paths[name] || paths.chart
}

function evidenceSection(acts: DiagnosticAct[], locale: string): string {
  const isJa = locale === "ja"
  const titles = isJa ? ["第一印象の改善", "信頼材料の整理", "問い合わせ導線の短縮"] : ["Sharper first impression", "Clearer trust proof", "Shorter inquiry path"]
  const bodies = isJa ? [
    "検索やSNSからの訪問者が、最初の画面で選ぶ理由を理解できる構成に再設計しました。",
    "実績・レビュー・対応範囲を効果的に配置し、比較中の不安を払拭します。",
    "問い合わせ前の心理的障壁を取り除き、予約・相談への動線を最短にします。",
  ] : [
    "Redesigned so visitors instantly understand why this business should be chosen.",
    "Proof, reviews, and scope placed exactly where comparison-stage buyers look.",
    "Removes pre-inquiry hesitation with the shortest path to booking or contact.",
  ]
  return acts.slice(0, 3).map((act, i) => {
    const title = cln(act?.headline, titles[i], 90)
    const body = cln(act?.body, bodies[i], 180)
    return `<div class="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/20 flex items-center justify-center text-blue-400 font-bold text-lg">0${i+1}</div>
        <h3 class="text-xl font-bold text-white">${esc(title)}</h3>
      </div>
      <p class="text-zinc-400 leading-relaxed">${esc(body)}</p>
    </div>`
  }).join("\n")
}

function metricCards(acts: DiagnosticAct[]): string {
  return acts.slice(0, 3).map((act, i) => {
    const label = cln(act?.metric_label, "Metric", 30)
    const value = cln(act?.metric_value, "-", 20)
    const bench = cln(act?.metric_bench, "", 50)
    const colors = ["from-emerald-500/20 to-teal-500/20 border-emerald-400/20 text-emerald-400",
      "from-amber-500/20 to-orange-500/20 border-amber-400/20 text-amber-400",
      "from-violet-500/20 to-purple-500/20 border-violet-400/20 text-violet-400"]
    return `<div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
      <p class="text-xs uppercase tracking-widest text-zinc-500 mb-2">${esc(label)}</p>
      <p class="text-4xl font-black mb-1"><span class="bg-gradient-to-r ${colors[i]} bg-clip-text text-transparent">${esc(value)}</span></p>
      ${bench ? `<p class="text-xs text-zinc-500">${esc(bench)}</p>` : ""}
    </div>`
  }).join("\n")
}

export function buildDemoHtml(company: SalesCompany, report: DiagnosticReportData, templateTitle: string): string {
  const theme = themeForIndustry(company.industry)
  const loc = company.report_locale ?? report.report_locale
  const ja = loc === "ja"
  const name = esc(company.company_name)
  const brandMark = esc(initials(company.company_name) || name.slice(0, 1))
  const industry = labelForIndustry(company.industry, loc)
  const locStr = cln(company.prefecture, ja ? "全国対応" : "Nationwide", 30)
  const hook = cln(report.hook, ja ? "公開データと実測値に基づき、御社の強みが最初の5秒で伝わるサイトへ再設計しました。" : "A focused redesign that makes your strengths clear in the first five seconds.", 250)
  const cta = cln(report.cta_text, ja ? "無料相談を予約する" : "Book a free consultation", 40)
  const lossStr = esc(report.total_loss)

  // Theme colors
  const primary = theme.accent || "#7c5cff"
  const primaryDark = theme.accentDark || "#3b1f8c"

  const logo = `<div class="flex items-center gap-3">
    <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm">${brandMark}</div>
    <span class="font-bold text-white text-sm truncate max-w-[200px]">${name}</span>
  </div>`

  const ogImage = `https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/ogp/${company.id}.png`

  return `<!doctype html>
<html lang="${loc}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${name} | ${ja ? "Web改善デモサイト" : "Web Improvement Demo"}</title>
<meta name="description" content="${esc(hook)}"/>
<meta property="og:title" content="${name} | ${ja ? "Web改善デモ" : "Web Demo"}"/>
<meta property="og:description" content="${esc(hook)}"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:type" content="website"/>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{brand:'${primary}',brandDark:'${primaryDark}'}}}}</script>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
  body{font-family:'Inter','Noto Sans JP',system-ui,sans-serif}
  .gradient-text{background:linear-gradient(135deg,#fff 0%,${primary} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes pulse-glow{0%,100%{box-shadow:0 0 40px ${primary}22}50%{box-shadow:0 0 80px ${primary}44}}
  .orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:.3;pointer-events:none}
  .orb-1{width:600px;height:600px;background:${primary};top:-200px;right:-100px;animation:float 8s ease-in-out infinite}
  .orb-2{width:400px;height:400px;background:${primaryDark};bottom:-100px;left:-50px;animation:float 10s ease-in-out infinite .5s}
  .card-hover{transition:all .3s ease}
  .card-hover:hover{transform:translateY(-4px);box-shadow:0 20px 60px -20px ${primary}33}
</style>
</head>
<body class="bg-[#050510] text-white antialiased">
<div class="relative min-h-dvh overflow-hidden">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>

  <!-- NAV -->
  <nav class="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      ${logo}
      <div class="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
        <a href="#features" class="hover:text-white transition-colors">${ja ? "特徴" : "Features"}</a>
        <a href="#results" class="hover:text-white transition-colors">${ja ? "改善点" : "Results"}</a>
        <a href="#contact" class="hover:text-white transition-colors">${ja ? "お問い合わせ" : "Contact"}</a>
      </div>
      <a href="#contact" class="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors">
        ${esc(cta)} <svg class="w-4 h-4" viewBox="0 0 24 24">${svgIcon("arrow")}</svg>
      </a>
    </div>
  </nav>

  <!-- HERO -->
  <section class="relative pt-24 pb-16 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-8">
        <span class="w-2 h-2 rounded-full bg-green-400"></span>
        ${ja ? `${industry}向け改善デモ` : `${industry} Demo`} · ${esc(locStr)}
      </div>
      <h1 class="text-5xl md:text-7xl font-black leading-[1.05] mb-6">
        <span class="gradient-text">${esc(hook)}</span>
      </h1>
      <p class="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        ${ja
          ? "御社の公開データを分析し、集客力を最大化する構成で再設計しました。下記は改善後のイメージです。"
          : "Redesigned based on your public data to maximize customer acquisition. This is the improved version."}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <a href="#features" class="inline-flex items-center gap-2 bg-gradient-to-r from-${primary} to-${primaryDark} text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-${primary}/30 transition-all pulse-glow">
          ${ja ? "改善ポイントを見る" : "View Improvements"} <svg class="w-5 h-5" viewBox="0 0 24 24">${svgIcon("arrow")}</svg>
        </a>
        <a href="#contact" class="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/20 transition-all">
          ${esc(cta)}
        </a>
      </div>
    </div>
  </section>

  <!-- METRICS -->
  <section id="features" class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-12">
        <p class="text-sm uppercase tracking-[.3em] text-${primary} font-bold mb-4">${ja ? "診断結果" : "Diagnostic Findings"}</p>
        <h2 class="text-3xl md:text-4xl font-bold">${ja ? "主要な改善指標" : "Key Improvement Metrics"}</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${metricCards(report.acts)}
      </div>
    </div>
  </section>

  <!-- LOSS IMPACT -->
  <section class="py-16 px-6 bg-white/[.02] border-y border-white/5">
    <div class="max-w-3xl mx-auto text-center">
      <div class="inline-flex items-center gap-2 bg-red-500/10 border border-red-400/20 rounded-full px-4 py-1.5 text-xs text-red-400 font-bold mb-6">
        ${ja ? "推定機会損失" : "Estimated Opportunity Loss"}
      </div>
      <p class="text-6xl md:text-8xl font-black text-red-400 mb-4">${lossStr}</p>
      <p class="text-lg text-zinc-400 max-w-xl mx-auto">
        ${ja ? "現状のWebサイトで毎月失われている推定売上です。改善によりこの損失を回収できます。" : "Estimated revenue lost each month with the current website. This can be recovered through improvement."}
      </p>
    </div>
  </section>

  <!-- EVIDENCE -->
  <section id="results" class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-12">
        <p class="text-sm uppercase tracking-[.3em] text-${primary} font-bold mb-4">${ja ? "3つの改善施策" : "3 Improvements"}</p>
        <h2 class="text-3xl md:text-4xl font-bold">${ja ? "具体的な改善内容" : "What We Improve"}</h2>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        ${evidenceSection(report.acts, loc)}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section id="contact" class="py-20 px-6">
    <div class="max-w-2xl mx-auto text-center">
      <div class="bg-gradient-to-br from-${primary} to-${primaryDark} rounded-3xl p-12 shadow-2xl">
        <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24">${svgIcon("star")}</svg>
        </div>
        <h2 class="text-3xl md:text-4xl font-black text-white mb-4">${esc(cta)}</h2>
        <p class="text-white/70 mb-8 max-w-md mx-auto">
          ${ja
            ? "デモサイトの続きや、実際の改善プランについて詳しくご説明します。お気軽にご連絡ください。"
            : "Let's discuss the full demo and your actual improvement plan. Reach out anytime."}
        </p>
        <a href="https://cal.com/paradigm-jp/15min" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-zinc-100 transition-all shadow-xl">
          ${ja ? "15分無料相談を予約" : "Book 15min Free Consult"} <svg class="w-5 h-5" viewBox="0 0 24 24">${svgIcon("arrow")}</svg>
        </a>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="border-t border-white/5 py-10 px-6 text-center text-sm text-zinc-600">
    <p>${ja ? "© 2026 Paradigm LLC — このデモは診断データに基づいて自動生成されました。" : "© 2026 Paradigm LLC — This demo was auto-generated from diagnostic data."}</p>
  </footer>
</div>
</body>
</html>`
}

import { getServiceSalesSupabase } from "@/lib/supabase"
import { matchContentTemplate } from "./content-templates"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { generateDemoWithDify } from "./dify-demo-generator"

/**
 * Build theme demo JSON blueprint (AstroWind widget-based).
 * Replaces the old buildDemoHtml() — now outputs structured JSON for Astro SSR.
 */
function buildThemeDemoJson(
  company: SalesCompany,
  report: DiagnosticReportData,
  locale: string,
): { theme: string; blocks: Array<{ id: string; type: string; props: Record<string, unknown> }>; meta: Record<string, unknown> } {
  const ja = locale === "ja"
  const name = company.company_name
  const ctaUrl = "https://cal.com/paradigm-jp/15min"

  return {
    theme: "astrowind",
    blocks: [
      {
        id: "hero",
        type: "Hero",
        props: {
          title: report.hook ?? `${name}のWebサイト改善提案`,
          subtitle: ja
            ? "データ診断に基づくパーソナライズド改善プラン。御社のデジタルプレゼンスを次のステージへ。"
            : "Personalized improvement plan based on data diagnostics. Take your digital presence to the next level.",
          tagline: ja ? "データ診断済み · 改善提案" : "Data-Diagnosed · Improvement Plan",
          actions: [
            { variant: "primary", text: ja ? "無料診断を申し込む" : "Get Free Diagnostic", href: ctaUrl },
            { variant: "secondary", text: ja ? "改善内容を見る" : "See Improvements", href: "#features" },
          ],
        },
      },
      {
        id: "features",
        type: "Features",
        props: {
          title: ja ? "改善ソリューション" : "Improvement Solutions",
          subtitle: ja
            ? `${name}の特性に合わせた最適プラン`
            : `Tailored plans for ${name}`,
          items: report.acts.slice(0, 3).map((act, i) => ({
            title: act.headline?.slice(0, 60) ?? (ja ? "改善施策" : "Improvement"),
            description: act.body?.slice(0, 120) ?? "",
            icon: ["tabler:search", "tabler:palette", "tabler:chart-bar"][i] || "tabler:star",
          })),
        },
      },
      {
        id: "stats",
        type: "Stats",
        props: {
          title: ja ? "改善シミュレーション" : "Improvement Simulation",
          subtitle: ja ? "同業他社での改善実績に基づく想定インパクト" : "Projected impact based on industry benchmarks",
          stats: [
            { amount: "2.4", title: ja ? "問合せ増加倍率" : "Inquiry Multiplier", icon: "tabler:trending-up" },
            { amount: 92, title: "PageSpeed", icon: "tabler:bolt" },
            { amount: "38", title: ja ? "CVR改善率 (%)" : "CVR Gain (%)", icon: "tabler:chart-pie" },
            { amount: "#3", title: ja ? "主要KW 順位" : "Primary KW Rank", icon: "tabler:search" },
          ],
        },
      },
      {
        id: "cta",
        type: "CallToAction",
        props: {
          title: ja ? "まずは無料診断から" : "Start with a Free Diagnostic",
          subtitle: ja ? "15分のオンライン診断で改善余地を可視化します" : "15-min online diagnostic reveals your improvement potential",
          callToAction: { variant: "primary", text: ja ? "無料診断を申し込む" : "Book Free Consult", href: ctaUrl },
        },
      },
    ],
    meta: {
      title: `${name} — ${ja ? "Web改善デモサイト" : "Web Improvement Demo"}`,
      description: report.hook ?? `${name} — data-driven web improvement proposal`,
      industry: company.industry ?? "consulting",
      locale,
      calBookingUrl: ctaUrl,
      generator: "theme_demo_json",
      generated_at: new Date().toISOString(),
    },
  }
}

export async function generateReplacementDemo(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ ok: boolean; demoUrl: string | null; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, error: "Supabase service_role not configured" }

  const rawSlug = (company.domain || company.slug || company.id)
    .replace(/^https?:\/\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50)

  const locale = company.report_locale ?? report.report_locale
  const slug = `${rawSlug}-demo`

  // Try Dify AI-powered generation first, fall back to rules-based
  const themeJson = await generateDemoWithDify(company, report)
  console.warn(`[demo-generator] generated with ${themeJson.engine}: ${themeJson.blocks.length} blocks, theme=${themeJson.theme}`)

  // Save to theme_demo_pages (new Supabase table, Astro SSR reads from here)
  const { error: upsertError } = await sb
    .from(DB_TABLES.THEME_DEMO_PAGES)
    .upsert({
      slug,
      theme: themeJson.theme,
      title: themeJson.meta.title,
      blocks: themeJson.blocks,
      meta: themeJson.meta,
      company_id: company.id,
      is_published: true,
    }, { onConflict: "slug" })

  if (upsertError) {
    console.error("[demo-generator] theme_demo_pages upsert failed:", upsertError.message)
    return { ok: false, demoUrl: null, error: upsertError.message }
  }

  const baseUrl = process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
  const demoUrl = `${baseUrl}/demo/${encodeURIComponent(slug)}?lang=${locale}`

  console.warn(`[demo-generator] saved to theme_demo_pages: ${slug} → ${demoUrl}`)

  // Write demo_site url back to sales_companies
  try {
    const { error } = await sb.rpc("sales_atomic_meta_merge", {
      p_company_id: company.id,
      p_patch: {
        demo_site: {
          url: demoUrl,
          type: "theme_astro_ssr",
          slug,
          theme: themeJson.theme,
          generated_at: new Date().toISOString(),
        },
      },
    })
    if (error) console.error("[demo-generator] atomic meta merge failed:", error.message)
  } catch (metaErr) {
    console.error("[demo-generator] meta update failed:", metaErr)
  }

  // Also save legacy web_demos entry for compatibility
  try {
    await sb.from(DB_TABLES.WEB_DEMOS).upsert({
      company_id: company.id,
      slug,
      name: `${company.company_name} Demo`,
      html_content: JSON.stringify(themeJson),
      source: "theme_demo_v2",
      is_published: true,
      meta: {
        generator: "theme_demo_v2",
        demo_url: demoUrl,
        theme: themeJson.theme,
        generated_at: new Date().toISOString(),
      },
    }, { onConflict: "slug" })
  } catch (e) {
    console.warn("[demo-generator] legacy web_demos save failed (non-critical):", e)
  }

  return { ok: true, demoUrl }
}

import type {
  DemoPageData,
  DemoFeatureItem,
  DemoStatsItem,
  DemoBeforeAfterItem,
  DemoGenerateOutput,
} from "./demo-site-types"

const CORRUPT_FS = /[�邵郢鬮隴陞陷驍縺繝譁蜑荳譛谿險螟豕邨髻蠕蝠逕莠陦蛻諡蜷繧]/

function cleanFs(s: string | null | undefined, fallback: string, max = 200): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim()
  if (!t || CORRUPT_FS.test(t)) return fallback
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function buildSlug(company: { domain: string; slug?: string | null; id: string }): string {
  const raw = (company.domain || company.slug || company.id)
    .replace(/^https?:\/\//, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50)
  return `${raw}-demo`
}

/**
 * Build structured DemoPageData from diagnostic report and company data.
 * This is the core data generation function that feeds the Next.js demo page.
 */
export function buildDemoPageData(
  company: {
    id: string
    company_name: string
    domain: string
    slug?: string | null
    industry: string | null
    prefecture?: string | null
    report_locale?: string | null
    tech_stack?: Record<string, unknown> | null
    pain_diagnosis?: Record<string, unknown> | null
    dify_result?: Record<string, unknown> | null
    visual_evidence?: Record<string, unknown> | null
    demo_site?: Record<string, unknown> | null
  },
  report: DiagnosticReportData,
): DemoPageData {
  const locale = (company.report_locale ?? report.report_locale ?? "ja") as ReportLocale
  const isJa = locale === "ja"
  const industry = (company.industry ?? report.industry ?? "consulting") as Industry
  const cfg = industryConfig(industry)
  const slug = buildSlug(company)
  const name = cleanFs(company.company_name, "Your Company", 80)
  const locationStr = cleanFs(company.prefecture, isJa ? "全国対応" : "Nationwide", 30)
  const industryLabel = isJa ? (cfg.labelJa ?? "コンサルティング") : (cfg.labelEn ?? "Consulting")
  const ctaUrl = "https://cal.com/paradigm-jp/15min"
  const accentColor = cfg.accentColor ?? "#7c3aed"

  const primaryIssue = report.acts?.[0]
  const secondaryIssue = report.acts?.[1]
  const thirdIssue = report.acts?.[2]

  const heroTitle = cleanFs(
    report.hook,
    isJa
      ? `${name}の強みが最初の5秒で伝わるWeb改善デモ`
      : `A web demo that makes ${name}'s value clear in the first five seconds`,
    110,
  )

  const hero: DemoPageData["hero"] = {
    title: heroTitle,
    subtitle: isJa
      ? "御社の公開データを分析し、集客力を最大化する構成で再設計しました。下記は改善後のイメージです。"
      : "Redesigned based on your public data to maximize customer acquisition. This is the improved version.",
    tagline: isJa ? `${industryLabel}向け改善デモ` : `${industryLabel} improvement demo`,
    companyName: name,
    industryLabel,
    locationLabel: locationStr,
    primaryCta: {
      text: cleanFs(report.cta_text, isJa ? "無料相談を予約する" : "Book a free consultation", 40),
      href: ctaUrl,
    },
    secondaryCta: {
      text: isJa ? "改善ポイントを見る" : "View Improvements",
      href: "#features",
    },
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
  }

  const features: DemoFeatureItem[] = [
    {
      title: cleanFs(primaryIssue?.headline, isJa ? "第一印象を整理" : "Clarify the first impression", 64),
      description: cleanFs(primaryIssue?.body, isJa ? "訪問直後に何を提供し、なぜ選ぶべきかが伝わる構成にします。" : "Make the offer and reason to choose you obvious immediately.", 140),
      icon: "tabler:sparkles",
      metricLabel: cleanFs(primaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(primaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(primaryIssue?.metric_bench, "", 50),
      severity: (primaryIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(secondaryIssue?.headline, isJa ? "信頼材料を前面に配置" : "Bring trust proof forward", 64),
      description: cleanFs(secondaryIssue?.body, isJa ? "実績、比較材料、対応範囲を検討中の相手が迷わない位置に配置します。" : "Place proof, scope, and comparison details where buyers expect them.", 140),
      icon: "tabler:shield-check",
      metricLabel: cleanFs(secondaryIssue?.metric_label, "", 30),
      metricValue: cleanFs(secondaryIssue?.metric_value, "-", 20),
      metricBench: cleanFs(secondaryIssue?.metric_bench, "", 50),
      severity: (secondaryIssue?.severity ?? "warning") as DemoFeatureItem["severity"],
    },
    {
      title: cleanFs(thirdIssue?.headline, isJa ? "問い合わせ導線を短縮" : "Shorten the inquiry path", 64),
      description: cleanFs(thirdIssue?.body, isJa ? "フォーム、予約、相談CTAまでの心理的な距離を短くします。" : "Reduce hesitation between interest and a booked conversation.", 140),
      icon: "tabler:route",
      metricLabel: cleanFs(thirdIssue?.metric_label, "", 30),
      metricValue: cleanFs(thirdIssue?.metric_value, "-", 20),
      metricBench: cleanFs(thirdIssue?.metric_bench, "", 50),
      severity: (thirdIssue?.severity ?? "info") as DemoFeatureItem["severity"],
    },
  ].filter((f) => f.title && f.description)

  const stats: DemoStatsItem[] = [
    { amount: "85+", title: "PageSpeed", icon: "tabler:bolt" },
    { amount: "A+", title: "SSL / Trust", icon: "tabler:lock" },
    { amount: "3", title: isJa ? "主要CTA" : "Primary CTAs", icon: "tabler:target-arrow" },
    { amount: "24h", title: isJa ? "初期改善案" : "First action plan", icon: "tabler:clock" },
  ]

  const beforeAfter: DemoBeforeAfterItem[] = report.acts?.slice(0, 3).map((act, i) => {
    const titles = isJa
      ? ["第一印象の改善", "信頼材料の整理", "問い合わせ導線の短縮"]
      : ["Sharper first impression", "Clearer trust proof", "Shorter inquiry path"]
    const beforeDescriptions = isJa
      ? [
          "訪問者が最初の画面で選ぶ理由を理解できず離脱",
          "実績・レビュー・対応範囲がわかりにくい位置にあり不安",
          "問い合わせフォームまでの心理的な障壁が大きい",
        ]
      : [
          "Visitors leave without understanding why to choose you",
          "Proof, reviews, and scope hard to find — creating doubt",
          "Psychological barrier between interest and contact form",
        ]
    return {
      id: `ba-${i}`,
      label: cleanFs(act?.headline, titles[i] ?? "", 90),
      beforeDescription: beforeDescriptions[i] ?? "",
      afterDescription: cleanFs(act?.body, isJa ? "改善後の理想状態" : "Improved state after redesign", 180),
      beforeImageUrl: report.screenshot_url ?? null,
      afterImageUrl: report.screenshot_url ?? null,
      severity: (act?.severity ?? "info") as DemoBeforeAfterItem["severity"],
    }
  }) ?? []

  const cta: DemoPageData["cta"] = {
    title: cleanFs(report.cta_text, isJa ? "無料相談を予約する" : "Book a free consultation", 40),
    subtitle: isJa
      ? "デモサイトの続きや、実際の改善プランについて詳しくご説明します。お気軽にご連絡ください。"
      : "Let's discuss the full demo and your actual improvement plan. Reach out anytime.",
    buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
    buttonHref: ctaUrl,
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
  }

  const navigation = isJa
    ? [
        { label: "特徴", href: "#features" },
        { label: "改善比較", href: "#before-after" },
        { label: "お問い合わせ", href: "#contact" },
      ]
    : [
        { label: "Features", href: "#features" },
        { label: "Comparison", href: "#before-after" },
        { label: "Contact", href: "#contact" },
      ]

  const ogImage = `https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/ogp/${company.id}.png`

  const meta: DemoPageData["meta"] = {
    title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
    description: cleanFs(report.hook, isJa ? `${name}のWeb改善デモ` : `${name} web improvement demo`, 150),
    ogImage,
    industry: industry as Industry,
    locale,
    companyName: name,
    accentColor: cfg.accentColor ?? "#7c3aed",
    accentColorDark: cfg.accentColorDark ?? "#5b21b6",
    calBookingUrl: ctaUrl,
    generatedAt: new Date().toISOString(),
    engine: "full-stack-nextjs",
  }

  return {
    slug,
    companyId: company.id,
    companyName: name,
    locale,
    industry: industry as Industry,
    industryLabel,
    locationLabel: locationStr,
    hero,
    navigation,
    features,
    stats,
    beforeAfter,
    cta,
    totalLoss: report.total_loss ?? "",
    meta,
    blocks: [],
  }
}

/**
 * Fetch demo page data by slug from the theme_demo_pages table,
 * falling back to building from sales_companies data.
 */
export async function fetchDemoPageData(slug: string): Promise<DemoPageData | null> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[demo-generator] fetchDemoPageData: Supabase not configured")
    return null
  }

  try {
    // Try theme_demo_pages first
    const { data: themePage, error: themeError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .select("slug, company_id, title, blocks, meta")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (themePage && !themeError) {
      const meta = (themePage.meta ?? {}) as Record<string, unknown>
      const blocks = (themePage.blocks ?? []) as Array<{ id: string; type: string; props: Record<string, unknown> }>

      // Fetch associated company for full data
      const { data: company } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
        .eq("id", themePage.company_id)
        .maybeSingle()

      if (company) {
        // Build from theme data + company data using the existing builder
        const { fetchDiagnosticReport } = await import("./diagnostic")
        const { localeToRegion } = await import("./types")

        const locale = (company.report_locale ?? meta.locale ?? "ja") as string
        const region = localeToRegion(locale)
        const diagnostic = await fetchDiagnosticReport({ slug: company.slug ?? themePage.slug, region, reportLocale: locale })

        if (diagnostic) {
          return buildDemoPageData(
            company as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
            diagnostic,
          )
        }

        // Fallback: build minimal data from meta
        const isJa = locale === "ja"
        const name = String(meta.company_name ?? company.company_name ?? "Company")
        const ctaUrl = String(meta.calBookingUrl ?? "https://cal.com/paradigm-jp/15min")
        const accentColor = String(meta.accentColor ?? "#7c3aed")
        const accentColorDark = String(meta.accentColorDark ?? "#5b21b6")

        return {
          slug,
          companyId: String(themePage.company_id),
          companyName: name,
          locale: locale as ReportLocale,
          industry: (meta.industry ?? company.industry ?? "consulting") as Industry,
          industryLabel: isJa ? "改善デモ" : "Improvement Demo",
          locationLabel: "",
          hero: {
            title: String(meta.title ?? `${name} Web改善デモ`),
            subtitle: String(meta.description ?? ""),
            tagline: isJa ? "改善デモ" : "Improvement Demo",
            companyName: name,
            industryLabel: isJa ? "改善デモ" : "Improvement Demo",
            locationLabel: "",
            primaryCta: { text: isJa ? "無料相談を予約" : "Book free consult", href: ctaUrl },
            secondaryCta: { text: isJa ? "改善ポイントを見る" : "See improvements", href: "#features" },
            accentColor,
            accentColorDark,
          },
          navigation: isJa
            ? [{ label: "特徴", href: "#features" }, { label: "お問い合わせ", href: "#contact" }]
            : [{ label: "Features", href: "#features" }, { label: "Contact", href: "#contact" }],
          features: [],
          stats: [],
          beforeAfter: [],
          cta: {
            title: isJa ? "無料相談を予約" : "Book free consult",
            subtitle: isJa ? "詳しくはお問い合わせください" : "Contact us for details",
            buttonText: isJa ? "15分無料相談を予約" : "Book 15min Free Consult",
            buttonHref: ctaUrl,
            accentColor,
            accentColorDark,
          },
          totalLoss: "",
          meta: {
            title: String(meta.title ?? `${name} | Web改善デモ`),
            description: String(meta.description ?? ""),
            ogImage: "",
            industry: (meta.industry as Industry) ?? "consulting",
            locale: locale as ReportLocale,
            companyName: name,
            accentColor,
            accentColorDark,
            calBookingUrl: ctaUrl,
            generatedAt: String(meta.generated_at ?? new Date().toISOString()),
            engine: "theme_demo_pages",
          },
          blocks,
        }
      }
    }

    // Fallback: try direct sales_companies lookup
    const { data: companyBySlug } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("slug", slug.replace(/-demo$/, ""))
      .maybeSingle()

    if (companyBySlug) {
      const { fetchDiagnosticReport } = await import("./diagnostic")
      const { localeToRegion } = await import("./types")

      const locale = (companyBySlug.report_locale ?? "ja") as string
      const region = localeToRegion(locale)
      const diagnostic = await fetchDiagnosticReport({
        slug: companyBySlug.slug ?? slug.replace(/-demo$/, ""),
        region,
        reportLocale: locale,
      })

      if (diagnostic) {
        return buildDemoPageData(
          companyBySlug as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
          diagnostic,
        )
      }
    }

    return null
  } catch (err) {
    console.error("[demo-generator] fetchDemoPageData failed:", err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Generate a full-stack Next.js demo site for a given company.
 * Saves to theme_demo_pages and updates the company's demo_site meta.
 * Returns the new demo URL in the format: demo.paradigmjp.com/[slug]
 */
export async function generateFullStackDemo(
  companyId: string,
  locale?: string,
): Promise<DemoGenerateOutput> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, slug: null, error: "Supabase service_role not configured" }

  try {
    // Fetch company
    const { data: company, error: companyError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, company_name, domain, slug, industry, prefecture, report_locale, tech_stack, pain_diagnosis, dify_result, visual_evidence, demo_site, meta")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError || !company) {
      return { ok: false, demoUrl: null, slug: null, error: `Company not found: ${companyError?.message ?? "no rows"}` }
    }

    // Fetch diagnostic report
    const { fetchDiagnosticReport } = await import("./diagnostic")
    const { localeToRegion } = await import("./types")

    const effectiveLocale = locale ?? (company.report_locale ?? "ja")
    const region = localeToRegion(effectiveLocale)
    const diagnostic = await fetchDiagnosticReport({
      slug: company.slug ?? "",
      region,
      reportLocale: effectiveLocale,
    })

    if (!diagnostic) {
      return { ok: false, demoUrl: null, slug: null, error: "No diagnostic report found for this company" }
    }

    // Build page data
    const pageData = buildDemoPageData(
      company as Record<string, unknown> as Parameters<typeof buildDemoPageData>[0],
      diagnostic,
    )

    const slug = pageData.slug
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.ASTRO_DEMO_BASE_URL || "https://demo.paradigmjp.com"
    const demoUrl = `${baseUrl.replace(/\/+$/, "")}/${slug}`

    // Save to theme_demo_pages
    const blocks = [
      { id: "hero", type: "Hero", props: pageData.hero as unknown as Record<string, unknown> },
      { id: "features", type: "Features", props: { items: pageData.features } as unknown as Record<string, unknown> },
      { id: "stats", type: "Stats", props: { stats: pageData.stats } as unknown as Record<string, unknown> },
      { id: "before-after", type: "BeforeAfter", props: { items: pageData.beforeAfter } as unknown as Record<string, unknown> },
      { id: "cta", type: "CallToAction", props: pageData.cta as unknown as Record<string, unknown> },
    ]

    const { error: upsertError } = await sb
      .from(DB_TABLES.THEME_DEMO_PAGES)
      .upsert({
        slug,
        theme: "nextjs-fullstack",
        title: pageData.meta.title,
        blocks,
        meta: pageData.meta as unknown as Record<string, unknown>,
        company_id: companyId,
        is_published: true,
      }, { onConflict: "slug" })

    if (upsertError) {
      console.error("[demo-generator] generateFullStackDemo upsert failed:", upsertError.message)
      return { ok: false, demoUrl: null, slug: null, error: upsertError.message }
    }

    console.warn(`[demo-generator] full-stack demo saved: ${slug} → ${demoUrl}`)

    // Update company demo_site meta
    try {
      const { error: metaError } = await sb.rpc("sales_atomic_meta_merge", {
        p_company_id: companyId,
        p_patch: {
          demo_site: {
            url: demoUrl,
            type: "nextjs_fullstack",
            slug,
            generated_at: new Date().toISOString(),
          },
        },
      })
      if (metaError) console.error("[demo-generator] generateFullStackDemo meta merge failed:", metaError.message)
    } catch (metaErr) {
      console.error("[demo-generator] generateFullStackDemo meta update failed:", metaErr)
    }

    // Also save to web_demos for compatibility
    try {
      await sb.from(DB_TABLES.WEB_DEMOS).upsert({
        company_id: companyId,
        slug,
        name: `${company.company_name} Full-Stack Demo`,
        html_content: JSON.stringify(pageData),
        source: "nextjs_fullstack",
        is_published: true,
        meta: {
          generator: "nextjs_fullstack",
          demo_url: demoUrl,
          generated_at: new Date().toISOString(),
        },
      }, { onConflict: "slug" })
    } catch (e) {
      console.warn("[demo-generator] generateFullStackDemo web_demos save failed (non-critical):", e)
    }

    return { ok: true, demoUrl, slug }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[demo-generator] generateFullStackDemo failed:", message)
    return { ok: false, demoUrl: null, slug: null, error: message }
  }
}

function industryConfig(industry: string | null | undefined): {
  theme?: string
  labelJa?: string
  labelEn?: string
  accentColor?: string
  accentColorDark?: string
} {
  const configs: Record<string, {
    theme: string; labelJa: string; labelEn: string; accentColor: string; accentColorDark: string
  }> = {
    dental: { theme: "astrowind", labelJa: "歯科医院", labelEn: "Dental Clinic", accentColor: "#2563eb", accentColorDark: "#1e3a8a" },
    construction: { theme: "screwfast", labelJa: "建設業", labelEn: "Construction", accentColor: "#f59e0b", accentColorDark: "#92400e" },
    consulting: { theme: "astrowind", labelJa: "コンサルティング", labelEn: "Consulting", accentColor: "#7c3aed", accentColorDark: "#5b21b6" },
    restaurant: { theme: "astroship", labelJa: "飲食店", labelEn: "Restaurant", accentColor: "#f97316", accentColorDark: "#9a3412" },
    retail: { theme: "astroship", labelJa: "小売業", labelEn: "Retail", accentColor: "#0891b2", accentColorDark: "#155e75" },
    beauty_salon: { theme: "astroship", labelJa: "美容サロン", labelEn: "Beauty Salon", accentColor: "#db2777", accentColorDark: "#831843" },
    accounting: { theme: "astrowind", labelJa: "会計事務所", labelEn: "Accounting Office", accentColor: "#0f766e", accentColorDark: "#134e4a" },
    cleaning: { theme: "screwfast", labelJa: "清掃業", labelEn: "Cleaning Service", accentColor: "#16a34a", accentColorDark: "#166534" },
  }
  return configs[industry ?? ""] ?? configs.consulting
}
