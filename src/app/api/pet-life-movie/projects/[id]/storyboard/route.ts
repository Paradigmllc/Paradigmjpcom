import { NextResponse } from "next/server"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, listPetMovieAssets, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse } from "@/lib/pet-life-movie/http"
import { buildFactualStoryboard } from "@/lib/pet-life-movie/storyboard"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    const assets = await listPetMovieAssets(project.id, true)
    const storyboard = buildFactualStoryboard(project, assets)
    const db = requirePetMovieDatabase()
    const { error } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
      storyboard,
      status: "storyboard_ready",
    }).eq("id", project.id)
    if (error) throw new Error(`Storyboard save failed: ${error.message}`)
    await Promise.all([
      recordPetMovieEvent(project.id, "storyboard_ready", project.locale, { scenes: storyboard.scenes.length }),
      notifyBothChannels("Pet Life Movie storyboard ready", {
        title: "Pet Life Movie: storyboard ready",
        message: `${project.pet_name}: ${storyboard.scenes.length} factual scenes`,
        type: "pet_movie_storyboard_ready",
      }),
    ])
    return NextResponse.json({ ok: true, storyboard })
  } catch (error) {
    return petMovieErrorResponse(error, "generate storyboard failed")
  }
}

