import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSalesApiAuthorized } from "@/lib/sales/api-auth";
import {
  generateInitialFormDraftBatch,
  listInitialFormDrafts,
} from "@/lib/sales/initial-form-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  runIds: z.array(z.string().uuid()).max(20).optional(),
  companyIds: z.array(z.string().uuid()).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(40),
  force: z.boolean().default(false),
}).refine((value) => (value.runIds?.length ?? 0) + (value.companyIds?.length ?? 0) > 0, {
  message: "At least one explicit runId or companyId is required",
});

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const runId = req.nextUrl.searchParams.get("runId") ?? "";
    if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ ok: false, error: "A valid runId is required" }, { status: 400 });
    const drafts = await listInitialFormDrafts(runId, Number(req.nextUrl.searchParams.get("limit") ?? 100));
    return NextResponse.json({ ok: true, drafts, sent: 0 });
  } catch (error) {
    console.error("[initial-form-drafts] list failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Drafts could not be loaded" }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    const result = await generateInitialFormDraftBatch(parsed.data);
    try {
      const { notifyBothChannels } = await import("@/lib/notify");
      await notifyBothChannels("sales", {
        title: `初回フォーム文面: ${result.generated}/${result.requested}件`,
        message: `DeepSeek V4 Proの根拠付き文面をTwentyへ未送信保存。失敗${result.failed}件、外部送信${result.sent}件。`,
        link: "/ja/admin/lead-factory",
        type: "initial_form_drafts_generated",
      });
    } catch (error) {
      console.error("[initial-form-drafts] notification failed:", error);
    }
    return NextResponse.json(result, { status: result.failed === 0 ? 200 : 207 });
  } catch (error) {
    console.error("[initial-form-drafts] batch failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Draft batch failed", sent: 0 }, { status: 500 });
  }
}
