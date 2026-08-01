const BBB_CATS = [
  'plumber', 'painter', 'roofer', 'electrician', 'contractor',
  'dentist', 'accountant', 'lawyer', 'auto+repair', 'locksmith',
];

async function searchBbb(query, location = '') {
  const locParam = location ? `&find_loc=${encodeURIComponent(location)}` : '';
  const url = `https://www.bbb.org/search?find_text=${encodeURIComponent(query)}${locParam}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`BBB HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const nameRegex = /class="result-name"[^>]*>([^<]+)/gi;
  let m;
  while ((m = nameRegex.exec(html)) !== null) {
    results.push({ name: m[1].trim(), accredited: html.slice(m.index - 500, m.index).includes('Accredited Business') });
  }
  return results;
}

async function collect({ country, industry, limit = 20 }) {
  const cats = industry === 'all' ? BBB_CATS : [industry];
  const all = [];
  for (const cat of cats) {
    const results = await searchBbb(cat, '');
    for (const r of results) {
      const domain = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      all.push({
        domain,
        companyName: r.name,
        industry: cat,
        country: 'US',
        source: 'bbb',
        meta: { accredited: r.accredited },
      });
    }
    if (all.length >= limit) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  return all.slice(0, limit);
}

module.exports = { collect };
