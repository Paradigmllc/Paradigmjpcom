const { Client } = require("pg");
const c = new Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432,
  user: "payload_user.yihdmgtxiqfdgdueolub", password: "PayloadParadigm2026SecureDB",
  database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
});
c.connect().then(async () => {
  await c.query("NOTIFY pgrst, 'reload schema'");
  await c.query("NOTIFY pgrst, 'reload config'");
  await c.query("SELECT pg_notify('pgrst', 'reload schema')");
  await c.query("SELECT pg_notify('pgrst', 'reload')");
  console.log("All NOTIFY signals sent");
  await c.end();
}).catch(e => { console.error(e.message); try { c.end(); } catch {} });
