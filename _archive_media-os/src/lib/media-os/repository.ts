import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import { loadProductionProfileSummaries } from "./production-profile-repository";
import type {
  ChannelRecord,
  ClaimRecord,
  CreativePilotSummary,
  DashboardSnapshot,
  DistributionAsset,
  EpisodeSummary,
  ProductionJob,
  ProductionRenderer,
  QualityReportSummary,
} from "./types";

interface ChannelRow {
  id: string;
  slug: string;
  name: string;
  language: "ja" | "en";
  format: string;
  status: "incubating" | "scaling" | "paused";
}
interface EpisodeRow {
  id: string;
  channel_id: string;
  title: string;
  language: "ja" | "en";
  status: EpisodeSummary["status"];
  risk_level: EpisodeSummary["riskLevel"];
  claim_count: number;
  source_count: number;
  confirmed_count: number;
  alleged_count: number;
}

interface ClaimRow {
  id: string;
  episode_id: string;
  statement: string;
  status: ClaimRecord["status"];
  source_title: string;
  source_url: string;
  locator: string;
}

interface JobRow {
  id: string;
  episode_id: string;
  renderer: string;
  status: ProductionJob["status"];
  progress: number;
  review_gate: string;
  error_message: string | null;
  created_at: string;
  phase: string | null;
  detail: string | null;
  completed_units: number | null;
  total_units: number | null;
  elapsed_seconds: number | null;
  estimated_remaining_seconds: number | null;
  free_disk_gib: number | null;
  estimated_required_gib: number | null;
  cost_usd: number | null;
}

interface DistributionAssetRow {
  id: string;
  episode_id: string;
  parent_asset_id: string | null;
  platform: DistributionAsset["platform"];
  format: DistributionAsset["format"];
  aspect_ratio: DistributionAsset["aspectRatio"];
  duration_seconds: number;
  editor: DistributionAsset["editor"];
  caption_mode: DistributionAsset["captionMode"];
  status: DistributionAsset["status"];
  source_segments_json: string;
  output_path: string | null;
}

interface QualityReportRow {
  id: string;
  episode_id: string;
  job_id: string;
  gate_version: string;
  status: QualityReportSummary["status"];
  score: number;
  threshold: number;
  nearest_peer_similarity: number | null;
  report_json: string;
  created_at: string;
}

interface CreativePilotRow {
  id: string;
  episode_id: string;
  job_id: string;
  format_family: string;
  duration_seconds: number;
  shot_count: number;
  avatar_share: number;
  presentation_share: number;
  visual_mode_count: number;
  asset_request_count: number;
  preview_ready: number;
  preview_path: string | null;
  render_ready: number;
  status: CreativePilotSummary["status"];
  score: number;
  manifest_path: string;
  created_at: string;
}

function qualityDetails(value: string): Pick<QualityReportSummary, "kind" | "blockerIds" | "categoryScores"> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Quality report must be an object.");
    const report = parsed as Record<string, unknown>;
    const blockers = Array.isArray(report.blockers) ? report.blockers : [];
    const structuredBlockerIds = blockers.flatMap((blocker) => {
      if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) return [];
      const id = (blocker as Record<string, unknown>).id;
      return typeof id === "string" ? [id] : [];
    });
    const directBlockerIds = Array.isArray(report.blockerIds)
      ? report.blockerIds.filter((id): id is string => typeof id === "string")
      : [];
    const rawScores = report.scores;
    const categoryScores: Record<string, number> = {};
    if (rawScores && typeof rawScores === "object" && !Array.isArray(rawScores)) {
      for (const [key, score] of Object.entries(rawScores)) {
        if (typeof score === "number" && Number.isFinite(score)) categoryScores[key] = score;
      }
    }
    const kind = report.kind === "creative_plan"
      ? "creative_plan"
      : ["professional_render", "rendered_master"].includes(String(report.kind))
        ? "professional_render"
        : "editorial";
    return {
      kind,
      blockerIds: [...new Set([...structuredBlockerIds, ...directBlockerIds])],
      categoryScores,
    };
  } catch (error) {
    console.error("[media-os-quality] Invalid quality report JSON", error);
    return { kind: "editorial", blockerIds: ["invalid_quality_report"], categoryScores: {} };
  }
}

