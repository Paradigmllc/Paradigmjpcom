import { createR2SignedDownloads } from "@/lib/sales/r2-storage"
import { PET_MOVIE_TABLES, listPetMovieAssets, listPetMovieDeliverables, requirePetMovieDatabase } from "./data"
import type { PetMovieProjectRow } from "./types"

export async function loadSharedPetMovie(shareSlug: string) {
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.PROJECTS)
    .select("*")
    .eq("share_slug", shareSlug)
    .eq("share_enabled", true)
    .eq("privacy", "unlisted")
    .maybeSingle()
  if (error) throw new Error(`Shared movie lookup failed: ${error.message}`)
  const project = data as PetMovieProjectRow | null
  if (!project || new Date(project.expires_at).getTime() <= Date.now() || !project.storyboard || !["preview_ready", "payment_required", "full_rendering", "quality_check", "delivered"].includes(project.status)) {
    return null
  }
  const [assets, deliverables, jobResult] = await Promise.all([
    listPetMovieAssets(project.id, true),
    project.status === "delivered" ? listPetMovieDeliverables(project.id) : Promise.resolve([]),
    db.from(PET_MOVIE_TABLES.JOBS).select("status, progress, error_message").eq("project_id", project.id).eq("job_type", "full_render").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (jobResult.error) throw new Error(`Movie production status lookup failed: ${jobResult.error.message}`)
  const [signed, signedDeliverables] = await Promise.all([
    createR2SignedDownloads(assets.map((asset) => asset.object_key), 3600),
    createR2SignedDownloads(deliverables.map((item) => item.object_key), 900),
  ])
  return {
    project,
    job: jobResult.data ? { status: String(jobResult.data.status), progress: Number(jobResult.data.progress), errorMessage: jobResult.data.error_message ? String(jobResult.data.error_message) : null } : null,
    assetUrls: Object.fromEntries(assets.map((asset, index) => [asset.id, signed[index].downloadUrl])),
    deliverables: deliverables.map((item, index) => ({
      name: item.name,
      mimeType: item.mime_type,
      sizeBytes: item.size_bytes,
      downloadUrl: signedDeliverables[index].downloadUrl,
    })),
  }
}

