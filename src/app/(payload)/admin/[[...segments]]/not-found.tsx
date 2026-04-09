import { NotFoundPage } from "@payloadcms/next/views"
import { importMap } from "../importMap.js"

export default function NotFound() {
  return NotFoundPage({ importMap })
}
