import type { DemoMultiPageData } from "./demo-site-types"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function isDemoMultiPageData(value: unknown): value is DemoMultiPageData {
  if (!isRecord(value) || !isRecord(value.pages)) return false
  return typeof value.slug === "string"
    && typeof value.companyName === "string"
    && isRecord(value.meta)
    && isRecord(value.pages.home)
    && isRecord(value.pages.about)
    && isRecord(value.pages.services)
    && isRecord(value.pages.contact)
}
