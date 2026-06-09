/**
 * Bento Grid + Glassmorphism + Data Viz — professional video composition.
 * Zero text-only scenes. Every frame has cards, charts, icons, and depth.
 */
import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

interface Theme { bg: string; orb1: string; orb2: string; accent: string; text: string; muted: string; signal: string; warn: string }
function tv(v: string): Theme {
  if (v === "meo") return { bg: "#040e07", orb1: "#166534", orb2: "#14532d", accent: "#22c55e", text: "#f0fdf4", muted: "rgba(240,253,244,0.55)", signal: "#4ade80", warn: "#fbbf24" }
  if (v === "security") return { bg: "#0a0303", orb1: "#7f1d1d", orb2: "#450a0a", accent: "#ef4444", text: "#fef2f2", muted: "rgba(254,242,242,0.55)", signal: "#f87171", warn: "#fbbf24" }
  if (v === "japan_entry") return { bg: "#030912", orb1: "#1e3a5f", orb2: "#172554", accent: "#3b82f6", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", warn: "#fbbf24" }
  if (v === "video_subscription") return { bg: "#050210", orb1: "#4c1d95", orb2: "#2e1065", accent: "#8b5cf6", text: "#faf5ff", muted: "rgba(250,245,255,0.55)", signal: "#a78bfa", warn: "#fbbf24" }
  if (v === "subsidy") return { bg: "#021010", orb1: "#115e59", orb2: "#134e4a", accent: "#14b8a6", text: "#f0fdfa", muted: "rgba(240,253,250,0.55)", signal: "#2dd4bf", warn: "#fbbf24" }
  if (v === "outreach") return { bg: "#0a0402", orb1: "#7c2d12", orb2: "#431407", accent: "#f97316", text: "#fff7ed", muted: "rgba(255,247,237,0.55)", signal: "#fb923c", warn: "#fbbf24" }
  if (v === "dx_ai_package") return { bg: "#020810", orb1: "#1e3a6e", orb2: "#0c1a3d", accent: "#06b6d4", text: "#ecfeff", muted: "rgba(236,254,255,0.55)", signal: "#22d3ee", warn: "#fbbf24" }
  return { bg: "#030308", orb1: "#3b1f8c", orb2: "#1e1040", accent: "#8b5cf6", text: "#ffffff", muted: "rgba(255,255,255,0.55)", signal: "#a78bfa", warn: "#fbbf24" }
}

// SVG icons inline
const ICONS = {
  chart: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  zap: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  shield: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  target: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const th = tv(data.template_variant)
  const { hook, pain, fear, hope, cta } = script
  const co = esc(data.company_name)
  const loss = esc(data.total_loss)
  const isJa = data.report_locale === "ja"
  const url = esc(data.report_url || "https://paradigmjp.com")
  const mVal = data.acts[0]?.metric_value || "38"
  const score = Math.min(parseFloat(mVal) || 38, 100)
  const barColor = score < 40 ? th.signal : score < 70 ? th.warn : th.accent
  const T = {
    diag: esc(isJa ? "Paradigm 診断" : "Paradigm Diagnostic"),
    evidence: esc(isJa ? "公開データ分析" : "Public Evidence"),
    lossTitle: esc(isJa ? "機会損失" : "Hidden Cost"),
    solution: esc(isJa ? "ソリューション" : "Solution"),
    action: esc(isJa ? "次のアクション" : "Next Step"),
    now: esc(isJa ? "現在" : "Now"),
    target: esc(isJa ? "目標" : "Target"),
    monthly: esc(isJa ? "月間損失" : "Monthly Loss"),
    annual: esc(isJa ? "年間換算" : "Annual"),
    x12: esc(isJa ? "×12倍" : "×12"),
    coverage: esc(isJa ? "データカバレッジ" : "Data Coverage"),
  }

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${co} — Paradigm</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:${th.bg}}
  body{font-family:Inter,"Noto Sans JP",system-ui,sans-serif;color:${th.text};-webkit-font-smoothing:antialiased}

  /* ── Viewport ── */
  #viewport{width:100%;height:100%;position:relative;overflow:hidden}

  /* ── Universe: giant canvas ── */
  #universe{position:absolute;width:300vw;height:300vh;left:calc(50vw - 150vw);top:calc(50vh - 150vh);transform-origin:0 0;will-change:transform}

  /* ── Animated background orbs (always moving) ── */
  .orb{position:absolute;border-radius:50%;filter:blur(12vw);opacity:.55;z-index:0}
  .orb-1{width:50vw;height:50vw;background:${th.orb1};top:5%;left:10%}
  .orb-2{width:40vw;height:40vw;background:${th.orb2};bottom:10%;right:5%}
  .orb-3{width:30vw;height:30vw;background:${th.accent};top:40%;left:50%;opacity:.25}

  /* ── Bento Grid: 2 scenes placed at different universe coordinates ── */
  .bento-scene{position:absolute;width:90vw;padding:4vw;display:grid;gap:2vw;transform:translate(-50%,-50%)}
  .bento-scene.grid-3{grid-template-columns:1fr 1fr;grid-template-rows:auto auto}

  /* ── Glassmorphism card ── */
  .card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border-radius:2vw;padding:3vw;display:flex;flex-direction:column;justify-content:center;overflow:hidden;position:relative;opacity:1}
  .card::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 50%);pointer-events:none;border-radius:2vw}
  .card.large{grid-row:span 2}

  /* ── Typography ── */
  .kicker{font-size:0.8vw;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${th.signal};margin-bottom:0.8vw;display:flex;align-items:center;gap:0.4vw}
  .kicker::before{content:"";display:block;width:1vw;height:2px;background:${th.signal};border-radius:1px}
  .gradient-h1{font-size:3.2vw;font-weight:900;line-height:1.06;background:linear-gradient(135deg,${th.text} 0%,${th.signal} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1vw}
  .sub{font-size:1.1vw;color:${th.muted};line-height:1.5}
  .big-num{font-size:5vw;font-weight:900;line-height:1;margin-bottom:0.3vw}
  .num-label{font-size:0.9vw;color:${th.muted};text-transform:uppercase;letter-spacing:.1em}

  /* ── Icon box ── */
  .icon-box{width:4vw;height:4vw;border-radius:1vw;display:flex;align-items:center;justify-content:center;margin-bottom:1.2vw;color:${th.signal};font-size:2vw;flex-shrink:0}
  .icon-box.glass{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}

  /* ── Data viz bars ── */
  .chart-row{display:flex;gap:3vw;align-items:flex-end;margin-top:1vw;height:10vw}
  .bar-col{display:flex;flex-direction:column;align-items:center;gap:0.4vw;flex:1}
  .bar-wrap{width:100%;height:8vw;background:rgba(255,255,255,.03);border-radius:0.4vw;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:0.4vw;height:0}
  .bar-fill.current{background:${barColor}}
  .bar-fill.target{border:2px dashed rgba(255,255,255,.1);background:transparent;height:71%}
  .bar-label{font-size:0.6vw;color:${th.muted};text-transform:uppercase;letter-spacing:.05em}
  .bar-value{font-size:1.1vw;font-weight:800}

  /* ── Metric pills ── */
  .pill-row{display:flex;gap:1vw;flex-wrap:wrap;margin-top:1vw}
  .pill{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:2vw;padding:0.6vw 1.4vw;font-size:0.75vw;font-weight:600;color:${th.signal}}

  /* ── Loss highlight ── */
  .loss-highlight{font-size:4.5vw;font-weight:900;line-height:1;color:#f87171;margin-bottom:0.3vw}

  /* ── Progress bar (fixed) ── */
  #prog-wrap{position:fixed;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:100}
  #prog-fill{height:100%;background:${th.signal};width:0}
  #hud{position:fixed;bottom:1.5vw;left:3vw;right:3vw;display:flex;justify-content:space-between;color:rgba(255,255,255,.12);font-size:0.55vw;z-index:100;pointer-events:none}
  #hud .hl{font-weight:700;color:${th.signal}}

  /* ── Animations ── */
  @keyframes orbFloat1{0%,100%{transform:translate(0,0)}50%{transform:translate(2vw,-2vw)}}
  @keyframes orbFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-1.5vw,1.5vw)}}
  @keyframes orbFloat3{0%,100%{transform:translate(0,0)}50%{transform:translate(1vw,1vw)}}
  .orb-1{animation:orbFloat1 12s ease-in-out infinite}
  .orb-2{animation:orbFloat2 15s ease-in-out infinite}
  .orb-3{animation:orbFloat3 10s ease-in-out infinite}
