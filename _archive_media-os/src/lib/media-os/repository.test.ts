import { beforeAll, describe, expect, it } from "vitest";

let repository: typeof import("./repository");

beforeAll(async () => {
  process.env.MEDIA_OS_DATABASE_PATH = ":memory:";
  repository = await import("./repository");
});
describe("Media OS repository", () => {
  it("seeds bilingual channels with source-linked claims", () => {
    const snapshot = repository.getDashboardSnapshot();
    expect(snapshot.channels).toHaveLength(12);
    expect(snapshot.channels.filter((channel) => channel.language === "ja")).toHaveLength(6);
    expect(snapshot.channels.filter((channel) => channel.language === "en")).toHaveLength(6);
    expect(snapshot.episodes).toHaveLength(2);
    expect(snapshot.claims.every((claim) => claim.sourceUrl.startsWith("https://"))).toBe(true);
    expect(snapshot.claims.some((claim) => claim.status === "alleged")).toBe(true);
    expect(snapshot.claims.some((claim) => claim.status === "confirmed")).toBe(true);
    expect(snapshot.providerArtifacts).toEqual({
      researchDocuments: 0,
      generatedVisuals: 0,
      gpuCostUsd: 0,
      visualQualityPassed: 0,
      visualQualityBlocked: 0,
    });
    expect(snapshot.productionProfiles).toHaveLength(6);
    expect(snapshot.creativePilots).toEqual([]);
  });

  it("treats a 10-20 minute long-form video as the parent of social derivatives", () => {
    const snapshot = repository.getDashboardSnapshot();
    const master = snapshot.assets.find((asset) => asset.format === "longform");
    expect(master).toBeDefined();
    expect(master?.durationSeconds).toBeGreaterThanOrEqual(600);
    expect(master?.durationSeconds).toBeLessThanOrEqual(1200);
    expect(master?.parentAssetId).toBeNull();

    const derivatives = snapshot.assets.filter((asset) => asset.parentAssetId === master?.id);
    expect(derivatives.map((asset) => asset.platform)).toEqual(expect.arrayContaining([
      "youtube_watch",
      "youtube_shorts",
      "tiktok",
      "instagram_reels",
    ]));
    expect(derivatives.every((asset) => asset.sourceSegmentsJson !== "[]")).toBe(true);
  });

  it("queues HyperFrames compilation behind layout, contrast, and motion review", () => {
    const job = repository.queueProductionJob({
      episodeId: "episode-enron-ja",
      renderer: "hyperframes",
    });
    expect(job.status).toBe("queued");
    expect(job.progress).toBe(0);
    expect(job.reviewGate).toBe("professional_audiovisual_master_review");
  });

  it("queues narration behind rights, pronunciation, and sync review", () => {
    const job = repository.queueProductionJob({
      episodeId: "episode-enron-ja",
      renderer: "narration",
    });
    expect(job.status).toBe("queued");
    expect(job.reviewGate).toBe("voice_rights_pronunciation_and_caption_sync");
  });

  it("queues a long-form blueprint behind originality and policy review", () => {
    const job = repository.queueProductionJob({
      episodeId: "episode-enron-ja",
      renderer: "editorial_blueprint",
    });
    expect(job.status).toBe("queued");
    expect(job.reviewGate).toBe("originality_policy_and_structure_review");
  });

  it("queues a 90-second entertainment pilot before expensive master production", () => {
    const job = repository.queueProductionJob({ episodeId: "episode-enron-ja", renderer: "entertainment_pilot" });
    expect(job.status).toBe("queued");
    expect(job.reviewGate).toBe("fictional_host_style_and_90_second_direction_review");
  });

  it("queues research and GPU assets behind dedicated provenance gates", () => {
    const research = repository.queueProductionJob({ episodeId: "episode-enron-en", renderer: "research_ingest" });
    const visuals = repository.queueProductionJob({ episodeId: "episode-enron-en", renderer: "comfyui_hyperframes" });
    expect(research.reviewGate).toBe("source_provenance_and_claim_locator_review");
    expect(visuals.reviewGate).toBe("synthetic_asset_rights_and_visual_review");
  });

  it("rejects jobs for unknown episodes", () => {
    expect(() => repository.queueProductionJob({
      episodeId: "episode-missing",
      renderer: "hyperframes",
    })).toThrow("Episode not found");
  });

  it("unlocks master rendering only after an actual pilot preview is approved", async () => {
    const job = repository.queueProductionJob({ episodeId: "episode-enron-ja", renderer: "entertainment_pilot" });
    const { getDatabase } = await import("./database");
    getDatabase().prepare(`
      insert into creative_pilots (
        id,episode_id,job_id,format_family,duration_seconds,shot_count,avatar_share,presentation_share,
        visual_mode_count,asset_request_count,preview_ready,preview_path,render_ready,status,score,manifest_path,report_path
      ) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run("pilot-approval-test", "episode-enron-ja", job.id, "cinematic_investigator", 90, 19, 0.16, 0, 7, 13,
      1, "renders/masters/test-pilot.mp4", 0, "pass", 100, "pilot-plan.json", "creative-quality-report.json");
    const approved = repository.approveCreativePilot("episode-enron-ja");
    expect(approved.previewReady).toBe(true);
    expect(approved.renderReady).toBe(true);
    expect(repository.getDashboardSnapshot().jobs.find((candidate) => candidate.id === job.id)?.status).toBe("approved");
  });
});
