import { getServiceSalesSupabase } from "@/lib/supabase"
import { matchContentTemplate } from "./content-templates"
import type { DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildDemoHtml(company: SalesCompany, report: DiagnosticReportData, templateTitle: string): string {
  const name = escapeHtml(company.company_name)
  const hook = escapeHtml(report.hook.replace(/\s+/g, " "))
  const primaryAct = report.acts[0]
  const issue = escapeHtml(primaryAct?.headline ?? "サイト改善ポイント")
  const cta = escapeHtml(report.cta_text)
  const location = escapeHtml(company.prefecture ?? "地域")
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} | Demo Site</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#5b6472; --line:#e5e7eb; --accent:#2563eb; --soft:#f8fafc; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:#fff; }
    header { position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:18px clamp(20px,5vw,64px); background:rgba(255,255,255,.92); border-bottom:1px solid var(--line); backdrop-filter: blur(12px); }
    .brand { font-weight:800; letter-spacing:.02em; }
    nav { display:flex; gap:18px; font-size:13px; color:var(--muted); }
    main { min-height:100vh; }
    .hero { display:grid; grid-template-columns: minmax(0,1.05fr) minmax(280px,.95fr); gap:44px; align-items:center; padding:64px clamp(20px,5vw,64px) 52px; }
    .eyebrow { font-size:12px; font-weight:800; color:var(--accent); letter-spacing:.16em; text-transform:uppercase; }
    h1 { font-size:clamp(34px,7vw,72px); line-height:.98; letter-spacing:-.04em; margin:18px 0; }
    .lead { font-size:clamp(16px,2vw,20px); line-height:1.85; color:var(--muted); max-width:620px; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
    a.button { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 18px; border-radius:8px; font-weight:800; text-decoration:none; }
    .primary { background:var(--ink); color:#fff; }
    .secondary { color:var(--ink); border:1px solid var(--line); }
    .visual { min-height:440px; border-radius:10px; background:linear-gradient(160deg,#eef2ff,#f8fafc 48%,#dbeafe); border:1px solid var(--line); padding:24px; display:flex; flex-direction:column; justify-content:flex-end; }
    .visual-card { background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; box-shadow:0 18px 60px rgba(15,23,42,.12); }
    .template-note { margin-top:14px; font-size:12px; color:var(--muted); }
    .band { padding:40px clamp(20px,5vw,64px); background:var(--soft); border-block:1px solid var(--line); display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
    .metric { background:#fff; border:1px solid var(--line); border-radius:8px; padding:20px; }
    .metric b { display:block; font-size:28px; margin-bottom:6px; }
    section { padding:56px clamp(20px,5vw,64px); }
    .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
    .item { border:1px solid var(--line); border-radius:8px; padding:22px; }
    footer { padding:32px clamp(20px,5vw,64px); color:var(--muted); border-top:1px solid var(--line); }
    @media (max-width: 820px) { .hero, .band, .grid { grid-template-columns:1fr; } nav { display:none; } .visual { min-height:300px; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">${name}</div>
    <nav><span>Service</span><span>Case</span><span>Contact</span></nav>
  </header>
  <main>
    <section class="hero">
      <div>
        <div class="eyebrow">${location} business refresh</div>
        <h1>${name}の魅力が最初の5秒で伝わるサイトへ。</h1>
        <p class="lead">${hook}</p>
        <div class="actions">
          <a class="button primary" href="#contact">${cta}</a>
          <a class="button secondary" href="#case">改善イメージを見る</a>
        </div>
      </div>
      <div class="visual" aria-label="Demo visual">
        <div class="visual-card">
          <strong>${issue}</strong>
          <p style="color:var(--muted);line-height:1.7;margin-bottom:0">診断データをもとに、ファーストビュー・導線・信頼情報を整理した差し替えデモです。</p>
          <div class="template-note">${escapeHtml(templateTitle)}</div>
        </div>
      </div>
    </section>
    <div class="band">
      <div class="metric"><b>${report.acts[0]?.metric_value ?? "-"}</b><span>${escapeHtml(report.acts[0]?.metric_label ?? "診断指標")}</span></div>
      <div class="metric"><b>${escapeHtml(report.total_loss)}</b><span>改善余地の目安</span></div>
      <div class="metric"><b>${report.source_coverage?.score ?? 0}%</b><span>データ取得カバレッジ</span></div>
    </div>
    <section id="case">
      <h2>改善ポイント</h2>
      <div class="grid">
        ${report.acts.map((act) => `<div class="item"><h3>${escapeHtml(act.headline)}</h3><p>${escapeHtml(act.body)}</p></div>`).join("")}
      </div>
    </section>
  </main>
  <footer id="contact">Generated by Paradigm Sales OS. This Astro-ready demo can be replaced with a production Astro site.</footer>
</body>
</html>`
}

export async function generateReplacementDemo(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{ ok: boolean; demoUrl: string | null; error?: string }> {
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
  const { error } = await sb.from("web_demos").upsert(
    {
      company_id: company.id,
      slug,
      name: `${company.company_name} Demo`,
      html_content: html,
      html,
      source: "sales_enrichment",
      is_published: true,
      meta: {
        generator: "astro_replacement_demo",
        content_template: {
          title: contentTemplate.title,
          quality_bar: contentTemplate.quality_bar,
          dify_selection_rule: contentTemplate.dify_selection_rule,
        },
        report_url: report.report_url,
        generated_at: new Date().toISOString(),
      },
    },
    { onConflict: "slug" },
  )
  if (error) {
    console.error("[demo-generator] upsert failed:", error.message)
    return { ok: false, demoUrl: null, error: error.message }
  }

  const locale = company.report_locale ?? "ja"
  return { ok: true, demoUrl: `https://paradigmjp.com/${locale}/d/${slug}` }
}
