import "server-only"

import { cookies } from "next/headers"
import { fetchDemoMultiPageData } from "./demo-page-fetch"
import { previewCookieName } from "./demo-private-access"

export async function fetchDemoMultiPageDataForRequest(slug: string) {
  const cookieStore = await cookies()
  const previewToken = cookieStore.get(previewCookieName(slug))?.value
  return fetchDemoMultiPageData(slug, { previewToken })
}
