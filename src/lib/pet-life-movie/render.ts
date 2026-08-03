import { createR2SignedDownloads } from "@/lib/sales/r2-storage"
import { notifyBothChannels } from "@/lib/notify"
import { PET_MOVIE_TABLES, listPetMovieAssets, recordPetMovieEvent, requirePetMovieDatabase } from "./data"
import { siteBaseUrl } from "./http"
import { buildPipelineManifest } from "./storyboard"
import type { PetMovieProjectRow } from "./types"
import { sendPetMovieEmail } from "./email"
import { resolvePetMovieTemplate } from "./templates"

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : null
}

export async function queuePaidPetMovieRender(project: PetMovieProjectRow): Promise<string> {
  const db = requirePetMovieDatabase()
  const { data: existing, error: existingError } = await db.from(PET_MOVIE_TABLES.JOBS)
    .select("id, status")
    .eq("project_id", project.id)
    .eq("job_type", "full_render")
    .not("status", "in", "(failed,cancelled)")
    .maybeSingle()
  if (existingError) throw new Error(`Full render job lookup failed: ${existingError.message}`)
  if (existing?.id) {
    if (["queued", "waiting_renderer"].includes(String(existing.status))) {
      await executePetMovieRenderJob(String(existing.id), project.id)
    }
    return String(existing.id)
  }
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
    if (optionalEnv("VIDEO_FACTORY_INTERNAL_URL")) {
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
  if (!project.ai_motion_consent_at) throw new Error("Recorded AI motion consent is required before GPU rendering")
  const videoFactoryBase = optionalEnv("VIDEO_FACTORY_INTERNAL_URL")?.replace(/\/+$/, "")
  const rendererUrl = videoFactoryBase
    ? `${videoFactoryBase}/v1/pet-movie/renders`
    : optionalEnv("PET_MOVIE_RENDERER_API_URL")
  const rendererSecret = optionalEnv("PET_MOVIE_RENDERER_API_KEY")
    ?? optionalEnv("VIDEO_FACTORY_INTERNAL_API_KEY")
    ?? optionalEnv("ADMIN_SCRIPT_SECRET")
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
      ...(rendererSecret ? { "x-api-key": rendererSecret } : {}),
    },
    body: JSON.stringify({
      mode: "customer_paid",
      renderTier: "cinematic_gpu",
      aiMotionConsent: true,
      jobId,
      projectId,
      plan: project.plan,
      locale: project.locale,
      storyboard: project.storyboard,
      templateId: resolvePetMovieTemplate(project.storyboard.templateId).id,
      inputs: assets.map((asset, index) => ({ assetId: asset.id, url: inputs[index].downloadUrl })),
      pipeline: buildPipelineManifest(),
      safety: { factualOnly: true, voiceCloning: false, preservePetIdentity: true },
    }),
  })
  const responseText = await response.text()
  if (!response.ok) throw new Error(`GPU renderer rejected job: HTTP ${response.status} ${responseText.slice(0, 240)}`)
  let rendererProjectId: string | null = null
  let rendererRunId: string | null = null
  try {
    const parsed = JSON.parse(responseText) as { rendererProjectId?: string; runId?: string }
    rendererProjectId = parsed.rendererProjectId ?? null
    rendererRunId = parsed.runId ?? null
  } catch (error) {
    console.error("[pet-life-movie] renderer returned invalid JSON", error)
    throw new Error("Renderer returned an invalid acceptance response")
  }
  if (!rendererProjectId || !rendererRunId) throw new Error("Renderer acceptance response is incomplete")
  const { error: rendererUpdateError } = await db.from(PET_MOVIE_TABLES.JOBS).update({
    renderer_project_id: rendererProjectId,
    trigger_run_id: rendererRunId,
    progress: 15,
  }).eq("id", jobId)
  if (rendererUpdateError) throw new Error(`Renderer acceptance save failed: ${rendererUpdateError.message}`)
  return { ok: true, waitingRenderer: false }
}

export async function handlePetMovieCheckoutCompleted(object: {
  id: string
  payment_status?: string
  customer_email?: string | null
  customer_details?: { email?: string | null } | null
  payment_intent?: string | { id: string } | null
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
  const email = project.customer_email ?? object.customer_details?.email ?? object.customer_email
  if (!email) throw new Error("Paid project is missing its customer email")
  const paidAt = project.paid_at ?? new Date().toISOString()
  const paymentIntentId = typeof object.payment_intent === "string"
    ? object.payment_intent
    : object.payment_intent?.id ?? project.stripe_payment_intent_id
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1_000).toISOString()
  if (project.payment_status !== "paid") {
    const { error: updateError } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
      payment_status: "paid",
      status: "full_rendering",
      customer_email: email,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: paidAt,
      expires_at: expiresAt,
    }).eq("id", project.id)
    if (updateError) throw new Error(`Paid project update failed: ${updateError.message}`)
  }
  const paidProject = {
    ...project,
    payment_status: "paid" as const,
    status: "full_rendering" as const,
    customer_email: email,
    stripe_payment_intent_id: paymentIntentId,
    paid_at: paidAt,
    expires_at: expiresAt,
  }
  const jobId = await queuePaidPetMovieRender(paidProject)
  await Promise.all([
    recordPetMovieEvent(project.id, "payment_completed", project.locale, { plan: project.plan, jobId }),
    notifyBothChannels("Pet Life Movie payment completed", {
      title: "Pet Life Movie: paid render queued",
      message: `${project.pet_name} / ${project.plan ?? "unknown plan"}`,
      link: `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`,
      type: "pet_movie_payment_completed",
      priority: 95,
      idempotencyKey: `pet-movie-payment-${object.id}`,
    }),
    sendPetMovieEmail({
      to: email,
      petName: project.pet_name,
      locale: project.locale,
      plan: project.plan ?? "story",
      memoryUrl: `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`,
      delivered: false,
      idempotencyKey: `pet-movie-order-${object.id}`,
    }),
  ])
  return true
}

export async function handlePetMovieCheckoutFailed(object: {
  id: string
  metadata?: Record<string, string>
}, reason: "expired" | "failed"): Promise<boolean> {
  if (object.metadata?.product !== "pet_life_movie") return false
  const db = requirePetMovieDatabase()
  const { error } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
    payment_status: reason === "failed" ? "failed" : "unpaid",
    status: "preview_ready",
  }).eq("stripe_checkout_session_id", object.id).neq("payment_status", "paid")
  if (error) throw new Error(`Checkout ${reason} update failed: ${error.message}`)
  return true
}

export async function handlePetMovieRefund(object: {
  payment_intent?: string | { id: string } | null
}): Promise<boolean> {
  const paymentIntentId = typeof object.payment_intent === "string"
    ? object.payment_intent
    : object.payment_intent?.id
  if (!paymentIntentId) return false
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.PROJECTS)
    .update({ payment_status: "refunded", refunded_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .select("id, pet_name")
    .maybeSingle()
  if (error) throw new Error(`Refund update failed: ${error.message}`)
  if (!data) return false
  await notifyBothChannels("Pet Life Movie refund recorded", {
    title: "Pet Life Movie: refund recorded",
    message: `${String(data.pet_name)} / ${String(data.id)}`,
    type: "pet_movie_refunded",
    priority: 90,
    idempotencyKey: `pet-movie-refund-${paymentIntentId}`,
  })
  return true
}

