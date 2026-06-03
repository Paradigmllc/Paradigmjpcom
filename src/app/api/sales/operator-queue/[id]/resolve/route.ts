import { NextResponse } from "next/server";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { getServiceSalesSupabase } from "@/lib/supabase";

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
    
    const status = action === "approve" ? "resolved" : "dismissed";
    
    const { data: item, error } = await supabase
      .from("sales_operator_queue_items")
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

    // if this queue item was tied to a company and it was a manual review for outreach,
    // we might want to automatically change the pipeline_status if approved.
    if (action === "approve" && item.company_id && item.queue_type === "outreach_review") {
      await supabase
        .from("sales_companies")
        .update({ pipeline_status: "report_ready" })
        .eq("id", item.company_id)
        .eq("pipeline_status", "manual_queue"); // only if it was manual_queue
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("[sales-operator-queue-resolve] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
