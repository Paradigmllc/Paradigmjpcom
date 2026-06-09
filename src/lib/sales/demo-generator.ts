import { getServiceSalesSupabase } from "@/lib/supabase"
import { matchContentTemplate } from "./content-templates"
import { getR2StorageConfig, sanitizeR2ObjectName } from "./r2-storage"
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import { compactText, escapeHtml, labelForIndustry, themeForIndustry } from "./render-quality"
import type { SalesCompany } from "./types"

const CORRUPT_TEXT = /縺|繝|譁|蜑|荳|譛|谿|險|螟|豕|邨|髻|蠕|蝠|逕|莠|陦|蛻|諡|蜷|繧|�/

function isJa(locale: string): boolean {
  return locale === "ja"
}

function cleanCopy(value: string | null | undefined, fallback: string, max = 180): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return compactText(text, fallback, max)
}

function safeMetric(value: string | null | undefined, fallback: string): string {
  return cleanCopy(value, fallback, 40)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function metricBlock(label: string, value: string, detail: string): string {
  return `<div class="metric-card">
    <p>${escapeHtml(label)}</p>
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(detail)}</span>
  </div>`
}

function evidenceCard(act: DiagnosticAct | undefined, index: number, locale: string): string {
  const fallbackTitles = isJa(locale)
    ? ["第一印象の改善", "信頼材料の整理", "問い合わせ導線の短縮"]
    : ["Sharper first impression", "Clearer trust proof", "Shorter inquiry path"]
  const fallbackBodies = isJa(locale)
    ? [
        "検索やSNSから来た見込み客が、最初の画面で選ぶ理由を理解できるようにします。",
        "実績、レビュー、対応範囲を見やすく配置し、比較中の不安を減らします。",
        "問い合わせ前の迷いを減らし、相談や予約へ進む導線を短くします。",
      ]
    : [
        "Make the first screen explain why this business should be shortlisted.",
        "Place proof, reviews, and service scope where comparison-stage buyers need them.",
        "Reduce pre-inquiry hesitation with a shorter path to booking or contact.",
      ]
  const title = cleanCopy(act?.headline, fallbackTitles[index] ?? fallbackTitles[0], 90)
  const body = cleanCopy(act?.body, fallbackBodies[index] ?? fallbackBodies[0], 180)
  return `<article class="evidence-card">
    <span>0${index + 1}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(body)}</p>
  </article>`
}

function buildDemoHtml(company: SalesCompany, report: DiagnosticReportData, templateTitle: string): string {
  const theme = themeForIndustry(company.industry)
  const locale = company.report_locale ?? report.report_locale
  const japanese = isJa(locale)
  const name = company.company_name
  const hasNoSite = company.pagespeed_mobile == null // No PSI data = no existing site detected
  const isNewBuild = hasNoSite || !company.domain
  const buildType = isNewBuild
    ? (japanese ? "新規構築" : "New Build")
    : (japanese ? "差し替え改善" : "Replacement")
  const buildLabel = isNewBuild
    ? (japanese ? "既存サイトがないため、ゼロから最適な構成で構築します。" : "No existing site detected — built from scratch with optimal structure.")
    : (japanese ? "既存サイトの改善ポイントを反映した差し替え案です。" : "Replacement proposal reflecting improvement points from your current site.")
  const escapedName = escapeHtml(name)
  const brandMark = escapeHtml(initials(name) || name.slice(0, 1))
  const industry = labelForIndustry(company.industry, locale)
  const location = cleanCopy(
    company.prefecture,
    japanese ? "対応エリア" : "service area",
    40,
  )
  const hook = cleanCopy(
    report.hook,
    japanese
      ? "公開データと実測値をもとに、最初の5秒で選ばれる理由が伝わるサイトへ再設計します。"
      : "A focused replacement site that makes the reason to choose you clear in the first five seconds.",
    230,
  )
  const cta = cleanCopy(report.cta_text, japanese ? "無料相談を予約する" : "Book a consultation", 36)
  const primaryAct = report.acts[0]
  const secondaryAct = report.acts[1]
  const tertiaryAct = report.acts[2]
  const metricLabel = safeMetric(primaryAct?.metric_label, japanese ? "主要シグナル" : "Primary signal")
  const metricValue = safeMetric(primaryAct?.metric_value, "-")
  const issueTitle = cleanCopy(
    primaryAct?.headline,
    japanese ? "比較中の顧客が離脱する前に、選ばれる理由を見せます。" : "Show why you should be chosen before comparison-stage buyers leave.",
    130,
  )
  const issueBody = cleanCopy(
    primaryAct?.body,
    japanese
      ? "診断で見つかった弱点を、ファーストビュー、証拠、CTA導線へ変換した差し替えデモです。"
      : "This demo converts the audit findings into a sharper first view, stronger proof, and a clearer CTA.",
    200,
  )

  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapedName} | ${japanese ? "改善デモサイト" : "Replacement Demo"}</title>
  <style>
    :root {
      color-scheme: light;
      --ink:${theme.ink};
      --muted:${theme.muted};
      --paper:#fbfcff;
      --surface:#ffffff;
      --line:#dfe5ef;
      --accent:${theme.accent};
      --accent-dark:${theme.accentDark};
      --accent-soft:${theme.accentSoft};
      --signal:${theme.signal};
      --radius:8px;
    }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body {
      margin:0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color:var(--ink);
      background:var(--paper);
      letter-spacing:0;
    }
    a { color:inherit; }
    .site-shell { min-height:100vh; overflow:hidden; }
    .demo-top {
      position:sticky;
      top:0;
      z-index:20;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:20px;
      padding:14px clamp(18px,5vw,72px);
      border-bottom:1px solid rgba(15,23,42,.08);
      background:rgba(255,255,255,.92);
      backdrop-filter:blur(14px);
    }
    .brand { display:flex; align-items:center; gap:11px; min-width:0; font-weight:850; }
    .brand-mark {
      display:grid;
      place-items:center;
      width:36px;
      height:36px;
      border-radius:var(--radius);
      background:var(--ink);
      color:#fff;
      font-size:13px;
      letter-spacing:0;
    }
    .brand-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .nav { display:flex; align-items:center; gap:20px; color:var(--muted); font-size:13px; }
    .nav a { text-decoration:none; }
    .header-cta {
      min-height:38px;
      padding:0 14px;
      border:1px solid var(--ink);
      border-radius:var(--radius);
      background:var(--ink);
      color:#fff;
      font-weight:750;
      text-decoration:none;
      display:inline-flex;
      align-items:center;
    }
    .hero {
      display:grid;
      grid-template-columns:minmax(0,1.05fr) minmax(340px,.95fr);
      gap:52px;
      align-items:center;
      padding:80px clamp(18px,5vw,72px) 64px;
      background:
        radial-gradient(circle at 80% 8%, var(--accent-soft), transparent 34%),
        linear-gradient(180deg,#fff 0%,#f7f9fc 100%);
    }
    .eyebrow {
      display:inline-flex;
      flex-wrap:wrap;
      gap:8px;
      align-items:center;
      color:var(--accent-dark);
      font-size:12px;
      font-weight:850;
      text-transform:uppercase;
    }
    .eyebrow span {
      border:1px solid var(--line);
      border-radius:999px;
      background:#fff;
      padding:7px 10px;
    }
    h1 {
      margin:20px 0 0;
      max-width:850px;
      font-size:clamp(42px,6.6vw,84px);
      line-height:.98;
      letter-spacing:0;
    }
    .lead {
      margin:24px 0 0;
      max-width:690px;
      color:#475467;
      font-size:clamp(16px,1.9vw,20px);
      line-height:1.8;
    }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:32px; }
    .button {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:48px;
      padding:0 18px;
      border-radius:var(--radius);
      font-weight:850;
      text-decoration:none;
    }
    .button-primary { background:var(--ink); color:#fff; }
    .button-secondary { background:#fff; border:1px solid var(--line); color:var(--ink); }
    .visual {
      border:1px solid var(--line);
      border-radius:var(--radius);
      background:#fff;
      box-shadow:0 28px 70px rgba(15,23,42,.12);
      overflow:hidden;
    }
    .visual-top {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px;
      border-bottom:1px solid var(--line);
      background:#f8fafc;
      color:#64748b;
      font-size:12px;
    }
    .visual-body { padding:28px; display:grid; gap:22px; }
    .proof-line { display:grid; grid-template-columns:1fr auto; gap:18px; align-items:center; }
    .score {
      display:grid;
      place-items:center;
      width:96px;
      height:96px;
      border-radius:999px;
      border:10px solid var(--accent);
      background:var(--accent-soft);
      font-size:28px;
      font-weight:900;
    }
    .issue h2 { margin:0; font-size:30px; line-height:1.18; }
    .issue p { margin:12px 0 0; color:var(--muted); line-height:1.75; }
    .metrics {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:14px;
      padding:22px clamp(18px,5vw,72px);
      background:#fff;
      border-block:1px solid var(--line);
    }
    .metric-card {
      border:1px solid var(--line);
      border-radius:var(--radius);
      padding:18px;
      background:#fff;
      min-height:132px;
    }
    .metric-card p { margin:0; color:var(--muted); font-size:13px; }
    .metric-card strong { display:block; margin-top:12px; font-size:30px; line-height:1; }
    .metric-card span { display:block; margin-top:10px; color:#667085; font-size:13px; line-height:1.5; }
    section { padding:64px clamp(18px,5vw,72px); }
    .section-head { max-width:820px; }
    .section-head h2 { margin:0; font-size:clamp(32px,4vw,52px); line-height:1.06; }
    .section-head p { margin:18px 0 0; color:var(--muted); line-height:1.8; font-size:17px; }
    .evidence-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:28px; }
    .evidence-card { border:1px solid var(--line); border-radius:var(--radius); background:#fff; padding:22px; min-height:230px; }
    .evidence-card span { color:var(--accent-dark); font-weight:900; font-size:12px; }
    .evidence-card h3 { margin:16px 0 0; font-size:20px; line-height:1.3; }
    .evidence-card p { margin:12px 0 0; color:var(--muted); line-height:1.75; }
    .before-after {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
      margin-top:30px;
    }
    .pane {
      border:1px solid var(--line);
      border-radius:var(--radius);
      padding:24px;
      background:#fff;
    }
    .pane h3 { margin:0; font-size:20px; }
    .pane ul { margin:18px 0 0; padding-left:18px; color:var(--muted); line-height:1.9; }
    .pane.after { background:var(--ink); color:#fff; border-color:var(--ink); }
    .pane.after ul { color:rgba(255,255,255,.72); }
    .final-cta {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:26px;
      align-items:center;
      background:var(--ink);
      color:#fff;
    }
    .final-cta p { margin:12px 0 0; color:rgba(255,255,255,.72); line-height:1.8; max-width:820px; }
    footer {
      padding:26px clamp(18px,5vw,72px);
      color:#667085;
      border-top:1px solid var(--line);
      background:#fff;
      font-size:12px;
    }
    @media (max-width: 900px) {
      .nav { display:none; }
      .hero, .metrics, .evidence-grid, .before-after, .final-cta { grid-template-columns:1fr; }
      .hero { padding-top:52px; }
      .visual-body { padding:20px; }
      .proof-line { grid-template-columns:1fr; }
      h1 { font-size:42px; }
    }
  </style>
</head>
<body>
  <div class="site-shell">
    <header class="demo-top">
      <a class="brand" href="#top" aria-label="${escapedName}">
        <span class="brand-mark">${brandMark}</span>
        <span class="brand-name">${escapedName}</span>
      </a>
      <nav class="nav" aria-label="Demo navigation">
        <a href="#proof">${japanese ? "改善根拠" : "Proof"}</a>
        <a href="#plan">${japanese ? "改善方針" : "Plan"}</a>
        <a href="#difference">${japanese ? "差分" : "Difference"}</a>
      </nav>
      <a class="header-cta" href="#contact">${cta}</a>
    </header>

    <main id="top">
      <section class="hero">
        <div>
          <div class="eyebrow">
            <span>${escapeHtml(location)}</span>
            <span>${escapeHtml(industry)}</span>
            <span>${escapeHtml(templateTitle)}</span>
          </div>
          <h1>${escapeHtml(
            japanese
              ? `${name}が選ばれる理由を、最初の5秒で伝える。`
              : `Make ${name} easy to choose in the first five seconds.`,
          )}</h1>
          <p class="lead">${escapeHtml(hook)}</p>
          <div class="actions">
            <a class="button button-primary" href="#contact">${cta}</a>
            <a class="button button-secondary" href="#proof">${japanese ? "診断根拠を見る" : "See the evidence"}</a>
          </div>
        </div>

        <aside class="visual" aria-label="Audit-backed preview">
          <div class="visual-top">
            <span>${japanese ? "診断から作った差し替え案" : "Audit-backed replacement"}</span>
            <span>${escapeHtml(report.source_coverage.score)}% ${japanese ? "取得カバレッジ" : "coverage"}</span>
          </div>
          <div class="visual-body">
            <div class="proof-line">
              <div class="issue">
                <h2>${escapeHtml(issueTitle)}</h2>
                <p>${escapeHtml(issueBody)}</p>
              </div>
              <div class="score">${escapeHtml(metricValue)}</div>
            </div>
            <div class="metric-card">
              <p>${escapeHtml(metricLabel)}</p>
              <strong>${escapeHtml(report.total_loss)}</strong>
              <span>${japanese ? "放置した場合に残り続ける機会損失の目安です。" : "Estimated opportunity loss that remains if nothing changes."}</span>
            </div>
          </div>
        </aside>
      </section>

      <div id="proof" class="metrics">
        ${metricBlock(metricLabel, metricValue, japanese ? "公開データから見える優先シグナル" : "Priority signal from public data")}
        ${metricBlock(japanese ? "機会損失" : "Opportunity loss", report.total_loss, japanese ? "改善余地を金額で把握するための目安" : "A directional estimate for decision-making")}
        ${metricBlock(japanese ? "データ取得" : "Data coverage", `${report.source_coverage.score}%`, japanese ? "取得済みOSS/APIソースのカバレッジ" : "Coverage across OSS and API sources")}
      </div>

      <section id="plan">
        <div class="section-head">
          <h2>${japanese ? "数字を、顧客が動く導線に変える。" : "Turn evidence into a path buyers can follow."}</h2>
          <p>${japanese ? "スコアを並べるだけではなく、何が機会損失につながり、どの画面をどう直すべきかまで見えるようにします。" : "The point is not to show scores. The point is to make the loss, fix, and next action obvious."}</p>
        </div>
        <div class="evidence-grid">
          ${[primaryAct, secondaryAct, tertiaryAct].map((act, index) => evidenceCard(act, index, locale)).join("")}
        </div>
      </section>

      <section id="difference">
        <div class="section-head">
          <h2>${japanese ? "現状サイトと、差し替え後の違い。" : "What changes from the current site."}</h2>
          <p>${japanese ? "Astroで軽量に構築する前提で、ファーストビュー、信頼材料、問い合わせ導線を営業成果物として確認できます。" : "Built as an Astro-ready direction: lighter first view, stronger proof, and a clearer inquiry path."}</p>
        </div>
        <div class="before-after">
          <div class="pane">
            <h3>${japanese ? "Before" : "Before"}</h3>
            <ul>
              <li>${japanese ? "選ばれる理由が初見で伝わりにくい" : "The reason to choose the business is not obvious enough"}</li>
              <li>${japanese ? "信頼材料が問い合わせ導線と離れている" : "Trust proof is separated from the inquiry path"}</li>
              <li>${japanese ? "改善すべき箇所が数字だけでは判断しにくい" : "Raw scores do not explain what to fix first"}</li>
            </ul>
          </div>
          <div class="pane after">
            <h3>${japanese ? "After" : "After"}</h3>
            <ul>
              <li>${japanese ? "最初の5秒で強み、対象、次の行動がわかる" : "Strength, fit, and next action are clear in five seconds"}</li>
              <li>${japanese ? "実績・レビュー・対応範囲をCTA近くに配置" : "Proof, reviews, and service scope sit near the CTA"}</li>
              <li>${japanese ? "診断根拠を改善優先度へ変換" : "Audit evidence becomes an implementation priority list"}</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="contact" class="final-cta">
        <div>
          <h2>${japanese ? "この方向性で、本番サイトへ進めます。" : "This direction is ready to become the production site."}</h2>
          <p>${escapeHtml(
            cleanCopy(
              report.content_template.quality_bar,
              japanese
                ? "1画面目で結論・根拠・次アクションが読める。煽りではなく、客観データと改善余地を中心にする。"
                : "The first screen must make conclusion, evidence, and next action clear without unsupported claims.",
              220,
            ),
          )}</p>
        </div>
        <a class="button button-primary" style="background:#fff;color:var(--ink)" href="mailto:info@paradigmjp.com?subject=${encodeURIComponent(`${company.company_name} demo`)}">${cta}</a>
      </section>
    </main>

    <footer>
      ${japanese ? "このページは診断データをもとに生成された差し替えデモです。実装時はAstroで高速・軽量に再構築します。" : "This is an audit-backed replacement demo. Production implementation can be rebuilt as a fast Astro site."}
    </footer>
  </div>
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

  // Prefer R2 for HTML storage to avoid Supabase DB bloat
  const r2Config = getR2StorageConfig()
  let demoUrl: string | null = null
  const locale = company.report_locale ?? report.report_locale

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
      console.log("[demo-generator] saved to R2:", r2Key)
    } catch (r2Err) {
      console.error("[demo-generator] R2 upload failed, falling back to Supabase:", r2Err)
    }
  }

  // Fallback: save to Supabase web_demos (lightweight metadata only)
  const meta: Record<string, unknown> = {
    generator: "astro_replacement_demo",
    renderer_version: "professional-v3-independent-site",
    content_template: {
      title: contentTemplate.title,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
    },
    report_url: report.report_url,
    r2_url: demoUrl,
    generated_at: new Date().toISOString(),
  }

  const { error } = await sb.from("web_demos").upsert(
    {
      company_id: company.id,
      slug,
      name: `${company.company_name} Demo`,
      html_content: demoUrl ? "(R2)" : html,  // Store URL reference or full HTML as fallback
      html: demoUrl ? "(R2)" : html,
      source: "sales_enrichment",
      is_published: true,
      meta,
    },
    { onConflict: "slug" },
  )
  if (error) {
    console.error("[demo-generator] upsert failed:", error.message)
    if (!demoUrl) return { ok: false, demoUrl: null, error: error.message }
  }

  return { ok: true, demoUrl: demoUrl ?? `https://paradigmjp.com/${locale}/d/${slug}` }
}
