const { Client } = require("pg");
const c = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432,
  user: "payload_user.yihdmgtxiqfdgdueolub", password: "PayloadParadigm2026SecureDB",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});
c.connect().then(async () => {
  await c.query("ALTER TABLE sales_enrichment_jobs ADD COLUMN IF NOT EXISTS started_at timestamptz");
  await c.query("ALTER TABLE sales_enrichment_jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz");
  await c.query("ALTER TABLE sales_enrichment_jobs ADD COLUMN IF NOT EXISTS locked_at timestamptz");
  await c.query("ALTER TABLE sales_enrichment_jobs ADD COLUMN IF NOT EXISTS lock_owner text");
  await c.query("ALTER TABLE sales_enrichment_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()");
  console.log("Columns added");
  await c.query("NOTIFY pgrst, 'reload schema'");
  await c.end();
}).catch(e => { console.error(e.message); try { c.end(); } catch {} });
