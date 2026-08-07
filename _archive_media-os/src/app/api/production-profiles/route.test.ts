import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("production profile API", () => {
  it("exposes workflow readiness without exposing environment values", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profiles).toHaveLength(6);
    expect(body.profiles.find((profile: { id: string }) => profile.id === "realistic_host")).toMatchObject({
      workflowReady: false,
      productionReady: false,
    });
    expect(JSON.stringify(body)).not.toContain("MEDIA_OS_REALISTIC_HOST_WORKFLOW_PATH=");
  });
});