function providerReadiness() {
  const configured = (name: string): boolean => Boolean(process.env[name]?.trim());
  const ffmpegCandidates = [
    process.env.FFMPEG_PATH?.trim(),
    process.env.LOCALAPPDATA
      ? resolve(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Links", "ffmpeg.exe")
      : undefined,
    "/usr/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
  ].filter((value): value is string => Boolean(value));
  const voicePythonCandidates = [
    process.env.MEDIA_OS_VOICE_PYTHON?.trim(),
    resolve(process.cwd(), ".cache/voice-runtime/Scripts/python.exe"),
    resolve(process.cwd(), ".cache/voice-runtime/bin/python"),
    "/opt/voice-runtime/bin/python",
  ].filter((value): value is string => Boolean(value));
  const voiceRuntimeReady = voicePythonCandidates.some((candidate) => existsSync(candidate));
  const voiceModelsReady = process.env.NODE_ENV !== "production"
    || existsSync(resolve(process.env.XDG_CACHE_HOME?.trim() || resolve(process.cwd(), ".cache"), "voice-runtime-ready.json"));
  return [
    {
      name: "HyperFrames local",
      ready: existsSync(resolve(process.cwd(), "node_modules/.bin/hyperframes.cmd")),
      detail: "Deterministic HTML-to-video renderer",
    },
    {
      name: "Local voice + alignment",
      ready: voiceRuntimeReady && voiceModelsReady,
      detail: "Rights-reviewed Kokoro stock voices with Faster Whisper back-transcription",
    },
    {
      name: "FFmpeg derivatives",
      ready: ffmpegCandidates.some((candidate) => existsSync(candidate)),
      detail: "Deterministic trims, reframing, captions, encoding, and media validation",
    },
    {
      name: "OpenCut editor",
      ready: configured("OPENCUT_API_URL"),
      detail: "Optional edit-decision interface; FFmpeg remains the final renderer",
    },
    { name: "Crawl4AI", ready: configured("CRAWL4AI_API_URL"), detail: "Optional research ingestion" },
    { name: "Steel Browser", ready: configured("STEEL_API_URL"), detail: "Optional browser automation" },
    {
      name: "ComfyUI + Vast.ai",
      ready: configured("COMFYUI_API_URL") || (configured("VAST_API_KEY") && configured("VAST_OFFER_ID") && configured("VAST_COMFYUI_IMAGE") && configured("VAST_COMFYUI_URL_TEMPLATE")),
      detail: "Workflow-hashed visual generation with rights metadata, cost accounting, and guaranteed Vast teardown",
    },
    {
      name: "YouTube publisher",
      ready: configured("YOUTUBE_CLIENT_ID") && configured("YOUTUBE_CLIENT_SECRET"),
      detail: "Disabled until every human review gate passes",
    },
  ];
}

export function getDashboardSnapshot(): DashboardSnapshot {
  const db = getDatabase();
  const channelRows = db.prepare("select id,slug,name,language,format,status from channels order by language desc").all() as unknown as ChannelRow[];
  const episodeRows = db.prepare(`
    select e.id, e.channel_id, e.title, e.language, e.status, e.risk_level,
      count(distinct c.id) as claim_count,
      count(distinct c.source_id) as source_count,
      sum(case when c.status = 'confirmed' then 1 else 0 end) as confirmed_count,
      sum(case when c.status = 'alleged' then 1 else 0 end) as alleged_count
    from episodes e
    left join claims c on c.episode_id = e.id
    group by e.id
    order by e.language desc
  `).all() as unknown as EpisodeRow[];
  const claimRows = db.prepare(`
    select c.id, c.episode_id, c.statement, c.status, s.title as source_title,
      s.url as source_url, c.locator
    from claims c join sources s on s.id = c.source_id
    order by c.episode_id, c.created_at
  `).all() as unknown as ClaimRow[];
  const jobRows = db.prepare(`
    select j.id,j.episode_id,j.renderer,j.status,j.progress,j.review_gate,j.error_message,j.created_at,
      m.phase,m.detail,m.completed_units,m.total_units,m.elapsed_seconds,
      m.estimated_remaining_seconds,m.free_disk_gib,m.estimated_required_gib,m.cost_usd
    from production_jobs j left join production_job_metrics m on m.job_id = j.id
    order by j.created_at desc limit 20
  `).all() as unknown as JobRow[];
  const assetRows = db.prepare(`
    select id,episode_id,parent_asset_id,platform,format,aspect_ratio,duration_seconds,
      editor,caption_mode,status,source_segments_json,output_path
    from distribution_assets
    order by episode_id, case when format = 'longform' then 0 else 1 end, platform, duration_seconds desc
  `).all() as unknown as DistributionAssetRow[];
  const qualityRows = db.prepare(`
    select id,episode_id,job_id,gate_version,status,score,threshold,nearest_peer_similarity,report_json,created_at
    from episode_quality_reports order by created_at desc limit 40
  `).all() as unknown as QualityReportRow[];
  const creativePilotRows = db.prepare(`
    select id,episode_id,job_id,format_family,duration_seconds,shot_count,avatar_share,
      presentation_share,visual_mode_count,asset_request_count,preview_ready,preview_path,render_ready,status,score,manifest_path,created_at
    from creative_pilots order by created_at desc limit 40
  `).all() as unknown as CreativePilotRow[];
  const productionProfiles = loadProductionProfileSummaries(db);
  const artifactCounts = db.prepare(`
    select
      (select count(*) from research_artifacts) as research_documents,
      (select count(*) from generated_visual_assets) as generated_visuals,
      (select coalesce(sum(cost_usd),0) from generated_visual_assets) as gpu_cost_usd,
      (select count(*) from visual_asset_quality_reports where status='pass') as visual_quality_passed,
      (select count(*) from visual_asset_quality_reports where status='blocked') as visual_quality_blocked
  `).get() as { research_documents: number; generated_visuals: number; gpu_cost_usd: number; visual_quality_passed: number; visual_quality_blocked: number };

  const channels: ChannelRecord[] = channelRows.map((row) => row);
  const episodes: EpisodeSummary[] = episodeRows.map((row) => ({
    id: row.id,
    channelId: row.channel_id,
    title: row.title,
    language: row.language,
    status: row.status,
    riskLevel: row.risk_level,
    claimCount: Number(row.claim_count),
    sourceCount: Number(row.source_count),
    confirmedCount: Number(row.confirmed_count),
    allegedCount: Number(row.alleged_count),
  }));
  const claims: ClaimRecord[] = claimRows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    statement: row.statement,
    status: row.status,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    locator: row.locator,
  }));
  const jobs: ProductionJob[] = jobRows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    renderer: row.renderer,
    status: row.status,
    progress: Number(row.progress),
    reviewGate: row.review_gate,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    phase: row.phase,
    detail: row.detail,
    completedUnits: row.completed_units === null ? null : Number(row.completed_units),
    totalUnits: row.total_units === null ? null : Number(row.total_units),
    elapsedSeconds: row.elapsed_seconds === null ? null : Number(row.elapsed_seconds),
    estimatedRemainingSeconds: row.estimated_remaining_seconds === null ? null : Number(row.estimated_remaining_seconds),
    freeDiskGiB: row.free_disk_gib === null ? null : Number(row.free_disk_gib),
    estimatedRequiredGiB: row.estimated_required_gib === null ? null : Number(row.estimated_required_gib),
    costUsd: row.cost_usd === null ? 0 : Number(row.cost_usd),
  }));
  const assets: DistributionAsset[] = assetRows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    parentAssetId: row.parent_asset_id,
    platform: row.platform,
    format: row.format,
    aspectRatio: row.aspect_ratio,
    durationSeconds: Number(row.duration_seconds),
    editor: row.editor,
    captionMode: row.caption_mode,
    status: row.status,
    sourceSegmentsJson: row.source_segments_json,
    outputPath: row.output_path,
  }));
  const qualityReports: QualityReportSummary[] = qualityRows.map((row) => {
    const detail = qualityDetails(row.report_json);
    return {
      id: row.id,
      episodeId: row.episode_id,
      jobId: row.job_id,
      gateVersion: row.gate_version,
      status: row.status,
      score: Number(row.score),
      threshold: Number(row.threshold),
      nearestPeerSimilarity: row.nearest_peer_similarity === null ? null : Number(row.nearest_peer_similarity),
      ...detail,
      createdAt: row.created_at,
    };
  });
  const creativePilots: CreativePilotSummary[] = creativePilotRows.map((row) => ({
    id: row.id,
    episodeId: row.episode_id,
    jobId: row.job_id,
    formatFamily: row.format_family,
    durationSeconds: Number(row.duration_seconds),
    shotCount: Number(row.shot_count),
    avatarShare: Number(row.avatar_share),
    presentationShare: Number(row.presentation_share),
    visualModeCount: Number(row.visual_mode_count),
    assetRequestCount: Number(row.asset_request_count),
    previewReady: Boolean(row.preview_ready),
    previewPath: row.preview_path,
    renderReady: Boolean(row.render_ready),
    status: row.status,
    score: Number(row.score),
    manifestPath: row.manifest_path,
    createdAt: row.created_at,
  }));
  return {
    channels, episodes, claims, jobs, qualityReports, creativePilots, productionProfiles, assets, readiness: providerReadiness(),
    providerArtifacts: {
      researchDocuments: Number(artifactCounts.research_documents),
      generatedVisuals: Number(artifactCounts.generated_visuals),
      gpuCostUsd: Number(artifactCounts.gpu_cost_usd),
      visualQualityPassed: Number(artifactCounts.visual_quality_passed),
      visualQualityBlocked: Number(artifactCounts.visual_quality_blocked),
    },
  };
}

