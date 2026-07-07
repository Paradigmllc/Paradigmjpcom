#!/usr/bin/env node
const twenty=require('../lib/twenty-client'),{extractAssets}=require('../../lead-discovery/scripts/sources/site-assets'),fs=require('fs');
const D=process.env,K=D.DEEPSEEK_API_KEY,B=D.DEEPSEEK_API_BASE||'https://api.deepseek.com';
const R2={id:D.CLOUDFLARE_R2_ACCOUNT_ID,key:D.CLOUDFLARE_R2_ACCESS_KEY_ID,secret:D.CLOUDFLARE_R2_SECRET_ACCESS_KEY,bucket:D.CLOUDFLARE_R2_BUCKET||'appexx-diagnostic-videos',pub:D.CLOUDFLARE_R2_PUBLIC_BASE_URL||'https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev'};
function pa(){const a=process.argv.slice(2),o={};for(let i=0;i<a.length;i++){const v=a[i+1];switch(a[i]){case'--company-id':o.companyId=v;i++;break;}}return o;}
async function ds(p){const r=await fetch(`${B}/v1/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:p}],temperature:.75,max_tokens:3000,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw new Error(`DS ${r.status}`);return (await r.json()).choices?.[0]?.message?.content;}
async function up(key,body){if(!R2.id)return null;try{const{S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');const s3=new S3Client({region:'auto',endpoint:`https://${R2.id}.r2.cloudflarestorage.com`,credentials:{accessKeyId:R2.key,secretAccessKey:R2.secret}});await s3.send(new PutObjectCommand({Bucket:R2.bucket,Key:key,Body:body,ContentType:'text/html'}));return`${R2.pub}/${key}`;}catch(e){return null;}}

// ── CSS (company colors injected at build time via --accent, --secondary CSS vars) ──
const CSS=`:root{--p:#1a1a2e;--s:#e94560;--bg:#fafaf8;--t:#1a1a2e;--m:#787880;--b:#e8e8ed;--w:#fff;--d:rgba(0,0,0,.04);--g:linear-gradient(135deg,var(--p),var(--s))}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@font-face{font-family:'SH';src:local('Noto Serif JP'),local('Hiragino Mincho ProN'),local('serif')}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;font-feature-settings:"palt"1}
body{font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Arial,sans-serif;color:var(--t);background:var(--bg);line-height:1.9;overflow-x:hidden;font-weight:350}
.l{position:fixed;inset:0;background:var(--p);z-index:9999;display:flex;align-items:center;justify-content:center;transition:opacity .5s,visibility .5s}
.l.h{opacity:0;visibility:hidden;pointer-events:none}
.l::after{content:'';width:36px;height:36px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.n{position:fixed;top:0;left:0;right:0;z-index:1000;padding:20px 0;transition:all .5s cubic-bezier(.22,1,.36,1)}
.n.s{background:rgba(250,250,248,.88);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px);padding:12px 0;box-shadow:0 1px 0 rgba(0,0,0,.05)}
.n .c{max-width:1280px;margin:0 auto;padding:0 40px;display:flex;justify-content:space-between;align-items:center}
.n .b{display:flex;align-items:center;gap:12px;font-family:SH,serif;font-weight:700;font-size:19px;text-decoration:none;color:var(--t);letter-spacing:.03em}
.n .b img{height:30px;width:auto;border-radius:4px}
.n .r{display:flex;gap:36px;align-items:center}.n .r a{color:var(--m);text-decoration:none;font-size:13px;font-weight:500;letter-spacing:.06em;transition:color .3s;position:relative;text-transform:uppercase}
.n .r a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:var(--p);transition:width .4s cubic-bezier(.22,1,.36,1)}
.n .r a:hover{color:var(--t)}.n .r a:hover::after{width:100%}
.n .r .bs{padding:9px 22px;background:var(--p);color:#fff!important;border-radius:6px;font-size:12px!important;letter-spacing:.08em}.n .r .bs::after{display:none}.n .r .bs:hover{background:var(--s)}
.n .h{display:none;background:none;border:none;cursor:pointer;padding:4px}.n .h span{display:block;width:20px;height:1.5px;background:var(--t);margin:5px 0;transition:all .3s}
.hr{min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding:0 40px}
.hr-bg{position:absolute;inset:0}.hr-bg img{width:100%;height:100%;object-fit:cover;filter:brightness(.4) saturate(1.1)}
.hr-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(160deg,rgba(0,0,0,.8) 0%,rgba(0,0,0,.25) 55%,rgba(0,0,0,.55) 100%)}
.hr .hc{position:relative;z-index:1;max-width:760px;animation:fu 1.2s cubic-bezier(.22,1,.36,1)}
.hr .ey{font-size:11px;font-weight:600;letter-spacing:.18em;color:var(--s);text-transform:uppercase;margin-bottom:20px;display:inline-block;padding:5px 14px;border:1px solid rgba(255,255,255,.15);border-radius:3px}
.hr h1{font-family:SH,serif;font-size:clamp(34px,6vw,68px);font-weight:700;line-height:1.12;letter-spacing:.02em;color:#fff;margin-bottom:24px}
.hr h1 em{font-style:normal;color:var(--s)}
.hr .sub{font-size:clamp(15px,1.7vw,18px);color:rgba(255,255,255,.7);line-height:2;margin-bottom:36px;max-width:520px}
.hr .btns{display:flex;gap:14px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:15px 34px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:.06em;text-decoration:none;cursor:pointer;border:none;transition:all .4s cubic-bezier(.22,1,.36,1)}
.btn-p{background:var(--s);color:#fff}.btn-p:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(0,0,0,.2)}
.btn-o{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25)}.btn-o:hover{background:rgba(255,255,255,.08)}
.sc{padding:120px 40px}.sc .c{max-width:1280px;margin:0 auto}
.sc-l{font-size:10px;font-weight:700;letter-spacing:.22em;color:var(--s);text-transform:uppercase;margin-bottom:14px;display:block}
.sc h2{font-family:SH,serif;font-size:clamp(26px,4vw,44px);font-weight:700;line-height:1.25;letter-spacing:.02em;margin-bottom:18px}
.sc h3{font-family:SH,serif;font-size:19px;font-weight:600;letter-spacing:.02em}
.ld{font-size:16px;color:var(--m);line-height:2;max-width:600px}
.st{display:grid;grid-template-columns:repeat(4,1fr)}
.st .si{padding:56px 28px;text-align:center;border-right:1px solid var(--b);border-bottom:1px solid var(--b)}.st .si:nth-child(4n){border-right:none}
.st .sv{font-family:SH,serif;font-size:clamp(28px,4vw,48px);font-weight:700;color:var(--p);line-height:1.1}
.st .sl{font-size:12px;color:var(--m);margin-top:6px;letter-spacing:.1em;text-transform:uppercase;font-weight:500}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.cd{background:var(--w);border-radius:12px;padding:44px 36px;transition:all .5s cubic-bezier(.22,1,.36,1);border:1px solid var(--b)}
.cd:hover{transform:translateY(-8px);box-shadow:0 32px 72px rgba(0,0,0,.07)}
.cd .ic{font-size:26px;margin-bottom:18px;width:52px;height:52px;background:var(--d);border-radius:50%;display:flex;align-items:center;justify-content:center}
.cd p{font-size:14px;color:var(--m);line-height:1.9;margin-top:10px}
.rw{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;margin-bottom:100px}.rw:last-child{margin-bottom:0}
.im{overflow:hidden;border-radius:14px}.im img{width:100%;display:block;transition:transform 1s cubic-bezier(.22,1,.36,1)}.im:hover img{transform:scale(1.06)}
.nm{font-family:SH,serif;font-size:140px;font-weight:700;color:rgba(0,0,0,.02);line-height:1;position:absolute;top:-30px;left:-30px;pointer-events:none;user-select:none}
.bl{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.bc{text-decoration:none;color:inherit;display:block}.bc:hover .bi{transform:scale(1.04)}
.bi{width:100%;height:220px;object-fit:cover;border-radius:10px;margin-bottom:18px;transition:transform .6s cubic-bezier(.22,1,.36,1)}
.cat{font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--s);text-transform:uppercase;margin-bottom:6px}
.dt{font-size:12px;color:var(--m)}
.bc h3{font-size:17px;margin:8px 0;color:var(--t)}.bc p{font-size:13px;color:var(--m);line-height:1.8}
.tq{font-size:17px;line-height:2.1;padding-left:24px;font-style:italic}
.tq-at{font-weight:600;font-size:14px;margin-top:14px}.tq-rl{font-size:12px;color:var(--m)}
.pc{text-align:center;padding:48px 32px;background:var(--w);border-radius:14px;border:1px solid var(--b);transition:all .5s}
.pc.fe{background:var(--p);color:#fff;border-color:var(--p);transform:scale(1.04);box-shadow:0 40px 80px rgba(0,0,0,.1)}.pc.fe .btn-p{background:var(--s)}
.pn{font-size:13px;font-weight:700;letter-spacing:.1em;margin-bottom:14px;text-transform:uppercase}
.pr{font-family:SH,serif;font-size:44px;font-weight:700}.pr span{font-size:14px;opacity:.5}
.pc ul{list-style:none;text-align:left;margin:28px 0;font-size:13px}.pc li{padding:10px 0;border-bottom:1px solid var(--b);color:var(--m)}.pc.fe li{border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.7)}.pc li::before{content:'✓ ';color:var(--s);font-weight:700;margin-right:8px}
.fq{border-bottom:1px solid var(--b);padding:28px 0;cursor:pointer;transition:all .3s}.fq:hover{border-color:var(--p)}
.fq h4{font-size:16px;font-weight:500;display:flex;justify-content:space-between;align-items:center;gap:20px}
.fq h4::after{content:'+';font-size:18px;color:var(--m);transition:transform .4s}.fq.op h4::after{transform:rotate(45deg);color:var(--s)}
.fq .a{max-height:0;overflow:hidden;transition:max-height .4s,padding .4s;color:var(--m);font-size:14px;line-height:2}.fq.op .a{max-height:300px;padding-top:18px}
.cta-w{border-radius:28px;margin:0 40px;overflow:hidden;position:relative;text-align:center;color:#fff}.cta-w::before{content:'';position:absolute;inset:0;background:var(--g)}.cta-w .ci{position:relative;z-index:1;padding:100px 40px}.cta-w h2{color:#fff}.cta-w .btn-p{background:#fff;color:var(--p)}
.fm{max-width:540px;margin:0 auto}.fm input,.fm textarea{width:100%;padding:15px;background:var(--w);border:1px solid var(--b);border-radius:7px;font-size:14px;font-family:inherit;color:var(--t);margin-bottom:14px;transition:all .3s}
.fm input:focus,.fm textarea:focus{outline:none;border-color:var(--p);box-shadow:0 0 0 3px var(--d)}.fm textarea{min-height:130px;resize:vertical}
.ft{background:#111;color:rgba(255,255,255,.45);padding:80px 40px 36px}.ft h4{color:#fff;font-size:12px;font-weight:700;letter-spacing:.12em;margin-bottom:18px;text-transform:uppercase}
.ft a{color:rgba(255,255,255,.35);text-decoration:none;display:block;padding:5px 0;font-size:13px;transition:color .3s}.ft a:hover{color:#fff}
.ft .fg{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px}.ft .fbb{border-top:1px solid rgba(255,255,255,.08);margin-top:48px;padding-top:24px;font-size:12px;text-align:center}
#bt{position:fixed;bottom:36px;right:36px;width:44px;height:44px;background:var(--p);color:#fff;border:none;border-radius:50%;font-size:16px;cursor:pointer;z-index:100;opacity:0;visibility:hidden;transform:translateY(8px);transition:all .3s;box-shadow:0 4px 16px rgba(0,0,0,.12)}
#bt.v{opacity:1;visibility:visible;transform:translateY(0)}#bt:hover{background:var(--s)}
#pg{position:fixed;top:0;left:0;height:2px;background:var(--s);z-index:9998;transition:width .1s linear}
.rv{opacity:0;transform:translateY(36px);transition:all .8s cubic-bezier(.22,1,.36,1)}.rv.v{opacity:1;transform:translateY(0)}
@keyframes fu{from{opacity:0;transform:translateY(50px)}to{opacity:1;transform:translateY(0)}}
.page-hero{padding:160px 40px 80px;background:var(--p);color:#fff;text-align:center}.page-hero h1{font-family:SH,serif;font-size:clamp(28px,4vw,44px);color:#fff}.page-hero p{opacity:.7;margin-top:12px;font-size:16px}
.back-link{display:inline-block;color:var(--p);text-decoration:none;font-size:13px;margin-bottom:24px}.back-link:hover{opacity:.7}
.blog-nav{display:flex;justify-content:space-between;margin-top:60px;padding-top:24px;border-top:1px solid var(--b);font-size:13px}
.blog-nav a{color:var(--m);text-decoration:none}.blog-nav a:hover{color:var(--p)}
@media(max-width:768px){.n .r{display:none}.n .r.op{display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg);flex-direction:column;padding:90px 36px 36px;gap:20px;z-index:-1}.n .h{display:block}.hr{padding:0 24px}.hr h1{font-size:30px}.sc{padding:80px 24px}.g2,.rw,.g3,.st,.bl,.fg{grid-template-columns:1fr}.rw{margin-bottom:60px}.pc.fe{transform:none}.st .si:nth-child(2n){border-right:none}.cta-w{margin:0 24px}}`;

// ── Prompt ──
function cp(co,a){
  const n=co.name||'',d=(co.domainName?.primaryLinkUrl||'').replace('https://','');
  return `Create rich Japanese demo content for ${n} (${d}), industry: ${co.paradigmIndustryName||''}. JSON only:
{"site":{"name":"brand","tagline":"tagline"},"hero":{"eyebrow":"eyebrow","headline":"headline with <em>emphasis</em>","sub":"sub copy","cta":"btn","cta2":"2nd btn"},"stats":[{"value":"2,500+","label":"導入企業"},{"value":"98.5%","label":"継続率"},{"value":"24h","label":"対応"},{"value":"50億+","label":"取引"}],"features":[{"icon":"⚡","title":"title","body":"50-char benefit"},{"icon":"🎯","title":"title","body":"50-char benefit"},{"icon":"🔐","title":"title","body":"50-char benefit"}],"about":{"story":"180-char story","mission":"45-char mission"},"services":[{"icon":"📱","title":"service","body":"80-char","points":["pt","pt","pt"]},{"icon":"🎨","title":"service","body":"80-char","points":["pt","pt"]},{"icon":"📊","title":"service","body":"80-char","points":["pt","pt"]}],"pricing":[{"name":"Light","price":"¥80,000","period":"/月","features":["f1","f2","f3","f4"]},{"name":"Pro","price":"¥250,000","period":"/月","features":["f1","f2","f3","f4","f5","f6"],"featured":true},{"name":"Enterprise","price":"¥600,000","period":"/月","features":["f1","f2","f3","f4","f5","f6","f7","f8"]}],"blog":[{"title":"28-char title","date":"2026-07","cat":"INSIGHT","excerpt":"90-char excerpt","body":"250-char body"},{"title":"28-char title","date":"2026-06","cat":"GUIDE","excerpt":"90-char excerpt","body":"250-char body"},{"title":"28-char title","date":"2026-05","cat":"CASE","excerpt":"90-char excerpt","body":"250-char body"}],"testimonials":[{"quote":"100-char","author":"name","role":"title","company":"co"},{"quote":"100-char","author":"name","role":"title","company":"co"}],"faq":[{"q":"question","a":"answer 120 chars"},{"q":"question","a":"answer 120 chars"},{"q":"question","a":"answer 120 chars"}],"cta":{"eyebrow":"READY","title":"CTA headline","sub":"urgency","btn":"button"}}`;}

// ── Shared HTML components ──
function NAV(logo,site,active){
  const A=(p)=>active===p?' style="color:var(--t)"':'';
  return`<nav class="n" id="nv"><div class="c"><a href="./" class="b">${logo?`<img src="${logo}" alt="${site}" onerror="this.style.display='none'">`:''}<span>${site}</span></a><button class="h" aria-label="Menu" onclick="document.querySelector('.n .r').classList.toggle('op')"><span></span><span></span></button><div class="r"><a href="./"${A('home')}>Home</a><a href="about.html"${A('about')}>About</a><a href="services.html"${A('services')}>Services</a><a href="blog.html"${A('blog')}>Blog</a><a href="contact.html" class="bs">Contact</a></div></div></nav>`;}
function FOOT(site,tag,logo,em,ph,sv){
  return`<footer class="ft"><div class="c"><div class="fg"><div><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">${logo?`<img src="${logo}" alt="" style="height:22px;border-radius:4px" onerror="this.style.display='none'">`:''}<span style="color:#fff;font-family:SH,serif;font-weight:700">${site}</span></div><p style="font-size:12px;line-height:1.9">${tag||''}</p></div><div><h4>Services</h4>${(sv||[]).slice(0,4).map(s=>`<a href="services.html">${s.title}</a>`).join('')}</div><div><h4>Company</h4><a href="about.html">About</a><a href="services.html">Services</a><a href="blog.html">Blog</a><a href="contact.html">Contact</a></div><div><h4>Contact</h4><p style="font-size:12px">${em||''}</p><p style="font-size:12px;margin-top:6px">${ph||''}</p></div></div><div class="fbb"><p>© ${new Date().getFullYear()} ${site}. All Rights Reserved. | デモサイト</p></div></div></footer>`;}
function JS(){return`<div class="l" id="ld"></div><div id="pg"></div><button id="bt" aria-label="Top">↑</button><script>window.addEventListener('load',()=>{setTimeout(()=>document.getElementById('ld').classList.add('h'),300)});window.addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-document.documentElement.clientHeight;document.getElementById('pg').style.width=(window.scrollY/h*100)+'%';document.getElementById('bt').classList.toggle('v',window.scrollY>500);document.getElementById('nv').classList.toggle('s',window.scrollY>40)});document.getElementById('bt').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));document.querySelectorAll('.rv').forEach(el=>new IntersectionObserver(e=>e.forEach(en=>{if(en.isIntersecting)en.target.classList.add('v')}),{threshold:.1}).observe(el));document.querySelectorAll('.fq').forEach(i=>i.addEventListener('click',()=>i.classList.toggle('op')));</script>`;}
function HEAD(title,desc,fav){return`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><meta name="description" content="${desc}"><link rel="icon" href="${fav||''}"><meta name="robots" content="noindex,nofollow"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>`;}

// ── Page renderers ──
function index(c,a,n,d){
  const S=c.site||{},H=c.hero||{},ST=c.stats||[],FT=c.features||[],T=c.testimonials||[],CTA=c.cta||{};
  const sn=S.name||n,og=a.ogImage||a.images[0]||null;
  let h=HEAD(sn,S.tagline||'',a.favicon)+NAV(a.logo,sn,'home')+
  `<section class="hr"><div class="hr-bg">${og?`<img src="${og}" alt="" loading="eager" onerror="this.parentElement.style.background='linear-gradient(160deg,var(--p),var(--s))';this.remove()">`:''}</div><div class="hc"><span class="ey">${H.eyebrow||''}</span><h1>${H.headline||''}</h1><p class="sub">${H.sub||''}</p><div class="btns"><a href="contact.html" class="btn btn-p">${H.cta||'相談'}</a><a href="services.html" class="btn btn-o">${H.cta2||'詳細'}</a></div></div></section>`;
  if(ST.length)h+=`<div class="st">${ST.map(s=>`<div class="si"><div class="sv">${s.value}</div><div class="sl">${s.label}</div></div>`).join('')}</div>`;
  if(FT.length)h+=`<section class="sc" style="background:var(--w)"><div class="c"><div class="g3">${FT.map((f,i)=>`<div class="cd rv" style="transition-delay:${i*0.1}s"><div class="ic">${f.icon||'✨'}</div><h3>${f.title}</h3><p>${f.body}</p></div>`).join('')}</div></div></section>`;
  if(T.length)h+=`<section class="sc"><div class="c"><span class="sc-l rv">VOICE</span><h2 class="rv">お客様の声</h2><div class="g3">${T.map(t=>`<div class="rv"><div class="tq">${t.quote}</div><p class="tq-at">${t.author}<span style="font-weight:300;color:var(--m);font-size:12px"> ${t.role}</span></p></div>`).join('')}</div></div></section>`;
  h+=`<div class="cta-w"><div class="ci"><span class="sc-l rv" style="color:var(--s)">${CTA.eyebrow||''}</span><h2 class="rv">${CTA.title||''}</h2><p class="rv" style="opacity:.8;margin:16px 0 32px">${CTA.sub||''}</p><a href="contact.html" class="btn btn-p rv">${CTA.btn||'相談'}</a></div></div>`;
  h+=FOOT(sn,S.tagline||'',a.logo,a.email,a.phone,c.services||[])+JS()+'</body></html>';
  return h;
}
function about(c,a,n,d){
  const S=c.site||{},A=c.about||{};const sn=S.name||n;
  return HEAD(`About | ${sn}`,(A.story||'').slice(0,80),a.favicon)+NAV(a.logo,sn,'about')+
  `<section class="page-hero"><h1>${A.mission||'私たちの理念'}</h1><p>About Us</p></section>`+
  `<section class="sc"><div class="c"><div class="g2"><div class="rv"><p class="ld">${A.story||''}</p></div><div class="rv">${a.images[0]?`<div class="im"><img src="${a.images[0]}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:''}</div></div></div></section>`+
  FOOT(sn,S.tagline||'',a.logo,a.email,a.phone,c.services||[])+JS()+'</body></html>';
}
function services(c,a,n,d){
  const S=c.site||{},SV=c.services||[],P=c.pricing||[],F=c.faq||[];const sn=S.name||n;
  let h=HEAD(`Services | ${sn}`,'サービス',a.favicon)+NAV(a.logo,sn,'services')+`<section class="page-hero"><h1>サービス</h1><p>ビジネスをトータルサポート</p></section><section class="sc"><div class="c">`;
  for(let i=0;i<SV.length;i++){const s=SV[i];
    h+=`<div class="rw rv${i%2?' rv':''}"><div><h3 style="font-size:26px;margin-bottom:14px">${s.icon||''} ${s.title}</h3><p style="font-size:15px;color:var(--m);line-height:2.1;margin-bottom:20px">${s.body}</p>${(s.points||[]).map(p=>`<div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--m);margin-bottom:8px"><span style="color:var(--s);font-weight:700">✓</span>${p}</div>`).join('')}</div><div class="im">${a.images[(i+1)%a.images.length]?`<img src="${a.images[(i+1)%a.images.length]}" alt="${s.title}" loading="lazy" onerror="this.style.display='none'">`:''}</div></div>`;}
  h+=`</div></section>`;
  if(P.length)h+=`<section class="sc" style="background:var(--w)"><div class="c"><span class="sc-l rv">PRICING</span><h2 class="rv">料金プラン</h2><div class="g3">${P.map(p=>`<div class="pc rv${p.featured?' fe':''}"><div class="pn">${p.name}</div><div class="pr">${p.price}<span>${p.period||''}</span></div><ul>${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul><a href="contact.html" class="btn btn-p" style="width:100%">申し込む</a></div>`).join('')}</div></div></section>`;
  if(F.length)h+=`<section class="sc"><div class="c" style="max-width:780px"><h2 class="rv">FAQ</h2>${F.map(q=>`<div class="fq rv"><h4>${q.q}</h4><div class="a">${q.a}</div></div>`).join('')}</div></section>`;
  h+=FOOT(sn,S.tagline||'',a.logo,a.email,a.phone,SV)+JS()+'</body></html>';
  return h;
}
function blog(c,a,n,d){
  const S=c.site||{},B=c.blog||[];const sn=S.name||n;
  return HEAD(`Blog | ${sn}`,'最新情報',a.favicon)+NAV(a.logo,sn,'blog')+
  `<section class="page-hero"><h1>ブログ</h1><p>最新情報とインサイト</p></section><section class="sc"><div class="c"><div class="bl">${B.map((p,i)=>`<a href="blog-${i}.html" class="bc rv" style="transition-delay:${i*0.1}s">${a.images[(i+2)%a.images.length]?`<img src="${a.images[(i+2)%a.images.length]}" class="bi" alt="" loading="lazy" onerror="this.style.display='none'">`:''}<span class="cat">${p.cat||p.category}</span><span class="dt" style="margin-left:6px">${p.date}</span><h3>${p.title}</h3><p>${p.excerpt}</p></a>`).join('')}</div></div></section>`+
  FOOT(sn,S.tagline||'',a.logo,a.email,a.phone,c.services||[])+JS()+'</body></html>';
}
function blogPost(post,i,B,a,n,d){
  const sn=n;const prev=i>0?`<a href="blog-${i-1}.html">← 前の記事</a>`:'<span></span>';
  const next=i<B.length-1?`<a href="blog-${i+1}.html">次の記事 →</a>`:'<span></span>';
  return HEAD(`${post.title} | Blog | ${sn}`,post.excerpt||'',a.favicon)+NAV(a.logo,sn,'blog')+
  `<section class="page-hero" style="padding-bottom:40px"><span class="cat" style="display:inline-block;margin-bottom:8px">${post.cat||post.category}</span><span class="dt" style="margin-left:8px">${post.date}</span><h1 style="margin-top:8px">${post.title}</h1></section>`+
  `<section class="sc"><div class="c" style="max-width:780px"><a href="blog.html" class="back-link">← ブログ一覧に戻る</a><div class="rv" style="font-size:16px;line-height:2.4">${(post.body||post.excerpt||'').split('。').filter(Boolean).map(s=>`<p style="margin-bottom:24px">${s}。</p>`).join('')}</div><div class="blog-nav">${prev}${next}</div></div></section>`+
  FOOT(sn,'',a.logo,a.email,a.phone,[])+JS()+'</body></html>';
}
function contact(c,a,n,d){
  const S=c.site||{};const sn=S.name||n;
  return HEAD(`Contact | ${sn}`,'お問い合わせ',a.favicon)+NAV(a.logo,sn,'contact')+
  `<section class="page-hero"><h1>お問い合わせ</h1><p>プロジェクトのご相談・お見積りはこちら</p></section>`+
  `<section class="sc"><div class="c"><div class="fm rv"><input type="text" placeholder="お名前" required><input type="email" placeholder="メールアドレス" required><input type="text" placeholder="会社名"><textarea placeholder="お問い合わせ内容"></textarea><button class="btn btn-p" style="width:100%" onclick="alert('お問い合わせありがとうございます。\\nこれはデモサイトです。')">送信する</button></div></div></section>`+
  FOOT(sn,S.tagline||'',a.logo,a.email,a.phone,c.services||[])+JS()+'</body></html>';
}

// ── Main ──
async function main(){
  const o=pa();if(!o.companyId){console.error('--company-id required');process.exit(1);}
  const r=await twenty.twentyFetch(`/rest/companies/${o.companyId}`);const co=r?.data?.company;
  if(!co){console.error('Not found');process.exit(1);}
  const domain=(co.domainName?.primaryLinkUrl||'').replace('https://',''),name=co.name||domain,slug=domain.replace(/\./g,'-').slice(0,50);
  console.log(`Multi-page Demo: ${name}`);
  let a={images:[],colors:['#1a1a2e','#e94560'],logo:null,ogImage:null,favicon:`https://${domain}/favicon.ico`,email:'',phone:''};
  try{const sr=await fetch(`https://${domain}`,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'P/4'},redirect:'follow'});a=await extractAssets(domain,await sr.text());}catch(e){}
  console.log(`  📸 ${a.images.length} img | logo:${!!a.logo}`);
  console.log('  🤖 DeepSeek...');
  let c={};try{c=JSON.parse(await ds(cp(co,a)));}catch(e){const t=await ds(cp(co,a));const m=t.match(/\{[\s\S]*\}/);c=m?JSON.parse(m[0]):{};}
  const sn=c.site?.name||name;console.log(`  ✨ ${sn}`);
  const PAGES={
    'index.html':index(c,a,name,domain),
    'about.html':about(c,a,name,domain),
    'services.html':services(c,a,name,domain),
    'blog.html':blog(c,a,name,domain),
    'contact.html':contact(c,a,name,domain),
  };
  const B=c.blog||[];
  for(let i=0;i<B.length;i++)PAGES[`blog-${i}.html`]=blogPost(B[i],i,B,a,name,domain);
  const total=Object.values(PAGES).reduce((s,h)=>s+h.length,0);
  console.log(`  🏗 ${Object.keys(PAGES).length} pages (${total.toLocaleString()} bytes)`);
  let home='';
  for(const[f,h]of Object.entries(PAGES)){
    const u=await up(`demos/${slug}/${f}`,h);
    if(f==='index.html')home=u||`https://demo.paradigmjp.com/demos/${slug}/`;
    console.log(`  ${u?'✅':'⚠'} ${f}`);
  }
  await twenty.updateCompany(co.id,{paradigmDemoUrl:{primaryLinkLabel:'デモURL',primaryLinkUrl:home},paradigmNextAction:'デモサイト生成完了'});
  console.log(`  ✅ ${home}`);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
