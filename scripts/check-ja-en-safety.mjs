#!/usr/bin/env node
/**
 * Pre-push .ja/.en safety check — focuses on diagnostic report paths.
 * Blocks push only for dangerous accesses in report-rendering code.
 */
import { readFileSync } from "node:fs";

const DANGEROUS_FILES = process.argv.slice(2);
if (!DANGEROUS_FILES.length) {
  console.log("No changed .ts/.tsx files to check.");
  process.exit(0);
}

const SAFE_PATTERNS = [
  /\?\.ja\b/, /\?\.en\b/,           // optional chaining
  /\.ja\s*\?\?/, /\.en\s*\?\?/,     // null coalescing
  /\.ja\s*:/, /\.en\s*:/,           // object literal keys
  /lang\s*===/,                     // lang === "ja" ? pattern
  /entry\.ja/, /entry\.en/,         // after null guard
  /COPY\.ja/, /COPY\.en/,
  /copy\.ja/, /copy\.en/,
  /LOCALE.*\.ja/, /LOCALE.*\.en/,
  /\.ja!$/, /\.en!$/,               // non-null assertion
];

let found = 0;

for (const file of DANGEROUS_FILES) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  try {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/\.ja\b|\.en\b/.test(line)) continue;
      if (SAFE_PATTERNS.some(p => p.test(line))) continue;
      
      console.log(`❌ ${file}:${i+1}: ${line.trim().slice(0, 100)}`);
      found++;
    }
  } catch {}
}

if (found > 0) {
  console.log(`\n🚨 ${found} unsafe .ja/.en access(es). Add ?. or ?? guard.`);
  process.exit(1);
}
console.log("✅ .ja/.en safety check passed.");
process.exit(0);
