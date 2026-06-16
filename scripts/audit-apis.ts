import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { pageSpeedApi } from "../src/lib/sales/data-sources/pagespeed";
import { securityTrailsApi } from "../src/lib/sales/data-sources/security-trails";
import { apolloApi } from "../src/lib/sales/data-sources/apollo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: resolve(__dirname, "../.env.local") });
dotenv.config({ path: resolve(__dirname, "../.env") });

async function audit() {
  console.log("==========================================");
  console.log("   API Practical Operation Audit Started  ");
  console.log("==========================================");

  const clients = [
    { name: "PageSpeed Insights", client: pageSpeedApi },
    { name: "SecurityTrails", client: securityTrailsApi },
    { name: "Apollo", client: apolloApi },
  ];

  for (const { name, client } of clients) {
    console.log(`\nChecking [${name}]...`);
    const { ready, missing } = client.verifyKeys();
    if (!ready) {
      console.log(`❌ [${name}] FAILED: Missing keys: ${missing.join(", ")}`);
    } else {
      console.log(`✅ [${name}] SUCCESS: Keys are configured.`);
    }
  }

  console.log("\n==========================================");
  console.log("   Audit Completed                        ");
  console.log("==========================================");
}

audit().catch(console.error);
