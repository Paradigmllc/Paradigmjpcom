#!/usr/bin/env node
/**
 * diagnosis-output/diagnose.js — DeepSeek V4 diagnostic report generator.
 *
 * Usage:
 *   node diagnose.js --company-id <TWENTY_COMPANY_ID>
 *   node diagnose.js --domain example.com --company-name "Example Inc" --industry restaurant --country JP
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';

if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY is required');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--company-id': opts.companyId = val; i++; break;
      case '--domain': opts.domain = val; i++; break;
      case '--company-name': opts.companyName = val; i++; break;
      case '--industry': opts.industry = val; i++; break;
      case '--country': opts.country = val; i++; break;
      case '--locale': opts.locale = val; i++; break;
    }
  }
  return opts;
}

function buildDiagnosisPrompt({ companyName, domain, industry, country, locale }) {
  const lang = (locale || country) === 'JP' ? 'ja' : 'en';
  const industryJa = {
    restaurant: '飲食店', clinic: 'クリニック・病院', law_firm: '法律事務所',
    construction: '建設業', retail: '小売業', salon: '美容室・サロン',
    real_estate: '不動産', accounting: '会計事務所', education: '教育',
    it: 'IT・システム開発', manufacturing: '製造業', logistics: '物流',
  };

  if (lang === 'ja') {
    return `あなたは中小企業向けのWeb診断の専門家です。以下の企業のWebサイトを分析し、5幕構成の診断レポートを日本語で作成してください。

【企業情報】
- 企業名: ${companyName}
- ドメイン: ${domain}
- 業種: ${industryJa[industry] || industry}
- 対象国: ${country}

【5幕構成】
1. つかみ（Hook）: 業界の現状データを用いて「御社に足りないもの」を気づかせる
2. 痛み（Pain）: Webサイトの具体的な問題点を指摘（例：モバイル非対応、表示速度、SEO不足、問い合わせ導線欠如）
3. 恐怖（Fear）: 放置した場合の機会損失試算（「年間◯万円の売上機会を逃しています」）
4. 損失（Loss）: 同業他社のDX成功事例・具体的数字
5. 行動喚起（CTA）: 「まずは無料で御社専用のデモサイトを見てみませんか？」

【制約】
- 捏造禁止。実際のWebサイト分析に基づくこと
- 具体的な数字を盛り込む（「表示速度◯秒」「問い合わせフォーム未設置」など）
- 感情に訴えかける表現（恐怖→救済の流れ）
- マークダウン形式で出力
- total: 2000〜3000文字

診断レポートを作成してください。`;
  }

  return `You are a web diagnostic specialist for small businesses. Create a 5-act diagnostic report.

Company: ${companyName}
Domain: ${domain}
Industry: ${industry}
Country: ${country}

5-Act Structure:
1. Hook: Industry data revealing what they're missing
2. Pain: Specific website issues (mobile, speed, SEO, conversion)
3. Fear: Opportunity cost if ignored ($X/month lost)
4. Loss: Competitor DX success stories with numbers
5. CTA: "See your free custom demo site now"

Constraints: No fabrication. Based on actual analysis. Specific numbers. Emotional arc. Markdown. 2000-3000 chars.`;
}

async function callDeepSeek(prompt) {
  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function main() {
  const opts = parseArgs();
  if (!opts.companyName && !opts.domain) {
    console.error('--company-name and --domain are required (or use --company-id with Twenty)');
    process.exit(1);
  }

  console.log(`Diagnosing: ${opts.companyName} (${opts.domain})`);
  console.log(`Industry: ${opts.industry}, Country: ${opts.country}`);

  const prompt = buildDiagnosisPrompt(opts);
  console.log('Calling DeepSeek V4...');

  const report = await callDeepSeek(prompt);
  console.log('\n=== DIAGNOSTIC REPORT ===\n');
  console.log(report);
  console.log('\n=== END REPORT ===');

  return { report, company: opts };
}

module.exports = { buildDiagnosisPrompt, callDeepSeek, main };

if (require.main === module) {
  main().catch(err => {
    console.error('Diagnosis failed:', err.message);
    process.exit(1);
  });
}
