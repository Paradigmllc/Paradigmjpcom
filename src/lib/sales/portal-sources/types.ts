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

export interface PortalOperatorSnapshot {
  source: PortalSource
  listingUrl: string
  companyName: string
  category: string
  description: string
  address?: string | null
  phone?: string | null
  websiteUrl?: string | null
  socialLinks?: string[]
  images: PortalImageCandidate[]
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
  smbFit: {
    eligible: boolean
    score: number
    decisionSignals: string[]
    enterpriseSignals: string[]
    reasons: string[]
  }
  fetchedAt: string
  status: "ready_for_review" | "has_website" | "insufficient_content" | "enterprise_like" | "decision_fit_unverified"
}

export interface PortalCandidateImportResult {
  url: string
  ok: boolean
  candidate?: PortalCandidateExtraction
  error?: string
}
