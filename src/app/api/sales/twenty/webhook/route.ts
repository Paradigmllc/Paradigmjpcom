import { NextRequest, NextResponse } from "next/server";
import { pullTwentyCompaniesToSupabase } from "@/lib/sales/twenty-pull";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Body {
  limit?: number;
  dry_run?: boolean;
  dispatch_pipeline?: boolean;
}

/**
 * Twenty CRM webhook receiver.
 * Twenty → Supabase リアルタイム同期の入口。
 * 
 * 認証: Twentyは内部サービスなので、X-Internal-Secret または standard webhook secretで認証。
 * どちらもなければ401。
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret") ?? req.headers.get("x-internal-secret")
  const expected = process.env.TWENTY_WEBHOOK_SECRET ?? process.env.TRIGGER_WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET
  if (!expected || !secret || secret !== expected) {
    if (!expected) console.error("[twenty-webhook] no webhook secret configured (TWENTY_WEBHOOK_SECRET / TRIGGER_WEBHOOK_SECRET / N8N_WEBHOOK_SECRET)")
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch (error) {
      console.warn("[twenty-webhook] empty or invalid JSON body:", error);
    }

    const result = await pullTwentyCompaniesToSupabase(body.limit ?? 500, {
      autoRunPipeline: true,
      dispatchPipeline: body.dispatch_pipeline !== false,
      requestedBy: "twenty_webhook",
      dryRun: body.dry_run === true,
    });
    if (!result.ok) {
       console.error("[twenty-webhook] pull failed:", result.error);
       return NextResponse.json({ ok: false, error: result.error ?? "pull failed", result }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Webhook received, sync started", result });
  } catch (error) {
    console.error("[twenty-webhook] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
