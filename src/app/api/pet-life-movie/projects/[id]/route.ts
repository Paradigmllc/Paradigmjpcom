import { NextResponse } from "next/server"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, listPetMovieAssets, projectResponse } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse } from "@/lib/pet-life-movie/http"
import { purgePetMovieProject } from "@/lib/pet-life-movie/retention"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    const assets = await listPetMovieAssets(project.id)
    return NextResponse.json({ ok: true, project: projectResponse(project, assets) })
  } catch (error) {
    return petMovieErrorResponse(error, "load project failed")
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    await purgePetMovieProject(project.id)
    await notifyBothChannels("Pet Life Movie project deleted", {
      title: "Pet Life Movie: customer deletion completed",
      message: `${project.pet_name} / ${project.id}`,
      type: "pet_movie_deleted",
      priority: 80,
    })
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return petMovieErrorResponse(error, "delete project failed")
  }
}

