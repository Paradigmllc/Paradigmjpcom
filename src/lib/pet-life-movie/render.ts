import { createR2SignedDownloads } from "@/lib/sales/r2-storage"
import { notifyBothChannels } from "@/lib/notify"
import { PET_MOVIE_TABLES, listPetMovieAssets, recordPetMovieEvent, requirePetMovieDatabase } from "./data"
import { siteBaseUrl } from "./http"
import { buildPipelineManifest } from "./storyboard"
import type { PetMovieProjectRow } from "./types"

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : null
}

export async function queuePaidPetMovieRender(project: PetMovieProjectRow): Promise<string> {
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.JOBS).insert({
    project_id: project.id,
    job_type: "full_render",
    status: "queued",
    progress: 0,
    pipeline: buildPipelineManifest(),
  }).select("id").single()
  if (error) throw new Error(`Full render job creation failed: ${error.message}`)
  const jobId = String(data.id)
  const triggerApi = optionalEnv("TRIGGER_API_URL")?.replace(/\/+$/, "")
  const triggerKey = optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN")
  const taskId = optionalEnv("TRIGGER_PET_MOVIE_TASK_ID") ?? "pet-life-movie-render"
  if (!triggerApi || !triggerKey) {
    if (optionalEnv("PET_MOVIE_RENDERER_API_URL")) {
      await executePetMovieRenderJob(jobId, project.id)
      return jobId
    }
    const { error: waitingError } = await db.from(PET_MOVIE_TABLES.JOBS).update({ status: "waiting_renderer" }).eq("id", jobId)
    if (waitingError) console.error("[pet-life-movie] could not mark renderer wait", waitingError.message)
    return jobId
  }
  const response = await fetch(`${triggerApi}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`, {
    method: "POST",
    headers: { Authorization: `Bearer ${triggerKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: { job_id: jobId, project_id: project.id },
      context: { source: "pet-life-movie", projectId: project.id },
      options: {
        idempotencyKey: `pet-movie-${jobId}`,
        concurrencyKey: `pet-movie-${project.id}`,
        queue: { name: "pet-life-movie", concurrencyLimit: 2 },
      },
    }),
  })
  const responseText = await response.text()
  if (!response.ok) throw new Error(`Trigger.dev dispatch failed: HTTP ${response.status} ${responseText.slice(0, 240)}`)
  let triggerRunId: string | null = null
  try {
    const parsed = JSON.parse(responseText) as { id?: string; runId?: string }
    triggerRunId = parsed.id ?? parsed.runId ?? null
  } catch (error) {
    console.warn("[pet-life-movie] Trigger.dev returned non-JSON", error)
  }
  const { error: updateError } = await db.from(PET_MOVIE_TABLES.JOBS).update({ trigger_run_id: triggerRunId }).eq("id", jobId)
  if (updateError) console.error("[pet-life-movie] trigger run id save failed", updateError.message)
  return jobId
}

export async function executePetMovieRenderJob(jobId: string, projectId: string) {
  const db = requirePetMovieDatabase()
  const [{ data: projectData, error: projectError }, assets] = await Promise.all([
    db.from(PET_MOVIE_TABLES.PROJECTS).select("*").eq("id", projectId).single(),
    listPetMovieAssets(projectId, true),
  ])
  if (projectError) throw new Error(`Render project load failed: ${projectError.message}`)
  const project = projectData as PetMovieProjectRow
  if (!project.storyboard || project.payment_status !== "paid") throw new Error("Paid storyboard is required before rendering")
  const rendererUrl = optionalEnv("PET_MOVIE_RENDERER_API_URL")
  const rendererSecret = optionalEnv("PET_MOVIE_RENDERER_API_KEY")
  if (!rendererUrl) {
    const { error } = await db.from(PET_MOVIE_TABLES.JOBS).update({ status: "waiting_renderer", progress: 5 }).eq("id", jobId)
    if (error) throw new Error(`Renderer wait state failed: ${error.message}`)
    return { ok: true, waitingRenderer: true }
  }
  const inputs = await createR2SignedDownloads(assets.map((asset) => asset.object_key), 3600)
  const { error: runningError } = await db.from(PET_MOVIE_TABLES.JOBS).update({
    status: "running",
    progress: 10,
    started_at: new Date().toISOString(),
    attempt_count: 1,
  }).eq("id", jobId)
  if (runningError) throw new Error(`Render start update failed: ${runningError.message}`)
  const response = await fetch(rendererUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(rendererSecret ? { Authorization: `Bearer ${rendererSecret}` } : {}),
    },
    body: JSON.stringify({
      jobId,
      projectId,
      plan: project.plan,
      locale: project.locale,
      storyboard: project.storyboard,
      inputs: assets.map((asset, index) => ({ assetId: asset.id, url: inputs[index].downloadUrl })),
      pipeline: buildPipelineManifest(),
      callbackUrl: `${siteBaseUrl()}/api/pet-life-movie/render/callback`,
      safety: { factualOnly: true, voiceCloning: false, preservePetIdentity: true },
    }),
  })
  const responseText = await response.text()
  if (!response.ok) throw new Error(`GPU renderer rejected job: HTTP ${response.status} ${responseText.slice(0, 240)}`)
  return { ok: true, waitingRenderer: false }
}

export async function handlePetMovieCheckoutCompleted(object: {
  id: string
  payment_status?: string
  metadata?: Record<string, string>
}): Promise<boolean> {
  if (object.metadata?.product !== "pet_life_movie") return false
  const projectId = object.metadata.project_id
  if (!projectId) throw new Error("Pet movie checkout metadata is missing project_id")
  if (object.payment_status && object.payment_status !== "paid") return true
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.PROJECTS).select("*").eq("id", projectId).single()
  if (error) throw new Error(`Paid project lookup failed: ${error.message}`)
  const project = data as PetMovieProjectRow
  if (project.stripe_checkout_session_id !== object.id) throw new Error("Stripe checkout session does not match project")
  if (project.payment_status === "paid") return true
  const { error: updateError } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
    payment_status: "paid",
    status: "full_rendering",
  }).eq("id", project.id)
  if (updateError) throw new Error(`Paid project update failed: ${updateError.message}`)
  const jobId = await queuePaidPetMovieRender({ ...project, payment_status: "paid", status: "full_rendering" })
  await Promise.all([
    recordPetMovieEvent(project.id, "payment_completed", project.locale, { plan: project.plan, jobId }),
    notifyBothChannels("Pet Life Movie payment completed", {
      title: "Pet Life Movie: paid render queued",
      message: `${project.pet_name} / ${project.plan ?? "unknown plan"}`,
      link: `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`,
      type: "pet_movie_payment_completed",
      priority: 95,
    }),
  ])
  return true
}

