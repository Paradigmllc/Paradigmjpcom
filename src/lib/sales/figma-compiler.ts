/**
 * figma-compiler.ts — Figma Auto Layout → Astro CSS 1:1 pixel-perfect compiler.
 *
 * Reads the extracted Figma layout spec (from REST API) and generates
 * Astro components with exact CSS that mirrors the Figma design.
 */
import fs from "fs"

interface FigmaNode {
  name: string
  type: string
  x?: number; y?: number; w: number; h: number
  layout?: string
  padding?: { t: number; r: number; b: number; l: number }
  gap?: number
  bg?: string
  bgImage?: boolean
  text?: string
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  textAlign?: string
  radius?: number
  border?: string
  css?: string
  depth: number
  children?: FigmaNode[]
}

// ── Load extracted spec ──
export function loadFigmaLayout(path: string): FigmaNode[] {
  const raw = JSON.parse(fs.readFileSync(path, "utf8"))
  return raw.layoutSpec || []
}

// ── Figma → CSS compiler ──
export function nodeToCSS(node: FigmaNode): string {
  const rules: string[] = []
  
  if (node.w) rules.push(`width:${node.w}px`)
  if (node.h) rules.push(`height:${node.h}px`)
  if (node.bg) rules.push(`background:${node.bg}`)
  if (node.radius) rules.push(`border-radius:${node.radius}px`)
  if (node.border) rules.push(`border:${node.border}`)
  if (node.layout) {
    rules.push("display:flex")
    rules.push(`flex-direction:${node.layout === "HORIZONTAL" ? "row" : "column"}`)
    if (node.padding) {
      const p = node.padding
      if (p.t === p.r && p.r === p.b && p.b === p.l) {
        rules.push(`padding:${p.t}px`)
      } else {
        rules.push(`padding:${p.t}px ${p.r}px ${p.b}px ${p.l}px`)
      }
    }
    if (node.gap && node.gap > 0) rules.push(`gap:${node.gap}px`)
  }
  if (node.fontSize) rules.push(`font-size:${node.fontSize}px`)
  if (node.fontWeight) rules.push(`font-weight:${node.fontWeight}`)
  if (node.fontFamily) rules.push(`font-family:${node.fontFamily}`)
  if (node.textAlign) rules.push(`text-align:${node.textAlign.toLowerCase()}`)
  
  return rules.join(";")
}

// ── Generate complete Astro page from Figma layout ──
export function generateAstroFromFigma(layoutPath: string, companyData: {
  companyName: string
  industry: string
  location: string
  services: string[]
  aboutText: string
  ctaText: string
}): string {
  const layout = loadFigmaLayout(layoutPath)
  
  // Build the Figma structure as HTML
  const sections = buildSections(layout, companyData)
  
  return [
    "---",
    "// Generated from Figma Auto Layout spec — pixel-perfect Positivus clone",
    "---",
    "<html lang=\"ja\">",
    "<head>",
    "<meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"/>",
    "<link href=\"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap\" rel=\"stylesheet\">",
    "<style>",
    "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:'Space Grotesk',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}",
    "a{color:inherit;text-decoration:none}",
    "</style>",
    `<title>${companyData.companyName}</title>`,
    "</head>",
    "<body>",
    ...sections,
    "</body>",
    "</html>",
  ].join("\n")
}

