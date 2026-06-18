/**
 * Professional Astro-style demo site generator — designer-quality, client-deliverable.
 * Features: Tailwind CDN + Glassmorphism + Bento Grid + animated counters + responsive.
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"
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