</style></head>
<body>
<div id="viewport">
  <div id="universe">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <!-- ═══ BENTO GRID 1: Hook + Evidence + Data Viz ═══ -->
    <div class="bento-scene grid-3" id="bento1" style="left:50%;top:50%">
      <!-- Large card: Hook -->
      <div class="card large">
        <div class="icon-box glass">${ICONS.target}</div>
        <div class="kicker">${T.diag}</div>
        <h1 class="gradient-h1">${esc(hook)}</h1>
        <p class="sub">${co}</p>
      </div>
      <!-- Small card top-right: KPI -->
      <div class="card">
        <div class="icon-box glass">${ICONS.zap}</div>
        <div class="big-num" id="kpi1">0</div>
        <div class="num-label">${T.coverage}</div>
      </div>
      <!-- Small card bottom-right: Bar chart -->
      <div class="card">
        <div class="kicker">${T.evidence}</div>
        <div class="chart-row">
          <div class="bar-col"><div class="bar-value">${esc(mVal)}</div><div class="bar-wrap"><div class="bar-fill current"></div></div><div class="bar-label">${T.now}</div></div>
          <div class="bar-col"><div class="bar-value">71</div><div class="bar-wrap"><div class="bar-fill target"></div></div><div class="bar-label">${T.target}</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ BENTO GRID 2: Fear + Loss + Solution ═══ -->
    <div class="bento-scene grid-3" id="bento2" style="left:50%;top:calc(50% + 130vh)">
      <!-- Large card: Fear/Loss -->
      <div class="card large">
        <div class="icon-box glass">${ICONS.shield}</div>
        <div class="kicker" style="color:#f87171">${T.lossTitle}</div>
        <h1 class="gradient-h1">${esc(fear)}</h1>
        <div class="loss-highlight" id="loss-num">0</div>
        <p class="sub" style="color:#fca5a5">${T.monthly}</p>
      </div>
      <!-- Small card: Annual estimate -->
      <div class="card">
        <div class="kicker">${T.annual}</div>
        <div class="big-num" style="color:${th.warn}">${T.x12}</div>
        <div class="pill-row">
          <span class="pill">${T.now} ${loss}</span>
          <span class="pill">12×</span>
        </div>
      </div>
      <!-- Small card: Solution preview -->
      <div class="card">
        <div class="icon-box glass">${ICONS.chart}</div>
        <div class="kicker">${T.solution}</div>
        <h3 style="font-size:1.6vw;font-weight:800;margin-bottom:0.5vw">${esc(hope)}</h3>
        <p class="sub" style="font-size:0.9vw">${co}</p>
      </div>
    </div>

    <!-- ═══ BENTO GRID 3: CTA ═══ -->
    <div class="bento-scene" style="left:50%;top:calc(50% + 240vh);width:60vw;padding:3vw;text-align:center">
      <div class="card" style="align-items:center;padding:5vw">
        <div class="kicker">${T.action}</div>
        <h1 class="gradient-h1" style="text-align:center;font-size:3.8vw">${esc(cta)}</h1>
        <p class="sub" style="font-size:0.85vw;font-family:monospace;opacity:.5;margin-top:1vw">${url}</p>
      </div>
    </div>
  </div>