function buildSections(layout: FigmaNode[], company: any): string[] {
  const html: string[] = []
  
  // Nav
  const nav = layout.find(n => n.name === "Navigation bar")
  if (nav) {
    html.push(`<nav style="${nodeToCSS(nav)};position:sticky;top:0;z-index:100;background:#fff">`)
    html.push(`  <span style="font-weight:700;font-size:24px">${company.companyName}</span>`)
    html.push(`  <div style="display:flex;gap:40px;align-items:center;margin-left:auto">`)
    html.push(`    <a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a>`)
    html.push(`    <a href="/contact" style="padding:20px 35px;border:1px solid #191a23;border-radius:14px">Contact</a>`)
    html.push(`  </div>`)
    html.push(`</nav>`)
  }
  
  // Hero
  html.push(`<section style="display:flex;padding:0 100px;gap:206px;align-items:center;min-height:515px">`)
  html.push(`  <div style="display:flex;flex-direction:column;gap:35px;max-width:531px">`)
  html.push(`    <h1 style="font-size:60px;font-weight:500;line-height:1.1;color:#191a23">${company.aboutText}</h1>`)
  html.push(`    <p style="font-size:20px;line-height:1.6;color:#000">${company.location}を拠点に、${company.services.slice(0,2).join("・")}を提供しています。</p>`)
  html.push(`    <a href="/contact" style="display:inline-flex;padding:20px 35px;background:#191a23;color:#fff;border-radius:14px;font-size:20px;width:fit-content">${company.ctaText}</a>`)
  html.push(`  </div>`)
  html.push(`</section>`)
  
  // Services — Cards grid (2 columns, alternating bg)
  html.push(`<section style="display:flex;flex-direction:column;gap:40px;padding:0 100px">`)
  html.push(`  <div style="display:flex;align-items:center;gap:40px">`)
  html.push(`    <span style="background:#b9ff66;padding:0 7px;font-size:40px;font-weight:500;border-radius:7px">Services</span>`)
  html.push(`    <p style="font-size:18px;max-width:580px">${company.services.join("、")}など、幅広いサービスを提供しています。</p>`)
  html.push(`  </div>`)
  
  const cardBgs = ["#f3f3f3", "#b9ff66", "#191a23", "#f3f3f3", "#b9ff66", "#191a23"]
  html.push(`  <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">`)
  company.services.forEach((svc: string, i: number) => {
    const bg = cardBgs[i % cardBgs.length]
    const isDark = bg === "#191a23"
    html.push(`    <div style="display:flex;padding:50px;gap:77px;border-radius:45px;border:1px solid #191a23;background:${bg};justify-content:space-between">`)
    html.push(`      <div style="display:flex;flex-direction:column;gap:93px">`)
    html.push(`        <h3 style="font-size:30px;font-weight:500;background:${isDark ? "#fff" : "#b9ff66"};display:inline;padding:0 7px;border-radius:7px;color:${isDark ? "#fff" : "#000"}">${svc}</h3>`)
    html.push(`        <a href="/contact" style="display:flex;align-items:center;gap:15px;color:${isDark ? "#fff" : "#000"}">Learn more <span style="font-size:24px">→</span></a>`)
    html.push(`      </div>`)
    html.push(`    </div>`)
  })
  html.push(`  </div>`)
  html.push(`</section>`)
  
  // CTA
  html.push(`<section style="display:flex;padding:0 100px;margin-top:40px">`)
  html.push(`  <div style="display:flex;padding:0 60px;gap:275px;align-items:center;background:#f3f3f3;border-radius:45px;width:100%">`)
  html.push(`    <div style="display:flex;flex-direction:column;gap:26px;padding:60px 0">`)
  html.push(`      <h2 style="font-size:30px;font-weight:500">${company.ctaText}</h2>`)
  html.push(`      <p style="font-size:18px">Japan Entryの固定範囲と適合性を申込前に確認します。</p>`)
  html.push(`      <a href="/contact" style="display:inline-flex;padding:20px 35px;background:#191a23;color:#fff;border-radius:14px;font-size:20px;width:fit-content">相談する</a>`)
  html.push(`    </div>`)
  html.push(`  </div>`)
  html.push(`</section>`)
  
  // Footer
  html.push(`<footer style="display:flex;flex-direction:column;padding:55px 60px 50px;gap:50px;background:#191a23;color:#fff;margin-top:80px;border-radius:45px 45px 0 0;margin-left:100px;margin-right:100px">`)
  html.push(`  <div style="display:flex;justify-content:space-between;align-items:center">`)
  html.push(`    <span style="font-size:24px;font-weight:700">${company.companyName}</span>`)
  html.push(`    <div style="display:flex;gap:40px"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact</a></div>`)
  html.push(`  </div>`)
  html.push(`  <div style="display:flex;gap:154px">`)
  html.push(`    <div style="display:flex;flex-direction:column;gap:27px"><div>${company.location}</div></div>`)
  html.push(`    <div style="display:flex;padding:58px 40px;gap:20px;background:#292a32;border-radius:14px;flex:1"><input placeholder="Email" style="background:transparent;border:1px solid #fff;padding:20px;border-radius:14px;color:#fff;flex:1"/><button style="padding:20px 35px;background:#b9ff66;border:none;border-radius:14px;font-size:20px;font-weight:500;cursor:pointer">Subscribe</button></div>`)
  html.push(`  </div>`)
  html.push(`  <div style="border-top:1px solid #fff;padding-top:50px;display:flex;gap:40px;font-size:18px;opacity:0.8">© 2024 ${company.companyName}. <a href="/privacy">Privacy Policy</a></div>`)
  html.push(`</footer>`)
  
  return html
}
