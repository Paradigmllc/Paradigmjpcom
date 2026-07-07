#!/usr/bin/env node
/**
 * diagnosis-output/diagnose-batch.js — Complete diagnosis with Supabase persistence.
 *
 * 1. Fetches actual website HTML
 * 2. DeepSeek V4 analyzes and generates 5-act report
 * 3. Saves to Supabase (detected_issues + meta.personalized_copy) — enables report page
 * 4. Updates Twenty CRM with report URL + status
 */

const twenty = require('../lib/twenty-client');

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const SUPABASE_URL = process.env.SALES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SALES_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured');
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return res;
}

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { limit: 5 };
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) { case '--limit': opts.limit = parseInt(v,10); i++; break; case '--company-id': opts.companyId = v; i++; break; }
  }
  return opts;
}

// ── Website Analysis ─────────────────────────────────────────────────

async function analyzeWebsite(domain) {
  const s = { accessible: false, wordpress: false, wpVersion: null, hasViewport: false, hasHttps: false, footerYear: null, title: '', metaDesc: '', hasContactForm: false, issues: [], pageSpeed: null, loadTime: null, html: '', error: null };

  try {
    const start = Date.now();
    const res = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmDiagnostic/1.0)' },
      redirect: 'follow',
    });
    s.accessible = res.ok || res.status < 500;
    s.hasHttps = res.url?.startsWith('https') ?? false;
    s.loadTime = Date.now() - start;
    const html = await res.text();
    s.html = html.slice(0, 15000);

    s.title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || '';
    s.metaDesc = (html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || [])[1]?.trim() || '';
    s.wordpress = /wp-content|wp-includes|wordpress/i.test(html);
    s.wpVersion = (html.match(/WordPress\s*([\d.]+)/i) || [])[1] || null;
    s.hasViewport = /viewport.*width=device-width/i.test(html);
    s.footerYear = parseInt((html.match(/©\s*(\d{4})/i) || [])[1] || '0', 10) || null;
    s.hasContactForm = /<form\b/i.test(html) && /contact|inquiry|問い合わせ/i.test(html);

    const techtStack = [];
    if (/jquery/i.test(html)) techtStack.push('jQuery');
    if (/bootstrap/i.test(html)) techtStack.push('Bootstrap');
    if (/google-analytics|gtag/i.test(html)) techtStack.push('Google Analytics');
    if (/fbq\(|facebook/i.test(html)) techtStack.push('Facebook Pixel');
    s.techStack = techtStack;

  } catch (e) { s.error = e.message; }

  const issues = [];
  if (!s.hasViewport) issues.push('mobile_not_responsive');
  if (s.loadTime && s.loadTime > 5000) issues.push('speed_critical');
  if (!s.metaDesc) issues.push('no_meta_description');
  if (!s.title) issues.push('no_title');
  if (s.wordpress && s.wpVersion && parseFloat(s.wpVersion) < 6.0) issues.push('wordpress_outdated');
  if (!s.hasContactForm) issues.push('no_contact_form');
  if (!s.hasHttps) issues.push('no_ssl');
  if (s.footerYear && s.footerYear < 2024) issues.push('copyright_old');
  s.issues = issues;

  return s;
}

// ── DeepSeek Diagnosis ───────────────────────────────────────────────

function buildPrompt(company, analysis) {
  const name = company.name || '御社';
  const domain = (company.domainName?.primaryLinkUrl || '').replace('https://', '');
  const industry = company.paradigmIndustryName || '';

  const htmlSnippet = analysis.html
    ? analysis.html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2500)
    : '（サイトにアクセスできませんでした）';

  const issues = analysis.issues.join(', ');

  return `あなたはWeb診断の専門家です。実データに基づき5幕構成の診断レポートを作成してください。

【企業】${name}（${domain}）業種: ${industry || '不明'}
【検出課題】${issues || '特になし'}
【実サイト分析】HTTPS:${analysis.hasHttps ? '○' : '✕'} モバイル対応:${analysis.hasViewport ? '○' : '✕'} 読込:${analysis.loadTime ? (analysis.loadTime/1000).toFixed(1)+'秒' : 'N/A'} WordPress:${analysis.wordpress ? 'v'+(analysis.wpVersion||'?') : '-'}
【サイト本文抜粋】${htmlSnippet}

【出力形式 — 以下のJSON形式で厳密に出力すること】
{
  "personalized_hook": "業界データと分析結果に基づくつかみ（200字程度）",
  "personalized_pain": "具体的な問題点の指摘（300字程度）",
  "personalized_fear": "放置した場合の機会損失試算（300字程度）",
  "personalized_loss": "同業他社の成功事例と危機感（200字程度）",
  "personalized_cta": "行動喚起・次のステップ案内（200字程度）"
}

JSONのみを出力してください。説明文は不要です。`;
}

async function diagnose(company, analysis) {
  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: buildPrompt(company, analysis) }], temperature: 0.3, max_tokens: 3000 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  // Fallback: construct from text
  return {
    personalized_hook: text.slice(0, 200),
    personalized_pain: text.slice(200, 500),
    personalized_fear: text.slice(500, 800),
    personalized_loss: text.slice(800, 1000),
    personalized_cta: text.slice(1000, 1200),
  };
}

