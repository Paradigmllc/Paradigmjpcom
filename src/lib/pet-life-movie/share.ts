import { createR2SignedDownloads } from "@/lib/sales/r2-storage"
import { PET_MOVIE_TABLES, listPetMovieAssets, requirePetMovieDatabase } from "./data"
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
  if (!project || !project.storyboard || !["preview_ready", "payment_required", "full_rendering", "quality_check", "delivered"].includes(project.status)) {
    return null
  }
  const assets = await listPetMovieAssets(project.id, true)
  const signed = await createR2SignedDownloads(assets.map((asset) => asset.object_key), 3600)
  return {
    project,
    assetUrls: Object.fromEntries(assets.map((asset, index) => [asset.id, signed[index].downloadUrl])),
  }
}

