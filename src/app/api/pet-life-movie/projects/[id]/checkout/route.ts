import { NextResponse } from "next/server"
import { createCheckoutSession, expireCheckoutSession } from "@/lib/stripe"
import { readProjectToken } from "@/lib/pet-life-movie/auth"
import { authorizePetMovieProject, PET_MOVIE_TABLES, recordPetMovieEvent, requirePetMovieDatabase } from "@/lib/pet-life-movie/data"
import { petMovieErrorResponse, siteBaseUrl } from "@/lib/pet-life-movie/http"
import { parseJsonBody, petMovieCheckoutSchema } from "@/lib/pet-life-movie/schema"
import { getPetMovieMarketReadiness } from "@/lib/pet-life-movie/readiness"
import { PET_MOVIE_TERMS_VERSION } from "@/lib/pet-life-movie/commercial"
import { createPetMovieCheckoutIdempotencyKey } from "@/lib/pet-life-movie/checkout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PRICE_MAP = {
  mini: process.env.STRIPE_PRICE_PET_MOVIE_MINI,
  story: process.env.STRIPE_PRICE_PET_MOVIE_STORY,
  cinema: process.env.STRIPE_PRICE_PET_MOVIE_CINEMA,
} as const

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const project = await authorizePetMovieProject(id, readProjectToken(request))
    if (!project) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    if (!project.preview_url) return NextResponse.json({ ok: false, error: "Create a preview before checkout." }, { status: 409 })
    if (project.payment_status === "paid") {
      return NextResponse.json({ ok: false, error: "This project has already been paid." }, { status: 409 })
    }
    if (!getPetMovieMarketReadiness().checkoutEnabled) {
      return NextResponse.json({ ok: false, error: "Paid production is temporarily unavailable." }, { status: 503 })
    }
    const input = petMovieCheckoutSchema.parse(await parseJsonBody(request))
    const priceId = PRICE_MAP[input.plan]
    if (!priceId) return NextResponse.json({ ok: false, error: `Stripe price is not configured for ${input.plan}.` }, { status: 503 })
    if (project.stripe_checkout_session_id) {
      const expired = await expireCheckoutSession(project.stripe_checkout_session_id)
      if (!expired.ok || expired.data?.status === "complete") {
        console.error("[pet-life-movie] previous checkout could not be closed", expired.error)
        return NextResponse.json({ ok: false, error: "The previous checkout is complete or still processing. Refresh the page before trying again." }, { status: 409 })
      }
    }
    const baseUrl = siteBaseUrl()
    const checkout = await createCheckoutSession({
      priceId,
      customerEmail: input.email,
      successUrl: `${baseUrl}/${project.locale}/pet-life-movie/memories/${project.share_slug}?payment=success`,
      cancelUrl: `${baseUrl}/${project.locale}/pet-life-movie/memories/${project.share_slug}?payment=cancelled`,
      mode: "payment",
      metadata: { product: "pet_life_movie", project_id: project.id, plan: input.plan, locale: project.locale },
      idempotencyKey: createPetMovieCheckoutIdempotencyKey(project.id, input.plan),
    })
    if (!checkout.ok || !checkout.data) throw new Error(checkout.error ?? "Stripe checkout failed")
    const db = requirePetMovieDatabase()
    const { error } = await db.from(PET_MOVIE_TABLES.PROJECTS).update({
      plan: input.plan,
      payment_status: "pending",
      status: "payment_required",
      stripe_checkout_session_id: checkout.data.id,
      customer_email: input.email,
      terms_version: PET_MOVIE_TERMS_VERSION,
      terms_accepted_at: new Date().toISOString(),
    }).eq("id", project.id)
    if (error) {
      const cleanup = await expireCheckoutSession(checkout.data.id)
      if (!cleanup.ok) console.error("[pet-life-movie] orphan checkout cleanup failed", cleanup.error)
      throw new Error(`Checkout state save failed: ${error.message}`)
    }
    await recordPetMovieEvent(project.id, "checkout_started", project.locale, { plan: input.plan })
    return NextResponse.json({ ok: true, url: checkout.data.url })
  } catch (error) {
    return petMovieErrorResponse(error, "checkout failed")
  }
}

