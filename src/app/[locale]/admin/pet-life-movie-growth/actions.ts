"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { globalRunDate, runGlobalPetMarketingPipeline } from "@/lib/pet-life-movie/marketing/pipeline"
import { updatePetMarketingCampaignStatus } from "@/lib/pet-life-movie/marketing/repository"
import { petMarketingCampaignStatusSchema, petMarketingRunSchema } from "@/lib/pet-life-movie/marketing/schema"

export type PetGrowthActionResult = { ok: true; message: string } | { ok: false; error: string }

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })
  if (!auth.ok) throw new Error("管理者認証が必要です")
}

function failure(error: unknown): PetGrowthActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "処理に失敗しました" }
}

export async function runPetMarketingSlotAction(formData: FormData): Promise<PetGrowthActionResult> {
  try {
    await requireAdmin()
    const input = petMarketingRunSchema.parse({
      slot: formData.get("slot"),
      runDate: formData.get("runDate") || globalRunDate(),
    })
    const run = await runGlobalPetMarketingPipeline(input.slot, input.runDate)
    const message = `${input.slot}: ${run.generatedPostCount}件生成 / ${run.publishedPostCount}件公開 / ${run.blockedPostCount}件保留`
    const notification = await notifyBothChannels(`Pet Life Movie 世界配信 ${message}`, {
      title: "Pet Life Movie Global Growth",
      message,
      link: "/ja/admin/pet-life-movie-growth",
      type: "pet_movie_marketing_manual_run",
      region: "global",
      priority: run.status === "failed" ? 95 : run.status === "degraded" ? 75 : 60,
      idempotencyKey: `pet-marketing-manual:${run.runKey}:${run.status}`,
    })
    if (!notification.ok) console.error("[pet-growth-action] notification incomplete", notification)
    revalidatePath("/ja/admin/pet-life-movie-growth")
    return run.status === "failed" ? { ok: false, error: message } : { ok: true, message }
  } catch (error) {
    console.error("[pet-growth-action] manual run failed", error)
    return failure(error)
  }
}

export async function updatePetMarketingCampaignAction(formData: FormData): Promise<PetGrowthActionResult> {
  try {
    await requireAdmin()
    const input = petMarketingCampaignStatusSchema.parse({
      campaignId: formData.get("campaignId"),
      status: formData.get("status"),
    })
    const campaign = await updatePetMarketingCampaignStatus(input.campaignId, input.status)
    const message = `${campaign.name} を ${campaign.status} に更新しました`
    await notifyBothChannels(message, {
      title: "Pet Life Movie キャンペーン更新",
      message,
      link: "/ja/admin/pet-life-movie-growth",
      type: "pet_movie_marketing_campaign_update",
      region: "global",
      priority: campaign.status === "paused" ? 80 : 60,
    })
    revalidatePath("/ja/admin/pet-life-movie-growth")
    return { ok: true, message }
  } catch (error) {
    console.error("[pet-growth-action] campaign update failed", error)
    return failure(error)
  }
}
