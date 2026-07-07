#!/usr/bin/env node
/**
 * outreach-exec/record-outcome.js — Record outreach result in Twenty CRM.
 *
 * Usage:
 *   node record-outcome.js --company-id <ID> --outcome success
 *   node record-outcome.js --company-id <ID> --outcome failure --error "CAPTCHA detected"
 *   node record-outcome.js --company-id <ID> --outcome success --form-url "https://..."
 */

const twenty = require('../lib/twenty-client');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--company-id': opts.companyId = val; i++; break;
      case '--outcome': opts.outcome = val; i++; break;
      case '--error': opts.error = val; i++; break;
      case '--form-url': opts.formUrl = val; i++; break;
      case '--domain': opts.domain = val; i++; break;
    }
  }
  if (!opts.companyId) {
    console.error('--company-id is required');
    process.exit(1);
  }
  if (!opts.outcome) {
    console.error('--outcome is required (success | failure | captcha | blocked)');
    process.exit(1);
  }
  return opts;
}

const CIRCUIT_STATE_FILE = '/tmp/openclaw-circuit-breaker.json';

function readCircuitState() {
  try {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(CIRCUIT_STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCircuitState(state) {
  const fs = require('fs');
  fs.writeFileSync(CIRCUIT_STATE_FILE, JSON.stringify(state, null, 2));
}

function updateCircuitBreaker(domain, outcome) {
  const state = readCircuitState();
  const entry = state[domain] || { failures: 0, lastFailure: null, open: false };

  if (outcome === 'success') {
    entry.failures = 0;
    entry.open = false;
  } else {
    entry.failures++;
    entry.lastFailure = new Date().toISOString();
    if (entry.failures >= 3) {
      entry.open = true;
      console.warn(`Circuit OPEN for ${domain}: ${entry.failures} consecutive failures`);
    }
  }

  state[domain] = entry;
  writeCircuitState(state);
  return entry;
}

async function recordOutcome(opts) {
  const fields = {};
  let status;
  let nextAction;

  switch (opts.outcome) {
    case 'success':
      status = twenty.SALES_STATUSES.SENT;
      nextAction = '返信待ち（3日後フォロー）';
      break;
    case 'failure':
      status = twenty.SALES_STATUSES.MANUAL_REVIEW;
      nextAction = 'フォーム送信失敗 — 手動確認';
      fields.paradigmLastError = opts.error || 'Form submission failed';
      break;
    case 'captcha':
      status = twenty.SALES_STATUSES.MANUAL_REVIEW;
      nextAction = 'CAPTCHA検出 — 代替手段を検討';
      fields.paradigmLastError = 'CAPTCHA detected on form';
      break;
    case 'blocked':
      status = twenty.SALES_STATUSES.MANUAL_REVIEW;
      nextAction = 'robots.txt制限 — メール等の代替手段を検討';
      fields.paradigmLastError = 'Blocked by robots.txt or bot detection';
      break;
    default:
      status = twenty.SALES_STATUSES.MANUAL_REVIEW;
      nextAction = '手動確認';
  }

  fields.paradigmSalesStatus = status;
  fields.paradigmNextAction = nextAction;

  if (opts.formUrl) {
    fields.paradigmFormUrl = {
      primaryLinkLabel: 'フォームURL',
      primaryLinkUrl: opts.formUrl,
    };
  }

  console.log(`Recording outcome: ${opts.outcome} → ${status}`);
  const result = await twenty.updateCompany(opts.companyId, fields);

  if (opts.domain) {
    const circuit = updateCircuitBreaker(opts.domain, opts.outcome);
    console.log(`Circuit breaker [${opts.domain}]: failures=${circuit.failures} open=${circuit.open}`);
  }

  return result;
}

module.exports = { recordOutcome, updateCircuitBreaker };

if (require.main === module) {
  const opts = parseArgs();
  recordOutcome(opts).then(result => {
    console.log('Recorded:', JSON.stringify({
      companyId: opts.companyId,
      outcome: opts.outcome,
    }));
  }).catch(err => {
    console.error('Record failed:', err.message);
    process.exit(1);
  });
}
