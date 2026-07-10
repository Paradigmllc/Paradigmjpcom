import { beforeEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"
import {
  CLAIM_TOKEN,
  contactRequest as request,
  LEAD_ID,
  OUTBOX_ID,
  persistedLeadResult,
  SUBMISSION_ID,
  validPayload,
  verifiedChallenge,
} from "./route-test-fixtures"

const mocks = vi.hoisted(() => {
  class MockContactChallengeReplayError extends Error {}
  return {
    ContactChallengeReplayError: MockContactChallengeReplayError,
    captureException: vi.fn(),
    checkRateLimit: vi.fn(),
    completeContactNotification: vi.fn(),
    issueContactChallenge: vi.fn(),
    notifyBothChannels: vi.fn(),
    persistContactLead: vi.fn(),
    startContactEnrichment: vi.fn(),
    verifyContactChallenge: vi.fn(),
    verifyTurnstile: vi.fn(),
  }
})

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: () => "203.0.113.10",
  verifyTurnstile: mocks.verifyTurnstile,
}))

vi.mock("@/lib/error-monitor", () => ({
  captureException: mocks.captureException,
}))
vi.mock("@/lib/notify", () => ({
  notifyBothChannels: mocks.notifyBothChannels,
}))
vi.mock("./contact-enrichment", () => ({
  startContactEnrichment: mocks.startContactEnrichment,
}))
vi.mock("./contact-challenge", () => ({
  CONTACT_CHALLENGE_MAX_AGE_MS: 1_800_000,
  isValidContactSubmissionIdentity: (value: string) => value.length >= 16,
  issueContactChallenge: mocks.issueContactChallenge,
  verifyContactChallenge: mocks.verifyContactChallenge,
}))
vi.mock("./contact-lead", () => ({
  ContactChallengeReplayError: mocks.ContactChallengeReplayError,
  completeContactNotification: mocks.completeContactNotification,
  persistContactLead: mocks.persistContactLead,
}))

import { GET, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.checkRateLimit.mockReturnValue({
    ok: true,
    remaining: 4,
    resetAt: Date.now() + 60_000,
  })
  mocks.persistContactLead.mockResolvedValue(persistedLeadResult)
  mocks.notifyBothChannels.mockResolvedValue({
    ok: true,
    slack: { ok: true },
    database: { ok: true },
  })
  mocks.completeContactNotification.mockResolvedValue(undefined)
  mocks.issueContactChallenge.mockReturnValue("signed-challenge")
  mocks.verifyContactChallenge.mockReturnValue(verifiedChallenge)
  mocks.verifyTurnstile.mockResolvedValue(true)
  mocks.startContactEnrichment.mockReturnValue(undefined)
  mocks.captureException.mockResolvedValue(undefined)
})

