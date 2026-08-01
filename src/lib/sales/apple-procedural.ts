/**
 * apple-procedural.ts — Zero templates. Apple-grade design from math.
 * 
 * Layers:
 *  1. Radix Colors — perceptually uniform palette from single hue
 *  2. Apple-grade CSS — glassmorphism, scroll reveals, micro-interactions
 *  3. Multi-page — home/about/services/cases/faq/contact
 *  4. WebGL shader — background from brand_seed (GLSL)
 *  5. Image injection — real company images from Crawl4AI
 */
import * as RadixColors from "@radix-ui/colors"
import { boundedNumber, isJsonObject, parseJsonObject, readChatContent, stringValue } from "./llm-response"

const API = process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com/v1"
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"

// ── BrandDNA ──

export interface BrandDNA {
  brand_seed: string
  gravity: number; velocity: number; complexity: number; warmth: number
  color_hue: number
  copy: {
    headline: string; subheadline: string
    aboutTitle: string; aboutBody: string
    services: Array<{ title: string; body: string }>
    cases: Array<{ title: string; body: string }>
    faq: Array<{ q: string; a: string }>
    cta: string
  }
}

// ── Radix color palette from hue ──

// Apple-grade design constants extracted via Figma MCP from
// https://www.figma.com/file/PzQUo9cnPBQHu9mSJF570X/Apple-Website-Clone
const APPLE_DNA = {
  heroWeight: 400,        // Apple uses LIGHT weight, not bold
  heroLineHeight: 1.69,   // Generous line height
  subheadWeight: 600,
  subheadLetterSpacing: -0.01, // Slightly negative
  cardRadius: 22,          // Large radius for cards
  buttonRadius: 54,        // Pill-shaped buttons
  primaryFont: "'Gilroy', 'SF Pro Display', -apple-system, sans-serif",
  sectionSpacing: 120,     // Generous section gaps
}

const RADIX_SCALES = [
  "tomato", "red", "crimson", "pink", "plum", "purple", "violet",
  "indigo", "blue", "sky", "cyan", "teal", "mint", "green", "grass",
  "lime", "yellow", "amber", "orange", "brown",
]

function nearestRadixScale(hue: number): keyof typeof RadixColors {
  const map: Record<string, keyof typeof RadixColors> = {
    "0-20": "tomato", "20-35": "orange", "35-50": "amber", "50-65": "yellow",
    "65-85": "lime", "85-140": "green", "140-170": "teal", "170-195": "cyan",
    "195-220": "sky", "220-245": "blue", "245-265": "indigo", "265-285": "violet",
    "285-310": "purple", "310-330": "plum", "330-345": "pink", "345-360": "crimson",
  }
  for (const [range, name] of Object.entries(map)) {
    const [lo, hi] = range.split("-").map(Number)
    if (hue >= lo && hue <= hi) return name
  }
  return "blue"
}

export function radixPalette(hue: number, warmth: number) {
  const scale = nearestRadixScale(hue)
  const palettes = RadixColors as unknown as Record<string, Record<string, string>>
  const colors = palettes[scale] ?? palettes.blue
  const darkBg = palettes[`${scale}Dark`] ?? palettes.blueDark
  
  return {
    primary: colors[`${scale}9`] || "#3b82f6",
    primaryLight: colors[`${scale}6`] || "#93c5fd",
    primaryDark: colors[`${scale}12`] || "#1e3a5f",
    background: warmth > 0.6 ? colors[`${scale}1`] || "#fefce8" : "#ffffff",
    surface: colors[`${scale}2`] || "#f8fafc",
    text: colors[`${scale}12`] || "#0f172a",
    textMuted: colors[`${scale}10`] || "#64748b",
    accent: palettes.amber?.amber9 ?? "#f59e0b",
    border: colors[`${scale}5`] || "#e2e8f0",
    shadow: `0 ${4 + warmth * 8}px ${16 + warmth * 16}px ${colors[`${scale}7`]}20`,
    darkBg: darkBg?.[`${scale}2`] || "#0f172a",
    darkSurface: darkBg?.[`${scale}3`] || "#1e293b",
  }
}

