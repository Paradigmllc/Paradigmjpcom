import { z } from "zod"
import {
  PET_MARKETING_CAMPAIGN_STATUSES,
  PET_MARKETING_EVENT_NAMES,
  PET_MARKETING_LOCALES,
  PET_MARKETING_SLOTS,
} from "./types"

const optionalTrackingValue = z.string().trim().max(120).optional()

export const petMarketingAttributionSchema = z.object({
  eventName: z.enum(PET_MARKETING_EVENT_NAMES),
  anonymousId: z.string().uuid(),
  locale: z.enum(PET_MARKETING_LOCALES),
  market: z.string().trim().regex(/^[A-Z]{2}$/).optional(),
  path: z.string().trim().startsWith("/").max(300),
  referrer: z.string().url().max(500).optional(),
  utmSource: optionalTrackingValue,
  utmMedium: optionalTrackingValue,
  utmCampaign: optionalTrackingValue,
  utmContent: optionalTrackingValue,
})

export const petMarketingRunSchema = z.object({
  slot: z.enum(PET_MARKETING_SLOTS),
  runDate: z.string().date().optional(),
})

export const petMarketingCampaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(PET_MARKETING_CAMPAIGN_STATUSES),
})
