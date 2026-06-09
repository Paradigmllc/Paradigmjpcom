/**
 * YouTube-style motion graphics video — continuous motion, no slides.
 * 4 principles: camera zoom, text stagger, micro-motion, flowing background.
 */
import type { DiagnosticReportData } from "./diagnostic"

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

interface Theme {
  bg: string; bg2: string; accent: string; accLight: string
  text: string; muted: string; signal: string; surface: string; warn: string
}

function th(variant: string): Theme {
  if (variant === "meo") return { bg: "#051408", bg2: "#0c2414", accent: "#22c55e", accLight: "#bbf7d0", text: "#f0fdf4", muted: "rgba(240,253,244,0.55)", signal: "#4ade80", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  if (variant === "security") return { bg: "#0d0404", bg2: "#1a0808", accent: "#ef4444", accLight: "#fecaca", text: "#fef2f2", muted: "rgba(254,242,242,0.55)", signal: "#f87171", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  if (variant === "japan_entry") return { bg: "#040c18", bg2: "#08162a", accent: "#3b82f6", accLight: "#bfdbfe", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  if (variant === "video_subscription") return { bg: "#080418", bg2: "#100a28", accent: "#8b5cf6", accLight: "#ddd6fe", text: "#faf5ff", muted: "rgba(250,245,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  if (variant === "subsidy") return { bg: "#041414", bg2: "#081f1f", accent: "#14b8a6", accLight: "#99f6e4", text: "#f0fdfa", muted: "rgba(240,253,250,0.55)", signal: "#2dd4bf", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  if (variant === "outreach") return { bg: "#0e0704", bg2: "#1c0e06", accent: "#f97316", accLight: "#fed7aa", text: "#fff7ed", muted: "rgba(255,247,237,0.55)", signal: "#fb923c", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
  return { bg: "#05050c", bg2: "#0c0c18", accent: "#8b5cf6", accLight: "#ddd6fe", text: "#ffffff", muted: "rgba(255,255,255,0.55)", signal: "#a78bfa", surface: "rgba(255,255,255,0.04)", warn: "#fbbf24" }
}

// Split text into individual character spans for stagger animation
function charSpans(text: string, className: string): string {
  return text.split("").map((ch, i) => `<span class="${className}" style="display:inline-block">${ch === " " ? "&nbsp;" : esc(ch)}</span>`).join("")
}

export function buildVariantVideoHtml(data: DiagnosticReportData, script: { hook: string; pain: string; fear: string; hope: string; cta: string }): string {
  const t = th(data.template_variant)
  const { hook, pain, fear, hope, cta } = script
  const co = esc(data.company_name)
  const loss = esc(data.total_loss)
  const isJa = data.report_locale === "ja"
  const url = esc(data.report_url || "https://paradigmjp.com")
  const mVal = data.acts[0]?.metric_value || "38"
  const score = Math.min(parseFloat(mVal) || 38, 100)
  const ringColor = score < 40 ? t.signal : score < 70 ? t.warn : t.accent
  const industry = esc(data.industry || "Business")

  // Labels
  const lb = (s: string) => `<span class="kicker">${esc(s)}</span>`
  const k1 = lb(isJa ? "Paradigm 診断" : "Paradigm Diagnostic")
  const k2 = lb(isJa ? "公開データ分析" : "Public Evidence")
  const k3 = isJa ? '<span class="kicker" style="color:#f87171"><span></span>機会損失</span>' : '<span class="kicker" style="color:#f87171"><span></span>Hidden Cost</span>'
  const k4 = lb(isJa ? "ソリューション" : "Solution")
  const k5 = lb(isJa ? "次のアクション" : "Next Step")

  return `<!doctype html>
<html lang="${esc(data.report_locale)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=1920"/>
<title>${co} — Paradigm Diagnostic</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;overflow:hidden;background:${t.bg}}
  body{font-family:"Inter","Noto Sans JP",system-ui,sans-serif;color:${t.text};-webkit-font-smoothing:antialiased}
  #stage{width:1920px;height:1080px;position:relative;overflow:hidden;transform-origin:50% 50%}

  /* ═══ BACKGROUND LAYERS (continuous motion) ═══ */
  .bg-flow{position:absolute;inset:0;background:linear-gradient(135deg,${t.bg} 0%,${t.bg2} 35%,${t.bg} 65%,${t.accent}0f 100%);background-size:350% 350%;z-index:0}
  .bg-grid{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px);background-size:100px 100px;opacity:.22;z-index:1}
  .bg-glow{position:absolute;border-radius:50%;filter:blur(150px);opacity:.10;z-index:1}
  .bg-glow.g1{width:700px;height:400px;background:${t.accent};top:5%;left:-10%}
  .bg-glow.g2{width:600px;height:350px;background:${t.signal};bottom:5%;right:-8%}
  .bg-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:18}

  /* ═══ FLOATING PARTICLES ═══ */
  .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.05;z-index:2}
  .orb-1{width:380px;height:380px;background:${t.accent};top:3%;right:12%}
  .orb-2{width:280px;height:280px;background:${t.signal};bottom:8%;left:18%}
  .orb-3{width:200px;height:200px;background:${t.accent};top:55%;right:35%}
  .particle{position:absolute;width:2px;height:2px;background:${t.accent};border-radius:50%;opacity:.4;z-index:3}

  /* ═══ CONTENT ═══ */
  #content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:100px 140px;z-index:10}
  .text-block{max-width:1480px}
  .kicker{display:inline-flex;align-items:center;gap:10px;font-size:15px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:${t.signal};margin-bottom:22px}
  .kicker::before{content:"";display:block;width:28px;height:2px;background:${t.signal};border-radius:1px}

  /* ═══ TYPOGRAPHY ═══ */
  h1{font-size:60px;line-height:1.08;font-weight:800;margin-bottom:18px;letter-spacing:-0.005em;max-width:1400px}
  h1 .c{display:inline-block}
  p.lead{color:${t.muted};font-size:22px;line-height:1.5;max-width:1000px}
  .big-num{font-size:108px;font-weight:900;line-height:1;background:linear-gradient(135deg,${t.text},${t.signal});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}

  /* ═══ DATA VIZ ═══ */
  .viz-row{display:flex;gap:80px;align-items:flex-end;margin-top:16px}
  .bar-group{display:flex;flex-direction:column;align-items:center;gap:8px}
  .bar-wrap{width:56px;height:200px;background:${t.surface};border-radius:10px;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:10px;height:0%}
  .bar-fill.cur{background:${ringColor}}
  .bar-fill.tgt{border:2px dashed rgba(255,255,255,.12);background:transparent;height:71%}
  .bar-label{font-size:12px;color:${t.muted};text-transform:uppercase;letter-spacing:.06em}
  .bar-val{font-size:24px;font-weight:800}

  /* ═══ TILES ═══ */
  .tile-row{display:flex;gap:20px;margin-top:18px}
  .tile{background:${t.surface};border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:22px 32px}
  .tile .tlbl{font-size:11px;font-weight:700;color:${t.muted};text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
  .tile .tval{font-size:34px;font-weight:800}

  /* ═══ CHECK GRID ═══ */
  .check-grid{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .check{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.22);border-radius:10px;padding:12px 24px;font-size:15px;font-weight:700;color:#fca5a5}

  /* ═══ PROGRESS BAR ═══ */
  .progress{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.06);z-index:20}
  .progress-fill{height:100%;background:${t.signal};width:0}
  .chapter-dots{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:18px;z-index:20}
  .chapter-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.12);transition:background .4s,transform .4s}
  .chapter-dot.active{background:${t.signal};transform:scale(1.6)}

  /* ═══ FOOTER ═══ */
  .footer{position:absolute;left:140px;right:140px;bottom:26px;display:flex;justify-content:space-between;color:rgba(255,255,255,.25);font-size:12px;z-index:19}
  .footer .fl{font-weight:700;color:${t.signal}}
  .footer .fu{font-family:monospace;font-size:10px;opacity:.45}

  /* ═══ ANIMATIONS (continuous, never stop) ═══ */
  @keyframes bgFlow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes orbFloat1{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,-30px)}}
  @keyframes orbFloat2{0%,100%{transform:translate(0,0)}50%{transform:translate(-35px,35px)}}
  @keyframes orbFloat3{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,20px)}}
  @keyframes glowPulse1{0%,100%{transform:translate(0,0);opacity:.08}50%{transform:translate(35px,-25px);opacity:.15}}
  @keyframes glowPulse2{0%,100%{transform:translate(0,0);opacity:.06}50%{transform:translate(-25px,20px);opacity:.13}}
  .bg-flow{animation:bgFlow 18s ease-in-out infinite}
  .orb-1{animation:orbFloat1 15s ease-in-out infinite}
  .orb-2{animation:orbFloat2 17s ease-in-out infinite}
  .orb-3{animation:orbFloat3 12s ease-in-out infinite}
  .bg-glow.g1{animation:glowPulse1 11s ease-in-out infinite}
  .bg-glow.g2{animation:glowPulse2 13s ease-in-out infinite}
</style></head>
<body>
<div id="stage">
  <div class="bg-flow"></div>
  <div class="bg-grid"></div>
  <div class="bg-glow g1"></div>
  <div class="bg-glow g2"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  <div class="particle" style="top:12%;left:8%"></div>
  <div class="particle" style="top:18%;left:92%"></div>
  <div class="particle" style="top:78%;left:5%"></div>
  <div class="particle" style="top:85%;left:88%"></div>
  <div class="particle" style="top:45%;left:50%"></div>
  <div class="bg-vignette"></div>

  <div id="content"></div>

  <div class="progress"><div class="progress-fill" id="prog"></div></div>
  <div class="chapter-dots">${[0,1,2,3,4].map(i=>`<div class="chapter-dot" id="dot${i}"></div>`).join("")}</div>

  <div class="footer"><span class="fl">PARADIGM</span><span>${co}</span><span class="fu">${url}</span></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function(){
  var c=document.getElementById("content"),tl=gsap.timeline({paused:true});

  // ═══ RULE 1: Camera zoom — ultra-slow scale 1.0→1.04 over 60s ═══
  gsap.to("#stage",{scale:1.04,duration:60,ease:"none",transformOrigin:"50% 50%"});

  // ═══ RULE 4: Progress bar — always running ═══
  tl.to("#prog",{width:"100%",duration:60,ease:"none"},0);

  // Chapter dot activation
  [0,1,2,3,4].forEach(function(i){
    if(i===0)tl.set("#dot0",{background:"${t.signal}",scale:1.6},0);
    else tl.to("#dot"+i,{background:"${t.signal}",scale:1.6,duration:.3},i*12);
  });

  // ═══ SCENE 1: Hook (0→11s) ═══
  c.innerHTML='<div class="text-block">'+k1+'<h1>'+charSpans(hook,"c")+'</h1><p class="lead">'+co+' &mdash; '+industry+'</p></div>';
  tl.from("#content",{opacity:1,duration:0},0);
  tl.set("#content,.kicker",{opacity:0},0);
  tl.to("#content",{opacity:1,duration:.6,ease:"power3.out"},.3);
  tl.from("#content .kicker",{x:-30,opacity:0,duration:.45,ease:"expo.out"},.4);
  // RULE 2: Character stagger on heading
  tl.from("#content h1 .c",{y:50,opacity:0,rotationX:-90,duration:.55,ease:"back.out(1.4)",stagger:.025},.6);
  tl.from("#content .lead",{y:25,opacity:0,duration:.5,ease:"power2.out"},1.2);
  // RULE 3: Micro-motion — gentle float on title
  tl.to("#content h1",{y:-4,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
  tl.to("#content .lead",{y:-2,duration:3.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");

  tl.to("#content",{opacity:0,duration:.5,ease:"power2.in"},10.5);

  // ═══ SCENE 2: Evidence + Data Viz (11→26s) ═══
  tl.call(function(){
    c.innerHTML='<div class="text-block">'+k2+'<h1>'+charSpans(pain,"c")+'</h1><div class="viz-row"><div class="bar-group"><div class="bar-val">'+esc(mVal)+'</div><div class="bar-wrap"><div class="bar-fill cur"></div></div><div class="bar-label">'+esc(isJa?"現在":"Current")+'</div></div><div class="bar-group"><div class="bar-val">71</div><div class="bar-wrap"><div class="bar-fill tgt"></div></div><div class="bar-label">'+esc(isJa?"目標":"Target")+'</div></div></div></div>';
  },null,11);

  tl.add("s2",11);
  tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s2");
  tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s2+=.05");
  tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s2+=.15");
  tl.from("#content .viz-row",{y:35,opacity:0,duration:.65,ease:"back.out(1.2)"},"s2+=.35");
  tl.to("#content .bar-fill.cur",{height:"${score}%",duration:1.1,ease:"power4.out"},"s2+=.5");
  // Micro-motion
  tl.to("#content h1",{y:-3,duration:3.2,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
  tl.to("#content .viz-row",{y:-2,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");

  tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},25.5);

  // ═══ SCENE 3: Fear + Loss (26→38s) ═══
  tl.call(function(){
    c.innerHTML='<div class="text-block">'+k3+'<h1>'+charSpans(fear,"c")+'</h1><div class="big-num">'+loss+'</div><div class="tile-row"><div class="tile"><div class="tlbl">'+esc(isJa?"月間損失":"Monthly")+'</div><div class="tval">'+loss+'</div></div><div class="tile"><div class="tlbl">'+esc(isJa?"年間換算":"Annual")+'</div><div class="tval">'+esc(isJa?"×12倍":"×12")+'</div></div></div></div>';
  },null,26);

  tl.add("s3",26);
  tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s3");
  tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s3+=.05");
  tl.from("#content h1 .c",{y:35,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s3+=.15");
  tl.from("#content .big-num",{scale:.4,opacity:0,duration:.9,ease:"elastic.out(1,.5)"},"s3+=.3");
  tl.from("#content .tile-row .tile",{y:30,opacity:0,duration:.5,ease:"back.out(1.2)",stagger:.12},"s3+=.5");
  // Micro-motion
  tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
  tl.to("#content .big-num",{y:-2,duration:3.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");

  tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},37.5);

  // ═══ SCENE 4: Solution + Hope (38→50s) ═══
  tl.call(function(){
    var extra='';
    if("${esc(data.template_variant)}"==="japan_entry") extra='<div class="check-grid">'+["特商法","APPI","決済","日本語"].map(function(x){return '<div class="check">'+x+'</div>'}).join("")+'</div>';
    c.innerHTML='<div class="text-block">'+k4+'<h1>'+charSpans(hope,"c")+'</h1>'+extra+'<p class="lead" style="margin-top:16px">'+co+'</p></div>';
  },null,38);

  tl.add("s4",38);
  tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s4");
  tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s4+=.05");
  tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s4+=.15");
  tl.from("#content .check-grid,.check",{y:25,opacity:0,duration:.45,ease:"back.out(1.2)",stagger:.07},"s4+=.3");
  tl.from("#content .lead",{y:20,opacity:0,duration:.5,ease:"power2.out"},"s4+=.4");
  // Micro-motion
  tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");

  tl.to("#content",{opacity:0,duration:.45,ease:"power2.in"},49.5);

  // ═══ SCENE 5: CTA + Outro (50→60s) ═══
  tl.call(function(){
    c.innerHTML='<div class="text-block">'+k5+'<h1>'+charSpans(cta,"c")+'</h1><p class="lead" style="font-family:monospace;font-size:17px;opacity:.6;margin-top:14px">'+url+'</p></div>';
  },null,50);

  tl.add("s5",50);
  tl.to("#content",{opacity:1,duration:.5,ease:"power2.out"},"s5");
  tl.from("#content .kicker",{x:-25,opacity:0,duration:.4,ease:"power3.out"},"s5+=.05");
  tl.from("#content h1 .c",{y:40,opacity:0,duration:.5,ease:"back.out(1.3)",stagger:.02},"s5+=.15");
  tl.from("#content .lead",{y:15,opacity:0,duration:.5,ease:"power2.out"},"s5+=.2");
  // Micro-motion
  tl.to("#content h1",{y:-3,duration:3,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");

  // Final fade to black
  tl.to("#stage",{opacity:0,duration:.8,ease:"power2.in"},59.2);

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
