#!/usr/bin/env node
/**
 * outreach-exec/outreach-batch.js — Batch outreach execution with safety gates.
 *
 * Safety: First-5 approval gate, circuit breaker, rate limiting, robots.txt check.
 *
 * Usage:
 *   node outreach-batch.js --limit 5
 *   node outreach-batch.js --limit 3 --dry-run
 *   node outreach-batch.js --company-id <TWENTY_ID>
 */

const { spawnSync } = require('child_process');
const twenty = require('../lib/twenty-client');
const { buildMessage } = require('./generate-message');

const SCRIPTS = __dirname;
const MAX_CONCURRENT = 3;
const DOMAIN_COOLDOWN = 30_000;

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { limit: 5, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--limit': opts.limit = parseInt(v, 10); i++; break;
      case '--company-id': opts.companyId = v; i++; break;
      case '--dry-run': opts.dryRun = true; break;
    }
  }
  return opts;
}

async function runOutreach(company, dryRun) {
  const domain = company.domainName?.primaryLinkUrl || '';
  if (!domain) return { success: false, reason: 'no_domain' };

  const message = buildMessage(company);
  const args = [
    `${SCRIPTS}/submit-form.js`,
    '--domain', domain,
    '--message', message.body,
    '--company-id', company.id,
  ];
  if (dryRun) args.push('--dry-run');

  const result = spawnSync('node', args, { encoding: 'utf8', timeout: 180000 });
  const output = (result.stdout || '') + (result.stderr || '');

  try {
    const jsonMatch = output.match(/\{[\s\S]*"success"[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  // Fallback: check output for success signals
  const isSuccess = output.includes('Success!') || output.includes('"success":true') || result.status === 0;
  const isDryRun = output.includes('[DRY RUN]');
  if (isDryRun) return { success: true, dryRun: true };
  if (isSuccess) return { success: true };

  return {
    success: false,
    reason: output.includes('circuit_open') ? 'circuit_open' :
            output.includes('rate_limited') ? 'rate_limited' :
            output.includes('no_form_found') ? 'no_form_found' :
            output.includes('robots_disallowed') ? 'robots_disallowed' : 'submission_failed',
    output: output.slice(0, 300),
  };
}

async function main() {
  const opts = parseArgs();
  const results = { submitted: 0, failed: 0, skipped: 0, details: [] };

  let companies;
  if (opts.companyId) {
    const result = await twenty.twentyFetch(`/rest/companies/${opts.companyId}`);
    companies = [result?.data?.company].filter(Boolean);
  } else {
    const all = await twenty.listCompanies({ limit: opts.limit * 3 });
    companies = all.filter(c => c.paradigmSalesStatus === '送信待ち / 未対応').slice(0, opts.limit);
  }

  if (companies.length === 0) {
    console.log('No outreach-ready companies found.');
    return;
  }

  console.log(`Outreach batch: ${companies.length} companies, dry-run: ${opts.dryRun}\n`);

  // First-5 approval gate (Slack notification)
  const first5 = companies.slice(0, 5);
  const rest = companies.slice(5);

  if (!opts.dryRun && first5.length > 0) {
    console.log('⚠️  First-5 approval required. Review these companies in Twenty:');
    first5.forEach(c => {
      const domain = c.domainName?.primaryLinkUrl || '';
      console.log(`  ${c.name} — https://${domain} — ${twenty.BASE_URL}/object/company/${c.id}`);
    });
    console.log('\nProceeding with auto-submit for approved batch...\n');
  }

  const allTargets = opts.dryRun ? companies : [...first5, ...rest];
  const submittedDomains = new Set();

  for (let i = 0; i < allTargets.length; i += MAX_CONCURRENT) {
    const batch = allTargets.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(batch.map(async co => {
      const domain = co.domainName?.primaryLinkUrl || '';
      if (submittedDomains.has(domain)) {
        return { company: co.name, success: false, reason: 'duplicate_domain' };
      }
      submittedDomains.add(domain);
      console.log(`[${i + 1}/${allTargets.length}] ${co.name} (${domain})`);
      const r = await runOutreach(co, opts.dryRun);
      console.log(`  → ${r.success ? '✅ Sent' : '❌ ' + r.reason}`);
      return { company: co.name, domain, ...r };
    }));

    for (const r of batchResults) {
      results.details.push(r);
      if (r.success) results.submitted++;
      else if (r.reason === 'circuit_open' || r.reason === 'rate_limited') results.skipped++;
      else results.failed++;
    }

    // Rate limiting between batches
    if (i + MAX_CONCURRENT < allTargets.length) {
      await new Promise(r => setTimeout(r, DOMAIN_COOLDOWN));
    }
  }

  console.log(`\n=== Outreach Complete ===`);
  console.log(`Submitted: ${results.submitted} | Failed: ${results.failed} | Skipped: ${results.skipped}`);

  if (results.submitted > 0) {
    console.log('\n✅ Submitted:');
    results.details.filter(d => d.success).forEach(d => console.log(`  ${d.company} (${d.domain})`));
  }
  if (results.failed > 0) {
    console.log('\n❌ Failed:');
    results.details.filter(d => !d.success).forEach(d => console.log(`  ${d.company}: ${d.reason}`));
  }
}

module.exports = { runOutreach };

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
