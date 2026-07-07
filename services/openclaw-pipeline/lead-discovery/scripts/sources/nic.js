const REGISTRIES = {
  GB: { url: 'https://rdap.nominet.uk/domain', label: 'Nominet (.uk)' },
  AU: { url: 'https://rdap.auda.org.au/domain', label: 'auDA (.au)' },
  JP: { url: 'https://rdap.jprs.jp/domain', label: 'JPRS (.jp)' },
  DE: { url: 'https://rdap.denic.de/domain', label: 'DENIC (.de)' },
  CA: { url: 'https://rdap.cira.ca/domain', label: 'CIRA (.ca)' },
  US: { url: 'https://rdap.nic.us/domain', label: 'NIC (.us)' },
};

async function queryNic(domain, countryCode = 'US') {
  const reg = REGISTRIES[countryCode?.toUpperCase()];
  if (!reg) return { ok: false, domain, countryCode, source: 'nic', error: `No registry for ${countryCode}` };
  try {
    const res = await fetch(`${reg.url}/${encodeURIComponent(domain)}`, {
      headers: { 'Accept': 'application/rdap+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, domain, countryCode, source: 'nic', error: `HTTP ${res.status}` };
    const data = await res.json();
    const entities = data.entities || [];
    let orgName = null;
    for (const entity of entities) {
      const vcard = entity.vcardArray?.[1] || [];
      for (const item of vcard) {
        if (item[0] === 'org' && item[3]) { orgName = item[3]; break; }
      }
      if (orgName) break;
    }
    const events = data.events || [];
    const regEvent = events.find(e => e.eventAction === 'registration');
    return {
      ok: true, domain, countryCode,
      organizationName: orgName,
      createdDate: regEvent?.eventDate || null,
      source: `nic_${countryCode}`,
    };
  } catch (err) {
    return { ok: false, domain, countryCode, source: 'nic', error: err.message };
  }
}

async function collect({ country, industry, limit = 20 }) {
  const codes = country === 'ALL' ? Object.keys(REGISTRIES) : [country.toUpperCase()].filter(c => REGISTRIES[c]);
  const tldMap = { GB: '.uk', AU: '.au', JP: '.jp', DE: '.de', CA: '.ca', US: '.us' };
  const all = [];
  for (const code of codes) {
    const tld = tldMap[code];
    const seedDomains = generateSeedDomains(code, industry, limit, tld);
    for (const domain of seedDomains) {
      const r = await queryNic(domain, code);
      if (r.ok && r.organizationName) {
        all.push({
          domain: r.domain,
          companyName: r.organizationName,
          country: code,
          industry,
          source: 'country_nic',
          meta: { createdDate: r.createdDate },
        });
      }
      if (all.length >= limit) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (all.length >= limit) break;
  }
  return all.slice(0, limit);
}

function generateSeedDomains(code, industry, limit, tld) {
  const kwMap = {
    restaurant: ['sushi', 'pizza', 'cafe', 'restaurant', 'dining'],
    clinic: ['clinic', 'dental', 'medical', 'doctor', 'health'],
    construction: ['build', 'construct', 'homes', 'design', 'develop'],
    retail: ['shop', 'store', 'market', 'mart', 'goods'],
    law_firm: ['law', 'legal', 'solicitor', 'firm'],
    it: ['tech', 'digital', 'web', 'cloud', 'software'],
  };
  const kws = kwMap[industry] || ['service', 'company', 'group'];
  const cities = { GB: ['london', 'manchester'], AU: ['sydney', 'melbourne'], JP: ['tokyo', 'osaka'], DE: ['berlin', 'munich'], CA: ['toronto', 'vancouver'], US: ['nyc', 'la'] };
  const cityList = cities[code] || ['city'];
  const domains = [];
  for (let i = 0; i < limit && domains.length < limit; i++) {
    const kw = kws[i % kws.length];
    const city = cityList[i % cityList.length];
    domains.push(`${kw}${city}${tld}`);
  }
  return domains;
}

module.exports = { collect, queryNic };
