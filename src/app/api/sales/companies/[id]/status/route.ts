import { NextResponse } from "next/server";
import { authorizePayloadAdminRequest } from "@/lib/admin-auth";
import { getServiceSalesSupabase } from "@/lib/supabase";
import { isValidPipelineStatus, PIPELINE_STATUSES } from "@/lib/sales/types";

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
    const { status } = body;

    if (!status || !isValidPipelineStatus(status)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Must be one of: ${PIPELINE_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getServiceSalesSupabase();
    if (!supabase) throw new Error("Supabase is not configured");

    const { data: company, error } = await supabase
      .from("sales_companies")
      .update({ pipeline_status: status })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !company) {
      console.error("[sales-companies-status] DB Error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to update pipeline status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, company });
  } catch (error) {
    console.error("[sales-companies-status] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
