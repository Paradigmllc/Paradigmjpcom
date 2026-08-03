import { createHash } from "node:crypto"
import { createR2SignedDownloads, uploadPrivateToR2 } from "@/lib/sales/r2-storage"
import { PET_MOVIE_TABLES, listPetMovieAssets, requirePetMovieDatabase } from "./data"
import { buildPipelineManifest } from "./storyboard"
import { PET_MOVIE_TEMPLATE_IDS, type PetMovieTemplateId } from "./templates"
import type { PetMovieProjectRow, PetMovieQaRenderRow } from "./types"

export interface PetMovieQaProject {
  id: string
  petName: string
  locale: string
  mood: string
  status: string
  paymentStatus: string
  templateId: PetMovieTemplateId
  createdAt: string
}

export interface PetMovieQaRenderView {
  id: string
  projectId: string
  petName: string
  templateId: PetMovieTemplateId
  status: PetMovieQaRenderRow["status"]
  rendererProjectId: string | null
  rendererRunId: string | null
  downloadUrl: string | null
  reviewer: string | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface PetMovieQaDashboard {
  projects: PetMovieQaProject[]
  renders: PetMovieQaRenderView[]
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : null
}

function isTemplateId(value: unknown): value is PetMovieTemplateId {
  return typeof value === "string" && PET_MOVIE_TEMPLATE_IDS.includes(value as PetMovieTemplateId)
}

export async function getPetMovieQaDashboard(): Promise<PetMovieQaDashboard> {
  const db = requirePetMovieDatabase()
  const [projectsResult, rendersResult] = await Promise.all([
    db.from(PET_MOVIE_TABLES.PROJECTS)
      .select("id, pet_name, locale, mood, status, payment_status, storyboard, created_at")
      .not("storyboard", "is", null)
      .not("status", "in", "(expired,deleted)")
      .order("created_at", { ascending: false })
      .limit(30),
    db.from(PET_MOVIE_TABLES.QA_RENDERS)
      .select("*, pet_movie_projects!inner(pet_name)")
      .order("created_at", { ascending: false })
      .limit(30),
  ])
  if (projectsResult.error) throw new Error(`QA project list failed: ${projectsResult.error.message}`)
  if (rendersResult.error) throw new Error(`QA render list failed: ${rendersResult.error.message}`)

  const projects = (projectsResult.data ?? []).map((row) => {
    const storyboard = row.storyboard as { templateId?: unknown } | null
    const candidate = storyboard?.templateId
    const fallback = row.mood === "playful"
      ? "playful-scrapbook"
      : row.mood === "cinematic"
        ? "cinematic-tribute"
        : "warm-keepsake"
    return {
      id: String(row.id),
      petName: String(row.pet_name),
      locale: String(row.locale),
      mood: String(row.mood),
      status: String(row.status),
      paymentStatus: String(row.payment_status),
      templateId: isTemplateId(candidate) ? candidate : fallback,
      createdAt: String(row.created_at),
    } satisfies PetMovieQaProject
  })

  const renderRows = (rendersResult.data ?? []) as Array<Record<string, unknown>>
  const outputKeys = renderRows
    .map((row) => typeof row.output_object_key === "string" ? row.output_object_key : null)
    .filter((value): value is string => value !== null)
  const signed = outputKeys.length > 0 ? await createR2SignedDownloads(outputKeys, 900) : []
  const signedByKey = new Map(signed.map((item) => [item.objectKey, item.downloadUrl]))
  const renders = renderRows.map((row) => {
    const relation = row.pet_movie_projects as { pet_name?: unknown } | null
    const key = typeof row.output_object_key === "string" ? row.output_object_key : null
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      petName: typeof relation?.pet_name === "string" ? relation.pet_name : "Unknown",
      templateId: isTemplateId(row.template_id) ? row.template_id : "warm-keepsake",
      status: String(row.status) as PetMovieQaRenderRow["status"],
      rendererProjectId: typeof row.renderer_project_id === "string" ? row.renderer_project_id : null,
      rendererRunId: typeof row.renderer_run_id === "string" ? row.renderer_run_id : null,
      downloadUrl: key ? signedByKey.get(key) ?? null : null,
      reviewer: typeof row.reviewer === "string" ? row.reviewer : null,
      errorMessage: typeof row.error_message === "string" ? row.error_message : null,
      createdAt: String(row.created_at),
      completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    } satisfies PetMovieQaRenderView
  })
  return { projects, renders }
}

