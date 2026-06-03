import { afterEach, describe, expect, it, vi } from "vitest"
import { DIFY_RUNTIME_KEY_ENV_NAMES } from "./dify-cloud"
import { getSalesIntegrationStatus } from "./integration-registry"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getSalesIntegrationStatus", () => {
  it("reports missing required envs without exposing secret values", async () => {
    for (const envName of DIFY_RUNTIME_KEY_ENV_NAMES) vi.stubEnv(envName, "")
    const rows = await getSalesIntegrationStatus()
    const dify = rows.find((row) => row.slug === "dify_cloud")
    expect(dify?.status).toBe("missing")
    expect(dify?.missingEnv).toContain("DIFY_API_KEY")
    expect(JSON.stringify(dify)).not.toContain("sk-")
  })

  it("marks Dify Cloud ready when the server env is configured", async () => {
    for (const envName of DIFY_RUNTIME_KEY_ENV_NAMES) vi.stubEnv(envName, "")
    vi.stubEnv("DIFY_VIDEO_WORKFLOW_API_KEY", "secret-value-that-must-not-render")
    const rows = await getSalesIntegrationStatus()
    const dify = rows.find((row) => row.slug === "dify_cloud")
    expect(dify?.status).toBe("ready")
    expect(dify?.configuredEnv).toEqual(["DIFY_VIDEO_WORKFLOW_API_KEY"])
    expect(JSON.stringify(dify)).not.toContain("secret-value")
  })

  it("includes global SMB and video-delivery evidence sources from wall references", async () => {
    const rows = await getSalesIntegrationStatus()
    const slugs = rows.map((row) => row.slug)
    expect(slugs).toContain("similarweb")
    expect(slugs).toContain("ad_libraries")
    expect(slugs).toContain("video_media_sources")
  })

  it("does not mark production OSS tools ready when required keys are missing", async () => {
    vi.stubEnv("CHATWOOT_BASE_URL", "https://chatwoot.paradigmjp.com")
    vi.stubEnv("CHATWOOT_API_KEY", "")
    vi.stubEnv("CHATWOOT_ACCOUNT_ID", "")
    vi.stubEnv("LIVEKIT_URL", "https://livekit.paradigmjp.com")
    vi.stubEnv("LIVEKIT_API_KEY", "")
    vi.stubEnv("LIVEKIT_API_SECRET", "")
    vi.stubEnv("BROWSERLESS_URL", "https://browserless.paradigmjp.com")
    vi.stubEnv("BROWSERLESS_TOKEN", "")
    vi.stubEnv("STAGEHAND_URL", "https://stagehand.paradigmjp.com")
    vi.stubEnv("STAGEHAND_API_KEY", "")
    vi.stubEnv("HYPERFRAMES_API_URL", "https://hyperframes.paradigmjp.com")
    vi.stubEnv("HYPERFRAMES_API_KEY", "")
    vi.stubEnv("OPENMONTAGE_API_URL", "https://openmontage.paradigmjp.com")
    vi.stubEnv("OPENMONTAGE_API_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL", "https://studio.paradigmjp.com")
    vi.stubEnv("COMFYUI_API_URL", "https://comfyui.paradigmjp.com")
    vi.stubEnv("COMFYUI_API_KEY", "")
    vi.stubEnv("CLOUDFLARE_R2_BUCKET", "sales-assets")
    vi.stubEnv("CLOUDFLARE_R2_ACCOUNT_ID", "")
    vi.stubEnv("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    vi.stubEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")

    const rows = await getSalesIntegrationStatus()
    const bySlug = new Map(rows.map((row) => [row.slug, row]))
    expect(bySlug.get("chatwoot")?.status).toBe("partial")
    expect(bySlug.get("livekit")?.status).toBe("partial")
    expect(bySlug.get("browserless")?.status).toBe("partial")
    expect(bySlug.get("stagehand")?.status).toBe("partial")
    expect(bySlug.get("hyperframes_renderer")?.status).toBe("partial")
    expect(bySlug.get("openmontage_runtime")?.status).toBe("partial")
    expect(bySlug.get("comfyui_api")?.status).toBe("partial")
    expect(bySlug.get("r2_delivery")?.status).toBe("partial")
    expect(bySlug.get("chatwoot")?.missingEnv).toEqual(["CHATWOOT_API_KEY", "CHATWOOT_ACCOUNT_ID"])
    expect(bySlug.get("hyperframes_renderer")?.missingEnv).toEqual(["HYPERFRAMES_API_KEY"])
    expect(bySlug.get("openmontage_runtime")?.missingEnv).toEqual(["OPENMONTAGE_API_KEY"])
    expect(bySlug.get("comfyui_api")?.missingEnv).toEqual(["COMFYUI_API_KEY"])
    expect(bySlug.get("r2_delivery")?.missingEnv).toEqual([
      "CLOUDFLARE_R2_ACCOUNT_ID",
      "CLOUDFLARE_R2_ACCESS_KEY_ID",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    ])
  })
})
