#!/usr/bin/env node
// Check current Cloudflare DNS records

import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs";

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID
if (!ZONE_ID) {
  console.error("CLOUDFLARE_ZONE_ID env var must be set")
  process.exit(1)
}

async function main() {
  const envs = await readCoolifyApplicationEnvs();
  const CLOUDFLARE_API_TOKEN = envs["CLOUDFLARE_API_TOKEN"];
  if (!CLOUDFLARE_API_TOKEN) {
    console.error("CLOUDFLARE_API_TOKEN is not set in Coolify env");
    process.exit(1);
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100`, {
    headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
  });
  const data = await res.json();
  if (data.success) {
    console.log("=== Current DNS Records ===");
    for (const r of data.result) {
      console.log(`${r.type} ${r.name} -> ${r.content} (proxied: ${r.proxied})`);
    }
  } else {
    console.error("Failed:", JSON.stringify(data.errors));
  }
}

main().catch(console.error);
