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
  const screenshotUrl = primaryScreenshotUrl ? cleanText(primaryScreenshotUrl, "", 240) : ""
  const mobileScreenshotUrl = data.screenshot_mobile_url ? cleanText(data.screenshot_mobile_url, "", 240) : ""
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
          <img class="site-shot" src="${esc(screenshotUrl)}" alt="${esc(company)} current website screenshot" loading="eager" />
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
        <div class="phone-shot"><img src="${esc(mobileScreenshotUrl)}" alt="${esc(company)} mobile website screenshot" loading="lazy" /></div>
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
  <style>
    *{box-sizing:border-box} html{--hf-scale:1;width:100%;height:100%;overflow:hidden;background:${theme.bg};} body{width:100%;height:100%;margin:0;overflow:hidden;background:${theme.bg};}
    body{font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${theme.panel};}
    svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    [data-composition-id]{width:100%;height:100%;position:relative;overflow:hidden;background:${theme.bg};transform:scale(var(--hf-scale));transform-origin:0 0;aspect-ratio:${format.width}/${format.height}}
    #three-layer{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:.8;mix-blend-mode:screen}
    .grid-bg{position:absolute;inset:0;background-image:linear-gradient(${theme.grid} 1px,transparent 1px),linear-gradient(90deg,${theme.grid} 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(90deg,transparent,black 18%,black 82%,transparent);opacity:.72;transform-origin:center}
    .wash{position:absolute;inset:-20%;background:radial-gradient(circle at 18% 18%,${theme.accentSoft}33 0,transparent 22%),radial-gradient(circle at 82% 72%,${theme.accent}30 0,transparent 25%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 45%);filter:blur(3px)}
    .scan-beam{position:absolute;inset:0;background:linear-gradient(100deg,transparent 0 38%,rgba(255,255,255,.18) 48%,transparent 58%);transform:translateX(-70%);mix-blend-mode:screen;opacity:.55}
    .grain{position:absolute;inset:0;opacity:.16;background-image:radial-gradient(circle at 20% 30%,rgba(255,255,255,.22) 0 1px,transparent 1px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.12) 0 1px,transparent 1px);background-size:18px 18px,23px 23px;mix-blend-mode:overlay}
    .data-node{position:absolute;left:var(--x);top:var(--y);width:var(--s);height:var(--s);border:1px solid ${theme.accentSoft};border-radius:50%;box-shadow:0 0 28px ${theme.accentSoft};opacity:.42}
    .data-node::after{content:"";position:absolute;inset:-18px;border:1px solid ${theme.rule};border-radius:50%}
    .chapter-strip{position:absolute;top:78px;left:92px;right:92px;z-index:18;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .chapter-pill{min-width:0;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.07);padding:9px 12px;color:rgba(255,255,255,.62);font-size:12px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;backdrop-filter:blur(14px)}
    .chapter-pill i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28);box-shadow:0 0 0 rgba(255,255,255,0)}
    .chapter-pill b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .chapter-pill.is-active{background:${theme.panel};border-color:transparent;color:${theme.ink};box-shadow:0 18px 54px rgba(0,0,0,.24)}
    .chapter-pill.is-active i{background:${theme.accent};box-shadow:0 0 22px ${theme.accent}}
    .frame{position:absolute;inset:52px;border:1px solid ${theme.rule};border-radius:34px;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015));box-shadow:0 28px 90px rgba(0,0,0,.34)}
    .brand{position:absolute;top:34px;left:44px;right:44px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.58);z-index:20}
    .brand b{color:${theme.accentSoft}}
    .scene{position:absolute;inset:0;padding:132px 92px 84px;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,420px);gap:42px;align-items:center;opacity:0;visibility:hidden}
    .scene.full{grid-template-columns:1fr;text-align:center;place-items:center}
    .kicker{display:inline-flex;align-items:center;gap:10px;margin-bottom:22px;color:${theme.accentSoft};font-size:16px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
    .kicker::before{content:"";width:38px;height:2px;background:${theme.accentSoft};border-radius:999px}
    h1{max-width:680px;margin:0;color:#fff;font-size:44px;line-height:1.12;letter-spacing:0;font-weight:830;text-wrap:balance}
    h2{margin:0;color:${theme.ink};font-size:30px;line-height:1.14;letter-spacing:0;font-weight:820;text-wrap:balance}
    p{margin:0;color:rgba(255,255,255,.7);font-size:18px;line-height:1.55;letter-spacing:0;text-wrap:pretty}
    .panel p{color:${theme.muted};font-size:16px;line-height:1.6}
    .lead{max-width:680px;margin-top:20px}
    .caption-band{display:inline-flex;max-width:660px;margin-top:18px;border-left:3px solid ${theme.accentSoft};padding:10px 14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.76);font-size:15px;font-weight:760;line-height:1.5;backdrop-filter:blur(12px)}
    .panel{max-width:100%;overflow:hidden;background:${theme.panel};color:${theme.ink};border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,.72);box-shadow:0 32px 90px rgba(0,0,0,.26)}
    .panel.dark{background:rgba(255,255,255,.08);border-color:${theme.rule};backdrop-filter:blur(16px);color:white}
    .panel.dark p{color:rgba(255,255,255,.64)}
    .score-card{min-height:392px;display:flex;flex-direction:column;justify-content:space-between}
    .score-main{display:grid;grid-template-columns:1fr auto;gap:22px;align-items:end}
    .score-main strong{font-size:62px;line-height:.92;color:${theme.accent};letter-spacing:0}
    .score-main span{color:${theme.muted};font-size:13px;font-weight:760;text-transform:uppercase;letter-spacing:.08em}
    .bar-duo{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}
    .bar{height:132px;border-radius:16px;background:${theme.panelSoft};display:flex;align-items:end;padding:12px;position:relative;overflow:hidden}
    .bar i{display:block;width:100%;height:0;border-radius:12px;background:${theme.accent}}
    .bar.target i{background:repeating-linear-gradient(45deg,${theme.ink} 0 8px,${theme.accent} 8px 16px)}
    .bar label{position:absolute;left:14px;top:14px;color:${theme.muted};font-size:14px;font-weight:800}
    .evidence-list{display:grid;gap:12px;margin-top:20px}
    .evidence-row{position:relative;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(96px,.9fr) 36px;gap:14px;align-items:center;padding:14px 16px;border:1px solid rgba(13,24,36,.1);border-radius:16px;background:rgba(255,255,255,.58);overflow:hidden}
    .evidence-row::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent);transform:translateX(-120%);opacity:.7}
    .evidence-row.is-focus{border-color:${theme.accent};box-shadow:0 18px 48px rgba(0,0,0,.16);transform:translateX(-8px) scale(1.02)}
    .evidence-row span{display:block;color:${theme.accent};font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
    .evidence-row strong{display:block;margin-top:4px;color:${theme.ink};font-size:17px;line-height:1.25}
    .meter{height:8px;background:${theme.panelSoft};border-radius:999px;overflow:hidden}.meter i{display:block;height:100%;background:${theme.accent};border-radius:999px;width:0}
    .metric-stack{display:grid;grid-template-columns:1fr;gap:12px;margin-top:22px}
    .metric{padding:18px;border-radius:18px;background:${theme.panelSoft};min-height:104px}.metric span{display:block;color:${theme.muted};font-size:13px;font-weight:800;text-transform:uppercase}.metric strong{display:block;margin-top:12px;font-size:34px;line-height:1.08;color:${theme.ink};overflow-wrap:anywhere}
    .loss-number{font-size:58px;line-height:.98;color:${theme.danger};font-weight:850;letter-spacing:0;margin-top:22px;overflow-wrap:anywhere}
    .browser-bar{height:48px;background:${theme.panelSoft};display:flex;align-items:center;gap:9px;padding:0 18px}.dot{width:12px;height:12px;border-radius:50%;background:${theme.accent}}.dot:nth-child(2){opacity:.55}.dot:nth-child(3){opacity:.3}
    .browser-bar b{margin-left:auto;color:${theme.muted};font-size:12px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
    .site-panel{overflow:hidden;padding:0}.site-shot-wrap{position:relative;height:344px;background:${theme.panelSoft};overflow:hidden}.site-shot{width:100%;height:100%;object-fit:cover;object-position:top;display:block;filter:saturate(.92) contrast(1.02)}.site-shot-wrap::after{content:"";position:absolute;inset:0;border:2px solid ${theme.accent};opacity:.18;pointer-events:none}.shot-callout{position:absolute;right:20px;bottom:20px;max-width:220px;border-radius:18px;background:${theme.panel};padding:15px 18px;box-shadow:0 22px 58px rgba(0,0,0,.26)}.shot-callout span{display:block;color:${theme.muted};font-size:12px;font-weight:850;text-transform:uppercase}.shot-callout strong{display:block;margin-top:8px;color:${theme.accent};font-size:34px;line-height:1}
    .audit-pin{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px;max-width:250px}.audit-pin b{display:grid;place-items:center;width:34px;height:34px;border:3px solid white;border-radius:50%;background:${theme.danger};color:white;font-size:14px;box-shadow:0 18px 42px rgba(0,0,0,.35)}.audit-pin span{display:block;border:1px solid rgba(255,255,255,.65);border-radius:14px;background:rgba(255,255,255,.94);padding:10px 12px;color:${theme.ink};box-shadow:0 18px 42px rgba(0,0,0,.24)}.audit-pin strong{display:block;font-size:12px;line-height:1.2}.audit-pin em{display:block;margin-top:4px;color:${theme.muted};font-size:10px;line-height:1.35;font-style:normal}
    .proof-grid{display:grid;grid-template-columns:minmax(0,1fr) 132px;gap:18px;align-items:stretch}.phone-shot{border:8px solid ${theme.ink};border-radius:28px;background:${theme.ink};overflow:hidden;min-height:300px;box-shadow:0 24px 64px rgba(0,0,0,.22)}.phone-shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
    .demo-body{padding:28px;display:grid;gap:18px}.demo-hero{height:108px;border-radius:20px;background:linear-gradient(135deg,${theme.ink},${theme.accent});padding:22px;color:white}.demo-hero b{display:block;width:70%;height:16px;background:white;border-radius:999px;opacity:.92}.demo-hero i{display:block;width:48%;height:10px;background:white;border-radius:999px;opacity:.42;margin-top:16px}
    .demo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.demo-cards span{height:78px;border-radius:16px;background:${theme.panelSoft};border:1px solid rgba(13,24,36,.08)}
    .after-preview{display:grid;grid-template-columns:.8fr 1fr;gap:12px;padding:18px}.before-pane,.after-pane{min-height:170px;border-radius:18px;padding:16px}.before-pane{background:#fff1f2;border:1px solid #fecdd3;color:#9f1239}.after-pane{background:${theme.panelSoft};border:1px solid ${theme.rule};color:${theme.ink}}.before-pane span,.after-pane span{display:block;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.before-pane p,.after-pane p{margin-top:10px;color:inherit;font-size:13px;line-height:1.45}.after-pane strong{display:block;margin-top:8px;font-size:20px;line-height:1.14}.after-pane b{display:inline-flex;margin-top:12px;border-radius:999px;background:${theme.accent};padding:8px 11px;color:white;font-size:12px}.route-replay{display:grid;gap:10px;padding:0 18px 18px}.route-step{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;border:1px solid rgba(13,24,36,.09);border-radius:14px;background:white;padding:10px 12px}.route-step>b{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:${theme.ink};color:white;font-size:11px}.route-step strong{display:block;color:${theme.ink};font-size:13px}.route-step em{display:block;margin-top:3px;color:${theme.muted};font-size:11px;line-height:1.3;font-style:normal}
    .cta-box{max-width:920px}.cta-box h1{max-width:920px;font-size:48px}.cta-actions{display:flex;justify-content:center;gap:14px;margin-top:30px}.action{display:inline-flex;align-items:center;gap:10px;border:1px solid ${theme.rule};border-radius:999px;padding:13px 18px;background:rgba(255,255,255,.1);font-size:15px;font-weight:800;color:white}.action.primary{background:${theme.panel};color:${theme.ink};border-color:transparent}
    .footer{position:absolute;left:44px;right:44px;bottom:30px;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;color:rgba(255,255,255,.42);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.footer div:nth-child(3){text-align:right}.progress{height:4px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.progress i{display:block;width:0;height:100%;background:${theme.accentSoft}}
    ${format.extraCss}
  </style>
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
  <script>
    function fitComposition() {
      document.documentElement.style.setProperty("--hf-scale", String(Math.min(window.innerWidth / ${format.width}, window.innerHeight / ${format.height})));
    }
    fitComposition();
    window.addEventListener("resize", fitComposition);
    window.__timelines = window.__timelines || {};
    const DURATION = 36;
    const SCENE_LEN = 7;
    const SCENE_IDS = ["#scene-hero", "#scene-evidence", "#scene-loss", "#scene-demo", "#scene-cta"];

    function updateChapter(time) {
      const active = Math.max(0, Math.min(4, Math.floor(time / SCENE_LEN)));
      document.querySelectorAll(".chapter-pill").forEach(function (pill, index) {
        pill.classList.toggle("is-active", index === active);
      });
    }
    function dispatchSeek(time) {
      updateChapter(time);
      window.__hfThreeTime = time;
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: time } }));
    }

    var tl = gsap.timeline({
      paused: true,
      onUpdate: function () { dispatchSeek(tl.time()); },
      onStart: function () { dispatchSeek(tl.time()); }
    });

    gsap.set(SCENE_IDS, { autoAlpha: 0 });

    tl.to(".grid-bg", { scale: 1.08, x: -28, y: 16, duration: DURATION, ease: "none" }, 0);
    tl.to(".wash", { xPercent: 8, yPercent: -5, scale: 1.06, duration: DURATION, ease: "sine.inOut" }, 0);
    tl.fromTo(".data-node", { scale: .6, opacity: .12 }, { scale: 1.7, opacity: .55, duration: 2.4, ease: "power2.inOut", stagger: .28, yoyo: true, repeat: 10 }, 0);

    document.querySelector(".chapter-pill")?.classList.add("is-active");

    SCENE_IDS.forEach(function (sceneId, index) {
      var at = index * SCENE_LEN;
      var sceneEl = document.querySelector(sceneId);
      if (!sceneEl) return;

      tl.set(sceneEl, { autoAlpha: 1, opacity: 1 }, at);

      var kickerEl = sceneEl.querySelector(".kicker");
      var h1El = sceneEl.querySelector("h1");
      var pEl = sceneEl.querySelector("p");
      var captionEl = sceneEl.querySelector(".caption-band");
      var panelEl = sceneEl.querySelector(".panel, .cta-actions");

      if (kickerEl) tl.from(kickerEl, { y: 18, opacity: 0, duration: .55, ease: "power3.out" }, at + .05);
      if (h1El) tl.from(h1El, { y: 34, opacity: 0, duration: .75, ease: "power3.out" }, at + .15);
      if (pEl) tl.from(pEl, { y: 24, opacity: 0, duration: .65, ease: "power3.out" }, at + .3);
      if (captionEl) tl.from(captionEl, { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: .62, ease: "power3.out" }, at + .75);
      if (panelEl) tl.from(panelEl, { y: 34, opacity: 0, scale: .985, duration: .8, ease: "power3.out" }, at + .2);

      var bars = gsap.utils.toArray(sceneEl.querySelectorAll(".bar i"));
      if (bars.length) tl.to(bars, { height: function(_, el){ return el.style.getPropertyValue("--h") || "0%"; }, duration: .9, ease: "power2.out" }, at + 1);

      var meters = gsap.utils.toArray(sceneEl.querySelectorAll(".meter i"));
      if (meters.length) tl.to(meters, { width: function(_, el){ return el.style.width || "0%"; }, duration: .75, ease: "power2.out", stagger: .07 }, at + .95);

      var auditPins = gsap.utils.toArray(sceneEl.querySelectorAll(".audit-pin"));
      if (auditPins.length) tl.fromTo(auditPins, { scale: .74, opacity: 0, y: 12 }, { scale: 1, opacity: 1, y: 0, duration: .42, ease: "back.out(1.7)", stagger: .42 }, at + 1.1);

      var routeSteps = gsap.utils.toArray(sceneEl.querySelectorAll(".route-step"));
      if (routeSteps.length) tl.fromTo(routeSteps, { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: .44, ease: "power3.out", stagger: .18 }, at + 1.05);

      var evidenceRows = gsap.utils.toArray(sceneEl.querySelectorAll(".evidence-row"));
      evidenceRows.forEach(function(row, rowIndex) {
        tl.to(row, { x: -8, scale: 1.02, duration: .35, ease: "power2.out", onStart: function(){ row.classList.add("is-focus"); } }, at + 1.15 + rowIndex * .72);
        tl.to(row, { x: 0, scale: 1, duration: .35, ease: "power2.in", onComplete: function(){ row.classList.remove("is-focus"); } }, at + 1.6 + rowIndex * .72);
      });

      tl.to(".progress i", { width: ((index + 1) / SCENE_IDS.length * 100) + "%", duration: (SCENE_LEN - .4), ease: "none" }, at);

      if (index < SCENE_IDS.length - 1) {
        var nextId = SCENE_IDS[index + 1];
        var transAt = at + SCENE_LEN - .3;
        tl.to(sceneId, { opacity: 0, duration: .4, ease: "power2.inOut" }, transAt);
        tl.fromTo(nextId, { opacity: 0 }, { opacity: 1, duration: .4, ease: "power2.inOut" }, transAt);
        tl.set(sceneId, { autoAlpha: 0, opacity: 1 }, transAt + .41);
      }
    });

    tl.to("#scene-cta", { opacity: 0, duration: .5, ease: "power2.in" }, DURATION - .6);

    var countEl = document.querySelector(".count");
    if (countEl) {
      tl.to({ value: 0 }, {
        value: Number(countEl.dataset.count || "0"),
        duration: 1.2,
        ease: "power2.out",
        onUpdate: function () { countEl.textContent = Math.round(this.targets()[0].value) + "%"; }
      }, .9);
    }

    window.__timelines["diagnostic-report-video"] = tl;
    dispatchSeek(0);

    window.addEventListener("message", function(event) {
      var message = event.data || {};
      if (message.source !== "diagnostic-report-player") return;
      if (message.type === "seek" && Number.isFinite(message.time)) {
        tl.time(Math.max(0, Math.min(DURATION, Number(message.time))));
        dispatchSeek(tl.time());
      }
      if (message.type === "toggle") { tl.paused() ? tl.play() : tl.pause(); }
      if (message.type === "play") tl.play();
      if (message.type === "pause") tl.pause();
      if (message.type === "replay") tl.time(0).play();
      if (message.type === "speed" && Number.isFinite(message.speed)) {
        tl.timeScale(Math.max(.5, Math.min(2, Number(message.speed))));
      }
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("autoplay") === "1" && !window.__HYPERFRAMES_PLAYER__) {
      window.requestAnimationFrame(function(){ tl.play(0); });
    }
  </script>
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
