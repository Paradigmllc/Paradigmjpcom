import "server-only"

import { cookies } from "next/headers"
import { fetchDemoMultiPageData } from "./demo-page-fetch"
import { normalizeDemoRouteSlug, previewCookieName } from "./demo-private-access"

export async function fetchDemoMultiPageDataForRequest(slug: string) {
  const normalizedSlug = normalizeDemoRouteSlug(slug)
  const cookieStore = await cookies()
  const previewToken = cookieStore.get(previewCookieName(normalizedSlug))?.value
  return fetchDemoMultiPageData(normalizedSlug, { previewToken })
}
