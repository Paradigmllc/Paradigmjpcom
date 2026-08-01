import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { authorizePetMovieContributor, listPetMovieAssets, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse, siteBaseUrl } from "@/lib/pet-life-movie/http"
import { buildFactualStoryboard } from "@/lib/pet-life-movie/storyboard"
import { confirmPetMovieUploadsSchema, parseJsonBody, petMovieUploadSchema } from "@/lib/pet-life-movie/schema"
import { createR2SignedUploads, sanitizeR2ObjectName } from "@/lib/sales/r2-storage"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const authorized = await authorizePetMovieContributor(token)
    if (!authorized) return NextResponse.json({ ok: false, error: "Invite is invalid or expired." }, { status: 404 })
    const input = petMovieUploadSchema.parse(await parseJsonBody(request))
    const existing = await listPetMovieAssets(authorized.project.id)
    if (existing.length + input.files.length > 20) return NextResponse.json({ ok: false, error: "This project already has the maximum of 20 photos." }, { status: 400 })
    const rows = input.files.map((file, index) => {
      const assetId = randomUUID()
      const safeName = sanitizeR2ObjectName(file.name) || `contribution-${index + 1}`
      return {
        id: assetId,
        project_id: authorized.project.id,
        contributor_id: authorized.contributorId,
        object_key: `pet-life-movie/${authorized.project.id}/originals/${assetId}-${safeName}`,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        sort_order: existing.length + index,
        consent_confirmed: true,
      }
    })
    const db = requirePetMovieDatabase()
    const { error: insertError } = await db.from(PET_MOVIE_TABLES.ASSETS).insert(rows)
    if (insertError) throw new Error(`Contribution reservation failed: ${insertError.message}`)
    try {
      const signed = await createR2SignedUploads(rows.map((row) => ({ objectKey: row.object_key, contentType: row.mime_type })))
      return NextResponse.json({ ok: true, petName: authorized.project.pet_name, uploads: rows.map((row, index) => ({ assetId: row.id, uploadUrl: signed[index].uploadUrl, contentType: row.mime_type })) })
    } catch (error) {
      const { error: cleanupError } = await db.from(PET_MOVIE_TABLES.ASSETS).delete().in("id", rows.map((row) => row.id))
      if (cleanupError) console.error("[pet-life-movie] contribution cleanup failed", cleanupError.message)
      throw error
    }
  } catch (error) {
    return petMovieErrorResponse(error, "sign contribution uploads failed")
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const authorized = await authorizePetMovieContributor(token)
    if (!authorized) return NextResponse.json({ ok: false, error: "Invite is invalid or expired." }, { status: 404 })
    const input = confirmPetMovieUploadsSchema.parse(await parseJsonBody(request))
    const db = requirePetMovieDatabase()
    const { data, error } = await db.from(PET_MOVIE_TABLES.ASSETS)
      .update({ upload_status: "uploaded" })
      .eq("project_id", authorized.project.id)
      .eq("contributor_id", authorized.contributorId)
      .in("id", input.assetIds)
      .select("id")
    if (error) throw new Error(`Contribution confirmation failed: ${error.message}`)
    if ((data ?? []).length !== input.assetIds.length) return NextResponse.json({ ok: false, error: "Photo ownership check failed." }, { status: 403 })
    const assets = await listPetMovieAssets(authorized.project.id, true)
    const storyboard = buildFactualStoryboard(authorized.project, assets)
    const previewUrl = `${siteBaseUrl()}/${authorized.project.locale}/pet-life-movie/memories/${authorized.project.share_slug}`
    const [{ error: projectError }, { error: contributorError }] = await Promise.all([
      db.from(PET_MOVIE_TABLES.PROJECTS).update({ storyboard, status: "preview_ready", preview_url: previewUrl }).eq("id", authorized.project.id),
      db.from(PET_MOVIE_TABLES.CONTRIBUTORS).update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", authorized.contributorId),
    ])
    if (projectError) throw new Error(`Shared storyboard update failed: ${projectError.message}`)
    if (contributorError) throw new Error(`Contributor acceptance failed: ${contributorError.message}`)
    await Promise.all([
      recordPetMovieEvent(authorized.project.id, "contribution_uploaded", authorized.project.locale, { count: input.assetIds.length }),
      notifyBothChannels("Pet Life Movie contribution added", {
        title: "Pet Life Movie: family photos added",
        message: `${authorized.project.pet_name}: ${input.assetIds.length} new photos`,
        link: previewUrl,
        type: "pet_movie_contribution_uploaded",
      }),
    ])
    return NextResponse.json({ ok: true, previewUrl })
  } catch (error) {
    return petMovieErrorResponse(error, "confirm contribution uploads failed")
  }
}

