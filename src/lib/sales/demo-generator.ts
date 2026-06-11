/**
 * Professional Astro-style demo site generator — designer-quality, client-deliverable.
 * Features: Tailwind CDN + Glassmorphism + Bento Grid + animated counters + responsive.
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"
import { compactText, escapeHtml, labelForIndustry, themeForIndustry } from "./render-quality"
import { buildFullSiteDemoHtml, selectFullSiteDemoTemplate } from "./fullsite-demo-templates"
import { validateFullSiteDemoHtml, type FullSiteDemoQualityResult } from "./fullsite-demo-quality"

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
  return buildFullSiteDemoHtml(company, report, templateTitle)
}

function buildLegacyDemoHtml(company: SalesCompany, report: DiagnosticReportData, templateTitle: string): string {
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
<div class="relative min-h-screen overflow-hidden">
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
        <a href="https://cal.com/paradigm-jp/15min" class="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-zinc-100 transition-all shadow-xl">
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
import { getR2StorageConfig, sanitizeR2ObjectName } from "./r2-storage"

export async function generateReplacementDemo(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ ok: boolean; demoUrl: string | null; error?: string; quality?: FullSiteDemoQualityResult }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, demoUrl: null, error: "Supabase service_role not configured" }
  if (!company.slug) return { ok: false, demoUrl: null, error: "company slug is missing" }

  const slug = `${company.slug}-demo`
  const contentTemplate = await matchContentTemplate({
    reportLocale: company.report_locale ?? report.report_locale,
    targetCountry: company.target_country ?? report.target_country,
    industry: company.industry,
    assetType: "astro_demo_site",
    templateVariant: company.template_variant ?? report.template_variant,
  })
  const html = buildDemoHtml(company, report, contentTemplate.title)
  const fullSiteTemplate = selectFullSiteDemoTemplate(company)
  const quality = validateFullSiteDemoHtml(html, fullSiteTemplate)
  if (!quality.ok) {
    console.error("[demo-generator] quality gate failed:", quality.errors.join("; "))
    return {
      ok: false,
      demoUrl: null,
      error: `full-site demo quality gate failed: ${quality.errors.join("; ")}`,
      quality,
    }
  }

  const r2Config = getR2StorageConfig()
  let demoUrl: string | null = null
  const locale = company.report_locale ?? report.report_locale
  const publicDemoUrl = `/${locale}/d/${slug}`

  if (r2Config.ready && r2Config.bucket && r2Config.publicBaseUrl) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID!
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
      })
      const r2Key = sanitizeR2ObjectName(`demos/${company.id}/${slug}.html`)
      await client.send(new PutObjectCommand({
        Bucket: r2Config.bucket,
        Key: r2Key,
        Body: html,
        ContentType: "text/html; charset=utf-8",
      }))
      demoUrl = `${r2Config.publicBaseUrl.replace(/\/+$/, "")}/${r2Key}`
      console.warn("[demo-generator] saved to R2:", r2Key)
    } catch (r2Err) {
      console.error("[demo-generator] R2 upload failed, falling back to Supabase:", r2Err)
    }
  }

  const meta: Record<string, unknown> = {
    generator: "fullsite_demo_factory",
    renderer_version: "fullsite-v1-revenueos",
    site_type: fullSiteTemplate.siteType,
    demo_template: {
      id: fullSiteTemplate.id,
      label: fullSiteTemplate.label,
      feature_pack: fullSiteTemplate.featurePack,
      compliance_pack: fullSiteTemplate.compliancePack,
      page_map: fullSiteTemplate.pageMap,
      design_intent: fullSiteTemplate.designIntent,
    },
    content_template: {
      title: contentTemplate.title,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
    },
    report_url: report.report_url,
    quality,
    r2_url: demoUrl,
    public_url: publicDemoUrl,
    generated_at: new Date().toISOString(),
  }

  const { error } = await sb.from("web_demos").upsert(
    {
      company_id: company.id,
      slug,
      name: `${company.company_name} Demo`,
      html_content: demoUrl ?? html,
      html: demoUrl ?? html,
      source: "sales_enrichment_fullsite",
      is_published: true,
      meta,
    },
    { onConflict: "slug" },
  )
  if (error) {
    console.error("[demo-generator] upsert failed:", error.message)
    if (!demoUrl) return { ok: false, demoUrl: null, error: error.message }
  }

  // Persist the canonical RevenueOS demo URL for reports, Twenty, and Keystatic sync.
  try {
    const existing = await sb.from("sales_companies").select("meta").eq("id", company.id).maybeSingle()
    const currentMeta = (existing?.data as { meta?: Record<string, unknown> } | null)?.meta ?? {}
    await sb.from("sales_companies").update({
      meta: {
        ...(currentMeta as Record<string, unknown>),
        demo_site: {
          url: publicDemoUrl,
          r2_url: demoUrl,
          type: "revenueos_fullsite_demo",
          slug,
          template_id: fullSiteTemplate.id,
          generated_at: new Date().toISOString(),
        },
      },
    }).eq("id", company.id)
  } catch (metaErr) {
    console.error("[demo-generator] meta update failed:", metaErr)
  }

  return { ok: true, demoUrl: publicDemoUrl, quality }
}