export async function startPetMovieQaRender(
  projectId: string,
  templateId: PetMovieTemplateId,
): Promise<PetMovieQaRenderRow> {
  const db = requirePetMovieDatabase()
  const [{ data: projectData, error: projectError }, assets] = await Promise.all([
    db.from(PET_MOVIE_TABLES.PROJECTS).select("*").eq("id", projectId).single(),
    listPetMovieAssets(projectId, true),
  ])
  if (projectError) throw new Error(`QA project load failed: ${projectError.message}`)
  const project = projectData as PetMovieProjectRow
  if (!project.storyboard) throw new Error("QAレンダーには完成済みストーリーボードが必要です")
  if (!project.ai_motion_consent_at) throw new Error("GPU QAレンダーには記録済みのAI動画生成同意が必要です")
  if (assets.length < 5) throw new Error("QAレンダーにはアップロード済み写真が5枚以上必要です")

  const { data: qaData, error: qaError } = await db.from(PET_MOVIE_TABLES.QA_RENDERS).insert({
    project_id: project.id,
    template_id: templateId,
    status: "queued",
  }).select("*").single()
  if (qaError) throw new Error(`QA render creation failed: ${qaError.message}`)
  const qa = qaData as PetMovieQaRenderRow

  try {
    const videoFactoryBase = optionalEnv("VIDEO_FACTORY_INTERNAL_URL")?.replace(/\/+$/, "")
    const rendererUrl = videoFactoryBase
      ? `${videoFactoryBase}/v1/pet-movie/renders`
      : optionalEnv("PET_MOVIE_RENDERER_API_URL")
    if (!rendererUrl) throw new Error("Video Factory renderer is not configured")
    const rendererSecret = optionalEnv("PET_MOVIE_RENDERER_API_KEY")
      ?? optionalEnv("VIDEO_FACTORY_INTERNAL_API_KEY")
      ?? optionalEnv("ADMIN_SCRIPT_SECRET")
    if (!rendererSecret) throw new Error("Video Factory renderer key is not configured")
    const downloads = await createR2SignedDownloads(assets.map((asset) => asset.object_key), 3600)
    const startedAt = new Date().toISOString()
    const { error: startError } = await db.from(PET_MOVIE_TABLES.QA_RENDERS)
      .update({ status: "rendering", started_at: startedAt })
      .eq("id", qa.id)
    if (startError) throw new Error(`QA render start state failed: ${startError.message}`)

    const response = await fetch(rendererUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rendererSecret}`,
        "x-api-key": rendererSecret,
      },
      body: JSON.stringify({
        mode: "internal_qa",
        renderTier: "cinematic_gpu",
        aiMotionConsent: true,
        qaRenderId: qa.id,
        jobId: qa.id,
        projectId: project.id,
        plan: project.plan ?? "story",
        locale: project.locale,
        templateId,
        storyboard: { ...project.storyboard, templateId },
        inputs: assets.map((asset, index) => ({ assetId: asset.id, url: downloads[index].downloadUrl })),
        pipeline: buildPipelineManifest(),
        safety: { factualOnly: true, voiceCloning: false, preservePetIdentity: true },
      }),
      signal: AbortSignal.timeout(90_000),
    })
    const responseText = await response.text()
    if (!response.ok) throw new Error(`Video Factory rejected QA render: HTTP ${response.status} ${responseText.slice(0, 240)}`)
    let accepted: { rendererProjectId?: string; runId?: string; reviewRequired?: boolean }
    try {
      accepted = JSON.parse(responseText) as typeof accepted
    } catch (error) {
      console.error("[pet-movie-qa] renderer returned invalid JSON", error)
      throw new Error("Video Factory returned an invalid acceptance response")
    }
    if (!accepted.rendererProjectId || !accepted.runId || accepted.reviewRequired !== true) {
      throw new Error("Video Factory acceptance response is incomplete")
    }
    const { data: updated, error: updateError } = await db.from(PET_MOVIE_TABLES.QA_RENDERS).update({
      status: "review_required",
      renderer_project_id: accepted.rendererProjectId,
      renderer_run_id: accepted.runId,
    }).eq("id", qa.id).select("*").single()
    if (updateError) throw new Error(`QA renderer acceptance save failed: ${updateError.message}`)
    return updated as PetMovieQaRenderRow
  } catch (error) {
    const message = error instanceof Error ? error.message : "QA render failed"
    const { error: failureError } = await db.from(PET_MOVIE_TABLES.QA_RENDERS).update({
      status: "failed",
      error_message: message.slice(0, 2000),
      completed_at: new Date().toISOString(),
    }).eq("id", qa.id)
    if (failureError) console.error("[pet-movie-qa] failure state save failed", failureError)
    throw error
  }
}

export async function ingestPetMovieQaDelivery(input: {
  rendererProjectId: string
  qaRenderId: string
  reviewer: string
  items: Array<{ name: string; artifactPath: string; sha256: string; sizeBytes: number }>
}): Promise<void> {
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.QA_RENDERS)
    .select("id, project_id, status")
    .eq("id", input.qaRenderId)
    .single()
  if (error) throw new Error(`QA delivery lookup failed: ${error.message}`)
  if (!["rendering", "review_required"].includes(String(data.status))) {
    throw new Error("QA delivery is not in a receivable state")
  }
  const item = input.items.find((candidate) => candidate.name === "vertical-1080p") ?? input.items[0]
  if (!item) throw new Error("QA delivery has no artifact")
  const secret = optionalEnv("VIDEO_FACTORY_INTERNAL_API_KEY") ?? optionalEnv("ADMIN_SCRIPT_SECRET")
  const origin = optionalEnv("VIDEO_FACTORY_INTERNAL_URL")?.replace(/\/+$/, "") ?? "http://127.0.0.1:8080"
  if (!secret) throw new Error("Video Factory internal API key is not configured")
  const encodedPath = item.artifactPath.split("/").map(encodeURIComponent).join("/")
  const response = await fetch(
    `${origin}/v1/projects/${encodeURIComponent(input.rendererProjectId)}/files/${encodedPath}`,
    { headers: { "x-api-key": secret }, signal: AbortSignal.timeout(60_000) },
  )
  if (!response.ok) throw new Error(`QA artifact download failed: HTTP ${response.status}`)
  const body = Buffer.from(await response.arrayBuffer())
  if (body.byteLength !== item.sizeBytes || body.byteLength > 250 * 1024 * 1024) {
    throw new Error("QA artifact size verification failed")
  }
  const sha256 = createHash("sha256").update(body).digest("hex")
  if (sha256 !== item.sha256) throw new Error("QA artifact checksum verification failed")
  const objectKey = await uploadPrivateToR2(
    `pet-life-movie/qa/${input.qaRenderId}/${item.name}.mp4`,
    body,
    "video/mp4",
  )
  const { error: updateError } = await db.from(PET_MOVIE_TABLES.QA_RENDERS).update({
    status: "delivered",
    renderer_project_id: input.rendererProjectId,
    output_object_key: objectKey,
    output_name: item.name,
    mime_type: "video/mp4",
    size_bytes: body.byteLength,
    sha256,
    reviewer: input.reviewer,
    completed_at: new Date().toISOString(),
  }).eq("id", input.qaRenderId)
  if (updateError) throw new Error(`QA delivery persistence failed: ${updateError.message}`)
}
