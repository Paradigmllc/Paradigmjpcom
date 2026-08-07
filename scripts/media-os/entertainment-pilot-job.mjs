import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { upsertJobMetric } from "./production-job-telemetry.mjs";

function audit(db, jobId, eventType, payload) {
  db.prepare("insert into audit_events (entity_type,entity_id,event_type,payload_json) values (?,?,?,?)")
    .run("production_job", jobId, eventType, JSON.stringify(payload));
}

function progress(db, jobId, value, phase, detail) {
  db.prepare("update production_jobs set progress=?,updated_at=current_timestamp where id=?").run(value, jobId);
  upsertJobMetric(db, jobId, { phase, detail: JSON.stringify(detail).slice(0, 500) });
  audit(db, jobId, phase, detail);
}

function writeQualityReport(db, job, report) {
  db.prepare(`
    insert into episode_quality_reports (
      id,episode_id,job_id,gate_version,status,score,threshold,nearest_peer_similarity,report_json
    ) values (?,?,?,?,?,?,?,?,?)
    on conflict(job_id) do update set
      gate_version=excluded.gate_version,status=excluded.status,score=excluded.score,
      threshold=excluded.threshold,nearest_peer_similarity=excluded.nearest_peer_similarity,
      report_json=excluded.report_json,created_at=current_timestamp
  `).run(randomUUID(), job.episode_id, job.id, report.version, report.status, report.score,
    report.threshold, null, JSON.stringify(report));
}

function complete(db, job, state, report) {
  db.prepare(`
    insert into creative_pilots (
      id,episode_id,job_id,format_family,duration_seconds,shot_count,avatar_share,
      presentation_share,visual_mode_count,asset_request_count,render_ready,status,score,manifest_path,report_path
    ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    on conflict(job_id) do update set
      format_family=excluded.format_family,duration_seconds=excluded.duration_seconds,
      shot_count=excluded.shot_count,avatar_share=excluded.avatar_share,
      presentation_share=excluded.presentation_share,visual_mode_count=excluded.visual_mode_count,
      asset_request_count=excluded.asset_request_count,render_ready=excluded.render_ready,
      status=excluded.status,score=excluded.score,manifest_path=excluded.manifest_path,
      report_path=excluded.report_path,created_at=current_timestamp
  `).run(randomUUID(), job.episode_id, job.id, state.formatFamily, state.durationSeconds,
    state.shotCount, state.metrics.avatarShare, state.metrics.presentationShare,
    state.metrics.visualModeCount, state.metrics.assetRequestCount, state.renderReady ? 1 : 0,
    report.status, report.score, state.planPath, state.reportPath);
  const output = {
    planPath: state.planPath,
    reportPath: state.reportPath,
    visualManifestPath: state.visualManifestPath,
    expandedPromptPath: state.expandedPromptPath,
    formatFamily: state.formatFamily,
    shotCount: state.shotCount,
    qualityScore: state.qualityScore,
    renderReady: state.renderReady,
  };
  db.prepare(`
    update production_jobs set status='review_required',progress=100,
      review_gate='fictional_host_style_and_90_second_direction_review',
      output_manifest_json=?,error_message=null,updated_at=current_timestamp where id=?
  `).run(JSON.stringify(output), job.id);
  upsertJobMetric(db, job.id, {
    phase: "entertainment_direction_ready",
    detail: `${state.shotCount} shots / ${state.metrics.assetRequestCount} GPU requests / ${state.qualityScore} quality`,
  });
  audit(db, job.id, "review_required", {
    reviewGate: "fictional_host_style_and_90_second_direction_review",
    qualityScore: state.qualityScore,
    shotCount: state.shotCount,
    assetRequestCount: state.metrics.assetRequestCount,
  });
}

export function processEntertainmentPilotJob(db, job) {
  const blueprintPath = resolve(`renders/editorial/${job.episode_id}/blueprint.json`);
  const narrationPath = resolve(`operations/${job.episode_id}/narration.json`);
  if (!existsSync(blueprintPath) || !existsSync(narrationPath)) {
    throw new Error(`Entertainment pilot requires an approved blueprint and narration manifest for ${job.episode_id}.`);
  }
  const outputDirectory = resolve(`renders/entertainment/${job.episode_id}`);
  progress(db, job.id, 15, "entertainment_inputs_validated", { blueprintPath, narrationPath });
  const result = spawnSync(process.execPath, [resolve("scripts/generate-entertainment-pilot.mjs"),
    job.episode_id, "--duration", "90", "--output", outputDirectory], {
    cwd: resolve("."), env: process.env, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const statePath = resolve(outputDirectory, "pilot-run.json");
  const reportPath = resolve(outputDirectory, "creative-quality-report.json");
  if (!existsSync(statePath) || !existsSync(reportPath)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Entertainment pilot did not emit its direction package${detail ? `: ${detail.slice(-3000)}` : ""}`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  writeQualityReport(db, job, report);
  progress(db, job.id, 75, "shot_plan_creative_quality_scored", {
    score: report.score, shotCount: state.shotCount, assetRequestCount: state.metrics.assetRequestCount,
  });
  if (result.status !== 0 || state.status !== "review_required" || report.status !== "pass") {
    const blockerNames = report.blockers?.map((blocker) => blocker.id).join(", ") || "unknown creative blocker";
    throw new Error(`Entertainment direction gate blocked: ${blockerNames}`);
  }
  progress(db, job.id, 90, "gpu_asset_contract_emitted", { visualManifestPath: state.visualManifestPath });
  complete(db, job, state, report);
  return state;
}

export function assertEntertainmentPilotRenderReady(db, episodeId) {
  const pilot = db.prepare("select status,score,render_ready from creative_pilots where episode_id=? order by created_at desc limit 1").get(episodeId);
  if (!pilot || pilot.status !== "pass" || Number(pilot.render_ready) !== 1) {
    throw new Error("Professional master is blocked until the 90-second entertainment pilot passes direction review and its audience-facing assembly is render-ready.");
  }
}
