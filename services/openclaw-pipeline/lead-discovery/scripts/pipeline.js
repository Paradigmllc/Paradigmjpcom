#!/usr/bin/env node
/**
 * Enhanced 3-Stage Pipeline with content-based industry classification.
 * Stage 2 now analyzes real website content to verify industry match.
 */

const twenty = require('../lib/twenty-client');
const crtsh = require('./sources/crtsh');
const commoncrawl = require('./sources/commoncrawl');
const tranco = require('./sources/tranco');
const wappalyzer = require('./sources/wappalyzer');
const enterpriseFilter = require('./sources/enterprise-filter');
const industryFilter = require('./sources/industry-filter');
const classifier = require('./sources/content-classifier');

const TLD_PATTERNS = {
  JP: ['%.jp', '%.co.jp', '%.or.jp', '%.ne.jp', '%.com'],
  US: ['%.us', '%.com', '%.net', '%.org'],
  GB: ['%.uk', '%.co.uk', '%.org.uk', '%.me.uk', '%.com'],
  AU: ['%.au', '%.com.au', '%.net.au', '%.org.au'],
  CA: ['%.ca', '%.com'],
  DE: ['%.de', '%.com'],
  ALL: ['%.com', '%.net', '%.org', '%.io', '%.co'],
};

const ENTERPRISE_KEYWORDS = ['microsoft','google','apple','amazon','facebook','meta','netflix','tesla','shopify','salesforce','oracle','ibm','sap','adobe','cisco','intel','dell','hp','samsung','sony','toshiba','hitachi','nintendo','wikipedia','github','stackoverflow','reddit','twitter','paypal','stripe','square','airbnb','uber','lyft','doordash'];
const SIGNAL_KEYWORDS = ['parked','forsale','domain for sale','buy this domain','under construction','sedo parking'];

function parseArgs() {
  const a=process.argv.slice(2);
  const o={country:'US',industry:'all',limit:5,minScore:55,concurrency:24};
  for(let i=0;i<a.length;i++){const v=a[i+1];switch(a[i]){case'--country':o.country=v?.toUpperCase();i++;break;case'--industry':o.industry=v;i++;break;case'--limit':o.limit=parseInt(v,10);i++;break;case'--min-score':o.minScore=parseInt(v,10);i++;break;case'--concurrency':o.concurrency=parseInt(v,10);i++;break;}}
  return o;
}

function ccPattern(p){return p.replace(/^%\./,'*.').replace(/^%/,'*');}

// ── Stage 1 ─────────────────────────────────────────────────────────

async function stage1(country, limit, industry) {
  const patterns = TLD_PATTERNS[country]||TLD_PATTERNS.ALL;
  console.log(`Stage 1: ${patterns.length} patterns, limit ${limit}`);
  const allDomains = new Set();
  const ps = Math.ceil(limit/2);
  // Tranco .com for all countries (most populated TLD)
  try{const t=await tranco.fetchTrancoTopDomains('.com',ps*40);t.domains.forEach(d=>allDomains.add(d));console.log(`  Tranco .com: ${t.domains.length} domains`);}catch(e){console.error('  Tranco:',e.message);}
  // CommonCrawl per pattern
  for(const p of patterns.slice(0,3)){if(allDomains.size>=limit*3)break;try{const c=await commoncrawl.fetchCommonCrawlDomains(ccPattern(p),ps);c.domains.forEach(d=>allDomains.add(d));console.log(`  CC ${ccPattern(p)}: ${c.domains.length}`);}catch(e){}}
  const domains=[...allDomains].sort();
  const filtered=domains.filter(d=>{const l=d.toLowerCase();if(enterpriseFilter.isMajorPlatform(l))return false;if(ENTERPRISE_KEYWORDS.some(k=>l.includes(k)))return false;if(SIGNAL_KEYWORDS.some(k=>l.includes(k)))return false;if(/^[0-9]/.test(d)||/^[a-z0-9]--/.test(d))return false;return true;});
  const indFiltered=industryFilter.filterByIndustry(filtered,industry);
  console.log(`Stage 1: ${domains.length}→${filtered.length}→${indFiltered.length} (industry: ${industry})`);
  for(let i=indFiltered.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indFiltered[i],indFiltered[j]]=[indFiltered[j],indFiltered[i]];}
  return indFiltered.slice(0,limit);
}

// ── Stage 2: HTTP Scan + Content Classification ─────────────────────

async function scanDomain(domain) {
  try {
    const s=Date.now();
    const res=await fetch(`https://${domain}`,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (compatible; ParadigmBot/1.0)'},redirect:'follow'});
    const html=await res.text().catch(()=>'');
    return {
      ok:true,domain,html:html.slice(0,15000),
      wordpress:/wp-content|wp-includes|wordpress/i.test(html),
      wpVersion:(html.match(/WordPress\s*([\d.]+)/i)||[])[1]||null,
      hasViewport:/viewport.*width=device-width/i.test(html),
      hasHttps:res.url?.startsWith('https')??false,
      footerYear:parseInt((html.match(/©\s*(\d{4})/i)||[])[1]||'0',10)||null,
      loadTime:Date.now()-s,httpStatus:res.status,
      title:(html.match(/<title[^>]*>([^<]+)<\/title>/i)||[])[1]?.trim()||'',
      metaDesc:(html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)||[])[1]?.trim()||'',
    };
  }catch(e){return{ok:false,domain,error:e.message};}
}