// ── Apple-grade CSS generation ──

function appleCSS(dna: BrandDNA, palette: ReturnType<typeof radixPalette>) {
  const g = dna.gravity; const v = dna.velocity; const c = dna.complexity; const w = dna.warmth
  const A = APPLE_DNA
  const font = A.primaryFont
  const radius = `${A.cardRadius * (0.8 + w * 0.4)}px`
  const btnRadius = `${A.buttonRadius * (0.8 + w * 0.4)}px`
  
  return `
:root {
  --font: ${font};
  --c-primary: ${palette.primary};
  --c-primary-light: ${palette.primaryLight};
  --c-primary-dark: ${palette.primaryDark};
  --c-bg: ${palette.background};
  --c-surface: ${palette.surface};
  --c-text: ${palette.text};
  --c-text-muted: ${palette.textMuted};
  --c-accent: ${palette.accent};
  --c-border: ${palette.border};
  --c-shadow: ${palette.shadow};
  --c-dark-bg: ${palette.darkBg};
  --c-dark-surface: ${palette.darkSurface};
  --radius: ${radius};
  --h1-size: clamp(${2.5 + g * 1.5}rem, ${5 + g * 3}vw, ${4 + g * 2}rem);
  --h2-size: clamp(${1.5 + g * 0.5}rem, 3vw, 2.5rem);
  --body-size: clamp(${0.9 + c * 0.1}rem, 1.1vw, 1.1rem);
  --section-pad: clamp(${3 + g * 2}rem, ${6 + g * 4}vw, ${A.sectionSpacing * (0.7 + g * 0.3) / 16}rem);
  --card-pad: ${1 + g * 1}rem ${1 + c * 0.5}rem;
  --gap: ${1 + c * 0.5}rem;
  --max-w: ${800 + c * 400}px;
  --easing: ${v > 0.5 ? "cubic-bezier(0.22,1,0.36,1)" : "cubic-bezier(0.16,1,0.3,1)"};
  --duration: ${0.3 + v * 0.4}s;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--c-bg);color:var(--c-text);line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--font);font-weight:${A.heroWeight + Math.round(g * 300)};letter-spacing:${-0.03 + g * 0.01}em;line-height:${A.heroLineHeight}}
h1{font-size:var(--h1-size)}h2{font-size:var(--h2-size)}h3{font-size:clamp(1.1rem,2vw,1.4rem)}
a{color:var(--c-primary);text-decoration:none}
img{max-width:100%;height:auto}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 clamp(1rem,4vw,2rem);height:64px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.85);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--c-border);transition:background var(--duration) var(--easing)}
.nav-brand{font-weight:700;font-size:1.1rem;letter-spacing:-0.01em}
.nav-links{display:flex;gap:${1 + c * 0.5}rem;align-items:center}
.nav-links a{font-size:0.88rem;font-weight:500;opacity:0.6;transition:opacity .2s;padding:6px 12px;border-radius:8px}
.nav-links a:hover{opacity:1;background:rgba(0,0,0,.03)}
.nav-cta{padding:10px 22px!important;background:var(--c-primary);color:#fff!important;opacity:1!important;font-weight:600!important;border-radius:var(--radius)}
.hero{display:flex;align-items:center;justify-content:center;min-height:${g > 0.6 ? "90vh" : "75vh"};text-align:center;padding:var(--section-pad) clamp(1rem,3vw,2rem);position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,${palette.primaryLight}15,transparent 70%);z-index:0}
.hero-content{position:relative;z-index:1;max-width:var(--max-w)}
.hero h1{margin-bottom:1rem;animation:fadeUp var(--duration) var(--easing) both}
.hero .sub{margin-bottom:2rem;color:var(--c-text-muted);font-size:${dna.complexity > 0.5 ? "var(--body-size)" : "clamp(1rem,1.5vw,1.25rem)"};max-width:500px;margin-left:auto;margin-right:auto;animation:fadeUp var(--duration) var(--easing) .1s both}
.hero .cta-btn{display:inline-flex;padding:16px 36px;background:var(--c-primary);color:#fff;border-radius:var(--radius);font-weight:600;font-size:1rem;text-decoration:none;box-shadow:var(--c-shadow);transition:transform .2s,box-shadow .2s;animation:fadeUp var(--duration) var(--easing) .2s both}
.hero .cta-btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px ${palette.primaryLight}40}
.section{padding:var(--section-pad) clamp(1rem,3vw,2rem)}
.section-alt{background:var(--c-surface)}
.section-dark{background:var(--c-dark-bg);color:#fff}
.section-dark h2{color:#fff}.section-dark p{color:rgba(255,255,255,.7)}
.section-container{max-width:var(--max-w);margin:0 auto}
.section-label{display:inline-flex;padding:4px 12px;background:${palette.primaryLight}20;color:var(--c-primary);border-radius:20px;font-size:0.8rem;font-weight:600;margin-bottom:1rem}
.section h2{margin-bottom:0.5rem}
.section-sub{color:var(--c-text-muted);margin-bottom:2rem;font-size:var(--body-size)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(${250 + c * 50}px,1fr));gap:var(--gap)}
.card{padding:var(--card-pad);border-radius:var(--radius);background:var(--c-surface);border:1px solid var(--c-border);transition:transform var(--duration) var(--easing),box-shadow var(--duration) var(--easing)}
.card:hover{transform:translateY(-4px);box-shadow:var(--c-shadow)}
.card h3{margin-bottom:0.5rem}
.card p{color:var(--c-text-muted);font-size:0.95rem;line-height:1.7}
.faq details{border-bottom:1px solid var(--c-border);padding:1.2rem 0}
.faq summary{font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;font-size:1rem}
.faq summary::after{content:'+';font-size:1.3rem;opacity:0.3}
.faq details[open] summary::after{content:'−'}
.faq details p{padding-top:0.8rem;color:var(--c-text-muted);line-height:1.8}
.cta-section{text-align:center;padding:var(--section-pad) clamp(1rem,3vw,2rem);background:linear-gradient(160deg,var(--c-primary-dark),var(--c-primary))}
.cta-section h2{color:#fff;margin-bottom:0.5rem}
.cta-section p{color:rgba(255,255,255,.8);margin-bottom:2rem;max-width:400px;margin-left:auto;margin-right:auto}
.cta-section .cta-btn{display:inline-flex;padding:16px 36px;background:#fff;color:var(--c-primary-dark);border-radius:var(--radius);font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 8px 30px rgba(0,0,0,.2);transition:transform .2s}
.cta-section .cta-btn:hover{transform:translateY(-2px)}
.contact-form{display:flex;flex-direction:column;gap:1rem;max-width:500px;margin:0 auto}
.contact-form input,.contact-form textarea{width:100%;padding:14px 18px;border:1.5px solid var(--c-border);border-radius:var(--radius);font-family:var(--font);font-size:1rem;background:var(--c-bg);color:var(--c-text);transition:border-color .2s}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:var(--c-primary)}
.contact-form textarea{min-height:140px;resize:vertical}
.contact-form button{padding:14px 32px;background:var(--c-primary);color:#fff;border:none;border-radius:var(--radius);font-weight:600;font-size:1rem;cursor:pointer;transition:transform .2s}
.contact-form button:hover{transform:translateY(-1px)}
.footer{padding:var(--section-pad) clamp(1rem,3vw,2rem);background:var(--c-dark-bg);color:rgba(255,255,255,.7)}
.footer-inner{max-width:var(--max-w);margin:0 auto;display:flex;flex-wrap:wrap;gap:2rem;justify-content:space-between}
.footer-brand{font-weight:700;font-size:1.1rem;color:#fff;margin-bottom:0.5rem}
.footer-info{font-size:0.85rem;opacity:0.6;line-height:2}
.footer-links{display:flex;gap:1.5rem}
.footer-links a{opacity:0.6;transition:opacity .2s}
.footer-links a:hover{opacity:1}
.footer-copy{padding-top:2rem;margin-top:2rem;border-top:1px solid rgba(255,255,255,.1);text-align:center;font-size:0.8rem;opacity:0.4}
@keyframes fadeUp{from{opacity:0;transform:translateY(${v > 0.5 ? "16px" : "24px"})}to{opacity:1;transform:translateY(0)}}
.shader-bg{position:fixed;inset:0;z-index:-1;opacity:${0.05 + c * 0.1};pointer-events:none}
@media(max-width:768px){.nav-links a:not(.nav-cta){display:none}.hero{min-height:60vh}}
`
}

