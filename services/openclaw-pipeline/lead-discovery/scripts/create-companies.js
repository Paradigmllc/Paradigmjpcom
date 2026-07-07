#!/usr/bin/env node
/**
 * lead-discovery/create-companies.js — Register discovered leads in Twenty CRM.
 */

const twenty = require('../lib/twenty-client');

async function createCompaniesFromLeads(leads, { country, industry }) {
  const created = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const domain = lead.domain?.toLowerCase().replace(/^www\./, '') || '';
    if (!domain) {
      skipped.push({ domain: lead.domain || '(unknown)', reason: 'No domain' });
      continue;
    }

    try {
      const existing = await twenty.findCompanyByDomain(domain);
      if (existing) {
        skipped.push({ domain, reason: `Already exists: ${existing.id}` });
        continue;
      }

      const company = await twenty.createCompany({
        name: lead.companyName || domain,
        domain,
        country: lead.country || country,
        industry: lead.industry || industry,
        source: lead.source || 'openclaw_discovery',
      });

      created.push({
        id: company?.id || 'unknown',
        name: lead.companyName || domain,
        domain,
      });
      console.log(`[${i + 1}/${leads.length}] Created: ${lead.companyName || domain}`);

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      errors.push({ domain, error: err.message });
      console.error(`[${i + 1}/${leads.length}] Error: ${domain} — ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { created, skipped, errors };
}

module.exports = { createCompaniesFromLeads };

if (require.main === module) {
  const leads = JSON.parse(process.argv[2] || '[]');
  const country = process.argv[3] || 'JP';
  const industry = process.argv[4] || 'all';
  createCompaniesFromLeads(leads, { country, industry }).then(results => {
    console.log(JSON.stringify(results, null, 2));
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
