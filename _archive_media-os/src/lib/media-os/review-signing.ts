import { createHmac, timingSafeEqual } from "node:crypto";

export const REVIEW_LINK_MAX_TTL_SECONDS = 7 * 24 * 60 * 60;

function validSecret(value: string | undefined): value is string {
  return Boolean(value && value.length >= 32);
}

function payload(episodeId: string, expires: number): string {
  return `review-master:${episodeId}:${expires}`;
}

function pilotPayload(episodeId: string, expires: number): string {
  return `review-pilot:${episodeId}:${expires}`;
}

function signatureFor(value: string, secret: string): string {
  if (!validSecret(secret)) throw new Error("MEDIA_OS_REVIEW_SIGNING_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createReviewSignature(episodeId: string, expires: number, secret: string): string {
  if (!Number.isSafeInteger(expires) || expires <= 0) throw new Error("Review-link expiry must be a positive integer.");
  return signatureFor(payload(episodeId, expires), secret);
}

export function createPilotReviewSignature(episodeId: string, expires: number, secret: string): string {
  if (!Number.isSafeInteger(expires) || expires <= 0) throw new Error("Review-link expiry must be a positive integer.");
  return signatureFor(pilotPayload(episodeId, expires), secret);
}

function signedReviewPath(
  episodeId: string,
  scope: "masters" | "pilots",
  signer: typeof createReviewSignature,
  options: { nowMs?: number; ttlSeconds?: number; secret?: string },
): string | null {
  const secret = options.secret ?? process.env.MEDIA_OS_REVIEW_SIGNING_SECRET?.trim();
  if (!validSecret(secret)) return null;
  const ttlSeconds = options.ttlSeconds ?? REVIEW_LINK_MAX_TTL_SECONDS;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > REVIEW_LINK_MAX_TTL_SECONDS) {
    throw new Error(`Review-link TTL must be between 1 and ${REVIEW_LINK_MAX_TTL_SECONDS} seconds.`);
  }
  const expires = Math.floor((options.nowMs ?? Date.now()) / 1000) + ttlSeconds;
  const signature = signer(episodeId, expires, secret);
  return `/api/review/${scope}/${encodeURIComponent(episodeId)}?expires=${expires}&signature=${signature}`;
}

export function createSignedReviewPath(
  episodeId: string,
  options: { nowMs?: number; ttlSeconds?: number; secret?: string } = {},
): string | null {
  return signedReviewPath(episodeId, "masters", createReviewSignature, options);
}

export function createSignedPilotReviewPath(
  episodeId: string,
  options: { nowMs?: number; ttlSeconds?: number; secret?: string } = {},
): string | null {
  return signedReviewPath(episodeId, "pilots", createPilotReviewSignature, options);
}

function validSignedRequest(
  request: Request,
  episodeId: string,
  signer: typeof createReviewSignature,
  options: { nowMs?: number; secret?: string },
): boolean {
  const secret = options.secret ?? process.env.MEDIA_OS_REVIEW_SIGNING_SECRET?.trim();
  if (!validSecret(secret)) return false;
  const url = new URL(request.url);
  const expiresValue = url.searchParams.get("expires");
  const signature = url.searchParams.get("signature");
  if (!expiresValue || !signature || !/^\d+$/.test(expiresValue) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expires = Number(expiresValue);
  const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
  if (!Number.isSafeInteger(expires) || expires <= nowSeconds || expires > nowSeconds + REVIEW_LINK_MAX_TTL_SECONDS) return false;
  const expected = signer(episodeId, expires, secret);
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export function isValidSignedReviewRequest(
  request: Request,
  episodeId: string,
  options: { nowMs?: number; secret?: string } = {},
): boolean {
  return validSignedRequest(request, episodeId, createReviewSignature, options);
}

export function isValidSignedPilotReviewRequest(
  request: Request,
  episodeId: string,
  options: { nowMs?: number; secret?: string } = {},
): boolean {
  return validSignedRequest(request, episodeId, createPilotReviewSignature, options);
}
