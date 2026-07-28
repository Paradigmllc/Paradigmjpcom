import { describe, expect, test } from "vitest"
import {
  VIDEO_SERVICE_INTENT,
  parseContactPayload,
  scoreContactQualification,
  validateContactPayload,
} from "./contact-payload"
import { buildContactLeadMeta, buildContactSlackText } from "./contact-route-helpers"

const validVideoApplication = {
  name: "Alex Producer",
  company: "Acme Software",
  email: "ALEX@EXAMPLE.COM",
  message: "We need a 60-second product demo for our new SaaS release.",
  services: ["Video as a Service — unlimited"],
  locale: "en",
  intent: VIDEO_SERVICE_INTENT,
  companyWebsite: "https://example.com",
  videoPlan: "unlimited",
  monthlyVideoDemand: "11-20",
  videoAssetReadiness: "ready",
  videoPreferredStart: "within-7-days",
  videoTermsAcknowledged: true,
  idempotencyKey: "video-submission-123456",
}

describe("Video as a Service contact payload", () => {
  test("preserves the dedicated video intent on English routes", () => {
    const payload = parseContactPayload(validVideoApplication)

    expect(payload).not.toBeNull()
    expect(payload?.intent).toBe(VIDEO_SERVICE_INTENT)
    expect(payload?.email).toBe("alex@example.com")
    expect(payload && validateContactPayload(payload)).toBeNull()
  })

  test("requires plan, demand, readiness, start, and terms acknowledgement", () => {
    const missingTerms = parseContactPayload({
      ...validVideoApplication,
      videoTermsAcknowledged: false,
    })
    const invalidPlan = parseContactPayload({
      ...validVideoApplication,
      videoPlan: "enterprise-secret",
    })

    expect(missingTerms && validateContactPayload(missingTerms)).toBe(
      "Confirm the Video as a Service Terms and commercial conditions.",
    )
    expect(invalidPlan?.videoPlan).toBe("")
    expect(invalidPlan && validateContactPayload(invalidPlan)).toBe(
      "Select a plan.",
    )
  })

  test("accepts the Japanese application with localized validation", () => {
    const payload = parseContactPayload({
      ...validVideoApplication,
      locale: "ja",
      companyWebsite: "not-a-url",
    })

    expect(payload).not.toBeNull()
    expect(payload && validateContactPayload(payload)).toBe(
      "会社名と有効な会社・サービスURLを入力してください。",
    )
  })

  test("ranks Priority above Unlimited and Essential", () => {
    const essential = parseContactPayload({
      ...validVideoApplication,
      videoPlan: "essential",
      monthlyVideoDemand: "1-4",
      videoAssetReadiness: "concept-only",
      videoPreferredStart: "later",
    })
    const unlimited = parseContactPayload(validVideoApplication)
    const priority = parseContactPayload({
      ...validVideoApplication,
      videoPlan: "priority",
      monthlyVideoDemand: "21-plus",
    })

    if (!essential || !unlimited || !priority) {
      throw new Error("Expected parsed video applications")
    }

    expect(scoreContactQualification(essential)).toMatchObject({
      tier: "nurture",
    })
    expect(scoreContactQualification(unlimited)).toMatchObject({
      tier: "hot",
    })
    expect(scoreContactQualification(priority)).toMatchObject({
      score: 100,
      priority: 100,
      tier: "hot",
    })
    expect(scoreContactQualification(priority).score).toBeGreaterThan(
      scoreContactQualification(unlimited).score,
    )
    expect(scoreContactQualification(unlimited).score).toBeGreaterThan(
      scoreContactQualification(essential).score,
    )
  })

  test("stores video operations without inheriting Japan Entry guarantees", () => {
    const payload = parseContactPayload(validVideoApplication)
    if (!payload) throw new Error("Expected parsed video application")
    const qualification = scoreContactQualification(payload)
    const meta = buildContactLeadMeta({
      payload,
      qualification,
      reportLocale: "en",
      targetCountry: "US",
      idempotencyKey: "server-idempotency-key",
      clientBinding: "client-binding",
      submittedAt: "2026-07-28T00:00:00.000Z",
    })
    const contactForm = meta.contact_form as Record<string, unknown>
    const videoService = contactForm.video_service as Record<string, unknown>

    expect(videoService).toMatchObject({
      plan: "unlimited",
      monthly_demand: "11-20",
      contract_status: "pending_fit_review_and_service_order",
    })
    expect(contactForm.delivery_guarantee).toBeUndefined()
    expect(contactForm.payment_collection).toBeUndefined()
  })

  test("includes plan and operating conditions in the Slack alert", () => {
    const payload = parseContactPayload(validVideoApplication)
    if (!payload) throw new Error("Expected parsed video application")
    const text = buildContactSlackText({
      payload,
      reportLocale: "en",
      qualification: scoreContactQualification(payload),
    })

    expect(text).toContain("Video as a Service 申込み")
    expect(text).toContain("VaaSプラン:* unlimited")
    expect(text).toContain("Ready後原則2営業日以内に着手")
  })
})
