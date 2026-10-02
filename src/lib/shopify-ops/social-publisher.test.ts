import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { publishSocialPost } from "./social-publisher";
const input = {
  platform: "pinterest" as const,
  caption: "Verified item",
  mediaUrl: "https://example.com/photo.jpg",
  destinationUrl: "https://sericia.com/products/item",
};
beforeEach(() => {
  vi.stubEnv("PINTEREST_ACCESS_TOKEN", "fixture");
  vi.stubEnv("PINTEREST_BOARD_ID", "fixture");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("does not retry uncertain publishing network errors", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("network timeout"));
  vi.stubGlobal("fetch", fetch);
  await expect(publishSocialPost(input)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("does not retry provider 503 responses", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  await expect(publishSocialPost(input)).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("requires a provider receipt before reporting publication", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  await expect(publishSocialPost(input)).rejects.toThrow("Pin ID");
});
it("returns the actual provider receipt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ id: "123" })),
  );
  expect(await publishSocialPost(input)).toEqual({
    externalPostId: "123",
    postUrl: "https://www.pinterest.com/pin/123/",
  });
});
