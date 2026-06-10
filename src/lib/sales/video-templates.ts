/**
 * Executive diagnostic video composition for report embeds and MP4 rendering.
 *
 * The report video must feel like a client-ready sales asset, not a toy demo:
 * one message per scene, sourced evidence, restrained motion, and readable type.
 */
import type { DiagnosticAct, DiagnosticReportData } from "./diagnostic"
import { videoLabels } from "./video-template-labels"

interface VideoTheme {
  bg: string
  panel: string
  panelSoft: string
  ink: string
  muted: string
  accent: string
  accentSoft: string
  danger: string
  rule: string
  grid: string
}

interface VideoScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

const CORRUPT_TEXT = /驍ｵ・ｺ|驛｢|髫ｴ|鬮ｫ|髯桍鬯ｮ|髯毫鬨ｾ|髣培鬮ｯ|髯弓髫ｲ|髯ｷ|郢掟邵ｺ|隴斈陋ｻ|陷・陷鋼隹ｺ|・・繝ｻ/

const SVG = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>', chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h16M8 16v-4m5 4V8m5 8v-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>', radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Zm0 4v10m-5-7 10 6m0-6L7 16"/></svg>',
}

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cleanText(value: string | null | undefined, fallback: string, max = 118): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function numberFrom(value: string | null | undefined): number {
  const text = String(value ?? "")
  const match = text.match(/[\d,.]+/)
  if (!match) return 0
  return Number.parseFloat(match[0].replace(/,/g, "")) || 0
}

function percent(value: string | null | undefined, fallback: number): number {
  const n = numberFrom(value)
  return Math.max(8, Math.min(100, n || fallback))
}

function themeForVariant(variant: string): VideoTheme {
  if (variant === "meo") {
    return {
      bg: "#07130d",
      panel: "#f4fbf6",
      panelSoft: "#e6f4ea",
      ink: "#102016",
      muted: "#5d7567",
      accent: "#15803d",
      accentSoft: "#bbf7d0",
      danger: "#b42318",
      rule: "rgba(21,128,61,.24)",
      grid: "rgba(187,247,208,.12)",
    }
  }
  if (variant === "security") {
    return {
      bg: "#140707",
      panel: "#fff7f4",
      panelSoft: "#fee4dc",
      ink: "#26100d",
      muted: "#82655f",
      accent: "#dc2626",
      accentSoft: "#fecaca",
      danger: "#991b1b",
      rule: "rgba(220,38,38,.24)",
      grid: "rgba(254,202,202,.13)",
    }
  }
  if (variant === "japan_entry") {
    return {
      bg: "#07111e",
      panel: "#f4f8ff",
      panelSoft: "#dbeafe",
      ink: "#0b1b33",
      muted: "#53677f",
      accent: "#2563eb",
      accentSoft: "#bfdbfe",
      danger: "#c2410c",
      rule: "rgba(37,99,235,.24)",
      grid: "rgba(191,219,254,.13)",
    }
  }
  if (variant === "video_subscription") {
    return {
      bg: "#100b16",
      panel: "#fbf7ff",
      panelSoft: "#ede9fe",
      ink: "#1d1427",
      muted: "#6f607c",
      accent: "#7c3aed",
      accentSoft: "#ddd6fe",
      danger: "#be123c",
      rule: "rgba(124,58,237,.24)",
      grid: "rgba(221,214,254,.13)",
    }
  }
  return {
    bg: "#081018",
    panel: "#f8fafc",
    panelSoft: "#e0f2fe",
    ink: "#0d1824",
    muted: "#587084",
    accent: "#0ea5e9",
    accentSoft: "#bae6fd",
    danger: "#d04f1f",
    rule: "rgba(14,165,233,.24)",
    grid: "rgba(186,230,253,.12)",
  }
}

