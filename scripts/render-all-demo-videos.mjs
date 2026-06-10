/**
 * Batch render all variant + language combinations for demo videos.
 * Run: node scripts/render-all-demo-videos.mjs
 */
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

const BASE = path.join(os.tmpdir(), "hf-batch-render")
fs.mkdirSync(BASE, { recursive: true })

const VARIANTS = ["website_diagnostic", "meo", "security", "japan_entry", "video_subscription", "subsidy", "outreach"]
const LOCALES = ["ja", "en"]

// R2 config — use env vars, refuse to run without them
const R2 = {
  accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
  bucket: process.env.CLOUDFLARE_R2_BUCKET || "appexx-diagnostic-videos",
  accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  publicBase: process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL || "https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev"
}
if (!R2.accountId || !R2.accessKeyId || !R2.secretAccessKey) {
  console.error("CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY must be set")
  process.exit(1)
}

async function main() {
  const { S3Client, PutObjectCommand } = require("D:/dev/paradigmjpcom/node_modules/@aws-sdk/client-s3")
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey }
  })

  for (const variant of VARIANTS) {
    for (const lang of LOCALES) {
      console.log(`\n🎬 ${variant}/${lang}`)
      const dir = path.join(BASE, `${variant}-${lang}`)
      fs.mkdirSync(dir, { recursive: true })
      fs.mkdirSync(path.join(dir, "renders"), { recursive: true })

      // Build index.html via the project's API or demo data
      const html = buildVariantHtml(variant, lang)
      fs.writeFileSync(path.join(dir, "index.html"), html)
      fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({
        render: { defaults: { fps: 30, quality: "draft", format: "mp4" } }
      }, null, 2))

      // Render
      const outName = `diagnostic-${variant}`
      try {
        execSync(`npx hyperframes render --quality draft --output "${outName}.mp4"`, {
          cwd: dir, stdio: "inherit", timeout: 300_000
        })
      } catch (e) { console.error(`  ❌ Render failed: ${e.message}`); continue }

      // Find output
      const renderDir = path.join(dir, "renders")
      const files = fs.readdirSync(renderDir).filter(f => f.endsWith(".mp4"))
      if (!files.length) { console.error("  ❌ No MP4"); continue }
      const mp4Path = path.join(renderDir, files[0])
      console.log(`  ✓ Rendered: ${(fs.statSync(mp4Path).size/(1024*1024)).toFixed(1)}MB`)

      // Upload
      const key = `videos/demo/${variant}/${lang}/diagnostic-${variant}.mp4`
      await s3.send(new PutObjectCommand({
        Bucket: R2.bucket, Key: key,
        Body: fs.readFileSync(mp4Path), ContentType: "video/mp4"
      }))
      console.log(`  ✓ Uploaded: ${R2.publicBase}/${key}`)

      // Clean render temp
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
  console.log("\n✅ All done")
}

function buildVariantHtml(variant, lang) {
  const themes = {
    website_diagnostic: { bg: "#06060c", orb1: "#3b1f8c", orb2: "#1e1040", accent: "#8b5cf6", signal: "#a78bfa" },
    meo: { bg: "#040e07", orb1: "#166534", orb2: "#14532d", accent: "#22c55e", signal: "#4ade80" },
    security: { bg: "#0a0303", orb1: "#7f1d1d", orb2: "#450a0a", accent: "#ef4444", signal: "#f87171" },
    japan_entry: { bg: "#030912", orb1: "#1e3a5f", orb2: "#172554", accent: "#3b82f6", signal: "#60a5fa" },
    video_subscription: { bg: "#050210", orb1: "#4c1d95", orb2: "#2e1065", accent: "#8b5cf6", signal: "#a78bfa" },
    subsidy: { bg: "#021010", orb1: "#115e59", orb2: "#134e4a", accent: "#14b8a6", signal: "#2dd4bf" },
    outreach: { bg: "#0a0402", orb1: "#7c2d12", orb2: "#431407", accent: "#f97316", signal: "#fb923c" },
  }
  const t = themes[variant] || themes.website_diagnostic
  const isJa = lang === "ja"
  const d = getVariantData(variant, lang)
  return buildHtmlString(d, t, lang)
}

