/**
 * animation-system.ts — Full GSAP animation system for self-contained demos.
 * 
 * Provides: loader, progress bar, text reveal, counter, stagger, 
 * page transitions, hover micro-interactions. All driven by BrandDNA.
 */
import { extractAppleDNA } from "./apple-final"
import fs from "fs"
import { execSync } from "child_process"

const SPECS = {
  font: "'Space Grotesk', sans-serif",
  dark: "#191a23", light: "#f3f3f3", green: "#b9ff66", white: "#ffffff",
  headSize: "40px", headWeight: "500", bodySize: "18px",
  cardPad: "50px", cardGap: "77px", cardR: "45px", cardBorder: "1px solid #191a23",
  btnPad: "20px 35px", btnR: "14px", sectionPad: "0 100px", sectionGap: "40px",
  labelPad: "0 7px", labelR: "7px", navPad: "0 100px", navGap: "206px",
  cardColors: ["#f3f3f3", "#b9ff66", "#191a23", "#f3f3f3", "#b9ff66", "#191a23"],
}

function animationJS(dna: any): string {
  const v = dna.velocity || 0.5
  const g = dna.gravity || 0.5
  const w = dna.warmth || 0.5
  const dur = 0.4 + v * 0.6
  const stagger = 0.04 + (1 - v) * 0.12
  const ease = g > 0.6 ? "power3.out" : "power2.inOut"
  
  return `
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>
gsap.registerPlugin(ScrollTrigger);

const v=${v.toFixed(2)}, g=${g.toFixed(2)}, w=${w.toFixed(2)};
const dur=${dur.toFixed(2)}, ease="${ease}";
const S = ScrollTrigger;

// === PAGE LOADER ===
const loader = document.querySelector('.loader');
const loaderBar = document.querySelector('.loader-bar');
const loaderText = document.querySelector('.loader-text');
if (loader && loaderBar) {
  const tl = gsap.timeline({ onComplete: () => {
    gsap.to(loader, { y: '-100%', duration: dur*2, ease: 'power4.inOut', delay: 0.2 });
    gsap.set('body', { overflow: '' });
    // Hero text reveal after loader
    gsap.to('.hero-text', { opacity: 1, y: 0, duration: dur*1.5, ease, stagger: 0.08, delay: 0.3 });
    gsap.to('.hero-cta', { opacity: 1, y: 0, duration: dur*1.2, ease, delay: 0.6 });
  }});
  tl.to(loaderBar, { width: '100%', duration: 1.2 + v*1.5, ease: 'power2.inOut' });
  if (loaderText) {
    gsap.to(loaderText, { opacity: 1, duration: 0.4, delay: 0.1 });
    for (let i = 0; i < 3; i++) {
      gsap.to(loaderText, { opacity: 0.4, duration: 0.3, delay: 0.6 + i*0.4, yoyo: true, repeat: 1 });
    }
  }
}

// === SCROLL PROGRESS BAR ===
const progBar = document.querySelector('.progress-bar');
if (progBar) S.create({
  trigger: document.body, start: 'top top', end: 'bottom bottom',
  onUpdate: (s) => gsap.to(progBar, { scaleX: s.progress, duration: 0.1 })
});

// === HERO PARALLAX ===
gsap.to('.hero-parallax', { y: ${Math.round(40 + g * 60)}, ease: 'none',
  scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: true }
});

// === CARDS STAGGER REVEAL ===
gsap.from('.card', { opacity: 0, y: 80, duration: dur, stagger, ease,
  scrollTrigger: { trigger: '.grid', start: 'top 85%', toggleActions: 'play none none none' }
});

// === SECTION HEADINGS ===
gsap.from('.row-inner', { opacity: 0, y: 40, duration: dur, ease,
  scrollTrigger: { trigger: '.row', start: 'top 92%', toggleActions: 'play none none none' }
});

// === COUNTER ANIMATION ===
document.querySelectorAll('.counter').forEach(el => {
  const target = parseInt(el.dataset.target || '0');
  const suffix = el.dataset.suffix || '';
  S.create({
    trigger: el, start: 'top 95%', once: true,
    onEnter: () => gsap.fromTo(el, { innerText: 0 }, {
      innerText: target, duration: 1.5 + v*2, ease: 'power2.out',
      snap: { innerText: 1 }, onUpdate: function() { el.textContent = Math.round(this.targets()[0].innerText) + suffix; }
    })
  });
});

// === CTA CARD ===
gsap.from('.cta-card', { opacity: 0, scale: 0.92, duration: dur*1.2, ease,
  scrollTrigger: { trigger: '.cta-wrap', start: 'top 88%' }
});

// === FOOTER ===
gsap.from('.footer-card', { opacity: 0, y: 30, duration: dur, ease,
  scrollTrigger: { trigger: '.footer', start: 'top 92%' }
});

// === FAQ ACCORDION ===
document.querySelectorAll('.faq details').forEach(d => {
  d.addEventListener('toggle', () => {
    if (d.open) {
      gsap.from(d.querySelector('p'), { opacity: 0, height: 0, duration: 0.3, ease: 'power2.out' });
    }
  });
});

// === NAV SCROLL FX ===
gsap.to('.nav', { background: 'rgba(255,255,255,.98)', boxShadow: '0 1px 3px rgba(0,0,0,.08)',
  scrollTrigger: { trigger: 'body', start: 'top -68px', end: 'top -69px', toggleActions: 'play none none reverse' }
});

// === SMOOTH PAGE TRANSITIONS (SWUP-style) ===
document.querySelectorAll('a[href$=".html"]').forEach(link => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  link.addEventListener('click', function(e) {
    e.preventDefault();
    // Exit animation
    gsap.to('main', { opacity: 0, y: -30, duration: 0.3 + v*0.4, ease, onComplete: () => { window.location.href = href; } });
    gsap.to('.footer', { opacity: 0, y: 20, duration: 0.2 + v*0.3, ease }, 0);
  });
});
// Entry animation on page load
window.addEventListener('pageshow', () => {
  gsap.fromTo('main', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: dur*1.5, ease, delay: 0.3 });
});
if (document.querySelector('.hero-section')) {
  gsap.set('.hero-text', { opacity: 0, y: 30 });
  gsap.set('.hero-cta', { opacity: 0, y: 20 });
}

// === HOVER MICRO-INTERACTIONS (enhanced) ===
document.querySelectorAll('.card, .cta-btn').forEach(el => {
  el.addEventListener('mouseenter', () => gsap.to(el, { scale: 1.02, duration: 0.25, ease: 'power2.out' }));
  el.addEventListener('mouseleave', () => gsap.to(el, { scale: 1, duration: 0.25, ease: 'power2.out' }));
});

// === PARALLAX TILT ON HERO ===
if (document.querySelector('.hero-parallax')) {
  document.querySelector('.hero-parallax').addEventListener('mousemove', function(e) {
    const rect = this.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(this, { x: x * ${Math.round(10 + w * 20)}, y: y * ${Math.round(10 + w * 20)}, duration: 0.6, ease: 'power2.out' });
  });
  document.querySelector('.hero-parallax').addEventListener('mouseleave', function() {
    gsap.to(this, { x: 0, y: 0, duration: 0.8, ease: 'power3.out' });
  });
}
</script>`
}