// ── Save to Supabase ─────────────────────────────────────────────────

async function saveToSupabase(company, analysis, personalized, domain) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`    ⚠ Supabase未設定 — レポートページは表示されません`);
    return null;
  }

  const slug = domain.replace(/\./g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);

  // Find existing by domain
  let companyId = null;
  try {
    const searchRes = await supabaseFetch(`/sales_companies?domain=eq.${encodeURIComponent(domain)}&select=id&limit=1`);
    const data = await searchRes.json();
    companyId = data?.[0]?.id;
  } catch {}

  const row = {
    domain,
    company_name: company.name || domain,
    slug,
    region: 'global',
    report_locale: 'ja',
    pipeline_status: 'report_ready',
    detected_issues: analysis.issues,
    report_generated_at: new Date().toISOString(),
    meta: {
      personalized_copy: {
        ...personalized,
        generated_at: new Date().toISOString(),
        model: 'deepseek-v4-flash',
        issues_detected: analysis.issues,
        website_analysis: {
          hasViewport: analysis.hasViewport, hasHttps: analysis.hasHttps,
          wordpress: analysis.wordpress, wpVersion: analysis.wpVersion,
          loadTime: analysis.loadTime, techStack: analysis.techStack,
        },
      },
      routing: { canonical_slug: slug },
    },
  };

  try {
    if (companyId) {
      await supabaseFetch(`/sales_companies?id=eq.${companyId}`, { method: 'PATCH', body: JSON.stringify(row) });
    } else {
      await supabaseFetch('/sales_companies', { method: 'POST', body: JSON.stringify(row) });
    }
    console.log(`    📄 Supabase保存 — /ja/report/${slug} で表示可能`);
    return slug;
  } catch (e) {
    console.error(`    ⚠ Supabase保存失敗: ${e.message}`);
    return slug;
  }
}

// ── Save to Twenty ───────────────────────────────────────────────────

async function saveToTwenty(companyId, companyName, domain, analysis, slug) {
  const reportUrl = `https://paradigmjp.com/ja/report/${slug}`;
  const issuesSummary = analysis.issues.map(i => i.replace(/_/g, ' ')).join(', ');

  await twenty.updateCompany(companyId, {
    paradigmReportUrl: { primaryLinkLabel: '診断レポートURL', primaryLinkUrl: reportUrl },
    paradigmSalesStatus: 'カルテ生成中 / 未対応',
    paradigmKarteScore: analysis.issues.length >= 3 ? 85 : 65,
    paradigmKarteSummary: { markdown: `# ${companyName} 診断\n\n検出課題: ${issuesSummary}\n\nレポート: ${reportUrl}` },
    paradigmNextAction: 'crm-syncで送信待ちへ',
    paradigmDataStatus: 'send_ready',
  });
  console.log(`    ✅ Twenty updated — ${reportUrl}`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  if (!DEEPSEEK_KEY) { console.error('DEEPSEEK_API_KEY required'); process.exit(1); }

  let companies;
  if (opts.companyId) {
    const r = await twenty.twentyFetch(`/rest/companies/${opts.companyId}`);
    companies = [r?.data?.company].filter(Boolean);
  } else {
    const all = await twenty.listCompanies({ limit: opts.limit * 3 });
    companies = all.filter(c => !c.paradigmReportUrl?.primaryLinkUrl).slice(0, opts.limit);
  }

  if (companies.length === 0) { console.log('全企業診断済みです'); return; }

  console.log(`${companies.length}件のWebサイトを実分析しDeepSeekで診断します...\n`);
  const results = [];

  for (let i = 0; i < companies.length; i++) {
    const co = companies[i];
    const domain = (co.domainName?.primaryLinkUrl || '').replace('https://', '');
    console.log(`[${i+1}/${companies.length}] ${co.name}`);

    try {
      console.log(`  🔍 サイト分析中...`);
      const analysis = await analyzeWebsite(domain);

      console.log(`  🤖 DeepSeek診断中...`);
      const personalized = await diagnose(co, analysis);

      const slug = await saveToSupabase(co, analysis, personalized, domain);
      await saveToTwenty(co.id, co.name, domain, analysis, slug || domain);

      results.push({ success: true, company: co.name, domain, issues: analysis.issues.length, reportUrl: `https://paradigmjp.com/ja/report/${slug || domain}` });
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      await twenty.updateCompany(co.id, { paradigmSalesStatus: '手動確認 / 未対応', paradigmLastError: e.message.slice(0, 200) }).catch(() => {});
      results.push({ success: false, company: co.name, domain, error: e.message });
    }
  }

  const ok = results.filter(r => r.success).length;
  const totalIssues = results.reduce((s, r) => s + (r.issues || 0), 0);
  console.log(`\n=== 診断完了: ${ok}/${results.length}成功 | ${totalIssues}件の課題を検出 ===`);
  if (ok > 0) console.log(`レポートURL: ${results.filter(r=>r.success).map(r=>r.reportUrl).join(', ')}`);

  return results;
}

module.exports = { main, analyzeWebsite, diagnose, saveToSupabase };

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
