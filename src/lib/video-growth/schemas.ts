import { z } from "zod"

const actorSchema = z.string().trim().min(2).max(120)
const noteSchema = z.string().trim().min(2).max(2000)
const httpsUrlSchema = z.string().trim().url().max(2000).refine(
  (value) => value.startsWith("https://"),
  "HTTPS URLが必要です",
)

export const createVideoGrowthCampaignSchema = z.object({
  name: z.string().trim().min(3).max(160),
  studioProjectId: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,71}$/),
  objective: z.string().trim().min(10).max(1000),
  audience: z.string().trim().min(3).max(500),
  offer: z.string().trim().min(3).max(500),
  landingUrl: httpsUrlSchema,
  owner: actorSchema,
  actor: actorSchema,
})

export const transitionVideoGrowthCampaignSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request_review"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema }),
  z.object({ action: z.literal("approve"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: z.string().trim().min(8).max(2000) }),
  z.object({ action: z.literal("schedule"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema, scheduledFor: z.string().datetime() }),
  z.object({ action: z.literal("pause"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema }),
  z.object({ action: z.literal("resume"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema }),
  z.object({ action: z.literal("complete"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema }),
  z.object({ action: z.literal("cancel"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), actor: actorSchema, note: noteSchema }),
])

const variantBase = {
  variantId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  actor: actorSchema,
  note: noteSchema,
}

export const updateVideoGrowthVariantSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_copy"),
    ...variantBase,
    hook: z.string().trim().max(500),
    caption: z.string().trim().max(3000),
    cta: z.string().trim().max(300),
    deliverableName: z.string().trim().max(120),
  }),
  z.object({ action: z.literal("mark_ready"), ...variantBase }),
  z.object({ action: z.literal("publish"), ...variantBase, publishUrl: httpsUrlSchema }),
  z.object({
    action: z.literal("record_metrics"),
    ...variantBase,
    impressions: z.number().int().nonnegative(),
    views: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    replies: z.number().int().nonnegative(),
    meetings: z.number().int().nonnegative(),
  }),
  z.object({ action: z.literal("fail"), ...variantBase, errorMessage: z.string().trim().min(3).max(1000) }),
])

export type CreateVideoGrowthCampaignInput = z.infer<typeof createVideoGrowthCampaignSchema>
export type TransitionVideoGrowthCampaignInput = z.infer<typeof transitionVideoGrowthCampaignSchema>
export type UpdateVideoGrowthVariantInput = z.infer<typeof updateVideoGrowthVariantSchema>