// ── WebGL shader from brand_seed ──

function shaderGLSL(seed: number): string {
  const s = seed * 0.001
  return `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float n = sin(uv.x * ${(3 + s % 7).toFixed(1)} + u_time * ${(0.2 + (s % 5) * 0.1).toFixed(2)}) 
          * cos(uv.y * ${(4 + s % 6).toFixed(1)} - u_time * ${(0.3 + (s % 4) * 0.1).toFixed(2)});
  vec3 color = mix(
    vec3(${((s * 100) % 0.3 + 0.05).toFixed(2)}, ${((s * 200) % 0.2 + 0.02).toFixed(2)}, ${((s * 300) % 0.4 + 0.1).toFixed(2)}),
    vec3(${((s * 400) % 0.2 + 0.03).toFixed(2)}, ${((s * 500) % 0.3 + 0.05).toFixed(2)}, ${((s * 600) % 0.2 + 0.02).toFixed(2)}),
    n * 0.5 + 0.5
  );
  gl_FragColor = vec4(color, 1.0);
}`
}

function shaderHTML(seed: number): string {
  return `
<canvas class="shader-bg" id="shaderCanvas"></canvas>
<script>
(function(){
  const c=document.getElementById('shaderCanvas');
  if(!c)return;
  const gl=c.getContext('webgl')||c.getContext('experimental-webgl');
  if(!gl)return;
  c.width=window.innerWidth;c.height=window.innerHeight;
  window.addEventListener('resize',()=>{c.width=window.innerWidth;c.height=window.innerHeight;});
  const vs=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs,'attribute vec4 p;void main(){gl_Position=p;}');
  gl.compileShader(vs);
  const fs=gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs,\`${shaderGLSL(seed)}\`);
  gl.compileShader(fs);
  if(!gl.getShaderParameter(fs,gl.COMPILE_STATUS)){c.style.display='none';return;}
  const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const tLoc=gl.getUniformLocation(pr,'u_time');const rLoc=gl.getUniformLocation(pr,'u_resolution');
  function render(time){gl.uniform1f(tLoc,time*0.001);gl.uniform2f(rLoc,c.width,c.height);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(render);}
  requestAnimationFrame(render);
})();
</script>`
}

