import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = match[2] ? match[2].trim() : "";
    }
  });
  return env;
}

const env = loadEnv();

const NEXT_PUBLIC_SUPABASE_URL = env.SALES_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SALES_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const SEARXNG_BASE_URL = env.SEARXNG_BASE_URL;
const DIFY_API_KEY = env.DIFY_API_KEY;
const DIFY_BASE_URL = env.DIFY_BASE_URL || "https://api.dify.ai";
const N8N_BASE_URL = env.N8N_BASE_URL;
const TRIGGER_SECRET_KEY = env.TRIGGER_SECRET_KEY || env.TRIGGER_ACCESS_TOKEN || env.TRIGGER_DEV_API_KEY;
const TRIGGER_API_URL = env.TRIGGER_API_URL || "https://api.trigger.dev";

async function check() {
  console.log('--- SUPABASE ---');
  if (NEXT_PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sales_companies?select=id&limit=1`, {
        headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      console.log(`Supabase OK: HTTP ${res.status}, valid data: ${Array.isArray(data)}`);
    } catch(e) {
      console.log('Supabase Error:', e.message);
    }
  } else {
    console.log('Supabase env missing');
  }

  console.log('--- SEARXNG ---');
  if (SEARXNG_BASE_URL) {
    try {
      const res = await fetch(`${SEARXNG_BASE_URL}/search?q=test&format=json`, { signal: AbortSignal.timeout(5000) });
      console.log(`SearxNG OK: HTTP ${res.status}`);
    } catch(e) {
      console.log('SearxNG Error:', e.message);
    }
  } else {
    console.log('SearxNG env missing');
  }

  console.log('--- DIFY ---');
  if (DIFY_API_KEY) {
    try {
      // Just test authentication
      const res = await fetch(`${DIFY_BASE_URL}/v1/parameters`, {
        headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` },
        signal: AbortSignal.timeout(5000)
      });
      console.log(`Dify OK: HTTP ${res.status}`);
    } catch(e) {
      console.log('Dify Error:', e.message);
    }
  } else {
    console.log('Dify env missing');
  }

  console.log('--- TRIGGER.DEV ---');
  if (TRIGGER_SECRET_KEY) {
    try {
      const url = new URL(TRIGGER_API_URL);
      url.pathname = `${url.pathname}/api/v1/tasks`.replace(/\/+/g, "/");
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${TRIGGER_SECRET_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      console.log(`Trigger.dev OK: HTTP ${res.status}`);
    } catch(e) {
      console.log('Trigger.dev Error:', e.message);
    }
  } else {
    console.log('Trigger.dev env missing');
  }

  console.log('--- N8N (LEGACY) ---');
  if (N8N_BASE_URL) {
    try {
      const res = await fetch(`${N8N_BASE_URL}/healthz`, { signal: AbortSignal.timeout(5000) });
      console.log(`n8n (legacy) OK: HTTP ${res.status}`);
    } catch(e) {
      console.log('n8n (legacy) Error:', e.message);
    }
  } else {
    console.log('N8N env missing');
  }
}

check();
