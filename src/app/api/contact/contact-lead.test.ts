import { afterEach, describe, expect, test, vi } from "vitest"
import {
  ContactChallengeReplayError,
  completeContactNotification,
  persistContactLead,
  requireContactStorageConfig,
  type ContactLeadInsert,
  type ContactNotificationOutbox,
  type ContactStorageConfig,
} from "./contact-lead"

const config: ContactStorageConfig = {
  restBaseUrl: "https://sales.example.com/rest/v1",
  serviceKey: "service-key",
}

const lead: ContactLeadInsert = {
  business_name: "Acme Software",
  email: "founder@example.com",
  phone: null,
  country: "AU",
  industry: "Japan Entry Package",
  pipeline_stage: "new",
  region: "en",
  meta: {
    contact_form: {
      idempotency_key: "a".repeat(64),
      notification_status: "pending",
      source: "paradigmjp.com",
    },
  },
}

const notification: ContactNotificationOutbox = {
  title: "Japan Entry application — HOT 100",
  message: "Acme Software submitted a Japan Entry application.",
  link: "https://twenty.paradigmjp.com",
  type: "japan_entry_application",
  region: "global",
  priority: 100,
  slack_text: "application {{lead_id}}",
}

const atomicResult = {
  lead_id: "11111111-1111-4111-8111-111111111111",
  lead_meta: lead.meta,
  operator_queue_item_id: "22222222-2222-4222-8222-222222222222",
  created: true,
  notification_claimed: true,
  notification_claim_token: "33333333-3333-4333-8333-333333333333",
  notification_status: "processing",
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("atomic contact lead persistence", () => {
  test("fails closed when durable storage is not configured", () => {
    for (const name of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SALES_SUPABASE_URL",
      "SALES_SUPABASE_SERVICE_ROLE_KEY",
    ]) {
      vi.stubEnv(name, "")
    }

    expect(() => requireContactStorageConfig()).toThrow(
      "Contact lead storage is not configured",
    )
  })

  test("creates the challenge reservation, lead, and outbox through one RPC", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(atomicResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await persistContactLead(
      {
        idempotencyKey: "a".repeat(64),
        challengeHash: "b".repeat(64),
        lead,
        notification,
      },
      config,
    )

    expect(result).toMatchObject({
      id: atomicResult.lead_id,
      outboxId: atomicResult.operator_queue_item_id,
      created: true,
      notificationClaimed: true,
      notificationClaimToken: atomicResult.notification_claim_token,
      notificationStatus: "processing",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://sales.example.com/rest/v1/rpc/sales_create_contact_submission",
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      p_idempotency_key: "a".repeat(64),
      p_challenge_hash: "b".repeat(64),
      p_lead: lead,
      p_notification: notification,
    })
  })

  test("returns the same durable ids without claiming an active duplicate", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...atomicResult,
          created: false,
          notification_claimed: false,
          notification_claim_token: null,
          notification_status: "processing",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await persistContactLead(
      {
        idempotencyKey: "a".repeat(64),
        challengeHash: "b".repeat(64),
        lead,
        notification,
      },
      config,
    )

    expect(result).toMatchObject({
      id: atomicResult.lead_id,
      outboxId: atomicResult.operator_queue_item_id,
      created: false,
      notificationClaimed: false,
      notificationClaimToken: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test("maps a reused challenge constraint to a replay error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '{"message":"duplicate key violates sales_contact_submissions_challenge_hash_key"}',
            { status: 409 },
          ),
        ),
    )

    await expect(
      persistContactLead(
        {
          idempotencyKey: "a".repeat(64),
          challengeHash: "b".repeat(64),
          lead,
          notification,
        },
        config,
      ),
    ).rejects.toBeInstanceOf(ContactChallengeReplayError)
  })

  test("rejects non-2xx atomic persistence responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"message":"database unavailable"}', { status: 503 }),
        ),
    )

    await expect(
      persistContactLead(
        {
          idempotencyKey: "a".repeat(64),
          challengeHash: "b".repeat(64),
          lead,
          notification,
        },
        config,
      ),
    ).rejects.toThrow("Atomic contact submission failed: HTTP 503")
  })

  test("completes only the worker holding the current claim token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ notification_status: "complete" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"message":"contact notification claim is stale"}', {
          status: 409,
        }),
      )
    vi.stubGlobal("fetch", fetchMock)

    await completeContactNotification(
      {
        idempotencyKey: "a".repeat(64),
        claimToken: atomicResult.notification_claim_token,
        status: "complete",
      },
      config,
    )

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      p_idempotency_key: "a".repeat(64),
      p_claim_token: atomicResult.notification_claim_token,
      p_status: "complete",
      p_slack_error: null,
    })
    await expect(
      completeContactNotification(
        {
          idempotencyKey: "a".repeat(64),
          claimToken: "44444444-4444-4444-8444-444444444444",
          status: "complete",
        },
        config,
      ),
    ).rejects.toThrow("Contact notification completion failed: HTTP 409")
  })
})
