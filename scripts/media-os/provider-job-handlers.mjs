import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ensureTelemetrySchema, upsertJobMetric } from "./production-job-telemetry.mjs";
import { compileEntertainmentHyperframesProject } from "./entertainment-hyperframes-core.mjs";
import { loadChannelDesignSystems } from "./hyperframes-compiler-core.mjs";
import { copyNarrationMedia } from "./hyperframes-narration-media.mjs";
import { loadProductionMedia } from "./hyperframes-production-media.mjs";

function runNode(script, args) {
  return runNodeAt(script, args, resolve("."));
}

function runNodeAt(script, args, cwd) {
  const result = spawnSync(process.execPath, [resolve(script), ...args], {
    cwd, env: process.env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${script} failed${detail ? `: ${detail.slice(-4000)}` : ""}`);
  }
  return String(result.stdout ?? "").trim();
}

function audit(db, jobId, eventType, payload) {
  db.prepare("insert into audit_events (entity_type,entity_id,event_type,payload_json) values (?,?,?,?)")
    .run("production_job", jobId, eventType, JSON.stringify(payload));
}

function progress(db, jobId, value, phase, detail) {
  ensureTelemetrySchema(db);
  db.prepare("update production_jobs set progress=?,updated_at=current_timestamp where id=?").run(value, jobId);
  upsertJobMetric(db, jobId, { phase, detail });
  audit(db, jobId, phase, { detail });
}

export function processResearchIngestJob(db, job) {
  const evidencePath = resolve(`operations/${job.episode_id}/evidence-pack.json`);
  if (!existsSync(evidencePath)) throw new Error(`Evidence pack does not exist: ${evidencePath}`);
  const outputDirectory = resolve(`renders/research/${job.episode_id}`);
  progress(db, job.id, 15, "research_manifest_validated", evidencePath);
  runNode("scripts/run-research-ingest.mjs", [evidencePath, "--output", outputDirectory]);
  const manifestPath = resolve(outputDirectory, "research-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  progress(db, job.id, 85, "research_sources_hashed", `${manifest.documentCount} documents / ${manifest.claimCount} claims`);
  const insert = db.prepare(`
    insert into research_artifacts (id,episode_id,job_id,provider,source_url,content_path,content_sha256,claim_ids_json,retrieved_at)
    values (?,?,?,?,?,?,?,?,?) on conflict(job_id,source_url) do update set
      content_path=excluded.content_path,content_sha256=excluded.content_sha256,
      claim_ids_json=excluded.claim_ids_json,retrieved_at=excluded.retrieved_at
  `);
  for (const document of manifest.documents) {
    insert.run(randomUUID(), job.episode_id, job.id, manifest.provider, document.url, document.contentPath,
      document.contentSha256, JSON.stringify(document.claimIds), document.retrievedAt);
  }
  db.prepare(`update production_jobs set status='review_required',progress=100,
    review_gate='source_provenance_and_claim_locator_review',output_manifest_json=?,error_message=null,updated_at=current_timestamp where id=?`)
    .run(JSON.stringify({ manifestPath, documentCount: manifest.documentCount, claimCount: manifest.claimCount }), job.id);
  upsertJobMetric(db, job.id, { phase: "research_complete", detail: `${manifest.documentCount} authoritative documents retained` });
  audit(db, job.id, "review_required", { reviewGate: "source_provenance_and_claim_locator_review", manifestPath });
  return { status: "review_required", episodeId: job.episode_id, manifestPath, documentCount: manifest.documentCount };
}

export function processComfyUiAssetsJob(db, job) {
  const entertainmentManifest = resolve(`renders/entertainment/${job.episode_id}/visual-assets.json`);
  const manifestPath = existsSync(entertainmentManifest)
    ? entertainmentManifest
    : resolve(`operations/${job.episode_id}/visual-assets.json`);
  if (!existsSync(manifestPath)) throw new Error(`Visual asset manifest does not exist: ${manifestPath}`);
  const outputDirectory = resolve(`renders/visual-assets/${job.episode_id}`);
  progress(db, job.id, 12, "visual_asset_contract_validated", manifestPath);
  const args = [manifestPath, "--output", outputDirectory];
  if (process.env.MEDIA_OS_GPU_PROVIDER?.trim() === "vast") args.push("--provision-vast");
  runNode("scripts/run-comfyui-assets.mjs", args);
  const outputManifestPath = resolve(outputDirectory, "asset-manifest.json");
  const manifest = JSON.parse(readFileSync(outputManifestPath, "utf8"));
  const insert = db.prepare(`
    insert into generated_visual_assets (id,episode_id,job_id,scene_ordinal,provider,output_path,output_sha256,
      workflow_sha256,prompt_sha256,rights_json,provenance_json,cost_usd)
    values (?,?,?,?,?,?,?,?,?,?,?,?) on conflict(job_id,id) do update set
      output_path=excluded.output_path,output_sha256=excluded.output_sha256,cost_usd=excluded.cost_usd,provenance_json=excluded.provenance_json
  `);
  for (const asset of manifest.assets) {
    insert.run(asset.id, job.episode_id, job.id, asset.sceneOrdinal, asset.provider, asset.outputPath,
      asset.outputSha256, asset.workflowSha256, asset.promptSha256, JSON.stringify(asset.rights), JSON.stringify(asset), asset.costUsd);
  }
  const insertQuality = db.prepare(`
    insert into visual_asset_quality_reports (id,asset_id,episode_id,job_id,profile_id,status,score,report_json)
    values (?,?,?,?,?,?,?,?) on conflict(job_id,asset_id) do update set
      profile_id=excluded.profile_id,status=excluded.status,score=excluded.score,report_json=excluded.report_json
  `);
  for (const report of manifest.qualityReports ?? []) {
    const profileExists = db.prepare("select 1 from production_profiles where id=?").get(report.profileId);
    if (!profileExists) continue;
    insertQuality.run(randomUUID(), report.assetId, job.episode_id, job.id, report.profileId,
      report.status, report.score, JSON.stringify(report));
  }
  progress(db, job.id, 45, "visual_assets_verified", `${manifest.assets.length} assets / $${manifest.totalCostUsd.toFixed(3)}`);
  upsertJobMetric(db, job.id, { phase: "visual_assets_verified", detail: "Compiling generated assets into HyperFrames", costUsd: manifest.totalCostUsd });
  return { outputManifestPath, assetCount: manifest.assets.length, totalCostUsd: manifest.totalCostUsd };
}

function writeProject(directory, compiled, media) {
  for (const [relativePath, content] of Object.entries(compiled.files)) {
    const destination = resolve(directory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content, "utf8");
  }
  copyNarrationMedia(media, directory);
  for (const asset of media.visualAssets) {
    const destination = resolve(directory, asset.relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(asset.sourcePath, destination);
  }
}

export function processComfyUiEntertainmentJob(db, job) {
  const provider = processComfyUiAssetsJob(db, job);
  const entertainmentDirectory = resolve(`renders/entertainment/${job.episode_id}`);
  const planPath = resolve(entertainmentDirectory, "pilot-plan.json");
  const blueprintPath = resolve(`renders/editorial/${job.episode_id}/blueprint.json`);
  if (!existsSync(planPath) || !existsSync(blueprintPath)) {
    throw new Error(`GPU entertainment assembly requires a reviewed pilot plan and editorial blueprint for ${job.episode_id}.`);
  }
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const blueprint = JSON.parse(readFileSync(blueprintPath, "utf8"));
  const designs = loadChannelDesignSystems(resolve("config/channel-design-systems.json"));
  const design = designs.channels.find((candidate) => candidate.channelId === blueprint.channelId);
  if (!design) throw new Error(`No channel design system for ${blueprint.channelId}.`);
  const media = loadProductionMedia(blueprint);
  progress(db, job.id, 52, "entertainment_media_verified", `${media.visualAssets.length} generated assets verified`);
  const compiled = compileEntertainmentHyperframesProject({ plan, blueprint, design, media });
  const projectDirectory = resolve(`renders/hyperframes-projects/${job.episode_id}-entertainment-pilot`);
  writeProject(projectDirectory, compiled, media);
  const hyperframesCli = resolve("node_modules/hyperframes/dist/cli.js");
  for (const command of ["lint", "validate", "inspect"]) runNodeAt(hyperframesCli, [command], projectDirectory);
  progress(db, job.id, 68, "entertainment_hyperframes_verified", "lint / contrast / layout passed");
  const previewPath = resolve(`renders/masters/${job.episode_id}-entertainment-pilot.mp4`);
  const progressPath = resolve(entertainmentDirectory, "render-progress.json");
  runNode("scripts/render-hyperframes-safe.mjs", [projectDirectory, "--output", previewPath, "--workers", "2", "--progress-json", progressPath]);
  const qualityPath = `${previewPath}.quality.json`;
  runNode("scripts/inspect-rendered-master.mjs", [previewPath, "--target-duration", String(plan.durationSeconds), "--output", qualityPath]);
  const quality = JSON.parse(readFileSync(qualityPath, "utf8"));
  if (quality.status !== "pass") throw new Error(`Entertainment pilot render failed technical QC: ${quality.blockerIds?.join(", ") ?? "unknown"}`);
  db.prepare(`
    update creative_pilots set preview_ready=1,preview_path=?
    where episode_id=? and created_at=(select max(created_at) from creative_pilots where episode_id=?)
  `).run(previewPath, job.episode_id, job.episode_id);
  db.prepare(`
    update production_jobs set status='review_required',progress=100,
      review_gate='entertainment_pilot_visual_motion_and_retention_review',
      output_manifest_json=?,error_message=null,updated_at=current_timestamp where id=?
  `).run(JSON.stringify({
    previewPath, qualityPath, qualityScore: quality.score, projectDirectory,
    planPath, generatedVisualManifestPath: provider.outputManifestPath,
    generatedVisualCount: provider.assetCount, generatedVisualCostUsd: provider.totalCostUsd,
  }), job.id);
  upsertJobMetric(db, job.id, { phase: "entertainment_preview_ready", detail: `${plan.durationSeconds}s / ${plan.shots.length} shots / technical QC ${quality.score}`, costUsd: provider.totalCostUsd });
  audit(db, job.id, "review_required", { reviewGate: "entertainment_pilot_visual_motion_and_retention_review", previewPath, qualityScore: quality.score });
  return { status: "review_required", episodeId: job.episode_id, durationSeconds: plan.durationSeconds, sceneCount: plan.shots.length, checks: { lint: "pass", wcag: "pass", layoutInspection: "pass", renderedMaster: "pass" } };
}
