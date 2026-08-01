import { NextResponse } from "next/server"
import { createPetMovieSecret, hashPetMovieSecret, readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse, siteBaseUrl } from "@/lib/pet-life-movie/http"
import { parseJsonBody, petMovieInviteSchema } from "@/lib/pet-life-movie/schema"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    const input = petMovieInviteSchema.parse(await parseJsonBody(request))
    const inviteToken = createPetMovieSecret()
    const db = requirePetMovieDatabase()
    const { error } = await db.from(PET_MOVIE_TABLES.CONTRIBUTORS).insert({
      project_id: project.id,
      invite_token_hash: hashPetMovieSecret(inviteToken),
      display_name: input.displayName,
      email: input.email ?? null,
    })
    if (error) throw new Error(`Invite creation failed: ${error.message}`)
    const inviteUrl = `${siteBaseUrl()}/${project.locale}/pet-life-movie/contribute/${inviteToken}`
    await Promise.all([
      recordPetMovieEvent(project.id, "contributor_invited", project.locale),
      notifyBothChannels("Pet Life Movie contributor invited", {
        title: "Pet Life Movie: contributor link created",
        message: `${project.pet_name} / ${input.displayName}`,
        type: "pet_movie_contributor_invited",
      }),
    ])
    return NextResponse.json({ ok: true, inviteUrl })
  } catch (error) {
    return petMovieErrorResponse(error, "create contributor invite failed")
  }
}

