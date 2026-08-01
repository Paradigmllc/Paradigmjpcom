#!/usr/bin/env node
/**
 * crm-sync/sync-status.js — Update company pipeline status in Twenty CRM.
 *
 * Usage:
 *   node sync-status.js --company-id <ID> --status "送信待ち / 未対応"
 *   node sync-status.js --status "送信待ち / 未対応" --batch
 */

const twenty = require('../lib/twenty-client');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { batch: false };
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--company-id': opts.companyId = val; i++; break;
      case '--status': opts.status = val; i++; break;
      case '--batch': opts.batch = true; break;
      case '--artifact-urls': try { opts.artifactUrls = JSON.parse(val); } catch {} i++; break;
      case '--next-action': opts.nextAction = val; i++; break;
      case '--limit': opts.limit = parseInt(val, 10); i++; break;
    }
  }
  if (!opts.status && !opts.batch && !opts.companyId) {
    opts.status = '送信待ち / 未対応';
  }
  return opts;
}

function buildFields(status, { artifactUrls, nextAction }) {
  const fields = { paradigmSalesStatus: status };

  if (artifactUrls?.report) {
    fields.paradigmReportUrl = {
      primaryLinkLabel: '診断レポートURL',
      primaryLinkUrl: artifactUrls.report,
    };
  }
  if (artifactUrls?.demo) {
    fields.paradigmDemoUrl = {
      primaryLinkLabel: 'デモURL',
      primaryLinkUrl: artifactUrls.demo,
    };
  }
  if (artifactUrls?.material) {
    fields.paradigmSalesMaterialUrl = {
      primaryLinkLabel: '営業資料URL',
      primaryLinkUrl: artifactUrls.material,
    };
  }
  if (nextAction) {
    fields.paradigmNextAction = nextAction;
  }

  return fields;
}

async function syncSingle(companyId, fields) {
  console.log(`Syncing company ${companyId} → status=${fields.paradigmSalesStatus}`);
  const result = await twenty.updateCompany(companyId, fields);
  console.log(`  OK: ${companyId}`);
  return result;
}

async function syncBatch(fields, limit = 50) {
  // Fetch all and filter client-side (Twenty API filter unreliable for SELECT fields)
  const all = await twenty.listCompanies({ limit: limit * 5 });

  // Find companies being diagnosed → transition to outreach-ready
  const diagnosing = all.filter(c => c.paradigmSalesStatus === 'カルテ生成中 / 未対応').slice(0, limit);
  let synced = 0;

  for (const lead of diagnosing) {
    try {
      await twenty.updateCompany(lead.id, {
        paradigmSalesStatus: '送信待ち / 未対応',
        paradigmNextAction: 'アウトリーチ実行待ち',
        paradigmDataStatus: 'send_ready',
      });
      synced++;
      console.log(`[${synced}/${diagnosing.length}] ✅ ${lead.name} → 送信待ち / 未対応`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  ❌ ${lead.name}: ${err.message}`);
    }
  }

  console.log(`${synced} companies transitioned to outreach-ready`);

  return synced;
}

async function main() {
  const opts = parseArgs();
  const fields = buildFields(opts.status, opts);

  if (opts.batch) {
    console.log(`Batch sync: status=${opts.status}, limit=${opts.limit || 50}`);
    const count = await syncBatch(fields, opts.limit || 50);
    console.log(`Done: ${count} companies synced`);
  } else if (opts.companyId) {
    await syncSingle(opts.companyId, fields);
  } else {
    console.error('Either --company-id or --batch is required');
    process.exit(1);
  }
}

module.exports = { syncSingle, syncBatch };

if (require.main === module) {
  main().catch(err => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
}
