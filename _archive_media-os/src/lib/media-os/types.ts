export const claimStatuses = [
  "confirmed",
  "alleged",
  "disputed",
  "hypothesis",
  "dramatized",
  "rejected",
] as const;

export type ClaimStatus = (typeof claimStatuses)[number];

export const episodeStatuses = [
  "research",
  "script",
  "storyboard",
  "rendering",
  "review",
  "approved",
  "published",
  "blocked",
] as const;

export type EpisodeStatus = (typeof episodeStatuses)[number];

export const jobStatuses = [
  "queued",
  "running",
  "review_required",
  "approved",
  "failed",
  "cancelled",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const distributionPlatforms = [
  "youtube_watch",
  "youtube_shorts",
  "tiktok",
  "instagram_reels",
] as const;

export type DistributionPlatform = (typeof distributionPlatforms)[number];

export const assetFormats = ["longform", "summary", "highlight", "teaser"] as const;

export type AssetFormat = (typeof assetFormats)[number];

export const distributionStatuses = [
  "planned",
  "rendering",
  "review_required",
  "approved",
  "published",
  "blocked",
] as const;

export type DistributionStatus = (typeof distributionStatuses)[number];

export interface ChannelRecord {
  id: string;
  slug: string;
  name: string;
  language: "ja" | "en";
  format: string;
  status: "incubating" | "scaling" | "paused";
}
export interface EpisodeSummary {
  id: string;
  channelId: string;
  title: string;
  language: "ja" | "en";
  status: EpisodeStatus;
  riskLevel: "low" | "medium" | "high";
  claimCount: number;
  sourceCount: number;
  confirmedCount: number;
  allegedCount: number;
}

export interface ClaimRecord {
  id: string;
  episodeId: string;
  statement: string;
  status: ClaimStatus;
  sourceTitle: string;
  sourceUrl: string;
  locator: string;
}

export interface ProductionJob {
  id: string;
  episodeId: string;
  renderer: string;
  status: JobStatus;
  progress: number;
  reviewGate: string;
  errorMessage: string | null;
  createdAt: string;
  phase: string | null;
  detail: string | null;
  completedUnits: number | null;
  totalUnits: number | null;
  elapsedSeconds: number | null;
  estimatedRemainingSeconds: number | null;
  freeDiskGiB: number | null;
  estimatedRequiredGiB: number | null;
  costUsd: number;
}

export const productionRenderers = [
  "research_ingest",
  "editorial_blueprint",
  "entertainment_pilot",
  "narration",
  "hyperframes",
  "professional_master",
  "comfyui_hyperframes",
] as const;

export type ProductionRenderer = (typeof productionRenderers)[number];

export interface QualityReportSummary {
  id: string;
  episodeId: string;
  jobId: string;
  gateVersion: string;
  status: "pass" | "blocked";
  score: number;
  threshold: number;
  nearestPeerSimilarity: number | null;
  kind: "editorial" | "creative_plan" | "professional_render";
  blockerIds: string[];
  categoryScores: Record<string, number>;
  createdAt: string;
}

export interface CreativePilotSummary {
  id: string;
  episodeId: string;
  jobId: string;
  formatFamily: string;
  durationSeconds: number;
  shotCount: number;
  avatarShare: number;
  presentationShare: number;
  visualModeCount: number;
  assetRequestCount: number;
  previewReady: boolean;
  previewPath: string | null;
  renderReady: boolean;
  status: "pass" | "blocked";
  score: number;
  manifestPath: string;
  createdAt: string;
}

export interface ProductionProfileSummary {
  id: string;
  registryVersion: string;
  label: string;
  outputKind: "image" | "video" | "composition";
  compositingRole: string;
  readiness: "production" | "preview" | "blocked";
  generator: string;
  visualModes: string[];
  requiredCapabilities: string[];
  workflowReady: boolean;
  productionReady: boolean;
  blocker: string | null;
}

export interface DistributionAsset {
  id: string;
  episodeId: string;
  parentAssetId: string | null;
  platform: DistributionPlatform;
  format: AssetFormat;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSeconds: number;
  editor: "hyperframes" | "ffmpeg" | "opencut";
  captionMode: "none" | "burned_in" | "sidecar";
  status: DistributionStatus;
  sourceSegmentsJson: string;
  outputPath: string | null;
}

export interface DashboardSnapshot {
  channels: ChannelRecord[];
  episodes: EpisodeSummary[];
  claims: ClaimRecord[];
  jobs: ProductionJob[];
  qualityReports: QualityReportSummary[];
  creativePilots: CreativePilotSummary[];
  productionProfiles: ProductionProfileSummary[];
  assets: DistributionAsset[];
  readiness: Array<{ name: string; ready: boolean; detail: string }>;
  providerArtifacts: {
    researchDocuments: number;
    generatedVisuals: number;
    gpuCostUsd: number;
    visualQualityPassed: number;
    visualQualityBlocked: number;
  };
}
