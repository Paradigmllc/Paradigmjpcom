import { getServiceSalesSupabase } from "@/lib/supabase"
import { matchContentTemplate } from "./content-templates"
import type { DiagnosticReportData } from "./diagnostic"
import { compactText, escapeHtml, labelForIndustry, themeForIndustry } from "./render-quality"
import type { SalesCompany } from "./types"

function metricBlock(label: string, value: string, unit = ""): string {
  return `<div class="metric"><b>${escapeHtml(value)}${unit ? `<span>${escapeHtml(unit)}</span>` : ""}</b><p>${escapeHtml(label)}</p></div>`
}

function buildDemoHtml(company: SalesCompany, report: DiagnosticReportData, templateTitle: string): string {
  const theme = themeForIndustry(company.industry)
  const locale = company.report_locale ?? report.report_locale
  const isJa = locale === "ja"
  const name = escapeHtml(company.company_name)
  const industry = escapeHtml(labelForIndustry(company.industry, locale))
  const location = escapeHtml(company.prefecture ?? (isJa ? "地域密着" : "local market"))
  const hook = escapeHtml(compactText(report.hook, isJa ? "診断結果をもとに、初回接点の伝わり方を再設計します。" : "A redesigned first impression based on the diagnostic evidence.", 220))
  const cta = escapeHtml(report.cta_text)
  const primaryAct = report.acts[0]
  const secondaryAct = report.acts[1]
  const tertiaryAct = report.acts[2]

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} | Paradigm replacement demo</title>
  <style>
    :root {
      color-scheme: light;
      --ink:${theme.ink};
      --muted:${theme.muted};
      --paper:${theme.paper};
      --surface:${theme.surface};
      --line:${theme.line};
      --accent:${theme.accent};
      --accent-dark:${theme.accentDark};
      --accent-soft:${theme.accentSoft};
      --signal:${theme.signal};
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:var(--paper); }
    header { position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; gap:20px; padding:16px clamp(18px,5vw,68px); background:rgba(255,255,255,.92); border-bottom:1px solid var(--line); backdrop-filter: blur(14px); }
    .brand { display:flex; align-items:center; gap:10px; font-weight:800; }
    .mark { display:grid; place-items:center; width:32px; height:32px; border-radius:8px; background:var(--accent-dark); color:#fff; }
    nav { display:flex; gap:18px; font-size:13px; color:var(--muted); }
    nav a { color:inherit; text-decoration:none; }
    main { min-height:100vh; }
    .hero { display:grid; grid-template-columns:minmax(0,1.02fr) minmax(300px,.98fr); gap:46px; align-items:center; padding:70px clamp(18px,5vw,68px) 52px; }
    .eyebrow { display:inline-flex; gap:8px; align-items:center; border:1px solid var(--line); background:#fff; border-radius:8px; padding:8px 10px; color:var(--muted); font-size:12px; font-weight:700; }
    h1 { margin:18px 0 0; font-size:clamp(38px,7vw,76px); line-height:1; letter-spacing:0; }
    .lead { margin-top:22px; max-width:680px; color:var(--muted); font-size:clamp(16px,2vw,20px); line-height:1.85; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 18px; border-radius:8px; font-weight:800; text-decoration:none; }
    .primary { background:var(--accent-dark); color:#fff; }
    .secondary { color:var(--ink); background:#fff; border:1px solid var(--line); }
    .showcase { border:1px solid var(--line); border-radius:8px; background:linear-gradient(150deg,#fff,var(--accent-soft)); min-height:480px; padding:24px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 24px 70px rgba(15,23,42,.10); }
    .browser { border:1px solid var(--line); border-radius:8px; background:#fff; overflow:hidden; }
    .bar { height:34px; display:flex; align-items:center; gap:6px; padding:0 12px; border-bottom:1px solid var(--line); }
    .dot { width:9px; height:9px; border-radius:999px; background:var(--signal); }
    .mock { padding:22px; display:grid; gap:14px; }
    .mock h2 { margin:0; font-size:28px; line-height:1.18; }
    .mock p { margin:0; color:var(--muted); line-height:1.75; }
    .proof { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; padding:22px clamp(18px,5vw,68px); background:#fff; border-block:1px solid var(--line); }
    .metric { border:1px solid var(--line); border-radius:8px; padding:18px; background:var(--surface); }
    .metric b { display:block; font-size:28px; line-height:1.1; }
    .metric b span { font-size:14px; margin-left:4px; }
    .metric p { margin:8px 0 0; color:var(--muted); font-size:13px; line-height:1.5; }
    section { padding:58px clamp(18px,5vw,68px); }
    .section-head { max-width:760px; }
    .section-head h2 { margin:0; font-size:34px; line-height:1.15; }
    .section-head p { color:var(--muted); line-height:1.8; }
    .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:24px; }
    .item { border:1px solid var(--line); border-radius:8px; padding:22px; background:#fff; }
    .item h3 { margin:0; font-size:17px; line-height:1.45; }
    .item p { color:var(--muted); line-height:1.75; font-size:14px; }
    .cta { background:var(--ink); color:#fff; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:24px; align-items:center; }
    .cta p { color:rgba(255,255,255,.72); max-width:760px; line-height:1.8; }
    footer { padding:28px clamp(18px,5vw,68px); color:var(--muted); border-top:1px solid var(--line); font-size:12px; }
    @media (max-width: 880px) { .hero, .proof, .grid, .cta { grid-template-columns:1fr; } nav { display:none; } .showcase { min-height:340px; } h1 { font-size:42px; } }
  </style>
</head>
<body>
  <header>
    <div class="brand"><span class="mark">${name.slice(0, 1)}</span>${name}</div>
    <nav>
      <a href="#proof">${isJa ? "根拠" : "Proof"}</a>
      <a href="#plan">${isJa ? "改善案" : "Plan"}</a>
      <a href="#contact">${isJa ? "相談" : "Contact"}</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <div>
        <div class="eyebrow"><span>${location}</span><span>${industry}</span><span>${escapeHtml(templateTitle)}</span></div>
        <h1>${isJa ? "最初の5秒で、選ばれる理由が伝わるサイトへ。" : "Make the first five seconds explain why you should be chosen."}</h1>
        <p class="lead">${hook}</p>
        <div class="actions">
          <a class="button primary" href="#contact">${cta}</a>
          <a class="button secondary" href="#proof">${isJa ? "診断根拠を見る" : "View the evidence"}</a>
        </div>
      </div>
      <div class="showcase" aria-label="Replacement demo visual">
        <div class="browser">
          <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
          <div class="mock">
            <h2>${escapeHtml(primaryAct?.headline ?? (isJa ? "問い合わせ前の不安を減らす導線" : "A clearer path before inquiry"))}</h2>
            <p>${escapeHtml(primaryAct?.body ?? report.hook)}</p>
          </div>
        </div>
        <p style="margin:16px 0 0;color:var(--muted);line-height:1.7;font-size:13px">${isJa ? "これは診断データから作った差し替えデモです。本番ではAstroで高速・軽量に構築します。" : "This is a replacement demo generated from the diagnostic evidence. Production can be rebuilt in Astro."}</p>
      </div>
    </section>
    <div id="proof" class="proof">
      ${metricBlock(primaryAct?.metric_label ?? "Primary signal", primaryAct?.metric_value ?? "-", primaryAct?.metric_unit)}
      ${metricBlock(isJa ? "推定機会損失" : "Estimated opportunity loss", report.total_loss)}
      ${metricBlock(isJa ? "データ取得率" : "Source confidence", `${report.source_coverage.score}%`)}
    </div>
    <section id="plan">
      <div class="section-head">
        <h2>${isJa ? "改善は装飾ではなく、選ばれる理由の整理から。" : "The upgrade starts with clarity, not decoration."}</h2>
        <p>${isJa ? "診断で見つかった弱点を、ファーストビュー、信頼要素、問い合わせ導線に分解して改善します。" : "We turn the diagnostic findings into a better first view, stronger proof, and clearer CTA path."}</p>
      </div>
      <div class="grid">
        ${[primaryAct, secondaryAct, tertiaryAct]
          .filter(Boolean)
          .map((act) => `<div class="item"><h3>${escapeHtml(act?.headline)}</h3><p>${escapeHtml(act?.body)}</p></div>`)
          .join("")}
      </div>
    </section>
    <section id="contact" class="cta">
      <div>
        <h2>${isJa ? "このデモをベースに、最短で本番サイトへ。" : "Turn this demo into a production site."}</h2>
        <p>${escapeHtml(report.content_template.quality_bar)}</p>
      </div>
      <a class="button primary" style="background:#fff;color:var(--ink)" href="mailto:info@paradigmjp.com?subject=${encodeURIComponent(`${company.company_name} demo`) }">${isJa ? "相談する" : "Book a call"}</a>
    </section>
  </main>
  <footer>Generated by Paradigm Sales OS. Source of truth: Supabase. Demo framework target: Astro.</footer>
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
        renderer_version: "professional-v2",
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
