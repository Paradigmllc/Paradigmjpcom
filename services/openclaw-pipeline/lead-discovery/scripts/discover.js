#!/usr/bin/env node
/**
 * lead-discovery/discover.js — Lead discovery entry point.
 * Delegates to the 3-stage SMB pipeline for production-quality results.
 *
 * Usage:
 *   node discover.js --country JP --industry all --limit 50
 *   node discover.js --country US --industry restaurant --limit 10 --promote
 */
const { execSync } = require('child_process');

const args = process.argv.slice(2).join(' ');
const cmd = `node ${__dirname}/pipeline.js ${args}`;
try {
  const out = execSync(cmd, { encoding: 'utf8', timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  console.log(out);
} catch (e) {
  console.error('Pipeline failed:', e.message);
  if (e.stdout) console.log(e.stdout.toString());
  process.exit(1);
}
