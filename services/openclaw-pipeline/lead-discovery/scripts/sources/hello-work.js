const PREFECTURES = ['東京', '大阪', '愛知', '福岡', '北海道'];
const INDUSTRIES = ['建設', '製造', '飲食', '小売', '医療', '美容', '清掃', '運送'];

async function searchHelloWork(industry, prefecture, page = 1) {
  const url = `https://www.hellowork.mhlw.go.jp/search?job=${encodeURIComponent(industry)}&area=${encodeURIComponent(prefecture)}&page=${page}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HelloWork HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const tableRegex = /<table[^>]*class="[^"]*job[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const row = tableMatch[1];
    const nameM = row.match(/事業所名[：:]\s*([^<\n]+)/i);
    const indM = row.match(/産業[：:]\s*([^<\n]+)/i);
    const locM = row.match(/所在地[：:]\s*([^<\n]+)/i);
    const jobM = row.match(/職種[：:]\s*([^<\n]+)/i);
    if (nameM) {
      results.push({
        name: nameM[1].trim(),
        industry: indM?.[1]?.trim() || industry,
        location: locM?.[1]?.trim() || prefecture,
        jobCategory: jobM?.[1]?.trim() || '',
        prefecture,
      });
    }
  }
  return results;
}

async function collect({ country, industry, limit = 20 }) {
  if (country !== 'JP' && country !== 'ALL') return [];
  const inds = industry === 'all' ? INDUSTRIES : [industry];
  const all = [];
  for (const ind of inds) {
    for (const pref of PREFECTURES) {
      if (all.length >= limit) break;
      const results = await searchHelloWork(ind, pref, 1);
      for (const r of results) {
        const slug = r.name.replace(/株式会社|有限会社|合同会社/g, '').trim();
        all.push({
          domain: `${slug.replace(/[^a-z0-9]/gi, '')}.jp`,
          companyName: r.name,
          industry: ind,
          country: 'JP',
          source: 'hellowork',
          meta: { location: r.location, prefecture: pref, jobCategory: r.jobCategory },
        });
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return all.slice(0, limit);
}

module.exports = { collect };
