import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, listPetMovieAssets, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse } from "@/lib/pet-life-movie/http"
import { confirmPetMovieUploadsSchema, parseJsonBody, petMovieUploadSchema } from "@/lib/pet-life-movie/schema"
import { createR2SignedUploads, deleteR2Objects, sanitizeR2ObjectName, verifyPrivateR2ImageObjects } from "@/lib/sales/r2-storage"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    const input = petMovieUploadSchema.parse(await parseJsonBody(request))
    const existing = await listPetMovieAssets(project.id)
    if (existing.length + input.files.length > 20) {
      return NextResponse.json({ ok: false, error: "A project can contain up to 20 photos." }, { status: 400 })
    }
    const rows = input.files.map((file, index) => {
      const assetId = randomUUID()
      const safeName = sanitizeR2ObjectName(file.name) || `photo-${index + 1}`
      return {
        id: assetId,
        project_id: project.id,
        object_key: `pet-life-movie/${project.id}/originals/${assetId}-${safeName}`,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        sort_order: existing.length + index,
        consent_confirmed: true,
      }
    })
    const db = requirePetMovieDatabase()
    const { error: insertError } = await db.from(PET_MOVIE_TABLES.ASSETS).insert(rows)
    if (insertError) throw new Error(`Could not reserve photo uploads: ${insertError.message}`)
    try {
      const signed = await createR2SignedUploads(rows.map((row) => ({ objectKey: row.object_key, contentType: row.mime_type })))
      return NextResponse.json({
        ok: true,
        uploads: rows.map((row, index) => ({ assetId: row.id, uploadUrl: signed[index].uploadUrl, contentType: row.mime_type })),
      })
    } catch (error) {
      const { error: cleanupError } = await db.from(PET_MOVIE_TABLES.ASSETS).delete().in("id", rows.map((row) => row.id))
      if (cleanupError) console.error("[pet-life-movie] upload reservation cleanup failed", cleanupError.message)
      throw error
    }
  } catch (error) {
    return petMovieErrorResponse(error, "sign uploads failed")
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    const input = confirmPetMovieUploadsSchema.parse(await parseJsonBody(request))
    const db = requirePetMovieDatabase()
    const { data: reserved, error: reservedError } = await db.from(PET_MOVIE_TABLES.ASSETS)
      .select("id, object_key, mime_type, size_bytes")
      .eq("project_id", project.id)
      .is("contributor_id", null)
      .eq("upload_status", "pending")
      .in("id", input.assetIds)
    if (reservedError) throw new Error(`Could not load reserved photo uploads: ${reservedError.message}`)
    if ((reserved ?? []).length !== input.assetIds.length) {
      return NextResponse.json({ ok: false, error: "One or more photo reservations are invalid." }, { status: 409 })
    }
    try {
      await verifyPrivateR2ImageObjects((reserved ?? []).map((asset) => ({
        objectKey: String(asset.object_key),
        contentType: String(asset.mime_type),
        sizeBytes: Number(asset.size_bytes),
      })))
    } catch (error) {
      const objectKeys = (reserved ?? []).map((asset) => String(asset.object_key))
      try {
        await deleteR2Objects(objectKeys)
      } catch (cleanupError) {
        console.error("[pet-life-movie] invalid owner upload R2 cleanup failed", cleanupError)
      }
      const { error: cleanupError } = await db.from(PET_MOVIE_TABLES.ASSETS).delete().in("id", input.assetIds)
      if (cleanupError) console.error("[pet-life-movie] invalid owner upload row cleanup failed", cleanupError.message)
      throw error
    }
    const { data, error } = await db.from(PET_MOVIE_TABLES.ASSETS)
      .update({ upload_status: "uploaded" })
      .eq("project_id", project.id)
      .is("contributor_id", null)
      .in("id", input.assetIds)
      .select("id")
    if (error) throw new Error(`Could not confirm photo uploads: ${error.message}`)
    if ((data ?? []).length !== input.assetIds.length) {
      return NextResponse.json({ ok: false, error: "One or more photos do not belong to this project." }, { status: 403 })
    }
    const { error: projectError } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({ status: "uploaded" }).eq("id", project.id)
    if (projectError) throw new Error(`Could not update project: ${projectError.message}`)
    await Promise.all([
      recordPetMovieEvent(project.id, "photos_uploaded", project.locale, { count: input.assetIds.length }),
      notifyBothChannels("Pet Life Movie photos uploaded", {
        title: "Pet Life Movie: photos ready",
        message: `${project.pet_name}: ${input.assetIds.length} photos uploaded`,
        type: "pet_movie_photos_uploaded",
      }),
    ])
    return NextResponse.json({ ok: true, uploaded: input.assetIds.length })
  } catch (error) {
    return petMovieErrorResponse(error, "confirm uploads failed")
  }
}

