import { NextResponse } from "next/server";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { getServiceSalesSupabase } from "@/lib/supabase";
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizePayloadAdminRequest({ headers: req.headers });
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'approve' or 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = getServiceSalesSupabase();
    if (!supabase) throw new Error("Supabase is not configured");
    
    const status = action === "approve" ? "resolved" : "cancelled";
    
    const { data: item, error } = await supabase
      .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !item) {
      console.error("[sales-operator-queue-resolve] DB Error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to resolve operator queue item" },
        { status: 500 }
      );
    }

    // Approval only re-opens the candidate for an explicit send call; it never
    // submits a form implicitly. `form_send` is the canonical queue type used
    // by the outreach orchestrator (older rows may still say outreach_review).
    if (action === "approve" && item.company_id && ["form_send", "outreach_review"].includes(item.queue_type)) {
      await supabase
        .from(DB_TABLES.SALES_COMPANIES)
        .update({ pipeline_status: "report_ready" })
        .eq("id", item.company_id)
        .eq("pipeline_status", "manual_queue"); // only if it was manual_queue
    }

    return NextResponse.json({
      ok: true,
      item,
      next_action: action === "approve"
        ? "Run a dry-run for this company, then explicitly call /api/sales/outreach/run with dryRun:false after operator approval."
        : null,
    });
  } catch (error) {
    console.error("[sales-operator-queue-resolve] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
