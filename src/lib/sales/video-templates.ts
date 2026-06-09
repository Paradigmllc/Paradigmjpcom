/**
 * HyperFrames video templates — professional-grade 60-second diagnostic reports.
 * Gamma AI / HeyGen quality: transitions, data viz, kinetic type, depth layers.
 */
import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

interface Theme {
  bg: string; accent: string; accentDark: string; accLight: string
  text: string; muted: string; signal: string; surface: string
}

function themeFor(variant: string): Theme {
  if (variant === "meo") return { bg: "#061408", accent: "#22c55e", accentDark: "#14532d", accLight: "#bbf7d0", text: "#f0fdf4", muted: "rgba(240,253,244,0.55)", signal: "#4ade80", surface: "rgba(255,255,255,0.04)" }
  if (variant === "security") return { bg: "#0f0505", accent: "#ef4444", accentDark: "#450a0a", accLight: "#fecaca", text: "#fef2f2", muted: "rgba(254,242,242,0.55)", signal: "#f87171", surface: "rgba(255,255,255,0.04)" }
  if (variant === "japan_entry") return { bg: "#050d1a", accent: "#3b82f6", accentDark: "#0c1e3d", accLight: "#bfdbfe", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", surface: "rgba(255,255,255,0.04)" }
  if (variant === "video_subscription") return { bg: "#0a0518", accent: "#8b5cf6", accentDark: "#2e1065", accLight: "#ddd6fe", text: "#faf5ff", muted: "rgba(250,245,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
  if (variant === "subsidy") return { bg: "#051414", accent: "#14b8a6", accentDark: "#134e4a", accLight: "#99f6e4", text: "#f0fdfa", muted: "rgba(240,253,250,0.55)", signal: "#2dd4bf", surface: "rgba(255,255,255,0.04)" }
  if (variant === "outreach") return { bg: "#0f0804", accent: "#f97316", accentDark: "#431407", accLight: "#fed7aa", text: "#fff7ed", muted: "rgba(255,247,237,0.55)", signal: "#fb923c", surface: "rgba(255,255,255,0.04)" }
  return { bg: "#06060c", accent: "#8b5cf6", accentDark: "#1e1040", accLight: "#ddd6fe", text: "#ffffff", muted: "rgba(255,255,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
}

// Rich data visualization: animated bar chart
function dataVizBars(metricLabel: string, metricValue: string, industryAvg: string, theme: Theme, id: string): string {
  const pct = Math.min(parseFloat(metricValue) || 38, 100)
  const threshold = 70
  return `<div class="data-viz" id="${id}">
  <div class="viz-title">${esc(metricLabel)}</div>
  <div class="viz-bars">
    <div class="bar-wrap"><div class="bar-label">Current</div><div class="bar-track"><div class="bar-fill bar-current" style="height:${pct}%;background:${pct < threshold ? theme.signal : theme.accent}"></div></div><div class="bar-val">${esc(metricValue)}</div></div>
    <div class="bar-wrap"><div class="bar-label">Target</div><div class="bar-track"><div class="bar-fill bar-target" style="height:${threshold}%"></div></div><div class="bar-val">${esc(industryAvg)}</div></div>
  </div>
</div>`
}

// Animated score badge
function scoreBadge(value: string, theme: Theme): string {
  return `<div class="score-badge"><span class="score-num">${esc(value)}</span><div class="score-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/><circle cx="50" cy="50" r="42" fill="none" stroke="${theme.signal}" stroke-width="5" stroke-dasharray="264" stroke-dashoffset="264" stroke-linecap="round" transform="rotate(-90 50 50)"/></svg></div></div>`
}

function metricCard(label: string, value: string, theme: Theme): string {
  return `<div class="metric-card"><div class="metric-label">${esc(label)}</div><div class="metric-val">${esc(value)}</div></div>`
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const theme = themeFor(data.template_variant)
  const { hook, pain, fear, hope, cta } = script
  const company = esc(data.company_name)
  const totalLoss = esc(data.total_loss)
  const isJa = data.report_locale === "ja"
  const label1 = isJa ? "公開データ分析" : "Public Evidence"
  const label2 = isJa ? "機会損失" : "Hidden Cost"
  const label3 = isJa ? "ソリューション" : "Solution"
  const label4 = isJa ? "次のステップ" : "Next Step"
  const industryAvg = "71"
  const metricLabel = isJa ? "現在スコア" : "Current Score"
  const metricValue = data.acts[0]?.metric_value || "38"
  const checkItems = ["特商法", "APPI", "決済", "日本語"]
  const checkGrid = checkItems.map(c => `<div class="check fail">${c}</div>`).join("")
  const lossMetrics = isJa
    ? `<div class="metrics-row">${metricCard("月間損失", totalLoss, theme)}${metricCard("年間換算", "×12 = " + (parseFloat(totalLoss.replace(/[^0-9.]/g,""))*12||"N/A"), theme)}</div>`
    : `<div class="metrics-row">${metricCard("Monthly Loss", totalLoss, theme)}${metricCard("Annual", "×12", theme)}</div>`

  const siteUrl = esc(data.report_url || "https://paradigmjp.com")

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/>
<meta name="viewport" content="width=1920"/>
<title>${company} — Paradigm Diagnostic</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:${theme.bg}}
  body{font-family:"Inter","Noto Sans JP",system-ui,-apple-system,sans-serif;color:${theme.text};position:relative}
  #canvas{width:100vw;height:100vh;max-width:1920px;max-height:1080px;margin:0 auto;position:relative;overflow:hidden}

  /* --- BACKGROUND DEPTH --- */
  .bg-base{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 30%,${theme.accent}18,transparent 70%),radial-gradient(ellipse 60% 50% at 80% 70%,${theme.accent}0a,transparent 60%),${theme.bg}}
  .bg-grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:96px 96px;opacity:.25}
  .bg-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:20}
  .bg-aurora{position:absolute;width:800px;height:500px;border-radius:50%;filter:blur(120px);opacity:.18;z-index:1;background:${theme.accent};top:20%;left:50%;transform:translate(-50%,-50%)}

  /* --- FLOATING ORBS --- */
  .orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.07;z-index:0}
  .orb-1{width:400px;height:400px;background:${theme.accent};top:10%;right:10%}
  .orb-2{width:300px;height:300px;background:${theme.signal};bottom:15%;left:15%}
  .orb-3{width:250px;height:250px;background:${theme.accent};top:50%;right:30%}

  /* --- SCENES --- */
  .scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:80px 120px;opacity:0;z-index:10;pointer-events:none}
  .scene.active{opacity:1;pointer-events:auto}
  .scene-inner{max-width:1500px}
  .scene-art{position:absolute;right:80px;top:50%;transform:translateY(-50%);z-index:5}

  /* --- KICKER LABEL --- */
  .kicker{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:${theme.signal};margin-bottom:24px}
  .kicker::before{content:"";display:block;width:32px;height:2px;background:${theme.signal};border-radius:1px}

  /* --- TYPOGRAPHY --- */
  h1{font-size:62px;line-height:1.08;font-weight:800;max-width:1300px;margin-bottom:20px;letter-spacing:-0.01em}
  p.body-copy{color:${theme.muted};font-size:22px;line-height:1.55;max-width:900px}
  .big-number{font-size:96px;font-weight:900;line-height:1;margin-bottom:8px;background:linear-gradient(135deg,${theme.text},${theme.signal});-webkit-background-clip:text;-webkit-text-fill-color:transparent}

  /* --- DATA VIZ --- */
  .data-viz{display:flex;flex-direction:column;gap:20px;margin-top:28px}
  .viz-title{font-size:16px;font-weight:700;color:${theme.muted};text-transform:uppercase;letter-spacing:.1em}
  .viz-bars{display:flex;gap:60px}
  .bar-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}
  .bar-label{font-size:13px;color:${theme.muted};text-transform:uppercase}
  .bar-track{width:48px;height:180px;background:${theme.surface};border-radius:8px;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:8px;transition:height 1.2s cubic-bezier(.22,1,.36,1)}
  .bar-target{border:2px dashed rgba(255,255,255,.2);background:transparent}
  .bar-val{font-size:28px;font-weight:800}

  /* --- METRIC CARDS --- */
  .metrics-row{display:flex;gap:24px;margin-top:24px}
  .metric-card{background:${theme.surface};border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:24px 32px;min-width:180px}
  .metric-label{font-size:12px;font-weight:700;color:${theme.muted};text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
  .metric-val{font-size:36px;font-weight:800;line-height:1}

  /* --- SCORE BADGE (SVG ring) --- */
  .score-badge{position:relative;display:inline-flex;align-items:center;justify-content:center;width:180px;height:180px;margin-top:20px}
  .score-num{font-size:48px;font-weight:900;z-index:2}
  .score-ring{position:absolute;inset:0}
  .score-ring svg{width:100%;height:100%}

  /* --- CHECK GRID (Japan Entry) --- */
  .check-grid{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
  .check{padding:14px 28px;border-radius:12px;font-size:16px;font-weight:700;border:1px solid rgba(220,38,38,.3);background:rgba(220,38,38,.1);color:#fca5a5}

  /* --- PROGRESS BAR --- */
  .progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:30}
  .progress-fill{height:100%;background:${theme.signal};transition:width .3s}

  /* --- FOOTER --- */
  .footer{position:absolute;left:120px;right:120px;bottom:32px;display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,.3);font-size:13px;z-index:25}
  .footer-logo{font-weight:700;color:${theme.signal}}
  .footer-url{font-family:monospace;font-size:12px;opacity:.6}

  /* --- ANIMATION --- */
  @keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
  @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,25px)}}
  @keyframes float3{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,15px)}}
  @keyframes aurora{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-40%,-40%) scale(1.15)}}
  .orb-1{animation:float1 12s ease-in-out infinite}
  .orb-2{animation:float2 15s ease-in-out infinite}
  .orb-3{animation:float3 10s ease-in-out infinite}
  .bg-aurora{animation:aurora 8s ease-in-out infinite}
