#!/usr/bin/env node
/**
 * Tranco top-1M domain source — academic domain list. Free, no API key.
 */
const { inflateRawSync } = require('zlib');

const TRANCO_URL = 'https://tranco-list.eu/top-1m.csv.zip';
let _cache = null;

async function load() {
  if (_cache) return _cache;
  const res = await fetch(TRANCO_URL, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Tranco HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const csv = inflateFirst(buf).toString('utf8');
  const domains = [];
  for (const line of csv.split(/\r?\n/)) {
    const comma = line.indexOf(',');
    if (comma < 0) continue;
    const d = line.slice(comma + 1).trim().toLowerCase();
    if (d.includes('.') && !d.includes(' ')) domains.push(d);
  }
  _cache = domains;
  return domains;
}

function inflateFirst(buf) {
  const sig = buf.readUInt32LE(0);
  if (sig !== 0x04034b50) throw new Error('Not a zip file');
  const method = buf.readUInt16LE(8);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  // Deflate data fills rest of file for single-entry streaming zip
  const compressed = buf.subarray(dataStart);
  if (method === 0) return compressed;
  if (method === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported compression: ${method}`);
}

async function fetchTrancoTopDomains(pattern, limit = 5000) {
  try {
    const suffix = pattern.replace(/^\*\./, '').replace(/^\*/, '').replace(/^\./, '').toLowerCase();
    const all = await load();
    const matched = [];
    for (const d of all) {
      if (d.endsWith('.' + suffix) || d === suffix) matched.push(d);
      if (matched.length >= limit) break;
    }
    return { ok: matched.length > 0, domains: matched, total: all.length };
  } catch (e) {
    return { ok: false, domains: [], total: 0, error: e.message };
  }
}

module.exports = { fetchTrancoTopDomains };
