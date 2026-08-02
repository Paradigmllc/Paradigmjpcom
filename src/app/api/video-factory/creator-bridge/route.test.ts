import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { safeCreatorArtifact } from "@/lib/video-factory-creator-bridge"
import { POST } from "./route"
import { GET as getArtifact } from "./files/[projectId]/[...artifactPath]/route"

const jobId = "c735ae9c-6f99-4d6a-9cdb-ce63c75ef31f"
const validRequest = {
  action: "submit",
  jobId,
  contentType: "short_video",
  targetPlatform: "instagram",
  prompt: "Create a polished fashion teaser with consistent Hana identity and soft studio lighting.",
  negativePrompt: "central abdomen tattoo, minors, explicit public content",
  referenceImageUrl: "https://hana-private.178.105.138.55.sslip.io/creator/character-master-v1.png",
  dryRun: true,
}

describe("Video Factory creator bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv("VIDEO_FACTORY_CREATOR_BRIDGE_SECRET", "bridge-secret")
    vi.stubEnv("VIDEO_FACTORY_INTERNAL_API_KEY", "factory-secret")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ accepted: true, run_id: jobId, backend: "local" }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    )))
  })

  it("rejects requests without the dedicated bridge secret", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/creator-bridge",
      { method: "POST", body: JSON.stringify(validRequest) },
    ))

    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("submits a constrained idempotent Hana brief", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/creator-bridge",
      {
        method: "POST",
        headers: { Authorization: "Bearer bridge-secret", "Content-Type": "application/json" },
        body: JSON.stringify(validRequest),
      },
    ))

    expect(response.status).toBe(202)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(String(url)).toBe("http://127.0.0.1:8080/v1/runs")
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(body).toMatchObject({ request_id: jobId, dry_run: true, auto_approve: false })
    expect(body.brief).toMatchObject({
      project_name: `hana-${jobId}`,
      requested_shot_kinds: ["generative"],
      rights: { source_assets_cleared: true, ai_generation_allowed: true },
    })
  })

  it("rejects unapproved identity reference URLs", async () => {
    const response = await POST(new NextRequest(
      "https://www.paradigmjp.com/api/video-factory/creator-bridge",
      {
        method: "POST",
        headers: { Authorization: "Bearer bridge-secret", "Content-Type": "application/json" },
        body: JSON.stringify({ ...validRequest, referenceImageUrl: "https://example.com/person.png" }),
      },
    ))

    expect(response.status).toBe(422)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("allows only media artifacts inside Hana project output folders", () => {
    expect(safeCreatorArtifact(`hana-${jobId}`, ["master", "draft.mp4"])).toBe("master/draft.mp4")
    expect(safeCreatorArtifact(`hana-${jobId}`, ["..", "brief.json"])).toBeNull()
    expect(safeCreatorArtifact("other-project", ["master", "draft.mp4"])).toBeNull()
    expect(safeCreatorArtifact(`hana-${jobId}`, ["review", "draft-review.json"])).toBeNull()
  })

  it("streams an authorized Hana artifact without exposing the factory key", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("video-bytes", {
      status: 200,
      headers: { "Content-Type": "video/mp4", "Content-Length": "11" },
    }))
    const response = await getArtifact(new NextRequest(
      `https://www.paradigmjp.com/api/video-factory/creator-bridge/files/hana-${jobId}/master/draft.mp4`,
      { headers: { Authorization: "Bearer bridge-secret" } },
    ), { params: Promise.resolve({ projectId: `hana-${jobId}`, artifactPath: ["master", "draft.mp4"] }) })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("video/mp4")
    expect(await response.text()).toBe("video-bytes")
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? []
    expect(new Headers(init?.headers).get("x-api-key")).toBe("factory-secret")
    expect(response.headers.get("x-api-key")).toBeNull()
  })

  it("rejects artifact traversal before calling the factory", async () => {
    const response = await getArtifact(new NextRequest(
      `https://www.paradigmjp.com/api/video-factory/creator-bridge/files/hana-${jobId}/review/brief.json`,
      { headers: { Authorization: "Bearer bridge-secret" } },
    ), { params: Promise.resolve({ projectId: `hana-${jobId}`, artifactPath: ["review", "brief.json"] }) })

    expect(response.status).toBe(422)
    expect(fetch).not.toHaveBeenCalled()
  })
})
