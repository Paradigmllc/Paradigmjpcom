import { z } from "zod"
import {
  VIDEO_GROWTH_BILLING_STATUSES,
  VIDEO_GROWTH_PLANS,
  VIDEO_GROWTH_PRIORITIES,
  VIDEO_GROWTH_WORK_STATUSES,
} from "./types"

const noteSchema = z.string().trim().min(2).max(2000)
const optionalText = (max: number) => z.string().trim().max(max).optional().default("")
const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]).optional().default("")
const optionalHttpsUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(2000).refine((value) => value.startsWith("https://"), "HTTPS URLが必要です"),
]).optional().default("")
const httpsUrlSchema = z.string().trim().url().max(2000).refine(
  (value) => value.startsWith("https://"),
  "HTTPS URLが必要です",
)
const futureDateTime = z.string().datetime().refine(
  (value) => new Date(value).getTime() > Date.now(),
  "未来の日時を指定してください",
)

const workOrderFields = {
  clientName: z.string().trim().min(2).max(160),
  clientContactName: optionalText(120),
  clientContactEmail: optionalEmail,
  plan: z.enum(VIDEO_GROWTH_PLANS),
  monthlyVideoQuota: z.number().int().min(1).max(100),
  billingStatus: z.enum(VIDEO_GROWTH_BILLING_STATUSES),
  priority: z.enum(VIDEO_GROWTH_PRIORITIES),
  timezone: z.string().trim().min(2).max(64),
  languages: z.array(z.string().trim().min(2).max(16)).min(1).max(10),
  contractReference: optionalText(200),
  purchaseOrderReference: optionalText(200),
  deliveryOwner: z.string().trim().min(2).max(120),
  clientApprover: optionalText(120),
  kickoffAt: z.union([z.literal(""), z.string().datetime()]).optional().default(""),
  deliveryDueAt: futureDateTime,
}

export const createVideoGrowthCampaignSchema = z.object({
  name: z.string().trim().min(3).max(160),
  studioProjectId: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,71}$/),
  objective: z.string().trim().min(10).max(1000),
  audience: z.string().trim().min(3).max(500),
  offer: z.string().trim().min(3).max(500),
  landingUrl: httpsUrlSchema,
  ...workOrderFields,
})

export const transitionVideoGrowthCampaignSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request_review"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema }),
  z.object({ action: z.literal("approve"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: z.string().trim().min(8).max(2000) }),
  z.object({ action: z.literal("schedule"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema, scheduledFor: futureDateTime }),
  z.object({ action: z.literal("pause"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema }),
  z.object({ action: z.literal("resume"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema }),
  z.object({ action: z.literal("complete"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema }),
  z.object({ action: z.literal("cancel"), campaignId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: noteSchema }),
])

const variantBase = {
  variantId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  note: noteSchema,
}

export const updateVideoGrowthVariantSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_copy"), ...variantBase,
    hook: z.string().trim().max(500), caption: z.string().trim().max(3000),
    cta: z.string().trim().max(300), deliverableName: z.string().trim().max(120),
  }),
  z.object({ action: z.literal("mark_ready"), ...variantBase }),
  z.object({ action: z.literal("publish"), ...variantBase, publishUrl: httpsUrlSchema }),
  z.object({ action: z.literal("fail"), ...variantBase, errorMessage: z.string().trim().min(3).max(1000) }),
])

export const updateVideoGrowthWorkOrderSchema = z.object({
  action: z.literal("update"),
  campaignId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  workStatus: z.enum(VIDEO_GROWTH_WORK_STATUSES),
  note: noteSchema,
  ...workOrderFields,
  deliveryDueAt: z.string().datetime(),
})

export const updateVideoGrowthReadinessSchema = z.object({
  action: z.literal("update"),
  checkId: z.string().uuid(),
  checkKey: z.enum(["contract", "payment", "brief", "brand_assets", "usage_rights", "landing_page", "tracking"]),
  expectedRevision: z.number().int().positive(),
  status: z.enum(["pending", "passed", "waived", "failed"]),
  note: z.string().trim().max(2000),
  evidenceUrl: optionalHttpsUrl,
})

export const updateVideoGrowthBillingSchema = z.object({
  action: z.literal("update"),
  campaignId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  billingStatus: z.enum(VIDEO_GROWTH_BILLING_STATUSES),
  note: noteSchema,
})

export const manageVideoGrowthApprovalSchema = z.object({
  variantId: z.string().uuid(),
  expectedContentRevision: z.number().int().positive(),
  stage: z.enum(["internal_quality", "client_release"]),
  action: z.enum(["request", "approve", "changes_requested", "reject"]),
  note: z.string().trim().min(4).max(2000),
  evidenceUrl: optionalHttpsUrl,
})

export const manageVideoGrowthRevisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"), variantId: z.string().uuid(), expectedRevision: z.number().int().positive(),
    category: z.enum(["copy", "visual", "audio", "subtitles", "legal", "other"]),
    severity: z.enum(["minor", "major", "blocking"]), description: z.string().trim().min(5).max(2000),
    assignedTo: optionalText(120), dueAt: z.union([z.literal(""), futureDateTime]).optional().default(""),
  }),
  z.object({ action: z.literal("start"), revisionRequestId: z.string().uuid(), expectedRevision: z.number().int().positive(), assignedTo: optionalText(120), resolutionNote: z.string().trim().max(2000).optional().default("") }),
  z.object({ action: z.literal("resolve"), revisionRequestId: z.string().uuid(), expectedRevision: z.number().int().positive(), assignedTo: optionalText(120), resolutionNote: z.string().trim().min(5).max(2000) }),
  z.object({ action: z.literal("reject"), revisionRequestId: z.string().uuid(), expectedRevision: z.number().int().positive(), assignedTo: optionalText(120), resolutionNote: z.string().trim().min(5).max(2000) }),
])

export const recordVideoGrowthDailyMetricsSchema = z.object({
  action: z.literal("record_daily"),
  variantId: z.string().uuid(), metricDate: z.string().date(),
  expectedRevision: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(), views: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(), replies: z.number().int().nonnegative(),
  meetings: z.number().int().nonnegative(), source: z.enum(["manual", "csv", "api"]).default("manual"),
})

export type CreateVideoGrowthCampaignInput = z.infer<typeof createVideoGrowthCampaignSchema>
export type TransitionVideoGrowthCampaignInput = z.infer<typeof transitionVideoGrowthCampaignSchema>
export type UpdateVideoGrowthVariantInput = z.infer<typeof updateVideoGrowthVariantSchema>
export type UpdateVideoGrowthWorkOrderInput = z.infer<typeof updateVideoGrowthWorkOrderSchema>
export type UpdateVideoGrowthReadinessInput = z.infer<typeof updateVideoGrowthReadinessSchema>
export type UpdateVideoGrowthBillingInput = z.infer<typeof updateVideoGrowthBillingSchema>
export type ManageVideoGrowthApprovalInput = z.infer<typeof manageVideoGrowthApprovalSchema>
export type ManageVideoGrowthRevisionInput = z.infer<typeof manageVideoGrowthRevisionSchema>
export type RecordVideoGrowthDailyMetricsInput = z.infer<typeof recordVideoGrowthDailyMetricsSchema>
