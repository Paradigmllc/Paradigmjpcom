/**
 * Space-travel motion graphics — one giant canvas, camera moves through it.
 * Zero scene switches. The camera pans/zooms/rotates between pre-placed content.
 */
import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

interface Theme { bg: string; bg2: string; accent: string; text: string; muted: string; signal: string; surface: string }
function t(v: string): Theme {
  if (v === "meo") return { bg: "#051408", bg2: "#0c2414", accent: "#22c55e", text: "#f0fdf4", muted: "rgba(240,253,244,0.55)", signal: "#4ade80", surface: "rgba(255,255,255,0.04)" }
  if (v === "security") return { bg: "#0d0404", bg2: "#1a0808", accent: "#ef4444", text: "#fef2f2", muted: "rgba(254,242,242,0.55)", signal: "#f87171", surface: "rgba(255,255,255,0.04)" }
  if (v === "japan_entry") return { bg: "#030a14", bg2: "#06142a", accent: "#3b82f6", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", surface: "rgba(255,255,255,0.04)" }
  if (v === "video_subscription") return { bg: "#060318", bg2: "#0e0828", accent: "#8b5cf6", text: "#faf5ff", muted: "rgba(250,245,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
  if (v === "subsidy") return { bg: "#031414", bg2: "#061f1f", accent: "#14b8a6", text: "#f0fdfa", muted: "rgba(240,253,250,0.55)", signal: "#2dd4bf", surface: "rgba(255,255,255,0.04)" }
  if (v === "outreach") return { bg: "#0c0603", bg2: "#180c06", accent: "#f97316", text: "#fff7ed", muted: "rgba(255,247,237,0.55)", signal: "#fb923c", surface: "rgba(255,255,255,0.04)" }
  return { bg: "#04040a", bg2: "#0a0a18", accent: "#8b5cf6", text: "#ffffff", muted: "rgba(255,255,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
}

function cardHtml(label: string, heading: string, body: string, extra: string, th: Theme): string {
  return `<div class="card">
    <div class="card-kicker">${esc(label)}</div>
    <h1>${esc(heading)}</h1>
    ${body ? `<p>${esc(body)}</p>` : ""}
    ${extra}
  </div>`
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const th = t(data.template_variant)
  const { hook, pain, fear, hope, cta } = script
  const co = esc(data.company_name)
  const loss = esc(data.total_loss)
  const isJa = data.report_locale === "ja"
  const url = esc(data.report_url || "https://paradigmjp.com")

  // Build extra elements for each card
  const extraHook = `<div class="co-name">${co}</div>`
  const extraPain = `<div class="viz-row"><div class="bar"><div class="bar-val">${esc(data.acts[0]?.metric_value||"38")}</div><div class="bar-track"><div class="bar-fill" style="height:${Math.min(parseFloat(data.acts[0]?.metric_value||"38")||38,100)}%;background:${th.signal}"></div></div><div class="bar-label">${esc(isJa?"現在":"Now")}</div></div><div class="bar"><div class="bar-val">71</div><div class="bar-track"><div class="bar-fill-dash" style="height:71%"></div></div><div class="bar-label">${esc(isJa?"目標":"Target")}</div></div></div>`
  const extraFear = `<div class="big-loss">${loss}</div><div class="loss-sub">${esc(isJa?"月間機会損失":"Monthly opportunity loss")}</div>`
  const extraHope = data.template_variant === "japan_entry"
    ? `<div class="check-row">${["特商法","個人情報保護法","国内決済","日本語サポート"].map(x=>`<span class="check-chip">${x}</span>`).join("")}</div>`
    : `<div class="co-name">${co}</div>`
  const extraCta = `<div class="cta-url">${url}</div>`

  // 5 cards: Hook, Pain, Fear, Hope, CTA
  const cards = [
    cardHtml(isJa?"Paradigm 診断":"Paradigm Diagnostic", hook, "", extraHook, th),
    cardHtml(isJa?"公開データ分析":"Public Evidence", pain, "", extraPain, th),
    cardHtml(isJa?"機会損失":"Hidden Cost", fear, "", extraFear, th),
    cardHtml(isJa?"ソリューション":"Solution", hope, "", extraHope, th),
    cardHtml(isJa?"アクション":"Next Step", cta, "", extraCta, th),
  ]

  // Universe grid: cards placed in a cross pattern, plenty of space between them
  // Viewport centers at universe (0,0). Camera travels between card positions.
  // Card positions (in vw units relative to viewport):
  // C0 (Hook):  center  (0vw, 0vh)
  // C1 (Pain):  right-up  (100vw, -100vh)
  // C2 (Fear):  down-right  (120vw, 120vh)
  // C3 (Hope):  left-down  (-100vw, 140vh)
  // C4 (CTA):   down-center  (0vw, 260vh)
  const positions = [
    { x: 0, y: 0 },           // Hook — start here
    { x: 100, y: -100 },      // Pain — right and up
    { x: 120, y: 120 },       // Fear — down-right  
    { x: -100, y: 140 },      // Hope — left-down
    { x: 0, y: 260 },         // CTA — way down
  ]

  // Camera path: travel between positions with dynamic scale
  // format: [targetX, targetY, targetScale, duration]
  // Negative x/y means move universe opposite direction (camera moves to card)
  const camera = [
    [0, 0, 1, 0],                    // Start at Hook
    [0, 0, 1, 1.5],                  // Hold Hook
    [-50, 40, 0.55, 1.8],            // Pull back & move toward Pain
    [-100, 100, 1.0, 1.5],           // Dive into Pain
    [-100, 100, 1, 3],               // Hold Pain
    [-70, 30, 0.5, 1.3],             // Dramatic zoom out
    [-120, -120, 1.05, 1.5],         // Sweep to Fear
    [-120, -120, 1.05, 4],           // Hold Fear
    [40, -60, 0.45, 1.5],            // Zoom way out, sweep left
    [100, -140, 1.0, 1.5],           // Dive into Hope
    [100, -140, 1, 4],               // Hold Hope
    [0, -80, 0.35, 1.5],             // Extreme zoom out (bird's eye)
    [0, -260, 1.15, 1.8],            // Zoom into CTA
    [0, -260, 1.15, 4],              // Hold CTA
    [0, -260, 1.15, 1.5],            // Final hold
  ]

  // Build camera keyframes as GSAP timeline entries
  let cameraTweens = ""
  let time = 0
  for (let i = 1; i < camera.length; i++) {
    const [x, y, s, dur] = camera[i]
    time += camera[i-1][3] as number
    cameraTweens += `  tl.to("#universe",{x:"${x}vw",y:"${y}vh",scale:${s},duration:${dur},ease:"${i%2===0?'power3.inOut':'expo.inOut'}"},${time.toFixed(1)});\n`
  }

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${co} — Paradigm</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:${th.bg}}
  body{font-family:Inter,"Noto Sans JP",system-ui,sans-serif;color:${th.text};-webkit-font-smoothing:antialiased}

  /* ── Viewport: the camera lens ── */
  #viewport{width:100%;height:100%;position:relative;overflow:hidden}

  /* ── Universe: giant canvas, camera moves this ── */
  #universe{position:absolute;width:400vw;height:400vh;left:calc(50vw - 200vw);top:calc(50vh - 200vh);transform-origin:0 0;will-change:transform}

  /* ── Continuous background (inside universe, travels with camera) ── */
  .space-bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 60% at 50% 50%,${th.bg2} 0%,${th.bg} 60%);z-index:0}
  .space-grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.008) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.008) 1px,transparent 1px);background-size:6vw 6vw;z-index:1}
  .space-particle{position:absolute;width:2px;height:2px;background:${th.accent};border-radius:50%;opacity:.3;z-index:2}
  .space-glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.07;z-index:1}
  .space-glow.g1{width:50vw;height:30vw;background:${th.accent};top:10%;left:5%}
  .space-glow.g2{width:40vw;height:25vw;background:${th.signal};top:60%;left:70%}
  .space-glow.g3{width:35vw;height:20vw;background:${th.accent};top:30%;left:40%}

  /* ── Cards: pre-placed content blocks ── */
  .card{position:absolute;width:86vw;max-width:1400px;display:flex;flex-direction:column;justify-content:center;transform:translate(-50%,-50%);pointer-events:none}
  .card-kicker{display:inline-flex;align-items:center;gap:0.4vw;font-size:0.85vw;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${th.signal};margin-bottom:1vw}
  .card-kicker::before{content:"";display:block;width:1.2vw;height:2px;background:${th.signal};border-radius:1px}
  .card h1{font-size:3.4vw;line-height:1.06;font-weight:800;margin-bottom:0.6vw}
  .card p{color:${th.muted};font-size:1.2vw;line-height:1.5;max-width:60vw}
  .co-name{font-size:1vw;color:${th.muted};margin-top:0.8vw}

  /* ── Data viz (bars) ── */
  .viz-row{display:flex;gap:4vw;margin-top:1.5vw}
  .bar{display:flex;flex-direction:column;align-items:center;gap:0.4vw}
  .bar-track{width:3vw;height:10vw;background:${th.surface};border-radius:0.5vw;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:0.5vw}
  .bar-fill-dash{border:2px dashed rgba(255,255,255,.12);border-radius:0.5vw}
  .bar-val{font-size:1.3vw;font-weight:800}
  .bar-label{font-size:0.6vw;color:${th.muted};text-transform:uppercase;letter-spacing:.05em}

  /* ── Loss display ── */
  .big-loss{font-size:7vw;font-weight:900;line-height:1;background:linear-gradient(135deg,#f87171,${th.signal});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.3vw}
  .loss-sub{font-size:1.1vw;color:#f87171;font-weight:600}

  /* ── Check chips ── */
  .check-row{display:flex;gap:0.6vw;flex-wrap:wrap;margin-top:1vw}
  .check-chip{background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.2);border-radius:0.5vw;padding:0.5vw 1.2vw;font-size:0.8vw;font-weight:700;color:#fca5a5}

  /* ── CTA URL ── */
  .cta-url{font-size:0.8vw;font-family:monospace;color:${th.muted};margin-top:0.8vw;opacity:.6}

  /* ── Progress + HUD ── */
  #prog-wrap{position:fixed;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:100}
  #prog-fill{height:100%;background:${th.signal};width:0}
  #hud{position:fixed;bottom:2vw;left:3vw;right:3vw;display:flex;justify-content:space-between;color:rgba(255,255,255,.15);font-size:0.6vw;z-index:100}
  #hud .hl{font-weight:700;color:${th.signal}}
</style></head>
<body>
<div id="viewport">
  <div id="universe">
    <div class="space-bg"></div>
    <div class="space-grid"></div>
    <div class="space-glow g1"></div>
    <div class="space-glow g2"></div>
    <div class="space-glow g3"></div>
    ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(i=>`<div class="space-particle" style="left:${Math.floor(i*17.3)%100}%;top:${Math.floor(i*23.7)%100}%"></div>`).join("")}
    ${cards.map((card, i) => {
      const p = positions[i]
      return `<div class="card" style="left:calc(50% + ${p.x}vw);top:calc(50% + ${p.y}vh)">${card}</div>`
    }).join("\n")}
  </div>
</div>
<div id="prog-wrap"><div id="prog-fill"></div></div>
<div id="hud"><span class="hl">PARADIGM</span><span>${co}</span><span>${url}</span></div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function init(){
  if(typeof gsap==='undefined'){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';s.onload=run;s.onerror=function(){};document.head.appendChild(s)}else run();
  function run(){
    var tl=gsap.timeline({paused:true});

    // Progress bar
    tl.to("#prog-fill",{width:"100%",duration:60,ease:"none"},0);

    // CAMERA PATH — the universe moves, not individual elements
    // Position: center card 0 (Hook) at viewport center
    // Universe starts so that card at 50%+0vw, 50%+0vh is in viewport center
    // Camera moves by sliding universe in opposite direction
${cameraTweens}
    // Fade to black at end
    tl.to("#viewport",{opacity:0,duration:.8,ease:"power2.in"},59.2);

    tl.play();
    console.log("Paradigm space-travel video — camera active, "+tl.duration()+"s");
  }
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