// ── Multi-page HTML generation ──

export function generateAppleSite(dna: BrandDNA, palette: ReturnType<typeof radixPalette>, images: string[]): Map<string, string> {
  const pages = new Map<string, string>()
  const css = appleCSS(dna, palette)
  const shader = shaderHTML(parseInt(dna.brand_seed.replace(/\D/g, "")) || Date.now())
  const p = palette
  
  function page(title: string, body: string, navCurrent: string) {
    const nav = ["home","about","services","cases","faq","contact"]
      .map(n => `<a href="/${n === "home" ? "" : n}"${n === navCurrent ? ' style="opacity:1"' : ''}>${n === "home" ? "Home" : n.charAt(0).toUpperCase()+n.slice(1)}</a>`).join("")
    return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title} — ${dna.brand_seed}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Serif+JP:wght@400;500;700;900&display=swap" rel="stylesheet"><style>${css}</style></head><body>${shader}<nav class="nav"><a href="/" class="nav-brand">${dna.brand_seed}</a><div class="nav-links">${nav}<a href="/contact" class="nav-cta">${dna.copy.cta}</a></div></nav>${body}<footer class="footer"><div class="footer-inner"><div><div class="footer-brand">${dna.brand_seed}</div><div class="footer-info">${dna.copy.subheadline}</div></div><div class="footer-links">${["About","Services","Cases","FAQ","Contact"].map(n => `<a href="/${n.toLowerCase()}">${n}</a>`).join("")}</div></div><div class="footer-copy">&copy; ${new Date().getFullYear()} ${dna.brand_seed}. All rights reserved.</div></footer></body></html>`
  }

  // Home
  const heroImage = images[0] ? `<div style="position:absolute;inset:0;z-index:0"><img src="${images[0]}" style="width:100%;height:100%;object-fit:cover" alt=""/><div style="position:absolute;inset:0;background:linear-gradient(to bottom,${p.background}40,${p.background})"></div></div>` : ""
  pages.set("index.html", page(dna.copy.headline, `
<header class="hero">${heroImage}<div class="hero-content"><h1>${dna.copy.headline}</h1><p class="sub">${dna.copy.subheadline}</p><a href="/contact" class="cta-btn">${dna.copy.cta}</a></div></header>
<section class="section"><div class="section-container"><span class="section-label">Services</span><h2>${dna.copy.aboutTitle}</h2><p class="section-sub">${dna.copy.aboutBody}</p><div class="grid">${dna.copy.services.map(s => `<div class="card"><h3>${s.title}</h3><p>${s.body}</p></div>`).join("")}</div></div></section>
${dna.copy.cases.length > 0 ? `<section class="section section-alt"><div class="section-container"><span class="section-label">Cases</span><h2>実績</h2><p class="section-sub">最新のプロジェクト事例</p><div class="grid">${dna.copy.cases.map(c => `<div class="card"><h3>${c.title}</h3><p>${c.body}</p></div>`).join("")}</div></div></section>` : ""}
<section class="cta-section"><h2>${dna.copy.cta}</h2><p>${dna.copy.subheadline}</p><a href="/contact" class="cta-btn">お問い合わせ</a></section>
`, "home"))

  // About
  pages.set("about/index.html", page(`About — ${dna.brand_seed}`, `
<section class="section" style="padding-top:100px"><div class="section-container"><h1>${dna.copy.aboutTitle}</h1><p style="color:var(--c-text-muted);font-size:var(--body-size);margin-top:1rem;line-height:1.9">${dna.copy.aboutBody}</p></div></section>
<section class="section section-alt"><div class="section-container"><h2>サービス</h2><div class="grid" style="margin-top:2rem">${dna.copy.services.map(s => `<div class="card"><h3>${s.title}</h3><p>${s.body}</p></div>`).join("")}</div></div></section>
`, "about"))

  // Services
  pages.set("services/index.html", page(`Services — ${dna.brand_seed}`, `
<section class="section" style="padding-top:100px"><div class="section-container"><h1>サービス</h1><p class="section-sub">${dna.copy.aboutBody.slice(0, 100)}</p><div class="grid">${dna.copy.services.map(s => `<div class="card"><h3>${s.title}</h3><p>${s.body}</p></div>`).join("")}</div></div></section>
`, "services"))

  // Cases
  if (dna.copy.cases.length > 0) {
    pages.set("cases/index.html", page(`Cases — ${dna.brand_seed}`, `
<section class="section" style="padding-top:100px"><div class="section-container"><h1>実績</h1><p class="section-sub">最新のプロジェクト事例</p><div class="grid">${dna.copy.cases.map(c => `<div class="card"><h3>${c.title}</h3><p>${c.body}</p></div>`).join("")}</div></div></section>
`, "cases"))
  }

  // FAQ
  pages.set("faq/index.html", page(`FAQ — ${dna.brand_seed}`, `
<section class="section" style="padding-top:100px"><div class="section-container"><h1>よくある質問</h1><div class="faq" style="margin-top:2rem">${dna.copy.faq.map(f => `<details${dna.copy.faq.indexOf(f) === 0 ? " open" : ""}><summary>${f.q}</summary><p>${f.a}</p></details>`).join("")}</div></div></section>
`, "faq"))

  // Contact
  pages.set("contact/index.html", page(`Contact — ${dna.brand_seed}`, `
<section class="section" style="padding-top:100px"><div class="section-container" style="text-align:center"><h1>お問い合わせ</h1><p class="section-sub">${dna.copy.subheadline}</p><form class="contact-form"><input type="text" name="name" placeholder="お名前" required/><input type="email" name="email" placeholder="メールアドレス" required/><textarea name="message" placeholder="お問い合わせ内容" required></textarea><button type="submit">送信する</button></form></div></section>
`, "contact"))

  return pages
}

