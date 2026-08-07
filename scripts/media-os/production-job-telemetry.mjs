import { statfsSync } from "node:fs";
import { resolve } from "node:path";

const GIB = 1024 ** 3;
const DEFAULT_BYTES_PER_FRAME = 180_000;

export function ensureTelemetrySchema(db) {
  db.exec(`
    create table if not exists production_job_metrics (
      job_id text primary key references production_jobs(id) on delete cascade,
      phase text not null default 'queued',
      detail text not null default '',
      completed_units integer,
      total_units integer,
      elapsed_seconds real,
      estimated_remaining_seconds real,
      free_disk_gib real,
      estimated_required_gib real,
      cost_usd real not null default 0,
      updated_at text not null default current_timestamp
    );
  `);
}

export function diskTelemetry(path = resolve(".")) {
  const disk = statfsSync(path);
  return {
    freeDiskGiB: Number(disk.bavail * disk.bsize) / GIB,
    totalDiskGiB: Number(disk.blocks * disk.bsize) / GIB,
  };
}

export function estimateRenderScratchGiB(totalFrames, bytesPerFrame = DEFAULT_BYTES_PER_FRAME) {
  if (!Number.isInteger(totalFrames) || totalFrames <= 0) return null;
  if (!Number.isFinite(bytesPerFrame) || bytesPerFrame <= 0) return null;
  return Math.max(1, (totalFrames * bytesPerFrame * 1.25) / GIB);
}

export function parseHyperframesProgressLine(line, startedAtMs, nowMs = Date.now()) {
  const capture = line.match(/Capturing frame\s+(\d+)\/(\d+)/i);
  if (capture) {
    const completedUnits = Number(capture[1]);
    const totalUnits = Number(capture[2]);
    const elapsedSeconds = Math.max(0, (nowMs - startedAtMs) / 1000);
    const rate = completedUnits > 0 ? completedUnits / Math.max(elapsedSeconds, 0.001) : 0;
    const estimatedRemainingSeconds = rate > 0 ? (totalUnits - completedUnits) / rate : null;
    return {
      phase: "picture_render",
      detail: `Capturing frame ${completedUnits}/${totalUnits}`,
      completedUnits,
      totalUnits,
      elapsedSeconds,
      estimatedRemainingSeconds,
      estimatedRequiredGiB: estimateRenderScratchGiB(totalUnits),
    };
  }
  if (/Encoding video/i.test(line)) return { phase: "video_encoding", detail: "Encoding captured frames" };
  if (/Assembling final video/i.test(line)) return { phase: "video_assembly", detail: "Assembling final picture" };
  if (/Render complete/i.test(line)) return { phase: "picture_complete", detail: "Picture render complete" };
  return null;
}

export function renderOverallProgress(render) {
  if (render?.phase === "picture_complete") return 65;
  if (["video_encoding", "video_assembly"].includes(render?.phase)) return 64;
  const ratio = render?.totalUnits ? Number(render.completedUnits ?? 0) / Number(render.totalUnits) : 0;
  return Math.min(64, 54 + Math.floor(Math.max(0, Math.min(1, ratio)) * 10));
}

export function upsertJobMetric(db, jobId, metric) {
  ensureTelemetrySchema(db);
  const disk = metric.freeDiskGiB === undefined ? diskTelemetry() : null;
  db.prepare(`
    insert into production_job_metrics (
      job_id,phase,detail,completed_units,total_units,elapsed_seconds,
      estimated_remaining_seconds,free_disk_gib,estimated_required_gib,cost_usd,updated_at
    ) values (?,?,?,?,?,?,?,?,?,?,current_timestamp)
    on conflict(job_id) do update set
      phase=excluded.phase, detail=excluded.detail,
      completed_units=coalesce(excluded.completed_units,production_job_metrics.completed_units),
      total_units=coalesce(excluded.total_units,production_job_metrics.total_units),
      elapsed_seconds=coalesce(excluded.elapsed_seconds,production_job_metrics.elapsed_seconds),
      estimated_remaining_seconds=excluded.estimated_remaining_seconds,
      free_disk_gib=excluded.free_disk_gib,
      estimated_required_gib=coalesce(excluded.estimated_required_gib,production_job_metrics.estimated_required_gib),
      cost_usd=coalesce(excluded.cost_usd,production_job_metrics.cost_usd),
      updated_at=current_timestamp
  `).run(
    jobId,
    metric.phase,
    metric.detail ?? "",
    metric.completedUnits ?? null,
    metric.totalUnits ?? null,
    metric.elapsedSeconds ?? null,
    metric.estimatedRemainingSeconds ?? null,
    metric.freeDiskGiB ?? disk?.freeDiskGiB ?? null,
    metric.estimatedRequiredGiB ?? null,
    metric.costUsd ?? 0,
  );
}