</div>
<div id="prog-wrap"><div id="prog-fill"></div></div>
<div id="hud"><span class="hl">PARADIGM</span><span>${co}</span><span>${url}</span></div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function i(){if(typeof gsap==='undefined'){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';s.onload=r;s.onerror=function(){};document.head.appendChild(s)}else r();
function r(){
var tl=gsap.timeline({paused:true}),vc="#60a5fa";
tl.to("#prog-fill",{width:"100%",duration:60,ease:"none"},0);

// ─── BENTO 1: Hook + Evidence (0→24s) ───
// Cards animate in with stagger
tl.from("#bento1 .card",{opacity:0,y:60,duration:.9,ease:"expo.out",stagger:.15},.3);
// KPI count-up
tl.to({v:0},{v:${data.source_coverage.score},duration:1.8,ease:"power2.out",onUpdate:function(){document.getElementById("kpi1").textContent=Math.floor(this.targets()[0].v)+"%"}},1);
// Bar chart fill
tl.to("#bento1 .bar-fill.current",{height:"${score}%",duration:1.2,ease:"elastic.out(1,.6)"},1.2);
// Micro-motion on cards
tl.to("#bento1 .card",{y:-4,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
tl.to("#bento1 .gradient-h1",{y:-2,duration:3.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.3");

// Camera transition to Bento 2 — zoom out, move down
tl.to("#universe",{scale:.45,y:"-60vh",duration:2,ease:"power3.inOut"},22);
tl.to("#universe",{scale:1,y:"-130vh",duration:1.8,ease:"expo.out"},24);

// ─── BENTO 2: Fear + Loss + Solution (26→50s) ───
tl.from("#bento2 .card",{opacity:0,y:50,duration:.8,ease:"expo.out",stagger:.15},26.2);
// Loss count-up
tl.to({v:0},{v:parseFloat("${loss.replace(/[^0-9.]/g,"0")}")||0,duration:1.5,ease:"power2.out",onUpdate:function(){var n=Math.floor(this.targets()[0].v);document.getElementById("loss-num").textContent=n>1e4?(n/1e4).toFixed(1)+"万":n.toLocaleString()}},26.8);
// Micro-motion
tl.to("#bento2 .card",{y:-3,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
tl.to("#bento2 .loss-highlight",{scale:1.02,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.3");

// Camera transition to CTA — extreme zoom out
tl.to("#universe",{scale:.35,duration:2,ease:"power2.inOut"},48);
tl.to("#universe",{scale:1.05,y:"-240vh",duration:2,ease:"expo.out"},50);

// ─── BENTO 3: CTA (52→60s) ───
tl.from("#bento3 .card",{opacity:0,scale:.9,duration:.8,ease:"expo.out"},52.2);
tl.from("#bento3 .gradient-h1",{y:40,opacity:0,duration:.7,ease:"back.out(1.3)"},52.5);
tl.to("#bento3 .card",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");

// Fade to black
tl.to("#viewport",{opacity:0,duration:.8,ease:"power2.in"},59);

tl.play();
}})();
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
