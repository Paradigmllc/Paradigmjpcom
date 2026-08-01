#!/usr/bin/env node
/**
 * diagnosis-output/save-artifacts.js — Save diagnostic artifacts to Twenty CRM.
 *
 * Usage:
 *   node save-artifacts.js --company-id <ID> --report-url <URL> --demo-url <URL>
 *   node save-artifacts.js --company-id <ID> --report-url <URL>
 */

const twenty = require('../lib/twenty-client');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const val = args[i + 1];
    switch (args[i]) {
      case '--company-id': opts.companyId = val; i++; break;
      case '--report-url': opts.reportUrl = val; i++; break;
      case '--demo-url': opts.demoUrl = val; i++; break;
      case '--material-url': opts.materialUrl = val; i++; break;
      case '--karte-score': opts.karteScore = parseInt(val, 10); i++; break;
    }
  }
  return opts;
}

async function saveArtifacts({ companyId, reportUrl, demoUrl, materialUrl, karteScore }) {
  if (!companyId) throw new Error('companyId is required');

  const fields = {};

  if (reportUrl) {
    fields.paradigmReportUrl = {
      primaryLinkLabel: '診断レポートURL',
      primaryLinkUrl: reportUrl,
    };
  }
  if (demoUrl) {
    fields.paradigmDemoUrl = {
      primaryLinkLabel: 'デモURL',
      primaryLinkUrl: demoUrl,
    };
  }
  if (materialUrl) {
    fields.paradigmSalesMaterialUrl = {
      primaryLinkLabel: '営業資料URL',
      primaryLinkUrl: materialUrl,
    };
  }

  if (karteScore !== undefined) {
    fields.paradigmKarteScore = karteScore;
  }

  fields.paradigmSalesStatus = twenty.SALES_STATUSES.DIAGNOSING;
  fields.paradigmDataStatus = 'send_ready';
  fields.paradigmNextAction = 'crm-syncによるステータス更新待ち';

  console.log(`Updating company ${companyId}...`);
  const result = await twenty.updateCompany(companyId, fields);
  console.log('Updated:', JSON.stringify({
    id: companyId,
    reportUrl,
    demoUrl,
    materialUrl,
    karteScore,
  }));

  return result;
}

module.exports = { saveArtifacts };

if (require.main === module) {
  const opts = parseArgs();
  if (!opts.companyId) {
    console.error('--company-id is required');
    process.exit(1);
  }
  saveArtifacts(opts).catch(err => {
    console.error('Save failed:', err.message);
    process.exit(1);
  });
}
