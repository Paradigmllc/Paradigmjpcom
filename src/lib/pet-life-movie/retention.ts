import { deleteR2Objects } from "@/lib/sales/r2-storage"
import { expireCheckoutSession } from "@/lib/stripe"
import {
  listPetMovieAssets,
  listPetMovieDeliverables,
  PET_MOVIE_TABLES,
  requirePetMovieDatabase,
} from "./data"

export async function purgePetMovieProject(projectId: string): Promise<void> {
  const db = requirePetMovieDatabase()
  const [assets, deliverables, projectResult] = await Promise.all([
    listPetMovieAssets(projectId),
    listPetMovieDeliverables(projectId),
    db.from(PET_MOVIE_TABLES.PROJECTS)
      .select("stripe_checkout_session_id")
      .eq("id", projectId)
      .maybeSingle(),
  ])
  if (projectResult.error) throw new Error(`Project checkout lookup failed: ${projectResult.error.message}`)
  const checkoutSessionId = typeof projectResult.data?.stripe_checkout_session_id === "string"
    ? projectResult.data.stripe_checkout_session_id
    : null
  if (checkoutSessionId) {
    const expired = await expireCheckoutSession(checkoutSessionId)
    if (!expired.ok) throw new Error("Active checkout could not be closed before project deletion")
  }
  await deleteR2Objects([
    ...assets.map((asset) => asset.object_key),
    ...deliverables.map((item) => item.object_key),
  ])
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
