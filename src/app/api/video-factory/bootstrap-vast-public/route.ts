import { NextRequest, NextResponse } from "next/server"
import { GET as bootstrapRequest } from "../bootstrap-vast/route"
import { bootstrapIsComplete } from "@/lib/video-factory-vast-bootstrap"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const ALLOWED_ACTIONS = new Set(["public-key", "configure", "status", "finalize"])

function internalApiKey(): string {
  const value = process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  if (!value?.trim()) throw new Error("Video Factory internal API key is unavailable")
  return value.trim()
}

function noStore(response: Response): NextResponse {
  const headers = new Headers(response.headers)
  headers.set("Cache-Control", "private, no-store, max-age=0")
  headers.set("Pragma", "no-cache")
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return new NextResponse(response.body, { status: response.status, headers })
}

async function invoke(request: NextRequest, action: string): Promise<NextResponse> {
  const url = new URL(request.url)
  url.pathname = "/api/video-factory/bootstrap-vast"
  url.searchParams.set("action", action)
  url.searchParams.set("token", internalApiKey())
  const headers = new Headers(request.headers)
  headers.set("X-Video-Factory-Bootstrap-Internal", "1")
  const delegated = new NextRequest(url, { method: "GET", headers })
  return noStore(await bootstrapRequest(delegated))
}

async function parsed(response: Response): Promise<any> {
  const text = await response.clone().text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") || "status"
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported public bootstrap action" },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    )
  }

  if (action === "configure") {
    if (bootstrapIsComplete()) {
      return invoke(request, "status")
    }
    const ciphertext = request.nextUrl.searchParams.get("ciphertext")
    if (!ciphertext) {
      return NextResponse.json(
        { ok: false, error: "ciphertext is required" },
        { status: 422, headers: { "Cache-Control": "private, no-store" } },
      )
    }
    const configured = await invoke(request, "configure")
    const configuration = await parsed(configured)
    if (!configured.ok || !configuration?.ok) return configured

    const provisionUrl = new URL(request.url)
    provisionUrl.searchParams.delete("ciphertext")
    const provisioned = await invoke(new NextRequest(provisionUrl), "provision")
    const provisioning = await parsed(provisioned)
    if (!provisioned.ok || !provisioning?.ok) return provisioned
    return NextResponse.json(
      {
        ...provisioning,
        credential_configured: true,
        scoped_key_created: configuration.scoped_key_created,
      },
      {
        status: provisioned.status,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Pragma: "no-cache",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    )
  }

  return invoke(request, action)
}
