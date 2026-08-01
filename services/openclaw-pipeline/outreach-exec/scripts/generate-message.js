#!/usr/bin/env node
/**
 * outreach-exec/generate-message.js — Generate outreach message from Twenty diagnosis data.
 *
 * Usage:
 *   node generate-message.js --company-id <TWENTY_ID>
 */

const twenty = require('../lib/twenty-client');

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--company-id': opts.companyId = v; i++; break;
      case '--domain': opts.domain = v; i++; break;
    }
  }
  return opts;
}

function buildMessage(company) {
  const name = company.name || '御社';
  const domain = company.domainName?.primaryLinkUrl || '';
  const reportUrl = company.paradigmReportUrl?.primaryLinkUrl || '';
  const demoUrl = company.paradigmDemoUrl?.primaryLinkUrl || '';
  const karteSummary = typeof company.paradigmKarteSummary === 'object' ? company.paradigmKarteSummary?.markdown :
                       typeof company.paradigmKarteSummary === 'string' ? company.paradigmKarteSummary : '';

  // Extract first 1-2 sentences from karte summary for the message
  const summarySnippet = karteSummary
    ? karteSummary.replace(/^#.*$/gm, '').replace(/\*\*/g, '').slice(0, 300).trim()
    : '';

  const subject = `【${name}様専用】Webサイト無料診断レポートのご案内`;

  const body = `${name}様

Paradigmと申します。御社のWebサイトを拝見し、無料診断レポートを作成いたしました。

▼ 御社専用 診断レポート
${reportUrl}

${summarySnippet ? `【診断サマリー】\n${summarySnippet}\n` : ''}
${demoUrl ? `▼ 御社専用デモサイト\n${demoUrl}\n` : ''}
ご興味がございましたら、本フォームの返信にてお気軽にお問い合わせください。

何卒よろしくお願いいたします。
Paradigm合同会社
https://paradigmjp.com`;

  return { subject, body };
}

async function main() {
  const opts = parseArgs();
  if (!opts.companyId) { console.error('--company-id required'); process.exit(1); }

  const result = await twenty.twentyFetch(`/rest/companies/${opts.companyId}`);
  const company = result?.data?.company;
  if (!company) { console.error('Company not found'); process.exit(1); }

  const message = buildMessage(company);
  console.log(JSON.stringify(message, null, 2));
}

module.exports = { buildMessage };

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
