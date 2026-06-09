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
  #paradigm-video{width:1920px;height:1080px;position:relative;overflow:hidden}
  /* Cinematic ambient background */
  .bg-layer{position:absolute;inset:0;background:linear-gradient(135deg,${theme.bg} 0%,${theme.accentDark} 35%,${theme.bg} 70%,${theme.accentDark} 100%);background-size:400% 400%}
  .particles{position:absolute;inset:0;opacity:.3}
  .particle{position:absolute;width:2px;height:2px;background:${theme.signal};border-radius:50%}
  .grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:80px 80px;opacity:.18}
  .vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.5) 100%);pointer-events:none;z-index:10}
  /* Continuous motion scene */
  .scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:100px 120px;opacity:0;z-index:5}
  .scene-inner{max-width:1400px}
  .label{font-size:18px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;margin-bottom:20px;display:inline-block;padding:6px 16px;border-radius:4px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
  .label.signal{color:${theme.signal};border-color:${theme.signal}33;background:${theme.signal}11}
  .label.warn{color:#f87171;border-color:#f8717133;background:#f8717111}
  h1{font-size:58px;line-height:1.06;font-weight:800;max-width:1300px;margin-bottom:12px}
  p{color:${theme.muted};font-size:22px;line-height:1.5;max-width:1000px}
  .metric-badge{display:inline-flex;align-items:center;gap:16px;background:${theme.accent};color:#fff;padding:16px 32px;border-radius:14px;font-size:42px;font-weight:800;margin-top:20px;box-shadow:0 0 60px ${theme.accent}33}
  .gauge-row{display:flex;gap:40px;align-items:center;margin:20px 0}
  .security-grid,.check-grid{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}
  .sec-item,.check{padding:12px 24px;border-radius:10px;font-size:16px;font-weight:700}
  .sec-item.fail,.check.fail{background:rgba(220,38,38,.15);color:#f87171;border:1px solid rgba(220,38,38,.25)}
  .map-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:48px;text-align:center;margin:20px 0;font-size:30px}
  .pin{width:24px;height:24px;background:#4ade80;border-radius:50%;margin:0 auto 20px;box-shadow:0 0 24px #4ade80aa}
  .stars{font-size:52px;color:#fbbf24;margin:20px 0;letter-spacing:10px}
  .countdown{font-size:56px;font-weight:800;color:#f87171;margin-top:16px;font-family:monospace}
  .footer{position:absolute;left:120px;right:120px;bottom:40px;display:flex;justify-content:space-between;color:rgba(255,255,255,.35);font-size:15px;z-index:10}
  .cta-url{color:${theme.signal};font-size:18px;margin-top:12px;font-family:monospace;opacity:.8}
</style></head>
<body>
<div id="paradigm-video">
  <div class="bg-layer" id="bg"></div>
  <div class="particles" id="particles"></div>
  <div class="grid"></div>
  <div class="vignette"></div>
  ${scenes.map((s,i) => `<div id="${s.id}" class="scene"><div class="scene-inner">${s.content}</div></div>`).join("\n")}
  <div class="footer"><span>Paradigm Diagnostic Report</span><span>${esc(data.report_url)}</span></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function(){
  // Ambient particle system
  const pc=document.getElementById('particles');
  for(let i=0;i<40;i++){const p=document.createElement('div');p.className='particle';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';p.style.width=(Math.random()*3+1)+'px';p.style.height=p.style.width;p.style.opacity=Math.random()*.4+.1;pc.appendChild(p)}
  
  // Continuous background motion (Ken Burns)
  gsap.to('#bg',{backgroundPosition:'100% 100%',duration:60,ease:'none'});
  
  // Floating particles
  document.querySelectorAll('.particle').forEach((p,i)=>{
    gsap.to(p,{x:(Math.random()-0.5)*80,y:(Math.random()-0.5)*60,duration:8+Math.random()*12,repeat:-1,yoyo:true,ease:'sine.inOut',delay:Math.random()*5});
  });

  const tl=gsap.timeline({paused:true});
  // Continuous flow: each scene fades in while previous fades out with slight overlap
  ${scenes.map((s, i) => {
    const nextStart = i < scenes.length - 1 ? scenes[i+1].start : s.start + s.duration
    const fadeOut = nextStart - 0.8
    return `
  // Scene ${i}: ${s.id}
  tl.to("#${s.id}",{opacity:1,duration:.8,ease:"power2.inOut"},${s.start})
   .from("#${s.id} .scene-inner",{y:40,scale:.96,opacity:0,duration:1,ease:"power3.out"},${s.start+.1})
   .from("#${s.id} h1",{y:30,opacity:0,duration:.7,ease:"expo.out"},${s.start+.15})
   .from("#${s.id} .metric-badge,#${s.id} .gauge-row,#${s.id} .security-grid,#${s.id} .check-grid",{y:25,opacity:0,duration:.6,ease:"back.out(1.3)"},${s.start+.35})`
  }).join("\n")}
  // Final: fade all out with a smooth ending
  tl.to("#paradigm-video",{opacity:.95,duration:2},58)
   .to("#paradigm-video",{opacity:0,duration:1},59.5);
  window.__timelines=window.__timelines||{};
  window.__timelines["paradigm-video"]=tl;
})();
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
