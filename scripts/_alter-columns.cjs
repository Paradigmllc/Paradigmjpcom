const { Client } = require("pg");
const c = new Client({
  host: "aws-0-ap-northeast-1.pooler.supabase.com", port: 5432,
  user: "postgres.yihdmgtxiqfdgdueolub", password: "PayloadParadigm2026SecureDB",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});
c.connect().then(async () => {
  await c.query("ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'en'");
  await c.query("ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'US'");
  await c.query("ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS template_variant text");
  console.log("Columns added successfully!");
  await c.end();
}).catch(e => { console.error(e.message); try { c.end(); } catch {} });
