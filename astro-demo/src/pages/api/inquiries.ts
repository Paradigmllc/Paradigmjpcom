import type { APIRoute } from "astro"

const API_BASE = process.env.API_BASE || process.env.PUBLIC_API_BASE || "https://paradigmjp.com"

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : ""
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData()
  const honeypot = text(form.get("website"))
  if (honeypot) return jsonResponse({ ok: true, ignored: true })

  const slug = text(form.get("slug")) || "unknown"
  const name = text(form.get("name"))
  const email = text(form.get("email"))
  const message = text(form.get("message"))
  const company = text(form.get("company"))
  const clientCompany = text(form.get("client_company"))
  const topic = text(form.get("topic"))
  const timeline = text(form.get("timeline"))

  if (!name || !email || !message) {
    return jsonResponse({ ok: false, error: "missing_required_fields" }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "invalid_email" }, 400)
  }

  const params = new URLSearchParams({
    event: "demo_inquiry",
    slug,
    company,
    topic,
    timeline,
  })

  try {
    await fetch(`${API_BASE}/api/track?${params.toString()}`, {
      method: "GET",
      keepalive: true,
      headers: {
        "x-source": "astro-demo-inquiry",
      },
    })
  } catch (error) {
    console.warn("[inquiries] tracking failed", error)
  }

  console.info("[inquiries] received", {
    slug,
    company,
    clientCompany,
    topic,
    timeline,
    emailDomain: email.split("@")[1] || "",
    messageLength: message.length,
  })

  return jsonResponse({ ok: true })
}
