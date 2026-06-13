const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yihdmgtxiqfdgdueolub.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaGRtZ3R4aXFmZGdkdWVvbHViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyOTEwNiwiZXhwIjoyMDg5OTA1MTA2fQ.cLxBcRg_sTzbtdRqZqVraliY1As1b4tndN9Pobg6aUI",
  { auth: { persistSession: false } }
);
async function test() {
  // Latest batch
  const { data: batches } = await sb.from("sales_lead_batches").select("*").order("created_at", { ascending: false }).limit(1);
  if (batches && batches[0]) {
    const b = batches[0];
    console.log("Batch:", b.name, "status:", b.status, "imported:", b.imported_count, "enrichment_queued:", b.enrichment_queued_count);
    
    // Items
    const { data: items } = await sb.from("sales_lead_batch_items").select("status, count").eq("batch_id", b.id);
    console.log("Items:", JSON.stringify(items));
  }
  
  // Jobs
  const { data: jobs, count } = await sb.from("sales_enrichment_jobs").select("*", { count: "exact" }).eq("status", "queued").lte("next_run_at", new Date().toISOString()).limit(3);
  console.log("\nQueued jobs:", count);
  if (jobs) for (const j of jobs) console.log(JSON.stringify({id: j.id, company_id: j.company_id, next_run_at: j.next_run_at}));

  // Companies
  const cc = await sb.from("sales_companies").select("*", { count: "exact", head: true });
  console.log("\nTotal companies:", cc.count);
}
test().catch(e => console.error(e.message));