describe("POST /api/contact", () => {
  test("issues a non-cacheable challenge bound to IP and submission identity", async () => {
    const response = GET(
      new NextRequest("https://paradigmjp.com/api/contact", {
        headers: {
          "X-Contact-Locale": "en",
          "X-Contact-Submission-Id": SUBMISSION_ID,
        },
      }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toContain("no-store")
    expect(mocks.issueContactChallenge).toHaveBeenCalledWith({
      clientIp: "203.0.113.10",
      submissionIdentity: SUBMISSION_ID,
    })
  })

  test("rejects honeypot submissions before persistence", async () => {
    const response = await POST(request({ ...validPayload, honeypot: "spam" }))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "honeypot_rejected" })
    expect(mocks.persistContactLead).not.toHaveBeenCalled()
  })

  test("localizes rate-limit errors from the request locale header", async () => {
    mocks.checkRateLimit.mockReturnValueOnce({
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    })
    const response = await POST(request())
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({
      error: "Too many requests. Please wait a moment and try again.",
    })
  })

  test("rejects forms submitted faster than the signed challenge minimum in English", async () => {
    mocks.verifyContactChallenge.mockReturnValueOnce({
      ok: false,
      reason: "too_fast",
    })

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchObject({ code: "challenge_too_fast" })
    expect(body.error).toContain("complete the form")
    expect(mocks.persistContactLead).not.toHaveBeenCalled()
  })

  test("does not return success or notify when atomic persistence fails", async () => {
    mocks.persistContactLead.mockRejectedValueOnce(
      new Error("database unavailable"),
    )

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "Submission failed. Please try again in a moment.",
    })
    expect(mocks.notifyBothChannels).not.toHaveBeenCalled()
    expect(mocks.captureException).toHaveBeenCalled()
  })

  test("returns an English Turnstile error for the English funnel", async () => {
    mocks.verifyTurnstile.mockResolvedValueOnce(false)

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: "Bot verification failed. Reload the page and try again.",
    })
    expect(mocks.persistContactLead).not.toHaveBeenCalled()
  })

  test("atomically persists the English lead and reuses its DB outbox", async () => {
    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      success: true,
      deduplicated: false,
      notificationStatus: "complete",
    })
    const persistInput = mocks.persistContactLead.mock.calls[0]?.[0]
    expect(persistInput).toMatchObject({
      challengeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      lead: {
        country: "AU",
        pipeline_stage: "new",
        region: "en",
        meta: {
          contact_form: {
            source: "paradigmjp.com",
            direction: "inbound",
            company_country: "Australia",
            target_country: "AU",
            qualification_score: 100,
            qualification_tier: "hot",
            attribution: {
              utm_source: "linkedin",
              utm_campaign: "japan-entry-founders",
              cta_source: "hero-apply",
            },
          },
        },
      },
      notification: {
        priority: 100,
        type: "japan_entry_application",
      },
    })
    expect(persistInput.lead).not.toHaveProperty("source")
    expect(persistInput.lead.meta.contact_form).not.toHaveProperty("ip")
    expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
      expect.stringContaining(`*lead ID:* ${LEAD_ID}`),
      expect.objectContaining({
        leadId: LEAD_ID,
        priority: 100,
        existingQueueItemId: OUTBOX_ID,
        clientMessageId: OUTBOX_ID,
      }),
    )
    expect(mocks.completeContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        claimToken: CLAIM_TOKEN,
        status: "complete",
      }),
    )
    expect(mocks.startContactEnrichment).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: LEAD_ID, targetCountry: "AU" }),
    )
  })

  test("canonicalizes an English general intent to Japan Entry", async () => {
    const response = await POST(request({ ...validPayload, intent: "general" }))

    expect(response.status).toBe(200)
    expect(mocks.persistContactLead.mock.calls[0]?.[0]).toMatchObject({
      lead: { meta: { contact_form: { intent: "japan-entry" } } },
      notification: { type: "japan_entry_application" },
    })
  })

  test("keeps the saved lead successful while exposing Slack degradation", async () => {
    mocks.notifyBothChannels.mockResolvedValueOnce({
      ok: false,
      slack: { ok: false, error: "timeout" },
      database: { ok: true },
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      notificationStatus: "degraded",
    })
    expect(mocks.completeContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({ status: "degraded", slackError: "timeout" }),
    )
  })

  test("caps non-final and slow applications before outbox priority", async () => {
    const response = await POST(
      request({
        ...validPayload,
        decisionAuthority: "not-final",
        approvalTimeline: "within-30-days",
      }),
    )

    expect(response.status).toBe(200)
    expect(mocks.persistContactLead.mock.calls[0]?.[0]).toMatchObject({
      lead: {
        meta: {
          contact_form: {
            qualification_tier: "nurture",
            qualification_disqualifiers: [
              "not_final_decision_maker",
              "approval_exceeds_7_days",
            ],
          },
        },
      },
      notification: { priority: 59 },
    })
  })

  test("escapes user-controlled Slack markup", async () => {
    const response = await POST(
      request({ ...validPayload, company: "Acme <@U123>" }),
    )

    expect(response.status).toBe(200)
    const notificationText = mocks.notifyBothChannels.mock.calls[0]?.[0]
    expect(notificationText).toContain("Acme &lt;@U123&gt;")
    expect(notificationText).not.toContain("Acme <@U123>")
  })

  test("does not send Slack twice while an idempotent notification lease is active", async () => {
    mocks.persistContactLead.mockResolvedValueOnce({
      id: LEAD_ID,
      created: false,
      meta: { contact_form: { notification_status: "processing" } },
      outboxId: OUTBOX_ID,
      notificationClaimed: false,
      notificationClaimToken: null,
      notificationStatus: "processing",
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      deduplicated: true,
      notificationStatus: "processing",
    })
    expect(mocks.notifyBothChannels).not.toHaveBeenCalled()
    expect(mocks.completeContactNotification).not.toHaveBeenCalled()
  })

  test("reports one-time challenge reuse as a localized conflict", async () => {
    mocks.persistContactLead.mockRejectedValueOnce(
      new mocks.ContactChallengeReplayError("challenge_hash conflict"),
    )

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "challenge_replayed",
      error: expect.stringContaining("already been used"),
    })
    expect(mocks.captureException).not.toHaveBeenCalled()
  })

  test("returns Japanese infrastructure errors for Japanese contact", async () => {
    mocks.persistContactLead.mockRejectedValueOnce(new Error("DB down"))
    const response = await POST(
      request(
        {
          name: "山田太郎",
          email: "taro@example.jp",
          message: "相談です",
          locale: "ja",
          intent: "general",
          idempotencyKey: SUBMISSION_ID,
          formChallenge: "signed-challenge",
          honeypot: "",
        },
        "ja",
      ),
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "送信に失敗しました。しばらく後にお試しください。",
    })
  })
})
