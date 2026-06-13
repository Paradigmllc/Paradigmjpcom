const { Client } = require("pg");
// Try session pooler with postgres.projectref user
const c = new Client({
  host: "aws-0-ap-northeast-1.pooler.supabase.com", port: 5432,
  user: "postgres.yihdmgtxiqfdgdueolub", password: "ParadigmDB2025!",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});

const sql = `
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'en';
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'US';
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS template_variant text;
`;

c.connect().then(async () => {
  console.log("Connected via pooler!");
  await c.query(sql);
  console.log("Columns added!");
  await c.query("NOTIFY pgrst, 'reload schema'");
  await c.end();
}).catch(e => { console.error("Failed:", e.message); try { c.end(); } catch {} });
