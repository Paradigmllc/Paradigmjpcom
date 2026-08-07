"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProductionRenderer } from "@/lib/media-os/types";

const successMessages: Record<ProductionRenderer, string> = {
  entertainment_pilot: "90秒エンタメパイロットの演出設計をキューに追加しました",
  research_ingest: "一次資料の取得・来歴検証をキューに追加しました",
  editorial_blueprint: "長尺構成と品質監査をキューに追加しました",
  narration: "権利確認付きナレーション制作をキューに追加しました",
  hyperframes: "本編シーン構築とレビュー検査をキューに追加しました",
  professional_master: "プロ品質の完成マスター制作をキューに追加しました",
  comfyui_hyperframes: "GPU素材生成ジョブをキューに追加しました",
};

export function ProductionControls({
  episodeId,
  pilotApprovalEnabled,
  professionalMasterEnabled,
}: {
  episodeId: string;
  pilotApprovalEnabled: boolean;
  professionalMasterEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ProductionRenderer | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [router]);

  async function queue(renderer: ProductionRenderer) {
    setPending(renderer);
    try {
      const response = await fetch(`/api/episodes/${episodeId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renderer }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      toast.success(successMessages[renderer]);
      router.refresh();
    } catch (error) {
      console.error("[production-controls] queue failed", error);
      toast.error(error instanceof Error ? error.message : "ジョブの作成に失敗しました");
    } finally {
      setPending(null);
    }
  }

  async function approvePilot() {
    setPending("entertainment_pilot");
    try {
      const response = await fetch(`/api/episodes/${episodeId}/pilot-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve" }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      toast.success("90秒試写を承認し、本編マスター制作を解放しました");
      router.refresh();
    } catch (error) {
      console.error("[production-controls] pilot approval failed", error);
      toast.error(error instanceof Error ? error.message : "90秒試写の承認に失敗しました");
    } finally {
      setPending(null);
    }
  }

  const button = (renderer: ProductionRenderer, label: string, className: string, enabled = true) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => queue(renderer)}
      disabled={pending !== null || !enabled}
      className={`${className} rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60`}
    >
      {pending === renderer ? "追加中…" : label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {button("entertainment_pilot", "90秒エンタメ演出を設計", "border border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-100 hover:bg-fuchsia-300/20")}
      {pilotApprovalEnabled ? (
        <button
          type="button"
          aria-label="90秒試写を視聴確認済みにする"
          onClick={approvePilot}
          disabled={pending !== null}
          className="rounded-lg border border-fuchsia-200 bg-fuchsia-200 px-3 py-2 text-sm font-semibold text-fuchsia-950 transition hover:bg-fuchsia-100 disabled:cursor-wait disabled:opacity-60"
        >
          {pending === "entertainment_pilot" ? "承認中…" : "90秒試写を承認"}
        </button>
      ) : null}
      {button("research_ingest", "一次資料を取得・検証", "border border-sky-300/30 bg-sky-300/10 text-sky-100 hover:bg-sky-300/20")}
      {button("professional_master", professionalMasterEnabled ? "完成マスターを制作" : "完成マスター（90秒試写承認後）", "bg-emerald-300 text-[#10251b] hover:bg-emerald-200", professionalMasterEnabled)}
      {button("editorial_blueprint", "長尺構成を品質監査", "border border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20")}
      {button("narration", "ナレーションを生成", "border border-[#d4a72c]/40 bg-[#d4a72c]/10 text-[#e7c768] hover:bg-[#d4a72c]/20")}
      {button("hyperframes", "本編シーンを構築・検査", "bg-[#d4a72c] text-[#181713] hover:bg-[#e6bd4c]")}
      {button("comfyui_hyperframes", "GPU素材付きで準備", "border border-white/15 text-[#dfddd4] hover:border-white/30 hover:bg-white/5")}
    </div>
  );
}
