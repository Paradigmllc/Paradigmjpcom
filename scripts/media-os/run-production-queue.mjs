import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { compileHyperframesProject, loadChannelDesignSystems } from "./hyperframes-compiler-core.mjs";
import { copyNarrationMedia } from "./hyperframes-narration-media.mjs";
import { loadProductionMedia } from "./hyperframes-production-media.mjs";
import { configuredWorkerRenderers, rendererSqlList } from "./production-worker-config.mjs";
import { ensureTelemetrySchema, renderOverallProgress, upsertJobMetric } from "./production-job-telemetry.mjs";
import { processComfyUiEntertainmentJob, processResearchIngestJob } from "./provider-job-handlers.mjs";
import { assertEntertainmentPilotRenderReady, processEntertainmentPilotJob } from "./entertainment-pilot-job.mjs";
function databasePath() {
  const configured = process.env.MEDIA_OS_DATABASE_PATH?.trim() || ".data/media-os.sqlite";
  return isAbsolute(configured) ? configured : resolve(configured);
}
function audit(db, entityId, eventType, payload) {
  db.prepare(
    "insert into audit_events (entity_type,entity_id,event_type,payload_json) values (?,?,?,?)",
  ).run("production_job", entityId, eventType, JSON.stringify(payload));
}
function recoverStaleJobs(db, renderers) {
  const rendererSql = rendererSqlList(renderers);
  const stale = db.prepare(`
    select id,renderer from production_jobs
    where renderer in (${rendererSql.placeholders}) and status = 'running'
      and updated_at < datetime('now', '-6 hours')
  `).all(...rendererSql.parameters);
  const update = db.prepare(`
    update production_jobs
    set status = 'queued', progress = 0,
      error_message = 'Recovered stale production worker; deterministic outputs will be reused.',
      updated_at = current_timestamp
    where id = ?
  `);
  for (const row of stale) {
    update.run(row.id);
    audit(db, row.id, "stale_requeued", { renderer: row.renderer, recovery: "deterministic_resume" });
  }
  return stale.length;
}
function claimNextJob(db, renderers) {
  const rendererSql = rendererSqlList(renderers);
  db.exec("begin immediate");
  try {
    const row = db.prepare(`
      select id,episode_id,renderer from production_jobs
      where renderer in (${rendererSql.placeholders}) and status = 'queued'
      order by created_at asc limit 1
    `).get(...rendererSql.parameters);
    if (!row) {
      db.exec("commit");
      return null;
    }
    const result = db.prepare(`
      update production_jobs
      set status = 'running', progress = 5, error_message = null, updated_at = current_timestamp
      where id = ? and status = 'queued'
    `).run(row.id);
    if (result.changes !== 1) {
      db.exec("rollback");
      return null;
    }
    audit(db, row.id, "worker_claimed", { pid: process.pid });
    db.exec("commit");
    return row;
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}
function setProgress(db, jobId, progress, eventType, payload = {}) {
  db.prepare(`
    update production_jobs set progress = ?, updated_at = current_timestamp where id = ?
  `).run(progress, jobId);
  upsertJobMetric(db, jobId, { phase: eventType, detail: JSON.stringify(payload).slice(0, 500) });
  audit(db, jobId, eventType, payload);
}
function completeNarrationJob(db, jobId, state) {
  db.prepare(`
    update production_jobs
    set status = 'review_required', progress = 100,
      review_gate = 'voice_rights_pronunciation_and_caption_sync',
      output_manifest_json = ?, error_message = null, updated_at = current_timestamp
    where id = ?
  `).run(JSON.stringify({
    narrationPath: state.narrationPath,
    transcriptPath: state.transcriptPath,
    narrationSha256: state.narrationSha256,
    transcriptSha256: state.transcriptSha256,
    durationSeconds: state.durationSeconds,
    rights: state.rights,
  }), jobId);
  audit(db, jobId, "review_required", {
    reviewGate: "voice_rights_pronunciation_and_caption_sync",
    durationSeconds: state.durationSeconds,
  });
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
  `).run(
    randomUUID(),
    job.episode_id,
    job.id,
    report.version,
    report.status,
    report.score,
    report.threshold,
    report.nearestPeer?.similarity ?? null,
    JSON.stringify(report),
  );
}
function completeEditorialJob(db, jobId, state) {
  db.prepare(`
    update production_jobs
    set status = 'review_required', progress = 100,
      review_gate = 'originality_policy_and_structure_review',
      output_manifest_json = ?, error_message = null, updated_at = current_timestamp
    where id = ?
  `).run(JSON.stringify({
    blueprintPath: state.blueprintPath,
    reportPath: state.reportPath,
    blueprintSha256: state.blueprintSha256,
    reportSha256: state.reportSha256,
    qualityScore: state.qualityScore,
    qualityThreshold: state.qualityThreshold,
  }), jobId);
  audit(db, jobId, "review_required", {
    reviewGate: "originality_policy_and_structure_review",
    qualityScore: state.qualityScore,
  });
}
function completeHyperframesJob(db, jobId, state) {
  db.prepare(`
    update production_jobs
    set status = 'review_required', progress = 100,
      review_gate = 'professional_audiovisual_master_review',
      output_manifest_json = ?, error_message = null, updated_at = current_timestamp
    where id = ?
  `).run(JSON.stringify({
    masterProjectDirectory: state.masterProjectDirectory,
    previewProjectDirectory: state.previewProjectDirectory,
    masterManifestPath: state.masterManifestPath,
    previewManifestPath: state.previewManifestPath,
    compilerVersion: state.compilerVersion,
    durationSeconds: state.durationSeconds,
    previewDurationSeconds: state.previewDurationSeconds,
    sceneCount: state.sceneCount,
    designSignature: state.designSignature,
    checks: state.checks,
    professionalRender: state.professionalRender,
    generatedVisualCount: state.generatedVisualCount ?? 0,
    generatedVisualManifestPath: state.generatedVisualManifestPath ?? null,
    generatedVisualCostUsd: state.generatedVisualCostUsd ?? 0,
  }), jobId);
  audit(db, jobId, "review_required", {
    reviewGate: "professional_audiovisual_master_review",
    compilerVersion: state.compilerVersion,
    sceneCount: state.sceneCount,
    professionalStatus: state.professionalRender.status,
    professionalScore: state.professionalRender.score,
  });
}
function failJob(db, jobId, error) {
  const message = error instanceof Error ? error.message : String(error);
  db.prepare(`
    update production_jobs
    set status = 'failed', error_message = ?, updated_at = current_timestamp
    where id = ?
  `).run(message.slice(0, 4000), jobId);
  audit(db, jobId, "failed", { error: message.slice(0, 2000) });
}
function processNarrationJob(db, job) {
  const manifestPath = resolve(`operations/${job.episode_id}/narration.json`);
  if (!existsSync(manifestPath)) {
    throw new Error(`Narration manifest does not exist: ${manifestPath}`);
  }
  const outputDirectory = resolve(`renders/narration/${job.episode_id}`);
  setProgress(db, job.id, 15, "manifest_validated", { manifestPath });
  const args = [
    resolve("scripts/run-narration-pipeline.mjs"),
    manifestPath,
    "--output", outputDirectory,
  ];
  const overrideModel = process.env.MEDIA_OS_TRANSCRIBE_MODEL?.trim();
  if (overrideModel) args.push("--transcribe-model", overrideModel);
  const result = spawnSync(process.execPath, args, {
    cwd: resolve("."),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Narration pipeline failed${detail ? `: ${detail.slice(-3000)}` : ""}`);
  }
  setProgress(db, job.id, 90, "media_verified", { outputDirectory });
  const statePath = resolve(outputDirectory, "narration-run.json");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.status !== "review_required") {
    throw new Error(`Narration pipeline ended with unexpected status ${state.status}.`);
  }
  completeNarrationJob(db, job.id, state);
  return state;
}
function processEditorialJob(db, job) {
  const manifestPath = resolve(`operations/${job.episode_id}/editorial.json`);
  if (!existsSync(manifestPath)) throw new Error(`Editorial manifest does not exist: ${manifestPath}`);
  const outputDirectory = resolve(`renders/editorial/${job.episode_id}`);
  setProgress(db, job.id, 15, "editorial_manifest_validated", { manifestPath });
  const result = spawnSync(process.execPath, [
    resolve("scripts/generate-editorial-blueprint.mjs"),
    manifestPath,
    "--output", outputDirectory,
  ], {
    cwd: resolve("."),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const statePath = resolve(outputDirectory, "editorial-run.json");
  const reportPath = resolve(outputDirectory, "quality-report.json");
  if (!existsSync(statePath) || !existsSync(reportPath)) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Editorial blueprint pipeline did not emit a report${detail ? `: ${detail.slice(-3000)}` : ""}`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  writeQualityReport(db, job, report);
  setProgress(db, job.id, 90, "editorial_quality_scored", { score: report.score, status: report.status });
  if (result.status !== 0 || state.status !== "review_required" || report.status !== "pass") {
    const blockerNames = report.blockers?.map((blocker) => blocker.id).join(", ") || "unknown quality blocker";
    throw new Error(`Editorial quality gate blocked: ${blockerNames}`);
  }
  completeEditorialJob(db, job.id, state);
  return state;
}

function writeCompiledProject(directory, compiled) {
  for (const [relativePath, content] of Object.entries(compiled.files)) {
    const destination = resolve(directory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content, "utf8");
  }
}

function processHyperframesJob(db, job, providerState = null) {
  const editorialDirectory = resolve(`renders/editorial/${job.episode_id}`);
  const blueprintPath = resolve(editorialDirectory, "blueprint.json");
  const qualityPath = resolve(editorialDirectory, "quality-report.json");
  if (!existsSync(blueprintPath) || !existsSync(qualityPath)) {
    throw new Error(`Approved editorial outputs do not exist for ${job.episode_id}. Run editorial_blueprint first.`);
  }
  const blueprint = JSON.parse(readFileSync(blueprintPath, "utf8"));
  const qualityReport = JSON.parse(readFileSync(qualityPath, "utf8"));
  const designSystems = loadChannelDesignSystems(resolve("config/channel-design-systems.json"));
  const media = loadProductionMedia(blueprint);
  setProgress(db, job.id, 15, "approved_blueprint_loaded", { blueprintPath, qualityPath });

  const master = compileHyperframesProject({ blueprint, qualityReport, designSystems, media });
  const preview = compileHyperframesProject({ blueprint, qualityReport, designSystems, previewSeconds: 60, media });
  const masterProjectDirectory = resolve(`renders/hyperframes-projects/${job.episode_id}-master`);
  const previewProjectDirectory = resolve(`renders/hyperframes-projects/${job.episode_id}-preview`);
  writeCompiledProject(masterProjectDirectory, master);
  copyNarrationMedia(media, masterProjectDirectory);
  setProgress(db, job.id, 45, "master_scene_modules_compiled", { masterProjectDirectory, sceneCount: master.scenes.length });
  writeCompiledProject(previewProjectDirectory, preview);
  copyNarrationMedia(media, previewProjectDirectory);
  setProgress(db, job.id, 65, "review_preview_compiled", { previewProjectDirectory, durationSeconds: preview.manifest.durationSeconds });

  const hyperframesCli = resolve("node_modules/hyperframes/dist/cli.js");
  for (const command of ["lint", "validate", "inspect"]) {
    const check = spawnSync(process.execPath, [hyperframesCli, command], {
      cwd: previewProjectDirectory,
      env: process.env,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (check.error) throw check.error;
    if (check.status !== 0) {
      const detail = [check.stdout, check.stderr].filter(Boolean).join("\n").trim();
      throw new Error(`HyperFrames ${command} failed${detail ? `: ${detail.slice(-3000)}` : ""}`);
    }
  }
  setProgress(db, job.id, 90, "hyperframes_review_checks_passed", {
    lint: "pass",
    wcag: "pass",
    layoutInspection: "pass",
    professionalStatus: master.renderQuality.status,
    professionalScore: master.renderQuality.score,
  });
  writeQualityReport(db, job, master.renderQuality);
  const state = {
    status: "review_required",
    episodeId: job.episode_id,
    masterProjectDirectory,
    previewProjectDirectory,
    masterManifestPath: resolve(masterProjectDirectory, "compilation-manifest.json"),
    previewManifestPath: resolve(previewProjectDirectory, "compilation-manifest.json"),
    compilerVersion: master.manifest.compilerVersion,
    durationSeconds: master.manifest.durationSeconds,
    previewDurationSeconds: preview.manifest.durationSeconds,
    sceneCount: master.manifest.sceneCount,
    designSignature: master.manifest.designSignature,
    checks: { lint: "pass", wcag: "pass", layoutInspection: "pass" },
    professionalRender: {
      status: master.renderQuality.status,
      score: master.renderQuality.score,
      threshold: master.renderQuality.threshold,
      blockerIds: master.renderQuality.blockers.map((blocker) => blocker.id),
    },
    generatedVisualCount: media.visualAssets?.length ?? 0,
    generatedVisualManifestPath: providerState?.outputManifestPath ?? null,
    generatedVisualCostUsd: providerState?.totalCostUsd ?? 0,
  };
  completeHyperframesJob(db, job.id, state);
  return state;
}

async function processProfessionalMasterJob(db, job) {
  const operationDirectory = resolve(`operations/${job.episode_id}`);
  if (!existsSync(operationDirectory)) throw new Error(`Episode operation directory does not exist: ${operationDirectory}`);
  assertEntertainmentPilotRenderReady(db, job.episode_id);
  setProgress(db, job.id, 10, "professional_master_started", { episodeId: job.episode_id });
  const launchedAt = Date.now();
  const child = spawn(process.execPath, [
    resolve("scripts/run-professional-master.mjs"), job.episode_id, "--workers", "2",
  ], {
    cwd: resolve("."), env: process.env, stdio: ["ignore", "pipe", "pipe"],
  });
  const statePath = resolve(`renders/professional/${job.episode_id}/master.json`);
  const renderProgressPath = resolve(`renders/professional/${job.episode_id}/render-master.progress.json`);
  let stdout = "";
  let stderr = "";
  let observedSteps = -1;
  let observedRenderUpdate = "";
  child.stdout.on("data", (chunk) => { stdout = `${stdout}${chunk}`.slice(-32_000); });
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-32_000); });
  const observe = () => {
    if (!existsSync(statePath)) return;
    try {
      const current = JSON.parse(readFileSync(statePath, "utf8"));
      if (Date.parse(current.startedAt) < launchedAt - 1000) return;
      if (current.steps.length !== observedSteps) {
        observedSteps = current.steps.length;
        const latest = current.steps.at(-1);
        setProgress(db, job.id, Math.min(90, 10 + observedSteps * 11), "professional_master_progress", {
          step: latest?.id ?? "initializing", stepStatus: latest?.status ?? "running", passedSteps: observedSteps,
        });
      }
      if (existsSync(renderProgressPath)) {
        const render = JSON.parse(readFileSync(renderProgressPath, "utf8"));
        const fingerprint = String(render.updatedAt ?? render.completedAt ?? render.phase);
        if (fingerprint !== observedRenderUpdate) {
          observedRenderUpdate = fingerprint;
          const overallProgress = renderOverallProgress(render);
          db.prepare("update production_jobs set progress = max(progress, ?), updated_at = current_timestamp where id = ?").run(overallProgress, job.id);
          upsertJobMetric(db, job.id, render);
        }
      }
    } catch (error) {
      console.error("[professional-master] progress state could not be read", error);
    }
  };
  const timer = setInterval(observe, 5_000);
  const result = await new Promise((resolveChild, rejectChild) => {
    child.once("error", rejectChild);
    child.once("close", (code, signal) => resolveChild({ code, signal }));
  }).finally(() => clearInterval(timer));
  observe();
  if (result.code !== 0 || !existsSync(statePath)) {
    const detail = [stdout, stderr].filter(Boolean).join("\n").trim();
    throw new Error(`Professional master pipeline failed${detail ? `: ${detail.slice(-4000)}` : ""}`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.status !== "review_required" || !existsSync(state.masterPath) || !existsSync(state.qualityPath)) {
    throw new Error(`Professional master ended with unexpected status ${state.status}.`);
  }
  const quality = JSON.parse(readFileSync(state.qualityPath, "utf8"));
  writeQualityReport(db, job, quality);
  db.prepare(`
    update production_jobs
    set status = 'review_required', progress = 100,
      review_gate = 'editorial_factual_and_final_human_screening',
      output_manifest_json = ?, error_message = null, updated_at = current_timestamp
    where id = ?
  `).run(JSON.stringify({
    masterPath: state.masterPath, masterSha256: state.masterSha256,
    qualityPath: state.qualityPath, qualityScore: state.qualityScore,
    soundReportPath: state.soundReportPath, projectDirectory: state.projectDirectory,
  }), job.id);
  audit(db, job.id, "review_required", {
    reviewGate: "editorial_factual_and_final_human_screening", qualityScore: state.qualityScore,
  });
  return state;
}

async function processJob(db, job) {
  if (job.renderer === "research_ingest") return processResearchIngestJob(db, job);
  if (job.renderer === "editorial_blueprint") return processEditorialJob(db, job);
  if (job.renderer === "entertainment_pilot") return processEntertainmentPilotJob(db, job);
  if (job.renderer === "narration") return processNarrationJob(db, job);
  if (job.renderer === "hyperframes") return processHyperframesJob(db, job);
  if (job.renderer === "professional_master") return processProfessionalMasterJob(db, job);
  if (job.renderer === "comfyui_hyperframes") {
    return processComfyUiEntertainmentJob(db, job);
  }
  throw new Error(`Unsupported worker renderer ${job.renderer}.`);
}

async function runOnce(db, renderers) {
  const job = claimNextJob(db, renderers);
  if (!job) return { processed: false };
  try {
    const state = await processJob(db, job);
    return {
      processed: true,
      ok: true,
      jobId: job.id,
      status: state.status,
      renderer: job.renderer,
      episodeId: state.episodeId,
      ...(job.renderer === "narration"
        ? { durationSeconds: state.durationSeconds, segments: state.segments.length }
        : job.renderer === "entertainment_pilot"
          ? { durationSeconds: state.durationSeconds, shotCount: state.shotCount, qualityScore: state.qualityScore }
        : job.renderer === "hyperframes" || job.renderer === "professional_master"
          ? { durationSeconds: state.durationSeconds, sceneCount: state.sceneCount, checks: state.checks }
          : { qualityScore: state.qualityScore, qualityThreshold: state.qualityThreshold }),
    };
  } catch (error) {
    failJob(db, job.id, error);
    return {
      processed: true,
      ok: false,
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseWorkerOptions(argv) {
  const watch = argv.includes("--watch");
  const pollIndex = argv.indexOf("--poll-seconds");
  const pollSeconds = pollIndex >= 0 ? Number(argv[pollIndex + 1]) : 5;
  if (!Number.isFinite(pollSeconds) || pollSeconds < 1 || pollSeconds > 300) {
    throw new Error("--poll-seconds must be between 1 and 300.");
  }
  return { watch, pollSeconds };
}

async function main() {
  const options = parseWorkerOptions(process.argv.slice(2));
  const path = databasePath();
  if (!existsSync(path)) {
    throw new Error(`Media OS database does not exist: ${path}. Start the Studio once before the worker.`);
  }
  const db = new DatabaseSync(path);
  ensureTelemetrySchema(db);
  const workerId = randomUUID();
  const renderers = configuredWorkerRenderers();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const recovered = recoverStaleJobs(db, renderers);
    if (options.watch) {
      process.stdout.write(`${JSON.stringify({ workerId, status: "watching", pollSeconds: options.pollSeconds, renderers, recovered })}\n`);
    }
    do {
      const result = await runOnce(db, renderers);
      if (!options.watch || result.processed) {
        process.stdout.write(`${JSON.stringify({ workerId, recovered, ...result })}\n`);
      }
      if (result.processed && !result.ok && !options.watch) process.exitCode = 1;
      if (!options.watch || stopping) break;
      await new Promise((resolveWait) => setTimeout(resolveWait, options.pollSeconds * 1000));
    } while (!stopping);
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    db.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
