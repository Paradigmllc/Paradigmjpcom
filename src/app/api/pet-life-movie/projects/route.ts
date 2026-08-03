import { NextResponse } from "next/server"
import { createPetMovieSecret, createShareSlug, hashPetMovieSecret } from "@/lib/pet-life-movie/auth"
import { PET_MOVIE_TABLES, projectResponse, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse, siteBaseUrl } from "@/lib/pet-life-movie/http"
import { createPetMovieProjectSchema, parseJsonBody } from "@/lib/pet-life-movie/schema"
import { checkPetMovieProjectRateLimit } from "@/lib/pet-life-movie/rate-limit"
import type { PetMovieProjectRow } from "@/lib/pet-life-movie/types"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const rateLimit = await checkPetMovieProjectRateLimit(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many projects were created from this connection. Please try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } },
      )
    }
    const input = createPetMovieProjectSchema.parse(await parseJsonBody(request))
    const accessToken = createPetMovieSecret()
    const db = requirePetMovieDatabase()
    const { data, error } = await db.from(PET_MOVIE_TABLES.PROJECTS).insert({
      access_token_hash: hashPetMovieSecret(accessToken),
      share_slug: createShareSlug(),
      pet_name: input.petName,
      pet_species: input.species,
      occasion: input.occasion,
      locale: input.locale,
      mood: input.mood,
      time_together: input.timeTogether,
      memories: input.memories,
      ai_motion_consent_at: new Date().toISOString(),
    }).select("*").single()
    if (error) throw new Error(`Project creation failed: ${error.message}`)
    const project = data as PetMovieProjectRow
    await Promise.all([
      recordPetMovieEvent(project.id, "project_created", project.locale, {
        occasion: project.occasion,
        requester_hash: rateLimit.requesterHash,
      }),
      notifyBothChannels("Pet Life Movie project created", {
        title: "Pet Life Movie: new project",
        message: `${project.pet_name} / ${project.locale} / ${project.occasion}`,
        link: `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`,
        type: "pet_movie_project_created",
      }),
    ])
    return NextResponse.json({ ok: true, project: projectResponse(project), accessToken }, { status: 201 })
  } catch (error) {
    return petMovieErrorResponse(error, "create project failed")
  }
}
