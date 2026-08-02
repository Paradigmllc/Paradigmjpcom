import { z } from "zod"
import { CONTENT_PLATFORMS, CONTENT_STATUSES, CONTENT_TYPES, PRODUCT_STATUSES } from "./types"

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PRODUCT_STATUSES),
  inventoryOnHand: z.coerce.number().int().min(0).max(100_000),
  clipReady: z.coerce.number().int().min(0).max(500),
  photoReady: z.coerce.number().int().min(0).max(500),
  shopifyHandle: z.string().trim().max(255).optional().nullable(),
  supplierUrl: z.union([z.url({ protocol: /^https$/ }), z.literal("")]).optional().default(""),
  primaryImageUrl: z.union([z.url({ protocol: /^https$/ }), z.literal("")]).optional().default(""),
  originCountryCode: z.union([z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()), z.literal("")]).optional().default(""),
  hsCode: z.string().trim().max(32).optional().default(""),
  fulfillmentDays: z.coerce.number().int().min(0).max(365).default(0),
  supplierVerified: z.coerce.boolean().default(false),
  sampleVerified: z.coerce.boolean().default(false),
  imageRightsVerified: z.coerce.boolean().default(false),
  complianceVerified: z.coerce.boolean().default(false),
  fulfillmentVerified: z.coerce.boolean().default(false),
})

export const createContentSchema = z.object({
  productId: z.union([z.string().uuid(), z.literal("")]).optional(),
  platform: z.enum(CONTENT_PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  hook: z.string().trim().min(8).max(500),
  locale: z.string().trim().min(2).max(10).default("en"),
})

export const updateContentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CONTENT_STATUSES),
})

export const dailyMetricSchema = z.object({
  metricDate: z.iso.date(),
  sessions: z.coerce.number().int().min(0).max(100_000_000),
  videoViews: z.coerce.number().int().min(0).max(1_000_000_000),
  profileVisits: z.coerce.number().int().min(0).max(100_000_000),
  linkClicks: z.coerce.number().int().min(0).max(100_000_000),
  productViews: z.coerce.number().int().min(0).max(100_000_000),
  addToCarts: z.coerce.number().int().min(0).max(10_000_000),
  checkouts: z.coerce.number().int().min(0).max(10_000_000),
  orders: z.coerce.number().int().min(0).max(10_000_000),
  revenueUsd: z.coerce.number().min(0).max(1_000_000_000),
  variableCostJpy: z.coerce.number().int().min(0).max(100_000_000_000),
  tiktokFollowers: z.coerce.number().int().min(0).max(1_000_000_000),
  instagramFollowers: z.coerce.number().int().min(0).max(1_000_000_000),
  notes: z.string().trim().max(1_000).optional().nullable(),
})

export const baseSyncSchema = z.object({
  mode: z.enum(["dry_run", "apply"]),
})

export const socialRunSchema = z.object({
  runDate: z.union([z.iso.date(), z.literal("")]).optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateContentStatusInput = z.infer<typeof updateContentStatusSchema>
export type DailyMetricInput = z.infer<typeof dailyMetricSchema>
export type BaseSyncInput = z.infer<typeof baseSyncSchema>
export type SocialRunInput = z.infer<typeof socialRunSchema>
