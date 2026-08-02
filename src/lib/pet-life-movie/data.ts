import { getServiceSalesSupabase } from "@/lib/supabase"
import { petMovieSecretsMatch } from "./auth"
import { hashPetMovieSecret } from "./auth"
import type { PetMovieAssetRow, PetMovieProjectRow } from "./types"

export const PET_MOVIE_TABLES = {
  PROJECTS: "pet_movie_projects",
  ASSETS: "pet_movie_assets",
  CONTRIBUTORS: "pet_movie_contributors",
  JOBS: "pet_movie_jobs",
  EVENTS: "pet_movie_events",
} as const

export function requirePetMovieDatabase() {
  const client = getServiceSalesSupabase()
  if (!client) throw new Error("Pet Life Movie database is not configured")
  return client
}

export async function authorizePetMovieProject(projectId: string, token: string | null): Promise<PetMovieProjectRow | null> {
  if (!token) return null
  const db = requirePetMovieDatabase()
  const { data, error } = await db
    .from(PET_MOVIE_TABLES.PROJECTS)
    .select("*")
    .eq("id", projectId)
    .maybeSingle()
  if (error) throw new Error(`Project authorization failed: ${error.message}`)
  const project = data as PetMovieProjectRow | null
  if (!project || !petMovieSecretsMatch(token, project.access_token_hash)) return null
  if (["expired", "deleted"].includes(project.status)) return null
  return project
}

export async function listPetMovieAssets(projectId: string, uploadedOnly = false): Promise<PetMovieAssetRow[]> {
  const db = requirePetMovieDatabase()
  let query = db.from(PET_MOVIE_TABLES.ASSETS).select("*").eq("project_id", projectId).order("sort_order")
  if (uploadedOnly) query = query.eq("upload_status", "uploaded")
  const { data, error } = await query
  if (error) throw new Error(`Could not load project photos: ${error.message}`)
  return (data ?? []) as PetMovieAssetRow[]
}

export async function authorizePetMovieContributor(inviteToken: string): Promise<{
  contributorId: string
  project: PetMovieProjectRow
} | null> {
  if (inviteToken.length < 32) return null
  const db = requirePetMovieDatabase()
  const { data: contributor, error: contributorError } = await db.from(PET_MOVIE_TABLES.CONTRIBUTORS)
    .select("id, project_id, status, expires_at")
    .eq("invite_token_hash", hashPetMovieSecret(inviteToken))
    .maybeSingle()
  if (contributorError) throw new Error(`Contributor authorization failed: ${contributorError.message}`)
  if (!contributor || contributor.status === "revoked" || new Date(String(contributor.expires_at)).getTime() <= Date.now()) return null
  const { data: projectData, error: projectError } = await db.from(PET_MOVIE_TABLES.PROJECTS)
    .select("*")
    .eq("id", String(contributor.project_id))
    .maybeSingle()
  if (projectError) throw new Error(`Contributor project lookup failed: ${projectError.message}`)
  const project = projectData as PetMovieProjectRow | null
  return project ? { contributorId: String(contributor.id), project } : null
}

export async function recordPetMovieEvent(
  projectId: string | null,
  eventType: string,
  locale: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const db = requirePetMovieDatabase()
    const { error } = await db.from(PET_MOVIE_TABLES.EVENTS).insert({
      project_id: projectId,
      event_type: eventType,
      locale,
      metadata,
    })
    if (error) console.error("[pet-life-movie] event insert failed", error.message)
  } catch (error) {
    console.error("[pet-life-movie] event recording failed", error)
  }
}

export function projectResponse(project: PetMovieProjectRow, assets: PetMovieAssetRow[] = []) {
  return {
    id: project.id,
    shareSlug: project.share_slug,
    petName: project.pet_name,
    species: project.pet_species,
    occasion: project.occasion,
    locale: project.locale,
    mood: project.mood,
    timeTogether: project.time_together,
    memories: project.memories,
    status: project.status,
    plan: project.plan,
    paymentStatus: project.payment_status,
    storyboard: project.storyboard,
    previewUrl: project.preview_url,
    deliveryUrl: project.delivery_url,
    expiresAt: project.expires_at,
    assets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.file_name,
      mimeType: asset.mime_type,
      size: asset.size_bytes,
      sortOrder: asset.sort_order,
      uploadStatus: asset.upload_status,
    })),
  }
}
