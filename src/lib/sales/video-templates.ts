/**
 * YouTube-style motion graphics video — responsive, autoplay, graceful fallback.
 * 4 principles: camera zoom, text stagger, micro-motion, flowing background.
 */
import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

interface Theme { bg: string; bg2: string; accent: string; accLight: string; text: string; muted: string; signal: string; surface: string }

function thv(v: string): Theme {
  if (v === "meo") return { bg: "#051408", bg2: "#0c2414", accent: "#22c55e", accLight: "#bbf7d0", text: "#f0fdf4", muted: "rgba(240,253,244,0.55)", signal: "#4ade80", surface: "rgba(255,255,255,0.04)" }
  if (v === "security") return { bg: "#0d0404", bg2: "#1a0808", accent: "#ef4444", accLight: "#fecaca", text: "#fef2f2", muted: "rgba(254,242,242,0.55)", signal: "#f87171", surface: "rgba(255,255,255,0.04)" }
  if (v === "japan_entry") return { bg: "#040c18", bg2: "#08162a", accent: "#3b82f6", accLight: "#bfdbfe", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", surface: "rgba(255,255,255,0.04)" }
  if (v === "video_subscription") return { bg: "#080418", bg2: "#100a28", accent: "#8b5cf6", accLight: "#ddd6fe", text: "#faf5ff", muted: "rgba(250,245,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
  if (v === "subsidy") return { bg: "#041414", bg2: "#081f1f", accent: "#14b8a6", accLight: "#99f6e4", text: "#f0fdfa", muted: "rgba(240,253,250,0.55)", signal: "#2dd4bf", surface: "rgba(255,255,255,0.04)" }
  if (v === "outreach") return { bg: "#0e0704", bg2: "#1c0e06", accent: "#f97316", accLight: "#fed7aa", text: "#fff7ed", muted: "rgba(255,247,237,0.55)", signal: "#fb923c", surface: "rgba(255,255,255,0.04)" }
  return { bg: "#05050c", bg2: "#0c0c18", accent: "#8b5cf6", accLight: "#ddd6fe", text: "#ffffff", muted: "rgba(255,255,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)" }
}

function charSpans(text: string): string {
  return text.split("").map((ch, i) => `<span class="c" style="display:inline-block">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("")
}

function kickerHtml(label: string, color: string): string {
  return `<span class="kicker" style="color:${color}"><span></span>${esc(label)}</span>`
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const t = thv(data.template_variant)
  const { hook, pain, fear, hope, cta } = script
  const co = esc(data.company_name)
  const loss = esc(data.total_loss)
  const isJa = data.report_locale === "ja"
  const url = esc(data.report_url || "https://paradigmjp.com")
  const mVal = data.acts[0]?.metric_value || "38"
  const score = Math.min(parseFloat(mVal) || 38, 100)
  const ringColor = score < 40 ? t.signal : score < 70 ? "#f59e0b" : t.accent

  const k1 = kickerHtml(isJa ? "Paradigm 診断" : "Paradigm Diagnostic", t.signal)
  const k2 = kickerHtml(isJa ? "公開データ分析" : "Public Evidence", t.signal)
  const k3 = kickerHtml(isJa ? "機会損失" : "Hidden Cost", "#f87171")
  const k4 = kickerHtml(isJa ? "ソリューション" : "Solution", t.signal)
  const k5 = kickerHtml(isJa ? "次のアクション" : "Next Step", t.signal)
  const labCur = esc(isJa ? "現在" : "Current")
  const labTgt = esc(isJa ? "目標" : "Target")
  const labMon = esc(isJa ? "月間損失" : "Monthly")
  const labAnn = esc(isJa ? "年間換算" : "Annual")
  const labX12 = esc(isJa ? "×12倍" : "×12")
  const variant = esc(data.template_variant)

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${co} — Paradigm</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:${t.bg}}
  body{font-family:Inter,"Noto Sans JP",system-ui,sans-serif;color:${t.text};-webkit-font-smoothing:antialiased}
  #stage{width:100%;height:100%;position:relative;overflow:hidden;transform-origin:50% 50%}

  .bg-flow{position:absolute;inset:0;background:linear-gradient(135deg,${t.bg} 0%,${t.bg2} 35%,${t.bg} 65%,${t.accent}0a 100%);background-size:350% 350%;z-index:0}
  .bg-grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);background-size:5vw 5vw;opacity:.2;z-index:1}
  .bg-glow{position:absolute;border-radius:50%;filter:blur(8vw);opacity:.10;z-index:1}
  .bg-glow.g1{width:40vw;height:25vw;background:${t.accent};top:5%;left:-10%}
  .bg-glow.g2{width:35vw;height:22vw;background:${t.signal};bottom:5%;right:-8%}
  .bg-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:18}
  .orb{position:absolute;border-radius:50%;filter:blur(5vw);opacity:.06;z-index:2}
  .orb-1{width:22vw;height:22vw;background:${t.accent};top:3%;right:12%}
  .orb-2{width:16vw;height:16vw;background:${t.signal};bottom:8%;left:18%}
  .orb-3{width:12vw;height:12vw;background:${t.accent};top:55%;right:35%}
  .particle{position:absolute;width:2px;height:2px;background:${t.accent};border-radius:50%;opacity:.35;z-index:3}

  #content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:5vw 7vw;z-index:10}
  .kicker{display:inline-flex;align-items:center;gap:0.6vw;font-size:0.9vw;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-bottom:1.2vw}
  .kicker span{display:block;width:1.4vw;height:2px;border-radius:1px;flex-shrink:0}
  .kicker span{background:currentColor}
  h1{font-size:3.6vw;line-height:1.06;font-weight:800;margin-bottom:1vw}
  h1 .c{display:inline-block}
  p.lead{color:${t.muted};font-size:1.3vw;line-height:1.5;max-width:70vw}
  .big-num{font-size:6.5vw;font-weight:900;line-height:1;background:linear-gradient(135deg,${t.text} 0%,${t.signal} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5vw}
  .viz-row{display:flex;gap:5vw;align-items:flex-end;margin-top:1vw}
  .bar-group{display:flex;flex-direction:column;align-items:center;gap:0.5vw}
  .bar-wrap{width:3vw;height:12vw;background:${t.surface};border-radius:0.6vw;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:0.6vw;height:0%}
  .bar-fill.cur{background:${ringColor}}
  .bar-fill.tgt{border:2px dashed rgba(255,255,255,.12);background:transparent;height:71%}
  .bar-label{font-size:0.7vw;color:${t.muted};text-transform:uppercase;letter-spacing:.06em}
  .bar-val{font-size:1.4vw;font-weight:800}
  .tile-row{display:flex;gap:1.2vw;margin-top:1.2vw}
  .tile{background:${t.surface};border:1px solid rgba(255,255,255,.05);border-radius:1vw;padding:1.2vw 2vw}
  .tile .tlbl{font-size:0.65vw;font-weight:700;color:${t.muted};text-transform:uppercase;letter-spacing:.1em;margin-bottom:0.3vw}
  .tile .tval{font-size:2vw;font-weight:800}
  .check-grid{display:flex;gap:0.6vw;flex-wrap:wrap;margin-top:0.8vw}
  .check{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);border-radius:0.6vw;padding:0.7vw 1.4vw;font-size:0.85vw;font-weight:700;color:#fca5a5}
  .progress{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:20}
  .progress-fill{height:100%;background:${t.signal};width:0}
  .chapter-dots{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:1vw;z-index:20}
  .chapter-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.12);transition:background .4s,transform .4s}
  .footer{position:absolute;left:7vw;right:7vw;bottom:2vw;display:flex;justify-content:space-between;color:rgba(255,255,255,.2);font-size:0.7vw;z-index:19}
  .footer .fl{font-weight:700;color:${t.signal}}
  .footer .fu{font-family:monospace;font-size:0.55vw;opacity:.4}

  @keyframes bgFlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes o1{0%,100%{transform:translate(0,0)}50%{transform:translate(3vw,-2vw)}}
  @keyframes o2{0%,100%{transform:translate(0,0)}50%{transform:translate(-2vw,2vw)}}
  @keyframes o3{0%,100%{transform:translate(0,0)}50%{transform:translate(1.5vw,1.2vw)}}
  @keyframes gP1{0%,100%{transform:translate(0,0);opacity:.06}50%{transform:translate(2vw,-1.5vw);opacity:.13}}
  @keyframes gP2{0%,100%{transform:translate(0,0);opacity:.04}50%{transform:translate(-1.5vw,1vw);opacity:.11}}
  .bg-flow{animation:bgFlow 18s ease-in-out infinite}
  .orb-1{animation:o1 15s ease-in-out infinite}
  .orb-2{animation:o2 17s ease-in-out infinite}
  .orb-3{animation:o3 12s ease-in-out infinite}
  .bg-glow.g1{animation:gP1 11s ease-in-out infinite}
  .bg-glow.g2{animation:gP2 13s ease-in-out infinite}
</style></head>
<body>
<div id="stage">
  <div class="bg-flow"></div><div class="bg-grid"></div>
  <div class="bg-glow g1"></div><div class="bg-glow g2"></div>
  <div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div>
  <div class="particle" style="top:12%;left:8%"></div><div class="particle" style="top:18%;left:92%"></div>
  <div class="particle" style="top:78%;left:5%"></div><div class="particle" style="top:85%;left:88%"></div>
  <div class="particle" style="top:45%;left:50%"></div>
  <div class="bg-vignette"></div>

  <div id="content">
    <div class="text-block">${k1}<h1>${charSpans(hook)}</h1><p class="lead">${co}</p></div>
  </div>

  <div class="progress"><div class="progress-fill" id="prog"></div></div>
  <div class="chapter-dots">${[0,1,2,3,4].map(i=>`<div class="chapter-dot" id="dot${i}"></div>`).join("")}</div>
  <div class="footer"><span class="fl">PARADIGM</span><span>${co}</span><span class="fu">${url}</span></div>
</div>

<script>
(function init(){
  if (typeof gsap === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
    s.onload = startAnimation;
    s.onerror = function(){ console.log('GSAP CDN failed'); };
    document.head.appendChild(s);
  } else { startAnimation(); }

  function startAnimation(){
    var c=document.getElementById("content"), dC="${t.signal}",
        tl=gsap.timeline({paused:true});

    gsap.to("#stage",{scale:1.04,duration:60,ease:"none",transformOrigin:"50% 50%"});
    tl.to("#prog",{width:"100%",duration:60,ease:"none"},0);
    [0,1,2,3,4].forEach(function(i){
      if(i===0) tl.set("#dot0",{background:dC,transform:"scale(1.6)"},0);
      else tl.to("#dot"+i,{background:dC,transform:"scale(1.6)",duration:.3},i*12);
    });

    // SCENE 1: Hook (0-11s)
    tl.set("#content",{opacity:0},0);
    tl.set("#content .kicker",{opacity:0},0);
    tl.to("#content",{opacity:1,duration:.6,ease:"power3.out"},.3);
    tl.from("#content .kicker",{x:-30,opacity:0,duration:.45,ease:"expo.out"},.4);
    tl.from("#content h1 .c",{y:50,opacity:0,duration:.5,ease:"back.out(1.4)",stagger:.025},.6);
    tl.from("#content .lead",{y:25,opacity:0,duration:.5,ease:"power2.out"},1.2);
    tl.to("#content h1",{y:-4,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content .lead",{y:-2,duration:3.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content",{opacity:0,duration:.5,ease:"power2.in"},10.5);

    // SCENE 2: Evidence + DataViz (11-26s)
    tl.call(function(){
      c.innerHTML='<div class="text-block">${k2}<h1>${charSpans(pain)}</h1><div class="viz-row"><div class="bar-group"><div class="bar-val">${esc(mVal)}</div><div class="bar-wrap"><div class="bar-fill cur"></div></div><div class="bar-label">${labCur}</div></div><div class="bar-group"><div class="bar-val">71</div><div class="bar-wrap"><div class="bar-fill tgt"></div></div><div class="bar-label">${labTgt}</div></div></div></div>';
    },null,11);
    tl.add("s2",11);
    tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s2");
    tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s2+=.05");
    tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s2+=.15");
    tl.from("#content .viz-row",{y:35,opacity:0,duration:.65,ease:"back.out(1.2)"},"s2+=.35");
    tl.to("#content .bar-fill.cur",{height:"${score}%",duration:1.1,ease:"power4.out"},"s2+=.5");
    tl.to("#content h1",{y:-3,duration:3.2,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content .viz-row",{y:-2,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},25.5);

    // SCENE 3: Fear + Loss (26-38s)
    tl.call(function(){
      c.innerHTML='<div class="text-block">${k3}<h1>${charSpans(fear)}</h1><div class="big-num">${loss}</div><div class="tile-row"><div class="tile"><div class="tlbl">${labMon}</div><div class="tval">${loss}</div></div><div class="tile"><div class="tlbl">${labAnn}</div><div class="tval">${labX12}</div></div></div></div>';
    },null,26);
    tl.add("s3",26);
    tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s3");
    tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s3+=.05");
    tl.from("#content h1 .c",{y:35,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s3+=.15");
    tl.from("#content .big-num",{scale:.4,opacity:0,duration:.9,ease:"elastic.out(1,.5)"},"s3+=.3");
    tl.from("#content .tile-row .tile",{y:30,opacity:0,duration:.5,ease:"back.out(1.2)",stagger:.12},"s3+=.5");
    tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content .big-num",{y:-2,duration:3.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},37.5);

    // SCENE 4: Solution (38-50s)
    tl.call(function(){
      var extra='';
      if("${variant}"==="japan_entry") extra='<div class="check-grid">'+["特商法","APPI","決済","日本語"].map(function(x){return '<div class="check">'+x+'</div>'}).join("")+'</div>';
      c.innerHTML='<div class="text-block">${k4}<h1>${charSpans(hope)}</h1>'+extra+'<p class="lead">${co}</p></div>';
    },null,38);
    tl.add("s4",38);
    tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s4");
    tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s4+=.05");
    tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s4+=.15");
    tl.from("#content .check-grid,.check",{y:25,opacity:0,duration:.45,ease:"back.out(1.2)",stagger:.07},"s4+=.3");
    tl.from("#content .lead",{y:20,opacity:0,duration:.5,ease:"power2.out"},"s4+=.4");
    tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},49.5);

    // SCENE 5: CTA (50-60s)
    tl.call(function(){
      c.innerHTML='<div class="text-block">${k5}<h1>${charSpans(cta)}</h1><p class="lead" style="font-family:monospace;font-size:0.9vw;opacity:.55;margin-top:0.6vw">${url}</p></div>';
    },null,50);
    tl.add("s5",50);
    tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s5");
    tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s5+=.05");
    tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s5+=.15");
    tl.from("#content .lead",{y:15,opacity:0,duration:.5,ease:"power2.out"},"s5+=.2");
    tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.4");
    tl.to("#stage",{opacity:0,duration:.8,ease:"power2.in"},59.2);

    tl.play();
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