export function pageHTML(slug: string, title: string, body: string, current: string, dna: any): string {
  const S = SPECS
  const nav = ["home","about","services","cases","faq","contact"]
    .map((n,i) => `<a href="${n==='home'?'index':n}.html" style="font-size:${S.bodySize};opacity:${n===current?'1':'0.6'};text-decoration:none;color:${S.dark}">${n.charAt(0).toUpperCase()+n.slice(1)}</a>`).join("")
  
  return `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${slug}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:${S.font};line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden;color:${S.dark};overflow-y:scroll}
.loader{position:fixed;inset:0;z-index:9999;background:${S.dark};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem}
.loader-bar-wrap{width:200px;height:2px;background:rgba(255,255,255,.1);border-radius:1px;overflow:hidden}
.loader-bar{width:0;height:100%;background:${S.green};border-radius:1px}
.loader-text{color:rgba(255,255,255,.6);font-size:14px;letter-spacing:.2em;text-transform:uppercase;opacity:0}
.progress-bar{position:fixed;top:0;left:0;right:0;height:2px;background:${S.green};transform-origin:left;transform:scaleX(0);z-index:10000}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;height:68px;display:flex;align-items:center;justify-content:space-between;padding:${S.navPad};background:rgba(255,255,255,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(0,0,0,.06);transition:background .4s,box-shadow .4s}
.nav-brand{font-size:24px;font-weight:700;text-decoration:none;color:${S.dark}}
.nav-links{display:flex;gap:${S.navGap};align-items:center}
.nav-cta{padding:${S.btnPad};border:${S.cardBorder};border-radius:${S.btnR};font-size:${S.bodySize};text-decoration:none;color:${S.dark};white-space:nowrap}
.page{padding-top:68px}
main{transition:opacity .4s,transform .4s}
.section{display:flex;flex-direction:column;padding:${S.sectionPad};gap:${S.sectionGap}}
.section-dark{background:${S.dark};color:${S.white}}
.section-light{background:#fff}.section-alt{background:${S.light}}
.row{display:flex;align-items:center;padding:${S.sectionPad};gap:40px;flex-wrap:wrap}
.row-inner{display:flex;align-items:center;gap:40px;flex-wrap:wrap}
.label{background:${S.green};padding:${S.labelPad};border-radius:${S.labelR};font-size:${S.headSize};font-weight:${S.headWeight};white-space:nowrap}
.desc{font-size:${S.bodySize};max-width:580px;line-height:1.6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:${S.sectionPad}}
.card{display:flex;justify-content:space-between;padding:${S.cardPad};border-radius:${S.cardR};border:${S.cardBorder};gap:${S.cardGap};transition:transform .4s,box-shadow .4s;will-change:transform;cursor:pointer}
.card-inner{display:flex;flex-direction:column;gap:93px}
.card h3{font-size:30px;font-weight:500;display:inline;padding:${S.labelPad};border-radius:${S.labelR};background:${S.green};line-height:2}
.card-dark h3{background:${S.white};color:${S.dark}}
.card-link{display:flex;align-items:center;gap:15px;font-size:${S.bodySize};text-decoration:none;color:${S.dark}}
.hero-text,.hero-cta{will-change:transform,opacity}
.counter{font-size:60px;font-weight:${S.headWeight};line-height:1;color:${S.green};display:inline-block;font-variant-numeric:tabular-nums}
.cta-wrap{padding:0 100px 40px}
.cta-card{display:flex;align-items:center;gap:275px;background:${S.light};border-radius:${S.cardR};padding:0 60px}
.cta-text{padding:60px 0;display:flex;flex-direction:column;gap:26px;flex:1}
.cta-text h2{font-size:30px;font-weight:500}
.cta-btn{display:inline-flex;padding:${S.btnPad};background:${S.dark};color:${S.white};border-radius:${S.btnR};font-size:${S.bodySize};text-decoration:none;width:fit-content;transition:transform .3s,box-shadow .3s}
.footer{padding:0 100px 100px}
.footer-card{background:${S.dark};color:${S.white};padding:55px 60px 50px;border-radius:${S.cardR} ${S.cardR} 0 0;display:flex;flex-direction:column;gap:50px}
.footer-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
.footer-nav{display:flex;gap:40px;flex-wrap:wrap}
.footer-nav a{opacity:.6;transition:opacity .2s;text-decoration:none;color:inherit;font-size:${S.bodySize}}
.footer-nav a:hover{opacity:1}
.footer-legal{border-top:1px solid rgba(255,255,255,.2);padding-top:50px;display:flex;gap:40px;opacity:.6;font-size:${S.bodySize};flex-wrap:wrap}
.footer-legal a{color:inherit}
.form-wrap{max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:1rem}
.form-wrap input,.form-wrap textarea{width:100%;padding:18px;border:${S.cardBorder};border-radius:${S.btnR};font-family:${S.font};font-size:${S.bodySize};transition:border-color .3s,box-shadow .3s}
.form-wrap input:focus,.form-wrap textarea:focus{outline:none;border-color:${S.green};box-shadow:0 0 0 3px ${S.green}30}
.form-wrap textarea{min-height:140px;resize:vertical}
.form-wrap button{padding:${S.btnPad};background:${S.dark};color:${S.white};border:none;border-radius:${S.btnR};font-size:${S.bodySize};font-weight:500;cursor:pointer;transition:transform .3s}
.faq details{border-bottom:${S.cardBorder};padding:20px 0;cursor:pointer}
.faq summary{font-size:${S.bodySize};font-weight:500;cursor:pointer;list-style:none;display:flex;justify-content:space-between;padding:0 100px}
.faq summary::after{content:'+';font-size:24px;opacity:.3;transition:transform .3s}
.faq details[open] summary::after{content:'−';transform:rotate(180deg)}
.faq details p{padding:10px 100px 20px;opacity:.7;line-height:1.8;overflow:hidden}
.success{display:none;text-align:center;padding:2rem;color:${S.green};font-size:${S.bodySize};font-weight:500}
@media(max-width:768px){.nav-links{display:none}.grid{grid-template-columns:1fr}.section,.row,.grid,.cta-wrap,.footer,.faq summary,.faq details p{padding-left:1rem;padding-right:1rem}.cta-card{flex-direction:column;gap:2rem;padding:2rem}.counter{font-size:40px}}
</style>
</head>
<body style="overflow:hidden">
<div class="progress-bar"></div>
<div class="loader"><div class="loader-bar-wrap"><div class="loader-bar"></div></div><div class="loader-text">Loading</div></div>
<nav class="nav"><a href="index.html" class="nav-brand">${slug}</a><div class="nav-links">${nav}<a href="contact.html" class="nav-cta">Contact</a></div></nav>
<main class="page">${body}</main>
<footer class="footer"><div class="footer-card">
<div class="footer-top"><a href="index.html" style="font-size:24px;font-weight:700;text-decoration:none;color:${S.white}">${slug}</a><div class="footer-nav">${["About","Services","Cases","FAQ","Contact"].map(n => `<a href="${n.toLowerCase()}.html">${n}</a>`).join("")}</div></div>
<div class="footer-legal"><span>&copy; 2024 ${slug}</span><a href="index.html">Privacy Policy</a></div>
</div></footer>
${animationJS(dna)}
</body></html>`
}
