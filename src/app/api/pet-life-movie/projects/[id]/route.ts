import { NextResponse } from "next/server"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, listPetMovieAssets, projectResponse } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse } from "@/lib/pet-life-movie/http"

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