</style></head>
<body>
<div id="canvas">
  <div class="bg-base"></div>
  <div class="bg-grid"></div>
  <div class="bg-aurora"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="bg-vignette"></div>

  <!-- SCENE 1: Hook (0-8s) -->
  <div class="scene" id="s1">
    <div class="scene-inner">
      <div class="kicker">Paradigm Diagnostic</div>
      <h1>${esc(hook)}</h1>
      <p class="body-copy">${company} &mdash; ${esc(data.industry || "Business")}</p>
    </div>
  </div>

  <!-- SCENE 2: Pain + Data viz (8-22s) -->
  <div class="scene" id="s2">
    <div class="scene-inner">
      <div class="kicker">${label1}</div>
      <h1>${esc(pain)}</h1>
      ${dataVizBars(metricLabel, metricValue, industryAvg, theme, "viz-main")}
    </div>
  </div>

  <!-- SCENE 3: Fear + loss metric (22-36s) -->
  <div class="scene" id="s3">
    <div class="scene-inner">
      <div class="kicker" style="color:#f87171">${label2}</div>
      <h1>${esc(fear)}</h1>
      <div class="big-number">${totalLoss}</div>
      ${lossMetrics}
    </div>
  </div>

  <!-- SCENE 4: Hope + CTA prep (36-50s) -->
  <div class="scene" id="s4">
    <div class="scene-inner">
      <div class="kicker" style="color:${theme.signal}">${label3}</div>
      <h1>${esc(hope)}</h1>
      ${data.template_variant === "japan_entry" ? `<div class="check-grid">${checkGrid}</div>` : ""}
    </div>
  </div>

  <!-- SCENE 5: Final CTA (50-60s) -->
  <div class="scene" id="s5">
    <div class="scene-inner">
      <div class="kicker" style="color:${theme.signal}">${label4}</div>
      <h1>${esc(cta)}</h1>
      <p class="body-copy" style="margin-top:16px;font-size:18px;font-family:monospace;opacity:.7">${siteUrl}</p>
    </div>
  </div>

  <!-- Progress bar -->
  <div class="progress"><div class="progress-fill" id="prog"></div></div>

  <!-- Footer -->
  <div class="footer">
    <span class="footer-logo">PARADIGM</span>
    <span>${company}</span>
    <span class="footer-url">${siteUrl}</span>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function(){
  const tl = gsap.timeline({paused:true});

  // Progress bar sync
  tl.to("#prog", { width: "100%", duration: 60, ease: "none" }, 0);

  // ─── SCENE 1: Hook (0→8s, hold 8→10) ───
  tl.to("#s1", { opacity: 1, duration: 0.6, ease: "power3.out" }, 0.3);
  tl.from("#s1 h1", { y: 50, opacity: 0, duration: 0.8, ease: "expo.out" }, 0.4);
  tl.from("#s1 .body-copy", { y: 30, opacity: 0, duration: 0.6, ease: "power2.out" }, 0.7);
  tl.from("#s1 .kicker", { x: -20, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.2);
  // Crossfade: s1 out, s2 in (9.5→10s)
  tl.to("#s1", { opacity: 0, duration: 0.5, ease: "power2.in" }, 9.5);

  // ─── SCENE 2: Evidence + Data Viz (10→24s) ───
  tl.to("#s2", { opacity: 1, duration: 0.5, ease: "power2.out" }, 9.8);
  tl.from("#s2 h1", { y: 40, opacity: 0, duration: 0.7, ease: "expo.out" }, 10.1);
  tl.from("#s2 .kicker", { x: -20, opacity: 0, duration: 0.4, ease: "power3.out" }, 10);
  tl.from("#s2 .data-viz", { y: 30, opacity: 0, duration: 0.7, ease: "back.out(1.2)" }, 10.4);
  // Animate bar fill
  tl.to("#s2 .bar-current", { height: "${parseFloat(metricValue)||38}%", duration: 1, ease: "power4.out" }, 10.6);
  // Crossfade out
  tl.to("#s2", { opacity: 0, duration: 0.5, ease: "power2.in" }, 23.5);

  // ─── SCENE 3: Fear + Loss (24→37s) ───
  tl.to("#s3", { opacity: 1, duration: 0.5, ease: "power2.out" }, 23.8);
  tl.from("#s3 h1", { y: 40, opacity: 0, duration: 0.7, ease: "expo.out" }, 24.1);
  tl.from("#s3 .kicker", { x: -20, opacity: 0, duration: 0.4, ease: "power3.out" }, 24);
  tl.from("#s3 .big-number", { scale: 0.6, opacity: 0, duration: 0.9, ease: "elastic.out(1,0.5)" }, 24.5);
  tl.from("#s3 .metrics-row", { y: 30, opacity: 0, duration: 0.6, ease: "back.out(1.2)" }, 25);
  tl.to("#s3", { opacity: 0, duration: 0.5, ease: "power2.in" }, 36.5);

  // ─── SCENE 4: Solution + Hope (37→50s) ───
  tl.to("#s4", { opacity: 1, duration: 0.5, ease: "power2.out" }, 36.8);
  tl.from("#s4 h1", { y: 40, opacity: 0, duration: 0.7, ease: "expo.out" }, 37.1);
  tl.from("#s4 .kicker", { x: -20, opacity: 0, duration: 0.4, ease: "power3.out" }, 37);
  tl.from("#s4 .check-grid", { y: 25, opacity: 0, duration: 0.6, ease: "back.out(1.2)", stagger: 0.08 }, 37.4);
  tl.to("#s4", { opacity: 0, duration: 0.5, ease: "power2.in" }, 49.5);

  // ─── SCENE 5: CTA + Final (50→60s) ───
  tl.to("#s5", { opacity: 1, duration: 0.5, ease: "power2.out" }, 49.8);
  tl.from("#s5 h1", { y: 40, opacity: 0, duration: 0.7, ease: "expo.out" }, 50.1);
  tl.from("#s5 .kicker", { x: -20, opacity: 0, duration: 0.4, ease: "power3.out" }, 50);
  tl.from("#s5 .body-copy", { y: 20, opacity: 0, duration: 0.5, ease: "power2.out" }, 50.5);

  // Final fade to black
  tl.to("#canvas", { opacity: 0, duration: 0.8, ease: "power2.in" }, 59.2);

  // Auto-play
  tl.play();
})();
</script>
</body></html>`
}

export function buildWebsiteVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  return buildVariantVideoHtml(data, script)
}
export function buildMeoVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  return buildVariantVideoHtml({...data, template_variant:"meo"}, script)
}
export function buildSecurityVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  return buildVariantVideoHtml({...data, template_variant:"security"}, script)
}
export function buildJapanEntryVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  return buildVariantVideoHtml({...data, template_variant:"japan_entry"}, script)
}
