import { createHash } from "node:crypto"
import { uploadPrivateToR2 } from "@/lib/sales/r2-storage"
import { PET_MOVIE_TABLES, requirePetMovieDatabase } from "./data"
import { sendPetMovieEmail } from "./email"
import { siteBaseUrl } from "./http"
import type { PetMovieProjectRow } from "./types"

export interface PetMovieDeliveryEvent {
  rendererProjectId: string
  projectId: string
  jobId: string
  reviewer: string
  items: Array<{
    name: string
    artifactPath: string
    sha256: string
    sizeBytes: number
  }>
}

function videoFactoryOrigin(): string {
  return (process.env.VIDEO_FACTORY_INTERNAL_URL?.trim() || "http://127.0.0.1:8080").replace(/\/+$/, "")
}

function videoFactoryKey(): string {
  const key = process.env.VIDEO_FACTORY_INTERNAL_API_KEY?.trim()
    || process.env.ADMIN_SCRIPT_SECRET?.trim()
  if (!key) throw new Error("Video Factory internal API key is not configured")
  return key
}

export async function ingestPetMovieDelivery(input: PetMovieDeliveryEvent): Promise<void> {
  const db = requirePetMovieDatabase()
  const [{ data: projectData, error: projectError }, { data: jobData, error: jobError }] = await Promise.all([
    db.from(PET_MOVIE_TABLES.PROJECTS).select("*").eq("id", input.projectId).single(),
    db.from(PET_MOVIE_TABLES.JOBS).select("id, project_id").eq("id", input.jobId).single(),
  ])
  if (projectError) throw new Error(`Delivery project lookup failed: ${projectError.message}`)
  if (jobError) throw new Error(`Delivery job lookup failed: ${jobError.message}`)
  if (String(jobData.project_id) !== input.projectId) throw new Error("Delivery job does not belong to project")
  const project = projectData as PetMovieProjectRow
  if (project.payment_status !== "paid") throw new Error("Unpaid projects cannot receive deliverables")
  if (!project.customer_email || !project.plan) throw new Error("Paid delivery contact or plan is missing")

  const records: Array<Record<string, unknown>> = []
  for (const item of input.items) {
    const encodedPath = item.artifactPath.split("/").map(encodeURIComponent).join("/")
    const response = await fetch(
      `${videoFactoryOrigin()}/v1/projects/${encodeURIComponent(input.rendererProjectId)}/files/${encodedPath}`,
      { headers: { "x-api-key": videoFactoryKey() }, signal: AbortSignal.timeout(60_000) },
    )
    if (!response.ok) throw new Error(`Video Factory artifact download failed: HTTP ${response.status}`)
    const declaredSize = Number(response.headers.get("content-length") ?? item.sizeBytes)
    if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > 250 * 1024 * 1024) {
      throw new Error(`Deliverable ${item.name} has an invalid size`)
    }
    const body = Buffer.from(await response.arrayBuffer())
    if (body.byteLength !== item.sizeBytes || body.byteLength > 250 * 1024 * 1024) {
      throw new Error(`Deliverable ${item.name} size verification failed`)
    }
    const actualSha256 = createHash("sha256").update(body).digest("hex")
    if (actualSha256 !== item.sha256) throw new Error(`Deliverable ${item.name} checksum verification failed`)
    const objectKey = await uploadPrivateToR2(
      `pet-life-movie/${input.projectId}/${input.jobId}/deliverables/${item.name}.mp4`,
      body,
      "video/mp4",
    )
    records.push({
      project_id: input.projectId,
      job_id: input.jobId,
      name: item.name,
      object_key: objectKey,
      mime_type: "video/mp4",
      size_bytes: body.byteLength,
      sha256: actualSha256,
    })
  }
  const { error: deliverableError } = await db.from(PET_MOVIE_TABLES.DELIVERABLES)
    .upsert(records, { onConflict: "project_id,name" })
  if (deliverableError) throw new Error(`Deliverable persistence failed: ${deliverableError.message}`)
  const completedAt = new Date().toISOString()
  const [{ error: jobUpdateError }, { error: projectUpdateError }] = await Promise.all([
    db.from(PET_MOVIE_TABLES.JOBS).update({
      status: "succeeded",
      progress: 100,
      completed_at: completedAt,
      renderer_project_id: input.rendererProjectId,
    }).eq("id", input.jobId),
    db.from(PET_MOVIE_TABLES.PROJECTS).update({ status: "delivered" }).eq("id", input.projectId),
  ])
  if (jobUpdateError) throw new Error(`Delivery job completion failed: ${jobUpdateError.message}`)
  if (projectUpdateError) throw new Error(`Delivery project completion failed: ${projectUpdateError.message}`)
  await sendPetMovieEmail({
    to: project.customer_email,
    petName: project.pet_name,
    locale: project.locale,
    plan: project.plan,
    memoryUrl: `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`,
    delivered: true,
    idempotencyKey: `pet-movie-delivery-${input.jobId}`,
  })
}
