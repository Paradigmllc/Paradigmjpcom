import { NextRequest, NextResponse } from "next/server";
import { isSalesApiAuthorized } from "@/lib/sales/api-auth";
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  limit?: number;
  dry_run?: boolean;
  dispatch_pipeline?: boolean;
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch (error) {
      console.warn("[twenty-webhook] empty or invalid JSON body:", error);
    }

    // The webhook payload might vary depending on the CRM structure.
    // For now, we will simply trigger a pull from Twenty to Supabase.
    // In a production environment, we could parse the event to pull only the updated company.
    
    // We execute the pull synchronously with maxDuration 60 to ensure it doesn't get killed
    // in serverless environments.
    const result = await pullTwentyCompaniesToSupabase(body.limit ?? 500, {
      autoRunPipeline: true,
      dispatchPipeline: body.dispatch_pipeline !== false,
      requestedBy: "twenty_webhook",
      dryRun: body.dry_run === true,
    });
    if (!result.ok) {
       console.error("[twenty-webhook] pull failed:", result.error);
    }

    return NextResponse.json({ ok: true, message: "Webhook received, sync started", result });
  } catch (error) {
    console.error("[twenty-webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
