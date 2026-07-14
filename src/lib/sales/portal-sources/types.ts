import type { Industry } from "../types"

export const PORTAL_SOURCES = ["houzz", "ekiten", "jmty"] as const
export type PortalSource = (typeof PORTAL_SOURCES)[number]

export interface PortalSourceAdapter {
  source: PortalSource
  label: string
  allowedHosts: readonly string[]
  defaultIndustry: Industry
}

export interface PortalImageCandidate {
  url: string
  alt: string
}

export interface PortalCandidateExtraction {
  source: PortalSource
  listingUrl: string
  companyName: string
  category: string
  description: string
  address: string | null
  phone: string | null
  prefecture: string | null
  websiteUrl: string | null
  socialLinks: string[]
  contactUrl: string
  images: PortalImageCandidate[]
  suggestedIndustry: Industry
  fetchedAt: string
  status: "ready_for_review" | "has_website" | "insufficient_content"
}

export interface PortalCandidateImportResult {
  url: string
  ok: boolean
  candidate?: PortalCandidateExtraction
  error?: string
}
