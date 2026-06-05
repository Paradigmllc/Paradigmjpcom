import { NextResponse } from "next/server";
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-sync";

export async function POST(req: Request) {
  try {
    // The webhook payload might vary depending on the CRM structure.
    // For now, we will simply trigger a pull from Twenty to Supabase.
    // In a production environment, we could parse the event to pull only the updated company.
    
    // We execute the pull synchronously with maxDuration 60 to ensure it doesn't get killed
    // in serverless environments.
    const result = await pullTwentyCompaniesToSupabase(500);
    if (!result.ok) {
       console.error("[twenty-webhook] pull failed:", result.error);
    }

    return NextResponse.json({ ok: true, message: "Webhook received, sync started" });
  } catch (error) {
    console.error("[twenty-webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
