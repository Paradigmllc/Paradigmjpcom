import { NextResponse } from "next/server"
import { z } from "zod"
import { PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse } from "@/lib/pet-life-movie/http"
import { parseJsonBody } from "@/lib/pet-life-movie/schema"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const callbackSchema = z.object({
  jobId: z.string().uuid(),
  outputUrl: z.string().url(),
  qualityScore: z.number().min(0).max(1),
  usedFallbackMotion: z.boolean(),
})

export async function POST(request: Request) {
  try {
    const secret = process.env.PET_MOVIE_RENDERER_WEBHOOK_SECRET
    if (!secret || request.headers.get("x-renderer-secret") !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
    const input = callbackSchema.parse(await parseJsonBody(request))
    if (input.qualityScore < 0.78 && !input.usedFallbackMotion) {
      return NextResponse.json({ ok: false, error: "Identity quality is below threshold; parallax fallback is required." }, { status: 409 })
    }
    const db = requirePetMovieDatabase()
    const { data: job, error: jobError } = await db.from(PET_MOVIE_TABLES.JOBS)
      .update({ status: "succeeded", progress: 100, output_url: input.outputUrl, completed_at: new Date().toISOString() })
      .eq("id", input.jobId)
      .eq("job_type", "full_render")
      .select("project_id")
      .single()
    if (jobError) throw new Error(`Render job completion failed: ${jobError.message}`)
    const { data: project, error: projectError } = await db.from(PET_MOVIE_TABLES.PROJECTS)
      .update({ status: "delivered", delivery_url: input.outputUrl })
      .eq("id", String(job.project_id))
      .select("pet_name, locale, share_slug")
      .single()
    if (projectError) throw new Error(`Project delivery update failed: ${projectError.message}`)
    await Promise.all([
      recordPetMovieEvent(String(job.project_id), "render_delivered", String(project.locale), {
        qualityScore: input.qualityScore,
        usedFallbackMotion: input.usedFallbackMotion,
      }),
      notifyBothChannels("Pet Life Movie delivered", {
        title: "Pet Life Movie: render delivered",
        message: `${String(project.pet_name)} / quality ${input.qualityScore.toFixed(2)}`,
        link: input.outputUrl,
        type: "pet_movie_delivered",
        priority: 100,
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return petMovieErrorResponse(error, "render callback failed")
  }
}