function actAt(data: DiagnosticReportData, index: number, fallback: string): DiagnosticAct | null {
  return data.acts[index] ?? data.acts.find((act) => !CORRUPT_TEXT.test(act.headline)) ?? null
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: VideoScript): string {
  const theme = themeForVariant(data.template_variant)
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
  const firstAct = actAt(data, 0, t.defaultPain)
  const secondAct = actAt(data, 1, t.defaultFear)
  const metricLabel = cleanText(firstAct?.metric_label, t.coverage, 34)
  const metricValue = cleanText(firstAct?.metric_value, `${data.source_coverage.score}`, 18)
  const currentScore = percent(firstAct?.metric_value, data.source_coverage.score || 38)
  const targetScore = Math.max(72, currentScore + 18)
  const lossValue = cleanText(data.total_loss, data.report_locale === "ja" ? "要確認" : "TBD", 24)
  const monthlyLoss = numberFrom(data.total_loss)
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
  const chapterLabels = data.report_locale === "ja"
    ? ["異変", "根拠", "損失", "未来", "実行"]
    : ["Tension", "Evidence", "Leakage", "Future", "Action"]
  const chapterHtml = chapterLabels.map((label, index) => `
    <span class="chapter-pill" data-chapter="${index}">
      <i></i><b>${esc(label)}</b>
    </span>
  `).join("")
  const nodeHtml = evidenceRows.map((row, index) => `
    <span class="data-node" style="--x:${16 + index * 17}%;--y:${26 + (index % 3) * 18}%;--s:${Math.max(12, row.score / 4)}px"></span>
  `).join("")

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src * data:; font-src * data:;" />
  <title>${esc(company)} - Paradigm Diagnostic Film</title>
  <style>
    *{box-sizing:border-box} html,body{width:100%;height:100%;margin:0;overflow:hidden;background:${theme.bg};}
    body{font-family:Inter,"Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${theme.panel};}
    svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    [data-composition-id]{width:100vw;height:100vh;position:relative;overflow:hidden;background:${theme.bg};}
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
    .demo-window{overflow:hidden;padding:0}.browser-bar{height:48px;background:${theme.panelSoft};display:flex;align-items:center;gap:9px;padding:0 18px}.dot{width:12px;height:12px;border-radius:50%;background:${theme.accent}}.dot:nth-child(2){opacity:.55}.dot:nth-child(3){opacity:.3}
    .demo-body{padding:28px;display:grid;gap:18px}.demo-hero{height:108px;border-radius:20px;background:linear-gradient(135deg,${theme.ink},${theme.accent});padding:22px;color:white}.demo-hero b{display:block;width:70%;height:16px;background:white;border-radius:999px;opacity:.92}.demo-hero i{display:block;width:48%;height:10px;background:white;border-radius:999px;opacity:.42;margin-top:16px}
    .demo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.demo-cards span{height:78px;border-radius:16px;background:${theme.panelSoft};border:1px solid rgba(13,24,36,.08)}
    .cta-box{max-width:920px}.cta-box h1{max-width:920px;font-size:48px}.cta-actions{display:flex;justify-content:center;gap:14px;margin-top:30px}.action{display:inline-flex;align-items:center;gap:10px;border:1px solid ${theme.rule};border-radius:999px;padding:13px 18px;background:rgba(255,255,255,.1);font-size:15px;font-weight:800;color:white}.action.primary{background:${theme.panel};color:${theme.ink};border-color:transparent}
    .footer{position:absolute;left:44px;right:44px;bottom:30px;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;color:rgba(255,255,255,.42);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.footer div:nth-child(3){text-align:right}.progress{height:4px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden}.progress i{display:block;width:0;height:100%;background:${theme.accentSoft}}
    @media (max-width:900px){.frame{inset:18px;border-radius:22px}.brand{top:18px;left:22px;right:22px;font-size:10px}.chapter-strip{top:48px;left:22px;right:22px;gap:5px}.chapter-pill{padding:7px 8px;font-size:9px}.scene{padding:96px 28px 58px;grid-template-columns:1fr;gap:24px}h1{font-size:34px}h2{font-size:26px}p{font-size:16px}.score-card{min-height:340px}.score-main strong{font-size:52px}.loss-number{font-size:44px}.footer{left:22px;right:22px;bottom:18px;font-size:10px}.scene.full{padding:96px 26px 64px}.cta-box h1{font-size:32px}.cta-actions{flex-wrap:wrap}.panel{border-radius:22px;padding:22px}.demo-cards{grid-template-columns:1fr 1fr}.evidence-row{grid-template-columns:1fr}.metric-stack{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div
    data-composition-id="diagnostic-report-video"
    data-start="0"
    data-duration="36"
    data-width="1920"
    data-height="1080"
    data-hf-frameworks="hyperframes-player gsap css catalog:data-chart catalog:shimmer-sweep catalog:caption-highlight catalog:flash-through-white catalog:transitions-blur"
  >
    <div class="clip wash" data-start="0" data-duration="36" data-track-index="0"></div>
    <canvas id="three-layer" class="clip" data-start="0" data-duration="36" data-track-index="0" aria-hidden="true"></canvas>
    <div class="clip grid-bg" data-start="0" data-duration="36" data-track-index="0"></div>
    <div class="clip scan-beam" data-start="0" data-duration="36" data-track-index="0"></div>
    <div class="clip grain" data-start="0" data-duration="36" data-track-index="0"></div>
    <div class="clip node-field" data-start="0" data-duration="36" data-track-index="0" aria-hidden="true">${nodeHtml}</div>
    <div class="clip frame" data-start="0" data-duration="36" data-track-index="0"></div>
    <div class="clip brand" data-start="0" data-duration="36" data-track-index="3"><span><b>PARADIGM</b> DIAGNOSTIC</span><span>${esc(t.generated)}</span></div>
    <div class="clip chapter-strip" data-start="0" data-duration="36" data-track-index="3">${chapterHtml}</div>

    <section id="scene-hero" class="clip scene scene-hero" data-start="0" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.eyebrow)}</div>
        <h1>${esc(summaryTitle)}</h1>
        <p class="lead">${esc(hook)}</p>
        <span class="caption-band">${esc(metricLabel)}: ${esc(metricValue)}</span>
      </div>
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
    </section>

    <section id="scene-evidence" class="clip scene scene-evidence" data-start="7" data-duration="7" data-track-index="1">
      <div>
        <div class="kicker">${esc(t.evidence)}</div>
        <h1>${esc(cleanText(firstAct?.headline, pain, 88))}</h1>
        <p class="lead">${esc(cleanText(firstAct?.body, pain, 150))}</p>
        <span class="caption-band">${esc(evidenceRows[0]?.label ?? metricLabel)}</span>
      </div>
      <div class="panel">
        <h2>${esc(t.proof)}</h2>
        <div class="evidence-list">${evidenceHtml}</div>
      </div>
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
        <div class="demo-body">
          <div class="demo-hero"><b></b><i></i></div>
          <div class="demo-cards"><span></span><span></span><span></span></div>
          <div class="evidence-row">
            <div><span>${esc(t.cta)}</span><strong>${esc(cta)}</strong></div>
            <div class="meter"><i style="width:86%"></i></div>
            <b>${SVG.arrow}</b>
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
          <span class="action primary">${SVG.chart}${esc(t.report)}</span>
          <span class="action">${SVG.check}${esc(t.booking)}</span>
          <span class="action">${SVG.radar}HyperFrames</span>
        </div>
      </div>
    </section>

    <div class="clip footer" data-start="0" data-duration="36" data-track-index="3"><div>${esc(company)}</div><div class="progress"><i></i></div><div>${esc(reportUrl)}</div></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    function updateChapter(time) {
      const active = Math.max(0, Math.min(4, Math.floor(time / 7)));
      document.querySelectorAll(".chapter-pill").forEach(function (pill, index) {
        pill.classList.toggle("is-active", index === active);
      });
    }
    function dispatchSeek(time) {
      updateChapter(time);
      window.__hfThreeTime = time;
      window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: time } }));
    }
    const tl = gsap.timeline({
      paused: true,
      onUpdate: function () { dispatchSeek(tl.time()); },
      onStart: function () { dispatchSeek(tl.time()); }
    });
    const scenes = [".scene-hero", ".scene-evidence", ".scene-loss", ".scene-demo", ".scene-cta"];
    gsap.set(scenes, { autoAlpha: 0 });
    document.querySelector(".chapter-pill")?.classList.add("is-active");
    tl.to(".grid-bg", { scale: 1.08, x: -28, y: 16, duration: 36, ease: "none" }, 0);
    tl.to(".wash", { xPercent: 8, yPercent: -5, scale: 1.06, duration: 36, ease: "sine.inOut" }, 0);
    tl.fromTo(".data-node", { scale: .6, opacity: .12 }, { scale: 1.7, opacity: .55, duration: 2.4, ease: "power2.inOut", stagger: .28, yoyo: true, repeat: 10 }, 0);
    scenes.forEach((scene, index) => {
      const at = index * 7;
      tl.set(scene, { autoAlpha: 1 }, at);
      tl.fromTo(".scan-beam", { xPercent: -120, opacity: .1 }, { xPercent: 120, opacity: .55, duration: 1.2, ease: "power2.inOut" }, at + .18);
      tl.fromTo(scene + " .kicker", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: "power3.out" }, at);
      tl.fromTo(scene + " h1", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: .75, ease: "power3.out" }, at + .1);
      tl.fromTo(scene + " p", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ease: "power3.out" }, at + .26);
      tl.fromTo(scene + " .caption-band", { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: .62, ease: "power3.out" }, at + .72);
      tl.fromTo(scene + " .panel, " + scene + " .cta-actions", { y: 34, opacity: 0, scale: .985 }, { y: 0, opacity: 1, scale: 1, duration: .8, ease: "power3.out" }, at + .16);
      const bars = gsap.utils.toArray(scene + " .bar i");
      if (bars.length) {
        tl.to(bars, { height: function(_, el){ return el.style.getPropertyValue("--h") || "0%"; }, duration: .9, ease: "power2.out" }, at + .96);
      }
      const meters = gsap.utils.toArray(scene + " .meter i");
      if (meters.length) {
        tl.to(meters, { width: function(_, el){ return el.style.width || "0%"; }, duration: .75, ease: "power2.out", stagger: .07 }, at + .9);
      }
      const evidenceRows = gsap.utils.toArray(scene + " .evidence-row");
      evidenceRows.forEach(function(row, rowIndex) {
        tl.to(row, { x: -8, scale: 1.02, duration: .35, ease: "power2.out", onStart: function(){ row.classList.add("is-focus"); } }, at + 1.1 + rowIndex * .72);
        tl.to(row, { x: 0, scale: 1, duration: .35, ease: "power2.in", onComplete: function(){ row.classList.remove("is-focus"); } }, at + 1.55 + rowIndex * .72);
      });
      tl.to(".progress i", { width: ((index + 1) / scenes.length * 100) + "%", duration: 6.6, ease: "none" }, at);
      if (index < scenes.length - 1) {
        tl.to(scene + " h1, " + scene + " p, " + scene + " .panel, " + scene + " .cta-actions, " + scene + " .kicker, " + scene + " .caption-band", { y: -18, opacity: 0, duration: .35, ease: "power2.in" }, at + 6.35);
        tl.set(scene, { autoAlpha: 0 }, at + 6.85);
      }
    });
    tl.to(".scene-cta", { opacity: 0, duration: .5, ease: "power2.in" }, 35.4);
    const countEl = document.querySelector(".count");
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
      const message = event.data || {};
      if (message.source !== "diagnostic-report-player") return;
      if (message.type === "seek" && Number.isFinite(message.time)) {
        tl.time(Math.max(0, Math.min(36, Number(message.time))));
        dispatchSeek(tl.time());
      }
      if (message.type === "toggle") {
        if (tl.paused()) {
          tl.play();
        } else {
          tl.pause();
        }
      }
      if (message.type === "play") tl.play();
      if (message.type === "pause") tl.pause();
      if (message.type === "replay") tl.time(0).play();
      if (message.type === "speed" && Number.isFinite(message.speed)) {
        tl.timeScale(Math.max(.5, Math.min(2, Number(message.speed))));
      }
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoplay") === "1" && !window.__HYPERFRAMES_PLAYER__) {
      window.requestAnimationFrame(function(){ tl.play(0); });
    }
  </script>
  <script type="module">
    import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/+esm";
    const canvas = document.getElementById("three-layer");
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(1920, 1080, false); renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 100);
    camera.position.set(0, 0, 7.2);
    const group = new THREE.Group();
    scene.add(group);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .16 });
    const accent = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: .22 });
    for (let i = 0; i < 7; i += 1) {
      const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(.5 + i * .06, 1) : new THREE.TorusGeometry(.42 + i * .04, .012, 8, 42);
      const mesh = new THREE.Mesh(geo, i % 3 === 0 ? accent : material);
      mesh.position.set((i - 3) * .86, Math.sin(i) * 1.1, -i * .18); group.add(mesh);
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: .18 });
    for (let i = 0; i < 8; i += 1) {
      const points = [new THREE.Vector3(-4 + i, -2.2, -1), new THREE.Vector3(-2.8 + i * .5, .4, -1.4), new THREE.Vector3(3.5 - i * .15, 2.1, -1.1)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    }
    function renderAt(time) {
      group.rotation.y = time * .045; group.rotation.x = Math.sin(time * .18) * .08;
      group.children.forEach(function(child, index) {
        child.rotation.x = time * (.08 + index * .012); child.rotation.y = time * (.12 + index * .009);
      });
      camera.position.x = Math.sin(time * .11) * .28; camera.position.y = Math.cos(time * .09) * .18;
      renderer.render(scene, camera);
    }
    window.addEventListener("hf-seek", function(event) { renderAt(event.detail.time || 0); });
    renderAt(window.__hfThreeTime || 0);
  </script>
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