function esc(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") }

function getVariantData(variant, lang) {
  const isJa = lang === "ja"
  const DATA = {
    website_diagnostic: { co: isJa?"株式会社サンプル美容室":"Sample Beauty Salon Inc.", hook: isJa?"検索から予約までの導線で、訪問者の約60%が価値提案を見る前に離脱しています。":"About 60% of visitors leave before seeing your value proposition.", mVal:"38", loss:"¥2,450,000", fear: isJa?"モバイル表示速度が機会損失を生んでいる":"Mobile speed creating opportunity loss", hope: isJa?"SNS共有プレビューの改善で集客力を上げる":"Improve social previews for better reach", cta: isJa?"診断結果をもとに、売上機会、信頼低下、問い合わせ導線、運用負荷のどこから直すべきかを30分で整理します。":"Based on this assessment, we will identify the highest-impact area to fix first." },
    meo: { co: isJa?"イタリアンダイニング Buono":"Buono Italian Dining", hook: isJa?"Googleマップで「渋谷 イタリアン」と検索した840人のうち、御社を選んだのはたった12人。":"Of 840 people searching Italian Shibuya, only 12 chose you.", mVal:"15", loss:"¥1,200,000", fear: isJa?"地図で選ばれていない":"Not being chosen on the map", hope: isJa?"45日でMEOスコア50点・来店数2倍を達成可能":"50 MEO score + 2x visits in 45 days", cta: isJa?"まずは無料MEO診断で、御社のGoogleマップ表示順位を競合と比較します。":"Start with a free MEO audit comparing your Google Maps ranking." },
    security: { co: isJa?"MediCare Plus 株式会社":"MediCare Plus Inc.", hook: isJa?"御社の患者予約サイトが、Google Chromeで「保護されていない通信」と赤く表示されています。":"Your patient booking site shows a red Not Secure warning in Chrome.", mVal:"22", loss:"¥3,600,000", fear: isJa?"患者が予約前に離脱している":"Patients are leaving before booking", hope: isJa?"2週間でフルSSL対応・監査リスク解消":"Full SSL compliance + audit risk eliminated in 2 weeks", cta: isJa?"まずは無料セキュリティ診断で、御社のサイトが患者にどう見えているか確認します。":"Start with a free security audit to see what your patients see." },
    japan_entry: { co: "GreenTech Solutions Inc.", hook: isJa?"日本市場で御社の製品を購入しようとした消費者が、特商法表示の不備を理由に離脱しています。":"Japanese consumers attempting to purchase your product are abandoning due to missing commercial law disclosures.", mVal:"8", loss:"¥2,800,000", fear: isJa?"このまま放置すると取り返しがつかない":"Delay is compounding your competitive disadvantage", hope: isJa?"最短30日で日本参入・売上化が可能":"Japan entry and revenue in 30 days", cta: isJa?"まずは15分の無料診断で、御社の日本参入に必要な具体的ステップを明確にします。":"In a 15-min free assessment, we will map your exact Japan entry steps." },
    video_subscription: { co: isJa?"CrossFit Zone 日本":"CrossFit Zone Japan", hook: isJa?"御社のInstagram運用に毎月15時間を費やしても、フォロワー増加率は月1.2%。":"Despite 15 hours/month on Instagram, your follower growth is only 1.2%/month.", mVal:"0", loss:"¥1,260,000", fear: isJa?"15時間の努力が成果に結びついていない":"15 hours of effort not converting to results", hope: isJa?"月額$799で週4本のプロ動画を配信":"$799/month for 4 pro videos/week", cta: isJa?"まずは無料で御社のInstagramアカウントを監査し、動画化できるコンテンツ棚卸をします。":"We will audit your Instagram for free and inventory video-ready content." },
    subsidy: { co: isJa?"株式会社ナカムラ精機":"Nakamura Precision Instruments", hook: isJa?"御社が2025年度に受けられる補助金・助成金の総額は最大820万円ですが、申請期限まであと45日です。":"Your company qualifies for up to $56,000 in 2025 subsidies and grants.", mVal:"31", loss:"¥8,200,000", fear: isJa?"使える補助金を知らないまま期限が迫っている":"Deadlines approaching while eligible subsidies go unclaimed", hope: isJa?"採択率68%・申請から報告まで一括代行":"68% success rate end-to-end support", cta: isJa?"まずは無料で御社の適合補助金を全てリストアップします。":"We will list every eligible grant for your company for free." },
    outreach: { co: isJa?"株式会社ビズネクスト":"BizNext Corporation", hook: isJa?"御社の問い合わせフォームは、毎月58件の入力があるにも関わらず、自動返信もなければ営業担当への通知もないため、平均返信時間が47時間です。":"Your contact form receives 58 submissions/month but has no auto-reply or sales notification.", mVal:"47", loss:"¥11,400,000", fear: isJa?"せっかくの問い合わせを47時間も放置している":"58 monthly inquiries abandoned for 47 hours each", hope: isJa?"自動化で返信時間47時間→3分・商談+12件/月":"47hrs to 3min response, +12 conversations/month", cta: isJa?"まずは無料で御社の問い合わせフォームを分析します。":"We will analyze your contact form for free." },
  }
  return DATA[variant] || DATA.website_diagnostic
}

function buildHtmlString(d, t, lang) {
  const isJa = lang === "ja"
  const l = (k) => esc(k)
  const T = {
    diag: l(isJa?"Paradigm 診断":"Paradigm Diagnostic"),
    evidence: l(isJa?"公開データ分析":"Public Evidence"),
    lossTitle: l(isJa?"機会損失":"Hidden Cost"),
    solution: l(isJa?"ソリューション":"Solution"),
    action: l(isJa?"次のアクション":"Next Step"),
    now: l(isJa?"現在":"Current"),
    target: l(isJa?"目標":"Target"),
    monthly: l(isJa?"月間損失":"Monthly Loss"),
  }
  const score = Math.min(parseFloat(d.mVal)||38, 100)

  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=1920,height=1080"/>
<title>${esc(d.co)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:${t.bg};font-family:Inter,"Noto Sans JP",system-ui,sans-serif;color:#eff6ff;-webkit-font-smoothing:antialiased}
#stage{width:1920px;height:1080px;position:relative;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(180px);opacity:.5;z-index:0}
.orb-1{width:900px;height:900px;background:${t.orb1};top:-200px;left:-100px}
.orb-2{width:700px;height:700px;background:${t.orb2};bottom:-150px;right:150px}
.bento{position:absolute;inset:0;padding:120px;display:grid;grid-template-columns:1fr 1fr;grid-gap:50px;z-index:2}
.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);border-radius:40px;padding:70px;display:flex;flex-direction:column;justify-content:center;opacity:1}
.card.large{grid-row:span 2}
.kicker{font-size:18px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:${t.signal};margin-bottom:20px;display:flex;align-items:center;gap:14px}
.kicker::before{content:"";display:block;width:28px;height:2px;background:${t.signal};border-radius:1px}
h1{font-size:80px;line-height:1.05;font-weight:900;margin-bottom:24px}
.gradient-h1{background:linear-gradient(135deg,#eff6ff 0%,${t.signal} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{font-size:26px;color:rgba(239,246,255,0.55);line-height:1.5}
.big-num{font-size:130px;font-weight:900;line-height:1;color:#f87171}
.num-label{font-size:22px;color:rgba(239,246,255,0.55);text-transform:uppercase;letter-spacing:.12em;margin-top:10px}
.icon-box{width:100px;height:100px;border-radius:28px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;margin-bottom:28px;font-size:48px}
.chart-row{display:flex;gap:60px;align-items:flex-end;margin-top:24px;height:240px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:10px}
.bar-wrap{width:100%;height:200px;background:rgba(255,255,255,.03);border-radius:12px;overflow:hidden;display:flex;flex-direction:column-reverse}
.bar-fill{width:100%;border-radius:12px}
.bar-fill.cur{background:${t.signal}}
.bar-fill.tgt{border:2px dashed rgba(255,255,255,.15);background:transparent;height:71%}
.bar-label{font-size:17px;color:rgba(239,246,255,0.55);text-transform:uppercase;letter-spacing:.06em}
.bar-value{font-size:30px;font-weight:800}
.prog{position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,.06);z-index:10}
.prog-fill{height:100%;background:${t.signal};width:0}
.hud{position:absolute;left:120px;right:120px;bottom:36px;display:flex;justify-content:space-between;color:rgba(255,255,255,.12);font-size:15px;z-index:10}
@keyframes o1{0%,100%{transform:translate(0,0)}50%{transform:translate(70px,-50px)}}
@keyframes o2{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,50px)}}
.orb-1{animation:o1 14s ease-in-out infinite}
.orb-2{animation:o2 16s ease-in-out infinite}
</style></head>
<body>
<div id="stage" data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="60">
<div class="orb orb-1"></div><div class="orb orb-2"></div>
<div class="bento" id="b1">
<div class="card large"><div class="icon-box">📊</div><div class="kicker">${T.diag}</div><h1 class="gradient-h1">${esc(d.hook)}</h1><p class="sub">${esc(d.co)}</p></div>
<div class="card"><div class="kicker">${T.evidence}</div><div class="chart-row"><div class="bar-col"><div class="bar-value">${esc(d.mVal)}</div><div class="bar-wrap"><div class="bar-fill cur"></div></div><div class="bar-label">${T.now}</div></div><div class="bar-col"><div class="bar-value">71</div><div class="bar-wrap"><div class="bar-fill tgt"></div></div><div class="bar-label">${T.target}</div></div></div></div>
<div class="card"><div class="kicker" style="color:#f87171">${T.lossTitle}</div><div class="big-num" id="loss">0</div><div class="num-label">${T.monthly}</div></div>
</div>
<div class="prog"><div class="prog-fill" id="prog"></div></div>
<div class="hud"><span style="font-weight:700;color:${t.signal}">PARADIGM</span><span>${esc(d.co)}</span><span>paradigmjp.com</span></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
(function i(){var s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";s.onload=g;s.onerror=function(){document.querySelectorAll(".card").forEach(function(e){e.style.opacity="1"})};document.head.appendChild(s);
function g(){
var tl=gsap.timeline({paused:true});
tl.to("#prog",{width:"100%",duration:60,ease:"none"},0);
tl.from("#b1 .card",{opacity:0,y:80,duration:1.1,ease:"expo.out",stagger:.2},.4);
tl.to(".bar-fill.cur",{height:"${score}%",duration:1.4,ease:"elastic.out(1,.6)"},1.2);
var lv=parseFloat("${esc(d.loss).replace(/[^0-9.]/g,"0")}")||0;tl.to({v:0},{v:lv,duration:1.6,ease:"power2.out",onUpdate:function(){document.getElementById("loss").textContent=isJa?"¥"+Math.floor(this.targets()[0].v).toLocaleString():Math.floor(this.targets()[0].v).toLocaleString()}},1.4);
tl.to("#b1 .card",{y:-8,duration:4.5,yoyo:true,repeat:-1,ease:"sine.inOut"},">-=.5");
tl.to("#b1",{opacity:0,duration:.7,ease:"power2.in"},44);
tl.call(function(){document.getElementById("b1").innerHTML='<div class="card large" style="align-items:center;text-align:center"><div class="icon-box">✅</div><div class="kicker">${T.solution}</div><h1 class="gradient-h1" style="font-size:68px">${esc(d.hope)}</h1><p class="sub">${esc(d.co)}</p></div><div class="card" style="align-items:center"><div class="kicker">${T.action}</div><h1 style="font-size:52px;font-weight:800">${esc(d.cta)}</h1><p class="sub" style="font-size:20px;font-family:monospace;opacity:.45;margin-top:12px">paradigmjp.com</p></div>'},null,45);
tl.to("#b1",{opacity:1,duration:.7,ease:"power2.out"},45);
tl.from("#b1 .card",{opacity:0,y:60,duration:.9,ease:"expo.out",stagger:.2},45.3);
tl.to("#stage",{opacity:0,duration:1,ease:"power2.in"},58.5);
tl.play();window.__timelines=window.__timelines||{};window.__timelines["main"]=tl;
}})();
</script>
</body></html>`
}

main()