// ── Step 1: LLM extracts BrandDNA ──

export async function extractBrandDNA(company: {
  name: string; domain: string; industry: string | null; location: string | null
  founded?: string; employeeCount?: number; reviewRating?: number
  aboutText?: string; services?: string[]; painSummary?: string
}): Promise<{ ok: boolean; dna?: BrandDNA; error?: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return { ok: false, error: "no API key" }

  const prompt = [
    "あなたは企業データをブランドデザインパラメータに変換する分析エンジンです。",
    "テキストは出力しない。JSONの数値パラメータのみを出力せよ。",
    "",
    "== パラメータ (0.0-1.0) ==",
    "gravity: 堅牢さ・伝統。高い→セリフ体・広い余白・太字",
    "velocity: スピード感。高い→速いアニメ・タイトなレイアウト",
    "complexity: 情報密度。高い→多カラム・多セクション",
    "warmth: 温かみ。高い→暖色・角丸・ソフト",
    "color_hue: ベース色相 (0-360)。建設=30, 飲食=15, IT=220, 医療=180, 法律=240, 緊急=0",
    "",
    "== 企業データ ==",
    `名前: ${company.name} | 業種: ${company.industry || "不明"}`,
    `所在地: ${company.location || ""} | 創業: ${company.founded || ""}`,
    `従業員: ${company.employeeCount || "?"}人 | 評価: ${company.reviewRating || "?"}/5`,
    `概要: ${company.aboutText || ""} | サービス: ${(company.services || []).join(", ")}`,
    `課題: ${company.painSummary || ""}`,
    "",
    "JSONのみ出力。brand_seedは会社名由来の一意な文字列。",
    "copyには headline, subheadline, aboutTitle, aboutBody(最低100字), services[{title,body}] x 3-4個,",
    "cases[{title,body}] x 2-3個, faq[{q,a}] x 4個, cta を含めよ。",
    "すべて日本語。企業の固有名詞・地名・診断データを自然に織り込め。",
  ].join("\n")

  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2048, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(45000),
    })
    const data: unknown = await res.json()
    const parsed = parseJsonObject(readChatContent(data))
    const copy = isJsonObject(parsed.copy) ? parsed.copy : {}
    const titleBodyList = (value: unknown): Array<{ title: string; body: string }> =>
      Array.isArray(value)
        ? value.flatMap((item): Array<{ title: string; body: string }> => {
            if (!isJsonObject(item)) return []
            const title = stringValue(item.title)
            const body = stringValue(item.body)
            return title && body ? [{ title, body }] : []
          })
        : []
    const faqList = (value: unknown): Array<{ q: string; a: string }> =>
      Array.isArray(value)
        ? value.flatMap((item): Array<{ q: string; a: string }> => {
            if (!isJsonObject(item)) return []
            const q = stringValue(item.q)
            const a = stringValue(item.a)
            return q && a ? [{ q, a }] : []
          })
        : []
    const dna: BrandDNA = {
      brand_seed: stringValue(parsed.brand_seed, company.name),
      gravity: boundedNumber(parsed.gravity, 0.5),
      velocity: boundedNumber(parsed.velocity, 0.5),
      complexity: boundedNumber(parsed.complexity, 0.5),
      warmth: boundedNumber(parsed.warmth, 0.5),
      color_hue: boundedNumber(parsed.color_hue, 210, 0, 360),
      copy: {
        headline: stringValue(copy.headline, company.name),
        subheadline: stringValue(copy.subheadline),
        aboutTitle: stringValue(copy.aboutTitle, "私たちについて"),
        aboutBody: stringValue(copy.aboutBody),
        services: titleBodyList(copy.services),
        cases: titleBodyList(copy.cases),
        faq: faqList(copy.faq),
        cta: stringValue(copy.cta, "Japan Entry Fit Review"),
      },
    }

    return { ok: true, dna }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
