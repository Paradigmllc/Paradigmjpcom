import { describe, expect, it } from "vitest";
import {
  createReviewSignature,
  createSignedPilotReviewPath,
  createSignedReviewPath,
  isValidSignedPilotReviewRequest,
  isValidSignedReviewRequest,
  REVIEW_LINK_MAX_TTL_SECONDS,
} from "./review-signing";

const secret = "review-only-secret-that-is-at-least-32-characters";
const nowMs = Date.UTC(2026, 7, 3, 0, 0, 0);

describe("time-limited review links", () => {
  it("creates a file-scoped URL that validates before expiry", () => {
    const path = createSignedReviewPath("episode-enron-ja", { nowMs, ttlSeconds: 3600, secret });
    expect(path).not.toBeNull();
    const request = new Request(`https://media.example${path}`);
    expect(isValidSignedReviewRequest(request, "episode-enron-ja", { nowMs: nowMs + 1000, secret })).toBe(true);
    expect(isValidSignedReviewRequest(request, "episode-enron-en", { nowMs: nowMs + 1000, secret })).toBe(false);
  });

  it("rejects expired, tampered, and overlong links", () => {
    const expires = Math.floor(nowMs / 1000) + 60;
    const signature = createReviewSignature("episode-enron-ja", expires, secret);
    const valid = `https://media.example/api/review/masters/episode-enron-ja?expires=${expires}&signature=${signature}`;
    expect(isValidSignedReviewRequest(new Request(valid), "episode-enron-ja", { nowMs: nowMs + 61_000, secret })).toBe(false);
    expect(isValidSignedReviewRequest(new Request(`${valid}0`), "episode-enron-ja", { nowMs, secret })).toBe(false);
    expect(() => createSignedReviewPath("episode-enron-ja", { nowMs, ttlSeconds: REVIEW_LINK_MAX_TTL_SECONDS + 1, secret })).toThrow();
  });

  it("keeps pilot links isolated from long-form master links", () => {
    const path = createSignedPilotReviewPath("episode-enron-ja", { nowMs, ttlSeconds: 3600, secret });
    expect(path).toContain("/api/review/pilots/episode-enron-ja");
    const request = new Request(`https://media.example${path}`);
    expect(isValidSignedPilotReviewRequest(request, "episode-enron-ja", { nowMs: nowMs + 1000, secret })).toBe(true);
    expect(isValidSignedReviewRequest(request, "episode-enron-ja", { nowMs: nowMs + 1000, secret })).toBe(false);
  });
});
