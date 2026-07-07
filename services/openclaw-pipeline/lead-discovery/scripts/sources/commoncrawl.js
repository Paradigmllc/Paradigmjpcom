#!/usr/bin/env node
/**
 * CommonCrawl CDX domain source — free, unlimited web crawl archive.
 */

const CDX_API = 'https://index.commoncrawl.org';
const FALLBACK_INDEXES = ['CC-MAIN-2026-21', 'CC-MAIN-2026-17', 'CC-MAIN-2026-12'];

let cachedIndexes = null;

async function getRecentIndexes(limit = 3) {
  if (cachedIndexes) return cachedIndexes.slice(0, limit);
  try {
    const res = await fetch(`${CDX_API}/collinfo.json`, {
      headers: { 'User-Agent': 'RevenueOS-CommonCrawl/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`collinfo HTTP ${res.status}`);
    const rows = await res.json();
    cachedIndexes = rows
      .map(r => typeof r.id === 'string' ? r.id : null)
      .filter(id => id && /^CC-MAIN-\d{4}-\d{2}$/.test(id))
      .slice(0, 8);
    if (cachedIndexes.length > 0) return cachedIndexes.slice(0, limit);
  } catch (e) { console.error('[commoncrawl] collinfo failed:', e.message); }
  cachedIndexes = FALLBACK_INDEXES;
  return cachedIndexes.slice(0, limit);
}

async function queryCdxIndex(pattern, index, limit = 5000) {
  const domains = new Set();
  const endpoint = `${CDX_API}/${index}-index`;

  async function readDomains(url) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RevenueOS-CommonCrawl/1.0' },
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return;
    const text = await res.text();
    for (const line of text.trim().split('\n')) {
      if (domains.size >= limit) break;
      try {
        const entry = JSON.parse(line);
        const parsed = new URL(entry.url);
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (parsed.pathname !== '/robots.txt' && hostname.includes('.') && hostname.length > 4) {
          domains.add(hostname);
        }
      } catch {}
    }
  }

  try {
    await readDomains(`${endpoint}?url=${encodeURIComponent(pattern)}&output=json&limit=${limit}&filter=status:200`);
  } catch (e) {
    console.error(`[commoncrawl] query failed for ${index}:`, e.message);
  }
  return [...domains];
}

async function fetchCommonCrawlDomains(pattern, limit = 10000) {
  const allDomains = new Set();
  const indexes = await getRecentIndexes();
  for (const index of indexes) {
    if (allDomains.size >= limit) break;
    const domains = await queryCdxIndex(pattern, index, limit - allDomains.size);
    domains.forEach(d => allDomains.add(d));
    await new Promise(r => setTimeout(r, 500));
  }
  const sorted = [...allDomains].sort();
  return { ok: sorted.length > 0, domains: sorted.slice(0, limit), total: sorted.length };
}

module.exports = { fetchCommonCrawlDomains };
