import { join } from "node:path";
import { isAuthorizedRequest } from "../../../../../lib/media-os/auth";
import { isValidSignedPilotReviewRequest } from "../../../../../lib/media-os/review-signing";
import { streamReviewFile } from "../../../../../lib/media-os/review-stream";

const REVIEW_PILOT_FILENAMES = {
  "episode-enron-ja": "episode-enron-ja-entertainment-pilot.mp4",
  "episode-enron-en": "episode-enron-en-entertainment-pilot.mp4",
} as const;

type ReviewEpisodeId = keyof typeof REVIEW_PILOT_FILENAMES;

function isReviewEpisodeId(value: string): value is ReviewEpisodeId {
  return Object.hasOwn(REVIEW_PILOT_FILENAMES, value);
}

function reviewPath(episodeId: ReviewEpisodeId): string {
  const filename = REVIEW_PILOT_FILENAMES[episodeId];
  if (process.env.NODE_ENV === "production") return `/app/renders/masters/${filename}`;
  return join(process.cwd(), "renders", "masters", filename);
}

function unauthorized(): Response {
  return Response.json(
    { ok: false, error: "Unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": 'Basic realm="YouTube Media OS", charset="UTF-8"' } },
  );
}

async function servePilot(
  request: Request,
  context: { params: Promise<{ episodeId: string }> },
  headOnly: boolean,
): Promise<Response> {
  const { episodeId } = await context.params;
  if (!isReviewEpisodeId(episodeId)) return Response.json({ ok: false, error: "Review pilot not found" }, { status: 404 });
  if (!isAuthorizedRequest(request) && !isValidSignedPilotReviewRequest(request, episodeId)) return unauthorized();
  try {
    return await streamReviewFile(reviewPath(episodeId), REVIEW_PILOT_FILENAMES[episodeId], request.headers.get("range"), headOnly);
  } catch (error) {
    const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
    console.error("[review-pilot] stream failed", { episodeId, notFound, error });
    return Response.json({ ok: false, error: notFound ? "Review pilot not found" : "Review pilot could not be streamed" }, { status: notFound ? 404 : 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  return servePilot(request, context, false);
}

export async function HEAD(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  return servePilot(request, context, true);
}
