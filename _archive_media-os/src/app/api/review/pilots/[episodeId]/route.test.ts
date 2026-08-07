import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/media-os/auth", () => ({ isAuthorizedRequest: () => false }));
import { GET } from "./route";

describe("entertainment pilot review endpoint", () => {
  it("rejects unknown episodes before touching storage", async () => {
    const response = await GET(new Request("https://media.example/api/review/pilots/unknown"), {
      params: Promise.resolve({ episodeId: "unknown" }),
    });
    expect(response.status).toBe(404);
  });

  it("requires authentication or a pilot-scoped signature", async () => {
    const response = await GET(new Request("https://media.example/api/review/pilots/episode-enron-ja"), {
      params: Promise.resolve({ episodeId: "episode-enron-ja" }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });
});
