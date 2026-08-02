import { deleteR2Objects } from "@/lib/sales/r2-storage"
import {
  listPetMovieAssets,
  listPetMovieDeliverables,
  PET_MOVIE_TABLES,
  requirePetMovieDatabase,
} from "./data"

export async function purgePetMovieProject(projectId: string): Promise<void> {
  const [assets, deliverables] = await Promise.all([
    listPetMovieAssets(projectId),
    listPetMovieDeliverables(projectId),
  ])
  await deleteR2Objects([
    ...assets.map((asset) => asset.object_key),
    ...deliverables.map((item) => item.object_key),
  ])
  const db = requirePetMovieDatabase()
  const { error } = await db.from(PET_MOVIE_TABLES.PROJECTS).delete().eq("id", projectId)
  if (error) throw new Error(`Project deletion failed: ${error.message}`)
}

export async function purgeExpiredPetMovieProjects(limit = 100): Promise<string[]> {
  const db = requirePetMovieDatabase()
  const { data, error } = await db.from(PET_MOVIE_TABLES.PROJECTS)
    .select("id")
    .lte("expires_at", new Date().toISOString())
    .order("expires_at")
    .limit(Math.max(1, Math.min(limit, 100)))
  if (error) throw new Error(`Expired project lookup failed: ${error.message}`)
  const purged: string[] = []
  for (const row of data ?? []) {
    await purgePetMovieProject(String(row.id))
    purged.push(String(row.id))
  }
  return purged
}
