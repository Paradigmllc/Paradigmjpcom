const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yihdmgtxiqfdgdueolub.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaGRtZ3R4aXFmZGdkdWVvbHViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyOTEwNiwiZXhwIjoyMDg5OTA1MTA2fQ.cLxBcRg_sTzbtdRqZqVraliY1As1b4tndN9Pobg6aUI",
  { auth: { persistSession: false } }
);

async function test() {
  // Step 1: Create a function that creates the tables
  const funcSql = `
CREATE OR REPLACE FUNCTION create_enrichment_tables()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS sales_enrichment_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
    job_type text NOT NULL DEFAULT 'company_karte', status text NOT NULL DEFAULT 'queued',
    priority integer NOT NULL DEFAULT 50, attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3, source text, triggered_by text,
    next_run_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz,
    completed_at timestamptz, locked_at timestamptz, lock_owner text,
    error_message text, input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE sales_enrichment_jobs ENABLE ROW LEVEL SECURITY;
  RETURN 'ok';
END;
$$;
  `;

  // Try via RPC
  console.log("Trying RPC approach...");
  
  // First try to call a known function
  const { data: rpcTest, error: rpcErr } = await sb.rpc('create_enrichment_tables');
  console.log("RPC test:", rpcErr?.message || "OK", rpcTest);

  // Try direct insert bypass
  const { data, error } = await sb.from("sales_enrichment_jobs").insert({
    company_id: "00000000-0000-0000-0000-000000000001",
    job_type: "company_karte",
    status: "queued"
  }).select();
  console.log("Insert test:", error?.message || "OK");

  // Count via REST
  const c = await sb.from("sales_enrichment_jobs").select("*", { count: "exact", head: true });
  console.log("Count:", c.count);
}

test().catch(e => console.error(e.message));
