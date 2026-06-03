import { NextResponse } from "next/server";
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-sync";

export async function POST(req: Request) {
  try {
    // The webhook payload might vary depending on the CRM structure.
    // For now, we will simply trigger a pull from Twenty to Supabase.
    // In a production environment, we could parse the event to pull only the updated company.
    
    // We execute the pull asynchronously so we can quickly respond with 200 to the webhook.
    pullTwentyCompaniesToSupabase(500).catch((error) => {
      console.error("[twenty-webhook] async pull failed:", error);
    });

    return NextResponse.json({ ok: true, message: "Webhook received, sync started" });
  } catch (error) {
    console.error("[twenty-webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
