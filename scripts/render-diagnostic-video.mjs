/**
 * Render pipeline: compose HTML → hyperframes render → upload R2
 * Run: node scripts/render-diagnostic-video.mjs <slug> [locale]
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import crypto from "node:crypto"

// ─── Config (from env) ───
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
const R2_PUBLIC_BASE = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  console.error("Missing R2 env vars. Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  process.exit(1)
}

const slug = process.argv[2]
const locale = process.argv[3] || "ja"
if (!slug) { console.error("Usage: node scripts/render-diagnostic-video.mjs <slug> [locale]"); process.exit(1) }

console.log(`🎬 Rendering diagnostic video: slug=${slug} locale=${locale}`)

// ─── Step 1: Fetch report data via API ───
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com"
console.log(`📡 Fetching report data from ${baseUrl}...`)

let reportData
try {
  const res = await fetch(`${baseUrl}/api/sales/diagnostic?slug=${encodeURIComponent(slug)}&locale=${locale}`, {
    headers: { "x-api-key": process.env.SALES_API_KEY || "dev" }
  })
  if (!res.ok) {
    // Fallback: use demo data generation
    console.log(`⚠ API returned ${res.status}, using demo data fallback`)
    reportData = generateDemoData(slug, locale)
  } else {
    reportData = await res.json()
  }
} catch (e) {
  console.log(`⚠ API fetch failed: ${e.message}, using demo data fallback`)
  reportData = generateDemoData(slug, locale)
}

if (!reportData) {
  console.error("❌ No report data available")
  process.exit(1)
}

console.log(`✓ Report data: ${reportData.company_name} (${reportData.industry})`)

// ─── Step 2: Generate HyperFrames HTML ───
const tmpDir = path.join(os.tmpdir(), `hf-render-${crypto.randomUUID().slice(0, 8)}`)
fs.mkdirSync(tmpDir, { recursive: true })
console.log(`📝 Temp dir: ${tmpDir}`)

// Build HTML with data
const html = buildCompositionHtml(reportData, locale)
const htmlPath = path.join(tmpDir, "index.html")
fs.writeFileSync(htmlPath, html, "utf-8")
console.log(`✓ HTML written: ${(Buffer.byteLength(html)/1024).toFixed(1)}KB`)

// Write hyperframes.json
fs.writeFileSync(path.join(tmpDir, "hyperframes.json"), JSON.stringify({
  render: { defaults: { fps: 30, quality: "standard", format: "mp4" } }
}, null, 2))

// Create renders dir
fs.mkdirSync(path.join(tmpDir, "renders"), { recursive: true })

// ─── Step 3: Render MP4 ───
const outName = `diagnostic-${slug}-${locale}-${Date.now()}`
console.log(`🎥 Rendering MP4: ${outName}...`)

try {
  execSync(`npx hyperframes render --quality standard --output "${outName}.mp4"`, {
    cwd: tmpDir,
    stdio: "inherit",
    timeout: 180_000,
  })
} catch (e) {
  console.error(`❌ Render failed: ${e.message}`)
  process.exit(1)
}

// Find the output file
const renderDir = path.join(tmpDir, "renders")
const files = fs.readdirSync(renderDir).filter(f => f.endsWith(".mp4"))
if (files.length === 0) {
  console.error("❌ No MP4 produced")
  process.exit(1)
}
const mp4Path = path.join(renderDir, files[0])
const mp4Size = (fs.statSync(mp4Path).size / (1024 * 1024)).toFixed(1)
console.log(`✓ MP4 rendered: ${mp4Size}MB → ${mp4Path}`)

// ─── Step 4: Upload to R2 ───
const objectKey = `videos/${slug}/${locale}/${files[0]}`
console.log(`☁ Uploading to R2: ${R2_BUCKET}/${objectKey}...`)

const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
})

const fileBody = fs.readFileSync(mp4Path)
await s3.send(new PutObjectCommand({
  Bucket: R2_BUCKET,
  Key: objectKey,
  Body: fileBody,
  ContentType: "video/mp4",
}))

const publicUrl = `${R2_PUBLIC_BASE.replace(/\/+$/, "")}/${objectKey}`
console.log(`✓ Uploaded: ${publicUrl}`)

// ─── Cleanup ───
fs.rmSync(tmpDir, { recursive: true, force: true })
console.log("🧹 Temp files cleaned")

// Output the public URL for piping to other tools
console.log(`\n📺 PUBLIC URL: ${publicUrl}`)
process.stdout.write(publicUrl)

// ─── Demo data generator (fallback when API unavailable) ───
function generateDemoData(s: string, l: string) {
  const variants = {
    japan_entry: { company_name: "GreenTech Solutions Inc.", industry: "consulting", template_variant: "japan_entry", total_loss: "¥2,800,000", hook: "日本市場で御社の製品を購入しようとした消費者が、特商法表示の不備を理由に離脱しています。", report_url: `https://paradigmjp.com/${l}/report/demo/${s}`, source_coverage: { score: 72 }, acts: [{ headline: "日本市場で御社のブランドが信用されていない", metric_label: "信頼スコア", metric_value: "8/100", body: "日本消費者は購入前に必ず「特定商取引法に基づく表記」を確認します。" }, { headline: "このまま放置すると取り返しがつかない", metric_label: "残り猶予", metric_value: "3-6ヶ月", body: "日本EC市場は年率12%で成長中。" }, { headline: "最短30日で日本参入・売上化が可能", metric_label: "最短納期", metric_value: "30日", body: "弊社の日本参入パッケージでは、特商法対応・決済導入・日本語サイト構築を全て並行して進めます。" }], cta_text: "まずは15分の無料診断で、御社の日本参入に必要な具体的ステップを明確にします。" }
  }
  const d = variants[s] || variants.japan_entry
  return { ...d, report_locale: l, target_country: "JP" }
}

// ─── Composition HTML builder (Bento Grid) ───
function buildCompositionHtml(data: any, lang: string) {
  const isJa = lang === "ja"
  const th = { bg: "#030912", orb1: "#1e3a5f", orb2: "#172554", accent: "#3b82f6", text: "#eff6ff", muted: "rgba(239,246,255,0.55)", signal: "#60a5fa", warn: "#fbbf24" }
  const co = esc(data.company_name)
  const loss = esc(data.total_loss)
  const url = esc(data.report_url || "https://paradigmjp.com")
  const mVal = data.acts?.[0]?.metric_value || "38"
  const score = Math.min(parseFloat(mVal) || 38, 100)
  const barColor = score < 40 ? th.signal : score < 70 ? th.warn : th.accent

  // Labels
  const l = (k: string) => esc(k)
  const T = {
    diag: isJa ? l("Paradigm 診断") : l("Paradigm Diagnostic"),
    evidence: isJa ? l("公開データ分析") : l("Public Evidence"),
    lossTitle: isJa ? l("機会損失") : l("Hidden Cost"),
    solution: isJa ? l("ソリューション") : l("Solution"),
    action: isJa ? l("次のアクション") : l("Next Step"),
    now: isJa ? l("現在") : l("Now"),
    target: isJa ? l("目標") : l("Target"),
    monthly: isJa ? l("月間損失") : l("Monthly Loss"),
    annual: isJa ? l("年間換算") : l("Annual"),
  }
  const hook = esc(data.hook || "")
  const fear = esc(data.acts?.[1]?.headline || "Loss risk increasing")
  const hope = esc(data.acts?.[2]?.headline || "Fix available in 30 days")
  const cta = esc(data.cta_text || "Book free assessment")

  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=1920,height=1080"/>
<title>${co}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1920px;height:1080px;overflow:hidden;background:${th.bg}}
  body{font-family:Inter,"Noto Sans JP",system-ui,sans-serif;color:${th.text};-webkit-font-smoothing:antialiased}
  #stage{width:1920px;height:1080px;position:relative;overflow:hidden}
  .orb{position:absolute;border-radius:50%;filter:blur(180px);opacity:.5}
  .orb-1{width:900px;height:900px;background:${th.orb1};top:-200px;left:-100px}
  .orb-2{width:700px;height:700px;background:${th.orb2};bottom:-150px;right:150px}
  .bento{position:absolute;inset:0;padding:120px;display:grid;grid-template-columns:1fr 1fr;grid-gap:50px}
  .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:40px;padding:70px;display:flex;flex-direction:column;justify-content:center}
  .card.large{grid-row:span 2}
  .kicker{font-size:18px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${th.signal};margin-bottom:20px;display:flex;align-items:center;gap:12px}
  .kicker::before{content:"";display:block;width:24px;height:2px;background:${th.signal};border-radius:1px}
  h1{font-size:74px;line-height:1.06;font-weight:900;margin-bottom:24px}
  .gradient-h1{background:linear-gradient(135deg,${th.text} 0%,${th.signal} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .sub{font-size:28px;color:${th.muted};line-height:1.5}
  .big-num{font-size:120px;font-weight:900;line-height:1}
  .num-label{font-size:22px;color:${th.muted};text-transform:uppercase;letter-spacing:.1em}
  .icon-box{width:90px;height:90px;border-radius:24px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:40px}
  .chart-row{display:flex;gap:60px;align-items:flex-end;margin-top:30px;height:240px}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:12px}
  .bar-wrap{width:100%;height:200px;background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden;display:flex;flex-direction:column-reverse}
  .bar-fill{width:100%;border-radius:10px}
  .bar-fill.cur{background:${barColor}}
  .bar-fill.tgt{border:2px dashed rgba(255,255,255,.15);background:transparent;height:71%}
  .bar-label{font-size:16px;color:${th.muted};text-transform:uppercase;letter-spacing:.05em}
  .bar-value{font-size:28px;font-weight:800}
  .prog{position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,.06)}
  .prog-fill{height:100%;background:${th.signal};width:0}
  .hud{position:absolute;left:120px;right:120px;bottom:40px;display:flex;justify-content:space-between;color:rgba(255,255,255,.15);font-size:14px}
  @keyframes o1{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-40px)}}
  @keyframes o2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,40px)}}
  .orb-1{animation:o1 14s ease-in-out infinite}
  .orb-2{animation:o2 16s ease-in-out infinite}
</style></head>
<body>
<div id="stage">
  <div class="orb orb-1"></div><div class="orb orb-2"></div>

  <div class="bento">
    <div class="card large">
      <div class="icon-box">📊</div>
      <div class="kicker">${T.diag}</div>
      <h1 class="gradient-h1">${hook}</h1>
      <p class="sub">${co}</p>
    </div>
    <div class="card">
      <div class="kicker">${T.evidence}</div>
      <div class="chart-row">
        <div class="bar-col"><div class="bar-value">${esc(mVal)}</div><div class="bar-wrap"><div class="bar-fill cur"></div></div><div class="bar-label">${T.now}</div></div>
        <div class="bar-col"><div class="bar-value">71</div><div class="bar-wrap"><div class="bar-fill tgt"></div></div><div class="bar-label">${T.target}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="kicker" style="color:#f87171">${T.lossTitle}</div>
      <div class="big-num" id="loss">0</div>
      <div class="num-label">${T.monthly}</div>
    </div>
  </div>

  <div class="prog"><div class="prog-fill" id="prog"></div></div>
  <div class="hud"><span style="font-weight:700;color:${th.signal}">PARADIGM</span><span>${co}</span><span>${url}</span></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function i(){if(typeof gsapi==="undefined"){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";s.onload=run;s.onerror=function(){};document.head.appendChild(s)}else run();
function run(){
var tl=gsap.timeline({paused:true});
tl.to("#prog",{width:"100%",duration:60,ease:"none"},0);

// Bento cards entrance
tl.from("#stage .card",{opacity:0,y:60,duration:1,ease:"expo.out",stagger:.15},.5);
// Bar chart grow
tl.to(".bar-fill.cur",{height:"${score}%",duration:1.3,ease:"elastic.out(1,.6)"},1);
// Loss count-up
var lv=parseFloat("${loss.replace(/[^0-9.]/g,"0")}")||0;
tl.to({v:0},{v:lv,duration:1.5,ease:"power2.out",onUpdate:function(){document.getElementById("loss").textContent=Math.floor(this.targets()[0].v)>1e4?(Math.floor(this.targets()[0].v)/1e4).toFixed(1)+"万":Math.floor(this.targets()[0].v).toLocaleString()}},1.2);
// Micro-motion
tl.to("#stage .card",{y:-6,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
// Scene 2: Solution + CTA (overlay)
tl.to("#stage .bento",{opacity:0,duration:.6,ease:"power2.in"},42);
tl.call(function(){
  var el=document.querySelector("#stage .bento");
  el.innerHTML='<div class="card large" style="align-items:center;text-align:center"><div class="icon-box">🎯</div><div class="kicker">${T.solution}</div><h1 class="gradient-h1" style="font-size:64px">${hope}</h1><p class="sub">${co}</p></div><div class="card" style="align-items:center"><div class="kicker">${T.action}</div><h1 style="font-size:48px;font-weight:800">${cta}</h1><p class="sub" style="font-size:20px;font-family:monospace;opacity:.5;margin-top:8px">${url}</p></div>';
},null,43);
tl.to("#stage .bento",{opacity:1,duration:.6,ease:"power2.out"},43);
tl.from("#stage .bento .card",{opacity:0,y:50,duration:.8,ease:"expo.out",stagger:.2},43.2);
// Fade out
tl.to("#stage",{opacity:0,duration:.8,ease:"power2.in"},59);
tl.play();
}})();
</script>
</body></html>`

  function esc(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") }
}
