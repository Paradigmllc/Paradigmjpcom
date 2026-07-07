/**
 * CZDS zone file source — ICANN domain zone files.
 * Requires CZDS_ACCESS_TOKEN or CZDS_USERNAME/CZDS_PASSWORD.
 */

async function fetchZoneDomains(patterns, limit) {
  return { ok: false, domains: [], sourceStats: [], failures: [{ key: 'czds', reason: 'CZDS not configured. Use crt.sh + CommonCrawl for free domain discovery.' }] };
}

module.exports = { fetchZoneDomains };
