#!/usr/bin/env node
/**
 * Pipeline health check — verifies all 4 stages are operational.
 *
 * Usage: node health-check.js
 */

const twenty = require('../lib/twenty-client.js');
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

async function check(label, fn) {
  try { await fn(); return { label, status: 'ok' }; }
  catch (e) { return { label, status: 'fail', error: e.message }; }
}

async function main() {
  console.log('Pipeline Health Check\n');

  const results = await Promise.all([
    check('Twenty API', async () => { const c = await twenty.listCompanies({limit:1}); if (!Array.isArray(c)) throw new Error('not array'); }),
    check('DeepSeek API', async () => {
      if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not set');
      const r = await fetch('https://api.deepseek.com/v1/models', { headers: { Authorization: `Bearer ${DEEPSEEK_KEY}` }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    check('Tranco Top-1M', async () => {
      const r = await fetch('https://tranco-list.eu/top-1m.csv.zip', { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    check('CommonCrawl', async () => {
      const r = await fetch('https://index.commoncrawl.org/collinfo.json', { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    }),
    check('Pipeline scripts', async () => {
      const fs = require('fs');
      const scripts = ['pipeline.js', '../../diagnosis-output/scripts/diagnose-batch.js', '../../crm-sync/scripts/sync-status.js', '../../outreach-exec/scripts/outreach-batch.js'];
      for (const s of scripts) {
        const exists = fs.existsSync(`${__dirname}/${s}`);
        if (!exists) throw new Error(`Missing: ${s}`);
      }
    }),
  ]);

  let ok = 0, fail = 0;
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : '❌';
    console.log(`${icon} ${r.label}${r.error ? ': ' + r.error : ''}`);
    if (r.status === 'ok') ok++; else fail++;
  }

  console.log(`\n${ok}/${results.length} checks passed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
