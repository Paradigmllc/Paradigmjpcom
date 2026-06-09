/**
 * HyperFrames video templates — variant-specific 60-second diagnostic reports.
 * Uses GSAP (CDN, free) for animations. No external blocks required.
 */

import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

interface Theme {
  bg: string
  accent: string
  accentDark: string
  text: string
  muted: string
  signal: string
}

function themeForVariant(variant: string, industry: string | null): Theme {
  if (variant === "meo") return { bg: "#0a1f0e", accent: "#2d9b4e", accentDark: "#164723", text: "#f0fdf4", muted: "rgba(240,253,244,0.6)", signal: "#4ade80" }
  if (variant === "security") return { bg: "#1f0a0a", accent: "#dc2626", accentDark: "#7f1d1d", text: "#fef2f2", muted: "rgba(254,242,242,0.6)", signal: "#f87171" }
  if (variant === "japan_entry") return { bg: "#0a1628", accent: "#1e40af", accentDark: "#172554", text: "#eff6ff", muted: "rgba(239,246,255,0.6)", signal: "#60a5fa" }
  if (variant === "video_subscription") return { bg: "#140a28", accent: "#7c3aed", accentDark: "#4c1d95", text: "#faf5ff", muted: "rgba(250,245,255,0.6)", signal: "#a78bfa" }
  if (variant === "subsidy") return { bg: "#0a1f1f", accent: "#0d9488", accentDark: "#134e4a", text: "#f0fdfa", muted: "rgba(240,253,250,0.6)", signal: "#2dd4bf" }
  if (variant === "outreach") return { bg: "#1f150a", accent: "#ea580c", accentDark: "#7c2d12", text: "#fff7ed", muted: "rgba(255,247,237,0.6)", signal: "#fb923c" }
  // default: website_diagnostic
  return { bg: "#080b12", accent: "#7c5cff", accentDark: "#3b1f8c", text: "#ffffff", muted: "rgba(255,255,255,0.6)", signal: "#a78bfa" }
}

// ─── SVG gauge for speed/score display ───
function svgGauge(score: number, maxScore: number, color: string): string {
  const radius = 54, circumference = 2 * Math.PI * radius
  const pct = Math.min(score / maxScore, 1)
  return `<svg width="140" height="140" viewBox="0 0 140 140" style="filter:drop-shadow(0 0 18px ${color}44)">
    <circle cx="70" cy="70" r="${radius}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>
    <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="6"
      stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - pct)}"
      stroke-linecap="round" transform="rotate(-90 70 70)" style="transition:stroke-dashoffset 1.5s ease-out"/>
    <text x="70" y="66" text-anchor="middle" fill="white" font-size="30" font-weight="800">${score}</text>
    <text x="70" y="86" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12">/ ${maxScore}</text>
  </svg>`
}

// ─── Template: Website Diagnostic (default) ───
export function buildWebsiteVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const theme = themeForVariant(data.template_variant, data.industry)
  const speed = data.acts.find(a => a.icon === "SPEED")?.metric_value
  return commonHtmlShell(data, script, theme, [
    { id: "hook", start: 0, duration: 7, content: `<div class="label pulse">${esc(data.industry ?? "GROWTH")} DIAGNOSTIC</div><h1 class="hero-text">${esc(script.hook)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "speed", start: 7, duration: 10, content: `<div class="label">PERFORMANCE</div><div class="gauge-row">${speed ? svgGauge(Number(speed)||38, 100, theme.signal) : ""}</div><p>${esc(script.pain)}</p>` },
    { id: "impact", start: 17, duration: 14, content: `<div class="label">HIDDEN COST</div><h1>${esc(script.fear)}</h1><div class="metric-badge pulse">${esc(data.total_loss)}</div>` },
    { id: "solution", start: 31, duration: 16, content: `<div class="label">FIX IN 30 DAYS</div><h1>${esc(script.hope)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "cta", start: 47, duration: 13, content: `<div class="label">NEXT STEP</div><h1>${esc(script.cta)}</h1><div class="cta-url">${esc(data.report_url)}</div>` },
  ])
}

