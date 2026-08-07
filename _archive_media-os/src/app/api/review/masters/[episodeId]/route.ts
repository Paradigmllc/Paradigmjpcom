import { join } from "node:path";
import { isAuthorizedRequest } from "../../../../../lib/media-os/auth";
import { isValidSignedReviewRequest } from "../../../../../lib/media-os/review-signing";
import { streamReviewFile } from "../../../../../lib/media-os/review-stream";

export { parseByteRange, streamReviewFile } from "../../../../../lib/media-os/review-stream";

const REVIEW_MASTER_FILENAMES = {
  "episode-enron-ja": "episode-enron-ja-professional-master.mp4",
  "episode-enron-en": "episode-enron-en-professional-master.mp4",
} as const;

type ReviewEpisodeId = keyof typeof REVIEW_MASTER_FILENAMES;

function isReviewEpisodeId(value: string): value is ReviewEpisodeId {
  return Object.hasOwn(REVIEW_MASTER_FILENAMES, value);
}

function reviewPath(episodeId: ReviewEpisodeId): string {
  const filename = REVIEW_MASTER_FILENAMES[episodeId];
  if (process.env.NODE_ENV === "production") return `/app/renders/masters/${filename}`;
  return join(process.cwd(), "renders", "masters", filename);
}

function unauthorized(): Response {
  return Response.json(
    { ok: false, error: "Unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": 'Basic realm="YouTube Media OS", charset="UTF-8"' } },
  );
}

function errorStatus(error: unknown): number {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT" ? 404 : 500;
}

async function serveMaster(
  request: Request,
  context: { params: Promise<{ episodeId: string }> },
  headOnly: boolean,
): Promise<Response> {
  const { episodeId } = await context.params;
  if (!isReviewEpisodeId(episodeId)) return Response.json({ ok: false, error: "Review master not found" }, { status: 404 });
  if (!isAuthorizedRequest(request) && !isValidSignedReviewRequest(request, episodeId)) return unauthorized();

  const path = reviewPath(episodeId);
  try {
    return await streamReviewFile(path, REVIEW_MASTER_FILENAMES[episodeId], request.headers.get("range"), headOnly);
  } catch (error) {
    const status = errorStatus(error);
    console.error("[review-master] stream failed", { episodeId, status, error });
    return Response.json(
      { ok: false, error: status === 404 ? "Review master not found" : "Review master could not be streamed" },
      { status },
    );
  }
}

export async function GET(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  return serveMaster(request, context, false);
}

export async function HEAD(request: Request, context: { params: Promise<{ episodeId: string }> }) {
  return serveMaster(request, context, true);
}
