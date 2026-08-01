async function searchTownpage(query, prefecture = '') {
  const prefParam = prefecture ? `&area=${encodeURIComponent(prefecture)}` : '';
  const url = `https://itp.ne.jp/search?keyword=${encodeURIComponent(query)}${prefParam}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Townpage HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const nameRegex = /class="[^"]*name[^"]*"[^>]*>([^<]+)/gi;
  const telRegex = /class="[^"]*tel[^"]*"[^>]*>([^<]+)/gi;
  const addrRegex = /class="[^"]*address[^"]*"[^>]*>([^<]+)/gi;
  let m;
  while ((m = nameRegex.exec(html)) !== null) {
    const name = m[1].trim();
    const chunk = html.slice(m.index, m.index + 500);
    const telMatch = chunk.match(/class="[^"]*tel[^"]*"[^>]*>([^<]+)/i);
    const addrMatch = chunk.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)/i);
    results.push({
      name,
      phone: telMatch?.[1]?.trim() || '',
      address: addrMatch?.[1]?.trim() || '',
    });
  }
  return results;
}

const TOWNPAGE_CATS = [
  '飲食店', '美容室', '歯科医院', '建設業', '小売店',
  'クリニック', '法律事務所', '会計事務所', '清掃業', '運送業',
];

async function collect({ country, industry, limit = 20 }) {
  if (country !== 'JP' && country !== 'ALL') return [];
  const catMap = {
    restaurant: '飲食店', clinic: '歯科医院', construction: '建設業',
    retail: '小売店', salon: '美容室', law_firm: '法律事務所',
    accounting: '会計事務所', logistics: '運送業',
  };
  const jaQuery = catMap[industry] || industry;
  const cats = industry === 'all' ? TOWNPAGE_CATS : [jaQuery];
  const all = [];
  for (const cat of cats) {
    const results = await searchTownpage(cat, '東京都');
    for (const r of results) {
      const slug = r.name.replace(/株式会社|有限会社|合同会社/g, '').trim();
      all.push({
        domain: `${slug.replace(/[^a-z0-9]/gi, '')}.jp`,
        companyName: r.name,
        industry: cat,
        country: 'JP',
        source: 'townpage',
        meta: { phone: r.phone, address: r.address },
      });
    }
    if (all.length >= limit) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  return all.slice(0, limit);
}

module.exports = { collect };
