import { createHash } from "node:crypto"
import { PET_MOVIE_TABLES, requirePetMovieDatabase } from "./data"

const WINDOW_MINUTES = 15
const MAX_PROJECTS_PER_WINDOW = 5

function requesterIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || null
}

function ipHash(ip: string): string {
  const salt = process.env.PET_MOVIE_RATE_LIMIT_SALT?.trim() || "pet-life-movie-rate-limit-v1"
  return createHash("sha256").update(`${salt}:${ip}`, "utf8").digest("hex")
}

export async function checkPetMovieProjectRateLimit(request: Request): Promise<{ allowed: boolean; requesterHash: string | null }> {
  const ip = requesterIp(request)
  if (!ip) return { allowed: true, requesterHash: null }
  const requesterHash = ipHash(ip)
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const db = requirePetMovieDatabase()
  const { count, error } = await db.from(PET_MOVIE_TABLES.EVENTS)
    .select("id", { count: "exact", head: true })
    .eq("event_type", "project_created")
    .eq("metadata->>requester_hash", requesterHash)
    .gte("created_at", since)
  if (error) throw new Error(`Project rate-limit check failed: ${error.message}`)
  return { allowed: (count ?? 0) < MAX_PROJECTS_PER_WINDOW, requesterHash }
}

