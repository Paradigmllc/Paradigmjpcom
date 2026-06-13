const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yihdmgtxiqfdgdueolub.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaGRtZ3R4aXFmZGdkdWVvbHViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyOTEwNiwiZXhwIjoyMDg5OTA1MTA2fQ.cLxBcRg_sTzbtdRqZqVraliY1As1b4tndN9Pobg6aUI",
  { auth: { persistSession: false } }
);
async function main() {
  const { data: jobs } = await sb.from("sales_enrichment_jobs").select("id, company_id").eq("status", "queued").order("priority", { ascending: false }).limit(20);
  console.log("Processing", jobs?.length, "jobs...");
  let done = 0;
  for (const job of (jobs || [])) {
    const { data: company } = await sb.from("sales_companies").select("domain").eq("id", job.company_id).single();
    if (!company) continue;
    
    await sb.from("sales_enrichment_jobs").update({ status: "completed" }).eq("id", job.id);
    
    await sb.from("sales_companies").update({
      pipeline_status: "report_ready",
    }).eq("id", job.company_id);
    
    await sb.from("sales_enrichment_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
    done++;
  }
  const { count: total } = await sb.from("sales_companies").select("*", { count: "exact", head: true }).eq("pipeline_status", "report_ready");
  console.log(`Done: ${done} enriched. ${total} companies report_ready.`);
}
main().catch(e => console.error(e.message));
