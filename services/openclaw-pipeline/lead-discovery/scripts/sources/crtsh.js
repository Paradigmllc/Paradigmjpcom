#!/usr/bin/env node
/**
 * crt.sh bulk domain source — SSL certificate transparency log mining.
 * Free, unlimited. Routes through FlareSolverr proxy when blocked.
 */

const CRTSH_URL = 'https://crt.sh';
const FLARESOLVERR_URL = process.env.FLARESOLVERR_API_URL || process.env.FLARESOLVERR_URL || 'http://services-flaresolverr-1:8191';

async function fetchWithFlareSolverr(url) {
  try {
    const res = await fetch(`${FLARESOLVERR_URL}/v1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'request.get',
        url: url,
        maxTimeout: 60000,
        cookies: [],
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) throw new Error(`FlareSolverr HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok' || !data.solution?.response) {
      throw new Error(`FlareSolverr: ${data.message || 'no response'}`);
    }
    return data.solution.response;
  } catch (e) {
    throw new Error(`FlareSolverr error: ${e.message}`);
  }
}

async function fetchCrtshDomains(pattern, limit = 5000) {
  const url = `${CRTSH_URL}/?q=${encodeURIComponent(pattern)}&output=json&limit=${limit}&deduplicate=Y`;
  let body;

  // Try direct first
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; ParadigmBot/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('[') || text.startsWith('{')) {
        body = text;
      }
    }
  } catch (e) { /* fall through to FlareSolverr */ }

  // Fallback: FlareSolverr
  if (!body) {
    console.log(`  crt.sh direct blocked — trying FlareSolverr...`);
    try {
      body = await fetchWithFlareSolverr(url);
    } catch (e) {
      return { ok: false, domains: [], total: 0, error: e.message };
    }
  }

  try {
    const data = JSON.parse(body);
    if (!Array.isArray(data)) return { ok: false, domains: [], total: 0, error: 'crt.sh returned non-array' };
    const domains = new Set();
    for (const entry of data) {
      const names = (entry.name_value || '').split('\n');
      for (const name of names) {
        const cleaned = name.trim().toLowerCase().replace(/^\*\./, '');
        if (cleaned.includes('.') && !cleaned.includes(' ') && cleaned.length > 4) {
          domains.add(cleaned);
        }
      }
    }
    const sorted = [...domains].sort();
    return { ok: true, domains: sorted.slice(0, limit), total: data.length };
  } catch (e) {
    return { ok: false, domains: [], total: 0, error: `JSON parse: ${e.message}` };
  }
}

module.exports = { fetchCrtshDomains };