function scoreDomain(scan){
  let s=50;
  if(scan.wordpress&&scan.wpVersion&&parseFloat(scan.wpVersion)<6.0)s+=12;
  if(!scan.hasViewport)s+=8;
  if(!scan.hasHttps)s+=5;
  if(scan.footerYear&&scan.footerYear<2024)s+=8;
  if(scan.loadTime>5000)s+=5;
  if(!scan.metaDesc)s+=5;
  if(!scan.ok)s=Math.max(s-30,5);
  return Math.min(100,s);
}

async function stage2(domains, industry, minScore, concurrency) {
  console.log(`Stage 2: ${domains.length} domains, ${concurrency} concurrent`);
  const results=[];
  for(let i=0;i<domains.length&&results.length<300;i+=concurrency){
    const batch=domains.slice(i,i+concurrency);
    const scans=await Promise.all(batch.map(d=>scanDomain(d).catch(()=>({ok:false}))));
    for(let j=0;j<batch.length;j++){
      const scan=scans[j];
      if(!scan.ok)continue;
      const score=scoreDomain(scan);
      if(score<minScore)continue;

      // Content-based industry classification
      let classifiedIndustry = industry;
      if(industry==='all'&&scan.html){
        const cls=classifier.classifyContent(scan.html,batch[j]);
        if(cls.industry&&cls.confidence>0.3) classifiedIndustry=cls.industry;
      }

      results.push({
        domain:batch[j],score,
        classifiedIndustry,
        websiteState:scan.wordpress?'wordpress':'modern',
        techStack:scan.wordpress?['WordPress']:[],
        html:scan.html,title:scan.title,metaDesc:scan.metaDesc,
        hasViewport:scan.hasViewport,hasHttps:scan.hasHttps,
        loadTime:scan.loadTime,wordpress:scan.wordpress,
      });
    }
    if(i>0&&i%50===0)console.log(`  ${Math.min(i,domains.length)}/${domains.length}, ${results.length} qualified`);
  }
  console.log(`Stage 2: ${results.length} qualified (score>${minScore})`);
  return results;
}

// ── Stage 3: Wappalyzer + Register ──────────────────────────────────

async function stage3(candidates, opts) {
  const top=candidates.sort((a,b)=>b.score-a.score).slice(0,100);
  console.log(`Stage 3: Wappalyzer analysis on ${top.length}`);
  const leads=[];
  for(const c of top){
    try{
      if(c.html&&c.html.length>100){
        const tech=wappalyzer.detectTechFromEvidence({html:c.html,headers:'',cookies:''});
        const techNames=tech.map(t=>t.name);
        const ent=enterpriseFilter.isEnterpriseTechStack(techNames);
        if(!ent.isEnterprise){c.techStack=techNames;leads.push(c);}
      }else{leads.push(c);}
    }catch(e){leads.push(c);}
  }
  console.log(`Stage 3: ${leads.length} SMB leads`);

  const final=leads.slice(0,opts.limit);
  console.log(`Registering ${final.length} in Twenty...`);
  const created=[];
  for(let i=0;i<final.length;i++){
    const c=final[i];
    try{
      const existing=await twenty.findCompanyByDomain(c.domain);
      if(existing){continue;}
      const name=c.domain.split('.')[0].replace(/[-_]/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
      const co=await twenty.createCompany({name,domain:c.domain,country:opts.country,industry:c.classifiedIndustry||opts.industry});
      created.push({id:co?.id,name,domain:c.domain,score:c.score,industry:c.classifiedIndustry||opts.industry});
      console.log(`  [${i+1}/${final.length}] ✅ ${name} (${c.domain}) score:${c.score} industry:${c.classifiedIndustry||opts.industry}`);
      await new Promise(r=>setTimeout(r,200));
    }catch(e){console.error(`  ❌ ${c.domain}: ${e.message}`);}
  }
  return created;
}

async function main(){
  const opts=parseArgs();
  const start=Date.now();
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  Enhanced Pipeline ${opts.country} ${(opts.industry||'').padEnd(10)} ${opts.limit}件  ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  const domains=await stage1(opts.country,opts.limit*4,opts.industry);
  if(!domains.length){console.log('❌ No domains');return;}

  const candidates=await stage2(domains,opts.industry,opts.minScore,opts.concurrency);
  if(!candidates.length){console.log('❌ No candidates');return;}

  const created=await stage3(candidates,opts);
  const elapsed=((Date.now()-start)/1000).toFixed(0);
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  ✅ Pipeline Complete (${elapsed}s)          ║`);
  console.log(`║  Discovered:${String(domains.length).padStart(5)} → Candidates:${String(candidates.length).padStart(4)}    ║`);
  console.log(`║  Registered: ${created.length} in Twenty         ║`);
  console.log(`╚══════════════════════════════════════╝`);
}

main().catch(e=>{console.error(e.message);process.exit(1);});