// ─── Template: MEO (Map/Local) ───
export function buildMeoVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const theme = themeForVariant("meo", data.industry)
  return commonHtmlShell(data, script, theme, [
    { id: "hook", start: 0, duration: 7, content: `<div class="label">GOOGLE MAPS ANALYSIS</div><h1 class="hero-text">${esc(script.hook)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "map", start: 7, duration: 10, content: `<div class="label">LOCAL VISIBILITY</div><div class="map-card"><div class="pin"></div><div>MAP LISTING POSITION</div></div><p>${esc(script.pain)}</p>` },
    { id: "reviews", start: 17, duration: 14, content: `<div class="label">REVIEW GAP</div><h1>${esc(script.fear)}</h1><div class="stars">★★★★★</div>` },
    { id: "solution", start: 31, duration: 16, content: `<div class="label">MEO OPTIMIZATION</div><h1>${esc(script.hope)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "cta", start: 47, duration: 13, content: `<div class="label">GET FOUND</div><h1>${esc(script.cta)}</h1><div class="cta-url">${esc(data.report_url)}</div>` },
  ])
}

// ─── Template: Security ───
export function buildSecurityVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const theme = themeForVariant("security", data.industry)
  return commonHtmlShell(data, script, theme, [
    { id: "hook", start: 0, duration: 7, content: `<div class="label pulse-red">SECURITY ALERT</div><h1 class="hero-text">${esc(script.hook)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "scorecard", start: 7, duration: 12, content: `<div class="label">SECURITY SCORECARD</div><div class="security-grid">${["SSL","HSTS","CSP","DNSSEC","DMARC"].map(s => `<div class="sec-item fail">${s}</div>`).join("")}</div><p>${esc(script.pain)}</p>` },
    { id: "risk", start: 19, duration: 14, content: `<div class="label pulse-red">COMPLIANCE RISK</div><h1>${esc(script.fear)}</h1><div class="warn-icon">⚠</div>` },
    { id: "solution", start: 33, duration: 15, content: `<div class="label">2-WEEK FIX</div><h1>${esc(script.hope)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "cta", start: 48, duration: 12, content: `<div class="label">SECURE NOW</div><h1>${esc(script.cta)}</h1><div class="cta-url">${esc(data.report_url)}</div>` },
  ])
}

