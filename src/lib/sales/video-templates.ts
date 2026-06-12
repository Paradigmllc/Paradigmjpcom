/**
 * Executive diagnostic video composition for report embeds and MP4 rendering.
 *
 * Generates a self-contained HyperFrames composition HTML document with:
 * - 5 scenes (hero / evidence / loss / demo / cta) with crossfade transitions
 * - GSAP timeline registered on window.__timelines
 * - Three.js background layer
 * - Data-driven evidence bars, audit pins, and chapter navigation
 *
 * HyperFrames rules enforced:
 * - No exit animations except on final scene
 * - Crossfade transitions between ALL scenes
 * - Unique data-track-index per overlapping element
 * - width:100%/height:100% + --hf-scale responsive sizing
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import { videoLabels } from "./video-template-labels"
import { videoTemplateFormat, type VideoTemplateFormat } from "./video-template-format"
import { buildThreeLayerScript } from "./video-template-three"
import { themeForVariant } from "./video-template-theme"
import { buildVideoTemplateCss } from "./video-template-css"
import { buildVideoTemplateScript } from "./video-template-script"

interface VideoScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

interface VideoTemplateOptions {
  format?: VideoTemplateFormat
}

const CORRUPT_TEXT = /驍ｵ・ｺ|驛｢|髫ｴ|鬮ｫ|髯桍鬯ｮ|髯毫鬨ｾ|髣培鬮ｯ|髯弓髫ｲ|髯ｷ|郢掟邵ｺ|隴斈陋ｻ|陷・陷鋼隹ｺ|・・繝ｻ/

function esc(v: string | null | undefined): string { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }
function cleanText(v: string | null | undefined, fallback: string, max = 118): string { const t = String(v ?? "").replace(/\s+/g, " ").trim(); return !t || CORRUPT_TEXT.test(t) ? fallback : t.length > max ? `${t.slice(0, max - 1)}...` : t }
function nf(value: string | null | undefined): number { const t = String(value ?? ""); const m = t.match(/[\d,.]+/); return m ? (Number.parseFloat(m[0].replace(/,/g, "")) || 0) : 0 }
function pct(value: string | null | undefined, f: number): number { const n = nf(value); return Math.max(8, Math.min(100, n || f)) }
function actAt(data: DiagnosticReportData, i: number): DiagnosticAct | null { return data.acts[i] ?? data.acts.find((a) => !CORRUPT_TEXT.test(a.headline)) ?? null }

export function buildVariantVideoHtml(data: DiagnosticReportData, script: VideoScript, options: VideoTemplateOptions = {}): string {
  const theme = themeForVariant(data.template_variant)
  const format = videoTemplateFormat(options.format, theme)
  const t = videoLabels(data.report_locale)
  const company = cleanText(data.company_name, "Target company", 56)
  const hook = cleanText(script.hook || data.hook, t.defaultHook, 92)
  const summaryTitle = data.report_locale === "ja"
    ? `${company}の取りこぼしを、36秒で見える化`
    : `The revenue leakage story for ${company}`
  const pain = cleanText(script.pain, t.defaultPain, 104)
  const fear = cleanText(script.fear, t.defaultFear, 104)
  const futureBody = cleanText(script.hope, t.defaultHope, 104)
  const cta = cleanText(script.cta || data.cta_text, t.defaultCta, 104)
  const firstAct = actAt(data, 0)
  const secondAct = actAt(data, 1)
  const metricLabel = cleanText(firstAct?.metric_label, t.coverage, 34)
  const metricValue = cleanText(firstAct?.metric_value, `${data.source_coverage.score}`, 18)
  const currentScore = pct(firstAct?.metric_value, data.source_coverage.score || 38)
  const targetScore = Math.max(72, currentScore + 18)
  const lossValue = cleanText(data.total_loss, data.report_locale === "ja" ? "要確認" : "TBD", 24)
  const monthlyLoss = nf(data.total_loss)
  const annualLoss = monthlyLoss > 0 ? monthlyLoss * 12 : 0
  const annualLabel = annualLoss > 0
    ? data.report_locale === "ja"
      ? `約${Math.round(annualLoss).toLocaleString("ja-JP")}円`
      : `$${Math.round(annualLoss / 150).toLocaleString("en-US")}`
    : data.report_locale === "ja" ? "要精査" : "To verify"
  const lossHeadline = data.report_locale === "ja"
    ? `${lossValue}の機会損失が、静かに積み上がっています`
    : `${lossValue} in potential leakage is accumulating quietly`
  const futureHeadline = data.report_locale === "ja"
    ? "改善後は、訪問者が迷わず予約まで進める導線へ"
    : "After the fix, visitors should move cleanly toward booking"
  const reportUrl = cleanText(data.report_url, "paradigmjp.com", 74)
  const demoUrl = data.demo_url ? cleanText(data.demo_url, "", 74) : ""
  const primaryScreenshotUrl = data.evidence_screenshot_url ?? data.screenshot_url
  const screenshotUrl = primaryScreenshotUrl ? esc(primaryScreenshotUrl) : ""
  const mobileScreenshotUrl = data.screenshot_mobile_url ? esc(data.screenshot_mobile_url) : ""
  const signals = data.source_coverage.items
    .filter((item) => item.score > 0)
    .slice(0, 4)
    .map((item) => ({
      category: cleanText(item.category, "Signal", 16),
      label: cleanText(item.label, "Evidence", 42),
      score: Math.max(8, Math.min(100, item.score)),
    }))
  const evidenceRows = signals.length > 0
    ? signals
    : [
        { category: "SEO", label: data.report_locale === "ja" ? "検索から予約までの導線" : "Search path", score: data.source_coverage.score || 42 },
        { category: "UX", label: data.report_locale === "ja" ? "問い合わせ前の迷い" : "Inquiry path", score: 54 },
        { category: "Proof", label: data.report_locale === "ja" ? "信頼判断の材料" : "Trust proof", score: 46 },
      ]
  const annotations = (data.visual_annotations ?? []).slice(0, 3)
  const annotationHtml = annotations.map((annotation, index) => `
    <div class="audit-pin severity-${esc(annotation.severity)}" style="left:${annotation.x}%;top:${annotation.y}%">
      <b>${index + 1}</b>
      <span><strong>${esc(cleanText(annotation.label, "Finding", 42))}</strong><em>${esc(cleanText(annotation.body, "Visible conversion friction", 72))}</em></span>
    </div>
  `).join("")
  const preview = data.improvement_preview
  const journey = (data.visitor_journey ?? []).slice(0, 4)
  const journeyHtml = journey.map((step, index) => `
    <div class="route-step status-${esc(step.status)}">
      <b>${index + 1}</b>
      <span><strong>${esc(cleanText(step.label, "Step", 28))}</strong><em>${esc(cleanText(step.detail, "Decision path", 64))}</em></span>
    </div>
  `).join("")
  const previewHtml = preview
    ? `
      <div class="after-preview">
        <div class="before-pane">
          <span>Before</span>
          <p>${esc(cleanText(preview.before, "Value, proof, and action are disconnected.", 96))}</p>
        </div>
        <div class="after-pane">
          <span>After</span>
          <strong>${esc(cleanText(preview.headline, "Clear path to action", 58))}</strong>
          <p>${esc(cleanText(preview.after, "Make the next action obvious.", 96))}</p>
          <b>${esc(cleanText(preview.ctaLabel, "Visit -> consult", 32))}</b>
        </div>
      </div>
    `
    : `
      <div class="demo-body">
        <div class="demo-hero"><b></b><i></i></div>
        <div class="demo-cards"><span></span><span></span><span></span></div>
      </div>
    `
  const evidenceHtml = evidenceRows.map((row, index) => `
    <div class="evidence-row" style="--delay:${index * 0.08}s">
      <div>
        <span>${esc(row.category)}</span>
        <strong>${esc(row.label)}</strong>
      </div>
      <div class="meter"><i style="width:${row.score}%"></i></div>
      <b>${row.score}</b>
    </div>
  `).join("")
  const chapterLabels = t.scenes
  const chapterHtml = chapterLabels.map((label, index) => `
    <span class="chapter-pill" data-chapter="${index}">
      <i></i><b>${esc(label)}</b>
    </span>
  `).join("")
  const nodeHtml = evidenceRows.map((row, index) => `
    <span class="data-node" style="--x:${16 + index * 17}%;--y:${26 + (index % 3) * 18}%;--s:${Math.max(12, row.score / 4)}px"></span>
  `).join("")
  const heroPanelHtml = screenshotUrl
    ? `
      <div class="panel site-panel">
        <div class="browser-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><b>${esc(t.current)}</b></div>
        <div class="site-shot-wrap">
          <img class="site-shot" src="${esc(screenshotUrl)}" alt="${esc(company)} current website screenshot" loading="eager" crossorigin="anonymous" />
          ${annotationHtml}
          <div class="shot-callout"><span>${esc(metricLabel)}</span><strong>${esc(metricValue)}</strong></div>
        </div>
      </div>
    `
    : `
      <div class="panel score-card">
        <div>
          <h2>${esc(metricLabel)}</h2>
          <p>${esc(pain)}</p>
        </div>
        <div>
          <div class="score-main"><span>${esc(t.coverage)}</span><strong class="count" data-count="${data.source_coverage.score}">0</strong></div>
          <div class="bar-duo">
            <div><div class="bar current"><label>${esc(t.current)}</label><i style="--h:${currentScore}%"></i></div></div>
            <div><div class="bar target"><label>${esc(t.target)}</label><i style="--h:${targetScore}%"></i></div></div>
          </div>
        </div>
      </div>
    `
  const proofPanelHtml = mobileScreenshotUrl
    ? `
      <div class="panel proof-grid">
        <div>
          <h2>${esc(t.proof)}</h2>
          <div class="evidence-list">${evidenceHtml}</div>
        </div>
        <div class="phone-shot"><img src="${esc(mobileScreenshotUrl)}" alt="${esc(company)} mobile website screenshot" loading="lazy" crossorigin="anonymous" /></div>
      </div>
    `
    : `
      <div class="panel">
        <h2>${esc(t.proof)}</h2>
        <div class="evidence-list">${evidenceHtml}</div>
      </div>
    `

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(company)} - Paradigm Diagnostic Film</title>
  <style>${buildVideoTemplateCss(theme, format)}</style>
</head>
<body>
  <div
    data-composition-id="diagnostic-report-video"
    class="${format.className}"
    data-start="0"
    data-duration="36"
    data-width="${format.width}"
    data-height="${format.height}"
  >
    <div class="clip wash" data-start="0" data-duration="36" data-track-index="0"></div>
    <canvas id="three-layer" class="clip" data-start="0" data-duration="36" data-track-index="2" aria-hidden="true"></canvas>
    <div class="clip grid-bg" data-start="0" data-duration="36" data-track-index="4"></div>
    <div class="clip scan-beam" data-start="0" data-duration="36" data-track-index="5"></div>
    <div class="clip grain" data-start="0" data-duration="36" data-track-index="6"></div>
    <div class="clip node-field" data-start="0" data-duration="36" data-track-index="7" aria-hidden="true">${nodeHtml}</div>
    <div class="clip frame" data-start="0" data-duration="36" data-track-index="8"></div>
    <div class="clip brand" data-start="0" data-duration="36" data-track-index="3"><span><b>PARADIGM</b> DIAGNOSTIC</span><span>${esc(t.generated)}</span></div>
    <div class="clip chapter-strip" data-start="0" data-duration="36" data-track-index="3">${chapterHtml}</div>

    <section id="scene-hero" class="clip scene scene-hero" data-start="0" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.eyebrow)}</div>
        <h1>${esc(summaryTitle)}</h1>
        <p class="lead">${esc(hook)}</p>
        <span class="caption-band">${esc(metricLabel)}: ${esc(metricValue)}</span>
      </div>
      ${heroPanelHtml}
    </section>

    <section id="scene-evidence" class="clip scene scene-evidence" data-start="7" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.evidence)}</div>
        <h1>${esc(cleanText(firstAct?.headline, pain, 88))}</h1>
        <p class="lead">${esc(cleanText(firstAct?.body, pain, 150))}</p>
        <span class="caption-band">${esc(evidenceRows[0]?.label ?? metricLabel)}</span>
      </div>
      ${proofPanelHtml}
    </section>

    <section id="scene-loss" class="clip scene scene-loss" data-start="14" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.loss)}</div>
        <h1>${esc(lossHeadline)}</h1>
        <p class="lead">${esc(cleanText(secondAct?.body, fear, 150))}</p>
        <span class="caption-band">${esc(t.monthly)} ${esc(lossValue)}</span>
      </div>
      <div class="panel">
        <h2>${esc(t.loss)}</h2>
        <div class="loss-number">${esc(lossValue)}</div>
        <div class="metric-stack">
          <div class="metric"><span>${esc(t.monthly)}</span><strong>${esc(lossValue)}</strong></div>
          <div class="metric"><span>${esc(t.annual)}</span><strong>${esc(annualLabel)}</strong></div>
        </div>
      </div>
    </section>

    <section id="scene-demo" class="clip scene scene-demo" data-start="21" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.demo)}</div>
        <h1>${esc(futureHeadline)}</h1>
        <p class="lead">${esc(futureBody)}</p>
        <span class="caption-band">${esc(demoUrl || reportUrl)}</span>
      </div>
      <div class="panel demo-window">
        <div class="browser-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        ${previewHtml}
        <div class="route-replay">
          ${journeyHtml}
          <div class="evidence-row">
            <div><span>${esc(t.cta)}</span><strong>${esc(cta)}</strong></div>
            <div class="meter"><i style="width:86%"></i></div>
            <b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg></b>
          </div>
        </div>
      </div>
    </section>

    <section id="scene-cta" class="clip scene scene-cta full" data-start="28" data-duration="8" data-track-index="1">
      <div class="cta-box">
        <div class="kicker">${esc(t.cta)}</div>
        <h1>${esc(cta)}</h1>
        <p class="lead">${esc(reportUrl)}</p>
        <div class="cta-actions">
          <span class="action primary"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 16v-4m5 4V8m5 8v-7"/></svg>${esc(t.report)}</span>
          <span class="action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>${esc(t.booking)}</span>
          <span class="action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Zm0 4v10m-5-7 10 6m0-6L7 16"/></svg>HyperFrames</span>
        </div>
      </div>
    </section>

    <div class="clip footer" data-start="0" data-duration="36" data-track-index="3"><div>${esc(company)}</div><div class="progress"><i></i></div><div>${esc(reportUrl)}</div></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script>${buildVideoTemplateScript(format)}</script>
  ${buildThreeLayerScript()}
</body>
</html>`
}

export function buildWebsiteVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml(data, script)
}

export function buildMeoVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "meo" }, script)
}

export function buildSecurityVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "security" }, script)
}

export function buildJapanEntryVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  return buildVariantVideoHtml({ ...data, template_variant: "japan_entry" }, script)
}
