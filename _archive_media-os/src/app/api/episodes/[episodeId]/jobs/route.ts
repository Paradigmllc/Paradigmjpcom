import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedRequest } from "@/lib/media-os/auth";
import { queueProductionJob } from "@/lib/media-os/repository";
import { productionRenderers, type ProductionRenderer } from "@/lib/media-os/types";

const inputSchema = z.object({
  renderer: z.enum(productionRenderers),
});

function enabledRenderers(): Set<ProductionRenderer> | null {
  if (process.env.NODE_ENV !== "production") return null;
  const configured = process.env.MEDIA_OS_WORKER_RENDERERS?.trim();
  if (!configured) return new Set();
  return new Set(
    configured
      .split(",")
      .map((renderer) => renderer.trim())
      .filter((renderer): renderer is ProductionRenderer =>
        productionRenderers.includes(renderer as ProductionRenderer)),
  );
}

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ episodeId: string }> },
) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid renderer" }, { status: 400 });
    }
    const enabled = enabledRenderers();
    if (enabled && !enabled.has(parsed.data.renderer)) {
      return NextResponse.json(
        { ok: false, error: `${parsed.data.renderer} is not enabled on this production worker` },
        { status: 503 },
      );
    }
    const { episodeId } = await context.params;
    const job = queueProductionJob({ episodeId, renderer: parsed.data.renderer });
    return NextResponse.json({ ok: true, job }, { status: 201 });
  } catch (error) {
    console.error("[media-os-jobs] queue failed", error);
    const message = error instanceof Error ? error.message : "Production job could not be queued";
    return NextResponse.json({ ok: false, error: message }, { status: message === "Episode not found" ? 404 : 500 });
  }
}
