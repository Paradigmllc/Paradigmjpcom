async function searchYellowPages(query, location = '') {
  const locParam = location ? `&geo_location_terms=${encodeURIComponent(location)}` : '';
  const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(query)}${locParam}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`YP HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const nameRegex = /class="business-name"[^>]*>([^<]+)/gi;
  const phoneRegex = /class="phone[^"]*"[^>]*>([^<]+)/gi;
  let m;
  while ((m = nameRegex.exec(html)) !== null) {
    const name = m[1].trim();
    const chunk = html.slice(m.index, m.index + 500);
    const phoneMatch = chunk.match(phoneRegex.source ? new RegExp(phoneRegex.source, 'i') : /class="phone[^"]*"[^>]*>([^<]+)/i);
    results.push({ name, phone: phoneMatch?.[1]?.trim() || '' });
  }
  return results;
}

const YP_CATS = [
  'plumber', 'electrician', 'painter', 'roofing', 'contractor',
  'dentist', 'accountant', 'lawyer', 'auto+repair', 'locksmith',
  'restaurant', 'salon', 'cleaning', 'landscaper', 'moving',
];

async function collect({ country, industry, limit = 20 }) {
  if (country !== 'US' && country !== 'ALL') return [];
  const cats = industry === 'all' ? YP_CATS : [industry];
  const all = [];
  for (const cat of cats) {
    const results = await searchYellowPages(cat, '');
    for (const r of results) {
      const slug = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      all.push({
        domain: `${slug}.com`,
        companyName: r.name,
        industry: cat,
        country: 'US',
        source: 'yellow_pages',
        meta: { phone: r.phone },
      });
    }
    if (all.length >= limit) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  return all.slice(0, limit);
}

module.exports = { collect };
