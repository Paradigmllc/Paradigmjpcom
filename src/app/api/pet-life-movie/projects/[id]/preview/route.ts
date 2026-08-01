import { NextResponse } from "next/server"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse, siteBaseUrl } from "@/lib/pet-life-movie/http"
import { buildPipelineManifest } from "@/lib/pet-life-movie/storyboard"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    if (!project.storyboard) return NextResponse.json({ ok: false, error: "Storyboard is not ready." }, { status: 409 })
    const previewUrl = `${siteBaseUrl()}/${project.locale}/pet-life-movie/memories/${project.share_slug}`
    const db = requirePetMovieDatabase()
    const { error: jobError } = await db.from(PET_MOVIE_TABLES.JOBS).insert({
      project_id: project.id,
      job_type: "preview",
      status: "succeeded",
      progress: 100,
      pipeline: buildPipelineManifest(),
      output_url: previewUrl,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    if (jobError) throw new Error(`Preview job creation failed: ${jobError.message}`)
    const { error } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
      status: "preview_ready",
      preview_url: previewUrl,
    }).eq("id", project.id)
    if (error) throw new Error(`Preview state update failed: ${error.message}`)
    await Promise.all([
      recordPetMovieEvent(project.id, "preview_ready", project.locale),
      notifyBothChannels("Pet Life Movie preview ready", {
        title: "Pet Life Movie: preview ready",
        message: `${project.pet_name} preview can now be shared`,
        link: previewUrl,
        type: "pet_movie_preview_ready",
      }),
    ])
    return NextResponse.json({ ok: true, previewUrl })
  } catch (error) {
    return petMovieErrorResponse(error, "create preview failed")
  }
}

