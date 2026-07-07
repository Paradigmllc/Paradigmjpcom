const WHOXY_API_KEY = process.env.WHOXY_API_KEY;

async function queryWhoxy(domain) {
  if (!WHOXY_API_KEY) return { ok: false, domain, source: 'whoxy', error: 'WHOXY_API_KEY not set' };
  const url = `https://api.whoxy.com/${WHOXY_API_KEY}/whois/${encodeURIComponent(domain)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return { ok: false, domain, source: 'whoxy', error: `HTTP ${res.status}` };
  const data = await res.json();
  if (data.status !== 1) return { ok: false, domain, source: 'whoxy', error: 'status != 1' };
  return {
    ok: true,
    domain,
    companyName: data.company_name || null,
    countryCode: data.country_name || null,
    registrantEmail: data.registrant_contact?.email_address || null,
    registrar: data.registrar_name || null,
    createdDate: data.create_date || null,
    source: 'whoxy',
  };
}

async function collect({ country, industry, limit = 20 }) {
  const domains = generateSeedDomains(country, industry, limit);
  const results = [];
  for (const domain of domains) {
    const r = await queryWhoxy(domain);
    if (r.ok && r.companyName) {
      results.push({
        domain: r.domain,
        companyName: r.companyName,
        country: r.countryCode || country,
        industry,
        source: 'whoxy',
        meta: { registrantEmail: r.registrantEmail, registrar: r.registrar, createdDate: r.createdDate },
      });
    }
    await new Promise(r => setTimeout(r, 1100));
  }
  return results.slice(0, limit);
}

function generateSeedDomains(country, industry, limit) {
  const tldMap = { JP: '.jp', US: '.com', GB: '.co.uk', AU: '.com.au', CA: '.ca', DE: '.de' };
  const tld = tldMap[country] || '.com';
  const kwMap = {
    restaurant: ['sushi', 'ramen', 'pizza', 'cafe', 'diner', 'bistro', 'grill', 'eatery'],
    clinic: ['clinic', 'dental', 'medical', 'health', 'hospital', 'doctor', 'care', 'pharmacy'],
    construction: ['build', 'construct', 'renovate', 'home', 'design', 'architect', 'develop'],
    retail: ['shop', 'store', 'mart', 'market', 'boutique', 'goods', 'supply', 'trading'],
    law_firm: ['law', 'legal', 'attorney', 'firm', 'counsel', 'solicitor'],
    salon: ['salon', 'beauty', 'hair', 'spa', 'nails', 'style', 'cut', 'barber'],
    it: ['tech', 'digital', 'software', 'web', 'cloud', 'data', 'system', 'solution'],
  };
  const kws = kwMap[industry] || ['service', 'company', 'group', 'inc'];
  const cities = { JP: ['tokyo', 'osaka'], US: ['nyc', 'la'], GB: ['london'], AU: ['sydney'], CA: ['toronto'], DE: ['berlin'] };
  const cityList = cities[country] || ['city'];
  const domains = [];
  for (let i = 0; i < limit && domains.length < limit; i++) {
    const kw = kws[i % kws.length];
    const city = cityList[i % cityList.length];
    domains.push(`${kw}${city}${tld}`);
  }
  return domains;
}

module.exports = { collect, queryWhoxy };
