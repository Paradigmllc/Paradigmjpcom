const { Client } = require("pg");
// Try direct connection (IPv6) from local machine
const c = new Client({
  host: "db.yihdmgtxiqfdgdueolub.supabase.co", port: 5432,
  user: "postgres", password: "ParadigmDB2025!",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
  family: 6, // Force IPv6
});
c.connect().then(async () => {
  console.log("Connected as postgres via IPv6!");
  await c.query("CREATE TABLE IF NOT EXISTS sales_enrichment_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, job_type text NOT NULL DEFAULT 'company_karte', status text NOT NULL DEFAULT 'queued', priority integer NOT NULL DEFAULT 50, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3, source text, triggered_by text, next_run_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz, locked_at timestamptz, lock_owner text, error_message text, input_payload jsonb NOT NULL DEFAULT '{}'::jsonb, result_payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
  console.log("Table created!");
  await c.end();
}).catch(e => { console.error(e.message); try { c.end(); } catch {} });
