import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedRequest } from "@/lib/media-os/auth";
import { approveCreativePilot } from "@/lib/media-os/repository";

const inputSchema = z.object({ decision: z.literal("approve") });

export async function POST(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  if (!isAuthorizedRequest(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Explicit approval is required" }, { status: 400 });
    const { episodeId } = await context.params;
    return NextResponse.json({ ok: true, pilot: approveCreativePilot(episodeId) });
  } catch (error) {
    console.error("[pilot-approval] approval failed", error);
    const message = error instanceof Error ? error.message : "Entertainment pilot could not be approved";
    return NextResponse.json({ ok: false, error: message }, { status: message === "Rendered entertainment pilot not found" ? 404 : 500 });
  }
}