// ─── Template: Japan Entry ───
export function buildJapanEntryVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const theme = themeForVariant("japan_entry", data.industry)
  return commonHtmlShell(data, script, theme, [
    { id: "hook", start: 0, duration: 7, content: `<div class="label">JAPAN MARKET ENTRY</div><h1 class="hero-text">${esc(script.hook)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "market", start: 7, duration: 12, content: `<div class="label">MARKET FIT</div><div class="check-grid">${["特商法","APPI","国内決済","日本語"].map(c => `<div class="check fail">${c}</div>`).join("")}</div><p>${esc(script.pain)}</p>` },
    { id: "deadline", start: 19, duration: 14, content: `<div class="label pulse-red">DEADLINE APPROACHING</div><h1>${esc(script.fear)}</h1><div class="countdown">3-6 MONTHS</div>` },
    { id: "solution", start: 33, duration: 15, content: `<div class="label">30-DAY ENTRY</div><h1>${esc(script.hope)}</h1><p>${esc(data.company_name)}</p>` },
    { id: "cta", start: 48, duration: 12, content: `<div class="label">ENTER JAPAN</div><h1>${esc(script.cta)}</h1><div class="cta-url">${esc(data.report_url)}</div>` },
  ])
}

// ─── Common HTML shell ───
interface SceneDef { id: string; start: number; duration: number; content: string }

function commonHtmlShell(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }, theme: Theme, scenes: SceneDef[]): string {
  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/><title>${esc(data.company_name)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${theme.bg};color:${theme.text};font-family:Inter,system-ui,sans-serif;overflow:hidden;width:1920px;height:1080px}
  [data-composition-id="paradigm-video"]{width:1920px;height:1080px;position:relative;background:linear-gradient(135deg,${theme.bg} 0%,${theme.accentDark} 50%,${theme.bg} 100%)}
  .grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:64px 64px;opacity:.22}
  .scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:120px 140px;opacity:0}
  .label{font-size:20px;font-weight:800;color:${theme.signal};text-transform:uppercase;letter-spacing:.15em;margin-bottom:24px}
  .label.pulse{animation:pulse 2s ease-in-out infinite} .label.pulse-red{color:#f87171;animation:pulse 2s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  h1{max-width:1300px;font-size:64px;line-height:1.08;font-weight:800;margin-bottom:16px}
  .hero-text{font-size:56px}
  p{color:${theme.muted};font-size:24px;line-height:1.5}
  .gauge-row{display:flex;gap:32px;align-items:center;margin:24px 0}
  .metric-badge{display:inline-block;background:${theme.accent};color:#fff;padding:12px 28px;border-radius:12px;font-size:36px;font-weight:800;margin-top:16px;box-shadow:0 0 40px ${theme.accent}44}
  .cta-url{color:${theme.signal};font-size:22px;margin-top:16px;font-family:monospace}
  .security-grid,.check-grid{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}
  .sec-item,.check{padding:10px 20px;border-radius:8px;font-size:18px;font-weight:700}
  .sec-item.fail,.check.fail{background:rgba(220,38,38,.2);color:#f87171;border:1px solid rgba(220,38,38,.3)}
  .sec-item.pass,.check.pass{background:rgba(34,197,94,.2);color:#4ade80;border:1px solid rgba(34,197,94,.3)}
  .map-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:40px;text-align:center;margin:24px 0;font-size:28px}
  .pin{width:20px;height:20px;background:#4ade80;border-radius:50%;margin:0 auto 16px;box-shadow:0 0 20px #4ade80}
  .stars{font-size:48px;color:#fbbf24;margin:24px 0;letter-spacing:8px}
  .warn-icon{font-size:64px;margin:24px 0}
  .countdown{font-size:48px;font-weight:800;color:#f87171;margin-top:16px}
  .footer{position:absolute;left:140px;right:140px;bottom:48px;display:flex;justify-content:space-between;color:${theme.muted};font-size:18px}
</style></head>
<body>
<div data-composition-id="paradigm-video" data-width="1920" data-height="1080" data-duration="60">
  <div class="grid"></div>
  ${scenes.map(s => `<section id="${s.id}" class="scene" data-start="${s.start}" data-duration="${s.duration}">${s.content}</section>`).join("\n")}
  <div class="footer"><span>Paradigm Diagnostic Report</span><span>${esc(data.report_url)}</span></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  ${scenes.map(s => `tl.to("#${s.id}",{opacity:1,duration:.4},${s.start}).from("#${s.id} h1",{y:40,opacity:0,duration:.7,ease:"power3.out"},${s.start+.06}).from("#${s.id} .metric-badge, #${s.id} .gauge-row, #${s.id} .security-grid, #${s.id} .check-grid, #${s.id} .map-card, #${s.id} .stars, #${s.id} .warn-icon, #${s.id} .countdown",{x:30,opacity:0,duration:.55,ease:"power2.out"},${s.start+.2}).to("#${s.id}",{opacity:0,duration:.3},${s.start+s.duration-.3});`).join("\n")}
  window.__timelines["paradigm-video"] = tl;
</script>
<script type="application/json" data-narration>${JSON.stringify(script)}</script>
</body></html>`
}

/** Route to the correct template based on variant */
export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  switch (data.template_variant) {
    case "meo": return buildMeoVideoHtml(data, script)
    case "security": return buildSecurityVideoHtml(data, script)
    case "japan_entry": return buildJapanEntryVideoHtml(data, script)
    default: return buildWebsiteVideoHtml(data, script)
  }
}