export function queueProductionJob(input: {
  episodeId: string;
  renderer: ProductionRenderer;
}): ProductionJob {
  const db = getDatabase();
  const episode = db.prepare("select id from episodes where id = ?").get(input.episodeId);
  if (!episode) throw new Error("Episode not found");
  const id = randomUUID();
  const reviewGate = input.renderer === "narration"
    ? "voice_rights_pronunciation_and_caption_sync"
    : input.renderer === "editorial_blueprint"
      ? "originality_policy_and_structure_review"
      : input.renderer === "entertainment_pilot"
        ? "fictional_host_style_and_90_second_direction_review"
      : input.renderer === "hyperframes"
        ? "professional_audiovisual_master_review"
        : input.renderer === "professional_master"
          ? "editorial_factual_and_final_human_screening"
          : input.renderer === "research_ingest"
            ? "source_provenance_and_claim_locator_review"
            : input.renderer === "comfyui_hyperframes"
              ? "synthetic_asset_rights_and_visual_review"
              : "factual_and_visual_review";
  db.prepare(
    "insert into production_jobs (id,episode_id,renderer,status,progress,review_gate) values (?,?,?,?,?,?)",
  ).run(id, input.episodeId, input.renderer, "queued", 0, reviewGate);
  db.prepare(
    "insert into audit_events (entity_type,entity_id,event_type,payload_json) values (?,?,?,?)",
  ).run("production_job", id, "queued", JSON.stringify({ renderer: input.renderer }));
  const row = db.prepare(`
    select j.id,j.episode_id,j.renderer,j.status,j.progress,j.review_gate,j.error_message,j.created_at,
      m.phase,m.detail,m.completed_units,m.total_units,m.elapsed_seconds,
      m.estimated_remaining_seconds,m.free_disk_gib,m.estimated_required_gib,m.cost_usd
    from production_jobs j left join production_job_metrics m on m.job_id = j.id where j.id = ?
  `).get(id) as unknown as JobRow;
  return {
    id: row.id,
    episodeId: row.episode_id,
    renderer: row.renderer,
    status: row.status,
    progress: Number(row.progress),
    reviewGate: row.review_gate,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    phase: row.phase,
    detail: row.detail,
    completedUnits: row.completed_units === null ? null : Number(row.completed_units),
    totalUnits: row.total_units === null ? null : Number(row.total_units),
    elapsedSeconds: row.elapsed_seconds === null ? null : Number(row.elapsed_seconds),
    estimatedRemainingSeconds: row.estimated_remaining_seconds === null ? null : Number(row.estimated_remaining_seconds),
    freeDiskGiB: row.free_disk_gib === null ? null : Number(row.free_disk_gib),
    estimatedRequiredGiB: row.estimated_required_gib === null ? null : Number(row.estimated_required_gib),
    costUsd: row.cost_usd === null ? 0 : Number(row.cost_usd),
  };
}

export function approveCreativePilot(episodeId: string): CreativePilotSummary {
  const db = getDatabase();
  const pilot = db.prepare(`
    select id,job_id from creative_pilots
    where episode_id=? and status='pass' and preview_ready=1
    order by created_at desc limit 1
  `).get(episodeId) as { id: string; job_id: string } | undefined;
  if (!pilot) throw new Error("Rendered entertainment pilot not found");
  db.exec("begin immediate");
  try {
    db.prepare("update creative_pilots set render_ready=1 where id=?").run(pilot.id);
    db.prepare("update production_jobs set status='approved',updated_at=current_timestamp where id=?").run(pilot.job_id);
    db.prepare("insert into audit_events (entity_type,entity_id,event_type,payload_json) values (?,?,?,?)")
      .run("creative_pilot", pilot.id, "approved", JSON.stringify({ episodeId, gate: "entertainment_pilot_visual_motion_and_retention_review" }));
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    console.error("[creative-pilot] approval transaction failed", error);
    throw error;
  }
  const summary = getDashboardSnapshot().creativePilots.find((candidate) => candidate.id === pilot.id);
  if (!summary) throw new Error("Approved entertainment pilot could not be loaded");
  return summary;
}
