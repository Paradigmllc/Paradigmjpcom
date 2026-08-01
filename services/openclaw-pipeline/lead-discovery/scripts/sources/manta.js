const MANTA_CATS = [
  'plumber', 'painter', 'landscaper', 'electrician', 'hvac',
  'roofing', 'cleaning', 'handyman', 'moving', 'pest+control',
];

async function searchManta(query, location = '') {
  const locParam = location ? `&city=${encodeURIComponent(location)}` : '';
  const url = `https://www.manta.com/search?search=${encodeURIComponent(query)}${locParam}&pg=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 403 || res.status === 429) throw new Error('Manta rate limited');
  if (!res.ok) throw new Error(`Manta HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const nameRegex = /class="media-heading"[^>]*>([^<]+)/gi;
  const locRegex = /([A-Z][a-z]+,\s*[A-Z]{2})/g;
  let m;
  while ((m = nameRegex.exec(html)) !== null) {
    const name = m[1].trim();
    const chunk = html.slice(m.index, m.index + 300);
    const locMatch = chunk.match(locRegex);
    results.push({ name, location: locMatch?.[0] || '', employees: '<10' });
  }
  return results;
}

async function collect({ country, industry, limit = 20 }) {
  const cats = industry === 'all' ? MANTA_CATS : [industry];
  const all = [];
  for (const cat of cats) {
    const results = await searchManta(cat, '');
    for (const r of results) {
      const slug = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      all.push({
        domain: `${slug}.com`,
        companyName: r.name,
        industry: cat,
        country: 'US',
        source: 'manta',
        meta: { location: r.location, employees: r.employees },
      });
    }
    if (all.length >= limit) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  return all.slice(0, limit);
}

module.exports = { collect };
