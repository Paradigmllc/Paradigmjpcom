const { Client } = require("pg");
const c = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432,
  user: "payload_user.yihdmgtxiqfdgdueolub", password: "PayloadParadigm2026SecureDB",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});
c.connect().then(async () => {
  try {
    await c.query("CREATE TABLE IF NOT EXISTS sales_enrichment_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, job_type text NOT NULL DEFAULT 'company_karte', status text NOT NULL DEFAULT 'queued', priority integer NOT NULL DEFAULT 50, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3, source text, triggered_by text, next_run_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz, locked_at timestamptz, lock_owner text, error_message text, input_payload jsonb NOT NULL DEFAULT '{}'::jsonb, result_payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
    console.log("1. enrichment_jobs created");
  } catch(e) { console.log("1. FAILED:", e.message); }

  try {
    await c.query("CREATE TABLE IF NOT EXISTS sales_diagnosis_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, job_id uuid, event_type text NOT NULL, status text NOT NULL DEFAULT 'info', title text NOT NULL, message text, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())");
    console.log("2. diagnosis_events created");
  } catch(e) { console.log("2. FAILED:", e.message); }

  // Verify immediately
  const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = 'sales_enrichment_jobs'");
  console.log("Verify:", r.rows.length, "rows");

  await c.end();
}).catch(e => { console.error(e.message); try { c.end(); } catch {} });
